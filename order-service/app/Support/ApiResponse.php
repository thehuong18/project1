<?php

namespace App\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

final class ApiResponse
{
    public static function ok(string $message, mixed $data = null, int $status = 200, array $extra = []): JsonResponse
    {
        return response()->json(array_merge([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'errors' => null,
        ], $extra), $status);
    }

    public static function fail(string $message, array $errors = [], int $status = 422, mixed $data = null, array $extra = []): JsonResponse
    {
        return response()->json(array_merge([
            'success' => false,
            'message' => $message,
            'data' => $data,
            'errors' => $errors ?: null,
        ], $extra), $status);
    }

    public static function paginated(string $message, LengthAwarePaginator $paginator, array $extra = []): JsonResponse
    {
        return response()->json(array_merge([
            'success' => true,
            'message' => $message,
            'data' => $paginator->items(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
            'errors' => null,
        ], $extra));
    }
}
