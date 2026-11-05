import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Users,
  ChevronLeft,
  ChevronRight,
  Bell,
  RefreshCw,
  Search
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  updateDoc,
  doc
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

export interface CustomerConversation {
  customerVisitorId: string;
  customerName: string;
  lastMessageText: string;
  lastMessageTime: number;
  unreadCount: number;
  messages: ChatMessage[];
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

// Helper normalize store slug / id to prevent store mismatch across subdomains
const normalizeStoreId = (rawSlug?: string, store?: Store): string => {
  const s = (rawSlug || store?.id || '').toLowerCase().trim();
  if (!s || s === 'default' || s === 'lapakoke' || s === 'lapakoke.com' || s === 'store_1' || s === 'str_01') {
    return 'default';
  }
  return s;
};

// Subtle pleasant audio chime on new message
const playChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Ignore audio permission restrictions
  }
};

export const Chat: React.FC<ChatProps> = ({
  isOpen,
  onClose,
  currentStore,
  currentSlug,
  member,
  visitorId,
  onUnreadChange
}) => {
  const [allStoreMessages, setAllStoreMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeRole, setActiveRole] = useState<'customer' | 'admin'>('customer');
  const [adminViewMode, setAdminViewMode] = useState<'conversation_list' | 'chat_thread'>('chat_thread');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'offline'>('connected');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMsgCountRef = useRef<number>(0);

  const effectiveStoreId = normalizeStoreId(currentSlug, currentStore);
  const effectiveStoreName = currentStore.name || 'Toko LapakOke';
  const customerDisplayName = member?.name?.trim() || 'Pelanggan LapakOke';

  const customerStorageKey = `lapakoke_chat_customer_${effectiveStoreId}_${visitorId}`;

  // 1. Load initial cache from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(customerStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllStoreMessages(parsed);
        }
      }
    } catch {
      // Ignore parse error
    }
  }, [customerStorageKey]);

  // 2. Real-time Firestore sync via onSnapshot
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      const chatColRef = collection(db, 'chat_messages');
      const q = query(chatColRef, orderBy('createdAt', 'asc'), limit(200));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setFirestoreStatus('connected');
          const incoming: ChatMessage[] = [];

          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as any;
            const msgStoreId = normalizeStoreId(data.storeId);

            // Match store: either match normalized storeId or broadcast 'all'
            const matchesStore = !data.storeId || 
                                 data.storeId === 'all' || 
                                 msgStoreId === effectiveStoreId || 
                                 (effectiveStoreId === 'default' && (!msgStoreId || msgStoreId === 'default'));

            if (matchesStore) {
              incoming.push({
                id: docSnap.id,
                storeId: data.storeId || effectiveStoreId,
                storeName: data.storeName || effectiveStoreName,
                customerVisitorId: data.customerVisitorId || 'unknown',
                customerName: data.customerName || 'Pelanggan',
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

          // Play chime if new incoming message arrives from the other side
          if (incoming.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
            const latest = incoming[incoming.length - 1];
            if (activeRole === 'customer' && latest.senderRole === 'admin') {
              playChime();
            } else if (activeRole === 'admin' && latest.senderRole === 'customer') {
              playChime();
            }
          }
          prevMsgCountRef.current = incoming.length;

          setAllStoreMessages(incoming);

          // Save customer's personal messages to localStorage cache
          const customerMsgs = incoming.filter(m => m.customerVisitorId === visitorId || m.customerVisitorId === 'system');
          try {
            localStorage.setItem(customerStorageKey, JSON.stringify(customerMsgs));
          } catch {
            // Storage quota ignore
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
  }, [effectiveStoreId, visitorId, activeRole, effectiveStoreName, customerStorageKey]);

  // 3. Group messages into conversations for Admin Mode
  const conversations: CustomerConversation[] = useMemo(() => {
    const groupMap = new Map<string, ChatMessage[]>();

    allStoreMessages.forEach((m) => {
      // Exclude system broadcast unless specifically part of thread
      if (m.customerVisitorId === 'system') return;
      
      const cId = m.customerVisitorId || 'unknown';
      const existing = groupMap.get(cId) || [];
      existing.push(m);
      groupMap.set(cId, existing);
    });

    const list: CustomerConversation[] = [];
    groupMap.forEach((msgs, cId) => {
      const sorted = [...msgs].sort((a, b) => a.createdAt - b.createdAt);
      const lastMsg = sorted[sorted.length - 1];
      const customerMsg = sorted.find(m => m.senderRole === 'customer');
      const name = customerMsg?.customerName || lastMsg?.customerName || `Pelanggan #${cId.slice(-4)}`;
      const unreadCount = sorted.filter(m => m.senderRole === 'customer' && !m.read).length;

      list.push({
        customerVisitorId: cId,
        customerName: name,
        lastMessageText: lastMsg.text,
        lastMessageTime: lastMsg.createdAt,
        unreadCount,
        messages: sorted
      });
    });

    // Sort by latest message descending
    list.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    return list;
  }, [allStoreMessages]);

  // 4. Auto-select customer in Admin Mode if none selected yet
  useEffect(() => {
    if (activeRole === 'admin') {
      if (!selectedCustomerId || !conversations.some(c => c.customerVisitorId === selectedCustomerId)) {
        if (conversations.length > 0) {
          // Default to the conversation with current user's visitorId if exists, or the latest conversation
          const matchingSelf = conversations.find(c => c.customerVisitorId === visitorId);
          setSelectedCustomerId(matchingSelf ? matchingSelf.customerVisitorId : conversations[0].customerVisitorId);
        } else {
          // If no conversations yet, default to visitorId so owner can test immediately
          setSelectedCustomerId(visitorId);
        }
      }
    }
  }, [activeRole, conversations, selectedCustomerId, visitorId]);

  // 5. Active messages to display based on mode
  const currentDisplayMessages: ChatMessage[] = useMemo(() => {
    if (activeRole === 'customer') {
      // Customer sees messages for their visitorId + welcome message
      const myMsgs = allStoreMessages.filter(
        m => m.customerVisitorId === visitorId || m.customerVisitorId === 'system'
      );
      if (myMsgs.length === 0) {
        return [DEFAULT_WELCOME_MSG(effectiveStoreName)];
      }
      const hasWelcome = myMsgs.some(m => m.id === 'welcome-01' || m.customerVisitorId === 'system');
      return hasWelcome ? myMsgs : [DEFAULT_WELCOME_MSG(effectiveStoreName), ...myMsgs];
    } else {
      // Admin sees the selected customer's thread
      const targetId = selectedCustomerId || visitorId;
      const thread = allStoreMessages.filter(m => m.customerVisitorId === targetId);
      if (thread.length === 0) {
        return [
          {
            id: 'admin-info-01',
            storeId: effectiveStoreId,
            customerVisitorId: targetId,
            customerName: customerDisplayName,
            senderRole: 'admin',
            senderName: `Admin ${effectiveStoreName}`,
            text: `Percakapan baru dengan pelanggan (${targetId === visitorId ? 'Sesi Anda saat ini' : targetId.slice(0, 10)}). Ketik balasan di bawah untuk mengirim pesan langsung ke pelanggan!`,
            createdAt: Date.now(),
            read: true
          }
        ];
      }
      return thread;
    }
  }, [activeRole, allStoreMessages, visitorId, selectedCustomerId, effectiveStoreName, effectiveStoreId, customerDisplayName]);

  // 6. Compute unread count for parent notification badge
  useEffect(() => {
    if (isOpen) {
      if (onUnreadChange) onUnreadChange(0);
    } else {
      // Unread count for customer (messages from admin that are unread)
      const customerUnread = allStoreMessages.filter(
        m => m.customerVisitorId === visitorId && m.senderRole === 'admin' && !m.read && m.id !== 'welcome-01'
      ).length;
      if (onUnreadChange) onUnreadChange(customerUnread);
    }
  }, [allStoreMessages, isOpen, visitorId, onUnreadChange]);

  // 7. Auto scroll to bottom
  useEffect(() => {
    if (isOpen && (activeRole === 'customer' || adminViewMode === 'chat_thread')) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentDisplayMessages.length, activeRole, adminViewMode, selectedCustomerId]);

  // 8. SEND MESSAGE HANDLER - Fixed customerVisitorId assignment!
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : inputText;
    const trimmed = rawText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInputText('');

    // Determine target customer conversation ID
    // CRITICAL FIX: If Admin sends, target is selectedCustomerId (the customer being replied to)!
    // If Customer sends, target is visitorId (the customer's own ID)!
    const targetCustomerVisitorId = activeRole === 'admin'
      ? (selectedCustomerId || visitorId)
      : visitorId;

    // Find recipient customer name
    const activeConv = conversations.find(c => c.customerVisitorId === targetCustomerVisitorId);
    const targetCustomerName = activeRole === 'admin'
      ? (activeConv?.customerName || (targetCustomerVisitorId === visitorId ? customerDisplayName : `Pelanggan #${targetCustomerVisitorId.slice(-4)}`))
      : customerDisplayName;

    const newMsg: ChatMessage = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      storeId: effectiveStoreId,
      storeName: effectiveStoreName,
      customerVisitorId: targetCustomerVisitorId,
      customerName: targetCustomerName,
      senderRole: activeRole,
      senderName: activeRole === 'admin' ? `Admin ${effectiveStoreName}` : customerDisplayName,
      text: trimmed,
      createdAt: Date.now(),
      read: activeRole === 'admin' ? false : true // When admin sends, customer has not read it yet!
    };

    // Optimistic UI update
    setAllStoreMessages((prev) => [...prev, newMsg]);

    // Send to Firebase Firestore
    try {
      await addDoc(collection(db, 'chat_messages'), {
        storeId: effectiveStoreId,
        storeName: effectiveStoreName,
        customerVisitorId: targetCustomerVisitorId,
        customerName: targetCustomerName,
        senderRole: activeRole,
        senderName: activeRole === 'admin' ? `Admin ${effectiveStoreName}` : customerDisplayName,
        text: trimmed,
        createdAt: serverTimestamp(),
        read: activeRole === 'admin' ? false : true
      });
      setFirestoreStatus('connected');
    } catch (err: any) {
      console.warn('Gagal menyimpan chat ke Firestore online, tersimpan di sesi lokal:', err);
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

  // Selected customer info for admin header
  const activeConversation = useMemo(() => {
    if (!selectedCustomerId) return null;
    return conversations.find(c => c.customerVisitorId === selectedCustomerId) || {
      customerVisitorId: selectedCustomerId,
      customerName: selectedCustomerId === visitorId ? `${customerDisplayName} (Sesi Anda)` : `Pelanggan #${selectedCustomerId.slice(-4)}`,
      lastMessageText: '',
      lastMessageTime: Date.now(),
      unreadCount: 0,
      messages: []
    };
  }, [conversations, selectedCustomerId, visitorId, customerDisplayName]);

  // Filter conversations for admin search
  const filteredConversations = useMemo(() => {
    if (!adminSearchQuery.trim()) return conversations;
    const q = adminSearchQuery.toLowerCase().trim();
    return conversations.filter(c => 
      c.customerName.toLowerCase().includes(q) || 
      c.customerVisitorId.toLowerCase().includes(q) ||
      c.lastMessageText.toLowerCase().includes(q)
    );
  }, [conversations, adminSearchQuery]);

  const totalAdminUnreadCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + c.unreadCount, 0);
  }, [conversations]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 flex flex-col justify-end pointer-events-none animate-in fade-in-0 duration-200">
      {/* Background backdrop on mobile only */}
      <div 
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs sm:hidden pointer-events-auto"
        onClick={onClose}
      />

      {/* Main Chat Box Container */}
      <div className="relative pointer-events-auto w-full sm:w-[430px] sm:max-h-[660px] h-[88vh] sm:h-[600px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200/80 transition-all">
        
        {/* Chat Header */}
        <div className={`p-4 shrink-0 shadow-md text-white transition-colors duration-300 ${
          activeRole === 'admin'
            ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-stone-900'
            : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
                {activeRole === 'admin' ? (
                  <ShieldCheck className="w-5 h-5 text-amber-300" />
                ) : (
                  <StoreIcon className="w-5 h-5 text-amber-300" />
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-blue-700" title="Online" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold truncate tracking-tight text-white">
                    {activeRole === 'admin' ? `Panel Chat Admin: ${effectiveStoreName}` : effectiveStoreName}
                  </h3>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-white/80 flex items-center gap-1 truncate">
                  <Clock className="w-3 h-3 text-amber-300 shrink-0" />
                  <span>{currentStore.openHours || 'Buka Setiap Hari'}</span>
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Toggle Customer / Admin Mode */}
              <button
                type="button"
                onClick={() => {
                  setActiveRole(prev => {
                    const next = prev === 'customer' ? 'admin' : 'customer';
                    if (next === 'admin') {
                      setAdminViewMode('chat_thread');
                    }
                    return next;
                  });
                }}
                title="Ganti Mode Chat: Pelanggan / Admin Toko"
                className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl transition-all border flex items-center gap-1 cursor-pointer active:scale-95 ${
                  activeRole === 'admin'
                    ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-sm'
                    : 'bg-white/20 hover:bg-white/30 text-white border-white/25'
                }`}
              >
                <span>{activeRole === 'admin' ? '👑 Mode Admin' : '👤 Pelanggan'}</span>
                {activeRole === 'customer' && totalAdminUnreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Tutup Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sync indicator & WhatsApp button banner */}
          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/90">
            <span className="flex items-center gap-1.5 text-[10px]">
              <span className={`w-2 h-2 rounded-full ${firestoreStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{firestoreStatus === 'connected' ? 'Firestore Realtime Aktif' : 'Penyimpanan Sesi Lokal'}</span>
            </span>
            <button
              onClick={handleWhatsAppFallback}
              className="text-[10px] font-semibold text-emerald-300 hover:text-emerald-200 underline flex items-center gap-1 cursor-pointer"
            >
              <PhoneCall className="w-3 h-3" />
              WhatsApp Toko
            </button>
          </div>
        </div>

        {/* ADMIN SUB-HEADER: Conversation selector & tabs */}
        {activeRole === 'admin' && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
              <button
                type="button"
                onClick={() => setAdminViewMode('conversation_list')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  adminViewMode === 'conversation_list'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Daftar Pelanggan ({conversations.length})</span>
                {totalAdminUnreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                    {totalAdminUnreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAdminViewMode('chat_thread')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 truncate max-w-[190px] ${
                  adminViewMode === 'chat_thread'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-200'
                }`}
                title={`Chat Aktif: ${activeConversation?.customerName || 'Pilih Pelanggan'}`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {activeConversation?.customerName || 'Pilih Pelanggan'}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveRole('customer')}
              className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline shrink-0 cursor-pointer"
            >
              Mode Pelanggan
            </button>
          </div>
        )}

        {/* VIEW 1: ADMIN CONVERSATION LIST */}
        {activeRole === 'admin' && adminViewMode === 'conversation_list' ? (
          <div className="flex-1 overflow-y-auto p-3 bg-stone-50 flex flex-col gap-2">
            {/* Search box in conversation list */}
            <div className="relative mb-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={adminSearchQuery}
                onChange={(e) => setAdminSearchQuery(e.target.value)}
                placeholder="Cari nama atau pesan pelanggan..."
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-amber-500"
              />
            </div>

            {filteredConversations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-500">
                <Users className="w-12 h-12 text-stone-300 mb-3" />
                <p className="text-sm font-bold text-stone-700">Belum ada percakapan pelanggan</p>
                <p className="text-xs text-stone-400 mt-1 max-w-xs">
                  Saat ada pelanggan yang mengirim pesan di toko ini, daftar obrolan akan otomatis tampil di sini.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId(visitorId);
                    setAdminViewMode('chat_thread');
                  }}
                  className="mt-4 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold cursor-pointer"
                >
                  Mulai Uji Coba Chat (Sesi Anda)
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.customerVisitorId === selectedCustomerId;
                return (
                  <div
                    key={conv.customerVisitorId}
                    onClick={() => {
                      setSelectedCustomerId(conv.customerVisitorId);
                      setAdminViewMode('chat_thread');
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30 shadow-xs'
                        : 'bg-white hover:bg-stone-50 border-stone-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center shrink-0 text-sm shadow-xs">
                        {conv.customerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-stone-900 truncate">
                            {conv.customerName}
                          </h4>
                          {conv.customerVisitorId === visitorId && (
                            <span className="text-[9px] bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded-full font-bold">
                              Anda
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 truncate mt-0.5 max-w-[200px]">
                          {conv.lastMessageText || 'Tidak ada pesan'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className="text-[10px] text-stone-400">
                        {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {conv.unreadCount > 0 ? (
                        <span className="bg-red-500 text-white text-[10px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                          {conv.unreadCount}
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-stone-300" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* VIEW 2: ACTIVE CHAT THREAD (Customer Mode OR Admin Thread View) */
          <>
            {/* Active Thread Banner for Admin */}
            {activeRole === 'admin' && (
              <div className="bg-amber-100/60 border-b border-amber-200 px-3 py-1.5 flex items-center justify-between text-xs text-amber-900 shrink-0">
                <div className="flex items-center gap-1.5 truncate">
                  <button
                    type="button"
                    onClick={() => setAdminViewMode('conversation_list')}
                    className="p-1 hover:bg-amber-200 rounded-lg text-amber-800 transition-colors cursor-pointer"
                    title="Kembali ke Daftar Pelanggan"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-[11px] truncate">
                    Membalas: <strong>{activeConversation?.customerName || 'Pelanggan'}</strong>
                  </span>
                </div>
                <span className="text-[10px] text-amber-700 font-mono shrink-0">
                  ID: #{selectedCustomerId ? selectedCustomerId.slice(-6) : 'default'}
                </span>
              </div>
            )}

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
              {/* Quick FAQ / Prompt Suggestions (for customer) */}
              {activeRole === 'customer' && currentDisplayMessages.length <= 3 && (
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
                        className="text-[11px] text-stone-700 bg-stone-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-stone-200 px-2.5 py-1 rounded-xl text-left transition-all active:scale-95 cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Bubbles */}
              {currentDisplayMessages.map((msg, index) => {
                // Determine whether bubble is displayed on right (as sender) or left (as incoming)
                const isUserSender = (activeRole === 'customer' && msg.senderRole === 'customer') ||
                                     (activeRole === 'admin' && msg.senderRole === 'admin');
                const isAdminMessage = msg.senderRole === 'admin' || msg.senderRole === 'staff';

                return (
                  <div 
                    key={msg.id || index}
                    className={`flex flex-col ${isUserSender ? 'items-end' : 'items-start'} animate-in fade-in-0 duration-150`}
                  >
                    {/* Sender label */}
                    <span className="text-[10px] font-semibold text-stone-500 mb-0.5 px-1.5 flex items-center gap-1">
                      {isAdminMessage && <ShieldCheck className="w-3 h-3 text-blue-600 shrink-0" />}
                      {!isAdminMessage && <UserIcon className="w-3 h-3 text-emerald-600 shrink-0" />}
                      <span>{msg.senderName}</span>
                    </span>

                    <div className="flex items-end gap-1.5 max-w-[85%]">
                      {/* Message Bubble */}
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-xs break-words ${
                          isUserSender
                            ? activeRole === 'admin'
                              ? 'bg-amber-600 text-white rounded-br-xs'
                              : 'bg-blue-600 text-white rounded-br-xs'
                            : 'bg-white text-stone-800 border border-stone-200/80 rounded-bl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        
                        <div 
                          className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${
                            isUserSender ? 'text-white/80' : 'text-stone-400'
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isUserSender && <CheckCheck className="w-3 h-3 text-white/90" />}
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
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    activeRole === 'admin'
                      ? `Kirim balasan ke ${activeConversation?.customerName || 'pelanggan'}...`
                      : 'Ketik pesan untuk admin toko...'
                  }
                  disabled={isSending}
                  className={`flex-1 text-stone-900 text-sm px-3.5 py-2.5 rounded-2xl border transition-all ${
                    activeRole === 'admin'
                      ? 'bg-amber-50/50 hover:bg-white focus:bg-white border-amber-300 focus:border-amber-600 focus:outline-hidden'
                      : 'bg-stone-100 hover:bg-stone-50 focus:bg-white border-stone-200 focus:border-blue-500 focus:outline-hidden'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isSending}
                  className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center transition-all shadow-sm shrink-0 active:scale-95 cursor-pointer disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed ${
                    activeRole === 'admin'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  title={activeRole === 'admin' ? 'Kirim Balasan Admin' : 'Kirim Pesan'}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
