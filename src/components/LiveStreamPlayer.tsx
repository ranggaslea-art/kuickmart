import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Product, Store } from '../types';
import {
  LiveStreamConfig,
  LiveStreamComment,
  LiveStreamGiftItem,
  LIVE_GIFTS,
  sendLiveGiftApi,
  sendLiveLikeApi,
  loadLiveStreamConfig,
  saveLiveStreamConfig,
  LIVE_STREAM_UPDATED_EVENT,
  TRIGGER_LIVE_STREAM_EVENT,
  SAMPLE_LIVE_COMMENTS,
  BUYER_NAMES,
  PRESET_STREAM_VIDEOS,
} from '../utils/liveStreamHelper';
import { formatImageUrl, getProductFallbackImage } from '../utils/imageHelper';
import {
  Play,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  X,
  Heart,
  MessageCircle,
  Share2,
  ShoppingBag,
  Sparkles,
  ChevronDown,
  Check,
  Send,
  Eye,
  Radio,
  Plus,
  ArrowRight,
  Flame,
  Award,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Camera,
  RefreshCw,
  Gift,
  User,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Smile,
  ThumbsUp,
} from 'lucide-react';
import { MemberProfile } from '../types';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { useHostBroadcast, startHostBroadcast } from '../utils/liveBroadcastManager';

const VIEWER_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

interface LiveStreamPlayerProps {
  currentStore: Store;
  activeTenantSlug?: string;
  storeLogoUrl?: string;
  products: Product[];
  member?: MemberProfile;
  visitorId?: string;
  onAddToCart: (product: Product, quantity?: number, notes?: string, unitOption?: any) => void;
  onOpenProductDetail?: (product: Product) => void;
  onOpenCart?: () => void;
}

interface FloatingHeart {
  id: number;
  x: number;
  color: string;
}

export const LiveStreamPlayer: React.FC<LiveStreamPlayerProps> = ({
  currentStore,
  activeTenantSlug = 'default',
  storeLogoUrl,
  products = [],
  member,
  visitorId,
  onAddToCart,
  onOpenProductDetail,
  onOpenCart,
}) => {
  const [config, setConfig] = useState<LiveStreamConfig>(() =>
    loadLiveStreamConfig(activeTenantSlug, currentStore.name, storeLogoUrl, products)
  );

  // Mode: 'pip' (mini melayang), 'medium' (jendela sedang), 'fullscreen' (layar penuh TikTok/Shopee), 'hidden' (bubble icon)
  const [displayMode, setDisplayMode] = useState<'pip' | 'medium' | 'fullscreen' | 'hidden'>('pip');
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [likes, setLikes] = useState<number>(() => config.likesCount || 24800);
  const [viewers, setViewers] = useState<number>(() => config.viewersCount || 1420);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isEtalaseOpen, setIsEtalaseOpen] = useState<boolean>(false);
  const [addedSuccessToast, setAddedSuccessToast] = useState<string | null>(null);
  const [shareSuccessToast, setShareSuccessToast] = useState<boolean>(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);

  // ================= INTERAKSI LIVE VIDEO PENGUNJUNG & HOST =================
  const [isGuestVideoActive, setIsGuestVideoActive] = useState<boolean>(false);
  const [isGuestConnecting, setIsGuestConnecting] = useState<boolean>(false);
  const [guestStream, setGuestStream] = useState<MediaStream | null>(null);
  const [isGuestVideoPromptOpen, setIsGuestVideoPromptOpen] = useState<boolean>(false);
  const [isGuestCameraMuted, setIsGuestCameraMuted] = useState<boolean>(false);
  const [isGuestMicMuted, setIsGuestMicMuted] = useState<boolean>(false);
  const [guestFacingMode, setGuestFacingMode] = useState<'user' | 'environment'>('user');
  const [guestVideoLayout, setGuestVideoLayout] = useState<'pip' | 'split'>('pip');
  const [guestVideoError, setGuestVideoError] = useState<string | null>(null);
  const guestVideoRef = useRef<HTMLVideoElement>(null);

  // ================= HADIAH VIRTUAL (GIFT) & DUKUNGAN TOKO =================
  const [isGiftDrawerOpen, setIsGiftDrawerOpen] = useState<boolean>(false);
  const [activeGiftCelebration, setActiveGiftCelebration] = useState<{
    id: string;
    senderName: string;
    gift: LiveStreamGiftItem;
  } | null>(null);
  const [totalGiftsValue, setTotalGiftsValue] = useState<number>(() => config.totalGiftsValue || 0);

  // ================= LIKE COMBO MULTIPLIER =================
  const [likeCombo, setLikeCombo] = useState<number>(0);
  const likeComboTimerRef = useRef<any>(null);

  // Visitor Name for live comments (Persisten di localStorage & sync dengan akun member)
  const [visitorName, setVisitorName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('lapakoke_live_visitor_name');
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    if (member?.name && member.name.trim()) return member.name.trim();
    return 'Pengunjung ' + Math.floor(100 + Math.random() * 900);
  });
  const [isEditingVisitorName, setIsEditingVisitorName] = useState<boolean>(false);
  const [tempVisitorName, setTempVisitorName] = useState<string>('');

  // Sinkronkan nama member jika login
  useEffect(() => {
    if (member?.name && member.name.trim()) {
      setVisitorName((prev) => {
        if (!prev || prev.startsWith('Pengunjung ')) {
          try {
            localStorage.setItem('lapakoke_live_visitor_name', member.name.trim());
          } catch {}
          return member.name.trim();
        }
        return prev;
      });
    }
  }, [member?.name]);

  // Index produk promo live yang sedang aktif ditampilkan di kartu spill
  const [activePromotedIndex, setActivePromotedIndex] = useState<number>(0);

  // Device / Visitor ID unik untuk membedakan perangkat pengirim (HP vs Laptop)
  const effectiveVisitorId = React.useMemo(() => {
    if (visitorId && visitorId.trim()) return visitorId.trim();
    try {
      const saved = localStorage.getItem('lapakoke_live_device_id') || localStorage.getItem('nusamart_visitor_id');
      if (saved) return saved;
      const gen = 'dev_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('lapakoke_live_device_id', gen);
      return gen;
    } catch {
      return 'dev_' + Math.random().toString(36).substring(2, 10);
    }
  }, [visitorId]);

  // Chat comments
  const [comments, setComments] = useState<LiveStreamComment[]>([
    {
      id: 'c1',
      senderName: 'Host • ' + currentStore.name,
      message: 'Selamat datang di Live Streaming toko kami! Ada voucher diskon dan flash sale sembako hari ini ya!',
      timestamp: 'Baru saja',
      isHost: true,
    },
    {
      id: 'c2',
      senderName: 'Rina Wulandari',
      message: 'Halo min, minyak goreng pouch 2L diskon berapa?',
      timestamp: '1m',
      isBuyer: true,
    },
    {
      id: 'c3',
      senderName: 'Budi Santoso',
      message: 'Beli 2 gratis 1 masih berlaku gak min?',
      timestamp: '30s',
      isBuyer: true,
    },
  ]);
  const [myCommentText, setMyCommentText] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteWebcamVideoRef = useRef<HTMLVideoElement>(null);
  const remoteWebcamStreamRef = useRef<MediaStream | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const heartCounterRef = useRef<number>(0);

  // ================= WEBCAM / KAMERA LIVE TOKO RECEIVER (PENGUNJUNG) =================
  const hostBroadcastState = useHostBroadcast();
  const normSlug = (activeTenantSlug || 'default').toLowerCase().trim() || 'default';
  const isLocalHostBroadcasting =
    hostBroadcastState.isBroadcasting && hostBroadcastState.slug === normSlug;

  const [isHostOnline, setIsHostOnline] = useState<boolean>(false);
  const [hostBroadcastMeta, setHostBroadcastMeta] = useState<{
    isCameraMuted: boolean;
    isMicMuted: boolean;
    facingMode: 'user' | 'environment';
    viewersCount: number;
  }>({
    isCameraMuted: false,
    isMicMuted: false,
    facingMode: 'user',
    viewersCount: 0,
  });
  const [liveFrameDataUrl, setLiveFrameDataUrl] = useState<string | null>(null);
  const [isWebrtcPlaying, setIsWebrtcPlaying] = useState<boolean>(false);
  const [viewerWsConnected, setViewerWsConnected] = useState<boolean>(false);

  // Real-time Firestore Sync Komentar Live (Multi-Perangkat: HP, Tablet, Laptop)
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      const commentsCol = collection(db, 'live_stream_comments');
      const q = query(commentsCol, orderBy('timestamp', 'asc'), limit(80));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const incoming: LiveStreamComment[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const msgSlug = (data.storeSlug || 'default').toLowerCase().trim();
            const mySlug = (activeTenantSlug || 'default').toLowerCase().trim();

            if (!data.storeSlug || msgSlug === mySlug || msgSlug === 'default' || mySlug === 'default') {
              incoming.push({
                id: docSnap.id,
                senderName: data.senderName || 'Pengunjung',
                senderId: data.senderId,
                message: data.message || '',
                timestamp: data.timestamp
                  ? new Date(data.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  : 'Baru saja',
                isBuyer: data.isBuyer !== false,
                isHost: Boolean(data.isHost),
                isGift: Boolean(data.isGift),
                giftInfo: data.giftInfo || null,
                isGuestVideo: Boolean(data.isGuestVideo),
              });
            }
          });

          if (incoming.length > 0) {
            setComments((prev) => {
              const map = new Map<string, LiveStreamComment>();
              // Simpan komentar awal default
              prev.forEach((c) => map.set(c.id, c));
              // Masukkan komentar real-time dari pengunjung lain di HP / Laptop
              incoming.forEach((c) => map.set(c.id, c));
              return Array.from(map.values()).slice(-60);
            });
          }
        },
        (err) => {
          console.warn('Live stream firestore comment listener warning:', err);
        }
      );
    } catch (err) {
      console.warn('Failed to listen to live_stream_comments in Firestore:', err);
    }

    // Polling sekunder ke Server API sebagai cadangan
    const fetchServerComments = () => {
      fetch(`/api/live-stream-comments?slug=${encodeURIComponent(activeTenantSlug)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.comments) && data.comments.length > 0) {
            setComments((prev) => {
              const map = new Map<string, LiveStreamComment>();
              prev.forEach((c) => map.set(c.id, c));
              data.comments.forEach((c: any) => {
                map.set(c.id, {
                  id: c.id,
                  senderName: c.senderName || 'Pengunjung',
                  senderId: c.senderId,
                  message: c.message || '',
                  timestamp: c.timestamp
                    ? new Date(c.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    : 'Baru saja',
                  isBuyer: c.isBuyer !== false,
                  isHost: Boolean(c.isHost),
                  isGift: Boolean(c.isGift),
                  giftInfo: c.giftInfo || null,
                  isGuestVideo: Boolean(c.isGuestVideo),
                });
              });
              return Array.from(map.values()).slice(-60);
            });
          }
        })
        .catch(() => {});
    };

    // Ambil total gifts & likes dari server API
    fetch(`/api/live-stream-gifts?slug=${encodeURIComponent(activeTenantSlug)}`)
      .then((res) => res.json())
      .then((d) => {
        if (d?.success && typeof d.totalValue === 'number') {
          setTotalGiftsValue(d.totalValue);
        }
      })
      .catch(() => {});

    fetch(`/api/live-stream-likes?slug=${encodeURIComponent(activeTenantSlug)}`)
      .then((res) => res.json())
      .then((d) => {
        if (d?.success && typeof d.likesCount === 'number') {
          setLikes((prev) => Math.max(prev, d.likesCount));
        }
      })
      .catch(() => {});

    fetchServerComments();
    const pollInterval = setInterval(fetchServerComments, 3000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(pollInterval);
    };
  }, [activeTenantSlug, currentStore.name]);

  // 1. Sync config saat tenant berganti, real-time via Firestore + polling Server API
  useEffect(() => {
    setConfig(loadLiveStreamConfig(activeTenantSlug, currentStore.name, storeLogoUrl, products));

    const fetchLatestConfig = () => {
      fetch(`/api/live-stream-config?slug=${encodeURIComponent(activeTenantSlug)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.liveStreamConfig) {
            const cfg = data.liveStreamConfig;
            setConfig((prev) => {
              if (
                prev.streamType === cfg.streamType &&
                prev.videoUrl === cfg.videoUrl &&
                prev.enabled === cfg.enabled &&
                prev.title === cfg.title &&
                prev.lastUpdated === cfg.lastUpdated
              ) {
                return prev;
              }
              return cfg;
            });
            try {
              localStorage.setItem(
                `lapakoke_livestream_config_${activeTenantSlug.toLowerCase().trim()}`,
                JSON.stringify(cfg)
              );
            } catch {}
          }
        })
        .catch(() => {});
    };

    fetchLatestConfig();
    const cfgPoll = setInterval(fetchLatestConfig, 4000);

    let unsubSettings: (() => void) | null = null;
    try {
      const safeDocId = `live_stream_${normSlug.replace(/[^a-z0-9_-]/g, '_')}`;
      unsubSettings = onSnapshot(
        doc(db, 'store_settings', safeDocId),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as LiveStreamConfig;
            if (data && data.streamType) {
              setConfig((prev) => ({ ...prev, ...data }));
              try {
                localStorage.setItem(
                  `lapakoke_livestream_config_${activeTenantSlug.toLowerCase().trim()}`,
                  JSON.stringify(data)
                );
              } catch {}
            }
          }
        },
        (err) => {
          console.warn('Firestore store_settings live stream listener warning:', err);
        }
      );
    } catch {}

    return () => {
      clearInterval(cfgPoll);
      if (unsubSettings) unsubSettings();
    };
  }, [activeTenantSlug, currentStore.name, storeLogoUrl, normSlug]);

  // 1b. Koneksi Penerima Siaran Kamera Host (WebRTC P2P + WebSocket Frame Relay + HTTP Fallback)
  useEffect(() => {
    if (!config.enabled || config.streamType !== 'webcam') {
      setIsHostOnline(false);
      setLiveFrameDataUrl(null);
      setIsWebrtcPlaying(false);
      setViewerWsConnected(false);
      return;
    }

    // Jika perangkat ini sendiri yang sedang menjadi host
    if (isLocalHostBroadcasting) {
      setIsHostOnline(true);
      setViewerWsConnected(false);
      if (remoteWebcamVideoRef.current && hostBroadcastState.stream) {
        remoteWebcamVideoRef.current.srcObject = hostBroadcastState.stream;
        remoteWebcamVideoRef.current.muted = true;
        remoteWebcamVideoRef.current.play().catch(() => {});
      }
      return;
    }

    let disposed = false;
    let ws: WebSocket | null = null;
    let pc: RTCPeerConnection | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingIce: RTCIceCandidateInit[] = [];

    const cleanupPeer = () => {
      if (pc) {
        try {
          pc.ontrack = null;
          pc.onicecandidate = null;
          pc.onconnectionstatechange = null;
          pc.close();
        } catch {}
        pc = null;
      }
      pendingIce = [];
      remoteWebcamStreamRef.current = null;
      setIsWebrtcPlaying(false);
    };

    const sendWsMsg = (payload: any) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(payload));
        } catch {}
      }
    };

    const handleHostOffer = async (sdp: RTCSessionDescriptionInit) => {
      cleanupPeer();
      try {
        pc = new RTCPeerConnection({ iceServers: VIEWER_ICE_SERVERS });
        pc.ontrack = (event) => {
          const stream = event.streams?.[0] || new MediaStream([event.track]);
          remoteWebcamStreamRef.current = stream;
          const vid = remoteWebcamVideoRef.current;
          if (vid) {
            vid.srcObject = stream;
            vid.muted = isMuted;
            vid.play()
              .then(() => {
                if (!disposed) setIsWebrtcPlaying(true);
              })
              .catch(() => {
                vid.muted = true;
                vid.play()
                  .then(() => {
                    if (!disposed) setIsWebrtcPlaying(true);
                  })
                  .catch(() => {});
              });
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            sendWsMsg({
              type: 'rtc:ice',
              viewerId: effectiveVisitorId,
              candidate: event.candidate.toJSON(),
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'disconnected')) {
            if (!disposed) setIsWebrtcPlaying(false);
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        if (pendingIce.length > 0) {
          for (const cand of pendingIce) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch {}
          }
          pendingIce = [];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendWsMsg({
          type: 'rtc:answer',
          viewerId: effectiveVisitorId,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.warn('[LiveViewer] WebRTC error, menggunakan frame relay:', err);
      }
    };

    const handleHostIce = async (candidate: RTCIceCandidateInit) => {
      if (!pc || !pc.remoteDescription) {
        pendingIce.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    };

    const connectViewerWs = () => {
      if (disposed || typeof window === 'undefined') return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live-stream?slug=${encodeURIComponent(
        normSlug
      )}&role=viewer&clientId=${encodeURIComponent(effectiveVisitorId)}`;

      try {
        const socket = new WebSocket(wsUrl);
        ws = socket;

        socket.onopen = () => {
          if (disposed) return;
          setViewerWsConnected(true);
          sendWsMsg({ type: 'viewer:join', viewerId: effectiveVisitorId });
        };

        socket.onmessage = (event) => {
          if (disposed) return;
          try {
            const msg = JSON.parse(event.data);
            if (!msg || typeof msg.type !== 'string') return;

            if (msg.type === 'host:status') {
              const online = Boolean(msg.isLive);
              setIsHostOnline(online);
              setHostBroadcastMeta({
                isCameraMuted: Boolean(msg.isCameraMuted),
                isMicMuted: Boolean(msg.isMicMuted),
                facingMode: msg.facingMode === 'environment' ? 'environment' : 'user',
                viewersCount: Number(msg.viewersCount) || 0,
              });
              if (!online) {
                setLiveFrameDataUrl(null);
                cleanupPeer();
              }
            } else if (msg.type === 'live:frame' && typeof msg.frame === 'string') {
              setIsHostOnline(true);
              setLiveFrameDataUrl(msg.frame);
            } else if (msg.type === 'rtc:offer' && msg.sdp) {
              setIsHostOnline(true);
              handleHostOffer(msg.sdp);
            } else if (msg.type === 'rtc:ice' && msg.candidate) {
              handleHostIce(msg.candidate);
            }
          } catch {}
        };

        socket.onerror = () => {
          if (!disposed) setViewerWsConnected(false);
        };

        socket.onclose = () => {
          if (!disposed) {
            setViewerWsConnected(false);
            reconnectTimer = setTimeout(connectViewerWs, 3000);
          }
        };
      } catch {
        setViewerWsConnected(false);
      }
    };

    connectViewerWs();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        try {
          ws.close(1000, 'Viewer unmount');
        } catch {}
      }
      cleanupPeer();
    };
  }, [config.enabled, config.streamType, normSlug, effectiveVisitorId, isLocalHostBroadcasting, hostBroadcastState.stream]);

  // 1c. Fallback HTTP Polling untuk kamera live apabila WebSocket terblokir jaringan/proxy
  useEffect(() => {
    if (!config.enabled || config.streamType !== 'webcam' || isLocalHostBroadcasting) return;
    if (viewerWsConnected && isWebrtcPlaying) return;

    let cancelled = false;
    const intervalMs = !viewerWsConnected ? (isHostOnline ? 300 : 2500) : 5000;

    const pollFrameOrStatus = () => {
      const endpoint = !viewerWsConnected
        ? `/api/live-stream-frame?slug=${encodeURIComponent(normSlug)}`
        : `/api/live-stream-broadcast-status?slug=${encodeURIComponent(normSlug)}`;

      fetch(endpoint)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !d?.success) return;
          const online = Boolean(d.isLive);
          setIsHostOnline(online);
          setHostBroadcastMeta((prev) => ({
            isCameraMuted: Boolean(d.isCameraMuted),
            isMicMuted: Boolean(d.isMicMuted),
            facingMode: d.facingMode === 'environment' ? 'environment' : prev.facingMode,
            viewersCount: Number(d.viewersCount) || prev.viewersCount,
          }));
          if (!online) {
            setLiveFrameDataUrl(null);
          } else if (typeof d.frame === 'string' && d.frame.startsWith('data:image/')) {
            setLiveFrameDataUrl(d.frame);
          }
        })
        .catch(() => {});
    };

    pollFrameOrStatus();
    const timer = setInterval(pollFrameOrStatus, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [config.enabled, config.streamType, normSlug, isLocalHostBroadcasting, viewerWsConnected, isHostOnline, isWebrtcPlaying]);

  // Sinkronkan mute audio & srcObject pada elemen video webcam remote/lokal saat mode tampilan berubah
  useEffect(() => {
    const vid = remoteWebcamVideoRef.current;
    if (!vid) return;
    if (isLocalHostBroadcasting && hostBroadcastState.stream) {
      if (vid.srcObject !== hostBroadcastState.stream) {
        vid.srcObject = hostBroadcastState.stream;
      }
    } else if (remoteWebcamStreamRef.current && vid.srcObject !== remoteWebcamStreamRef.current && !isLocalHostBroadcasting) {
      vid.srcObject = remoteWebcamStreamRef.current;
    }
    vid.muted = isMuted || isLocalHostBroadcasting;
    if (vid.srcObject) {
      vid.play().catch(() => {});
    }
  }, [isMuted, displayMode, isWebrtcPlaying, isLocalHostBroadcasting, hostBroadcastState.stream, isHostOnline]);

  // Listener event eksternal untuk trigger buka live atau update config
  useEffect(() => {
    const handleConfigUpdate = (e: any) => {
      if (e.detail?.config) {
        setConfig(e.detail.config);
      }
    };

    const handleTrigger = (e: any) => {
      const mode = e.detail?.mode || 'fullscreen';
      setConfig((prev) => {
        if (!prev.enabled) {
          const updated = { ...prev, enabled: true };
          try {
            saveLiveStreamConfig(updated, activeTenantSlug);
          } catch {}
          return updated;
        }
        return prev;
      });
      setDisplayMode(mode);
    };

    window.addEventListener(LIVE_STREAM_UPDATED_EVENT, handleConfigUpdate);
    window.addEventListener(TRIGGER_LIVE_STREAM_EVENT, handleTrigger);

    return () => {
      window.removeEventListener(LIVE_STREAM_UPDATED_EVENT, handleConfigUpdate);
      window.removeEventListener(TRIGGER_LIVE_STREAM_EVENT, handleTrigger);
    };
  }, []);

  // 2. Simulasi fluktuasi penonton dan auto-chat komentar
  useEffect(() => {
    if (!config.enabled || displayMode === 'hidden') return;

    // Naik-turun penonton realistis
    const viewerInterval = setInterval(() => {
      setViewers((prev) => {
        const delta = Math.floor(Math.random() * 11) - 5; // -5 s/d +5
        return Math.max(850, prev + delta);
      });
    }, 4500);

    // Auto-comments dari penonton lain
    let commentTimer: NodeJS.Timeout;
    if (config.autoChatEnabled !== false) {
      commentTimer = setInterval(() => {
        const randomMsg = SAMPLE_LIVE_COMMENTS[Math.floor(Math.random() * SAMPLE_LIVE_COMMENTS.length)];
        const randomBuyer = BUYER_NAMES[Math.floor(Math.random() * BUYER_NAMES.length)];
        const newComment: LiveStreamComment = {
          id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          senderName: randomBuyer,
          message: randomMsg,
          timestamp: 'Baru saja',
          isBuyer: true,
        };

        setComments((prev) => {
          const updated = [...prev, newComment];
          return updated.slice(-25); // Simpan 25 komentar terakhir
        });
      }, 3800);
    }

    return () => {
      clearInterval(viewerInterval);
      if (commentTimer) clearInterval(commentTimer);
    };
  }, [config.enabled, displayMode, config.autoChatEnabled]);

  // Auto-scroll chat komentar ke bawah saat ada pesan baru
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [comments, displayMode]);

  // (Pengecekan !config.enabled dilakukan setelah seluruh React hooks agar aman)

  // Multiple Promoted Products (Daftar barang yang dipromokan host/admin)
  const promotedProducts: Product[] = React.useMemo(() => {
    const ids: string[] = [];
    if (Array.isArray(config.pinnedProductIds) && config.pinnedProductIds.length > 0) {
      ids.push(...config.pinnedProductIds);
    } else if (config.pinnedProductId) {
      ids.push(config.pinnedProductId);
    }

    const uniqueIds = Array.from(new Set(ids));
    const matched = uniqueIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p));

    if (matched.length > 0) return matched;
    return products.length > 0 ? [products[0]] : [];
  }, [config.pinnedProductIds, config.pinnedProductId, products]);

  // Produk aktif saat ini yang sedang ditampilkan di pin
  const safePromotedIndex = Math.min(activePromotedIndex, Math.max(0, promotedProducts.length - 1));
  const pinnedProduct: Product | undefined = promotedProducts[safePromotedIndex];

  const handleNextPromoted = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (promotedProducts.length <= 1) return;
    setActivePromotedIndex((prev) => (prev + 1) % promotedProducts.length);
  };

  const handlePrevPromoted = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (promotedProducts.length <= 1) return;
    setActivePromotedIndex((prev) => (prev - 1 + promotedProducts.length) % promotedProducts.length);
  };

  // Simpan nama pengunjung
  const handleSaveVisitorName = (newName: string) => {
    const clean = newName.trim() || member?.name || 'Pengunjung';
    setVisitorName(clean);
    setIsEditingVisitorName(false);
    try {
      localStorage.setItem('lapakoke_live_visitor_name', clean);
    } catch {}
  };

  // Quick Chips Rekomendasi Chat
  const QUICK_COMMENT_CHIPS = [
    'Spill no 1 min! 🔥',
    'Bisa COD gak min?',
    'Ada diskon tambahan?',
    'Ready kirim sekarang?',
    'Barang original min? 👍',
  ];

  // Handle kirim komentar manual oleh pengunjung (Sinkron Real-time HP & Laptop via Firestore & Server)
  const handleSendComment = async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (directText !== undefined ? directText : myCommentText).trim();
    if (!textToSend) return;

    const currentSender = (visitorName || member?.name || 'Pengunjung').trim();
    const uniqueCommentId = 'live_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const myComment: LiveStreamComment = {
      id: uniqueCommentId,
      senderName: currentSender,
      senderId: effectiveVisitorId,
      message: textToSend,
      timestamp: 'Baru saja',
      isBuyer: true,
    };

    // 1. Tampilkan komentar di layar pengirim secara instan (Optimistic UI)
    setComments((prev) => [...prev, myComment]);
    if (directText === undefined) {
      setMyCommentText('');
    }

    // Tambah heart animasi otomatis saat mengirim pesan
    triggerHeart();

    // 2. Broadcast ke Firebase Firestore agar muncul di semua perangkat (HP, Laptop, PC) secara real-time
    try {
      await addDoc(collection(db, 'live_stream_comments'), {
        id: uniqueCommentId,
        storeSlug: (activeTenantSlug || 'default').toLowerCase().trim(),
        storeName: currentStore.name,
        senderName: currentSender,
        senderId: effectiveVisitorId,
        message: textToSend,
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
        isBuyer: true,
        isHost: false,
      });
    } catch (fsErr) {
      console.warn('Gagal sinkron komentar live ke Firestore:', fsErr);
    }

    // 3. Cadangan broadcast via HTTP API Server
    try {
      await fetch('/api/live-stream-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: (activeTenantSlug || 'default').toLowerCase().trim(),
          comment: {
            id: uniqueCommentId,
            storeName: currentStore.name,
            senderName: currentSender,
            senderId: effectiveVisitorId,
            message: textToSend,
            timestamp: Date.now(),
            isBuyer: true,
            isHost: false,
          },
        }),
      });
    } catch (apiErr) {
      console.warn('Gagal POST komentar live ke server:', apiErr);
    }
  };

  // ================= LIFECYCLE & HANDLER INTERAKSI VIDEO PENGUNJUNG =================
  useEffect(() => {
    if (guestVideoRef.current && guestStream) {
      guestVideoRef.current.srcObject = guestStream;
      guestVideoRef.current.play().catch(() => {});
    }
  }, [guestStream, isGuestVideoActive, guestVideoLayout]);

  useEffect(() => {
    return () => {
      if (guestStream) {
        guestStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [guestStream]);

  const handleStartGuestVideo = async () => {
    setIsGuestConnecting(true);
    setGuestVideoError(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: guestFacingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });
      } catch (_) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: guestFacingMode },
          audio: false,
        });
      }

      setGuestStream(stream);
      setIsGuestVideoActive(true);
      setIsGuestVideoPromptOpen(false);
      setIsGuestCameraMuted(false);
      setIsGuestMicMuted(false);

      if (guestVideoRef.current) {
        guestVideoRef.current.srcObject = stream;
        guestVideoRef.current.play().catch(() => {});
      }

      const currentSender = (visitorName || member?.name || 'Pengunjung').trim();
      const guestJoinMsg: LiveStreamComment = {
        id: 'join_video_' + Date.now(),
        senderName: currentSender,
        senderId: effectiveVisitorId,
        message: '🟢 Telah terhubung dalam bincang video langsung dengan Host Toko!',
        timestamp: 'Baru saja',
        isBuyer: true,
        isGuestVideo: true,
      };
      setComments((prev) => [...prev, guestJoinMsg]);

      // Host sapaan otomatis
      setTimeout(() => {
        const hostWelcome: LiveStreamComment = {
          id: 'host_reply_' + Date.now(),
          senderName: 'Host • ' + currentStore.name,
          message: `Halo kak ${currentSender}! Wajah dan videonya sudah tampil jelas di siaran live kami. Silakan mau tanya sembako atau produk apa kak? 😊`,
          timestamp: 'Baru saja',
          isHost: true,
        };
        setComments((prev) => [...prev, hostWelcome]);
      }, 1400);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 },
      });
    } catch (err: any) {
      console.warn('Gagal mengakses kamera:', err);
      setGuestVideoError('Izin kamera belum aktif. Silakan izinkan akses kamera di browser Anda untuk bincang video langsung.');
    } finally {
      setIsGuestConnecting(false);
    }
  };

  const handleStopGuestVideo = () => {
    if (guestStream) {
      guestStream.getTracks().forEach((t) => t.stop());
      setGuestStream(null);
    }
    setIsGuestVideoActive(false);
    setIsGuestVideoPromptOpen(false);

    const currentSender = (visitorName || member?.name || 'Pengunjung').trim();
    const leaveMsg: LiveStreamComment = {
      id: 'leave_video_' + Date.now(),
      senderName: currentSender,
      senderId: effectiveVisitorId,
      message: '🔴 Mengakhiri sesi bincang video langsung.',
      timestamp: 'Baru saja',
      isBuyer: true,
      isGuestVideo: true,
    };
    setComments((prev) => [...prev, leaveMsg]);
  };

  const handleToggleGuestCamera = () => {
    if (guestStream) {
      const vidTracks = guestStream.getVideoTracks();
      vidTracks.forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsGuestCameraMuted((prev) => !prev);
    }
  };

  const handleToggleGuestMic = () => {
    if (guestStream) {
      const audioTracks = guestStream.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsGuestMicMuted((prev) => !prev);
    }
  };

  const handleFlipGuestCamera = async () => {
    if (!guestStream) return;
    const newFacing = guestFacingMode === 'user' ? 'environment' : 'user';
    setGuestFacingMode(newFacing);
    try {
      guestStream.getTracks().forEach((t) => t.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
        audio: !isGuestMicMuted,
      });
      setGuestStream(newStream);
      if (guestVideoRef.current) {
        guestVideoRef.current.srcObject = newStream;
        guestVideoRef.current.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Gagal membalik kamera:', e);
    }
  };

  // ================= HANDLER KIRIM HADIAH VIRTUAL (GIFT) =================
  const handleSendGift = async (gift: LiveStreamGiftItem) => {
    const currentSender = (visitorName || member?.name || 'Pengunjung').trim();
    const giftTransactionId = 'gift_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    // 1. Confetti burst kembang api
    confetti({
      particleCount: gift.price >= 50000 ? 120 : 70,
      spread: 75,
      origin: { y: 0.6 },
      colors: [gift.badgeColor, '#f43f5e', '#ec4899', '#eab308', '#06b6d4', '#8b5cf6'],
    });

    // 2. Banner perayaan di layar
    setActiveGiftCelebration({
      id: giftTransactionId,
      senderName: currentSender,
      gift,
    });
    setTimeout(() => {
      setActiveGiftCelebration(null);
    }, 3800);

    // 3. Tambahkan ke total gifts
    setTotalGiftsValue((prev) => prev + gift.price);

    // 4. Komentar gift di chat stream (Optimistic)
    const giftComment: LiveStreamComment = {
      id: giftTransactionId,
      senderName: currentSender,
      senderId: effectiveVisitorId,
      message: `🎁 Mengirimkan Hadiah ${gift.icon} ${gift.name} (${formatRupiah(gift.price)}) untuk Toko!`,
      timestamp: 'Baru saja',
      isBuyer: true,
      isGift: true,
      giftInfo: {
        id: giftTransactionId,
        giftId: gift.id,
        giftName: gift.name,
        giftIcon: gift.icon,
        giftPrice: gift.price,
      },
    };
    setComments((prev) => [...prev, giftComment]);

    // 5. Host auto-respond terima kasih
    setTimeout(() => {
      const hostThanks: LiveStreamComment = {
        id: 'thanks_' + Date.now(),
        senderName: 'Host • ' + currentStore.name,
        message: `Wah terima kasih banyak kak ${currentSender} atas hadiah ${gift.icon} ${gift.name}-nya! Semoga rezeki kakak sekeluarga makin melimpah & berkah selalu! ❤️🙏`,
        timestamp: 'Baru saja',
        isHost: true,
      };
      setComments((prev) => [...prev, hostThanks]);
    }, 1500);

    // 6. Broadcast ke Firestore
    try {
      await addDoc(collection(db, 'live_stream_gifts'), {
        giftId: gift.id,
        giftName: gift.name,
        giftIcon: gift.icon,
        giftPrice: gift.price,
        storeSlug: (activeTenantSlug || 'default').toLowerCase().trim(),
        storeName: currentStore.name,
        senderName: currentSender,
        senderId: effectiveVisitorId,
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'live_stream_comments'), {
        id: giftTransactionId,
        storeSlug: (activeTenantSlug || 'default').toLowerCase().trim(),
        storeName: currentStore.name,
        senderName: currentSender,
        senderId: effectiveVisitorId,
        message: `🎁 Mengirimkan Hadiah ${gift.icon} ${gift.name} (${formatRupiah(gift.price)}) untuk Toko!`,
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
        isBuyer: true,
        isHost: false,
        isGift: true,
        giftInfo: {
          id: giftTransactionId,
          giftId: gift.id,
          giftName: gift.name,
          giftIcon: gift.icon,
          giftPrice: gift.price,
        },
      });
    } catch (fsErr) {
      console.warn('Gagal simpan gift ke Firestore:', fsErr);
    }

    // 7. Simpan ke Backend API
    sendLiveGiftApi(activeTenantSlug, gift, currentSender, effectiveVisitorId, currentStore.name);

    setIsGiftDrawerOpen(false);
  };

  // Efek Floating Hearts (Tap layar atau klik Like) dengan Like Combo Multiplier
  const triggerHeart = (customX?: number) => {
    heartCounterRef.current += 1;
    const colors = ['#f43f5e', '#ec4899', '#f97316', '#eab308', '#8b5cf6', '#3b82f6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const xPos = customX !== undefined ? customX : Math.floor(Math.random() * 60) + 20;

    const newHeart: FloatingHeart = {
      id: Date.now() + heartCounterRef.current,
      x: xPos,
      color: randomColor,
    };

    setFloatingHearts((prev) => [...prev.slice(-20), newHeart]);
    setLikes((prev) => prev + 1);

    // Combo multiplier
    setLikeCombo((prev) => {
      const next = prev + 1;
      if (likeComboTimerRef.current) clearTimeout(likeComboTimerRef.current);
      likeComboTimerRef.current = setTimeout(() => {
        setLikeCombo(0);
      }, 2200);
      return next;
    });

    if (heartCounterRef.current % 5 === 0) {
      sendLiveLikeApi(activeTenantSlug, 5);
    }

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1800);
  };

  const handleDoubleTapVideo = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = Math.min(80, Math.max(20, ((e.clientX - rect.left) / rect.width) * 100));
    triggerHeart(xPercent);
    triggerHeart(xPercent + (Math.random() * 10 - 5));
  };

  // Handle Add to Cart dari Live
  const handleBuyPinned = (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onAddToCart(prod, 1);
    setAddedSuccessToast(`"${prod.name}" berhasil dimasukkan ke keranjang!`);
    triggerHeart();
    setTimeout(() => {
      setAddedSuccessToast(null);
    }, 3000);
  };

  // Salin link live streaming
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setShareSuccessToast(true);
        setTimeout(() => setShareSuccessToast(false), 2500);
      });
    }
  };

  // Video Siaran Langsung Toko yang sedang live streaming (Selalu menampilkan host jualan produk, bukan kamera pengunjung)
  const isBlockedLegacyUrl = (url?: string) => {
    if (!url) return true;
    return (
      url.includes('assets.mixkit.co') ||
      url.includes('gtv-videos-bucket') ||
      url.includes('commondatastorage.googleapis.com')
    );
  };

  const activeVideoUrl =
    config.videoUrl && config.videoUrl.trim() && config.streamType !== 'webcam' && !isBlockedLegacyUrl(config.videoUrl)
      ? config.videoUrl.trim()
      : PRESET_STREAM_VIDEOS[0].videoUrl;

  const activePoster =
    PRESET_STREAM_VIDEOS.find((p) => p.videoUrl === activeVideoUrl)?.poster ||
    PRESET_STREAM_VIDEOS[0].poster;

  const activeFallbackUrl =
    PRESET_STREAM_VIDEOS.find((p) => p.videoUrl === activeVideoUrl)?.fallbackVideoUrl ||
    PRESET_STREAM_VIDEOS[0].fallbackVideoUrl;

  // Pastikan video preset/custom selalu berputar otomatis (Autoplay with sound or muted fallback)
  useEffect(() => {
    if (!config.enabled || config.streamType === 'webcam') return;
    const vid = videoRef.current;
    if (!vid) return;

    // Explicitly set DOM properties for mobile browser compatibility
    vid.defaultMuted = true;
    vid.muted = isMuted;

    const startPlayback = () => {
      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsVideoPlaying(true);
          })
          .catch(() => {
            // Browser blocked unmuted autoplay, retry with muted
            vid.muted = true;
            vid.play()
              .then(() => setIsVideoPlaying(true))
              .catch(() => {
                // Autoplay blocked on mobile until user taps
                setIsVideoPlaying(false);
              });
          });
      }
    };

    startPlayback();
  }, [activeVideoUrl, displayMode, isMuted]);

  const handleTogglePlayVideo = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.muted = isMuted;
      vid.play()
        .then(() => setIsVideoPlaying(true))
        .catch(() => {
          vid.muted = true;
          vid.play().then(() => setIsVideoPlaying(true)).catch(() => {});
        });
    } else {
      vid.pause();
      setIsVideoPlaying(false);
    }
  };

  // FORMAT RUPIAH
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Jika live streaming dinonaktifkan di admin
  if (!config.enabled) {
    return null;
  }

  // =========================================================================
  // 1. TAMPILAN JIKA DI-HIDE: FLOATING BUBBLE PIN DI SUDUT KIRI BAWAH
  // =========================================================================
  if (displayMode === 'hidden') {
    return (
      <div className="fixed bottom-5 left-4 sm:bottom-6 sm:left-6 z-40 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={() => setDisplayMode('pip')}
          className="group relative flex items-center gap-2.5 p-1.5 pr-4 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 text-white shadow-2xl hover:shadow-red-500/50 border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Tonton Toko Sedang Live Streaming Jualan"
        >
          {/* Avatar / Thumbnail dengan Live Ring */}
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white bg-slate-900 shrink-0">
            <img
              src={config.streamerAvatar || storeLogoUrl || '/pwa-192x192.png'}
              alt={config.streamerName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/pwa-192x192.png';
              }}
            />
            {/* Pulsing Red Dot */}
            <span className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-75" />
          </div>

          <div className="text-left min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-red-700/80 border border-white/30 text-white animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                LIVE
              </span>
              <span className="text-[11px] font-bold text-white/90">
                {(viewers / 1000).toFixed(1)}k
              </span>
            </div>
            <p className="text-[11px] font-bold text-white truncate max-w-[130px] leading-tight mt-0.5">
              {currentStore.name}
            </p>
          </div>

          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors ml-1">
            <Maximize2 className="w-3.5 h-3.5 text-white" />
          </div>
        </button>
      </div>
    );
  }

  // =========================================================================
  // 2. VIDEO ELEMENT REUSABLE (Dapat dirender di PIP, Medium, maupun Fullscreen)
  // Menampilkan siaran langsung video toko/host yang sedang live streaming (Shopee & TikTok Live)
  // =========================================================================
  const renderVideoElement = () => {
    // MODE KAMERA LIVE TOKO (WEBCAM / HP HOST)
    if (config.streamType === 'webcam') {
      const hostLiveNow = isLocalHostBroadcasting || isHostOnline;
      const hostCamMuted = isLocalHostBroadcasting
        ? hostBroadcastState.isCameraMuted
        : hostBroadcastMeta.isCameraMuted;

      if (!hostLiveNow) {
        return (
          <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none flex flex-col items-center justify-center p-4 text-center">
            <img
              src={config.streamerAvatar || storeLogoUrl || '/pwa-192x192.png'}
              alt={config.streamerName}
              className="absolute inset-0 w-full h-full object-cover opacity-20 blur-md scale-110"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/pwa-192x192.png';
              }}
            />
            <div className="relative z-10 flex flex-col items-center max-w-[260px] space-y-2.5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/60 flex items-center justify-center text-emerald-300 shadow-lg shadow-emerald-500/20 animate-pulse">
                <Camera className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-black text-white leading-snug">
                  Kamera Live Toko Menunggu Host
                </p>
                {displayMode !== 'pip' && (
                  <p className="text-[11px] text-white/75 leading-relaxed">
                    Host toko belum menyalakan kamera HP/Webcam. Siaran video langsung akan otomatis tampil di sini begitu host mulai menyiarkan.
                  </p>
                )}
              </div>
              {displayMode === 'fullscreen' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startHostBroadcast({ slug: normSlug, facingMode: 'user' });
                  }}
                  className="mt-1 px-3 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-[10px] font-bold border border-emerald-300/40 shadow cursor-pointer transition-all"
                >
                  🎥 Anda Host Toko? Mulai Kamera di Perangkat Ini
                </button>
              )}
            </div>
          </div>
        );
      }

      return (
        <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
          {/* Layer fallback avatar */}
          <img
            src={config.streamerAvatar || storeLogoUrl || '/pwa-192x192.png'}
            alt={config.streamerName}
            className="absolute inset-0 w-full h-full object-cover opacity-25 blur-sm"
          />

          {/* Layer Frame Relay Real-time (Tampil instan di HP & jaringan 4G CGNAT) */}
          {!isLocalHostBroadcasting && liveFrameDataUrl && !isWebrtcPlaying && (
            <img
              src={liveFrameDataUrl}
              alt="Siaran Kamera Live Toko"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Layer Video WebRTC Real-time HD + Audio / Preview Lokal Host */}
          <video
            ref={remoteWebcamVideoRef}
            autoPlay
            playsInline
            muted={isMuted || isLocalHostBroadcasting}
            onPlaying={() => setIsWebrtcPlaying(true)}
            onLoadedData={() => setIsWebrtcPlaying(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
              isLocalHostBroadcasting && hostBroadcastState.facingMode === 'user' ? '-scale-x-100' : ''
            } ${isLocalHostBroadcasting || isWebrtcPlaying ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Indikator jika kamera host dijeda sementara */}
          {hostCamMuted && (
            <div className="absolute inset-0 z-10 bg-black/75 flex flex-col items-center justify-center p-4 text-center text-white">
              <VideoOff className="w-8 h-8 text-amber-400 mb-2" />
              <p className="text-xs font-bold">Kamera Host Dijeda Sementara</p>
              <p className="text-[10px] text-white/70 mt-0.5">Suara siaran tetap aktif</p>
            </div>
          )}

          {/* Indikator menyambungkan saat frame pertama baru masuk */}
          {!isLocalHostBroadcasting && !liveFrameDataUrl && !isWebrtcPlaying && !hostCamMuted && (
            <div className="absolute inset-0 z-10 bg-black/55 flex flex-col items-center justify-center p-4 text-center text-white">
              <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin mb-2" />
              <p className="text-xs font-bold">Menghubungkan ke Kamera Live Toko...</p>
            </div>
          )}
        </div>
      );
    }

    // MODE PRESET VIDEO / CUSTOM URL
    return (
      <div 
        className="relative w-full h-full overflow-hidden bg-slate-950 select-none cursor-pointer"
        onClick={() => {
          if (videoRef.current && videoRef.current.paused) {
            handleTogglePlayVideo();
          }
        }}
      >
        {/* Poster Image Always in Background so screen is never dark/blank */}
        <img
          src={activePoster}
          alt="Host Live Siaran Toko"
          className="absolute inset-0 w-full h-full object-cover filter brightness-95"
          loading="eager"
        />
        {/* Real-time Broadcast Video Player */}
        <video
          ref={videoRef}
          key={`${activeVideoUrl}_${displayMode}`}
          src={activeVideoUrl}
          autoPlay
          loop
          playsInline
          muted={isMuted}
          className="absolute inset-0 w-full h-full object-cover"
          poster={activePoster}
          onPlay={() => setIsVideoPlaying(true)}
          onPlaying={() => setIsVideoPlaying(true)}
          onPause={() => setIsVideoPlaying(false)}
          onLoadedData={(e) => {
            const vid = e.currentTarget;
            vid.defaultMuted = true;
            vid.muted = isMuted;
            vid.play().then(() => setIsVideoPlaying(true)).catch(() => {
              vid.muted = true;
              vid.play().then(() => setIsVideoPlaying(true)).catch(() => setIsVideoPlaying(false));
            });
          }}
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== activeFallbackUrl && !target.src.endsWith(activeFallbackUrl)) {
              target.src = activeFallbackUrl;
              target.play().catch(() => {});
            }
          }}
        />

        {/* Play Overlay if browser data saver/autoplay restriction paused playback */}
        {!isVideoPlaying && (
          <div
            onClick={handleTogglePlayVideo}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/45 backdrop-blur-xs transition-opacity animate-in fade-in cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl border-2 border-white/60 animate-pulse active:scale-90 transition-transform">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
            <span className="mt-3 px-3.5 py-1 rounded-full bg-black/75 text-white text-xs font-bold border border-white/25 shadow-lg">
              ▶️ Ketuk untuk Memutar Siaran Live
            </span>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // 3. MODE MINI MELAYANG (PICTURE IN PICTURE - PIP)
  // =========================================================================
  if (displayMode === 'pip') {
    return (
      <div
        className="fixed bottom-5 left-4 sm:bottom-6 sm:left-6 z-40 animate-in fade-in slide-in-from-bottom-5 duration-300"
        style={{ maxWidth: 'calc(100vw - 32px)' }}
      >
        <div className="relative group rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-950 w-[150px] sm:w-[175px] h-[225px] sm:h-[265px] flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] hover:shadow-orange-500/20">
          {/* Background Video */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setDisplayMode('fullscreen')}
            title="Klik untuk memperbesar layar siaran streaming"
          >
            {renderVideoElement()}
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/60 pointer-events-none" />
          </div>

          {/* Floating Hearts Animation in PIP */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            {floatingHearts.map((h) => (
              <div
                key={h.id}
                className="absolute bottom-12 transition-all duration-1000 ease-out transform"
                style={{
                  left: `${h.x}%`,
                  animation: 'floatUpPiP 1.8s ease-out forwards',
                }}
              >
                <Heart className="w-4 h-4 fill-current drop-shadow-md" style={{ color: h.color }} />
              </div>
            ))}
          </div>

          {/* Top Controls in PIP */}
          <div className="relative z-30 p-2 flex items-center justify-between text-white">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-600/90 backdrop-blur-md text-[9px] font-black uppercase tracking-wider text-white shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>LIVE</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="p-1 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white transition-colors"
                title={isMuted ? 'Nyalakan Suara' : 'Bisukan Suara'}
              >
                {isMuted ? <VolumeX className="w-3 h-3 text-red-300" /> : <Volume2 className="w-3 h-3 text-emerald-300" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDisplayMode('medium');
                }}
                className="p-1 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white transition-colors hidden sm:flex"
                title="Mode Jendela Sedang"
              >
                <Minimize2 className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDisplayMode('fullscreen');
                }}
                className="p-1 rounded-full bg-orange-600 hover:bg-orange-500 text-white shadow-sm transition-colors"
                title="Perbesar Layar Penuh (TikTok/Shopee View)"
              >
                <Maximize2 className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDisplayMode('hidden');
                }}
                className="p-1 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white transition-colors"
                title="Kecilkan ke Ikon Melayang"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Quick Sound Prompt Banner if muted */}
          {isMuted && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(false);
              }}
              className="relative z-30 mx-2 py-0.5 px-2 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-[9px] text-white font-medium flex items-center justify-center gap-1 cursor-pointer hover:bg-white/30 transition-all text-center"
            >
              <VolumeX className="w-2.5 h-2.5 text-orange-300 animate-pulse" />
              <span>Tap Suara</span>
            </div>
          )}

          {/* Bottom Info & Pinned Product Pill in PIP */}
          <div className="relative z-30 p-2 space-y-1.5">
            <div className="flex items-center justify-between text-white/90">
              <span className="text-[10px] font-bold truncate max-w-[90px] drop-shadow-sm">
                {currentStore.name}
              </span>
              <span className="text-[9px] font-semibold text-white/80 flex items-center gap-0.5">
                <Eye className="w-2.5 h-2.5 text-rose-300" />
                {(viewers / 1000).toFixed(1)}k
              </span>
            </div>

            {/* Pinned Mini Product */}
            {pinnedProduct && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleBuyPinned(pinnedProduct, e);
                }}
                className="p-1.5 rounded-xl bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-red-500/90 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg flex items-center gap-1.5 cursor-pointer border border-white/20 transition-all active:scale-95"
                title={`Beli ${pinnedProduct.name} - ${formatRupiah(pinnedProduct.price)}`}
              >
                <div className="w-6 h-6 rounded-lg bg-white overflow-hidden shrink-0">
                  <img
                    src={formatImageUrl(pinnedProduct.image)}
                    alt={pinnedProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = getProductFallbackImage(pinnedProduct.name, pinnedProduct.category);
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold truncate leading-tight">
                    {pinnedProduct.name}
                  </p>
                  <p className="text-[9px] font-black text-white leading-tight">
                    {formatRupiah(pinnedProduct.price)}
                  </p>
                </div>
                <div className="w-5 h-5 rounded-full bg-white text-orange-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Plus className="w-3 h-3 stroke-[3]" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. MODE JENDELA SEDANG (FLOATING MEDIUM WINDOW)
  // =========================================================================
  if (displayMode === 'medium') {
    return (
      <div className="fixed bottom-5 left-4 sm:bottom-6 sm:left-6 z-40 animate-in fade-in zoom-in-95 duration-200">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-950 w-[300px] sm:w-[340px] h-[480px] sm:h-[520px] flex flex-col justify-between">
          {/* Background Video */}
          <div
            className="absolute inset-0 cursor-pointer"
            onDoubleClick={handleDoubleTapVideo}
            title="Klik 2x untuk beri hati love"
          >
            {renderVideoElement()}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/70 pointer-events-none" />
          </div>

          {/* Floating Hearts Layer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            {floatingHearts.map((h) => (
              <div
                key={h.id}
                className="absolute bottom-20 transition-all duration-1000 ease-out transform"
                style={{
                  left: `${h.x}%`,
                  animation: 'floatUpMedium 1.8s ease-out forwards',
                }}
              >
                <Heart className="w-6 h-6 fill-current drop-shadow-md" style={{ color: h.color }} />
              </div>
            ))}
          </div>

          {/* Top Header Controls in Medium */}
          <div className="relative z-30 p-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/40 bg-slate-900 shrink-0">
                <img
                  src={config.streamerAvatar || storeLogoUrl || '/pwa-192x192.png'}
                  alt={config.streamerName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold truncate max-w-[110px] text-white">
                    {currentStore.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsFollowing(!isFollowing)}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${
                      isFollowing
                        ? 'bg-white/20 text-white'
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    {isFollowing ? 'Diikuti ✓' : '+ Ikuti'}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-white/80">
                  <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[8px] font-black uppercase tracking-wider animate-pulse">
                    LIVE
                  </span>
                  <span>👥 {(viewers / 1000).toFixed(1)}k</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white transition-colors"
                title={isMuted ? 'Nyalakan Suara' : 'Bisukan'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-300" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-300" />}
              </button>

              <button
                type="button"
                onClick={() => setDisplayMode('pip')}
                className="p-1.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white transition-colors"
                title="Perkecil ke Mini Melayang (PiP)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setDisplayMode('fullscreen')}
                className="p-1.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white shadow-sm transition-colors"
                title="Perbesar Layar Penuh"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setDisplayMode('hidden')}
                className="p-1.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white transition-colors"
                title="Tutup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Active Gift Banner in Medium Mode */}
          {activeGiftCelebration && (
            <div className="relative z-30 mx-2 mt-1 py-1 px-2.5 rounded-xl bg-gradient-to-r from-amber-500/90 to-yellow-400/90 text-slate-950 font-black flex items-center justify-between text-[10px] shadow-lg border border-amber-300 animate-in slide-in-from-top duration-200">
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-base animate-bounce">{activeGiftCelebration.gift.icon}</span>
                <span className="truncate">
                  <strong>{activeGiftCelebration.senderName}</strong> kirim <strong>{activeGiftCelebration.gift.name}</strong>!
                </span>
              </span>
              <span className="text-[9px] bg-slate-950/20 px-1.5 py-0.5 rounded-md shrink-0">
                {formatRupiah(activeGiftCelebration.gift.price)}
              </span>
            </div>
          )}

          {/* Middle Live Chat Stream in Medium Mode */}
          <div className="relative z-30 flex-1 flex flex-col justify-end px-3 py-1 overflow-hidden pointer-events-none">
            <div
              ref={chatScrollRef}
              className="max-h-[140px] overflow-y-auto space-y-1.5 pointer-events-auto pr-1 text-left scrollbar-none"
            >
              {comments.slice(-8).map((c) => {
                const isMe =
                  Boolean(c.senderId && c.senderId === effectiveVisitorId) ||
                  c.id.startsWith('my_') ||
                  Boolean(visitorName && c.senderName && c.senderName.trim().toLowerCase() === visitorName.trim().toLowerCase());
                
                if (c.isGift) {
                  return (
                    <div
                      key={c.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/80 via-yellow-400/85 to-orange-500/80 text-slate-950 font-bold border border-amber-200 text-[11px] shadow-sm max-w-full"
                    >
                      <span className="text-sm shrink-0">{c.giftInfo?.giftIcon || '🎁'}</span>
                      <span className="truncate">
                        <strong>{c.senderName}</strong> kirim {c.giftInfo?.giftName || 'Hadiah'} ({formatRupiah(c.giftInfo?.giftPrice || 0)})
                      </span>
                    </div>
                  );
                }

                if (c.isGuestVideo) {
                  return (
                    <div
                      key={c.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-900/85 border border-emerald-400/60 text-emerald-200 font-bold text-[11px] shadow-sm max-w-full"
                    >
                      <Video className="w-3 h-3 text-emerald-300 shrink-0 animate-pulse" />
                      <span className="truncate">{c.message}</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={c.id}
                    className={`inline-flex flex-wrap items-baseline gap-1 px-2.5 py-1 rounded-xl backdrop-blur-md border text-[11px] text-white shadow-xs max-w-full ${
                      isMe ? 'bg-cyan-950/75 border-cyan-400/50 ring-1 ring-cyan-400/30' : 'bg-black/55 border-white/10'
                    }`}
                  >
                    <span
                      className={`font-bold flex items-center gap-0.5 ${
                        c.isHost ? 'text-amber-400' : isMe ? 'text-cyan-300 font-black' : 'text-rose-300'
                      }`}
                    >
                      {isMe && <User className="w-2.5 h-2.5 text-cyan-400 shrink-0" />}
                      {c.senderName}:
                    </span>
                    {isMe && (
                      <span className="text-[8px] px-1 py-0.1 rounded bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-bold shrink-0">
                        Kamu
                      </span>
                    )}
                    <span className="text-white/90 break-words font-medium">{c.message}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Area: Pinned Product & Actions in Medium Mode */}
          <div className="relative z-30 p-2.5 space-y-2">
            {/* Pinned Product Card (Multi-Item Support) */}
            {pinnedProduct && (
              <div
                onClick={() => handleBuyPinned(pinnedProduct)}
                className="p-2 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-amber-400/60 text-white flex items-center justify-between gap-2 cursor-pointer hover:border-amber-400 transition-all shadow-lg group relative"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="relative w-10 h-10 rounded-xl bg-white overflow-hidden shrink-0 border border-white/20">
                    <img
                      src={formatImageUrl(pinnedProduct.image)}
                      alt={pinnedProduct.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getProductFallbackImage(pinnedProduct.name, pinnedProduct.category);
                      }}
                    />
                    <span className="absolute top-0 left-0 px-1 py-0.2 rounded-br-md bg-red-600 text-[8px] font-black text-white">
                      #{safePromotedIndex + 1}
                    </span>
                  </div>
                  <div className="min-w-0 text-left flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-400" />
                        Promo Live {promotedProducts.length > 1 ? `(${safePromotedIndex + 1}/${promotedProducts.length})` : ''}
                      </span>
                      {promotedProducts.length > 1 && (
                        <div className="flex items-center gap-0.5 bg-black/40 rounded-md p-0.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={handlePrevPromoted}
                            className="p-0.5 hover:bg-white/20 rounded text-white"
                            title="Produk Promo Sebelumnya"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={handleNextPromoted}
                            className="p-0.5 hover:bg-white/20 rounded text-white"
                            title="Produk Promo Berikutnya"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <h5 className="text-xs font-bold text-white truncate leading-tight">
                      {pinnedProduct.name}
                    </h5>
                    <p className="text-xs font-black text-amber-400">
                      {formatRupiah(pinnedProduct.price)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleBuyPinned(pinnedProduct, e)}
                  className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shrink-0 shadow-md active:scale-95 transition-all"
                >
                  + Beli
                </button>
              </div>
            )}

            {/* Visitor Name Status Bar in Medium Mode */}
            <div className="flex items-center justify-between text-[10px] text-white/80 px-1">
              {isEditingVisitorName ? (
                <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={tempVisitorName}
                    onChange={(e) => setTempVisitorName(e.target.value)}
                    placeholder="Nama Anda..."
                    className="flex-1 px-2 py-0.5 rounded-lg bg-black/60 border border-cyan-400 text-white text-[10px] focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveVisitorName(tempVisitorName)}
                    className="px-2 py-0.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[9px]"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingVisitorName(false)}
                    className="px-1.5 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[9px]"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-1 truncate text-white/90">
                    <User className="w-3 h-3 text-cyan-300" />
                    <span>Nama:</span>
                    <strong className="text-cyan-300 truncate max-w-[130px]">{visitorName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempVisitorName(visitorName);
                      setIsEditingVisitorName(true);
                    }}
                    className="text-[9px] text-amber-300 hover:text-amber-200 underline font-semibold shrink-0 ml-1"
                  >
                    Ganti Nama
                  </button>
                </div>
              )}
            </div>

            {/* Quick Action Input, Gift, Video & Heart Button */}
            <div className="flex items-center gap-1.5">
              <form onSubmit={handleSendComment} className="flex-1 flex gap-1">
                <input
                  type="text"
                  value={myCommentText}
                  onChange={(e) => setMyCommentText(e.target.value)}
                  placeholder={`Pesan (${visitorName})...`}
                  className="w-full px-2 py-1.5 rounded-xl bg-white/20 backdrop-blur-md text-white placeholder-white/60 text-xs border border-white/20 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  className="p-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition-colors shrink-0"
                  title="Kirim Komentar"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Buka Layar Penuh untuk Bincang Video atau Gift */}
              <button
                type="button"
                onClick={() => {
                  setDisplayMode('fullscreen');
                  setIsGiftDrawerOpen(true);
                }}
                className="p-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md font-bold text-xs shrink-0 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center"
                title="Kirim Hadiah / Gift ke Toko"
              >
                <Gift className="w-4 h-4 fill-slate-950" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setDisplayMode('fullscreen');
                  if (!isGuestVideoActive) {
                    setIsGuestVideoPromptOpen(true);
                  }
                }}
                className={`p-1.5 rounded-xl text-white shadow-md text-xs shrink-0 active:scale-95 transition-all flex items-center justify-center ${
                  isGuestVideoActive ? 'bg-emerald-600 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
                title={isGuestVideoActive ? 'Video Kamu Sedang Live' : 'Bincang Video Live dengan Toko'}
              >
                <Video className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => triggerHeart()}
                className="relative p-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-90 text-white shadow-md transition-all flex items-center gap-1 shrink-0"
                title="Beri Hati Like"
              >
                <Heart className="w-4 h-4 fill-current text-white animate-pulse" />
                {likeCombo > 1 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded-full bg-yellow-400 text-slate-950 font-black text-[8px] shadow-sm animate-bounce">
                    {likeCombo}x
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. MODE LAYAR PENUH (FULL SCREEN TIKTOK / SHOPEE LIVE MODAL VIEW)
  // =========================================================================
  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Container Vertikal Rasio 9:16 Khas TikTok / Shopee Live */}
      <div className="relative w-full h-full sm:h-[94vh] sm:max-w-[440px] bg-slate-950 sm:rounded-3xl overflow-hidden shadow-2xl border border-white/15 flex flex-col justify-between select-none">
        {/* Background Stream Video */}
        <div
          className="absolute inset-0 cursor-pointer"
          onDoubleClick={handleDoubleTapVideo}
          title="Klik 2x di layar video untuk like hati ❤️"
        >
          {renderVideoElement()}
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/80 pointer-events-none" />
        </div>

        {/* Floating Hearts Animation Container */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {floatingHearts.map((h) => (
            <div
              key={h.id}
              className="absolute bottom-28 transition-all duration-1000 ease-out transform"
              style={{
                left: `${h.x}%`,
                animation: 'floatUpFull 1.8s ease-out forwards',
              }}
            >
              <Heart className="w-8 h-8 fill-current drop-shadow-lg" style={{ color: h.color }} />
            </div>
          ))}
        </div>

        {/* ================= GUEST LIVE INTERACTIVE 2-WAY VIDEO WINDOW ================= */}
        {isGuestVideoActive && (
          <div
            className={`absolute z-35 transition-all duration-300 shadow-2xl border-2 border-emerald-400 bg-slate-950 overflow-hidden ring-4 ring-emerald-500/25 ${
              guestVideoLayout === 'pip'
                ? 'top-20 right-3.5 w-36 sm:w-40 h-48 rounded-2xl'
                : 'top-16 inset-x-3.5 h-52 rounded-2xl'
            }`}
          >
            <video
              ref={guestVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${guestFacingMode === 'user' ? '-scale-x-100' : ''}`}
            />

            {/* Guest Live Status Bar */}
            <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-xs text-[9px] text-white">
              <span className="flex items-center gap-1 font-bold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Anda
              </span>
              <button
                type="button"
                onClick={() => setGuestVideoLayout(guestVideoLayout === 'pip' ? 'split' : 'pip')}
                className="text-[9px] text-white/90 hover:text-white underline font-medium cursor-pointer"
              >
                {guestVideoLayout === 'pip' ? 'Perbesar' : 'Kecilkan'}
              </button>
            </div>

            {/* Guest Camera / Mic Quick Controls */}
            <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-center gap-1.5 bg-black/75 backdrop-blur-xs py-1 px-1 rounded-xl">
              <button
                type="button"
                onClick={handleToggleGuestMic}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isGuestMicMuted ? 'bg-red-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                title={isGuestMicMuted ? 'Nyalakan Mic' : 'Bisukan Mic'}
              >
                {isGuestMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleToggleGuestCamera}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isGuestCameraMuted ? 'bg-red-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                title={isGuestCameraMuted ? 'Nyalakan Kamera' : 'Matikan Kamera'}
              >
                {isGuestCameraMuted ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleFlipGuestCamera}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                title="Putar Kamera Depan/Belakang"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleStopGuestVideo}
                className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
                title="Akhiri Live Video Bersama Host"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ================= ACTIVE GIFT CELEBRATION BANNER ================= */}
        {activeGiftCelebration && (
          <div className="absolute top-20 inset-x-3.5 z-40 p-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 text-slate-950 shadow-2xl border-2 border-yellow-100 flex items-center justify-between animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-3xl shrink-0 animate-bounce drop-shadow">
                {activeGiftCelebration.gift.icon}
              </span>
              <div className="min-w-0">
                <div className="text-[9px] uppercase font-black tracking-wider text-amber-950 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-950 fill-amber-950" />
                  SAWERAN GIFT SPESIAL LIVE!
                </div>
                <h4 className="text-xs font-black truncate leading-tight text-slate-950">
                  {activeGiftCelebration.senderName} mengirim {activeGiftCelebration.gift.name}
                </h4>
                <p className="text-[10px] font-bold text-amber-950">
                  {formatRupiah(activeGiftCelebration.gift.price)} untuk Host Toko
                </p>
              </div>
            </div>
            <div className="px-2 py-1 rounded-xl bg-slate-950 text-amber-300 text-[10px] font-black shrink-0 shadow-xs">
              BERKAH! ✨
            </div>
          </div>
        )}

        {/* ================= HEADER SIARAN LIVE ================= */}
        <div className="relative z-30 p-3.5 pt-4 sm:pt-3.5 flex items-center justify-between text-white">
          {/* Info Toko & Streamer */}
          <div className="flex items-center gap-2.5 p-1 pr-3 rounded-full bg-black/45 backdrop-blur-md border border-white/15 shadow-sm max-w-[210px] sm:max-w-[230px]">
            <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white bg-slate-900 shrink-0">
              <img
                src={config.streamerAvatar || storeLogoUrl || '/pwa-192x192.png'}
                alt={config.streamerName}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black" />
            </div>

            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1">
                <h4 className="text-xs font-black text-white truncate leading-tight">
                  {currentStore.name}
                </h4>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-white/80">
                <span className="text-[9px] font-bold text-amber-300">
                  {(likes / 1000).toFixed(1)}k suka
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFollowing(!isFollowing)}
              className={`ml-1 px-2.5 py-1 rounded-full text-[10px] font-black transition-all shrink-0 ${
                isFollowing
                  ? 'bg-white/20 text-white'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-xs animate-pulse'
              }`}
            >
              {isFollowing ? 'Mengikuti ✓' : '+ Ikuti'}
            </button>
          </div>

          {/* Live Indicator, Viewers & Kontrol Ukuran */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider shadow-md">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>LIVE</span>
              <span className="ml-1 text-[11px] font-bold">
                {(viewers / 1000).toFixed(1)}k
              </span>
            </div>

            {/* Tombol Mute / Volume */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-full bg-black/45 hover:bg-black/70 backdrop-blur-md text-white transition-colors"
              title={isMuted ? 'Nyalakan Suara Live' : 'Bisukan Suara'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Tombol Perkecil ke PiP (Minimize) */}
            <button
              type="button"
              onClick={() => setDisplayMode('pip')}
              className="p-2 rounded-full bg-black/45 hover:bg-black/70 backdrop-blur-md text-white transition-colors"
              title="Perkecil ke Layar Melayang (PiP)"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            {/* Tombol Tutup / Sembunyikan */}
            <button
              type="button"
              onClick={() => setDisplayMode('hidden')}
              className="p-2 rounded-full bg-black/45 hover:bg-black/70 backdrop-blur-md text-white transition-colors"
              title="Tutup Siaran Live"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Voucher Banner Melayang di Bawah Header */}
        {config.promoVoucherCode && (
          <div className="relative z-30 mx-3 py-1 px-3 rounded-full bg-gradient-to-r from-amber-500/90 to-orange-600/90 backdrop-blur-md border border-white/20 text-white flex items-center justify-between shadow-lg text-[11px]">
            <span className="flex items-center gap-1 font-semibold truncate">
              <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0" />
              <span>{config.promoVoucherText || 'Diskon Spesial Penonton Live!'}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-black/30 font-mono font-black text-amber-200 shrink-0 ml-1">
              {config.promoVoucherCode}
            </span>
          </div>
        )}

        {/* Toast Notifikasi Berhasil Tambah ke Keranjang */}
        {addedSuccessToast && (
          <div className="absolute top-20 left-4 right-4 z-40 p-2.5 rounded-2xl bg-emerald-600/95 backdrop-blur-md text-white text-xs font-bold flex items-center justify-between shadow-2xl border border-white/30 animate-in slide-in-from-top-4 duration-200">
            <span className="flex items-center gap-1.5 truncate">
              <Check className="w-4 h-4 text-emerald-200 shrink-0" />
              <span className="truncate">{addedSuccessToast}</span>
            </span>
            {onOpenCart && (
              <button
                type="button"
                onClick={() => {
                  setDisplayMode('pip');
                  onOpenCart();
                }}
                className="px-2.5 py-1 rounded-xl bg-white text-emerald-800 text-[10px] font-black shrink-0 hover:bg-emerald-50 transition-colors"
              >
                Lihat Keranjang
              </button>
            )}
          </div>
        )}

        {/* Toast Share Link */}
        {shareSuccessToast && (
          <div className="absolute top-20 left-6 right-6 z-40 p-2 rounded-xl bg-slate-900/95 text-white text-xs font-bold text-center border border-white/20 shadow-xl animate-in fade-in">
            Link siaran live streaming berhasil disalin!
          </div>
        )}

        {/* ================= MIDDLE / CHAT STREAM ================= */}
        <div className="relative z-30 flex-1 flex flex-col justify-end px-3.5 pb-2 overflow-hidden pointer-events-none">
          <div
            ref={chatScrollRef}
            className="max-h-[220px] overflow-y-auto space-y-2 pointer-events-auto pr-1 text-left scrollbar-none"
          >
            {comments.map((c) => {
              const isMe =
                Boolean(c.senderId && c.senderId === effectiveVisitorId) ||
                c.id.startsWith('my_') ||
                Boolean(visitorName && c.senderName && c.senderName.trim().toLowerCase() === visitorName.trim().toLowerCase());

              if (c.isGift) {
                return (
                  <div
                    key={c.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/90 via-yellow-400/90 to-orange-500/90 text-slate-950 font-black border border-amber-200 text-xs shadow-md max-w-[94%] animate-in slide-in-from-left duration-200"
                  >
                    <span className="text-base shrink-0">{c.giftInfo?.giftIcon || '🎁'}</span>
                    <span className="truncate">
                      <strong>{c.senderName}</strong> mengirim <strong>{c.giftInfo?.giftName || 'Hadiah'}</strong> ({formatRupiah(c.giftInfo?.giftPrice || 0)})
                    </span>
                  </div>
                );
              }

              if (c.isGuestVideo) {
                return (
                  <div
                    key={c.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-950/90 border border-emerald-400/70 text-emerald-200 font-bold text-xs shadow-md max-w-[94%] animate-in slide-in-from-left duration-200"
                  >
                    <Video className="w-3.5 h-3.5 text-emerald-300 shrink-0 animate-pulse" />
                    <span className="truncate">{c.message}</span>
                  </div>
                );
              }

              return (
                <div
                  key={c.id}
                  className={`inline-flex flex-wrap items-baseline gap-1.5 px-3 py-1.5 rounded-2xl backdrop-blur-md border text-xs text-white shadow-sm max-w-[92%] transition-all ${
                    isMe
                      ? 'bg-cyan-950/80 border-cyan-400/60 ring-1 ring-cyan-400/30'
                      : 'bg-black/50 border-white/10'
                  }`}
                >
                  <span
                    className={`font-black flex items-center gap-1 ${
                      c.isHost ? 'text-amber-400' : isMe ? 'text-cyan-300' : 'text-rose-300'
                    }`}
                  >
                    {isMe && <User className="w-3 h-3 text-cyan-400 shrink-0" />}
                    {c.senderName}:
                  </span>
                  {isMe && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-bold shrink-0">
                      Kamu
                    </span>
                  )}
                  <span className="text-white/95 break-words font-medium">{c.message}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= BOTTOM BAR INTERACTIVE ================= */}
        <div className="relative z-30 p-3 sm:p-4 space-y-2.5 bg-gradient-to-t from-black via-black/85 to-transparent">
          {/* Pinned Product Card (Multi-Item Promo Support) */}
          {pinnedProduct && (
            <div
              onClick={() => handleBuyPinned(pinnedProduct)}
              className="p-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md border-2 border-amber-400 text-white flex items-center justify-between gap-3 shadow-2xl cursor-pointer hover:border-amber-300 transition-all group relative"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="relative w-12 h-12 rounded-xl bg-white overflow-hidden shrink-0 border border-white/20 shadow-xs">
                  <img
                    src={formatImageUrl(pinnedProduct.image)}
                    alt={pinnedProduct.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = getProductFallbackImage(pinnedProduct.name, pinnedProduct.category);
                    }}
                  />
                  <span className="absolute top-0 left-0 px-1 py-0.2 rounded-br-md bg-red-600 text-[8px] font-black text-white">
                    #{safePromotedIndex + 1}
                  </span>
                </div>

                <div className="min-w-0 text-left flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                      Promo Live {promotedProducts.length > 1 ? `(${safePromotedIndex + 1}/${promotedProducts.length})` : ''}
                    </span>
                    {promotedProducts.length > 1 && (
                      <div
                        className="flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded-lg border border-white/20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={handlePrevPromoted}
                          className="p-0.5 hover:bg-white/20 rounded text-white cursor-pointer"
                          title="Promo Sebelumnya"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[9px] font-bold text-white/80">
                          {safePromotedIndex + 1}/{promotedProducts.length}
                        </span>
                        <button
                          type="button"
                          onClick={handleNextPromoted}
                          className="p-0.5 hover:bg-white/20 rounded text-white cursor-pointer"
                          title="Promo Berikutnya"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <h5 className="text-xs font-bold text-white truncate leading-tight">
                    {pinnedProduct.name}
                  </h5>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-black text-amber-400">
                      {formatRupiah(pinnedProduct.price)}
                    </span>
                    <span className="text-[10px] line-through text-white/50">
                      {formatRupiah(Math.round(pinnedProduct.price * 1.25))}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => handleBuyPinned(pinnedProduct, e)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shrink-0 shadow-lg shadow-orange-500/30 active:scale-95 transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Beli</span>
              </button>
            </div>
          )}

          {/* Visitor Name & Quick Suggestion Chips */}
          <div className="space-y-1.5">
            {/* Bar Nama Pengunjung */}
            <div className="flex items-center justify-between text-[11px] text-white/90 px-0.5">
              {isEditingVisitorName ? (
                <div className="flex items-center gap-1.5 w-full bg-black/70 p-1.5 rounded-xl border border-cyan-400" onClick={(e) => e.stopPropagation()}>
                  <User className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
                  <input
                    type="text"
                    value={tempVisitorName}
                    onChange={(e) => setTempVisitorName(e.target.value)}
                    placeholder="Tulis nama Anda..."
                    className="flex-1 px-2.5 py-1 rounded-lg bg-white/10 text-white text-xs border-0 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveVisitorName(tempVisitorName)}
                    className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingVisitorName(false)}
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                    <span className="text-white/70">Nama Pengunjung:</span>
                    <strong className="text-cyan-300 font-bold truncate max-w-[160px]">{visitorName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempVisitorName(visitorName);
                      setIsEditingVisitorName(true);
                    }}
                    className="text-[10px] text-amber-300 hover:text-amber-200 underline font-semibold flex items-center gap-1 shrink-0 ml-1 cursor-pointer"
                    title="Ganti nama yang tampil saat kirim pesan"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Ganti Nama</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Chips Rekomendasi Chat */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_COMMENT_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendComment(undefined, chip)}
                  className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-[10px] text-white font-medium border border-white/20 shrink-0 transition-all cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Kontrol & Komentar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Tombol Etalase Keranjang Kuning */}
            <button
              type="button"
              onClick={() => setIsEtalaseOpen(!isEtalaseOpen)}
              className="relative p-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-lg shadow-amber-400/25 active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer"
              title="Buka Etalase Produk Live (Keranjang Kuning)"
            >
              <ShoppingBag className="w-5 h-5 fill-slate-950" />
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[9px] font-black border border-slate-950 shadow-xs">
                {products.length}
              </span>
            </button>

            {/* Input Komentar Pengunjung */}
            <form onSubmit={handleSendComment} className="flex-1 flex items-center gap-1 min-w-0">
              <input
                type="text"
                value={myCommentText}
                onChange={(e) => setMyCommentText(e.target.value)}
                placeholder={`Pesan (${visitorName})...`}
                className="w-full px-3 py-2.5 rounded-2xl bg-white/20 backdrop-blur-md text-white placeholder-white/60 text-xs border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="submit"
                className="p-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-95 transition-all cursor-pointer shrink-0"
                title="Kirim Pesan Live"
              >
                <Send className="w-4 h-4 fill-slate-950" />
              </button>
            </form>

            {/* Tombol Kirim Gift / Saweran ke Host */}
            <button
              type="button"
              onClick={() => setIsGiftDrawerOpen(true)}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/30 active:scale-95 transition-all shrink-0 cursor-pointer flex items-center justify-center"
              title="Kirim Hadiah Virtual (Gift) ke Host Toko"
            >
              <Gift className="w-5 h-5 fill-slate-950" />
            </button>

            {/* Tombol Interaksi Live Video Bersama Host */}
            <button
              type="button"
              onClick={() => {
                if (isGuestVideoActive) {
                  setGuestVideoLayout(guestVideoLayout === 'pip' ? 'split' : 'pip');
                } else {
                  setIsGuestVideoPromptOpen(true);
                }
              }}
              className={`p-2.5 rounded-2xl text-white shadow-lg active:scale-95 transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                isGuestVideoActive
                  ? 'bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-300 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-500 ring-1 ring-indigo-400/50'
              }`}
              title={isGuestVideoActive ? 'Video Anda Aktif (Klik untuk ubah tampilan)' : 'Mulai Interaksi Video Live dengan Host Toko'}
            >
              <Video className="w-5 h-5" />
            </button>

            {/* Tombol Bagikan */}
            <button
              type="button"
              onClick={handleShare}
              className="p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Bagikan Siaran Live"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Tombol Like Hati dengan Combo Counter */}
            <button
              type="button"
              onClick={() => triggerHeart()}
              className="relative p-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-90 text-white shadow-lg shadow-rose-600/30 transition-all shrink-0 cursor-pointer"
              title="Beri Suka / Hati ❤️"
            >
              <Heart className="w-5 h-5 fill-current text-white animate-pulse" />
              {likeCombo > 1 ? (
                <span className="absolute -top-2 -right-1 px-1.5 py-0.2 rounded-full bg-yellow-400 text-slate-950 text-[9px] font-black border border-slate-900 shadow-md animate-bounce">
                  {likeCombo}x
                </span>
              ) : (
                <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded-full bg-white text-rose-600 text-[8px] font-black border border-rose-600">
                  ❤️
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ================= ETALASE DRAWER LENGKAP ================= */}
        {isEtalaseOpen && (
          <div className="absolute inset-x-0 bottom-0 top-20 z-50 bg-slate-900/98 backdrop-blur-xl rounded-t-3xl border-t border-white/20 flex flex-col p-4 shadow-2xl animate-in slide-in-from-bottom duration-300 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center text-slate-950 font-black">
                  <ShoppingBag className="w-4 h-4 fill-slate-950" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Etalase Produk Live ({products.length})
                  </h3>
                  <p className="text-[11px] text-amber-300">
                    {promotedProducts.length > 0
                      ? `${promotedProducts.length} Produk khusus di-spill & dipromosikan host`
                      : 'Diskon & promo khusus belanja saat live berlangsung'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEtalaseOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Daftar Produk di Etalase */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
              {/* Bagian 1: Produk Promo Pilihan Host */}
              {promotedProducts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                      Produk Pilihan Promo Live ({promotedProducts.length})
                    </span>
                    <span className="text-[10px] text-amber-300 font-bold">Diskon Khusus Siaran</span>
                  </div>

                  {promotedProducts.map((prod, index) => {
                    const isSelected = prod.id === pinnedProduct?.id;
                    return (
                      <div
                        key={'promoted_' + prod.id}
                        className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-amber-950/50 border-amber-400 ring-2 ring-amber-400/40'
                            : 'bg-white/8 border-amber-400/40 hover:border-amber-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative w-14 h-14 rounded-xl bg-white overflow-hidden shrink-0 border border-white/20">
                            <img
                              src={formatImageUrl(prod.image)}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = getProductFallbackImage(prod.name, prod.category);
                              }}
                            />
                            <span className="absolute top-0 left-0 px-1.5 py-0.2 rounded-br-md bg-red-600 text-[9px] font-black text-white">
                              #{index + 1}
                            </span>
                          </div>

                          <div className="min-w-0 text-left">
                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider block mb-0.5">
                              {index === 0 ? '⭐ SPILL UTAMA' : `PROMO LIVE #${index + 1}`}
                            </span>
                            <h4 className="text-xs font-bold text-white truncate leading-tight">
                              {prod.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-black text-amber-400">
                                {formatRupiah(prod.price)}
                              </span>
                              <span className="text-[10px] text-white/50 line-through">
                                {formatRupiah(Math.round(prod.price * 1.25))}
                              </span>
                            </div>
                            <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                              ✓ Siap Kirim Hari Ini
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              handleBuyPinned(prod);
                              setIsEtalaseOpen(false);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-md active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3 stroke-[3]" />
                            <span>Beli</span>
                          </button>
                          {onOpenProductDetail && (
                            <button
                              type="button"
                              onClick={() => {
                                setDisplayMode('pip');
                                onOpenProductDetail(prod);
                              }}
                              className="text-[10px] text-white/70 hover:text-white underline pt-0.5 cursor-pointer"
                            >
                              Detail
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bagian 2: Semua Katalog Produk Toko Lainnya */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                    Semua Katalog Produk ({products.length})
                  </span>
                </div>

                {products
                  .filter((p) => !promotedProducts.some((prom) => prom.id === p.id))
                  .map((prod, index) => (
                    <div
                      key={'all_' + prod.id}
                      className="p-2.5 rounded-2xl border bg-white/5 border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative w-14 h-14 rounded-xl bg-white overflow-hidden shrink-0 border border-white/20">
                          <img
                            src={formatImageUrl(prod.image)}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = getProductFallbackImage(prod.name, prod.category);
                            }}
                          />
                          <span className="absolute top-0 left-0 px-1.5 py-0.2 rounded-br-md bg-slate-950/90 text-[9px] font-black text-white/70">
                            #{promotedProducts.length + index + 1}
                          </span>
                        </div>

                        <div className="min-w-0 text-left">
                          <h4 className="text-xs font-bold text-white truncate leading-tight">
                            {prod.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-black text-amber-400">
                              {formatRupiah(prod.price)}
                            </span>
                            <span className="text-[10px] text-white/50 line-through">
                              {formatRupiah(Math.round(prod.price * 1.25))}
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                            ✓ Siap Kirim Hari Ini
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            handleBuyPinned(prod);
                            setIsEtalaseOpen(false);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                          <span>Beli</span>
                        </button>
                        {onOpenProductDetail && (
                          <button
                            type="button"
                            onClick={() => {
                              setDisplayMode('pip');
                              onOpenProductDetail(prod);
                            }}
                            className="text-[10px] text-white/70 hover:text-white underline pt-0.5 cursor-pointer"
                          >
                            Detail
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL DRAWER HADIAH VIRTUAL (GIFT SAWERAN) ================= */}
        {isGiftDrawerOpen && (
          <div className="absolute inset-x-0 bottom-0 top-24 z-50 bg-slate-900/98 backdrop-blur-2xl rounded-t-3xl border-t border-amber-400/40 flex flex-col p-4 shadow-2xl animate-in slide-in-from-bottom duration-300 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
                  <Gift className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>Sawer Hadiah (Gift) ke Host</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </h3>
                  <p className="text-[11px] text-amber-300 font-medium">
                    Apresiasi & berikan semangat live untuk Host Toko!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGiftDrawerOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total Saweran Terkumpul Mini Banner */}
            <div className="mt-3 px-3 py-2 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-yellow-950/60 border border-amber-500/30 flex items-center justify-between text-xs">
              <span className="text-white/80 font-medium flex items-center gap-1.5">
                <span>Total Saweran Live:</span>
                <strong className="text-amber-400 font-black">{formatRupiah(totalGiftsValue)}</strong>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                Respon Cepat Host ⚡
              </span>
            </div>

            {/* Grid Hadiah Virtual (Gifts) */}
            <div className="flex-1 overflow-y-auto py-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5 pr-1">
              {LIVE_GIFTS.map((gift) => (
                <div
                  key={gift.id}
                  onClick={() => handleSendGift(gift)}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-amber-950/40 border border-white/10 hover:border-amber-400/80 active:scale-95 transition-all flex flex-col items-center justify-between text-center cursor-pointer group shadow-sm hover:shadow-amber-500/10"
                >
                  <div className="text-3xl sm:text-4xl my-1 group-hover:scale-125 transition-transform duration-200">
                    {gift.icon}
                  </div>
                  <h4 className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">
                    {gift.name}
                  </h4>
                  <p className="text-[10px] text-white/60 mb-2 line-clamp-1">
                    {gift.description}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendGift(gift);
                    }}
                    className="w-full py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-xs font-black shadow-md active:scale-90 transition-all flex items-center justify-center gap-1"
                  >
                    <span>Kirim</span>
                    <span>{formatRupiah(gift.price)}</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Footer Notice */}
            <div className="pt-2 border-t border-white/10 text-center text-[10px] text-white/60">
              Setiap gift langsung dirayakan dengan animasi layar & direspon otomatis oleh host toko.
            </div>
          </div>
        )}

        {/* ================= MODAL PROMPT GABUNG INTERAKSI LIVE VIDEO ================= */}
        {isGuestVideoPromptOpen && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-emerald-400/50 p-5 shadow-2xl text-white text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                <Video className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-black text-white">
                  Bincang Live Video dengan Host Toko
                </h3>
                <p className="text-xs text-white/70 mt-1 leading-relaxed">
                  Gabung siaran langsung menggunakan kamera perangkat Anda untuk tanya jawab seputar produk atau konsultasi belanja dengan host.
                </p>
              </div>

              {/* Fitur Interaksi */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-left space-y-1.5 text-xs text-white/80">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span>Kamera & suara Anda akan tampil di layar bersama Host.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span>Bisa matikan mic atau kamera kapan saja.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span>Mendukung kamera depan & belakang ponsel.</span>
                </div>
              </div>

              {/* Pesan Error Jika Izin Ditolak */}
              {guestVideoError && (
                <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-semibold text-left">
                  ⚠️ {guestVideoError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsGuestVideoPromptOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleStartGuestVideo}
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Mulai Live Video</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
