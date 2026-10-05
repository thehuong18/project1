<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserChatController extends Controller
{
    public function index(): JsonResponse
    {
        $user = auth('api')->user();
        $admin = User::query()->where('role', 'admin')->first();

        if (! $admin) {
            return response()->json(['success' => true, 'data' => []]);
        }

        Message::query()
            ->where('sender_id', $admin->id)
            ->where('receiver_id', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        $messages = Message::query()
            ->with(['sender', 'receiver'])
            ->where(function ($query) use ($user, $admin): void {
                $query->where('sender_id', $user->id)->where('receiver_id', $admin->id);
            })
            ->orWhere(function ($query) use ($user, $admin): void {
                $query->where('sender_id', $admin->id)->where('receiver_id', $user->id);
            })
            ->orderBy('created_at')
            ->get();

        return response()->json(['success' => true, 'data' => $messages]);
    }

    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:4000'],
        ]);

        $content = trim($validated['message']);
        if ($content === '') {
            return response()->json([
                'success' => false,
                'message' => 'Nội dung tin nhắn không được để trống.',
            ], 422);
        }

        $admin = User::query()->where('role', 'admin')->firstOrFail();
        $message = Message::query()->create([
            'sender_id' => auth('api')->id(),
            'receiver_id' => $admin->id,
            'content' => $content,
            'is_read' => false,
        ])->load(['sender', 'receiver']);

        return response()->json([
            'success' => true,
            'data' => $message,
        ], 201);
    }
}