<?php

namespace App\Http\Controllers;

use App\Models\Banner;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function products(Request $request): JsonResponse
    {
        $query = Product::query()->with(['category', 'variants', 'productImages']);

        if ($request->boolean('active_only', true)) {
            $query->where('is_active', true);
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($products) use ($search): void {
                $products->where('name', 'like', "%{$search}%")
                    ->orWhere('brand', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($category = $request->query('category_id', $request->query('category'))) {
            $query->whereHas('category', function ($categories) use ($category): void {
                is_numeric($category)
                    ? $categories->whereKey($category)
                    : $categories->where('slug', $category);
            });
        }

        if ($brand = $request->query('brand')) {
            $query->where('brand', $brand);
        }

        $products = $query->orderByDesc('id')
            ->limit(min(max((int) $request->query('per_page', 100), 1), 500))
            ->get();

        return response()->json([
            'success' => true,
            'data' => $products,
            'errors' => null,
        ]);
    }

    public function checkStock(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array'],
            'items.*.product_id' => ['required', 'integer', 'min:1'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $stocks = Product::query()
            ->whereIn('id', collect($validated['items'])->pluck('product_id'))
            ->pluck('stock', 'id');

        $items = collect($validated['items'])->map(function (array $item) use ($stocks): array {
            $stock = (int) ($stocks[$item['product_id']] ?? 0);

            return [
                'product_id' => (int) $item['product_id'],
                'requested' => (int) $item['quantity'],
                'stock' => $stock,
                'available' => $stock >= (int) $item['quantity'],
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $items,
            'errors' => null,
        ]);
    }

    public function categories(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => Category::query()->where('is_active', true)->orderBy('name')->get(),
            'errors' => null,
        ]);
    }

    public function brands(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => Brand::query()->where('is_active', true)->orderBy('name')->get(),
            'errors' => null,
        ]);
    }

    public function banners(Request $request): JsonResponse
    {
        $banners = Banner::query()
            ->when($request->boolean('active_only'), fn ($query) => $query->where('is_active', true))
            ->orderBy('order')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $banners,
            'errors' => null,
        ]);
    }
}