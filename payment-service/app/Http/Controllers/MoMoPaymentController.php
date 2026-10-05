<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\PaymentTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class MoMoPaymentController extends Controller
{
    private const REQUEST_SIGNATURE_FIELDS = [
        'accessKey',
        'amount',
        'extraData',
        'ipnUrl',
        'orderId',
        'orderInfo',
        'partnerCode',
        'redirectUrl',
        'requestId',
        'requestType',
    ];

    private const RESPONSE_SIGNATURE_FIELDS = [
        'accessKey',
        'amount',
        'message',
        'orderId',
        'partnerCode',
        'payUrl',
        'requestId',
        'responseTime',
        'resultCode',
    ];

    private const IPN_SIGNATURE_FIELDS = [
        'accessKey',
        'amount',
        'extraData',
        'message',
        'orderId',
        'orderInfo',
        'orderType',
        'partnerCode',
        'payType',
        'requestId',
        'responseTime',
        'resultCode',
        'transId',
    ];

    public function start(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => ['required', 'integer', 'min:1'],
        ]);

        $orderId = (int) $validated['order_id'];
        $orderServiceUrl = rtrim((string) config('services.order_service.url'), '/');

        try {
            $orderResponse = Http::acceptJson()
                ->timeout(8)
                ->get("{$orderServiceUrl}/api/orders/{$orderId}")
                ->throw();
        } catch (Throwable $exception) {
            Log::warning('Could not verify the order before starting MoMo payment.', [
                'order_id' => $orderId,
                'exception' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể xác minh đơn hàng. Vui lòng thử lại sau.',
            ], Response::HTTP_BAD_GATEWAY);
        }

        $order = $orderResponse->json('data');
        if (! is_array($order) || (int) ($order['id'] ?? 0) !== $orderId) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn hàng.',
            ], Response::HTTP_NOT_FOUND);
        }

        if (($order['payment_method'] ?? null) !== 'momo') {
            return response()->json([
                'success' => false,
                'message' => 'Đơn hàng không sử dụng phương thức thanh toán MoMo.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (($order['payment_status'] ?? null) === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Đơn hàng đã được thanh toán.',
            ], Response::HTTP_CONFLICT);
        }

        if (Payment::query()->where('order_id', $orderId)->where('status', 'paid')->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Đơn hàng đã được thanh toán.',
            ], Response::HTTP_CONFLICT);
        }

        $amount = (int) round((float) ($order['total_amount'] ?? 0));
        if ($amount < 1000 || $amount > 50000000) {
            return response()->json([
                'success' => false,
                'message' => 'Số tiền thanh toán MoMo phải từ 1.000đ đến 50.000.000đ.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $momoConfig = config('services.momo');
        foreach (['endpoint', 'partner_code', 'access_key', 'secret_key', 'redirect_url', 'ipn_url'] as $key) {
            if (! is_string($momoConfig[$key] ?? null) || trim($momoConfig[$key]) === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cấu hình cổng thanh toán MoMo chưa đầy đủ.',
                ], Response::HTTP_SERVICE_UNAVAILABLE);
            }
        }

        $payment = DB::transaction(function () use ($orderId, $amount): Payment {
            return Payment::query()->updateOrCreate(
                ['order_id' => $orderId],
                [
                    'payment_method' => 'momo',
                    'amount' => $amount,
                    'status' => 'pending',
                    'paid_at' => null,
                ],
            );
        });

        $requestId = (string) Str::uuid();
        $momoOrderId = "{$orderId}-{$requestId}";
        $orderInfo = 'Thanh toan don hang '.($order['order_number'] ?? $orderId);
        $payload = [
            'partnerCode' => $momoConfig['partner_code'],
            'requestId' => $requestId,
            'amount' => (string) $amount,
            'orderId' => $momoOrderId,
            'orderInfo' => $orderInfo,
            'redirectUrl' => $momoConfig['redirect_url'],
            'ipnUrl' => $momoConfig['ipn_url'],
            'lang' => 'vi',
            'requestType' => $momoConfig['request_type'] ?: 'payWithATM',
            'autoCapture' => true,
            'extraData' => '',
        ];
        $payload['signature'] = $this->makeSignature($payload, self::REQUEST_SIGNATURE_FIELDS);

        $transaction = $payment->transactions()->create([
            'gateway' => 'momo',
            'transaction_code' => $requestId,
            'amount' => $amount,
            'status' => 'initiating',
            'raw_payload' => [
                'request_id' => $requestId,
                'order_id' => $momoOrderId,
            ],
        ]);

        try {
            $momoResponse = Http::acceptJson()
                ->asJson()
                ->timeout(30)
                ->post($momoConfig['endpoint'], $payload);
        } catch (Throwable $exception) {
            $this->markInitiationFailed($payment, $transaction, 'connection_error');
            Log::warning('MoMo payment creation request failed.', [
                'order_id' => $orderId,
                'exception' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không kết nối được cổng MoMo. Vui lòng thử lại.',
            ], Response::HTTP_BAD_GATEWAY);
        }

        $responseData = $momoResponse->json();
        if (! $momoResponse->successful()
            || ! is_array($responseData)
            || (int) ($responseData['resultCode'] ?? -1) !== 0
            || (string) ($responseData['partnerCode'] ?? '') !== (string) $momoConfig['partner_code']
            || (string) ($responseData['requestId'] ?? '') !== $requestId
            || (string) ($responseData['orderId'] ?? '') !== $momoOrderId
            || (int) ($responseData['amount'] ?? 0) !== $amount
            || ! $this->isMoMoPayUrl($responseData['payUrl'] ?? null)
            || ! $this->hasValidSignature($responseData, self::RESPONSE_SIGNATURE_FIELDS)) {
            $this->markInitiationFailed(
                $payment,
                $transaction,
                (string) ($responseData['resultCode'] ?? $momoResponse->status()),
                $responseData,
            );
            Log::warning('MoMo rejected or returned an invalid payment response.', [
                'order_id' => $orderId,
                'http_status' => $momoResponse->status(),
                'result_code' => $responseData['resultCode'] ?? null,
            ]);

            $message = (int) ($responseData['resultCode'] ?? -1) === 11007
                ? 'MoMo từ chối chữ ký (11007). Hãy kiểm tra Partner Code, Access Key và Secret Key có cùng thuộc một tài khoản Sandbox hay không.'
                : 'MoMo không thể khởi tạo giao dịch (mã lỗi '
                    .((string) ($responseData['resultCode'] ?? $momoResponse->status()))
                    .'). Vui lòng kiểm tra cấu hình Sandbox hoặc thử lại.';

            return response()->json([
                'success' => false,
                'message' => $message,
                'error_code' => $responseData['resultCode'] ?? null,
            ], Response::HTTP_BAD_GATEWAY);
        }

        $transaction->update([
            'status' => 'pending',
            'response_code' => (string) $responseData['resultCode'],
            'raw_payload' => [
                'request_id' => $requestId,
                'order_id' => $momoOrderId,
                'response' => $responseData,
            ],
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'pay_url' => $responseData['payUrl'],
                'order_id' => $orderId,
                'payment_id' => $payment->id,
                'transaction_id' => $transaction->id,
            ],
        ]);
    }

    public function ipn(Request $request): Response
    {
        $data = $request->all();
        if (! $this->hasValidSignature($data, self::IPN_SIGNATURE_FIELDS)
            || ! isset($data['requestId'], $data['orderId'], $data['amount'], $data['resultCode'])) {
            return response()->json(['message' => 'Invalid signature or incomplete MoMo notification.'], Response::HTTP_UNAUTHORIZED);
        }

        $transaction = PaymentTransaction::query()
            ->where('gateway', 'momo')
            ->where('transaction_code', (string) $data['requestId'])
            ->with('payment')
            ->first();

        if (! $transaction
            || ! $transaction->payment
            || (int) $transaction->amount !== (int) $data['amount']
            || ($transaction->raw_payload['order_id'] ?? null) !== (string) $data['orderId']) {
            return response()->json(['message' => 'Payment transaction does not match the notification.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ((int) $data['resultCode'] !== 0) {
            $this->recordFailedPayment($transaction, $data, 'ipn');

            return response()->noContent();
        }

        if (! $this->completeSuccessfulPayment($transaction, $data, 'ipn')) {
            return response()->json(['message' => 'Order payment synchronization failed.'], Response::HTTP_BAD_GATEWAY);
        }

        return response()->noContent();
    }

    public function callback(Request $request): RedirectResponse|JsonResponse
    {
        $data = $request->all();
        if (! $this->hasValidSignature($data, self::IPN_SIGNATURE_FIELDS)
            || ! isset($data['requestId'], $data['orderId'], $data['resultCode'])) {
            return response()->json(['message' => 'Invalid MoMo callback signature.'], Response::HTTP_UNAUTHORIZED);
        }

        $transaction = PaymentTransaction::query()
            ->where('gateway', 'momo')
            ->where('transaction_code', (string) $data['requestId'])
            ->with('payment')
            ->first();

        if (! $transaction
            || ! $transaction->payment
            || (int) $transaction->amount !== (int) ($data['amount'] ?? 0)
            || ($transaction->raw_payload['order_id'] ?? null) !== (string) $data['orderId']) {
            return response()->json(['message' => 'MoMo transaction was not found.'], Response::HTTP_NOT_FOUND);
        }

        if ((int) $data['resultCode'] === 0) {
            if (! $this->completeSuccessfulPayment($transaction, $data, 'callback')) {
                return response()->json(['message' => 'Order payment synchronization failed.'], Response::HTTP_BAD_GATEWAY);
            }
        } else {
            $this->recordFailedPayment($transaction, $data, 'callback');
        }

        $frontendUrl = rtrim((string) config('services.frontend_url'), '/');
        if ($frontendUrl === '') {
            return response()->json(['message' => 'Frontend URL is not configured.'], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        return redirect()->away($frontendUrl.'/orders?'.http_build_query([
            'payment' => (int) $data['resultCode'] === 0 ? 'success' : 'failed',
            'order_id' => $transaction->payment->order_id,
        ]));
    }

    private function completeSuccessfulPayment(PaymentTransaction $transaction, array $data, string $source): bool
    {
        DB::transaction(function () use ($transaction, $data, $source): void {
            $transaction->update([
                'status' => 'paid',
                'response_code' => (string) $data['resultCode'],
                'raw_payload' => array_merge($transaction->raw_payload ?? [], [$source => $data]),
            ]);
            $transaction->payment->update([
                'status' => 'paid',
                'paid_at' => now(),
            ]);
        });

        $orderServiceUrl = rtrim((string) config('services.order_service.url'), '/');
        $sharedSecret = (string) config('services.order_service.payment_secret');
        if ($sharedSecret === '') {
            Log::error('Payment service shared secret is not configured; paid order cannot be synchronized.', [
                'order_id' => $transaction->payment->order_id,
            ]);

            return false;
        }

        try {
            $orderResponse = Http::acceptJson()
                ->withHeaders(['X-Payment-Service-Secret' => $sharedSecret])
                ->timeout(8)
                ->post("{$orderServiceUrl}/api/orders/{$transaction->payment->order_id}/paid")
                ->throw();
        } catch (Throwable $exception) {
            Log::error('Could not synchronize successful MoMo payment to order service.', [
                'order_id' => $transaction->payment->order_id,
                'exception' => $exception->getMessage(),
            ]);

            return false;
        }

        if ($orderResponse->json('success') !== true) {
            Log::error('Order service did not confirm successful MoMo payment.', [
                'order_id' => $transaction->payment->order_id,
                'http_status' => $orderResponse->status(),
            ]);

            return false;
        }

        return true;
    }

    private function recordFailedPayment(PaymentTransaction $transaction, array $data, string $source): void
    {
        $transaction->update([
            'status' => 'failed',
            'response_code' => (string) $data['resultCode'],
            'raw_payload' => array_merge($transaction->raw_payload ?? [], [$source => $data]),
        ]);

        if ($transaction->payment->status !== 'paid'
            && $transaction->id === $transaction->payment->transactions()->max('id')) {
            $transaction->payment->update(['status' => 'failed']);
        }
    }

    public function status(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => ['required', 'integer', 'min:1'],
        ]);

        $payment = Payment::query()
            ->where('order_id', $validated['order_id'])
            ->first();

        if (! $payment) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy giao dịch thanh toán.',
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'order_id' => $payment->order_id,
                'payment_method' => $payment->payment_method,
                'amount' => $payment->amount,
                'status' => $payment->status,
                'paid_at' => $payment->paid_at,
                'transactions' => $payment->transactions()
                    ->select(['id', 'gateway', 'transaction_code', 'response_code', 'amount', 'status', 'created_at'])
                    ->get(),
            ],
        ]);
    }

    private function makeSignature(array $data, array $fields): string
    {
        $signingData = collect($fields)
            ->map(fn (string $field): string => "{$field}="
                .(string) ($field === 'accessKey'
                    ? config('services.momo.access_key', '')
                    : ($data[$field] ?? '')))
            ->implode('&');

        return hash_hmac('sha256', $signingData, (string) config('services.momo.secret_key'));
    }

    private function hasValidSignature(array $data, array $fields): bool
    {
        $signature = $data['signature'] ?? null;
        if (! is_string($signature) || $signature === '') {
            return false;
        }

        return hash_equals($this->makeSignature($data, $fields), $signature);
    }

    private function isMoMoPayUrl(mixed $payUrl): bool
    {
        if (! is_string($payUrl) || ! filter_var($payUrl, FILTER_VALIDATE_URL)) {
            return false;
        }

        $url = parse_url($payUrl);
        $host = strtolower((string) ($url['host'] ?? ''));

        return ($url['scheme'] ?? null) === 'https'
            && ($host === 'momo.vn' || str_ends_with($host, '.momo.vn'));
    }

    private function markInitiationFailed(
        Payment $payment,
        PaymentTransaction $transaction,
        string $responseCode,
        ?array $responseData = null,
    ): void {
        $transaction->update([
            'status' => 'failed',
            'response_code' => $responseCode,
            'raw_payload' => array_merge($transaction->raw_payload ?? [], ['response' => $responseData]),
        ]);
        $payment->update(['status' => 'failed']);
    }
}
