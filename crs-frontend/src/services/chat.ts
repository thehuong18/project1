import api from './api';

export interface ChatUser {
  id: number;
  name: string;
  email?: string;
  phone_number?: string;
  avatar?: string;
  role?: string;
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
  sender?: ChatUser;
  receiver?: ChatUser;
}

export interface AdminChatUser {
  id: number;
  name: string;
  email?: string;
  phone_number?: string;
  avatar?: string;
  role?: string;
  last_message: string;
  last_message_time: string | null;
  unread_count: number;
}

export interface AdminUnreadCountResponse {
  unread_count: number;
  recent_messages: ChatMessage[];
}

/**
 * 1. User: Lấy toàn bộ lịch sử tin nhắn với Admin
 */
export async function fetchUserMessages(): Promise<ChatMessage[]> {
  try {
    const res = await api.get('/user/chat/messages');
    return Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
  } catch (error) {
    console.error('Lỗi tải tin nhắn User:', error);
    return [];
  }
}

/**
 * 2. User: Gửi tin nhắn tới Admin
 */
export async function sendUserMessage(message: string): Promise<ChatMessage> {
  const res = await api.post('/user/chat/send', { message });
  return res.data?.data || res.data;
}

/**
 * 3. Admin: Lấy danh sách khách hàng đã nhắn tin
 */
export async function fetchAdminChatUsers(): Promise<AdminChatUser[]> {
  try {
    const res = await api.get('/admin/chat/users');
    return Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
  } catch (error) {
    console.error('Lỗi tải danh sách chat Admin:', error);
    return [];
  }
}

/**
 * 4. Admin: Lấy chi tiết lịch sử tin nhắn của 1 User
 */
export async function fetchAdminMessages(userId: number): Promise<ChatMessage[]> {
  try {
    const res = await api.get(`/admin/chat/messages/${userId}`);
    return Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
  } catch (error) {
    console.error(`Lỗi tải tin nhắn Admin với user ${userId}:`, error);
    return [];
  }
}

/**
 * 5. Admin: Gửi tin nhắn phản hồi cho User
 */
export async function sendAdminMessage(userId: number, message: string): Promise<ChatMessage> {
  const res = await api.post('/admin/chat/send', { user_id: userId, message });
  return res.data?.data || res.data;
}

/**
 * 6. Admin: Lấy tổng số tin nhắn chưa đọc & tin nhắn gần nhất (cho badge chuông)
 */
export async function fetchAdminUnreadCount(): Promise<AdminUnreadCountResponse> {
  try {
    const res = await api.get('/admin/chat/unread-count');
    const data = res.data?.data || res.data;
    return {
      unread_count: data?.unread_count ?? data?.count ?? 0,
      recent_messages: Array.isArray(data?.recent_messages) ? data.recent_messages : [],
    };
  } catch (error) {
    console.error('Lỗi lấy số tin nhắn chưa đọc:', error);
    return { unread_count: 0, recent_messages: [] };
  }
}

/**
 * 7. Admin: Đánh dấu tin nhắn của 1 User là đã đọc
 */
export async function markAdminMessagesAsRead(userId: number): Promise<void> {
  try {
    await api.patch(`/admin/chat/messages/${userId}/read`);
  } catch (error) {
    console.error('Lỗi đánh dấu tin nhắn đã đọc:', error);
  }
}

/**
 * 8. Admin: Tìm kiếm khách hàng trong hệ thống (cả khách chưa từng nhắn)
 */
export async function searchAdminCustomers(query: string): Promise<AdminChatUser[]> {
  try {
    const res = await api.get('/admin/chat/search', { params: { query } });
    return Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
  } catch (error) {
    console.error('Lỗi tìm kiếm khách hàng:', error);
    return [];
  }
}

/**
 * 9. Admin: Lấy thông tin 1 User để mở chat trực tiếp
 */
export async function fetchChatUserDetail(userId: number): Promise<AdminChatUser | null> {
  try {
    const res = await api.get(`/admin/chat/user-detail/${userId}`);
    return res.data?.data || res.data || null;
  } catch (error) {
    console.error(`Lỗi lấy thông tin user ${userId}:`, error);
    return null;
  }
}

