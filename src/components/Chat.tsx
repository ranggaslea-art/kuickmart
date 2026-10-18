import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Store as StoreIcon, 
  User as UserIcon, 
  ShieldCheck, 
  Clock, 
  CheckCheck, 
  Sparkles, 
  PhoneCall, 
  RotateCcw,
  Headphones,
  Check,
  ChevronDown
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Store, MemberProfile, ChatMessage } from '../types';
import { getWhatsAppChatUrl } from '../utils/whatsappHelper';

interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentStore: Store;
  currentSlug?: string;
  member?: MemberProfile;
  visitorId: string;
  onUnreadChange?: (unreadCount: number) => void;
}

const DEFAULT_WELCOME_MSG: (storeName: string) => ChatMessage = (storeName) => ({
  id: 'welcome-01',
  storeId: 'all',
  customerVisitorId: 'system',
  customerName: 'Sistem LapakOke',
  senderRole: 'admin',
  senderName: `Admin ${storeName}`,
  text: `Halo! Selamat datang di ${storeName}. Ada yang bisa kami bantu seputar stok produk, promo hari ini, atau pengiriman pesanan Anda? Silakan kirim pesan di sini! 😊`,
  createdAt: Date.now() - 60000,
  read: true
});

const QUICK_SUGGESTIONS = [
  '👋 Halo, apakah toko buka sekarang?',
  '📦 Apakah produk di etalase ready stock?',
  '🚚 Berapa estimasi pengiriman instan?',
  '💳 Apakah bisa bayar di tempat (COD)?',
  '🔥 Tanya promo & voucher diskon hari ini'
];

export const Chat: React.FC<ChatProps> = ({
  isOpen,
  onClose,
  currentStore,
  currentSlug,
  member,
  visitorId,
  onUnreadChange
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeRole, setActiveRole] = useState<'customer' | 'admin'>('customer');
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'offline'>('connected');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveStoreId = currentStore.id || currentSlug || 'str_default';
  const effectiveStoreName = currentStore.name || 'Toko LapakOke';
  const customerDisplayName = member?.name?.trim() || 'Pelanggan LapakOke';

  const storageKey = `lapakoke_chat_messages_${effectiveStoreId}_${visitorId}`;

  // 1. Initial Load from LocalStorage fallback
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        } else {
          setMessages([DEFAULT_WELCOME_MSG(effectiveStoreName)]);
        }
      } else {
        setMessages([DEFAULT_WELCOME_MSG(effectiveStoreName)]);
      }
    } catch {
      setMessages([DEFAULT_WELCOME_MSG(effectiveStoreName)]);
    }
  }, [storageKey, effectiveStoreName]);

  // 2. Real-time Firestore sync via onSnapshot
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      const chatColRef = collection(db, 'chat_messages');
      // Query ordered by createdAt
      const q = query(chatColRef, orderBy('createdAt', 'asc'), limit(100));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setFirestoreStatus('connected');
          const incoming: ChatMessage[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as any;
            // Match messages relevant to this store or this customer visitor session
            const matchesStore = !data.storeId || data.storeId === effectiveStoreId || data.storeId === 'all';
            const matchesCustomer = !data.customerVisitorId || data.customerVisitorId === visitorId || data.customerVisitorId === 'system';

            if (matchesStore && (matchesCustomer || activeRole === 'admin')) {
              incoming.push({
                id: doc.id,
                storeId: data.storeId || effectiveStoreId,
                storeName: data.storeName || effectiveStoreName,
                customerVisitorId: data.customerVisitorId || visitorId,
                customerName: data.customerName || customerDisplayName,
                senderRole: data.senderRole || 'customer',
                senderName: data.senderName || 'Pengguna',
                text: data.text || '',
                createdAt: typeof data.createdAt?.toMillis === 'function' 
                  ? data.createdAt.toMillis() 
                  : (typeof data.createdAt === 'number' ? data.createdAt : Date.now()),
                read: data.read ?? false
              });
            }
          });

          if (incoming.length > 0) {
            setMessages((prev) => {
              // Combine welcome message if not already present
              const hasWelcome = incoming.some(m => m.id === 'welcome-01' || m.customerVisitorId === 'system');
              const finalMsgs = hasWelcome ? incoming : [DEFAULT_WELCOME_MSG(effectiveStoreName), ...incoming];
              try {
                localStorage.setItem(storageKey, JSON.stringify(finalMsgs));
              } catch (e) {
                // Ignore storage quota
              }
              return finalMsgs;
            });
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot listener notice:', error.message);
          setFirestoreStatus('offline');
        }
      );
    } catch (err: any) {
      console.warn('Firestore initialization notice:', err);
      setFirestoreStatus('offline');
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [effectiveStoreId, visitorId, activeRole, effectiveStoreName, customerDisplayName, storageKey]);

  // 3. Compute unread count for parent component badge
  useEffect(() => {
    if (isOpen) {
      if (onUnreadChange) onUnreadChange(0);
    } else {
      const unreadCount = messages.filter(m => m.senderRole === 'admin' && !m.read && m.id !== 'welcome-01').length;
      if (onUnreadChange) onUnreadChange(unreadCount);
    }
  }, [messages, isOpen, onUnreadChange]);

  // 4. Scroll to bottom when messages change or chat is opened
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages.length]);

  // 5. Send message action
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : inputText;
    const trimmed = rawText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInputText('');

    const newMsg: ChatMessage = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      storeId: effectiveStoreId,
      storeName: effectiveStoreName,
      customerVisitorId: visitorId,
      customerName: customerDisplayName,
      senderRole: activeRole,
      senderName: activeRole === 'admin' ? `Admin ${effectiveStoreName}` : customerDisplayName,
      text: trimmed,
      createdAt: Date.now(),
      read: activeRole === 'admin'
    };

    // Optimistic UI update
    setMessages((prev) => {
      const updated = [...prev, newMsg];
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        // Ignore storage
      }
      return updated;
    });

    // Send to Firestore
    try {
      await addDoc(collection(db, 'chat_messages'), {
        storeId: effectiveStoreId,
        storeName: effectiveStoreName,
        customerVisitorId: visitorId,
        customerName: customerDisplayName,
        senderRole: activeRole,
        senderName: activeRole === 'admin' ? `Admin ${effectiveStoreName}` : customerDisplayName,
        text: trimmed,
        createdAt: serverTimestamp(),
        read: activeRole === 'admin'
      });
      setFirestoreStatus('connected');
    } catch (err: any) {
      console.warn('Gagal menyimpan ke Firestore online, tersimpan di sesi lokal:', err);
      setFirestoreStatus('offline');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleWhatsAppFallback = () => {
    const phone = currentStore.whatsapp || currentStore.phone || '081234567890';
    const text = `Halo Admin ${effectiveStoreName}, saya ingin bertanya tentang pesanan / produk di toko online LapakOke.`;
    const url = getWhatsAppChatUrl(phone, text);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 flex flex-col justify-end pointer-events-none animate-in fade-in-0 duration-200">
      {/* Background backdrop on mobile only */}
      <div 
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs sm:hidden pointer-events-auto"
        onClick={onClose}
      />

      {/* Main Chat Box Container */}
      <div className="relative pointer-events-auto w-full sm:w-[410px] sm:max-h-[640px] h-[85vh] sm:h-[580px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200/80 transition-all">
        
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white p-4 shrink-0 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
                <StoreIcon className="w-5 h-5 text-amber-300" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-blue-700" title="Admin Online" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold truncate tracking-tight text-white">{effectiveStoreName}</h3>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-blue-100 flex items-center gap-1 truncate">
                  <Clock className="w-3 h-3 text-amber-300" />
                  {currentStore.openHours || 'Buka Setiap Hari'}
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Toggle Customer / Admin Mode (for testing & owner reply) */}
              <button
                type="button"
                onClick={() => setActiveRole(prev => prev === 'customer' ? 'admin' : 'customer')}
                title="Ganti Mode Chat: Pelanggan / Admin Toko"
                className={`text-[10px] font-bold px-2 py-1 rounded-xl transition-all border ${
                  activeRole === 'admin'
                    ? 'bg-amber-400 text-stone-900 border-amber-300 shadow-sm'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
                }`}
              >
                {activeRole === 'admin' ? 'Mode: Admin' : 'Mode: Pelanggan'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Tutup Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sync indicator banner */}
          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-100">
            <span className="flex items-center gap-1 text-[10px]">
              <span className={`w-2 h-2 rounded-full ${firestoreStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {firestoreStatus === 'connected' ? 'Firestore Realtime Terhubung' : 'Penyimpanan Sesi Aktif'}
            </span>
            <button
              onClick={handleWhatsAppFallback}
              className="text-[10px] font-semibold text-emerald-300 hover:text-emerald-200 underline flex items-center gap-1"
            >
              <PhoneCall className="w-3 h-3" />
              WhatsApp Toko
            </button>
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
          {/* Quick FAQ / Prompt Suggestions */}
          {messages.length <= 3 && (
            <div className="p-3 bg-white rounded-2xl border border-stone-200/70 shadow-xs mb-2">
              <p className="text-[11px] font-bold text-stone-700 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Pertanyaan Cepat:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(sug)}
                    className="text-[11px] text-stone-700 bg-stone-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-stone-200 px-2.5 py-1 rounded-xl text-left transition-all active:scale-95"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Bubbles */}
          {messages.map((msg, index) => {
            const isUserSender = (activeRole === 'customer' && msg.senderRole === 'customer') ||
                                 (activeRole === 'admin' && msg.senderRole === 'admin');
            const isAdminMessage = msg.senderRole === 'admin' || msg.senderRole === 'staff';

            return (
              <div 
                key={msg.id || index}
                className={`flex flex-col ${isUserSender ? 'items-end' : 'items-start'}`}
              >
                {/* Sender label */}
                <span className="text-[10px] font-semibold text-stone-600 mb-0.5 px-1 flex items-center gap-1">
                  {isAdminMessage && <ShieldCheck className="w-3 h-3 text-blue-600" />}
                  {msg.senderName}
                </span>

                <div className="flex items-end gap-1.5 max-w-[85%]">
                  {/* Message Bubble */}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-xs break-words ${
                      isUserSender
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-white text-stone-800 border border-stone-200/80 rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    
                    <div 
                      className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${
                        isUserSender ? 'text-blue-200' : 'text-stone-600'
                      }`}
                    >
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isUserSender && <CheckCheck className="w-3 h-3 text-blue-200" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-white border-t border-stone-200/80 shrink-0">
          {activeRole === 'admin' && (
            <div className="mb-2 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-[11px] text-amber-800">
              <span className="font-semibold">Mengetik sebagai Admin Toko</span>
              <button
                type="button"
                onClick={() => setActiveRole('customer')}
                className="text-[10px] underline font-bold text-amber-900"
              >
                Kembali ke Pelanggan
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeRole === 'admin' ? 'Balas sebagai Admin Toko...' : 'Ketik pesan untuk admin toko...'}
              disabled={isSending}
              className="flex-1 bg-stone-100 hover:bg-stone-50 focus:bg-white text-stone-900 text-sm px-3.5 py-2.5 rounded-2xl border border-stone-200 focus:border-blue-500 focus:outline-hidden transition-all"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isSending}
              className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-stone-200 disabled:text-stone-400 text-white flex items-center justify-center transition-all shadow-sm shrink-0 active:scale-95"
              title="Kirim Pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
