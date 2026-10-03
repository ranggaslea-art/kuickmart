import { Product, Category, BrandItem, Store, MemberProfile, StaffUser, Order } from '../types';

export interface MySqlStatusResponse {
  connected: boolean;
  message: string;
  version?: string;
  tableCounts?: Record<string, number>;
  config?: {
    host: string;
    port: number;
    user: string;
    database: string;
  };
}

/**
 * Cek status koneksi MySQL dari backend
 */
export async function fetchMySqlStatus(): Promise<MySqlStatusResponse> {
  try {
    const res = await fetch('/api/mysql/status');
    if (!res.ok) {
      return {
        connected: false,
        message: `HTTP ${res.status}: Gagal menghubungi endpoint status MySQL`,
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      connected: false,
      message: err.message || 'Koneksi jaringan terputus',
    };
  }
}

/**
 * Uji koneksi dan refresh status
 */
export async function triggerMySqlTest(): Promise<MySqlStatusResponse> {
  try {
    const res = await fetch('/api/mysql/test', { method: 'POST' });
    return await res.json();
  } catch (err: any) {
    return {
      connected: false,
      message: err.message || 'Koneksi jaringan terputus',
    };
  }
}

/**
 * Inisialisasi skema tabel otomatis di database MySQL
 */
export async function triggerMySqlInitSchema(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/mysql/init-schema', { method: 'POST' });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Koneksi jaringan terputus',
    };
  }
}

/**
 * Migrasikan seluruh data toko (Produk, Kategori, Merek, Toko, Staf, dll) ke MySQL dalam 1 kali klik
 */
export async function migrateAllDataToMySql(payload: {
  tenantSlug: string;
  products: Product[];
  categories?: Category[];
  brands?: BrandItem[];
  stores?: Store[];
  customers?: MemberProfile[];
  staffUsers?: StaffUser[];
  orders?: Order[];
}): Promise<{
  success: boolean;
  message: string;
  counts?: Record<string, number>;
}> {
  try {
    const res = await fetch('/api/mysql/migrate-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal mengirim data migrasi ke server MySQL',
    };
  }
}

/**
 * Simpan atau perbarui produk individual ke MySQL
 */
export async function saveProductToMySql(product: Product, tenantSlug: string = 'default'): Promise<boolean> {
  try {
    const res = await fetch('/api/mysql/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, tenantSlug }),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

/**
 * Ambil daftar produk dari MySQL
 */
export async function fetchProductsFromMySql(tenantSlug: string = 'default'): Promise<Product[] | null> {
  try {
    const res = await fetch(`/api/mysql/products?tenantSlug=${encodeURIComponent(tenantSlug)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.products || null;
  } catch {
    return null;
  }
}

/**
 * Simpan transaksi pesanan ke MySQL
 */
export async function saveOrderToMySql(order: Order, tenantSlug: string = 'default'): Promise<boolean> {
  try {
    const res = await fetch('/api/mysql/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, tenantSlug }),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}
