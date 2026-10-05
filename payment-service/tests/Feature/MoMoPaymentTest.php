<?php

use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

function signMoMoFields(array $data, array $fields, string $secret): string
{
    $signingData = collect($fields)
        ->map(fn (string $field): string => "{$field}="
            .(string) ($field === 'accessKey' ? 'ACCESS' : ($data[$field] ?? '')))
        ->implode('&');

    return hash_hmac('sha256', $signingData, $secret);
}

function configureMoMoTest(): void
{
    config([
        'services.momo.endpoint' => 'https://test-payment.momo.vn/v2/gateway/api/create',
        'services.momo.partner_code' => 'PARTNER',
        'services.momo.access_key' => 'ACCESS',
        'services.momo.secret_key' => 'secret-for-tests',
        'services.momo.redirect_url' => 'https://api.example.test/api/payment/momo/callback',
        'services.momo.ipn_url' => 'https://api.example.test/api/payment/momo/ipn',
        'services.momo.request_type' => 'payWithATM',
        'services.order_service.url' => 'http://127.0.0.1:8003',
        'services.order_service.payment_secret' => 'shared-test-secret',
    ]);
}

test('starts a MoMo payment using the order total from order service', function () {
    configureMoMoTest();

    Http::fake(function (ClientRequest $request) {
        if (str_ends_with($request->url(), '/api/orders/7')) {
            return Http::response([
                'success' => true,
                'data' => [
                    'id' => 7,
                    'order_number' => 'SO-7',
                    'payment_method' => 'momo',
                    'payment_status' => 'unpaid',
                    'total_amount' => '249000.00',
                ],
            ]);
        }

        $payload = $request->data();
        $response = [
            'partnerCode' => 'PARTNER',
            'requestId' => $payload['requestId'],
            'orderId' => $payload['orderId'],
            'amount' => $payload['amount'],
            'responseTime' => '1760000000000',
            'message' => 'Successful.',
            'resultCode' => 0,
            'payUrl' => 'https://test-payment.momo.vn/pay/abc',
            'orderInfo' => $payload['orderInfo'],
            'orderType' => 'momo_wallet',
            'transId' => 123456,
            'extraData' => '',
        ];
        $response['signature'] = signMoMoFields($response, [
            'accessKey', 'amount', 'message', 'orderId', 'partnerCode',
            'payUrl', 'requestId', 'responseTime', 'resultCode',
        ], 'secret-for-tests');

        return Http::response($response);
    });

    $response = $this->postJson('/api/payment/momo/start', [
        'order_id' => 7,
        'amount' => 1,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.order_id', 7)
        ->assertJsonPath('data.pay_url', 'https://test-payment.momo.vn/pay/abc');

    expect(Payment::query()->where('order_id', 7)->value('amount'))->toBe('249000.00');
    Http::assertSent(fn (ClientRequest $request) => str_contains($request->url(), 'test-payment.momo.vn')
        && $request['amount'] === '249000'
        && $request['requestType'] === 'payWithATM'
        && $request['signature'] === signMoMoFields(
            $request->data(),
            [
                'accessKey', 'amount', 'extraData', 'ipnUrl', 'orderId',
                'orderInfo', 'partnerCode', 'redirectUrl', 'requestId', 'requestType',
            ],
            'secret-for-tests',
        ));
});

test('explains MoMo invalid-signature responses without exposing credentials', function () {
    configureMoMoTest();

    Http::fake([
        'http://127.0.0.1:8003/api/orders/9' => Http::response([
            'success' => true,
            'data' => [
                'id' => 9,
                'payment_method' => 'momo',
                'payment_status' => 'unpaid',
                'total_amount' => '200000.00',
            ],
        ]),
        'https://test-payment.momo.vn/v2/gateway/api/create' => Http::response([
            'resultCode' => 11007,
            'message' => 'Invalid signature.',
        ], 400),
    ]);

    $this->postJson('/api/payment/momo/start', ['order_id' => 9])
        ->assertStatus(502)
        ->assertJsonPath('error_code', 11007)
        ->assertJsonPath(
            'message',
            'MoMo từ chối chữ ký (11007). Hãy kiểm tra Partner Code, Access Key và Secret Key có cùng thuộc một tài khoản Sandbox hay không.',
        );
});

test('rejects a signed create response that does not match the request', function () {
    configureMoMoTest();

    Http::fake(function (ClientRequest $request) {
        if (str_ends_with($request->url(), '/api/orders/10')) {
            return Http::response([
                'success' => true,
                'data' => [
                    'id' => 10,
                    'payment_method' => 'momo',
                    'payment_status' => 'unpaid',
                    'total_amount' => '100000.00',
                ],
            ]);
        }

        $response = [
            'partnerCode' => 'PARTNER',
            'requestId' => 'different-request',
            'orderId' => 'different-order',
            'amount' => '100000',
            'responseTime' => '1760000000000',
            'message' => 'Successful.',
            'resultCode' => 0,
            'payUrl' => 'https://test-payment.momo.vn/pay/abc',
        ];
        $response['signature'] = signMoMoFields($response, [
            'accessKey', 'amount', 'message', 'orderId', 'partnerCode',
            'payUrl', 'requestId', 'responseTime', 'resultCode',
        ], 'secret-for-tests');

        return Http::response($response);
    });

    $this->postJson('/api/payment/momo/start', ['order_id' => 10])
        ->assertStatus(502)
        ->assertJsonPath('success', false);
});

test('accepts a signed successful IPN and marks its order paid', function () {
    configureMoMoTest();

    $payment = Payment::query()->create([
        'order_id' => 42,
        'payment_method' => 'momo',
        'amount' => 180000,
        'status' => 'pending',
    ]);
    $payment->transactions()->create([
        'gateway' => 'momo',
        'transaction_code' => 'request-42',
        'amount' => 180000,
        'status' => 'pending',
        'raw_payload' => ['order_id' => '42-request-42'],
    ]);

    $ipn = [
        'amount' => 180000,
        'extraData' => '',
        'message' => 'Successful.',
        'orderId' => '42-request-42',
        'orderInfo' => 'Order 42',
        'orderType' => 'momo_wallet',
        'partnerCode' => 'PARTNER',
        'payType' => 'qr',
        'requestId' => 'request-42',
        'responseTime' => '1760000000000',
        'resultCode' => 0,
        'transId' => 987654,
    ];
    $ipn['signature'] = signMoMoFields($ipn, [
        'accessKey', 'amount', 'extraData', 'message', 'orderId', 'orderInfo',
        'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime',
        'resultCode', 'transId',
    ], 'secret-for-tests');

    Http::fake([
        'http://127.0.0.1:8003/api/orders/42/paid' => Http::response(['success' => true]),
    ]);

    $this->postJson('/api/payment/momo/ipn', $ipn)->assertNoContent();

    expect($payment->fresh()->status)->toBe('paid');
    Http::assertSent(fn (ClientRequest $request) => str_ends_with($request->url(), '/api/orders/42/paid')
        && $request->hasHeader('X-Payment-Service-Secret', 'shared-test-secret'));
});

test('completes a signed successful MoMo browser callback', function () {
    configureMoMoTest();

    $payment = Payment::query()->create([
        'order_id' => 43,
        'payment_method' => 'momo',
        'amount' => 180000,
        'status' => 'pending',
    ]);
    $payment->transactions()->create([
        'gateway' => 'momo',
        'transaction_code' => 'request-43',
        'amount' => 180000,
        'status' => 'pending',
        'raw_payload' => ['order_id' => '43-request-43'],
    ]);

    $callback = [
        'amount' => 180000,
        'extraData' => '',
        'message' => 'Successful.',
        'orderId' => '43-request-43',
        'orderInfo' => 'Order 43',
        'orderType' => 'momo_wallet',
        'partnerCode' => 'PARTNER',
        'payType' => 'qr',
        'requestId' => 'request-43',
        'responseTime' => '1760000000000',
        'resultCode' => 0,
        'transId' => 987655,
    ];
    $callback['signature'] = signMoMoFields($callback, [
        'accessKey', 'amount', 'extraData', 'message', 'orderId', 'orderInfo',
        'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime',
        'resultCode', 'transId',
    ], 'secret-for-tests');

    Http::fake([
        'http://127.0.0.1:8003/api/orders/43/paid' => Http::response(['success' => true]),
    ]);

    $this->get('/api/payment/momo/callback?'.http_build_query($callback))
        ->assertRedirect('http://localhost:5173/orders?payment=success&order_id=43');

    expect($payment->fresh()->status)->toBe('paid');
    Http::assertSent(fn (ClientRequest $request) => str_ends_with($request->url(), '/api/orders/43/paid'));
});

test('rejects an IPN with an invalid signature', function () {
    configureMoMoTest();

    $this->postJson('/api/payment/momo/ipn', [
        'requestId' => 'unknown-request',
        'orderId' => '42-unknown-request',
        'amount' => 180000,
        'resultCode' => 0,
        'signature' => 'invalid',
    ])->assertUnauthorized();
});
