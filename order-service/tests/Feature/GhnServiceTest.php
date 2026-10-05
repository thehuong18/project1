<?php

use App\Models\Order;
use App\Models\OrderItem;
use App\Services\GhnService;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;

function makeOrderForGhnShipping(array $overrides = []): Order
{
    $order = new Order(array_merge([
        'id' => 25,
        'order_number' => 'ORD-25',
        'shipping_name' => 'Nguyen Van A',
        'phone' => '0901234567',
        'shipping_address' => '1 Test Street',
        'to_district_id' => 1450,
        'to_ward_code' => '20308',
        'payment_method' => 'cod',
        'total_amount' => 125000,
    ], $overrides));

    $item = new OrderItem([
        'product_id' => 7,
        'product_name' => 'Training shirt',
        'sku' => 'SHIRT-7',
        'quantity' => 1,
        'unit_price' => 125000,
    ]);
    $order->setRelation('items', new Collection([$item]));

    return $order;
}

function configureGhnTest(): void
{
    config([
        'services.ghn.token' => 'test-ghn-token',
        'services.ghn.shop_id' => 217482,
        'services.ghn.base_url' => 'https://dev-online-gateway.ghn.vn/shiip/public-api',
        'services.ghn.from_district_id' => 1482,
    ]);
}

test('creates a GHN shipment with stored unit price and destination details', function () {
    configureGhnTest();
    Http::fake([
        'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create' => Http::response([
            'code' => 200,
            'data' => ['order_code' => 'GHN123'],
        ]),
    ]);

    $result = app(GhnService::class)->createShippingOrder(makeOrderForGhnShipping());

    expect($result['order_code'])->toBe('GHN123');
    Http::assertSent(function (ClientRequest $request): bool {
        $payload = $request->data();

        return str_ends_with($request->url(), '/v2/shipping-order/create')
            && $payload['items'][0]['price'] === 125000
            && $payload['to_district_id'] === 1450
            && $payload['to_ward_code'] === '20308'
            && $payload['to_address'] === '1 Test Street'
            && $payload['cod_amount'] === 125000;
    });
});

test('does not send a GHN shipment when destination details are missing', function () {
    configureGhnTest();
    Http::fake();

    expect(fn () => app(GhnService::class)->createShippingOrder(makeOrderForGhnShipping([
        'to_district_id' => null,
        'to_ward_code' => null,
        'shipping_address' => '',
    ])))->toThrow(Exception::class, 'Đơn hàng thiếu tên, số điện thoại hoặc địa chỉ GHN hợp lệ');

    Http::assertNothingSent();
});
