import { Product } from '../types';

export interface LiveStreamGiftItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  description: string;
  category: 'popular' | 'vip' | 'special';
  badgeColor: string;
  animationType: 'rose' | 'coffee' | 'rocket' | 'crown' | 'diamond' | 'cake';
}

export const LIVE_GIFTS: LiveStreamGiftItem[] = [
  {
    id: 'gift_rose',
    name: 'Mawar Harum',
    icon: '🌹',
    price: 1000,
    description: 'Apresiasi manis & kasih sayang untuk host',
    category: 'popular',
    badgeColor: '#f43f5e',
    animationType: 'rose',
  },
  {
    id: 'gift_coffee',
    name: 'Kopi Semangat',
    icon: '☕',
    price: 5000,
    description: 'Biar host makin bertenaga spill sembako',
    category: 'popular',
    badgeColor: '#d97706',
    animationType: 'coffee',
  },
  {
    id: 'gift_icecream',
    name: 'Es Krim Segar',
    icon: '🍦',
    price: 10000,
    description: 'Manisnya diskon sembako murah meriah',
    category: 'popular',
    badgeColor: '#ec4899',
    animationType: 'rose',
  },
  {
    id: 'gift_cake',
    name: 'Kue Belanja Berkah',
    icon: '🎂',
    price: 25000,
    description: 'Rayakan belanja hemat bersama pelanggan',
    category: 'special',
    badgeColor: '#8b5cf6',
    animationType: 'cake',
  },
  {
    id: 'gift_rocket',
    name: 'Roket Belanja Kilat',
    icon: '🚀',
    price: 50000,
    description: 'Pengiriman sembako instan secepat kilat',
    category: 'special',
    badgeColor: '#0ea5e9',
    animationType: 'rocket',
  },
  {
    id: 'gift_crown',
    name: 'Mahkota Sultan Toko',
    icon: '👑',
    price: 100000,
    description: 'Gelar pembeli terbaik siaran langsung',
    category: 'vip',
    badgeColor: '#eab308',
    animationType: 'crown',
  },
  {
    id: 'gift_diamond',
    name: 'Berlian Barokah',
    icon: '💎',
    price: 250000,
    description: 'Dukungan tertinggi & doa berkah untuk toko',
    category: 'vip',
    badgeColor: '#06b6d4',
    animationType: 'diamond',
  },
];

export interface LiveStreamComment {
  id: string;
  senderName: string;
  senderId?: string;
  senderAvatar?: string;
  message: string;
  timestamp: string;
  isHost?: boolean;
  isBuyer?: boolean;
  isGift?: boolean;
  giftInfo?: {
    id: string;
    giftId: string;
    giftName: string;
    giftIcon: string;
    giftPrice: number;
  };
  isGuestVideo?: boolean;
}

export interface LiveStreamConfig {
  enabled: boolean;
  title: string;
  streamerName: string;
  streamerAvatar?: string;
  viewersCount: number;
  likesCount: number;
  pinnedProductId?: string; // Produk utama yang sedang di-spill host
  pinnedProductIds?: string[]; // Daftar multi-item produk yang dipromosikan di live
  streamType: 'preset_video' | 'custom_url' | 'webcam';
  videoUrl: string;
  promoVoucherCode?: string;
  promoVoucherText?: string;
  autoChatEnabled: boolean;
  storeSlug?: string;
  totalGiftsValue?: number;
  lastUpdated?: string;
}

// Preset video streaming e-commerce live shopping (video lokal MP4 berkualitas tinggi & jernih)
export const PRESET_STREAM_VIDEOS = [
  {
    id: 'store_host_1',
    name: 'Host Toko Sembako & Minimarket (Interaktif)',
    description: 'Host sedang mendemonstrasikan produk kebutuhan harian, sembako, dan snack segar.',
    videoUrl: '/videos/live_host_sembako.mp4',
    poster: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
    fallbackVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
  {
    id: 'store_host_2',
    name: 'Review Snack & Minuman Segar Beli 2 Gratis 1',
    description: 'Spill produk aneka camilan, biskuit, dan minuman segar siap kirim hari ini.',
    videoUrl: '/videos/live_host_snack.mp4',
    poster: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=600&q=80',
    fallbackVideoUrl: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
  },
  {
    id: 'store_host_3',
    name: 'Packing & Kirim Sembako Murah',
    description: 'Aktivitas pengemasan cepat dan promo kilat sembako minyak goreng & beras.',
    videoUrl: '/videos/live_host_kasir.mp4',
    poster: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=600&q=80',
    fallbackVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
];

export const SAMPLE_LIVE_COMMENTS = [
  'Halo kak, minyak goreng 2L masih diskon?',
  'Kak spill nomor 1 yang di keranjang kuning dong!',
  'Udah checkout 3 box snack kak, minta bonus yaa ❤️',
  'Pengiriman ke daerah Jakarta Pusat bisa instan hari ini gak kak?',
  'Keren banget promonya, langsung CO sekarang 🔥',
  'Kak beras 5kg ada potongan voucher gak?',
  'Spill promo beli 2 gratis 1 nya dong kak!',
  'Udah bayar via QRIS kak, tolong packing yang aman yaa',
  'Barangnya fresh semua kan kak? Mau pesan buah juga',
  'Gas checkout sebelum kehabisan guys mantap harganya!',
  'Bisa kirim sameday kan ya kak?',
  'Kak voucher LIVE diskon 20% nya masih bisa dipakai kan?',
];

export const BUYER_NAMES = [
  'Rina Wulandari',
  'Budi Santoso',
  'Siti Nurhaliza',
  'Dewi Anggraini',
  'Ahmad Fadillah',
  'Putri Maharani',
  'Eko Prasetyo',
  'Maya Indah',
  'Hendra Wijaya',
  'Fitri Handayani',
  'Bayu Pratama',
  'Nadia Safitri',
];

export const LIVE_STREAM_STORAGE_PREFIX = 'lapakoke_livestream_config_';
export const LIVE_STREAM_UPDATED_EVENT = 'lapakoke_livestream_config_updated';
export const TRIGGER_LIVE_STREAM_EVENT = 'lapakoke_trigger_livestream';

export function getDefaultLiveStreamConfig(
  slug: string = 'default',
  storeName: string = 'LapakOke Official',
  storeLogoUrl?: string,
  sampleProducts?: Product[]
): LiveStreamConfig {
  const initialProducts = sampleProducts && sampleProducts.length > 0 ? sampleProducts.slice(0, 4) : [];
  const firstProductId = initialProducts.length > 0 ? initialProducts[0].id : undefined;
  const initialProductIds = initialProducts.map((p) => p.id);

  return {
    enabled: true,
    title: `🔥 LIVE HEBOH: Banting Harga Sembako & Snack Spesial ${storeName}! Diskon s/d 50%`,
    streamerName: `Host Live • ${storeName}`,
    streamerAvatar: storeLogoUrl || '/pwa-192x192.png',
    viewersCount: 1450,
    likesCount: 28400,
    pinnedProductId: firstProductId,
    pinnedProductIds: initialProductIds,
    streamType: 'preset_video',
    videoUrl: PRESET_STREAM_VIDEOS[0].videoUrl,
    promoVoucherCode: 'LIVEHEMAT20',
    promoVoucherText: 'Klaim Diskon 20% Khusus Penonton Live Streaming!',
    autoChatEnabled: true,
    storeSlug: slug,
    lastUpdated: new Date().toISOString(),
  };
}

export function loadLiveStreamConfig(
  slug: string = 'default',
  storeName: string = 'LapakOke Official',
  storeLogoUrl?: string,
  sampleProducts?: Product[]
): LiveStreamConfig {
  const normSlug = slug.toLowerCase().trim() || 'default';
  const key = `${LIVE_STREAM_STORAGE_PREFIX}${normSlug}`;
  const def = getDefaultLiveStreamConfig(normSlug, storeName, storeLogoUrl, sampleProducts);

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        const resolvedPinnedIds = Array.isArray(parsed.pinnedProductIds) && parsed.pinnedProductIds.length > 0
          ? parsed.pinnedProductIds
          : (parsed.pinnedProductId ? [parsed.pinnedProductId] : def.pinnedProductIds || []);

        const validStreamType = parsed.streamType === 'webcam' ? 'preset_video' : (parsed.streamType || 'preset_video');
        let validVideoUrl = parsed.videoUrl && parsed.videoUrl.trim() && parsed.streamType !== 'webcam'
          ? parsed.videoUrl
          : PRESET_STREAM_VIDEOS[0].videoUrl;

        // Auto-migrate legacy 403 / blocked URLs
        if (
          validVideoUrl.includes('assets.mixkit.co') ||
          validVideoUrl.includes('gtv-videos-bucket') ||
          validVideoUrl.includes('commondatastorage.googleapis.com')
        ) {
          validVideoUrl = PRESET_STREAM_VIDEOS[0].videoUrl;
        }

        return {
          ...def,
          ...parsed,
          streamType: validStreamType,
          videoUrl: validVideoUrl,
          pinnedProductIds: resolvedPinnedIds,
          pinnedProductId: parsed.pinnedProductId || resolvedPinnedIds[0] || def.pinnedProductId,
        };
      }
    } catch (e) {
      console.warn('Gagal membaca liveStreamConfig dari localStorage:', e);
    }
  }

  return def;
}

export function saveLiveStreamConfig(config: LiveStreamConfig, slug: string = 'default') {
  const normSlug = slug.toLowerCase().trim() || 'default';
  const key = `${LIVE_STREAM_STORAGE_PREFIX}${normSlug}`;
  const updated = {
    ...config,
    storeSlug: normSlug,
    lastUpdated: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal menyimpan liveStreamConfig ke localStorage:', e);
    }

    // Trigger event ke seluruh komponen aktif
    try {
      window.dispatchEvent(
        new CustomEvent(LIVE_STREAM_UPDATED_EVENT, {
          detail: { slug: normSlug, config: updated },
        })
      );
    } catch {}

    // Sinkronisasi ke backend server API
    fetch('/api/live-stream-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: normSlug, config: updated }),
    }).catch(() => {});
  }

  return updated;
}

export function triggerOpenLiveStream(mode: 'fullscreen' | 'pip' | 'medium' = 'fullscreen') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(TRIGGER_LIVE_STREAM_EVENT, {
        detail: { mode },
      })
    );
  }
}

export async function sendLiveGiftApi(
  slug: string,
  gift: LiveStreamGiftItem,
  senderName: string,
  senderId: string,
  storeName: string
) {
  try {
    const res = await fetch('/api/live-stream-gifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: slug.toLowerCase().trim(),
        gift: {
          giftId: gift.id,
          giftName: gift.name,
          giftIcon: gift.icon,
          giftPrice: gift.price,
          storeName,
          senderName,
          senderId,
          timestamp: Date.now(),
        },
      }),
    });
    return await res.json();
  } catch (e) {
    console.warn('Gagal POST gift ke server API:', e);
    return null;
  }
}

export async function sendLiveLikeApi(slug: string, delta: number = 1) {
  try {
    const res = await fetch('/api/live-stream-likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: slug.toLowerCase().trim(),
        delta,
      }),
    });
    return await res.json();
  } catch (e) {
    return null;
  }
}
