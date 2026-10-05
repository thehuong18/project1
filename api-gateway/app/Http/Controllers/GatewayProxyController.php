<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

class GatewayProxyController extends Controller
{
    public function __invoke(Request $request, string $service, ?string $path = null): Response
    {
        $serviceRoutes = [
            'auth' => 'auth',
            'users' => 'auth',
            'addresses' => 'auth',
            'user' => 'auth',
            'admin' => 'auth',
            'chat' => 'auth',
            'catalog' => 'catalog',
            'products' => 'catalog',
            'categories' => 'catalog',
            'brands' => 'catalog',
            'banners' => 'catalog',
            'order' => 'order',
            'orders' => 'order',
            'cart' => 'order',
            'coupons' => 'order',
            'reviews' => 'order',
            'shipping' => 'order',
            'payment' => 'payment',
            'payments' => 'payment',
            'finance' => 'payment',
        ];

        $targetService = $serviceRoutes[$service] ?? null;
        $baseUrl = $targetService ? config("services.microservices.{$targetService}") : null;

        if (! is_string($baseUrl) || $baseUrl === '') {
            abort(Response::HTTP_NOT_FOUND, 'Service not found.');
        }

        $targetPath = 'api/'.trim($service.'/'.($path ?? ''), '/');
        $targetUrl = rtrim($baseUrl, '/').'/'.$targetPath;

        $forwardedHeaders = ['X-Forwarded-For' => $request->ip()];
        if ($token = $request->bearerToken()) {
            $forwardedHeaders['Authorization'] = 'Bearer '.$token;
        }

        $response = Http::acceptJson()
            ->withHeaders($forwardedHeaders)
            ->withOptions([
                'allow_redirects' => false,
                'http_errors' => false,
            ])
            ->send($request->method(), $targetUrl, [
                'query' => $request->query(),
                'json' => $request->except(['_token']),
            ]);

        return response($response->body(), $response->status())
            ->withHeaders($response->headers());
    }
}
