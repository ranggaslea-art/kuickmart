import { SystemModuleKey, UserPermissions, ModulePermission } from '../types';

export interface SystemModuleDefinition {
  key: SystemModuleKey;
  name: string;
  category: 'Katalog & Penjualan' | 'Operasional' | 'Pengaturan Toko';
  description: string;
  iconName: string;
  adminNote: string;
}

export const SYSTEM_MODULES: SystemModuleDefinition[] = [
  {
    key: 'products',
    name: 'Katalog & Stok Produk',
    category: 'Katalog & Penjualan',
    description: 'Akses daftar produk, harga, barcode, konversi multi-satuan, dan jumlah stok barang.',
    iconName: 'Package',
    adminNote: 'Kasir biasanya hanya melihat (Lihat Saja), sementara Admin, SPV, dan Gudang dapat mengedit.',
  },
  {
    key: 'orders',
    name: 'Pesanan Masuk & Kasir',
    category: 'Operasional',
    description: 'Akses transaksi penjualan, pemrosesan pesanan (picking, delivery, pickup), dan pembayaran.',
    iconName: 'Receipt',
    adminNote: 'Admin, Supervisor, dan Kasir memerlukan hak edit untuk memproses pesanan.',
  },
  {
    key: 'stores',
    name: 'Cabang Toko / Outlet',
    category: 'Pengaturan Toko',
    description: 'Pengaturan profil outlet, alamat, nomor telepon, jam operasional, dan radius pengiriman.',
    iconName: 'Store',
    adminNote: 'Hanya Admin & Supervisor yang berhak melihat/mengatur cabang minimarket.',
  },
  {
    key: 'receipts',
    name: 'Struk Kasir & Format Cetak',
    category: 'Pengaturan Toko',
    description: 'Pengaturan format struk kasir, nama brand, pesan footer, dan ukuran kertas thermal 58mm/80mm.',
    iconName: 'Printer',
    adminNote: 'Kasir dapat melihat struk, namun hak edit struk dikhususkan untuk Admin.',
  },
  {
    key: 'promos',
    name: 'Promo & Banner Toko',
    category: 'Katalog & Penjualan',
    description: 'Manajemen banner promo, flash sale dengan hitung mundur kilat, dan pengumuman diskon hemat.',
    iconName: 'Megaphone',
    adminNote: 'Dikelola oleh Admin & Supervisor untuk mengatur kampanye diskon toko.',
  },
  {
    key: 'brand_info',
    name: 'Info Brand & Footer',
    category: 'Pengaturan Toko',
    description: 'Pengaturan identitas brand KuickMart Express, tagline, kontak CS, dan link footer aplikasi.',
    iconName: 'Palette',
    adminNote: 'Pengaturan global toko, dikhususkan untuk Admin.',
  },
  {
    key: 'couriers',
    name: 'Kurir & Armada Pengantaran',
    category: 'Operasional',
    description: 'Data driver pengantaran pesanan kilat, nomor telepon, jenis kendaraan, dan plat nomor armada.',
    iconName: 'Bike',
    adminNote: 'Kasir dapat melihat daftar kurir, Admin dan Supervisor dapat menambah/mengedit kurir.',
  },
  {
    key: 'vouchers',
    name: 'Voucher & Diskon Kupon',
    category: 'Katalog & Penjualan',
    description: 'Pengaturan kode kupon promosi, diskon persentase, potongan harga rupiah, dan gratis ongkir.',
    iconName: 'Ticket',
    adminNote: 'Kasir dapat memeriksa voucher yang valid, Admin mengelola pembuatan voucher.',
  },
  {
    key: 'users',
    name: 'Manajemen User & Hak Akses',
    category: 'Pengaturan Toko',
    description: 'Daftar semua staff (Admin, SPV, Kasir, Gudang) dan kontrol izin hak akses per modul.',
    iconName: 'Users',
    adminNote: 'Sangat rahasia. Hanya Store Manager (Admin) yang dapat mengakses modul ini.',
  },
  {
    key: 'bulk_import',
    name: 'Import Cepat Excel / Teks',
    category: 'Katalog & Penjualan',
    description: 'Fasilitas impor massal ratusan produk sekaligus menggunakan format teks pipa atau data Excel.',
    iconName: 'FileSpreadsheet',
    adminNote: 'Untuk migrasi data massal oleh Admin atau Supervisor.',
  },
  {
    key: 'push_notifications',
    name: 'Push Notifikasi Promo (PWA)',
    category: 'Katalog & Penjualan',
    description: 'Kirim siaran pesan promosi langsung ke layar HP pelanggan yang menginstal aplikasi PWA.',
    iconName: 'BellRing',
    adminNote: 'Dikelola oleh Admin & Supervisor untuk menyiarkan diskon kilat dan pengumuman.',
  },
  {
    key: 'reports',
    name: 'Laporan & Analisis Laba',
    category: 'Katalog & Penjualan',
    description: 'Laporan master barang (per kategori & merk), laporan laba kotor harian & periode tanggal, dan laporan penjualan per item, kategori, & merk.',
    iconName: 'BarChart3',
    adminNote: 'Akses laporan keuangan, laba kotor, HPP modal, dan performa penjualan.',
  },
  {
    key: 'purchases',
    name: 'Pembelian & Stok Masuk',
    category: 'Katalog & Penjualan',
    description: 'Pencatatan pembelian barang dari supplier (Purchase Order / Faktur Beli) yang otomatis menambah stok barang fisik di katalog.',
    iconName: 'ShoppingBag',
    adminNote: 'Dikelola oleh Admin, Supervisor, dan Gudang untuk penerimaan barang masuk.',
  },
  {
    key: 'suppliers',
    name: 'Supplier / Pemasok Barang',
    category: 'Katalog & Penjualan',
    description: 'Master data supplier, kontak PIC, nomor telepon, alamat gudang supplier, rekening pembayaran, dan termin tempo.',
    iconName: 'Truck',
    adminNote: 'Dikelola oleh Admin dan Supervisor untuk data vendor pemasok toko.',
  },
  {
    key: 'customers',
    name: 'Pelanggan & Member',
    category: 'Katalog & Penjualan',
    description: 'Manajemen data pelanggan, status keanggotaan/member card, tier level, akumulasi belanja, dan riwayat pesanan.',
    iconName: 'Users',
    adminNote: 'Dikelola oleh Admin, Supervisor, dan Kasir untuk melayani loyalitas pelanggan.',
  },
  {
    key: 'points_rewards',
    name: 'Poin Belanja & Hadiah',
    category: 'Katalog & Penjualan',
    description: 'Pengaturan rasio perolehan poin belanja, nilai tukar diskon, mutasi poin, dan katalog hadiah penukaran.',
    iconName: 'Sparkles',
    adminNote: 'Dikelola oleh Admin dan Supervisor untuk program loyalitas toko.',
  },
  {
    key: 'stock_opname',
    name: 'Opname Stok Barang',
    category: 'Operasional',
    description: 'Pemeriksaan fisik stok berkala, bandingkan stok buku vs hitungan nyata, hitung selisih fisik & rupiah, serta sesuaikan stok.',
    iconName: 'ClipboardCheck',
    adminNote: 'Admin, Supervisor, dan Gudang dapat melakukan audit & penyesuaian stok opname.',
  },
  {
    key: 'returns',
    name: 'Retur Jual & Retur Beli',
    category: 'Operasional',
    description: 'Pencatatan retur barang dari konsumen (retur penjualan) dan pengembalian barang rusak/expired ke suplier (retur pembelian).',
    iconName: 'Undo2',
    adminNote: 'Admin, Supervisor, dan Kasir dapat memproses retur penjualan. Gudang & Admin memproses retur pembelian.',
  },
  {
    key: 'stock_mutations',
    name: 'Mutasi Barang Antar Cabang',
    category: 'Operasional',
    description: 'Transfer perpindahan stok produk antar cabang minimarket atau dari gudang pusat ke gerai cabang.',
    iconName: 'ArrowLeftRight',
    adminNote: 'Dikelola oleh Admin, Supervisor, dan Gudang untuk mengontrol distribusi stok antar outlet.',
  },
];

// Hak akses standar bawaan per peran (Default Role Permissions)
export const DEFAULT_ROLE_PERMISSIONS: Record<'admin' | 'supervisor' | 'kasir' | 'gudang', UserPermissions> = {
  admin: {
    products: { canView: true, canEdit: true },
    orders: { canView: true, canEdit: true },
    stores: { canView: true, canEdit: true },
    receipts: { canView: true, canEdit: true },
    promos: { canView: true, canEdit: true },
    brand_info: { canView: true, canEdit: true },
    couriers: { canView: true, canEdit: true },
    vouchers: { canView: true, canEdit: true },
    users: { canView: true, canEdit: true },
    bulk_import: { canView: true, canEdit: true },
    push_notifications: { canView: true, canEdit: true },
    reports: { canView: true, canEdit: true },
    purchases: { canView: true, canEdit: true },
    suppliers: { canView: true, canEdit: true },
    customers: { canView: true, canEdit: true },
    points_rewards: { canView: true, canEdit: true },
    stock_opname: { canView: true, canEdit: true },
    returns: { canView: true, canEdit: true },
    stock_mutations: { canView: true, canEdit: true },
  },
  supervisor: {
    products: { canView: true, canEdit: true },
    orders: { canView: true, canEdit: true },
    stores: { canView: true, canEdit: false }, // Hanya lihat cabang
    receipts: { canView: true, canEdit: false }, // Hanya lihat struk
    promos: { canView: true, canEdit: true }, // Bisa kelola promo
    brand_info: { canView: true, canEdit: false }, // Hanya lihat brand
    couriers: { canView: true, canEdit: true }, // Bisa kelola kurir
    vouchers: { canView: true, canEdit: false }, // Hanya lihat voucher
    users: { canView: false, canEdit: false }, // Tidak bisa akses manajemen user
    bulk_import: { canView: true, canEdit: true }, // Bisa import produk
    push_notifications: { canView: true, canEdit: true }, // Supervisor bisa broadcast promo
    reports: { canView: true, canEdit: true }, // Supervisor bisa pantau laporan
    purchases: { canView: true, canEdit: true }, // Supervisor bisa proses pembelian
    suppliers: { canView: true, canEdit: true }, // Supervisor bisa kelola supplier
    customers: { canView: true, canEdit: true }, // Supervisor bisa kelola member
    points_rewards: { canView: true, canEdit: true }, // Supervisor bisa atur poin
    stock_opname: { canView: true, canEdit: true }, // Supervisor bisa audit opname
    returns: { canView: true, canEdit: true }, // Supervisor bisa kelola retur
    stock_mutations: { canView: true, canEdit: true }, // Supervisor bisa mutasi barang
  },
  kasir: {
    // Kasir dapat melihat katalog, promo, pelanggan, dan poin belanja, serta retur penjualan
    products: { canView: true, canEdit: false }, // Kasir dapat melihat katalog & stok produk
    promos: { canView: true, canEdit: false }, // Kasir dapat melihat promo aktif
    customers: { canView: true, canEdit: true }, // Kasir dapat mendaftar/mencari member
    points_rewards: { canView: true, canEdit: false }, // Kasir dapat melihat info poin
    returns: { canView: true, canEdit: true }, // Kasir dapat menerima retur barang jual dari pembeli
    orders: { canView: false, canEdit: false }, // Terkunci
    stores: { canView: false, canEdit: false }, // Terkunci
    receipts: { canView: false, canEdit: false }, // Terkunci
    brand_info: { canView: false, canEdit: false }, // Terkunci
    couriers: { canView: false, canEdit: false }, // Terkunci
    vouchers: { canView: false, canEdit: false }, // Terkunci
    users: { canView: false, canEdit: false }, // Terkunci
    bulk_import: { canView: false, canEdit: false }, // Terkunci
    push_notifications: { canView: false, canEdit: false }, // Terkunci
    reports: { canView: false, canEdit: false }, // Terkunci
    purchases: { canView: false, canEdit: false }, // Terkunci
    suppliers: { canView: false, canEdit: false }, // Terkunci
    stock_opname: { canView: false, canEdit: false }, // Terkunci
    stock_mutations: { canView: false, canEdit: false }, // Terkunci
  },
  gudang: {
    products: { canView: true, canEdit: true }, // Gudang bisa update ketersediaan stok produk
    orders: { canView: true, canEdit: true }, // Gudang memproses status picking / pengemasan barang
    purchases: { canView: true, canEdit: true }, // Gudang menerima pembelian barang & input stok masuk
    suppliers: { canView: true, canEdit: false }, // Gudang melihat data pemasok
    stock_opname: { canView: true, canEdit: true }, // Gudang berhak penuh opname stok
    returns: { canView: true, canEdit: true }, // Gudang memproses retur barang
    stock_mutations: { canView: true, canEdit: true }, // Gudang memproses mutasi antar cabang
    stores: { canView: true, canEdit: false }, // Gudang melihat cabang untuk mutasi
    receipts: { canView: false, canEdit: false },
    promos: { canView: false, canEdit: false },
    brand_info: { canView: false, canEdit: false },
    couriers: { canView: true, canEdit: false }, // Gudang melihat kurir penjemput
    vouchers: { canView: false, canEdit: false },
    users: { canView: false, canEdit: false },
    bulk_import: { canView: true, canEdit: true },
    push_notifications: { canView: false, canEdit: false },
    reports: { canView: false, canEdit: false },
    customers: { canView: false, canEdit: false },
    points_rewards: { canView: false, canEdit: false },
  },
};

export interface PermissionPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  recommendedFor: string;
  colorClass: string;
  getPermissions: () => UserPermissions;
}

export const PERMISSION_PRESETS: PermissionPreset[] = [
  {
    id: 'admin_all',
    name: '👑 Admin (Akses Semua Modul)',
    badge: '11 Modul',
    description: 'Akses penuh untuk melihat dan mengelola semua 11 modul sistem tanpa batasan.',
    recommendedFor: 'Store Manager & Pemilik Toko',
    colorClass: 'border-amber-300 bg-amber-50 text-amber-900',
    getPermissions: (): UserPermissions => {
      const full: UserPermissions = {} as UserPermissions;
      SYSTEM_MODULES.forEach((m) => {
        full[m.key] = { canView: true, canEdit: true };
      });
      return full;
    },
  },
  {
    id: 'kasir_produk_promo',
    name: '🛒 Kasir (Hanya Produk & Promo)',
    badge: '2 Modul',
    description: 'Sesuai contoh akses: Kasir hanya dapat mengakses Katalog Produk dan Promo Toko.',
    recommendedFor: 'Kasir Shift & Staff Frontline Toko',
    colorClass: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    getPermissions: (): UserPermissions => ({
      products: { canView: true, canEdit: false },
      promos: { canView: true, canEdit: false },
      orders: { canView: false, canEdit: false },
      purchases: { canView: false, canEdit: false },
      suppliers: { canView: false, canEdit: false },
      customers: { canView: false, canEdit: false },
      points_rewards: { canView: false, canEdit: false },
      stores: { canView: false, canEdit: false },
      receipts: { canView: false, canEdit: false },
      brand_info: { canView: false, canEdit: false },
      couriers: { canView: false, canEdit: false },
      vouchers: { canView: false, canEdit: false },
      users: { canView: false, canEdit: false },
      bulk_import: { canView: false, canEdit: false },
      push_notifications: { canView: false, canEdit: false },
      reports: { canView: false, canEdit: false },
      stock_opname: { canView: false, canEdit: false },
      returns: { canView: false, canEdit: false },
      stock_mutations: { canView: false, canEdit: false },
    }),
  },
  {
    id: 'kasir_transaksi_lengkap',
    name: '💳 Kasir Lengkap (Produk, Pesanan, & Promo)',
    badge: '4 Modul',
    description: 'Kasir yang memproses pesanan kasir POS, memeriksa stok produk, dan melihat promo & voucher.',
    recommendedFor: 'Kasir Kasir Utama & POS Operator',
    colorClass: 'border-blue-300 bg-blue-50 text-blue-900',
    getPermissions: (): UserPermissions => ({
      products: { canView: true, canEdit: false },
      orders: { canView: true, canEdit: true },
      purchases: { canView: false, canEdit: false },
      suppliers: { canView: false, canEdit: false },
      customers: { canView: true, canEdit: false },
      points_rewards: { canView: true, canEdit: false },
      promos: { canView: true, canEdit: false },
      vouchers: { canView: true, canEdit: false },
      stores: { canView: false, canEdit: false },
      receipts: { canView: true, canEdit: false },
      brand_info: { canView: false, canEdit: false },
      couriers: { canView: true, canEdit: false },
      users: { canView: false, canEdit: false },
      bulk_import: { canView: false, canEdit: false },
      push_notifications: { canView: false, canEdit: false },
      reports: { canView: false, canEdit: false },
      stock_opname: { canView: false, canEdit: false },
      returns: { canView: false, canEdit: false },
      stock_mutations: { canView: false, canEdit: false },
    }),
  },
  {
    id: 'supervisor_operasional',
    name: '👔 Supervisor Toko',
    badge: '7 Modul',
    description: 'Akses operasional toko: katalog, pesanan, promo, kurir, struk, dan broadcast pesan promo.',
    recommendedFor: 'Supervisor Outlet & Asisten Manager',
    colorClass: 'border-purple-300 bg-purple-50 text-purple-900',
    getPermissions: (): UserPermissions => ({ ...DEFAULT_ROLE_PERMISSIONS.supervisor }),
  },
  {
    id: 'gudang_logistik',
    name: '📦 Staff Gudang & Stok',
    badge: '3 Modul',
    description: 'Akses stok produk, picking order pesanan, armada penjemput, dan import data massal.',
    recommendedFor: 'Petugas Gudang, Picker, & Packer',
    colorClass: 'border-orange-300 bg-orange-50 text-orange-900',
    getPermissions: (): UserPermissions => ({ ...DEFAULT_ROLE_PERMISSIONS.gudang }),
  },
  {
    id: 'view_only_all',
    name: '👁️ Hanya Lihat Saja (Semua Modul)',
    badge: '11 Modul (Read-Only)',
    description: 'Dapat melihat seluruh data toko namun tidak diizinkan menambah, mengedit, atau menghapus.',
    recommendedFor: 'Auditor, Viewer, & Trainee',
    colorClass: 'border-stone-300 bg-stone-100 text-stone-800',
    getPermissions: (): UserPermissions => {
      const viewOnly: UserPermissions = {} as UserPermissions;
      SYSTEM_MODULES.forEach((m) => {
        viewOnly[m.key] = { canView: true, canEdit: false };
      });
      return viewOnly;
    },
  },
  {
    id: 'lock_all',
    name: '🚫 Kunci Semua Modul',
    badge: '0 Modul',
    description: 'Menonaktifkan semua akses modul toko untuk akun ini sementara waktu.',
    recommendedFor: 'Akun Ditangguhkan / Dibekukan',
    colorClass: 'border-red-300 bg-red-50 text-red-800',
    getPermissions: (): UserPermissions => {
      const locked: UserPermissions = {} as UserPermissions;
      SYSTEM_MODULES.forEach((m) => {
        locked[m.key] = { canView: false, canEdit: false };
      });
      return locked;
    },
  },
];

/**
 * Mengambil hak akses efektif dari seorang user.
 * Jika user memiliki custom permissions, itu akan dioverride ke default peran.
 */
export function getEffectivePermissions(
  role?: string,
  customPermissions?: Partial<UserPermissions>
): UserPermissions {
  const safeRole = (role && DEFAULT_ROLE_PERMISSIONS[role as keyof typeof DEFAULT_ROLE_PERMISSIONS])
    ? (role as 'admin' | 'supervisor' | 'kasir' | 'gudang')
    : 'kasir';
  const base = DEFAULT_ROLE_PERMISSIONS[safeRole] || DEFAULT_ROLE_PERMISSIONS.kasir;
  if (!customPermissions || typeof customPermissions !== 'object') return { ...base };

  const result: UserPermissions = { ...base };
  (Object.keys(base) as SystemModuleKey[]).forEach((key) => {
    if (customPermissions[key] && typeof customPermissions[key] === 'object') {
      const canEdit = !!customPermissions[key]?.canEdit;
      // Jika canEdit true, maka canView harus true
      const canView = canEdit ? true : !!customPermissions[key]?.canView;
      result[key] = { canView, canEdit };
    }
  });

  return result;
}

/**
 * Menghitung ringkasan jumlah modul yang boleh dilihat & diedit.
 */
export function countUserPermissions(permissions?: UserPermissions | null): {
  viewCount: number;
  editCount: number;
  total: number;
  isFullAdmin: boolean;
} {
  const total = SYSTEM_MODULES.length;
  let viewCount = 0;
  let editCount = 0;

  if (!permissions || typeof permissions !== 'object') {
    return { viewCount: 0, editCount: 0, total, isFullAdmin: false };
  }

  SYSTEM_MODULES.forEach((mod) => {
    if (permissions[mod.key]?.canView) viewCount++;
    if (permissions[mod.key]?.canEdit) editCount++;
  });

  const isFullAdmin = viewCount === total && editCount === total;
  return { viewCount, editCount, total, isFullAdmin };
}

/**
 * Menghasilkan teks deskripsi peran dalam bahasa Indonesia.
 */
export function getRoleDisplayName(role: 'admin' | 'supervisor' | 'kasir' | 'gudang'): string {
  switch (role) {
    case 'admin':
      return 'Store Manager (Admin)';
    case 'supervisor':
      return 'Supervisor Toko';
    case 'kasir':
      return 'Kasir Shift Toko';
    case 'gudang':
      return 'Staff Gudang & Stok';
    default:
      return role;
  }
}
