import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  fetchAdminChatUsers, 
  fetchAdminMessages, 
  sendAdminMessage, 
  searchAdminCustomers,
  fetchChatUserDetail,
  markAdminMessagesAsRead,
  type AdminChatUser, 
  type ChatMessage 
} from '../../services/chat';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Send, 
  Search, 
  User, 
  MessageSquare, 
  Loader2, 
  RefreshCw, 
  CheckCheck,
  UserPlus,
  Users,
  AlertCircle
} from 'lucide-react';

interface AdminChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUserId?: number | null;
}

const ADMIN_QUICK_RESPONSES = [
  'Dạ vâng, shop đã ghi nhận thông tin của bạn ạ!',
  'Bạn vui lòng cung cấp chiều dài chân (cm) để shop tư vấn chuẩn size nhất nhé.',
  'Đơn hàng của bạn đã được xác nhận và đang chờ đóng gói vận chuyển ạ.',
  'Shop hỗ trợ đổi size miễn phí trong vòng 30 ngày nếu chưa qua sử dụng bạn nhé!',
  '⚠️ Chào bạn, đơn hàng của bạn gặp chút chậm trễ vận chuyển do bên bưu tá, shop đang hối thúc xử lý gấp ạ!',
  '📦 Chào bạn, shop xin phép xác nhận lại địa chỉ nhận hàng để đảm bảo giao đúng hẹn ạ.'
];

export const AdminChatModal: React.FC<AdminChatModalProps> = ({ 
  isOpen, 
  onClose, 
  initialUserId = null 
}) => {
  const { user: currentAdmin } = useApp();
  const [activeTab, setActiveTab] = useState<'conversations' | 'all_customers'>('conversations');
  const [users, setUsers] = useState<AdminChatUser[]>([]);
  const [searchResults, setSearchResults] = useState<AdminChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchingAll, setSearchingAll] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedUserRef = useRef<AdminChatUser | null>(null);
  selectedUserRef.current = selectedUser;
  const usersRef = useRef<AdminChatUser[]>([]);
  usersRef.current = users;

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // 1. Tải tin nhắn của User đang chọn
  const loadMessages = useCallback(async (userId: number, showLoading = false) => {
    if (showLoading) setLoadingMessages(true);
    try {
      const msgList = await fetchAdminMessages(userId);
      setMessages(msgList);
    } catch (err) {
      console.error(`Lỗi tải tin nhắn với user ${userId}:`, err);
    } finally {
      if (showLoading) {
        setLoadingMessages(false);
        setTimeout(() => scrollToBottom(false), 50);
      }
    }
  }, [scrollToBottom]);

  // 2. Tải danh sách User đã từng nhắn tin
  const loadUsers = useCallback(async (isInitial = false) => {
    if (isInitial && usersRef.current.length === 0) setLoadingUsers(true);
    try {
      const rawUserList = await fetchAdminChatUsers();
      const userList = rawUserList.filter(u => u.role !== 'admin' && u.id !== Number(currentAdmin?.id || 1));
      setUsers(userList);

      // Nếu có initialUserId truyền từ prop
      if (initialUserId) {
        const matched = userList.find(u => u.id === initialUserId);
        if (matched) {
          if (selectedUserRef.current?.id !== matched.id) {
            setSelectedUser(matched);
            void loadMessages(matched.id, true);
          }
        } else {
          // Khách hàng chưa từng nhắn -> lấy thông tin chi tiết của họ từ DB
          const detail = await fetchChatUserDetail(initialUserId);
          if (detail && detail.role !== 'admin') {
            if (selectedUserRef.current?.id !== detail.id) {
              setSelectedUser(detail);
              setUsers(prev => [detail, ...prev.filter(u => u.id !== detail.id)]);
              void loadMessages(detail.id, true);
            }
          }
        }
      } else if ((!selectedUserRef.current || selectedUserRef.current.id === Number(currentAdmin?.id || 1)) && userList.length > 0) {
        // Chưa chọn user nào hoặc bị trỏ vào admin -> mặc định chọn khách hàng đầu tiên
        const firstUser = userList[0];
        setSelectedUser(firstUser);
        void loadMessages(firstUser.id, true);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách người dùng chat:', err);
    } finally {
      if (isInitial) setLoadingUsers(false);
    }
  }, [initialUserId, loadMessages, currentAdmin?.id]);

  // 3. Tìm kiếm trong toàn bộ khách hàng hệ thống
  const handleSearchAllCustomers = useCallback(async (query: string) => {
    setSearchingAll(true);
    try {
      const results = await searchAdminCustomers(query);
      setSearchResults(results.filter(u => u.role !== 'admin' && u.id !== Number(currentAdmin?.id || 1)));
    } catch (err) {
      console.error('Lỗi tìm kiếm khách hàng:', err);
    } finally {
      setSearchingAll(false);
    }
  }, [currentAdmin?.id]);

  // Khi người dùng gõ tìm kiếm -> tìm kiếm toàn hệ thống nếu ở tab all_customers hoặc nếu không có trong hội thoại
  useEffect(() => {
    if (!isOpen) return;

    if (searchQuery.trim().length > 0) {
      const timer = setTimeout(() => {
        void handleSearchAllCustomers(searchQuery.trim());
      }, 300);
      return () => clearTimeout(timer);
    } else if (activeTab === 'all_customers') {
      void handleSearchAllCustomers('');
    }
  }, [searchQuery, isOpen, activeTab, handleSearchAllCustomers]);

  // Polling tự động mỗi 3 giây khi modal đang mở
  useEffect(() => {
    if (!isOpen) return;

    void loadUsers(true);

    const interval = setInterval(() => {
      void loadUsers(false);
      if (selectedUserRef.current?.id) {
        void loadMessages(selectedUserRef.current.id, false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, loadUsers, loadMessages]);

  // Khi chọn user mới -> tải tin nhắn ngay
  const handleSelectUser = (u: AdminChatUser) => {
    setSelectedUser(u);
    // Nếu user chưa có trong danh sách active users thì thêm vào
    setUsers(prev => {
      if (!prev.some(item => item.id === u.id)) {
        return [u, ...prev];
      }
      return prev.map(item => item.id === u.id ? { ...item, unread_count: 0 } : item);
    });
    void markAdminMessagesAsRead(u.id);
    void loadMessages(u.id, true);
  };

  // Cuộn xuống cuối khi messages thay đổi
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, isOpen, scrollToBottom]);

  // Gửi tin nhắn phản hồi cho User
  const handleSendMessage = async (textToSendCustom?: string) => {
    const text = (textToSendCustom || inputText).trim();
    if (!text || !selectedUser || sending) return;

    setSending(true);
    if (!textToSendCustom) setInputText('');

    const optimistic: ChatMessage = {
      id: Date.now(),
      sender_id: Number(currentAdmin?.id || 1),
      receiver_id: Number(selectedUser.id),
      content: text,
      is_read: true,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => scrollToBottom(), 50);

    try {
      const res = await sendAdminMessage(selectedUser.id, text);
      setMessages(prev => prev.map(m => m.id === optimistic.id ? res : m));
      // Cập nhật lại tin nhắn cuối cùng trong danh sách user
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, last_message: text, last_message_time: new Date().toISOString() } : u));
    } catch (err) {
      console.error('Lỗi khi Admin gửi tin nhắn:', err);
    } finally {
      setSending(false);
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  if (!isOpen) return null;

  const filteredConversations = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone_number?.includes(searchQuery)
  );

  const totalUnreadAll = users.reduce((sum, u) => sum + (u.unread_count || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="bg-[#0F141E] border border-white/10 rounded-3xl w-full max-w-5xl h-[85vh] max-h-[800px] flex flex-col overflow-hidden shadow-2xl shadow-black/90">
        
        {/* Top Header */}
        <div className="h-16 px-6 bg-[#131823] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-lime-400 to-emerald-500 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-lime-400/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wider text-white">TRUNG TÂM TIN NHẮN KHÁCH HÀNG</h2>
                <span className="px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 text-[10px] font-mono font-bold">
                  LIVE-CHAT ADMIN
                </span>
                {totalUnreadAll > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-mono font-bold animate-pulse">
                    {totalUnreadAll} tin mới
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">Trò chuyện, hỗ trợ khách hàng và chủ động liên hệ khi phát sinh sự cố đơn hàng</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                void loadUsers(true);
                if (selectedUser) void loadMessages(selectedUser.id, true);
              }}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Làm mới danh sách"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body: Two Columns */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          
          {/* Left Column: User Conversations List & Directory Search */}
          <div className="w-full sm:w-80 md:w-96 border-r border-white/10 flex flex-col bg-[#0B0E17]/60 shrink-0">
            
            {/* Tabs: Hội thoại vs Danh bạ khách hàng */}
            <div className="flex border-b border-white/10 bg-[#0E121B]">
              <button
                onClick={() => setActiveTab('conversations')}
                className={`flex-1 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
                  activeTab === 'conversations'
                    ? 'border-lime-400 text-lime-400 bg-zinc-800/40'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Hội thoại ({users.length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('all_customers');
                  if (searchResults.length === 0) void handleSearchAllCustomers(searchQuery);
                }}
                className={`flex-1 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
                  activeTab === 'all_customers'
                    ? 'border-lime-400 text-lime-400 bg-zinc-800/40'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Tìm khách hàng</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeTab === 'conversations' ? "Lọc hội thoại theo tên, sđt..." : "Tìm khách hàng bất kỳ theo tên, email, sđt..."}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Conversation / Directory List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
              {activeTab === 'conversations' ? (
                /* TAB 1: DANH SÁCH HỘI THOẠI ĐÃ CHAT */
                loadingUsers ? (
                  <div className="p-8 text-center text-zinc-500 text-xs flex flex-col items-center gap-2 font-mono">
                    <Loader2 className="w-5 h-5 animate-spin text-lime-400" />
                    Đang tải danh sách khách hàng...
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-6 text-center text-zinc-400 text-xs space-y-3">
                    <AlertCircle className="w-8 h-8 mx-auto text-zinc-600" />
                    <p>Không tìm thấy trong hội thoại gần đây.</p>
                    <button
                      onClick={() => {
                        setActiveTab('all_customers');
                        void handleSearchAllCustomers(searchQuery);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-bold hover:bg-lime-400/20 transition inline-flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Tìm trong toàn bộ danh sách khách hàng →
                    </button>
                  </div>
                ) : (
                  filteredConversations.map((u) => {
                    const isSelected = selectedUser?.id === u.id;
                    const timeFormatted = u.last_message_time 
                      ? new Date(u.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <button
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className={`
                          w-full text-left p-3.5 flex items-start gap-3 transition-all duration-150 relative group
                          ${isSelected 
                            ? 'bg-zinc-800/90 border-l-4 border-l-lime-400' 
                            : 'hover:bg-zinc-900/60'}
                        `}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-sm">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-950" />
                        </div>

                        {/* User Info & Last Message */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-lime-400' : 'text-white'}`}>
                              {u.name}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                              {timeFormatted}
                            </span>
                          </div>
                          
                          <p className={`text-xs truncate ${u.unread_count > 0 ? 'text-white font-semibold' : 'text-zinc-400'}`}>
                            {u.last_message || 'Bấm để mở cuộc trò chuyện'}
                          </p>
                        </div>

                        {/* Unread Counter Badge */}
                        {u.unread_count > 0 && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full bg-lime-400 text-zinc-950 font-black text-[10px] font-mono shadow-md shadow-lime-400/30">
                            {u.unread_count}
                          </span>
                        )}
                      </button>
                    );
                  })
                )
              ) : (
                /* TAB 2: TÌM KIẾM TOÀN BỘ KHÁCH HÀNG HỆ THỐNG ĐỂ CHỦ ĐỘNG NHẮN TIN */
                searchingAll ? (
                  <div className="p-8 text-center text-zinc-500 text-xs flex flex-col items-center gap-2 font-mono">
                    <Loader2 className="w-5 h-5 animate-spin text-lime-400" />
                    Đang tìm kiếm khách hàng trong hệ thống...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    Không tìm thấy khách hàng nào khớp với "{searchQuery}"
                  </div>
                ) : (
                  searchResults.map((u) => {
                    const isSelected = selectedUser?.id === u.id;

                    return (
                      <button
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className={`
                          w-full text-left p-3.5 flex items-start gap-3 transition-all duration-150 relative group
                          ${isSelected 
                            ? 'bg-zinc-800/90 border-l-4 border-l-lime-400' 
                            : 'hover:bg-zinc-900/60'}
                        `}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400 font-bold text-sm">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-bold text-white truncate">
                              {u.name}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                              #{u.id}
                            </span>
                          </div>
                          
                          <div className="text-[11px] text-zinc-400 truncate">
                            {u.phone_number ? `📞 ${u.phone_number}` : (u.email ? `✉️ ${u.email}` : 'Khách hàng')}
                          </div>
                        </div>

                        <span className="shrink-0 px-2 py-1 rounded-lg bg-zinc-800 group-hover:bg-lime-400 group-hover:text-zinc-950 text-zinc-300 text-[10px] font-bold transition">
                          Nhắn tin
                        </span>
                      </button>
                    );
                  })
                )
              )}
            </div>
          </div>

          {/* Right Column: Active Chat Stream */}
          <div className="flex-1 flex flex-col bg-[#080B11] min-w-0">
            {selectedUser ? (
              <>
                {/* Active Chat Header */}
                <div className="h-16 px-6 bg-[#0E121B] border-b border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400 font-bold">
                      {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-white">{selectedUser.name}</h3>
                        <span className="px-2 py-0.2 text-[9px] font-mono bg-zinc-800 text-zinc-400 rounded">
                          ID: #{selectedUser.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        {selectedUser.phone_number && (
                          <span>📞 {selectedUser.phone_number}</span>
                        )}
                        {selectedUser.email && (
                          <span className="truncate max-w-xs">✉️ {selectedUser.email}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Đang kết nối
                    </span>
                  </div>
                </div>

                {/* Message Stream */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4 bg-[#080B11]">
                  {loadingMessages ? (
                    <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-mono gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-lime-400" />
                      Đang tải tin nhắn...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs text-center p-6 space-y-2">
                      <MessageSquare className="w-10 h-10 mb-1 text-zinc-700" />
                      <p className="font-semibold text-zinc-300">Chưa có tin nhắn nào với {selectedUser.name}</p>
                      <p className="text-zinc-500 max-w-sm">
                        Bạn có thể chủ động nhập tin nhắn bên dưới hoặc chọn mẫu sự cố / thông báo nhanh để liên hệ với khách hàng này ngay.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.sender_id === Number(currentAdmin?.id || 1) || msg.sender_id !== selectedUser.id;
                      const timeStr = msg.created_at
                        ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '';

                      return (
                        <div
                          key={msg.id || idx}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-end gap-2 max-w-[80%]">
                            {!isMe && (
                              <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-white font-bold shrink-0">
                                {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                            )}

                            <div
                              className={`
                                p-3.5 rounded-2xl text-xs leading-relaxed break-words shadow-lg
                                ${isMe
                                  ? 'bg-gradient-to-r from-lime-400 to-lime-500 text-zinc-950 font-medium rounded-br-none shadow-lime-400/10'
                                  : 'bg-zinc-800/90 text-zinc-100 border border-zinc-700/80 rounded-bl-none'}
                              `}
                            >
                              <div className="text-[10px] font-mono font-bold mb-1 opacity-80">
                                {isMe ? 'Quản trị viên (Bạn)' : selectedUser.name}
                              </div>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 mt-1 px-1">
                            <span>{timeStr}</span>
                            {isMe && <CheckCheck className="w-3.5 h-3.5 text-lime-400" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Replies Bar */}
                <div className="px-4 py-2 bg-[#0C1018] border-t border-white/5 overflow-x-auto custom-scrollbar flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-zinc-500 shrink-0">
                    Phản hồi mẫu:
                  </span>
                  {ADMIN_QUICK_RESPONSES.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => void handleSendMessage(res)}
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-700/60 text-[11px] text-zinc-300 hover:text-white transition"
                    >
                      {res}
                    </button>
                  ))}
                </div>

                {/* Chat Input Bar */}
                <div className="p-4 bg-[#0E121B] border-t border-white/10">
                  <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-2xl p-2 focus-within:border-lime-500 focus-within:ring-1 focus-within:ring-lime-500/20">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Nhập câu trả lời hoặc thông báo sự cố gửi đến ${selectedUser.name}...`}
                      disabled={sending}
                      className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none"
                    />
                    <button
                      onClick={() => void handleSendMessage()}
                      disabled={!inputText.trim() || sending}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 shadow-lg shadow-lime-400/20 transition-all"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Gửi phản hồi</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
                <User className="w-12 h-12 mb-3 text-zinc-700" />
                Vui lòng chọn một khách hàng từ danh sách bên trái để bắt đầu chat
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
