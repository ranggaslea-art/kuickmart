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

export function getSplashStorageKey(slug?: string): string {
  const clean = (slug || 'default').toLowerCase().trim();
  return `${STORAGE_KEY_PREFIX}${clean}`;
}

export function loadSplashScreenConfig(slug?: string): SplashScreenConfig {
  if (typeof window === 'undefined') return DEFAULT_SPLASH_SCREEN_CONFIG;

  try {
    const key = getSplashStorageKey(slug);
    const saved = localStorage.getItem(key) || localStorage.getItem(getSplashStorageKey('default'));
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrasikan logo lama ke logo resmi 3D 750x500px jika masih pakai svg lama
      const logoUrl =
        !parsed.logoUrl || parsed.logoUrl === '/lapakoke-logo-3d.svg'
          ? '/assets/aistudio/logo_lapakoke_403ac6ed.png'
          : parsed.logoUrl;

      // Jika user belum atur noBackground atau ingin logo_only, utamakan logo_only
      const styleMode = parsed.styleMode === 'classic' ? 'classic' : (parsed.styleMode || 'logo_only');
      const noBackground = parsed.noBackground !== undefined ? parsed.noBackground : (styleMode === 'logo_only');

      return {
        ...DEFAULT_SPLASH_SCREEN_CONFIG,
        ...parsed,
        logoUrl,
        styleMode,
        noBackground,
        imageWidth: parsed.imageWidth || 750,
        imageHeight: parsed.imageHeight || 500,
        theme: parsed.theme || (noBackground ? 'transparent' : 'shopee_orange'),
      };
    }
  } catch (e) {
    console.warn('Gagal memuat splash screen config:', e);
  }

  return DEFAULT_SPLASH_SCREEN_CONFIG;
}

export function saveSplashScreenConfig(config: SplashScreenConfig, slug?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getSplashStorageKey(slug);
    localStorage.setItem(key, JSON.stringify(config));
    // Simpan juga ke key default jika sedang di domain utama
    if (!slug || slug === 'default' || slug === 'lapakoke' || slug === 'lapakoke.com') {
      localStorage.setItem(getSplashStorageKey('default'), JSON.stringify(config));
    }
    window.dispatchEvent(new CustomEvent(SPLASH_CONFIG_UPDATED_EVENT, { detail: config }));
  } catch (e) {
    console.warn('Gagal menyimpan splash screen config:', e);
  }
}

export function resetSplashScreenConfig(slug?: string): SplashScreenConfig {
  if (typeof window === 'undefined') return DEFAULT_SPLASH_SCREEN_CONFIG;

  try {
    const key = getSplashStorageKey(slug);
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent(SPLASH_CONFIG_UPDATED_EVENT, { detail: DEFAULT_SPLASH_SCREEN_CONFIG }));
  } catch (e) {}

  return DEFAULT_SPLASH_SCREEN_CONFIG;
}

export function triggerManualSplashScreen(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TRIGGER_SPLASH_SCREEN_EVENT));
}
