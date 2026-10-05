<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChatController extends Controller
{
    /**
     * Lấy ID của Admin hiện tại hoặc Admin mặc định
     */
    private function getAdminId(): int
    {
        $adminUser = auth('api')->user() ?? Auth::user();
        abort_unless($adminUser && $adminUser->role === 'admin', 403);

        return $adminUser->id;
    }

    /**
     * Lấy danh sách những User đã từng nhắn tin với Admin kèm tin nhắn mới nhất và số tin chưa đọc
     */
    public function getUsers(Request $request): JsonResponse
    {
        $adminId = $this->getAdminId();

        // 1. Tìm tất cả ID của người dùng (khách hàng) có tương tác với admin
        $userIds = Message::where(function ($q) use ($adminId) {
                $q->where('receiver_id', $adminId)->where('sender_id', '!=', $adminId);
            })
            ->orWhere(function ($q) use ($adminId) {
                $q->where('sender_id', $adminId)->where('receiver_id', '!=', $adminId);
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($msg) use ($adminId) {
                return (int) ($msg->sender_id == $adminId ? $msg->receiver_id : $msg->sender_id);
            })
            ->filter(fn ($id) => $id !== (int) $adminId)
            ->unique()
            ->values()
            ->toArray();

        // 2. Lấy thông tin chi tiết các khách hàng đó (loại bỏ admin)
        $users = User::whereIn('id', $userIds)
            ->where('id', '!=', $adminId)
            ->where('role', '!=', 'admin')
            ->select('id', 'name', 'email', 'phone', 'role', 'created_at')
            ->get();

        // 3. Đính kèm tin nhắn cuối cùng và số lượng tin nhắn chưa đọc
        $usersWithDetails = $users->map(function ($user) use ($adminId) {
            $lastMessage = Message::where(function ($q) use ($user, $adminId) {
                $q->where('sender_id', $user->id)->where('receiver_id', $adminId);
            })->orWhere(function ($q) use ($user, $adminId) {
                $q->where('sender_id', $adminId)->where('receiver_id', $user->id);
            })->orderByDesc('created_at')->first();

            $unreadCount = Message::where('sender_id', $user->id)
                ->where('receiver_id', $adminId)
                ->where('is_read', false)
                ->count();

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'phone_number' => $user->phone,
                'avatar' => null,
                'role' => $user->role,
                'last_message' => $lastMessage ? $lastMessage->content : '',
                'last_message_time' => $lastMessage ? $lastMessage->created_at : null,
                'unread_count' => $unreadCount,
            ];
        })->sortByDesc(function ($item) {
            return $item['last_message_time'] ? $item['last_message_time']->timestamp : 0;
        })->values();

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách người dùng nhắn tin thành công.',
            'data' => $usersWithDetails,
        ]);
    }

    /**
     * Tìm kiếm khách hàng trong hệ thống theo tên, email, sđt để Admin chủ động nhắn tin
     */
    public function searchCustomers(Request $request): JsonResponse
    {
        $adminId = $this->getAdminId();
        $query = trim((string) $request->input('query', ''));

        $customers = User::where('id', '!=', $adminId)
            ->where('role', '!=', 'admin')
            ->when($query !== '', function ($q) use ($query) {
                $q->where(function ($sub) use ($query) {
                    $sub->where('name', 'like', "%{$query}%")
                        ->orWhere('email', 'like', "%{$query}%")
                        ->orWhere('phone', 'like', "%{$query}%");
                });
            })
            ->select('id', 'name', 'email', 'phone', 'role', 'created_at')
            ->limit(30)
            ->get();

        $customersWithDetails = $customers->map(function ($user) use ($adminId) {
            $lastMessage = Message::where(function ($q) use ($user, $adminId) {
                $q->where('sender_id', $user->id)->where('receiver_id', $adminId);
            })->orWhere(function ($q) use ($user, $adminId) {
                $q->where('sender_id', $adminId)->where('receiver_id', $user->id);
            })->orderByDesc('created_at')->first();

            $unreadCount = Message::where('sender_id', $user->id)
                ->where('receiver_id', $adminId)
                ->where('is_read', false)
                ->count();

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'phone_number' => $user->phone,
                'avatar' => null,
                'role' => $user->role,
                'last_message' => $lastMessage ? $lastMessage->content : '',
                'last_message_time' => $lastMessage ? $lastMessage->created_at : null,
                'unread_count' => $unreadCount,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Tìm kiếm khách hàng thành công.',
            'data' => $customersWithDetails,
        ]);
    }

    /**
     * Lấy thông tin 1 User để Admin bắt đầu cuộc trò chuyện mới
     */
    public function getUserDetail(Request $request, $userId): JsonResponse
    {
        $user = User::select('id', 'name', 'email', 'phone', 'role', 'created_at')
            ->find($userId);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy khách hàng.',
            ], 404);
        }

        $adminId = $this->getAdminId();
        $lastMessage = Message::where(function ($q) use ($user, $adminId) {
            $q->where('sender_id', $user->id)->where('receiver_id', $adminId);
        })->orWhere(function ($q) use ($user, $adminId) {
            $q->where('sender_id', $adminId)->where('receiver_id', $user->id);
        })->orderByDesc('created_at')->first();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'phone_number' => $user->phone,
                'avatar' => null,
                'role' => $user->role,
                'last_message' => $lastMessage ? $lastMessage->content : '',
                'last_message_time' => $lastMessage ? $lastMessage->created_at : null,
                'unread_count' => 0,
            ],
        ]);
    }

    /**
     * Lấy lịch sử tin nhắn của một User cụ thể và đánh dấu đã đọc
     */
    public function getMessages(Request $request, $userId): JsonResponse
    {
        $adminId = $this->getAdminId();

        // Đánh dấu các tin nhắn gửi từ User tới Admin là đã đọc
        Message::where('sender_id', $userId)
            ->where('receiver_id', $adminId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        // Lấy lịch sử hội thoại
        $messages = Message::with(['sender', 'receiver'])
            ->where(function ($q) use ($userId, $adminId) {
                $q->where('sender_id', $userId)->where('receiver_id', $adminId);
            })
            ->orWhere(function ($q) use ($userId, $adminId) {
                $q->where('sender_id', $adminId)->where('receiver_id', $userId);
            })
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lấy lịch sử tin nhắn thành công.',
            'data' => $messages,
        ]);
    }

    /**
     * Admin gửi tin nhắn phản hồi cho User
     */
    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'message' => 'sometimes|nullable|string',
            'content' => 'sometimes|nullable|string',
        ]);

        $content = $request->input('message') ?? $request->input('content');
        if (empty(trim((string) $content))) {
            return response()->json([
                'success' => false,
                'message' => 'Nội dung tin nhắn không được để trống.',
            ], 400);
        }

        $adminId = $this->getAdminId();

        $message = Message::create([
            'sender_id' => $adminId,
            'receiver_id' => $request->input('user_id'),
            'content' => trim((string) $content),
            'is_read' => true, // Admin gửi thì đã đọc
        ]);

        $message->load(['sender', 'receiver']);

        return response()->json([
            'success' => true,
            'message' => 'Admin gửi tin nhắn thành công.',
            'data' => $message,
            'id' => $message->id,
            'sender_id' => $message->sender_id,
            'receiver_id' => $message->receiver_id,
            'content' => $message->content,
            'is_read' => $message->is_read,
            'created_at' => $message->created_at,
        ]);
    }

    /**
     * Lấy tổng số tin nhắn chưa đọc cho Admin (dùng cho Badge chuông thông báo)
     */
    public function getUnreadCount(Request $request): JsonResponse
    {
        $adminId = $this->getAdminId();

        $totalUnread = Message::where('receiver_id', $adminId)
            ->where('is_read', false)
            ->count();

        $recentMessages = Message::with('sender')
            ->where('receiver_id', $adminId)
            ->where('is_read', false)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'unread_count' => $totalUnread,
            'count' => $totalUnread,
            'data' => [
                'unread_count' => $totalUnread,
                'recent_messages' => $recentMessages,
            ],
        ]);
    }

    /**
     * Đánh dấu toàn bộ tin nhắn của một User là đã đọc
     */
    public function markAsRead(Request $request, $userId): JsonResponse
    {
        $adminId = $this->getAdminId();

        Message::where('sender_id', $userId)
            ->where('receiver_id', $adminId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Đã đánh dấu tin nhắn là đã đọc.',
        ]);
    }
}
