<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;

Route::any('{service}/{path?}', function (Request $request, string $service, ?string $path = null) {
    $serviceMap = [
        'auth' => env('AUTH_SERVICE_URL', 'http://127.0.0.1:8001/api'),
        'catalog' => env('CATALOG_SERVICE_URL', 'http://127.0.0.1:8002/api'),
        'order' => env('ORDER_SERVICE_URL', 'http://127.0.0.1:8003/api'),
        'payment' => env('PAYMENT_SERVICE_URL', 'http://127.0.0.1:8004/api'),
    ];

    $serviceRoutes = [
        'auth'     => 'auth',
        'users'    => 'auth',

        // Thêm mapping cho frontend:
        'products'   => 'catalog',
        'categories' => 'catalog',
        'brands'     => 'catalog',
        'banners'    => 'catalog',
        'reviews'    => 'catalog',

        'orders'     => 'order',
        'coupons'    => 'order',

        'payments'   => 'payment',
        'momo'       => 'payment',
    ];

    $targetService = $serviceRoutes[$service] ?? null;

    if ($targetService === null || ! isset($serviceMap[$targetService])) {
        abort(404, 'Service not found.');
    }

    $targetPath = trim($service . '/' . (string) ($path ?? ''), '/');
    $targetUrl = rtrim($serviceMap[$targetService], '/') . '/' . $targetPath;

    $forwardedHeaders = [
        'X-Forwarded-For' => $request->ip(),
    ];

    if ($token = $request->bearerToken()) {
        $forwardedHeaders['Authorization'] = 'Bearer ' . $token;
    }

    $response = Http::acceptJson()
        ->withHeaders($forwardedHeaders)
        ->withOptions(['http_errors' => false])
        ->send(
            $request->method(),
            $targetUrl,
            [
                'query' => $request->query(),
                'json' => $request->except(['_token']),
            ]
        );

    return response($response->body(), $response->status())
        ->withHeaders($response->headers());
})->where('path', '.*');
