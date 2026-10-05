<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CatalogService
{
    protected string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.catalog.base_url', 'http://127.0.0.1:8002'), '/');
    }

    /**
     * Deduct stock for ordered items from the Catalog Service.
     *
     * @param array<int, array{product_id: int, quantity: int}> $items
     * @return bool
     */
    public function deductStock(array $items): bool
    {
        if (empty($items)) {
            return true;
        }

        $deductPayload = [
            'items' => collect($items)->map(fn ($item) => [
                'product_id' => (int) $item['product_id'],
                'quantity' => (int) ($item['quantity'] ?? 1),
            ])->values()->all(),
        ];

        try {
            $response = Http::timeout(3)->post("{$this->baseUrl}/api/products/deduct-stock", $deductPayload);

            if (!$response->successful()) {
                $errBody = $response->json();
                $errMsg = $errBody['message'] ?? $errBody['error']['message'] ?? 'Stock deduction failed with status ' . $response->status();
                Log::warning('Catalog stock deduction warning: ' . $errMsg);
                return false;
            }

            return true;
        } catch (Exception $e) {
            Log::warning('Cannot connect to Catalog Service to deduct stock: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Restore stock for cancelled/failed orders.
     *
     * @param array<int, array{product_id: int, quantity: int}> $items
     * @return bool
     */
    public function restoreStock(array $items): bool
    {
        if (empty($items)) {
            return true;
        }

        $payload = [
            'items' => collect($items)->map(fn ($item) => [
                'product_id' => (int) $item['product_id'],
                'quantity' => (int) ($item['quantity'] ?? 1),
            ])->values()->all(),
        ];

        try {
            $response = Http::timeout(3)->post("{$this->baseUrl}/api/products/restore-stock", $payload);
            return $response->successful();
        } catch (Exception $e) {
            Log::warning('Cannot connect to Catalog Service to restore stock: ' . $e->getMessage());
            return false;
        }
    }
}
