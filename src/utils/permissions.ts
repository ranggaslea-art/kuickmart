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
  },
  kasir: {
    products: { canView: true, canEdit: false }, // Kasir hanya bisa lihat produk & stok, tidak bisa ubah harga/hapus
    orders: { canView: true, canEdit: true }, // Kasir memproses transaksi penjualan & pesanan
    stores: { canView: false, canEdit: false }, // Dibatasi dari pengaturan cabang
    receipts: { canView: true, canEdit: false }, // Kasir hanya melihat format struk
    promos: { canView: true, canEdit: false }, // Kasir dapat melihat promo aktif untuk info pelanggan
    brand_info: { canView: false, canEdit: false }, // Dibatasi dari konfigurasi brand
    couriers: { canView: true, canEdit: false }, // Kasir bisa cek ketersediaan driver
    vouchers: { canView: true, canEdit: false }, // Kasir bisa cek voucher diskon pelanggan
    users: { canView: false, canEdit: false }, // Dibatasi dari manajemen user
    bulk_import: { canView: false, canEdit: false }, // Dibatasi dari import massal
    push_notifications: { canView: true, canEdit: false }, // Kasir bisa lihat log siaran promo
  },
  gudang: {
    products: { canView: true, canEdit: true }, // Gudang bisa update ketersediaan stok produk
    orders: { canView: true, canEdit: true }, // Gudang memproses status picking / pengemasan barang
    stores: { canView: false, canEdit: false },
    receipts: { canView: false, canEdit: false },
    promos: { canView: false, canEdit: false },
    brand_info: { canView: false, canEdit: false },
    couriers: { canView: true, canEdit: false }, // Gudang melihat kurir penjemput
    vouchers: { canView: false, canEdit: false },
    users: { canView: false, canEdit: false },
    bulk_import: { canView: true, canEdit: true },
    push_notifications: { canView: false, canEdit: false },
  },
};

/**
 * Mengambil hak akses efektif dari seorang user.
 * Jika user memiliki custom permissions, itu akan dioverride ke default peran.
 */
export function getEffectivePermissions(
  role: 'admin' | 'supervisor' | 'kasir' | 'gudang',
  customPermissions?: Partial<UserPermissions>
): UserPermissions {
  const base = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.kasir;
  if (!customPermissions) return { ...base };

  const result: UserPermissions = { ...base };
  (Object.keys(base) as SystemModuleKey[]).forEach((key) => {
    if (customPermissions[key]) {
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
export function countUserPermissions(permissions: UserPermissions): {
  viewCount: number;
  editCount: number;
  total: number;
  isFullAdmin: boolean;
} {
  const total = SYSTEM_MODULES.length;
  let viewCount = 0;
  let editCount = 0;

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
