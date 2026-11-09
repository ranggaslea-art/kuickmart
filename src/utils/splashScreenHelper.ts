/**
 * splashScreenHelper.ts
 * Utilitas manajemen konfigurasi & status Splash Screen LapakOke.com
 */

export interface SplashScreenConfig {
  enabled: boolean;
  logoUrl: string;
  appName: string;
  tagline: string;
  versionText: string;
  theme: 'transparent' | 'shopee_orange' | 'white' | 'gradient' | 'dark' | 'glass';
  durationMs: number; // 1000 to 6000 ms
  triggerMode: 'every_reload' | 'session_once';
  showProgressBar: boolean;
  showSubdomainInfo: boolean;
  showSkipButton: boolean;
  pulseAnimation: boolean;
  // Fitur Model Logo Transparan (Cukup logo aslinya tanpa background full)
  styleMode?: 'logo_only' | 'shopee' | 'classic';
  noBackground?: boolean;
  imageWidth?: number; // 750 px
  imageHeight?: number; // 500 px
}

export const DEFAULT_SPLASH_SCREEN_CONFIG: SplashScreenConfig = {
  enabled: true,
  logoUrl: '/assets/aistudio/logo_lapakoke_403ac6ed.png',
  appName: 'LapakOke.com',
  tagline: '',
  versionText: '',
  theme: 'transparent', // Tanpa background penuh sesuai permintaan user
  durationMs: 2000,
  triggerMode: 'every_reload', // Setiap reload halaman index
  showProgressBar: false,
  showSubdomainInfo: false,
  showSkipButton: false, // Tidak butuh tombol skip jika hanya logo transparan melayang sekejap
  pulseAnimation: true,
  styleMode: 'logo_only',
  noBackground: true,
  imageWidth: 750,
  imageHeight: 500,
};

export const SPLASH_PRESET_LOGOS = [
  {
    id: 'lapakoke_shopee_3d',
    name: 'Logo Resmi 3D LapakOke (750 x 500 px)',
    url: '/assets/aistudio/logo_lapakoke_403ac6ed.png',
    description: 'Logo resmi 3D Glossy Lapakoke.com keranjang oranye & biru ukuran standar 750 x 500 pixel transparan',
    width: 750,
    height: 500,
  },
  {
    id: 'lapakoke_3d',
    name: 'Logo 3D Keranjang Belanja SVG',
    url: '/lapakoke-logo-3d.svg',
    description: 'Logo keranjang belanja alternatif dengan cincin gradasi',
    width: 750,
    height: 500,
  },
  {
    id: 'pwa_round',
    name: 'Logo PWA App Icon 512px',
    url: '/pwa-512x512.png',
    description: 'Ikon aplikasi resmi untuk perangkat Android, iOS, dan PWA',
    width: 512,
    height: 512,
  },
  {
    id: 'store_badge',
    name: 'Logo Toko Klasik',
    url: '/logo.png',
    description: 'Ikon logo alternatif bawaan template',
    width: 500,
    height: 500,
  },
];

export const SPLASH_THEME_OPTIONS = [
  {
    id: 'transparent',
    name: 'Tanpa Background (Logo Melayang - Rekomendasi)',
    description: 'Hanya logo asli transparan yang muncul melayang tanpa latar belakang warna penuh',
    bgClass: 'bg-transparent text-slate-800',
    accentColor: '#FF5722',
  },
  {
    id: 'shopee_orange',
    name: 'Oranye Shopee Khas',
    description: 'Warna oranye cerah & energik identitas marketplace Shopee & LapakOke',
    bgClass: 'bg-gradient-to-b from-[#FF5722] via-[#FF5023] to-[#E64A19] text-white',
    accentColor: '#FF5722',
  },
  {
    id: 'white',
    name: 'Putih Bersih Minimalis Shopee',
    description: 'Latar belakang putih bersih khas aplikasi modern dengan logo di tengah',
    bgClass: 'bg-white text-slate-800',
    accentColor: '#FF5722',
  },
  {
    id: 'gradient',
    name: 'Gradasi Biru-Oranye LapakOke',
    description: 'Warna identitas khas LapakOke dengan perpaduan biru modern dan oranye hangat',
    bgClass: 'bg-gradient-to-br from-blue-900 via-slate-900 to-amber-950 text-white',
    accentColor: '#FF6600',
  },
  {
    id: 'dark',
    name: 'Biru Navy Gelap Modern',
    description: 'Nuansa gelap malam yang sejuk, fokus tinggi, dan nyaman di mata',
    bgClass: 'bg-slate-950 text-white',
    accentColor: '#00A2FF',
  },
  {
    id: 'glass',
    name: 'Glassmorphism Blur Mewah',
    description: 'Efek kaca frosted glass semi transparan berlatar gradasi dinamis',
    bgClass: 'bg-slate-900/95 backdrop-blur-2xl text-white',
    accentColor: '#FF8800',
  },
];

const STORAGE_KEY_PREFIX = 'lapakoke_splash_config_';
export const SPLASH_CONFIG_UPDATED_EVENT = 'lapakoke_splash_config_updated';
export const TRIGGER_SPLASH_SCREEN_EVENT = 'lapakoke_trigger_splash_screen';

/**
 * Cek apakah sebuah slug merupakan domain utama LapakOke
 */
export function isMainDomain(slug?: string): boolean {
  if (!slug) return true;
  const clean = slug.toLowerCase().trim();
  return (
    clean === 'default' ||
    clean === 'lapakoke' ||
    clean === 'lapakoke.com' ||
    clean === 'toko-online' ||
    clean === 'toko-online.online' ||
    clean === 'www.lapakoke.com'
  );
}

export function getSplashStorageKey(slug?: string): string {
  const clean = (slug || 'default').toLowerCase().trim();
  return `${STORAGE_KEY_PREFIX}${clean}`;
}

/**
 * Konfigurasi bawaan khusus untuk Subdomain Toko Cabang:
 * Disesuaikan otomatis dengan identitas & nama cabang masing-masing,
 * TIDAK MENGIKUTI logo atau judul LapakOke domain utama!
 */
export function getDefaultSubdomainSplashConfig(
  slug: string,
  storeName?: string,
  storeLogoUrl?: string
): SplashScreenConfig {
  const cleanSlug = slug.toLowerCase().trim();
  const displayName = storeName || cleanSlug.toUpperCase();
  // Gunakan logo khusus subdomain jika ada, atau icon PWA toko
  const logo = storeLogoUrl || '/pwa-512x512.png';

  return {
    enabled: true,
    logoUrl: logo,
    appName: displayName,
    tagline: '',
    versionText: '',
    theme: 'transparent',
    durationMs: 2000,
    triggerMode: 'every_reload',
    showProgressBar: false,
    showSubdomainInfo: false,
    showSkipButton: false,
    pulseAnimation: true,
    styleMode: 'logo_only',
    noBackground: true,
    imageWidth: 750,
    imageHeight: 500,
  };
}

/**
 * Muat konfigurasi Splash Screen untuk domain utama atau subdomain tertentu.
 * ATURAN ISOLASI:
 * Subdomain TIDAK BOLEH meminjam/menimpa config milik 'default' (domain utama)!
 */
export function loadSplashScreenConfig(
  slug?: string,
  storeName?: string,
  storeLogoUrl?: string
): SplashScreenConfig {
  const cleanSlug = (slug || 'default').toLowerCase().trim();
  const isMain = isMainDomain(cleanSlug);

  if (typeof window === 'undefined') {
    return isMain
      ? DEFAULT_SPLASH_SCREEN_CONFIG
      : getDefaultSubdomainSplashConfig(cleanSlug, storeName, storeLogoUrl);
  }

  try {
    const key = getSplashStorageKey(cleanSlug);
    // HANYA ambil key spesifik milik slug ini.
    // DILARANG keras fallback ke 'default' jika sedang di subdomain cabang!
    const saved = localStorage.getItem(key);

    if (saved) {
      const parsed = JSON.parse(saved);
      const styleMode = parsed.styleMode === 'classic' ? 'classic' : (parsed.styleMode || 'logo_only');
      const noBackground = parsed.noBackground !== undefined ? parsed.noBackground : (styleMode === 'logo_only');

      return {
        ...(isMain
          ? DEFAULT_SPLASH_SCREEN_CONFIG
          : getDefaultSubdomainSplashConfig(cleanSlug, storeName, storeLogoUrl)),
        ...parsed,
        logoUrl: parsed.logoUrl || (isMain ? DEFAULT_SPLASH_SCREEN_CONFIG.logoUrl : (storeLogoUrl || '/pwa-512x512.png')),
        appName: parsed.appName || (isMain ? 'LapakOke.com' : (storeName || cleanSlug.toUpperCase())),
        styleMode,
        noBackground,
        imageWidth: parsed.imageWidth || 750,
        imageHeight: parsed.imageHeight || 500,
        theme: parsed.theme || (noBackground ? 'transparent' : 'shopee_orange'),
      };
    }
  } catch (e) {
    console.warn(`[SplashScreen] Gagal memuat splash config untuk '${cleanSlug}':`, e);
  }

  // Jika belum pernah disimpan di localStorage:
  return isMain
    ? DEFAULT_SPLASH_SCREEN_CONFIG
    : getDefaultSubdomainSplashConfig(cleanSlug, storeName, storeLogoUrl);
}

/**
 * Simpan konfigurasi Splash Screen secara independen per subdomain.
 * Otomatis sync ke backend Express API & MySQL agar sinkron di semua media (PC, HP, Tablet).
 */
export function saveSplashScreenConfig(config: SplashScreenConfig, slug?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const cleanSlug = (slug || 'default').toLowerCase().trim();
    const isMain = isMainDomain(cleanSlug);
    const key = getSplashStorageKey(cleanSlug);

    // Simpan ke storage lokal khusus subdomain ini
    localStorage.setItem(key, JSON.stringify(config));

    // Simpan juga ke key default HANYA jika memang sedang di domain utama
    if (isMain) {
      localStorage.setItem(getSplashStorageKey('default'), JSON.stringify(config));
    }

    // Broadcast event dengan menyertakan slug agar tab/komponen tahu pemiliknya
    window.dispatchEvent(
      new CustomEvent(SPLASH_CONFIG_UPDATED_EVENT, {
        detail: { config, slug: cleanSlug },
      })
    );

    // Kirim sinkronisasi ke server Database agar tersimpan di MySQL & multi-device
    fetch('/api/splash-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-slug': cleanSlug,
      },
      body: JSON.stringify({ slug: cleanSlug, config }),
    }).catch((err) => {
      console.warn(`[SplashScreen] Gagal sinkronisasi ke server database untuk '${cleanSlug}':`, err);
    });
  } catch (e) {
    console.warn('Gagal menyimpan splash screen config:', e);
  }
}

/**
 * Kembalikan pengaturan ke desain awal khusus domain/subdomain terkait
 */
export function resetSplashScreenConfig(
  slug?: string,
  storeName?: string,
  storeLogoUrl?: string
): SplashScreenConfig {
  const cleanSlug = (slug || 'default').toLowerCase().trim();
  const isMain = isMainDomain(cleanSlug);
  const def = isMain
    ? DEFAULT_SPLASH_SCREEN_CONFIG
    : getDefaultSubdomainSplashConfig(cleanSlug, storeName, storeLogoUrl);

  if (typeof window === 'undefined') return def;

  try {
    const key = getSplashStorageKey(cleanSlug);
    localStorage.removeItem(key);
    if (isMain) {
      localStorage.removeItem(getSplashStorageKey('default'));
    }

    window.dispatchEvent(
      new CustomEvent(SPLASH_CONFIG_UPDATED_EVENT, {
        detail: { config: def, slug: cleanSlug },
      })
    );

    // Sync reset ke server
    fetch('/api/splash-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-slug': cleanSlug,
      },
      body: JSON.stringify({ slug: cleanSlug, config: def }),
    }).catch(() => {});
  } catch (e) {}

  return def;
}

export function triggerManualSplashScreen(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TRIGGER_SPLASH_SCREEN_EVENT));
}
