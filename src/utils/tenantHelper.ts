import { StoreTenantIdentity, DokuSettings, BrandHeaderFooterConfig, Store } from '../types';

export const STORAGE_ACTIVE_TENANT_KEY = 'active_store_tenant_slug';
export const STORAGE_TENANT_PREFIX = 'store_tenant_identity_';

/**
 * Domain Resmi Berwenang:
 * Sesuai aturan sistem, HANYA domain toko-online.online yang dapat menambahkan subdomain.
 * Di luar domain toko-online.online (domain lain maupun subdomain toko) tidak bisa menambahkan subdomain lagi.
 */
export const ROOT_AUTHORITY_DOMAIN = 'toko-online.online';
export const ALLOWED_ROOT_DOMAINS = ['toko-online.online', 'www.toko-online.online'];
export const ALLOWED_SUBDOMAIN_MODULE_DOMAINS = [
  'kuickmart.ranggaslea.workers.dev',
  'toko-online.online',
  'www.toko-online.online',
];
export const SIMULATE_FOREIGN_DOMAIN_KEY = 'toko_online_simulate_foreign_domain';
export const SIMULATED_DOMAIN_NAME_KEY = 'toko_online_simulated_domain_name';

export interface SubdomainModuleAccessResult {
  allowed: boolean;
  currentDomain: string;
  allowedDomains: string[];
  reason?: string;
  isSimulated?: boolean;
}

/**
 * Aturan Akses Modul Info Subdomain:
 * HANYA bisa diakses oleh domain kuickmart.ranggaslea.workers.dev dan domain toko-online.online.
 * Domain lain maupun subdomain cabang toko DILARANG mengakses modul info subdomain ini.
 */
export function canAccessSubdomainModule(customHost?: string): SubdomainModuleAccessResult {
  if (typeof window === 'undefined') {
    return {
      allowed: true,
      currentDomain: ROOT_AUTHORITY_DOMAIN,
      allowedDomains: ALLOWED_SUBDOMAIN_MODULE_DOMAINS,
    };
  }

  // Cek simulasi pengujian domain via sessionStorage
  const isSimulatedForeign = sessionStorage.getItem(SIMULATE_FOREIGN_DOMAIN_KEY) === 'true';
  const simulatedDomain = (sessionStorage.getItem(SIMULATED_DOMAIN_NAME_KEY) || 'toko-eksternal.com').toLowerCase().trim();

  if (isSimulatedForeign) {
    const isSimAllowed =
      simulatedDomain === 'kuickmart.ranggaslea.workers.dev' ||
      simulatedDomain === 'toko-online.online' ||
      simulatedDomain === 'www.toko-online.online';

    if (!isSimAllowed) {
      return {
        allowed: false,
        currentDomain: simulatedDomain,
        allowedDomains: ALLOWED_SUBDOMAIN_MODULE_DOMAINS,
        isSimulated: true,
        reason: `Akses Ditolak: Domain '${simulatedDomain}' tidak diizinkan. Modul info subdomain hanya bisa diakses oleh domain kuickmart.ranggaslea.workers.dev dan domain toko-online.online.`,
      };
    }
  }

  const hostname = (customHost || window.location.hostname || '').toLowerCase().trim();

  // 1. Cek kecocokan langsung dengan domain yang berhak
  if (
    hostname === 'kuickmart.ranggaslea.workers.dev' ||
    hostname === 'toko-online.online' ||
    hostname === 'www.toko-online.online'
  ) {
    return {
      allowed: true,
      currentDomain: hostname,
      allowedDomains: ALLOWED_SUBDOMAIN_MODULE_DOMAINS,
    };
  }

  // 2. Subdomain dari toko-online.online (misal: berkah-mart.toko-online.online)
  if (hostname.endsWith(`.${ROOT_AUTHORITY_DOMAIN}`) && hostname !== `www.${ROOT_AUTHORITY_DOMAIN}`) {
    return {
      allowed: false,
      currentDomain: hostname,
      allowedDomains: ALLOWED_SUBDOMAIN_MODULE_DOMAINS,
      reason: `Akses Ditolak: Anda saat ini berada di subdomain toko '${hostname}'. Modul info subdomain hanya bisa diakses oleh domain kuickmart.ranggaslea.workers.dev dan domain toko-online.online.`,
    };
  }

  // 3. Lingkungan Dev / Cloud Run Sandbox
  const isDevOrPreview =
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.includes('run.app') ||
    hostname.includes('webcontainer');

  if (isDevOrPreview) {
    const urlParams = new URLSearchParams(window.location.search);
    const paramStore = urlParams.get('store');

    // Jika sedang mengakses ?store=nama-toko (bukan root), simulasikan pembatasan subdomain
    if (paramStore && paramStore !== 'default' && paramStore !== 'toko-online' && paramStore !== 'toko-online.online') {
      return {
        allowed: false,
        currentDomain: `${paramStore}.${ROOT_AUTHORITY_DOMAIN}`,
        allowedDomains: ALLOWED_SUBDOMAIN_MODULE_DOMAINS,
        reason: `Akses Ditolak: Anda sedang aktif di subdomain toko '${paramStore}'. Modul info subdomain hanya bisa diakses oleh domain kuickmart.ranggaslea.workers.dev dan domain toko-online.online.`,
      };
    }

    return {
      allowed: true,
      currentDomain: `${hostname} (Dev Mode Otoritas)`,
      allowedDomains: ALLOWED_SUBDOMAIN_MODULE_DOMAINS,
    };
  }

  // 4. Domain Luar Lainnya
  return {
    allowed: false,
    currentDomain: hostname,
    allowedDomains: ALLOWED_SUBDOMAIN_MODULE_DOMAINS,
    reason: `Akses Ditolak: Domain '${hostname}' tidak memiliki izin. Modul info subdomain hanya bisa diakses oleh domain kuickmart.ranggaslea.workers.dev dan domain toko-online.online.`,
  };
}

export interface SubdomainPolicyResult {
  allowed: boolean;
  isRootDomain: boolean;
  currentHostname: string;
  rootDomain: string;
  reason?: string;
  isSimulated?: boolean;
}

/**
 * Memeriksa apakah akses saat ini berada di domain root resmi toko-online.online
 */
export function isRootDomain(customHost?: string): boolean {
  if (typeof window === 'undefined') return true;

  // Cek apakah ada simulasi domain luar untuk pengujian
  if (sessionStorage.getItem(SIMULATE_FOREIGN_DOMAIN_KEY) === 'true') {
    return false;
  }

  const hostname = (customHost || window.location.hostname || '').toLowerCase().trim();

  // Root domain asli
  if (hostname === ROOT_AUTHORITY_DOMAIN || hostname === `www.${ROOT_AUTHORITY_DOMAIN}`) {
    return true;
  }

  // Jika berada di environment dev/preview (localhost, 127.0.0.1, *.run.app, webcontainer)
  const isDevOrPreview =
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.includes('run.app') ||
    hostname.includes('webcontainer');

  if (isDevOrPreview) {
    const urlParams = new URLSearchParams(window.location.search);
    const paramStore = urlParams.get('store');
    // Jika tidak ada ?store atau ?store mengarah ke root, anggap root di dev
    if (!paramStore || paramStore === 'default' || paramStore === 'toko-online' || paramStore === 'toko-online.online') {
      return true;
    }
  }

  return false;
}

/**
 * Aturan Otoritas Subdomain:
 * HANYA domain toko-online.online yang berhak dan bisa menambahkan subdomain baru.
 * Subdomain yang sudah ada atau domain di luar toko-online.online DILARANG menambahkan subdomain.
 */
export function canAddSubdomain(customHost?: string): SubdomainPolicyResult {
  if (typeof window === 'undefined') {
    return {
      allowed: true,
      isRootDomain: true,
      currentHostname: ROOT_AUTHORITY_DOMAIN,
      rootDomain: ROOT_AUTHORITY_DOMAIN,
    };
  }

  // Cek simulasi pengujian domain luar via sessionStorage
  const isSimulatedForeign = sessionStorage.getItem(SIMULATE_FOREIGN_DOMAIN_KEY) === 'true';
  const simulatedDomain = sessionStorage.getItem(SIMULATED_DOMAIN_NAME_KEY) || 'toko-eksternal.com';

  if (isSimulatedForeign) {
    return {
      allowed: false,
      isRootDomain: false,
      currentHostname: simulatedDomain,
      rootDomain: ROOT_AUTHORITY_DOMAIN,
      isSimulated: true,
      reason: `Akses Ditolak: Domain '${simulatedDomain}' berada di luar domain resmi ${ROOT_AUTHORITY_DOMAIN}. Penambahan subdomain hanya dapat dilakukan melalui domain utama ${ROOT_AUTHORITY_DOMAIN}.`,
    };
  }

  const hostname = (customHost || window.location.hostname || '').toLowerCase().trim();
  const isDevOrPreview =
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.includes('run.app') ||
    hostname.includes('webcontainer');

  // 1. Domain Utama Asli (toko-online.online atau www.toko-online.online)
  if (hostname === ROOT_AUTHORITY_DOMAIN || hostname === `www.${ROOT_AUTHORITY_DOMAIN}`) {
    return {
      allowed: true,
      isRootDomain: true,
      currentHostname: hostname,
      rootDomain: ROOT_AUTHORITY_DOMAIN,
    };
  }

  // 2. Subdomain dari toko-online.online (misal: berkah.toko-online.online)
  if (hostname.endsWith(`.${ROOT_AUTHORITY_DOMAIN}`) && hostname !== `www.${ROOT_AUTHORITY_DOMAIN}`) {
    return {
      allowed: false,
      isRootDomain: false,
      currentHostname: hostname,
      rootDomain: ROOT_AUTHORITY_DOMAIN,
      reason: `Akses Ditolak: Anda saat ini berada di subdomain '${hostname}'. Subdomain toko tidak diizinkan menambahkan subdomain baru. Hanya domain utama ${ROOT_AUTHORITY_DOMAIN} yang berwenang.`,
    };
  }

  // 3. Lingkungan Dev / Cloud Run Sandbox
  if (isDevOrPreview) {
    const urlParams = new URLSearchParams(window.location.search);
    const paramStore = urlParams.get('store');

    // Jika sedang mengakses ?store=nama-toko (bukan root), simulasikan pembatasan subdomain
    if (paramStore && paramStore !== 'default' && paramStore !== 'toko-online' && paramStore !== 'toko-online.online') {
      return {
        allowed: false,
        isRootDomain: false,
        currentHostname: `${paramStore}.${ROOT_AUTHORITY_DOMAIN} (Subdomain Toko)`,
        rootDomain: ROOT_AUTHORITY_DOMAIN,
        reason: `Akses Ditolak: Anda sedang aktif di subdomain toko '${paramStore}'. Penambahan subdomain baru hanya dapat dilakukan melalui domain utama ${ROOT_AUTHORITY_DOMAIN}.`,
      };
    }

    return {
      allowed: true,
      isRootDomain: true,
      currentHostname: `${hostname} (Dev Mode toko-online.online)`,
      rootDomain: ROOT_AUTHORITY_DOMAIN,
    };
  }

  // 4. Domain Luar / Eksternal
  return {
    allowed: false,
    isRootDomain: false,
    currentHostname: hostname,
    rootDomain: ROOT_AUTHORITY_DOMAIN,
    reason: `Akses Ditolak: Domain '${hostname}' berada di luar domain resmi ${ROOT_AUTHORITY_DOMAIN}. Sesuai aturan sistem, penambahan subdomain toko HANYA diizinkan melalui domain ${ROOT_AUTHORITY_DOMAIN}.`,
  };
}

export const DEFAULT_DOKU_SETTINGS: DokuSettings = {
  isEnabled: true,
  environment: 'sandbox',
  clientId: 'BRN-0241-1788726490929',
  secretKey: '',
  merchantName: 'toko-online.online',
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
  if (!slug || slug.trim() === '' || slug === 'default' || slug === 'kuickmart' || slug === 'toko-online' || slug === 'toko-online.online') {
    return 'toko-online.online';
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

  // 2. Cek Subdomain dari hostname (misal: tokoberkah.toko-online.online atau berkah-mart.domainanda.com)
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
 * Memeriksa apakah toko saat ini adalah toko default/utama (toko-online.online)
 */
export function isDefaultStore(slug?: string): boolean {
  const effectiveSlug = (slug || getStoreSlugFromUrl() || 'default').toLowerCase().trim();
  return effectiveSlug === 'default' || effectiveSlug === 'kuickmart' || effectiveSlug === 'toko-online' || effectiveSlug === 'toko-online.online' || effectiveSlug === '';
}

/**
 * Menghasilkan kunci localStorage yang terisolasi per tenant/toko.
 * - Toko default tetap menggunakan kunci asli agar data lama toko-online.online tidak hilang.
 * - Toko baru (seperti Toko Alda) otomatis menggunakan kunci unik `${baseKey}__tenant_${slug}`.
 */
export function getTenantStorageKey(baseKey: string, slug?: string): string {
  const effectiveSlug = (slug || getStoreSlugFromUrl() || 'default').toLowerCase().trim();
  if (isDefaultStore(effectiveSlug)) {
    return baseKey;
  }
  return `${baseKey}__tenant_${effectiveSlug}`;
}

/**
 * Muat data dari localStorage dengan isolasi multi-tenant:
 * Jika toko baru dan belum ada data tersimpan, otomatis mengembalikan defaultIfNewStore (misalnya array kosong []).
 */
export function getTenantInitialData<T>(
  baseKey: string,
  defaultIfMainStore: T,
  defaultIfNewStore: T,
  slug?: string
): T {
  if (typeof window === 'undefined') return isDefaultStore(slug) ? defaultIfMainStore : defaultIfNewStore;
  const effectiveSlug = (slug || getStoreSlugFromUrl() || 'default').toLowerCase().trim();
  const storageKey = getTenantStorageKey(baseKey, effectiveSlug);
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.warn(`[TenantStorage] Gagal baca ${storageKey}:`, err);
  }
  return isDefaultStore(effectiveSlug) ? defaultIfMainStore : defaultIfNewStore;
}

/**
 * Simpan data ke localStorage dengan isolasi multi-tenant.
 */
export function setTenantData<T>(baseKey: string, value: T, slug?: string): void {
  if (typeof window === 'undefined') return;
  const effectiveSlug = (slug || getStoreSlugFromUrl() || 'default').toLowerCase().trim();
  const storageKey = getTenantStorageKey(baseKey, effectiveSlug);
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (err) {
    console.warn(`[TenantStorage] Gagal simpan ${storageKey}:`, err);
  }
}

/**
 * Menghasilkan object Store untuk tenant aktif
 */
export function getTenantStore(slug?: string, tenantConfig?: StoreTenantIdentity): Store {
  const effectiveSlug = (slug || getStoreSlugFromUrl() || 'default').toLowerCase().trim();
  if (isDefaultStore(effectiveSlug)) {
    return {
      id: 'store_1',
      name: 'toko-online.online',
      code: 'TOKO-ONLINE',
      address: 'Jl. Jendral Sudirman No. 18, Menteng',
      city: 'Jakarta Pusat',
      distanceKm: 0.8,
      is24Hours: true,
      isOpen: true,
      openHours: '24 Jam Nonstop',
      phone: '021-5551234',
      readyForPickup: true,
      readyForDelivery: true,
      deliveryFee: 6000,
      minOrder: 15000,
    };
  }
  const tenant = tenantConfig || loadStoreTenantConfig(effectiveSlug);
  return {
    id: effectiveSlug,
    name: tenant.storeName,
    code: effectiveSlug.toUpperCase(),
    address: tenant.address || 'Alamat Toko',
    city: tenant.city || 'Kota',
    distanceKm: 0.5,
    is24Hours: true,
    isOpen: true,
    openHours: '07:00 - 22:00',
    phone: tenant.phone || tenant.whatsapp || '08123456789',
    readyForPickup: true,
    readyForDelivery: true,
    deliveryFee: 6000,
    minOrder: 10000,
  };
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

  const isDefault = isDefaultStore(effectiveSlug);

  return {
    storeId: effectiveSlug,
    storeSlug: effectiveSlug,
    storeName: isDefault ? 'toko-online.online' : storeName,
    tagline: isDefault 
      ? 'Pusat Belanja Online Hemat, Cepat, dan Terpercaya' 
      : `Pusat Belanja Hemat & Lengkap ${storeName}`,
    ownerName: 'Pengelola Toko',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    address: 'Jl. Pemuda No. 88, Pusat Niaga',
    city: 'Jakarta',
    logoText,
    primaryColor: '#E51A24',
    isActive: true,
    dokuSettings: {
      ...DEFAULT_DOKU_SETTINGS,
      merchantName: isDefault ? 'toko-online.online' : storeName,
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
    const isMainStore = slug === 'default' || slug === 'toko-online' || slug === 'toko-online.online';
    const isExistingTenant = Boolean(localStorage.getItem(`${STORAGE_TENANT_PREFIX}${slug}`));

    // Validasi Aturan Subdomain:
    // Jika mendaftarkan subdomain baru (bukan edit profil root dan bukan tenant yang sudah terdaftar)
    if (!isMainStore && !isExistingTenant) {
      const policy = canAddSubdomain();
      if (!policy.allowed) {
        console.warn('[TenantHelper] Penambahan subdomain diblokir:', policy.reason);
        alert(policy.reason || 'Hanya domain utama toko-online.online yang dapat menambahkan subdomain.');
        return false;
      }
    }

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

    // 4. Sync ke server Express backend dengan menyertakan origin dan hostname
    fetch('/api/tenant/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-hostname': window.location.hostname || ROOT_AUTHORITY_DOMAIN,
      },
      body: JSON.stringify({
        ...updatedConfig,
        _clientHostname: window.location.hostname,
        _isNewSubdomain: !isMainStore && !isExistingTenant,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (errJson.error) {
          console.warn('[TenantHelper] Server menolak registrasi tenant:', errJson.error);
        }
      }
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

export interface RegisteredSubdomain {
  storeId: string;
  storeSlug: string;
  displaySlug: string;
  subdomain: string;
  subdomainUrl: string;
  storeName: string;
  tagline: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  logoUrl?: string;
  logoText?: string;
  primaryColor?: string;
  isActive: boolean;
  disabledReason?: string | null;
  disabledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isRootDomain: boolean;
  dokuEnvironment?: string;
  hasDoku?: boolean;
  qrisEnabled?: boolean;
}

/**
 * Mengambil daftar seluruh subdomain yang terdaftar di toko-online.online
 * Menggabungkan database server Express dan cache localStorage lokal.
 */
export async function fetchRegisteredSubdomains(): Promise<RegisteredSubdomain[]> {
  const mapBySlug: Record<string, RegisteredSubdomain> = {};

  // 1. Ambil dari server Express (/api/tenants)
  try {
    const reqHeaders: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      reqHeaders['x-client-hostname'] = window.location.hostname || '';
      if (sessionStorage.getItem(SIMULATE_FOREIGN_DOMAIN_KEY) === 'true') {
        reqHeaders['x-simulate-domain'] = sessionStorage.getItem(SIMULATED_DOMAIN_NAME_KEY) || 'toko-eksternal.com';
      }
    }

    const res = await fetch('/api/tenants', { headers: reqHeaders });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.tenants)) {
        data.tenants.forEach((t: RegisteredSubdomain) => {
          mapBySlug[t.storeSlug.toLowerCase()] = t;
        });
      }
    }
  } catch (e) {
    console.warn('[TenantHelper] Gagal mengambil daftar tenant dari server:', e);
  }

  // 2. Scan localStorage untuk tenant yang disimpan lokal
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_TENANT_PREFIX)) {
          const slug = key.replace(STORAGE_TENANT_PREFIX, '').toLowerCase();
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const isMain = slug === 'default' || slug === 'toko-online' || slug === 'toko-online.online';
            if (!mapBySlug[slug]) {
              mapBySlug[slug] = {
                storeId: parsed.storeId || slug,
                storeSlug: slug,
                displaySlug: isMain ? 'pusat' : slug,
                subdomain: isMain ? 'toko-online.online' : `${slug}.toko-online.online`,
                subdomainUrl: isMain ? 'https://toko-online.online' : `https://${slug}.toko-online.online`,
                storeName: parsed.storeName || (isMain ? 'toko-online.online (Pusat)' : slug),
                tagline: parsed.tagline || '',
                ownerName: parsed.ownerName || 'Pengelola Toko',
                phone: parsed.phone || parsed.whatsapp || '',
                whatsapp: parsed.whatsapp || parsed.phone || '',
                address: parsed.address || '',
                city: parsed.city || '',
                logoUrl: parsed.logoUrl || '',
                logoText: parsed.logoText || '',
                primaryColor: parsed.primaryColor || '#E51A24',
                isActive: parsed.isActive !== false,
                disabledReason: parsed.disabledReason || null,
                disabledAt: parsed.disabledAt || null,
                createdAt: parsed.createdAt || new Date().toISOString(),
                updatedAt: parsed.updatedAt || new Date().toISOString(),
                isRootDomain: isMain,
                dokuEnvironment: parsed.dokuSettings?.environment || 'sandbox',
                hasDoku: Boolean(parsed.dokuSettings?.clientId),
                qrisEnabled: Boolean(parsed.dokuSettings?.enableQris),
              };
            }
          }
        }
      }
    } catch (err) {
      console.warn('[TenantHelper] Error scanning localStorage tenants:', err);
    }
  }

  // 3. Pastikan Domain Utama default ada
  if (!mapBySlug['default']) {
    mapBySlug['default'] = {
      storeId: 'default',
      storeSlug: 'default',
      displaySlug: 'pusat',
      subdomain: 'toko-online.online',
      subdomainUrl: 'https://toko-online.online',
      storeName: 'toko-online.online (Pusat)',
      tagline: 'Pusat Belanja Online Hemat, Cepat, dan Terpercaya',
      ownerName: 'Administrator',
      phone: '0812-3456-7890',
      whatsapp: '6281234567890',
      address: 'Jl. Pemuda No. 88, Pusat Niaga',
      city: 'Jakarta',
      logoText: 'TO',
      primaryColor: '#E51A24',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isRootDomain: true,
      dokuEnvironment: 'sandbox',
      hasDoku: true,
      qrisEnabled: true,
    };
  }

  const result = Object.values(mapBySlug);
  // Sort: domain utama paling atas, lalu sisanya berdasarkan updatedAt terbaru
  result.sort((a, b) => {
    if (a.isRootDomain) return -1;
    if (b.isRootDomain) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return result;
}

/**
 * Mengubah status aktif / nonaktif suatu subdomain dengan tombol checklist
 */
export async function toggleSubdomainStatus(
  storeSlug: string,
  isActive: boolean,
  reason?: string
): Promise<{ success: boolean; message: string; tenant?: any }> {
  const slug = (storeSlug || '').toLowerCase().trim();
  const isMain = slug === 'default' || slug === 'toko-online' || slug === 'toko-online.online';

  if (isMain && !isActive) {
    return {
      success: false,
      message: 'Domain utama toko-online.online merupakan induk sistem dan tidak dapat dinonaktifkan.',
    };
  }

  try {
    // 1. Kirim request ke backend Express
    const postHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (typeof window !== 'undefined') {
      postHeaders['x-client-hostname'] = window.location.hostname || '';
      if (sessionStorage.getItem(SIMULATE_FOREIGN_DOMAIN_KEY) === 'true') {
        postHeaders['x-simulate-domain'] = sessionStorage.getItem(SIMULATED_DOMAIN_NAME_KEY) || 'toko-eksternal.com';
      }
    }

    const res = await fetch('/api/tenant/toggle-status', {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify({ storeSlug: slug, isActive, reason }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.error || 'Gagal mengubah status subdomain di server.',
      };
    }

    // 2. Perbarui juga di localStorage jika ada
    if (typeof window !== 'undefined') {
      const localKey = `${STORAGE_TENANT_PREFIX}${slug}`;
      const existingRaw = localStorage.getItem(localKey);
      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          parsed.isActive = isActive;
          parsed.updatedAt = new Date().toISOString();
          if (!isActive) {
            parsed.disabledReason = reason || 'Dinonaktifkan oleh administrator toko-online.online';
            parsed.disabledAt = new Date().toISOString();
          } else {
            delete parsed.disabledReason;
            delete parsed.disabledAt;
          }
          localStorage.setItem(localKey, JSON.stringify(parsed));
        } catch (e) {
          console.warn('[TenantHelper] Gagal update status di localStorage:', e);
        }
      }

      // 3. Broadcast Event agar komponen UI tahu status berubah secara instan
      window.dispatchEvent(
        new CustomEvent('subdomain_status_changed', {
          detail: { storeSlug: slug, isActive, reason },
        })
      );
    }

    return {
      success: true,
      message: data.message || `Subdomain '${slug}.toko-online.online' berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
      tenant: data.tenant,
    };
  } catch (err: any) {
    console.error('[TenantHelper] Error toggleSubdomainStatus:', err);
    return {
      success: false,
      message: err.message || 'Terjadi kesalahan jaringan saat mengubah status subdomain.',
    };
  }
}
