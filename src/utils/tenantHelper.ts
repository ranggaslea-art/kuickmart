import { StoreTenantIdentity, DokuSettings, BrandHeaderFooterConfig } from '../types';

export const STORAGE_ACTIVE_TENANT_KEY = 'active_store_tenant_slug';
export const STORAGE_TENANT_PREFIX = 'store_tenant_identity_';

export const DEFAULT_DOKU_SETTINGS: DokuSettings = {
  isEnabled: true,
  environment: 'sandbox',
  clientId: 'BRN-0241-1788726490929',
  secretKey: '',
  merchantName: 'KuickMart Express',
  notificationUrl: '',
  enableQris: true,
  enableBcaVa: true,
  enableMandiriVa: true,
  enableBriVa: true,
  enableBniVa: true,
  enablePermataVa: true,
  updatedAt: new Date().toISOString(),
};

/**
 * Format string slug menjadi Title Case nama toko yang rapi
 * Contoh: "berkah-mart-jaya" -> "Berkah Mart Jaya"
 */
export function formatSlugToStoreName(slug: string): string {
  if (!slug || slug.trim() === '' || slug === 'default') {
    return 'KuickMart Express';
  }
  return slug
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Ambil slug toko dari URL browser:
 * 1. Cek query parameter `?store=namatoko` (sangat berguna untuk testing dan demo langsung)
 * 2. Cek Subdomain `namatoko.domain.com` (dari wildcard Cloudflare)
 * 3. Cek localStorage aktif
 */
export function getStoreSlugFromUrl(): string {
  if (typeof window === 'undefined') return 'default';

  // 1. Cek Query Param (?store=berkah-mart)
  const urlParams = new URLSearchParams(window.location.search);
  const paramStore = urlParams.get('store');
  if (paramStore && paramStore.trim()) {
    return paramStore.trim().toLowerCase();
  }

  // 2. Cek Subdomain dari hostname (misal: tokoberkah.kuickmart.id atau berkah-mart.domainanda.com)
  const hostname = window.location.hostname;
  const isLocalOrPreview =
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.includes('run.app') ||
    hostname.includes('webcontainer');

  if (!isLocalOrPreview) {
    const parts = hostname.split('.');
    // Jika formatnya subdomain.domain.tld (minimal 3 bagian) dan bukan 'www'
    if (parts.length >= 3 && parts[0] !== 'www') {
      return parts[0].toLowerCase();
    }
  }

  // 3. Cek penyimpanan aktif sebelumnya di browser
  const savedSlug = localStorage.getItem(STORAGE_ACTIVE_TENANT_KEY);
  if (savedSlug && savedSlug.trim()) {
    return savedSlug.trim().toLowerCase();
  }

  return 'default';
}

/**
 * Buat template StoreTenantIdentity bawaan untuk toko baru
 */
export function getDefaultStoreTenant(slug?: string): StoreTenantIdentity {
  const effectiveSlug = (slug || getStoreSlugFromUrl() || 'default').toLowerCase();
  const storeName = formatSlugToStoreName(effectiveSlug);

  // Buat 2 huruf inisial untuk logo teks (misal: "Berkah Mart" -> "BM")
  const words = storeName.split(' ').filter(Boolean);
  const logoText = words.length >= 2 
    ? (words[0][0] + words[1][0]).toUpperCase() 
    : storeName.slice(0, 2).toUpperCase();

  const isDefaultKuickmart = effectiveSlug === 'default' || effectiveSlug === 'kuickmart';

  return {
    storeId: effectiveSlug,
    storeSlug: effectiveSlug,
    storeName: isDefaultKuickmart ? 'KuickMart Express' : storeName,
    tagline: isDefaultKuickmart 
      ? 'Minimarket Digital Super Cepat' 
      : `Pusat Belanja Hemat & Lengkap ${storeName}`,
    ownerName: 'Pengelola Toko',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    address: 'Jl. Pemuda No. 88, Pusat Niaga',
    city: 'Jakarta',
    logoText,
    primaryColor: '#E51A24',
    dokuSettings: {
      ...DEFAULT_DOKU_SETTINGS,
      merchantName: isDefaultKuickmart ? 'KuickMart Express' : storeName,
      notificationUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/doku/notification` : '',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Muat profil toko dan pengaturan DOKU
 */
export function loadStoreTenantConfig(slug?: string): StoreTenantIdentity {
  const effectiveSlug = (slug || getStoreSlugFromUrl() || 'default').toLowerCase();
  const defaultTenant = getDefaultStoreTenant(effectiveSlug);

  if (typeof window === 'undefined') return defaultTenant;

  try {
    const saved = localStorage.getItem(`${STORAGE_TENANT_PREFIX}${effectiveSlug}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...defaultTenant,
        ...parsed,
        dokuSettings: {
          ...defaultTenant.dokuSettings,
          ...(parsed.dokuSettings || {}),
        },
      };
    }
  } catch (err) {
    console.warn('[TenantHelper] Gagal memuat data toko dari localStorage:', err);
  }

  return defaultTenant;
}

/**
 * Simpan profil toko dan pengaturan DOKU:
 * 1. Simpan ke localStorage
 * 2. Simpan aktif slug
 * 3. Broadcast CustomEvent untuk reaktifitas UI
 * 4. Sync ke server Express API
 */
export async function saveStoreTenantConfig(config: StoreTenantIdentity): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const slug = config.storeSlug.toLowerCase();
    const updatedConfig: StoreTenantIdentity = {
      ...config,
      storeSlug: slug,
      updatedAt: new Date().toISOString(),
      dokuSettings: {
        ...config.dokuSettings,
        merchantName: config.dokuSettings.merchantName || config.storeName,
        notificationUrl: config.dokuSettings.notificationUrl || `${window.location.origin}/api/doku/notification`,
        updatedAt: new Date().toISOString(),
      },
    };

    // 1. LocalStorage
    localStorage.setItem(`${STORAGE_TENANT_PREFIX}${slug}`, JSON.stringify(updatedConfig));
    localStorage.setItem(STORAGE_ACTIVE_TENANT_KEY, slug);

    // 2. Broadcast event
    window.dispatchEvent(new CustomEvent('store_tenant_updated', { detail: updatedConfig }));

    // 3. Update title document
    if (typeof document !== 'undefined') {
      document.title = `${updatedConfig.storeName} - Belanja & Kasir Online`;
    }

    // 4. Sync ke server Express backend
    fetch('/api/tenant/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedConfig),
    }).catch((apiErr) => {
      console.warn('[TenantHelper] Gagal sync ke server backend:', apiErr);
    });

    return true;
  } catch (err) {
    console.error('[TenantHelper] Error saving store tenant config:', err);
    return false;
  }
}

/**
 * Sinkronisasikan BrandHeaderFooterConfig dengan StoreTenantIdentity
 */
export function syncBrandConfigFromTenant(
  tenant: StoreTenantIdentity,
  prevBrand: BrandHeaderFooterConfig
): BrandHeaderFooterConfig {
  const parts = tenant.storeName.trim().split(/\s+/);
  let namePart1 = tenant.storeName;
  let namePart2 = '';

  if (parts.length >= 2) {
    namePart1 = parts[0];
    namePart2 = parts.slice(1).join(' ');
  }

  return {
    ...prevBrand,
    brandNamePart1: namePart1,
    brandNamePart2: namePart2,
    brandLogoText: tenant.logoText || tenant.storeName.slice(0, 2).toUpperCase(),
    brandLogoImageUrl: tenant.logoUrl || prevBrand.brandLogoImageUrl,
    tagline: tenant.tagline || prevBrand.tagline,
    footerBrandName: tenant.storeName.toUpperCase(),
    footerDescription: `Platform belanja & kasir online resmi ${tenant.storeName}. Melayani pengiriman cepat dan pembayaran instan QRIS / Virtual Account DOKU.`,
    copyrightText: `© ${new Date().getFullYear()} ${tenant.storeName}. All rights reserved.`,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Zero-touch auto-provisioning:
 * Mengambil atau secara otomatis membuat profil toko berdasarkan subdomain / slug URL
 */
export async function autoProvisionStoreTenant(slug?: string): Promise<StoreTenantIdentity> {
  const effectiveSlug = (slug || getStoreSlugFromUrl() || 'default').toLowerCase();
  
  // 1. Muat dari localStorage lokal terlebih dahulu
  const localConfig = loadStoreTenantConfig(effectiveSlug);

  if (typeof window === 'undefined') {
    return localConfig;
  }

  // 2. Hubungi server backend (/api/tenant/config)
  try {
    const res = await fetch(`/api/tenant/config?slug=${encodeURIComponent(effectiveSlug)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.storeSlug) {
        // Jika server punya data, gabungkan tanpa menghilangkan secretKey lokal jika di server disamarkan
        const merged: StoreTenantIdentity = {
          ...localConfig,
          ...data,
          dokuSettings: {
            ...localConfig.dokuSettings,
            ...data.dokuSettings,
            secretKey: localConfig.dokuSettings?.secretKey || data.dokuSettings?.secretKey || '',
          },
        };
        localStorage.setItem(`${STORAGE_TENANT_PREFIX}${effectiveSlug}`, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.warn('[TenantHelper] Auto-provision backend check fallback to local:', err);
  }

  // 3. Jika belum terdaftar di backend, auto-provisioning profil baru ke server
  saveStoreTenantConfig(localConfig).catch(() => {});
  return localConfig;
}
