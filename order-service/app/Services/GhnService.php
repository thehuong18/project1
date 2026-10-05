<?php

namespace App\Services;

use App\Models\Order;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GhnService
{
    protected string $token;

    protected int $shopId;

    protected string $baseUrl;

    protected int $fromDistrictId;

    public function __construct()
    {
        $this->token = (string) config('services.ghn.token', env('GHN_TOKEN', '84d13de2-aa85-11f1-a973-aee5264794df'));
        $this->shopId = (int) config('services.ghn.shop_id', env('GHN_SHOP_ID', 217482));
        $this->baseUrl = rtrim((string) config('services.ghn.base_url', env('GHN_BASE_URL', 'https://dev-online-gateway.ghn.vn/shiip/public-api')), '/');
        $this->fromDistrictId = (int) config('services.ghn.from_district_id', env('GHN_FROM_DISTRICT_ID', 1482));
    }

    /**
     * Get list of all provinces/cities in Vietnam from GHN.
     */
    public function getProvinces(): array
    {
        $response = Http::withHeaders([
            'Token' => $this->token,
            'token' => $this->token,
            'Content-Type' => 'application/json',
        ])->get("{$this->baseUrl}/master-data/province");

        if (! $response->successful()) {
            Log::error('GHN getProvinces error', ['status' => $response->status(), 'body' => $response->body()]);
            throw new Exception($response->json('message') ?? 'Không thể lấy danh sách Tỉnh/Thành từ GHN.');
        }

        $data = $response->json('data') ?? [];

        return collect($data)
            ->filter(fn ($p) => ($p['Status'] ?? 1) === 1)
            ->values()
            ->all();
    }

    /**
     * Get list of districts by province ID from GHN.
     */
    public function getDistricts(int $provinceId): array
    {
        $response = Http::withHeaders([
            'Token' => $this->token,
            'token' => $this->token,
            'Content-Type' => 'application/json',
        ])->post("{$this->baseUrl}/master-data/district", [
            'province_id' => $provinceId,
        ]);

        if (! $response->successful()) {
            Log::error('GHN getDistricts error', ['province_id' => $provinceId, 'status' => $response->status(), 'body' => $response->body()]);
            throw new Exception($response->json('message') ?? 'Không thể lấy danh sách Quận/Huyện từ GHN.');
        }

        return $response->json('data') ?? [];
    }

    /**
     * Get list of wards by district ID from GHN.
     */
    public function getWards(int $districtId): array
    {
        $response = Http::withHeaders([
            'Token' => $this->token,
            'token' => $this->token,
            'Content-Type' => 'application/json',
        ])->get("{$this->baseUrl}/master-data/ward", [
            'district_id' => $districtId,
        ]);

        if (! $response->successful()) {
            Log::error('GHN getWards error', ['district_id' => $districtId, 'status' => $response->status(), 'body' => $response->body()]);
            throw new Exception($response->json('message') ?? 'Không thể lấy danh sách Phường/Xã từ GHN.');
        }

        return $response->json('data') ?? [];
    }

    /**
     * Calculate shipping fee based on destination district and ward.
     */
    public function calculateFee(
        int $toDistrictId,
        string $toWardCode,
        int $weight = 500,
        int $length = 20,
        int $width = 15,
        int $height = 10,
        int $insuranceValue = 0
    ): array {
        $shopId = (int) config('services.ghn.shop_id', env('GHN_SHOP_ID', $this->shopId));

        $payload = [
            'shop_id' => $shopId,
            'from_district_id' => $this->fromDistrictId,
            'to_district_id' => $toDistrictId,
            'to_ward_code' => (string) $toWardCode,
            'service_type_id' => 2, // Giao hàng chuẩn
            'weight' => max(100, $weight),
            'length' => max(5, $length),
            'width' => max(5, $width),
            'height' => max(5, $height),
            'insurance_value' => max(0, $insuranceValue),
            'coupon' => null,
        ];

        $headers = [
            'Token' => (string) config('services.ghn.token', env('GHN_TOKEN', $this->token)),
            'token' => (string) config('services.ghn.token', env('GHN_TOKEN', $this->token)),
            'ShopId' => $shopId,
            'shop_id' => $shopId,
            'Content-Type' => 'application/json',
        ];

        $response = Http::withHeaders($headers)->post("{$this->baseUrl}/v2/shipping-order/fee", $payload);

        if (! $response->successful()) {
            Log::error('GHN calculateFee error', ['payload' => $payload, 'status' => $response->status(), 'body' => $response->body()]);
            $msg = $response->json('message') ?? $response->json('code_message_value') ?? 'Lỗi tính phí giao hàng GHN.';
            throw new Exception($msg);
        }

        return $response->json('data') ?? [];
    }

    /**
     * Create real shipping order on GHN Sandbox / Production API.
     */
    public function createShippingOrder(Order $order, array $customData = []): array
    {
        $order->loadMissing('items');

        $toDistrictId = (int) ($customData['to_district_id'] ?? $order->to_district_id ?? 0);
        $toWardCode = trim((string) ($customData['to_ward_code'] ?? $order->to_ward_code ?? ''));
        $toName = trim((string) ($order->shipping_name ?? ''));
        $toPhone = trim((string) ($order->phone ?: ($order->shipping_phone ?? '')));
        $toAddress = trim((string) ($order->shipping_address ?? ''));

        if ($toDistrictId < 1 || $toWardCode === '' || $toName === '' || $toPhone === '' || $toAddress === '') {
            throw new Exception('Đơn hàng thiếu tên, số điện thoại hoặc địa chỉ GHN hợp lệ (quận/huyện, phường/xã).');
        }

        $items = $order->items->map(fn ($item) => [
            'name' => $item->product_name ?? 'Sản phẩm thể thao',
            'code' => $item->sku ?? 'SP-'.$item->product_id,
            'quantity' => (int) $item->quantity,
            'price' => (int) $item->unit_price,
            'weight' => 300,
        ])->toArray();

        if (empty($items)) {
            $items = [[
                'name' => 'Gói hàng thể thao Striker',
                'quantity' => 1,
                'price' => (int) $order->total_amount,
                'weight' => 300,
            ]];
        }

        $totalWeight = max(300, (int) ($customData['weight'] ?? $order->items->sum(fn ($i) => ((int) ($i->quantity ?: 1)) * 300)));

        $shopId = (int) config('services.ghn.shop_id', env('GHN_SHOP_ID', $this->shopId));

        $payload = [
            'shop_id' => $shopId,
            'client_order_code' => $order->order_number ?: ($order->order_code ?: ('ORD-'.$order->id)),
            'payment_type_id' => 1, // 1: Bên gửi (Shop) trả phí cước GHN, tiền ship đã được cộng vào cod_amount để GHN thu hộ và đối soát lại cho shop
            'note' => $customData['note'] ?? $order->note ?? 'Hàng giá trị cao, vui lòng cho xem và thử hàng.',
            'required_note' => $customData['required_note'] ?? 'CHOTHUHANG',
            'from_name' => 'CRS Cyber-Sport Store',
            'from_phone' => '0345155356',
            'from_address' => '41A Phú Diễn, Phường Phú Diễn, Quận Bắc Từ Liêm, Hà Nội',
            'from_district_id' => $this->fromDistrictId,
            'return_phone' => '0345155356',
            'return_address' => '41A Phú Diễn, Phường Phú Diễn, Quận Bắc Từ Liêm, Hà Nội',
            'return_district_id' => $this->fromDistrictId,
            'to_name' => $toName,
            'to_phone' => $toPhone,
            'to_address' => $toAddress,
            'to_district_id' => $toDistrictId,
            'to_ward_code' => $toWardCode,
            'cod_amount' => ($order->payment_method === 'cod') ? (int) $order->total_amount : 0,
            'content' => 'Đơn hàng thể thao #'.$order->order_number,
            'weight' => $totalWeight,
            'length' => (int) ($customData['length'] ?? 20),
            'width' => (int) ($customData['width'] ?? 15),
            'height' => (int) ($customData['height'] ?? 10),
            'insurance_value' => 0,
            'service_type_id' => 2,
            'items' => $items,
        ];

        $response = Http::withHeaders([
            'Token' => (string) config('services.ghn.token', env('GHN_TOKEN', $this->token)),
            'token' => (string) config('services.ghn.token', env('GHN_TOKEN', $this->token)),
            'ShopId' => $shopId,
            'shop_id' => $shopId,
            'Content-Type' => 'application/json',
        ])->post("{$this->baseUrl}/v2/shipping-order/create", $payload);

        if (! $response->successful()) {
            Log::error('GHN createShippingOrder error', [
                'order_id' => $order->id,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            $msg = $response->json('message') ?? $response->json('code_message_value') ?? 'Không thể tạo đơn giao hàng qua GHN.';
            throw new Exception($msg);
        }

        return $response->json('data') ?? [];
    }
}
