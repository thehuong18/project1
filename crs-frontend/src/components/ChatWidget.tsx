import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { fetchUserMessages, sendUserMessage, type ChatMessage } from '../services/chat';
import { 
  MessageSquare, 
  X, 
  Send, 
  Headphones, 
  Sparkles, 
  Loader2, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Maximize2, 
  Minimize2 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const QUICK_SUGGESTIONS = [
  '⚽ Tư vấn chọn size giày bóng đá chuẩn?',
  '📦 Kiểm tra tiến độ giao hàng của đơn?',
  '⚡ Shop có voucher giảm giá nào hôm nay?',
  '🔄 Hướng dẫn đổi trả nếu không vừa size?'
];

export const ChatWidget: React.FC = () => {
  const { user, cartDrawerOpen } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Tải danh sách tin nhắn từ Backend API
  const loadMessages = useCallback(async (isInitial = false) => {
    if (!user) return;
    if (isInitial) setLoading(true);

    try {
      const data = await fetchUserMessages();
      setMessages(data);

      // Nếu có tin nhắn mới từ admin và widget đang đóng -> tăng unread badge
      if (!isOpen && data.length > lastMessageCountRef.current) {
        const newAdminMsgs = data.slice(lastMessageCountRef.current).filter(m => m.sender_id !== Number(user.id));
        if (newAdminMsgs.length > 0) {
          setUnreadCount(prev => prev + newAdminMsgs.length);
        }
      }
      lastMessageCountRef.current = data.length;
    } catch (err) {
      console.error('Lỗi tải tin nhắn:', err);
    } finally {
      if (isInitial) {
        setLoading(false);
        setTimeout(() => scrollToBottom(false), 100);
      }
    }
  }, [user, isOpen, scrollToBottom]);

  // Load tin nhắn ban đầu & Polling tự động mỗi 3 giây khi mở chatbox
  useEffect(() => {
    if (!user) return;

    if (isOpen) {
      setUnreadCount(0);
      void loadMessages(messages.length === 0);
      const interval = setInterval(() => {
        void loadMessages(false);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [user, isOpen, loadMessages, messages.length]);

  // Tự động cuộn xuống dưới khi có tin nhắn mới
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, isOpen, scrollToBottom]);

  // Xử lý gửi tin nhắn
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || sending || !user) return;

    setSending(true);
    if (!customText) setInputMessage('');

    // Tạo tin nhắn tạm thời (Optimistic UI)
    const optimisticMsg: ChatMessage = {
      id: Date.now(),
      sender_id: Number(user.id),
      receiver_id: 1,
      content: textToSend,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(), 50);

    try {
      const sent = await sendUserMessage(textToSend);
      // Cập nhật lại với tin nhắn chuẩn từ database
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? sent : m));
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error);
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

  // Khi Giỏ hàng (CartDrawer) đang mở hoặc tài khoản là Admin -> Ẩn ChatWidget khách hàng
  if (cartDrawerOpen || user?.role === 'admin') {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end font-sans selection:bg-lime-400 selection:text-zinc-950 transition-all duration-200">
      {/* 1. LiveChat Popup Window */}
      {isOpen && (
        <div 
          className={`
            bg-[#0F141E]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden mb-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5
            ${isExpanded ? 'w-[90vw] sm:w-[480px] h-[650px]' : 'w-[90vw] sm:w-[380px] h-[520px]'}
          `}
        >
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-[#121927] p-4 border-b border-white/10 flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-lime-400 to-emerald-500 p-[2px] shadow-lg shadow-lime-400/20">
                  <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                    <Headphones className="w-5 h-5 text-lime-400" />
                  </div>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-sm text-white tracking-wide">STRIKER LIVE-SUPPORT</h3>
                  <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
                </div>
                <p className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Chuyên viên hỗ trợ trực tuyến
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/80 transition"
                title={isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/80 transition"
                title="Đóng chatbox"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content Area */}
          {!user ? (
            /* Chưa đăng nhập */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400 mb-4 shadow-lg shadow-lime-400/10">
                <Zap className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Trò chuyện với Admin</h4>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Vui lòng đăng nhập tài khoản để gửi tin nhắn tư vấn và lưu trữ toàn bộ lịch sử trao đổi đơn hàng.
              </p>
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider hover:brightness-110 flex items-center justify-center gap-2 shadow-lg shadow-lime-400/20 transition"
              >
                <span>Đăng nhập ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            /* Đã đăng nhập: Message Box */
            <>
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3 bg-[#0A0D14]/60">
                {/* Lời chào mở đầu */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5 text-xs text-zinc-300 leading-relaxed shadow-sm">
                  <div className="flex items-center gap-1.5 font-bold text-lime-400 mb-1 text-[11px] uppercase tracking-wider font-mono">
                    <Sparkles className="w-3.5 h-3.5" />
                    Hệ thống tư vấn STRIKER
                  </div>
                  Chào mừng <span className="font-semibold text-white">{user.name}</span>! Bạn đang cần hỗ trợ về sản phẩm, size giày hay đơn hàng nào? Hãy gửi tin nhắn bên dưới nhé!
                </div>

                {/* Danh sách gợi ý nhanh (chỉ hiện khi chưa có nhiều tin nhắn) */}
                {messages.length < 3 && (
                  <div className="space-y-1.5 pt-1 pb-2">
                    <div className="text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider">
                      Gợi ý câu hỏi nhanh:
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {QUICK_SUGGESTIONS.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => void handleSendMessage(sug)}
                          className="text-left text-xs text-zinc-300 hover:text-lime-400 bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 rounded-xl px-3 py-2 transition-all duration-200 flex items-center justify-between group"
                        >
                          <span className="truncate">{sug}</span>
                          <Send className="w-3 h-3 text-zinc-600 group-hover:text-lime-400 shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex items-center justify-center py-6 text-zinc-500 text-xs gap-2 font-mono">
                    <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
                    Đang tải lịch sử tin nhắn...
                  </div>
                )}

                {/* Tin nhắn chi tiết */}
                {messages.map((msg, index) => {
                  const isMe = msg.sender_id === Number(user.id);
                  const timeFormatted = msg.created_at 
                    ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <div
                      key={msg.id || index}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-end gap-2 max-w-[85%]">
                        {!isMe && (
                          <div className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lime-400 shrink-0 text-xs font-bold">
                            S
                          </div>
                        )}
                        <div
                          className={`
                            px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-md
                            ${isMe 
                              ? 'bg-gradient-to-r from-lime-400 to-lime-500 text-zinc-950 font-medium rounded-br-none shadow-lime-400/10' 
                              : 'bg-zinc-800/90 text-zinc-100 border border-zinc-700/80 rounded-bl-none'}
                          `}
                        >
                          {!isMe && (
                            <div className="text-[10px] font-bold text-lime-400 mb-0.5 font-mono">
                              Quản trị viên STRIKER
                            </div>
                          )}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500 mt-1 px-1">
                        {timeFormatted}
                      </span>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Form Footer */}
              <div className="p-3 bg-zinc-900/95 border-t border-white/10">
                <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800 rounded-2xl p-1.5 focus-within:border-lime-500/60 focus-within:ring-1 focus-within:ring-lime-500/30 transition-all">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhập tin nhắn..."
                    disabled={sending}
                    className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none"
                  />
                  <button
                    onClick={() => void handleSendMessage()}
                    disabled={!inputMessage.trim() || sending}
                    className="p-2 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 text-zinc-950 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 shadow-md shadow-lime-400/20 transition-all"
                    title="Gửi tin nhắn (Enter)"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 2. Floating LiveChat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          group relative flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95
          ${isOpen 
            ? 'bg-zinc-800 text-white border border-zinc-700' 
            : 'bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-500 text-zinc-950 font-black shadow-lime-400/30'}
        `}
        aria-label="Mở livechat hỗ trợ"
      >
        <div className="relative">
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
          )}
          {/* Unread Ping Badge */}
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white font-mono text-[10px] font-bold flex items-center justify-center shadow-lg shadow-red-500/50 animate-bounce">
              {unreadCount}
            </span>
          )}
        </div>

        <span className="text-xs tracking-wider uppercase hidden sm:inline-block font-extrabold">
          {isOpen ? 'Đóng chat' : 'Hỗ trợ trực tuyến'}
        </span>

        {!isOpen && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-950 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-zinc-950" />
          </span>
        )}
      </button>
    </div>
  );
};
