import { isRootDomain, getStoreSlugFromUrl, isDefaultStore } from './tenantHelper';

export const STORAGE_GLOBAL_SUBDOMAIN_POLICY_KEY = 'toko_online_subdomain_module_policy';
export const STORAGE_SUBDOMAIN_OVERRIDES_KEY = 'toko_online_subdomain_module_overrides';
export const SUBDOMAIN_MODULE_POLICY_EVENT = 'subdomain_module_policy_changed';

export type SubdomainModuleCategory = 'pos' | 'master' | 'inventory' | 'marketing' | 'settings' | 'system';

export interface SubdomainControllableModule {
  id: string; // ID tab di AdminPanelModal (cth: 'pos_cashier', 'reports', 'vouchers', dll.)
  name: string; // Nama modul bahasa Indonesia
  category: SubdomainModuleCategory;
  categoryLabel: string;
  description: string;
  iconName: string;
}

/**
 * Daftar lengkap seluruh modul yang dapat dikontrol aktif / nonaktif untuk subdomain.
 */
export const CONTROLLABLE_SUBDOMAIN_MODULES: SubdomainControllableModule[] = [
  // 1. KASIR & PENJUALAN
  {
    id: 'pos_cashier',
    name: 'Penjualan Kasir (POS)',
    category: 'pos',
    categoryLabel: 'Kasir & Penjualan',
    description: 'Aplikasi kasir barcode, kalkulasi total, diskon & cetak struk kasir fisik/digital.',
    iconName: 'ScanBarcode',
  },
  {
    id: 'orders',
    name: 'Pesanan Kasir & Online',
    category: 'pos',
    categoryLabel: 'Kasir & Penjualan',
    description: 'Daftar riwayat transaksi belanja, tracking status pesanan & cetak nota.',
    iconName: 'Receipt',
  },
  {
    id: 'returns',
    name: 'Retur Jual & Beli',
    category: 'pos',
    categoryLabel: 'Kasir & Penjualan',
    description: 'Pencatatan pengembalian barang rusak/tukar barang pelanggan dan supplier.',
    iconName: 'Undo2',
  },
  {
    id: 'reports',
    name: 'Laporan & Keuangan',
    category: 'pos',
    categoryLabel: 'Kasir & Penjualan',
    description: 'Laporan laba rugi, komparasi arus dagang jual-beli & rekapan akuntansi A4.',
    iconName: 'BarChart3',
  },

  // 2. MASTER DATA
  {
    id: 'products',
    name: 'Katalog & Stok Produk',
    category: 'master',
    categoryLabel: 'Master Data',
    description: 'Manajemen database produk, barcode, harga jual, harga grosir & stok fisik.',
    iconName: 'Package',
  },
  {
    id: 'categories_brands',
    name: 'Kategori & Merk Produk',
    category: 'master',
    categoryLabel: 'Master Data',
    description: 'Pengelompokan barang berdasarkan kategori dan merk/brand distributor.',
    iconName: 'Tag',
  },
  {
    id: 'customers',
    name: 'Master Pelanggan & Member',
    category: 'master',
    categoryLabel: 'Master Data',
    description: 'Buku direktori data pelanggan, nomor telepon, alamat & riwayat transaksi.',
    iconName: 'Users',
  },
  {
    id: 'suppliers',
    name: 'Suplier & Pemasok Barang',
    category: 'master',
    categoryLabel: 'Master Data',
    description: 'Database kontak supplier, nomor WhatsApp, alamat gudang & termin tempo.',
    iconName: 'Truck',
  },
  {
    id: 'bulk_import',
    name: 'Import Cepat Excel',
    category: 'master',
    categoryLabel: 'Master Data',
    description: 'Fitur upload massal 49 kolom data produk dari file spreadsheet CSV/Excel.',
    iconName: 'FileSpreadsheet',
  },

  // 3. INVENTORI & STOK
  {
    id: 'stock_card',
    name: 'Kartu Stok & Mutasi',
    category: 'inventory',
    categoryLabel: 'Inventori & Pergudangan',
    description: 'Buku kartu kendali mutasi masuk-keluar barang per barcode secara rinci.',
    iconName: 'Layers',
  },
  {
    id: 'stock_opname',
    name: 'Opname Stok Fisik',
    category: 'inventory',
    categoryLabel: 'Inventori & Pergudangan',
    description: 'Penyesuaian stok sistem dengan hitungan fisik riil di rak toko & selisih HPP.',
    iconName: 'ClipboardCheck',
  },
  {
    id: 'stock_mutations',
    name: 'Mutasi Antar Cabang',
    category: 'inventory',
    categoryLabel: 'Inventori & Pergudangan',
    description: 'Surat jalan pemindahan stok barang antar cabang toko dalam satu jaringan.',
    iconName: 'ArrowLeftRight',
  },
  {
    id: 'purchase_orders',
    name: 'Pemesanan Pembelian (PO)',
    category: 'inventory',
    categoryLabel: 'Inventori & Pergudangan',
    description: 'Pembuatan surat pesanan PO resmi supplier dengan approval dan cetak A4.',
    iconName: 'ClipboardList',
  },
  {
    id: 'purchases',
    name: 'Pembelian & Stok Masuk',
    category: 'inventory',
    categoryLabel: 'Inventori & Pergudangan',
    description: 'Pencatatan faktur pembelian supplier dan penambahan stok masuk otomatis.',
    iconName: 'ShoppingBag',
  },

  // 4. PROMO & MARKETING
  {
    id: 'promos',
    name: 'Promo & Banner Toko',
    category: 'marketing',
    categoryLabel: 'Promo & Marketing',
    description: 'Spanduk banner slide hero, flash sale berwaktu & running text promo.',
    iconName: 'Megaphone',
  },
  {
    id: 'vouchers',
    name: 'Voucher & Diskon',
    category: 'marketing',
    categoryLabel: 'Promo & Marketing',
    description: 'Kode kupon potongan belanja persentase/nominal rupiah dengan kuota.',
    iconName: 'Ticket',
  },
  {
    id: 'points_rewards',
    name: 'Poin Belanja & Loyalitas',
    category: 'marketing',
    categoryLabel: 'Promo & Marketing',
    description: 'Pemberian reward koin poin belanja pelanggan dan penukaran merchandise.',
    iconName: 'Coins',
  },
  {
    id: 'push_notifications',
    name: 'Push Notifikasi Promo',
    category: 'marketing',
    categoryLabel: 'Promo & Marketing',
    description: 'Pengiriman pesan siaran promo instan ke layar HP/browser pelanggan (PWA).',
    iconName: 'BellRing',
  },

  // 5. PENGATURAN & CABANG
  {
    id: 'stores',
    name: 'Cabang Toko',
    category: 'settings',
    categoryLabel: 'Pengaturan & Cabang',
    description: 'Pengelolaan daftar cabang fisik toko, alamat toko dan radius pengiriman.',
    iconName: 'Store',
  },
  {
    id: 'store_doku_settings',
    name: 'Identitas Toko & DOKU Payment',
    category: 'settings',
    categoryLabel: 'Pengaturan & Cabang',
    description: 'Kustomisasi nama toko independen, logo, tema warna & integrasi QRIS DOKU.',
    iconName: 'CreditCard',
  },
  {
    id: 'receipts',
    name: 'Struk Info Toko',
    category: 'settings',
    categoryLabel: 'Pengaturan & Cabang',
    description: 'Kustomisasi layout struk, nama toko, alamat, printer TM-U220 & nomor CS.',
    iconName: 'Receipt',
  },
  {
    id: 'couriers',
    name: 'Kurir & Armada',
    category: 'settings',
    categoryLabel: 'Pengaturan & Cabang',
    description: 'Daftar nama kurir internal toko, nomor HP, plat armada & tarif ongkir.',
    iconName: 'Bike',
  },
  {
    id: 'brand_info',
    name: 'Info Brand & Footer',
    category: 'settings',
    categoryLabel: 'Pengaturan & Cabang',
    description: 'Pengaturan logo brand utama, slogan, tautan footer & teks hak cipta.',
    iconName: 'Palette',
  },

  // 6. SISTEM & SERVER
  {
    id: 'users',
    name: 'Manajemen User & Staff',
    category: 'system',
    categoryLabel: 'Sistem & Server',
    description: 'Pengelolaan akun kasir, supervisor, admin dan PIN login masing-masing cabang.',
    iconName: 'Users',
  },
  {
    id: 'permissions',
    name: 'Hak Akses Modul Role',
    category: 'system',
    categoryLabel: 'Sistem & Server',
    description: 'Matriks izin buka/edit/hapus modul per role staf toko.',
    iconName: 'Shield',
  },
  {
    id: 'mysql_db',
    name: 'Database MySQL & phpMyAdmin',
    category: 'system',
    categoryLabel: 'Sistem & Server',
    description: 'Status koneksi database MySQL, tabel sync & kredensial phpMyAdmin.',
    iconName: 'Database',
  },
  {
    id: 'vps_deploy',
    name: 'Deploy & Server VPS',
    category: 'system',
    categoryLabel: 'Sistem & Server',
    description: 'Konfigurasi IP VPS, sertifikat SSL, PM2 daemon & Nginx reverse proxy.',
    iconName: 'Rocket',
  },
  {
    id: 'seo_google',
    name: 'SEO & Google Search',
    category: 'system',
    categoryLabel: 'Sistem & Server',
    description: 'Meta tag SEO, OpenGraph WhatsApp, verifikasi Google & JSON-LD toko.',
    iconName: 'Search',
  },
];

/**
 * Nilai default modul aktif untuk subdomain saat awal mula
 */
export function getDefaultGlobalSubdomainPolicy(): Record<string, boolean> {
  const defaults: Record<string, boolean> = {};
  CONTROLLABLE_SUBDOMAIN_MODULES.forEach(m => {
    defaults[m.id] = true;
  });
  return defaults;
}

/**
 * Mengambil kebijakan modul subdomain global dari memori / localStorage
 */
export function getGlobalSubdomainModulePolicy(): Record<string, boolean> {
  if (typeof window === 'undefined') return getDefaultGlobalSubdomainPolicy();
  try {
    const raw = localStorage.getItem(STORAGE_GLOBAL_SUBDOMAIN_POLICY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const defaults = getDefaultGlobalSubdomainPolicy();
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.warn('Gagal membaca global subdomain module policy:', e);
  }
  return getDefaultGlobalSubdomainPolicy();
}

/**
 * Menyimpan kebijakan modul subdomain global
 */
export function saveGlobalSubdomainModulePolicy(policy: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_GLOBAL_SUBDOMAIN_POLICY_KEY, JSON.stringify(policy));
    window.dispatchEvent(new CustomEvent(SUBDOMAIN_MODULE_POLICY_EVENT, {
      detail: { type: 'global', policy }
    }));
  } catch (e) {
    console.error('Gagal menyimpan global subdomain module policy:', e);
  }
}

/**
 * Mengambil override modul per-subdomain
 */
export function getSubdomainModuleOverrides(): Record<string, Record<string, boolean>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_SUBDOMAIN_OVERRIDES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Gagal membaca subdomain module overrides:', e);
  }
  return {};
}

/**
 * Menyimpan override modul untuk satu subdomain tertentu
 */
export function saveSubdomainModuleOverride(storeSlug: string, moduleId: string, isEnabled: boolean): void {
  if (typeof window === 'undefined' || !storeSlug) return;
  try {
    const cleanSlug = storeSlug.toLowerCase().trim();
    const currentOverrides = getSubdomainModuleOverrides();
    const storeMap = { ...(currentOverrides[cleanSlug] || {}) };
    storeMap[moduleId] = isEnabled;
    currentOverrides[cleanSlug] = storeMap;

    localStorage.setItem(STORAGE_SUBDOMAIN_OVERRIDES_KEY, JSON.stringify(currentOverrides));
    window.dispatchEvent(new CustomEvent(SUBDOMAIN_MODULE_POLICY_EVENT, {
      detail: { type: 'subdomain_override', storeSlug: cleanSlug, moduleId, isEnabled }
    }));
  } catch (e) {
    console.error('Gagal menyimpan subdomain module override:', e);
  }
}

/**
 * Menghapus override spesifik untuk satu subdomain agar kembali mengikuti kebijakan global
 */
export function removeSubdomainModuleOverride(storeSlug: string, moduleId: string): void {
  if (typeof window === 'undefined' || !storeSlug) return;
  try {
    const cleanSlug = storeSlug.toLowerCase().trim();
    const currentOverrides = getSubdomainModuleOverrides();
    if (currentOverrides[cleanSlug] && currentOverrides[cleanSlug][moduleId] !== undefined) {
      delete currentOverrides[cleanSlug][moduleId];
      if (Object.keys(currentOverrides[cleanSlug]).length === 0) {
        delete currentOverrides[cleanSlug];
      }
      localStorage.setItem(STORAGE_SUBDOMAIN_OVERRIDES_KEY, JSON.stringify(currentOverrides));
      window.dispatchEvent(new CustomEvent(SUBDOMAIN_MODULE_POLICY_EVENT, {
        detail: { type: 'remove_override', storeSlug: cleanSlug, moduleId }
      }));
    }
  } catch (e) {
    console.error('Gagal menghapus subdomain module override:', e);
  }
}

/**
 * Menyetel seluruh modul untuk satu subdomain menjadi aktif atau nonaktif sekaligus
 */
export function bulkSetSubdomainModules(storeSlug: string, isEnabled: boolean): void {
  if (typeof window === 'undefined' || !storeSlug) return;
  try {
    const cleanSlug = storeSlug.toLowerCase().trim();
    const currentOverrides = getSubdomainModuleOverrides();
    const storeMap: Record<string, boolean> = {};
    CONTROLLABLE_SUBDOMAIN_MODULES.forEach(m => {
      storeMap[m.id] = isEnabled;
    });
    currentOverrides[cleanSlug] = storeMap;

    localStorage.setItem(STORAGE_SUBDOMAIN_OVERRIDES_KEY, JSON.stringify(currentOverrides));
    window.dispatchEvent(new CustomEvent(SUBDOMAIN_MODULE_POLICY_EVENT, {
      detail: { type: 'bulk_subdomain', storeSlug: cleanSlug, isEnabled }
    }));
  } catch (e) {
    console.error('Gagal bulk set subdomain modules:', e);
  }
}

/**
 * Reset seluruh override satu subdomain agar kembali 100% mengikuti kebijakan global
 */
export function resetSubdomainToGlobal(storeSlug: string): void {
  if (typeof window === 'undefined' || !storeSlug) return;
  try {
    const cleanSlug = storeSlug.toLowerCase().trim();
    const currentOverrides = getSubdomainModuleOverrides();
    if (currentOverrides[cleanSlug]) {
      delete currentOverrides[cleanSlug];
      localStorage.setItem(STORAGE_SUBDOMAIN_OVERRIDES_KEY, JSON.stringify(currentOverrides));
      window.dispatchEvent(new CustomEvent(SUBDOMAIN_MODULE_POLICY_EVENT, {
        detail: { type: 'reset_subdomain', storeSlug: cleanSlug }
      }));
    }
  } catch (e) {
    console.error('Gagal reset subdomain ke global:', e);
  }
}

/**
 * Cek apakah modul tertentu aktif di subdomain yang sedang diakses atau slug yang dituju.
 * 
 * ATURAN MUTLAK:
 * 1. Jika diakses dari Domain Utama (root domain / toko-online.online), SEMUA MODUL SELALU AKTIF (true).
 * 2. Jika diakses dari Subdomain (cabang toko), periksa apakah modul tersebut di-enabled atau di-disabled
 *    oleh administrator domain utama.
 */
export function isSubdomainModuleEnabled(moduleId: string, targetSlug?: string): boolean {
  if (typeof window === 'undefined') return true;

  // Jika tidak menyebutkan targetSlug, gunakan slug URL saat ini
  const effectiveSlug = (targetSlug || getStoreSlugFromUrl() || 'default').toLowerCase().trim();

  // Jika ini adalah store utama / root domain, semua modul SELALU AKTIF
  if (isDefaultStore(effectiveSlug) && isRootDomain()) {
    return true;
  }

  // Jika ini adalah subdomain:
  // 1. Cek override spesifik subdomain ini
  const overrides = getSubdomainModuleOverrides();
  if (overrides[effectiveSlug] && overrides[effectiveSlug][moduleId] !== undefined) {
    return overrides[effectiveSlug][moduleId];
  }

  // 2. Jika tidak ada override khusus, gunakan kebijakan global subdomain
  const globalPolicy = getGlobalSubdomainModulePolicy();
  if (globalPolicy[moduleId] !== undefined) {
    return globalPolicy[moduleId];
  }

  // Default fallback: true (aktif)
  return true;
}

/**
 * Mengambil status lengkap seluruh modul untuk satu subdomain (apakah dari override atau global)
 */
export function getSubdomainEffectiveModuleStatus(storeSlug: string): Record<string, { enabled: boolean; isOverride: boolean }> {
  const cleanSlug = storeSlug.toLowerCase().trim();
  const globalPolicy = getGlobalSubdomainModulePolicy();
  const overrides = getSubdomainModuleOverrides();
  const storeOverrides = overrides[cleanSlug] || {};

  const result: Record<string, { enabled: boolean; isOverride: boolean }> = {};

  CONTROLLABLE_SUBDOMAIN_MODULES.forEach(m => {
    if (storeOverrides[m.id] !== undefined) {
      result[m.id] = {
        enabled: storeOverrides[m.id],
        isOverride: true,
      };
    } else {
      result[m.id] = {
        enabled: globalPolicy[m.id] !== undefined ? globalPolicy[m.id] : true,
        isOverride: false,
      };
    }
  });

  return result;
}
