<?php

use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;

test('preserves the payment service callback redirect through the gateway', function () {
    Http::fake([
        'http://127.0.0.1:8004/api/payment/momo/callback*' => Http::response('', 302, [
            'Location' => 'http://localhost:5173/orders?payment=success&order_id=6',
        ]),
    ]);

    $response = $this->get('/api/payment/momo/callback?resultCode=0&requestId=test');

    $response->assertRedirect('http://localhost:5173/orders?payment=success&order_id=6');
    Http::assertSent(function (ClientRequest $request): bool {
        parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

        return str_starts_with($request->url(), 'http://127.0.0.1:8004/api/payment/momo/callback')
            && $request->hasHeader('Accept', 'application/json')
            && ($query['resultCode'] ?? null) === '0'
            && ($query['requestId'] ?? null) === 'test';
    });
});
