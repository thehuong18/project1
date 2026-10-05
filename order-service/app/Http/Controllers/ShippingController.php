<?php

namespace App\Http\Controllers;

use App\Services\GhnService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShippingController extends Controller
{
    public function __construct(
        protected GhnService $ghnService
    ) {}

    /**
     * Get list of provinces/cities from GHN.
     *
     * @group Shipping
     * @response 200 {"data":[{"ProvinceID":202,"ProvinceName":"Hồ Chí Minh"}]}
     */
    public function provinces(): JsonResponse
    {
        try {
            $provinces = $this->ghnService->getProvinces();

            return response()->json(['data' => $provinces]);
        } catch (Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get list of districts by province ID from GHN.
     *
     * @group Shipping
     * @queryParam province_id integer required The province ID. Example: 202
     */
    public function districts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'province_id' => ['required', 'integer'],
        ]);

        try {
            $districts = $this->ghnService->getDistricts((int) $validated['province_id']);

            return response()->json(['data' => $districts]);
        } catch (Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get list of wards by district ID from GHN.
     *
     * @group Shipping
     * @queryParam district_id integer required The district ID. Example: 1450
     */
    public function wards(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'district_id' => ['required', 'integer'],
        ]);

        try {
            $wards = $this->ghnService->getWards((int) $validated['district_id']);

            return response()->json(['data' => $wards]);
        } catch (Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Calculate shipping fee via GHN.
     *
     * @group Shipping
     * @bodyParam to_district_id integer required Destination district ID. Example: 1442
     * @bodyParam to_ward_code string required Destination ward code. Example: 20101
     * @bodyParam weight integer optional Total weight in grams (default: 500). Example: 500
     * @bodyParam insurance_value integer optional Declared goods value. Example: 1000000
     */
    public function calculateFee(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'to_district_id' => ['required', 'integer'],
            'to_ward_code' => ['required', 'string'],
            'weight' => ['sometimes', 'integer', 'min:1'],
            'length' => ['sometimes', 'integer', 'min:1'],
            'width' => ['sometimes', 'integer', 'min:1'],
            'height' => ['sometimes', 'integer', 'min:1'],
            'insurance_value' => ['sometimes', 'integer', 'min:0'],
        ]);

        try {
            $fee = $this->ghnService->calculateFee(
                toDistrictId: (int) $validated['to_district_id'],
                toWardCode: (string) $validated['to_ward_code'],
                weight: (int) ($validated['weight'] ?? 500),
                length: (int) ($validated['length'] ?? 20),
                width: (int) ($validated['width'] ?? 15),
                height: (int) ($validated['height'] ?? 10),
                insuranceValue: (int) ($validated['insurance_value'] ?? 0)
            );

            return response()->json([
                'message' => 'Tính phí vận chuyển thành công.',
                'data' => $fee,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Handle GHN Webhook callback for real-time tracking updates.
     */
    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        \Illuminate\Support\Facades\Log::info('GHN Webhook received:', $payload);

        $orderCode = $payload['OrderCode'] ?? $payload['order_code'] ?? null;
        $clientOrderCode = $payload['ClientOrderCode'] ?? $payload['client_order_code'] ?? null;
        $ghnStatus = strtolower((string) ($payload['Status'] ?? $payload['status'] ?? ''));

        if (! $orderCode && ! $clientOrderCode) {
            return response()->json(['message' => 'Missing OrderCode or ClientOrderCode'], 400);
        }

        $order = \App\Models\Order::query()
            ->when($orderCode, fn ($q) => $q->where('ghn_code', $orderCode))
            ->orWhere('order_number', $clientOrderCode)
            ->orWhere('order_code', $clientOrderCode)
            ->first();

        if (! $order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        // Map GHN status to internal order status
        $newStatus = match ($ghnStatus) {
            'ready_to_pick', 'picking' => 'processing',
            'picked', 'storing', 'transporting', 'sorting', 'delivering', 'money_collect_delivering' => 'shipping',
            'delivered', 'finish' => 'delivered',
            'cancel' => 'cancelled',
            default => null,
        };

        if ($newStatus) {
            $updateData = [
                'order_status' => $newStatus,
                'status' => $newStatus,
            ];

            if ($newStatus === 'delivered' && $order->payment_method === 'cod') {
                $updateData['payment_status'] = 'paid';
            }

            $order->update($updateData);
        }

        return response()->json([
            'success' => true,
            'message' => 'Webhook processed successfully',
            'order_status' => $newStatus ?? $order->order_status,
        ]);
    }
}

