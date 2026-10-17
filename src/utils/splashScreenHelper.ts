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
  theme: 'gradient' | 'white' | 'dark' | 'glass';
  durationMs: number; // 1000 to 6000 ms
  triggerMode: 'every_reload' | 'session_once';
  showProgressBar: boolean;
  showSubdomainInfo: boolean;
  showSkipButton: boolean;
  pulseAnimation: boolean;
}

export const DEFAULT_SPLASH_SCREEN_CONFIG: SplashScreenConfig = {
  enabled: true,
  logoUrl: '/lapakoke-logo-3d.svg',
  appName: 'LapakOke.com',
  tagline: 'Pusat Belanja & Minimarket Online Hemat, Cepat & Terpercaya',
  versionText: 'v2.4.0 • PWA Super App',
  theme: 'gradient',
  durationMs: 2400,
  triggerMode: 'every_reload', // Setiap loading pertama halaman index sesuai permintaan user
  showProgressBar: true,
  showSubdomainInfo: true,
  showSkipButton: true,
  pulseAnimation: true,
};

export const SPLASH_PRESET_LOGOS = [
  {
    id: 'lapakoke_3d',
    name: 'Logo Resmi 3D Glossy LapakOke (Bawaan)',
    url: '/lapakoke-logo-3d.svg',
    description: 'Logo 3D keranjang belanja dengan cincin gradasi oranye & biru sesuai desain asli',
  },
  {
    id: 'pwa_round',
    name: 'Logo PWA App Icon 512px',
    url: '/pwa-512x512.png',
    description: 'Ikon aplikasi resmi untuk perangkat Android, iOS, dan PWA',
  },
  {
    id: 'store_badge',
    name: 'Logo Toko Klasik',
    url: '/logo.png',
    description: 'Ikon logo alternatif bawaan template',
  },
];

export const SPLASH_THEME_OPTIONS = [
  {
    id: 'gradient',
    name: 'Gradasi Oranye & Biru LapakOke',
    description: 'Warna identitas khas LapakOke dengan perpaduan biru modern dan oranye hangat',
    bgClass: 'bg-gradient-to-br from-blue-900 via-slate-900 to-amber-950 text-white',
    accentColor: '#FF6600',
  },
  {
    id: 'white',
    name: 'Putih Bersih & Elegan',
    description: 'Tampilan minimalis bersih dengan bayangan lembut dan aksen cerah',
    bgClass: 'bg-white text-slate-800',
    accentColor: '#0066FF',
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
      return {
        ...DEFAULT_SPLASH_SCREEN_CONFIG,
        ...parsed,
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
