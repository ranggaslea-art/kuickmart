import { StoreTenantIdentity, DokuSettings, BrandHeaderFooterConfig, Store } from '../types';
import { INITIAL_BRAND_CONFIG } from '../data/mockData';

export const STORAGE_ACTIVE_TENANT_KEY = 'active_store_tenant_slug';
export const STORAGE_TENANT_PREFIX = 'store_tenant_identity_';

/**
 * Domain Resmi Berwenang:
 * Sesuai aturan sistem, HANYA domain lapakoke.com (dan alias toko-online.online) yang dapat menambahkan subdomain.
 * Di luar domain resmi (domain lain maupun subdomain toko) tidak bisa menambahkan subdomain lagi.
 */
export const ROOT_AUTHORITY_DOMAIN = 'lapakoke.com';
export const ALLOWED_ROOT_DOMAINS = [
  'lapakoke.com',
  'www.lapakoke.com',
  'toko-online.online',
  'www.toko-online.online',
  'toko-online.com',
  'www.toko-online.com',
];
export const ALLOWED_SUBDOMAIN_MODULE_DOMAINS = [
  'lapakoke.com',
  'www.lapakoke.com',
  'kuickmart.ranggaslea.workers.dev',
  'toko-online.online',
  'www.toko-online.online',
  'toko-online.com',
  'www.toko-online.com',
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
 * HANYA bisa diakses oleh domain utama lapakoke.com.
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
      ALLOWED_SUBDOMAIN_MODULE_DOMAINS.includes(simulatedDomain);

    if (!isSimAllowed) {
      return {
        allowed: false,
        currentDomain: simulatedDomain,
        allowedDomains: ALLOWED_SUBDOMAIN_MODULE_DOMAINS,
        isSimulated: true,
        reason: `Akses Ditolak: Domain '${simulatedDomain}' tidak diizinkan. Modul info subdomain hanya bisa diakses oleh domain resmi ${ROOT_AUTHORITY_DOMAIN}.`,
      };
    }
  }

  const hostname = (customHost || window.location.hostname || '').toLowerCase().trim();
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const paramStore = urlParams.get('store');

  // Jika sedang aktif di parameter store subdomain (misal: ?store=mrberkah)
  if (paramStore && !isDefaultStore(paramStore)) {
    return {
      allowed: false,
      currentDomain: `${paramStore}.${ROOT_AUTHORITY_DOMAIN}`,
      allowedDomains: ALLOWED_SUBDOMAIN_MODULE_DOMAINS,
      reason: `Akses Ditolak: Anda sedang aktif di subdomain toko '${paramStore}'. Modul info subdomain hanya bisa diakses oleh domain utama ${ROOT_AUTHORITY_DOMAIN}.`,
    };
  }

  // 1. Cek kecocokan langsung dengan domain yang berhak
  if (ALLOWED_SUBDOMAIN_MODULE_DOMAINS.includes(hostname)) {
    return {
      allowed: true,
      currentDomain: hostname,
      allowedDomains: ALLOWED_SUBDOMAIN_MODULE_DOMAINS,
    };
  }

  // 2. Subdomain toko (misal: berkah-mart.lapakoke.com)
  if (
    (hostname.endsWith(`.${ROOT_AUTHORITY_DOMAIN}`) && hostname !== `www.${ROOT_AUTHORITY_DOMAIN}`) ||
    (hostname.endsWith('.toko-online.online') && hostname !== 'www.toko-online.online')
  ) {
    return {
      allowed: false,
      currentDomain: hostname,
      allowedDomains: ALLOWED_SUBDOMAIN_MODULE_DOMAINS,
      reason: `Akses Ditolak: Anda saat ini berada di subdomain toko '${hostname}'. Modul info subdomain hanya bisa diakses oleh domain resmi ${ROOT_AUTHORITY_DOMAIN}.`,
    };
  }

  // 3. Lingkungan Dev / Cloud Run Sandbox
  const isDevOrPreview =
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.includes('run.app') ||
    hostname.includes('webcontainer') ||
    hostname.includes('googleusercontent.com') ||
    hostname.includes('workers.dev');

  if (isDevOrPreview) {
    const urlParams = new URLSearchParams(window.location.search);
    const paramStore = urlParams.get('store');

    // Jika sedang mengakses ?store=nama-toko (bukan root), simulasikan pembatasan subdomain
    if (paramStore && normalizeTenantSlug(paramStore) !== 'default') {
      const cleanSlug = normalizeTenantSlug(paramStore);
      return {
        allowed: false,
        currentDomain: `${cleanSlug}.${ROOT_AUTHORITY_DOMAIN}`,
        allowedDomains: ALLOWED_SUBDOMAIN_MODULE_DOMAINS,
        reason: `Akses Ditolak: Anda sedang aktif di subdomain toko '${cleanSlug}'. Modul info subdomain hanya bisa diakses oleh domain resmi ${ROOT_AUTHORITY_DOMAIN}.`,
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
    reason: `Akses Ditolak: Domain '${hostname}' tidak memiliki izin. Modul info subdomain hanya bisa diakses oleh domain resmi ${ROOT_AUTHORITY_DOMAIN}.`,
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
 * Normalisasi format slug subdomain toko agar selalu bersih, konsisten dan akurat.
 * Menghilangkan protokol, port, domain toko-online.online, prefix store-, dll.
 * Contoh:
 * - "berkah-jaya.toko-online.online" -> "berkah-jaya"
 * - "store-berkah-jaya" -> "berkah-jaya"
 * - "https://tokoalda.toko-online.online" -> "tokoalda"
 * - "toko-online.online" / "default" / "pusat" -> "default"
 */
export function normalizeTenantSlug(slug?: string | null): string {
  if (!slug) return 'default';
  let clean = slug.toLowerCase().trim();
  clean = clean.replace(/^https?:\/\//, '');
  clean = clean.replace(/:\d+$/, '');
  clean = clean.replace(/\.lapakoke\.com$/, '');
  clean = clean.replace(/\.toko-online\.online$/, '');
  clean = clean.replace(/\.toko-online\.com$/, '');
  clean = clean.replace(/\.ranggaslea\.workers\.dev$/, '');
  clean = clean.replace(/^store-/, '');
  clean = clean.split('/')[0].split('?')[0].trim();
  if (
    !clean ||
    clean === 'default' ||
    clean === 'lapakoke' ||
    clean === 'lapakoke.com' ||
    clean === 'www.lapakoke.com' ||
    clean === 'toko-online' ||
    clean === 'toko-online.online' ||
    clean === 'www.toko-online.online' ||
    clean === 'toko-online.com' ||
    clean === 'www.toko-online.com' ||
    clean === 'pusat' ||
    clean === 'to-sdm01' ||
    clean === 'to-snp02' ||
    clean === 'to-tbt03' ||
    clean === 'str_01' ||
    clean === 'str_02' ||
    clean === 'str_03' ||
    clean === 'store_1'
  ) {
    return 'default';
  }
  return clean;
}

/**
 * Memeriksa apakah akses saat ini berada di domain root resmi lapakoke.com / toko-online.online
 */
export function isRootDomain(customHost?: string, targetSlug?: string): boolean {
  if (typeof window === 'undefined') return true;

  // Jika targetSlug secara spesifik diberikan dan bukan default, ini PASTI subdomain cabang
  if (targetSlug !== undefined) {
    const normTarget = normalizeTenantSlug(targetSlug);
    if (normTarget !== 'default') {
      return false;
    }
  }

  // Cek apakah ada simulasi domain luar untuk pengujian
  if (sessionStorage.getItem(SIMULATE_FOREIGN_DOMAIN_KEY) === 'true') {
    return false;
  }

  const hostname = (customHost || window.location.hostname || '').toLowerCase().trim();

  // Root domain asli atau domain alias yang diizinkan
  if (ALLOWED_ROOT_DOMAINS.includes(hostname) || hostname === ROOT_AUTHORITY_DOMAIN || hostname === `www.${ROOT_AUTHORITY_DOMAIN}`) {
    return true;
  }

  // Jika hostname berakhiran subdomain toko dan bukan www
  if (
    (hostname.endsWith(`.${ROOT_AUTHORITY_DOMAIN}`) && hostname !== `www.${ROOT_AUTHORITY_DOMAIN}`) ||
    (hostname.endsWith('.toko-online.online') && hostname !== 'www.toko-online.online')
  ) {
    return false;
  }

  // Jika berada di environment dev/preview/sandbox
  const isDevOrPreview =
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.includes('run.app') ||
    hostname.includes('webcontainer') ||
    hostname.includes('googleusercontent.com') ||
    hostname.includes('workers.dev');

  if (isDevOrPreview) {
    const urlParams = new URLSearchParams(window.location.search);
    const paramStore = urlParams.get('store');
    if (paramStore) {
      const norm = normalizeTenantSlug(paramStore);
      if (norm !== 'default') {
        return false;
      }
    }
    // Jika tidak ada ?store dan tidak ada targetSlug khusus, anggap root di dev
    return true;
  }

  return false;
}

/**
 * Aturan Otoritas Subdomain:
 * HANYA domain lapakoke.com yang berhak dan bisa menambahkan subdomain baru.
 * Subdomain yang sudah ada atau domain di luar lapakoke.com DILARANG menambahkan subdomain.
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

  // 1. Domain Utama Asli (lapakoke.com atau www.lapakoke.com atau domain alias yang diizinkan)
  if (ALLOWED_ROOT_DOMAINS.includes(hostname) || hostname === ROOT_AUTHORITY_DOMAIN || hostname === `www.${ROOT_AUTHORITY_DOMAIN}`) {
    return {
      allowed: true,
      isRootDomain: true,
      currentHostname: hostname,
      rootDomain: ROOT_AUTHORITY_DOMAIN,
    };
  }

  // 2. Subdomain toko (misal: berkah.lapakoke.com)
  if (
    (hostname.endsWith(`.${ROOT_AUTHORITY_DOMAIN}`) && hostname !== `www.${ROOT_AUTHORITY_DOMAIN}`) ||
    (hostname.endsWith('.toko-online.online') && hostname !== 'www.toko-online.online')
  ) {
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
    if (paramStore && paramStore !== 'default' && paramStore !== 'lapakoke' && paramStore !== 'lapakoke.com' && paramStore !== 'toko-online' && paramStore !== 'toko-online.online') {
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
      currentHostname: `${hostname} (Dev Mode ${ROOT_AUTHORITY_DOMAIN})`,
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
  merchantName: 'lapakoke.com',
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
  if (
    !slug ||
    slug.trim() === '' ||
    slug === 'default' ||
    slug === 'lapakoke' ||
    slug === 'lapakoke.com' ||
    slug === 'toko-online' ||
    slug === 'toko-online.online'
  ) {
    return 'LapakOke';
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
 * 2. Cek Subdomain `namatoko.domain.com` (dari wildcard DNS)
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

  // 2. Cek Subdomain dari hostname (misal: tokoalda.lapakoke.com atau tokoberkah.toko-online.online)
  const hostname = window.location.hostname;
  const isLocalOrPreview =
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.includes('run.app') ||
    hostname.includes('webcontainer') ||
    hostname.includes('googleusercontent.com') ||
    hostname.includes('workers.dev');

  if (!isLocalOrPreview) {
    // Root domain resmi lapakoke.com, alias toko-online.online, atau worker dev root
    if (
      ALLOWED_ROOT_DOMAINS.includes(hostname) ||
      hostname === ROOT_AUTHORITY_DOMAIN ||
      hostname === `www.${ROOT_AUTHORITY_DOMAIN}` ||
      hostname === 'kuickmart.ranggaslea.workers.dev'
    ) {
      return 'default';
    }
    const parts = hostname.split('.');
    // Jika formatnya subdomain.domain.tld (minimal 3 bagian) dan bukan 'www'
    if (parts.length >= 3 && parts[0] !== 'www') {
      return parts[0].toLowerCase();
    }
  }

  // 3. Cek penyimpanan aktif sebelumnya di browser (aman untuk Firefox private browsing)
  try {
    const savedSlug = localStorage.getItem(STORAGE_ACTIVE_TENANT_KEY);
    if (savedSlug && savedSlug.trim()) {
      return savedSlug.trim().toLowerCase();
    }
  } catch {}

  return 'default';
}

/**
 * Memeriksa apakah toko saat ini adalah toko default/utama (toko-online.online)
 */
export function isDefaultStore(slug?: string): boolean {
  const effectiveSlug = normalizeTenantSlug(slug || getStoreSlugFromUrl());
  return effectiveSlug === 'default';
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
  const effectiveSlug = normalizeTenantSlug(slug || getStoreSlugFromUrl());
  const tenant = tenantConfig || loadStoreTenantConfig(effectiveSlug);
  const isDefault = isDefaultStore(effectiveSlug);
  const storePhone = tenant.whatsapp || tenant.phone || '0812-3456-7890';

  if (isDefault) {
    return {
      id: 'store_1',
      name: tenant.storeName || 'toko-online.online',
      code: 'TOKO-ONLINE',
      address: tenant.address || 'Jl. Jendral Sudirman No. 18, Menteng',
      city: tenant.city || 'Jakarta Pusat',
      distanceKm: 0.8,
      is24Hours: true,
      isOpen: true,
      openHours: '24 Jam Nonstop',
      phone: storePhone,
      whatsapp: storePhone,
      readyForPickup: true,
      readyForDelivery: true,
      deliveryFee: 6000,
      minOrder: 15000,
    };
  }

  return {
    id: effectiveSlug,
    name: tenant.storeName || formatSlugToStoreName(effectiveSlug),
    code: effectiveSlug.toUpperCase(),
    address: tenant.address || 'Alamat Toko',
    city: tenant.city || 'Kota',
    distanceKm: 0.5,
    is24Hours: true,
    isOpen: true,
    openHours: '07:00 - 22:00',
    phone: storePhone,
    whatsapp: storePhone,
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
  
  // Periksa apakah ada profil bawaan di daftar subdomain resmi
  const builtin = BUILTIN_REGISTERED_SUBDOMAINS.find(
    (b) => b.storeSlug.toLowerCase() === effectiveSlug || b.storeId.toLowerCase() === effectiveSlug
  );

  const isDefault = isDefaultStore(effectiveSlug);
  const storeName = builtin?.storeName || (isDefault ? 'toko-online.online' : formatSlugToStoreName(effectiveSlug));

  // Buat 2 huruf inisial untuk logo teks (misal: "Berkah Mart" -> "BM")
  const logoText = builtin?.logoText || (() => {
    const words = storeName.split(' ').filter(Boolean);
    return words.length >= 2 
      ? (words[0][0] + words[1][0]).toUpperCase() 
      : storeName.slice(0, 2).toUpperCase();
  })();

  return {
    storeId: effectiveSlug,
    storeSlug: effectiveSlug,
    storeName: storeName,
    tagline: builtin?.tagline || (isDefault 
      ? 'Pusat Belanja Online Hemat, Cepat, dan Terpercaya' 
      : `Pusat Belanja Hemat & Lengkap ${storeName}`),
    ownerName: builtin?.ownerName || 'Pengelola Toko',
    phone: builtin?.phone || '0812-3456-7890',
    whatsapp: builtin?.whatsapp || '6281234567890',
    address: builtin?.address || 'Jl. Pemuda No. 88, Pusat Niaga',
    city: builtin?.city || 'Jakarta',
    logoUrl: builtin?.logoUrl || (isDefault ? '/logo.png' : ''),
    logoText,
    primaryColor: builtin?.primaryColor || '#E51A24',
    isActive: builtin ? builtin.isActive : true,
    dokuSettings: {
      ...DEFAULT_DOKU_SETTINGS,
      merchantName: storeName,
      notificationUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/doku/notification` : '',
    },
    createdAt: builtin?.createdAt || new Date().toISOString(),
    updatedAt: builtin?.updatedAt || new Date().toISOString(),
  };
}

/**
 * Muat profil toko dan pengaturan DOKU
 */
export function loadStoreTenantConfig(slug?: string): StoreTenantIdentity {
  const effectiveSlug = normalizeTenantSlug(slug || getStoreSlugFromUrl());
  const defaultTenant = getDefaultStoreTenant(effectiveSlug);

  if (typeof window === 'undefined') return defaultTenant;

  try {
    let saved = localStorage.getItem(`${STORAGE_TENANT_PREFIX}${effectiveSlug}`);
    if (!saved && effectiveSlug === 'default') {
      saved = localStorage.getItem(`${STORAGE_TENANT_PREFIX}default`) ||
              localStorage.getItem(`${STORAGE_TENANT_PREFIX}toko-online`) ||
              localStorage.getItem(`${STORAGE_TENANT_PREFIX}toko-online.online`);
    }
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
    const isBuiltinTenant = BUILTIN_REGISTERED_SUBDOMAINS.some(
      (b) => b.storeSlug.toLowerCase() === slug || b.storeId.toLowerCase() === slug
    );

    // Validasi Aturan Subdomain:
    // Jika mendaftarkan subdomain baru yang belum pernah terdaftar sama sekali
    if (!isMainStore && !isExistingTenant && !isBuiltinTenant) {
      const policy = canAddSubdomain();
      if (!policy.allowed) {
        console.warn('[TenantHelper] Penambahan subdomain baru diblokir oleh kebijakan otoritas:', policy.reason);
        // Catatan: Jangan panggil window.alert di sini karena fungsi ini dipanggil di level background / sync data
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
    try {
      localStorage.setItem(`${STORAGE_TENANT_PREFIX}${slug}`, JSON.stringify(updatedConfig));
      localStorage.setItem(STORAGE_ACTIVE_TENANT_KEY, slug);
    } catch {}

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
        _isNewSubdomain: !isMainStore && !isExistingTenant && !isBuiltinTenant,
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

    // 5. Sync ke Database MySQL agar langsung terbaca di hardware online lain
    import('./tenantCloudSync').then(({ saveTenantDataToCloud }) => {
      saveTenantDataToCloud('identity', updatedConfig, slug);
      const brand = syncBrandConfigFromTenant(updatedConfig, INITIAL_BRAND_CONFIG);
      saveTenantDataToCloud('brand', brand, slug);
    }).catch(() => {});

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
  let namePart1 = prevBrand.brandNamePart1 || tenant.storeName;
  let namePart2 = prevBrand.brandNamePart2 || '';

  if (!prevBrand.brandNamePart1 || prevBrand.brandNamePart1 === 'KuickMart') {
    if (parts.length >= 2) {
      namePart1 = parts[0];
      namePart2 = parts.slice(1).join(' ');
    } else {
      namePart1 = tenant.storeName;
      namePart2 = '';
    }
  }

  const effectiveLogoUrl = tenant.logoUrl && tenant.logoUrl.trim().length > 0
    ? tenant.logoUrl.trim()
    : (prevBrand.brandLogoImageUrl || '/logo.png');

  const effectiveLogoText = tenant.logoText && tenant.logoText.trim().length > 0
    ? tenant.logoText.trim()
    : (prevBrand.brandLogoText || 'TO');

  return {
    ...prevBrand,
    brandNamePart1: namePart1,
    brandNamePart2: namePart2,
    brandLogoText: effectiveLogoText,
    brandLogoImageUrl: effectiveLogoUrl,
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

  // 2. Hubungi Cloud Database MySQL DAHULU karena Cloud adalah sumber kebenaran lintas-perangkat online!
  try {
    const { fetchTenantDataFromCloud } = await import('./tenantCloudSync');
    const cloudTenant = await fetchTenantDataFromCloud<StoreTenantIdentity>('identity', effectiveSlug);
    if (cloudTenant && cloudTenant.storeSlug) {
      const merged: StoreTenantIdentity = {
        ...localConfig,
        ...cloudTenant,
        dokuSettings: {
          ...localConfig.dokuSettings,
          ...cloudTenant.dokuSettings,
          secretKey: localConfig.dokuSettings?.secretKey || cloudTenant.dokuSettings?.secretKey || '',
        },
      };
      try {
        localStorage.setItem(`${STORAGE_TENANT_PREFIX}${effectiveSlug}`, JSON.stringify(merged));
      } catch {}
      // Sync ke backend express agar server cache selalu sinkron
      fetch('/api/tenant/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-hostname': window.location.hostname || ROOT_AUTHORITY_DOMAIN,
        },
        body: JSON.stringify(merged),
      }).catch(() => {});
      return merged;
    }
  } catch (err) {
    console.warn('[TenantHelper] Auto-provision cloud sync check:', err);
  }

  // 3. Fallback: Hubungi server backend (/api/tenant/config) jika Cloud belum punya record khusus
  try {
    const res = await fetch(`/api/tenant/config?slug=${encodeURIComponent(effectiveSlug)}`);
    if (res.ok) {
      const data = await res.json();
      const serverTenant = data?.tenant || (data?.storeSlug ? data : null);
      if (serverTenant && serverTenant.storeSlug) {
        // Jika server punya data, gabungkan tanpa menghilangkan secretKey lokal jika di server disamarkan
        const merged: StoreTenantIdentity = {
          ...localConfig,
          ...serverTenant,
          dokuSettings: {
            ...localConfig.dokuSettings,
            ...serverTenant.dokuSettings,
            secretKey: localConfig.dokuSettings?.secretKey || serverTenant.dokuSettings?.secretKey || '',
          },
        };
        try {
          localStorage.setItem(`${STORAGE_TENANT_PREFIX}${effectiveSlug}`, JSON.stringify(merged));
        } catch {}
        return merged;
      }
    }
  } catch (err) {
    console.warn('[TenantHelper] Auto-provision backend check fallback to local:', err);
  }

  // 4. Simpan konfigurasi lokal ke localStorage
  try {
    localStorage.setItem(`${STORAGE_TENANT_PREFIX}${effectiveSlug}`, JSON.stringify(localConfig));
  } catch {}
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

export const BUILTIN_REGISTERED_SUBDOMAINS: RegisteredSubdomain[] = [
  {
    storeId: 'default',
    storeSlug: 'default',
    displaySlug: 'pusat',
    subdomain: 'lapakoke.com',
    subdomainUrl: 'https://lapakoke.com',
    storeName: 'LapakOke Pusat',
    tagline: 'Pusat Belanja Online Hemat & Cepat',
    ownerName: 'Administrator',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    address: 'Jl. Pemuda No. 88, Pusat Niaga',
    city: 'Jakarta',
    logoUrl: '/logo.png',
    logoText: 'LO',
    primaryColor: '#E51A24',
    isActive: true,
    disabledReason: null,
    disabledAt: null,
    createdAt: '2026-09-10T20:10:36.949Z',
    updatedAt: '2026-09-20T08:45:41.552Z',
    isRootDomain: true,
    dokuEnvironment: 'sandbox',
    hasDoku: true,
    qrisEnabled: true,
  },
  {
    storeId: 'mrberkah',
    storeSlug: 'mrberkah',
    displaySlug: 'mrberkah',
    subdomain: 'mrberkah.lapakoke.com',
    subdomainUrl: 'https://mrberkah.lapakoke.com',
    storeName: 'Mr Berkah Mart',
    tagline: 'Pilihan Belanja Berkah dan Hemat',
    ownerName: 'Pengelola Mr Berkah',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    address: 'Pusat Niaga Mr Berkah',
    city: 'Pangandaran',
    logoUrl: '',
    logoText: 'MB',
    primaryColor: '#059669',
    isActive: true,
    disabledReason: null,
    disabledAt: null,
    createdAt: '2026-09-20T09:00:00.000Z',
    updatedAt: '2026-09-20T09:00:00.000Z',
    isRootDomain: false,
    dokuEnvironment: 'sandbox',
    hasDoku: true,
    qrisEnabled: true,
  },
  {
    storeId: 'berkah-mart',
    storeSlug: 'berkah-mart',
    displaySlug: 'berkah-mart',
    subdomain: 'berkah-mart.lapakoke.com',
    subdomainUrl: 'https://berkah-mart.lapakoke.com',
    storeName: 'Berkah Mart',
    tagline: 'Kebutuhan Harian Lengkap & Terjangkau',
    ownerName: 'Pengelola Toko',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    address: 'Cabang Berkah Mart',
    city: 'Pangandaran',
    logoUrl: '',
    logoText: 'BM',
    primaryColor: '#E51A24',
    isActive: true,
    disabledReason: null,
    disabledAt: null,
    createdAt: '2026-09-19T23:34:19.687Z',
    updatedAt: '2026-09-19T23:34:19.687Z',
    isRootDomain: false,
    dokuEnvironment: 'sandbox',
    hasDoku: true,
    qrisEnabled: true,
  },
  {
    storeId: 'berkah-jaya',
    storeSlug: 'berkah-jaya',
    displaySlug: 'berkah-jaya',
    subdomain: 'berkah-jaya.lapakoke.com',
    subdomainUrl: 'https://berkah-jaya.lapakoke.com',
    storeName: 'Berkah Jaya Mart',
    tagline: 'Melayani Kebutuhan Anda Sepenuh Hati',
    ownerName: 'Pengelola Toko',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    address: 'Cabang Berkah Jaya',
    city: 'Surabaya',
    logoUrl: '',
    logoText: 'BJ',
    primaryColor: '#E51A24',
    isActive: true,
    disabledReason: null,
    disabledAt: null,
    createdAt: '2026-09-10T20:05:11.235Z',
    updatedAt: '2026-09-10T20:05:11.235Z',
    isRootDomain: false,
    dokuEnvironment: 'sandbox',
    hasDoku: true,
    qrisEnabled: true,
  },
  {
    storeId: 'tokoalda',
    storeSlug: 'tokoalda',
    displaySlug: 'tokoalda',
    subdomain: 'tokoalda.lapakoke.com',
    subdomainUrl: 'https://tokoalda.lapakoke.com',
    storeName: 'Toko Alda',
    tagline: 'Belanja Mudah, Hemat, dan Lengkap',
    ownerName: 'Pengelola Toko Alda',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    address: 'Cabang Toko Alda',
    city: 'Pangandaran',
    logoUrl: '',
    logoText: 'TA',
    primaryColor: '#E51A24',
    isActive: true,
    disabledReason: null,
    disabledAt: null,
    createdAt: '2026-09-21T01:00:00.000Z',
    updatedAt: '2026-09-21T01:00:00.000Z',
    isRootDomain: false,
    dokuEnvironment: 'sandbox',
    hasDoku: true,
    qrisEnabled: true,
  },
  {
    storeId: 'kuickmart',
    storeSlug: 'kuickmart',
    displaySlug: 'kuickmart',
    subdomain: 'kuickmart.lapakoke.com',
    subdomainUrl: 'https://kuickmart.lapakoke.com',
    storeName: 'Kuickmart',
    tagline: 'Pusat Belanja Minimarket Cepat & Lengkap',
    ownerName: 'Pengelola Kuickmart',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    address: 'Cabang Kuickmart - Bandung',
    city: 'Bandung',
    logoUrl: '',
    logoText: 'KM',
    primaryColor: '#2563EB',
    isActive: true,
    disabledReason: null,
    disabledAt: null,
    createdAt: '2026-09-20T00:00:00.000Z',
    updatedAt: '2026-09-20T00:00:00.000Z',
    isRootDomain: false,
    dokuEnvironment: 'sandbox',
    hasDoku: true,
    qrisEnabled: true,
  },
];

/**
 * Mengambil daftar seluruh subdomain yang terdaftar di lapakoke.com
 * Menggabungkan database server Express, built-in fallback data, dan cache localStorage lokal.
 */
export async function fetchRegisteredSubdomains(): Promise<RegisteredSubdomain[]> {
  const mapBySlug: Record<string, RegisteredSubdomain> = {};

  // 1. Inisialisasi awal dengan data subdomain bawaan sistem
  BUILTIN_REGISTERED_SUBDOMAINS.forEach((item) => {
    mapBySlug[item.storeSlug.toLowerCase()] = { ...item };
  });

  // 2. Ambil dari server Express atau Cloudflare Worker (/api/tenants)
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
      if (data && Array.isArray(data.tenants) && data.tenants.length > 0) {
        data.tenants.forEach((t: RegisteredSubdomain) => {
          mapBySlug[t.storeSlug.toLowerCase()] = t;
        });
      }
    }
  } catch (e) {
    console.warn('[TenantHelper] Gagal mengambil daftar tenant dari server:', e);
  }

  // 3. Scan localStorage untuk tenant yang disimpan / dimodifikasi lokal
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_TENANT_PREFIX)) {
          const slug = key.replace(STORAGE_TENANT_PREFIX, '').toLowerCase();
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const isMain = slug === 'default' || slug === 'lapakoke' || slug === 'lapakoke.com' || slug === 'toko-online' || slug === 'toko-online.online';
            const existing = mapBySlug[slug];
            mapBySlug[slug] = {
              storeId: parsed.storeId || slug,
              storeSlug: slug,
              displaySlug: isMain ? 'pusat' : slug,
              subdomain: isMain ? ROOT_AUTHORITY_DOMAIN : `${slug}.${ROOT_AUTHORITY_DOMAIN}`,
              subdomainUrl: isMain ? `https://${ROOT_AUTHORITY_DOMAIN}` : `https://${slug}.${ROOT_AUTHORITY_DOMAIN}`,
              storeName: parsed.storeName || (existing?.storeName) || (isMain ? 'LapakOke (Pusat)' : slug),
              tagline: parsed.tagline || (existing?.tagline) || '',
              ownerName: parsed.ownerName || (existing?.ownerName) || 'Pengelola Toko',
              phone: parsed.phone || parsed.whatsapp || (existing?.phone) || '',
              whatsapp: parsed.whatsapp || parsed.phone || (existing?.whatsapp) || '',
              address: parsed.address || (existing?.address) || '',
              city: parsed.city || (existing?.city) || '',
              logoUrl: parsed.logoUrl || (existing?.logoUrl) || '',
              logoText: parsed.logoText || (existing?.logoText) || '',
              primaryColor: parsed.primaryColor || (existing?.primaryColor) || '#E51A24',
              isActive: parsed.isActive !== undefined ? parsed.isActive : (existing?.isActive ?? true),
              disabledReason: parsed.disabledReason || null,
              disabledAt: parsed.disabledAt || null,
              createdAt: parsed.createdAt || existing?.createdAt || new Date().toISOString(),
              updatedAt: parsed.updatedAt || existing?.updatedAt || new Date().toISOString(),
              isRootDomain: isMain,
              dokuEnvironment: parsed.dokuSettings?.environment || existing?.dokuEnvironment || 'sandbox',
              hasDoku: Boolean(parsed.dokuSettings?.clientId || existing?.hasDoku),
              qrisEnabled: Boolean(parsed.dokuSettings?.enableQris ?? existing?.qrisEnabled ?? true),
            };
          }
        }
      }
    } catch (err) {
      console.warn('[TenantHelper] Error scanning localStorage tenants:', err);
    }
  }

  // 4. Ambil seluruh data tenant identity dari Cloud Database MySQL
  // Ini memastikan hardware online lain langsung melihat subdomain dan status aktif/nonaktif terbaru!
  try {
    const { fetchAllTenantIdentitiesFromCloud } = await import('./tenantCloudSync');
    const cloudTenants = await fetchAllTenantIdentitiesFromCloud();
    if (cloudTenants && cloudTenants.length > 0) {
      cloudTenants.forEach((ct: any) => {
        if (!ct || !ct.storeSlug) return;
        const slug = ct.storeSlug.toLowerCase();
        const isMain = slug === 'default' || slug === 'lapakoke' || slug === 'lapakoke.com' || slug === 'toko-online' || slug === 'toko-online.online';
        const existing = mapBySlug[slug];

        mapBySlug[slug] = {
          storeId: ct.storeId || slug,
          storeSlug: slug,
          displaySlug: isMain ? 'pusat' : slug,
          subdomain: isMain ? ROOT_AUTHORITY_DOMAIN : `${slug}.${ROOT_AUTHORITY_DOMAIN}`,
          subdomainUrl: isMain ? `https://${ROOT_AUTHORITY_DOMAIN}` : `https://${slug}.${ROOT_AUTHORITY_DOMAIN}`,
          storeName: ct.storeName || (existing?.storeName) || (isMain ? 'LapakOke (Pusat)' : slug),
          tagline: ct.tagline || (existing?.tagline) || '',
          ownerName: ct.ownerName || (existing?.ownerName) || 'Pengelola Toko',
          phone: ct.phone || ct.whatsapp || (existing?.phone) || '',
          whatsapp: ct.whatsapp || ct.phone || (existing?.whatsapp) || '',
          address: ct.address || (existing?.address) || '',
          city: ct.city || (existing?.city) || '',
          logoUrl: ct.logoUrl || (existing?.logoUrl) || '',
          logoText: ct.logoText || (existing?.logoText) || '',
          primaryColor: ct.primaryColor || (existing?.primaryColor) || '#E51A24',
          isActive: ct.isActive !== undefined ? ct.isActive : (existing?.isActive ?? true),
          disabledReason: ct.disabledReason || null,
          disabledAt: ct.disabledAt || null,
          createdAt: ct.createdAt || existing?.createdAt || new Date().toISOString(),
          updatedAt: ct.updatedAt || existing?.updatedAt || new Date().toISOString(),
          isRootDomain: isMain,
          dokuEnvironment: ct.dokuSettings?.environment || existing?.dokuEnvironment || 'sandbox',
          hasDoku: Boolean(ct.dokuSettings?.clientId || existing?.hasDoku),
          qrisEnabled: Boolean(ct.dokuSettings?.enableQris ?? existing?.qrisEnabled ?? true),
        };

        // Simpan juga ke cache localStorage lokal
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`${STORAGE_TENANT_PREFIX}${slug}`, JSON.stringify(ct));
          } catch {}
        }
      });
    }
  } catch (err) {
    console.warn('[TenantHelper] Gagal sync cloud tenants ke list subdomain:', err);
  }

  // 5. Pastikan Domain Utama default ada
  if (!mapBySlug['default']) {
    mapBySlug['default'] = {
      storeId: 'default',
      storeSlug: 'default',
      displaySlug: 'pusat',
      subdomain: ROOT_AUTHORITY_DOMAIN,
      subdomainUrl: `https://${ROOT_AUTHORITY_DOMAIN}`,
      storeName: 'LapakOke (Pusat)',
      tagline: 'Pusat Belanja Online Hemat, Cepat, dan Terpercaya',
      ownerName: 'Administrator',
      phone: '0812-3456-7890',
      whatsapp: '6281234567890',
      address: 'Jl. Pemuda No. 88, Pusat Niaga',
      city: 'Jakarta',
      logoText: 'LO',
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
  const isMain = slug === 'default' || slug === 'lapakoke' || slug === 'lapakoke.com' || slug === 'toko-online' || slug === 'toko-online.online';

  if (isMain && !isActive) {
    return {
      success: false,
      message: `Domain utama ${ROOT_AUTHORITY_DOMAIN} merupakan induk sistem dan tidak dapat dinonaktifkan.`,
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
            parsed.disabledReason = reason || `Dinonaktifkan oleh administrator ${ROOT_AUTHORITY_DOMAIN}`;
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

    // 4. Sync ke Cloud Database MySQL agar semua hardware online langsung terupdate secara real-time
    try {
      const { saveTenantDataToCloud } = await import('./tenantCloudSync');
      let tenantToSync = data.tenant;
      if (!tenantToSync && typeof window !== 'undefined') {
        const raw = localStorage.getItem(`${STORAGE_TENANT_PREFIX}${slug}`);
        if (raw) tenantToSync = JSON.parse(raw);
      }
      if (tenantToSync && tenantToSync.storeSlug) {
        saveTenantDataToCloud('identity', tenantToSync, slug);
      }
    } catch (e) {
      console.warn('[TenantHelper] Gagal sync status subdomain ke cloud:', e);
    }

    return {
      success: true,
      message: data.message || `Subdomain '${slug}.${ROOT_AUTHORITY_DOMAIN}' berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
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
