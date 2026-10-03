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
    const { products = [], categories = [], brands = [], stores = [], customers = [], staffUsers = [], orders = [] } = payload;
    
    // Batching untuk menghindari batasan ukuran payload HTTP (misal Nginx 1MB / Cloudflare / Express)
    const BATCH_SIZE = 15;
    const totalBatches = Math.max(1, Math.ceil(products.length / BATCH_SIZE));
    let totalMigratedProducts = 0;
    let lastCounts: Record<string, number> = {};

    for (let i = 0; i < totalBatches; i++) {
      const sliceStart = i * BATCH_SIZE;
      const sliceEnd = sliceStart + BATCH_SIZE;
      const chunkProducts = products.slice(sliceStart, sliceEnd);

      const batchPayload = {
        tenantSlug: payload.tenantSlug || 'default',
        products: chunkProducts,
        // Kirim metadata hanya di batch pertama
        categories: i === 0 ? categories : [],
        brands: i === 0 ? brands : [],
        stores: i === 0 ? stores : [],
        customers: i === 0 ? customers : [],
        staffUsers: i === 0 ? staffUsers : [],
        orders: i === 0 ? orders : [],
      };

      const res = await fetch('/api/mysql/migrate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchPayload),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(
          res.status === 413
            ? 'Ukuran data terlalu besar untuk proxy server. Mengirim data dalam batch lebih kecil...'
            : `Server merespon dengan status ${res.status}: ${text.slice(0, 100)}`
        );
      }

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Gagal menyimpan batch ke database');
      }

      totalMigratedProducts += json.counts?.products || chunkProducts.length;
      lastCounts = { ...json.counts, products: totalMigratedProducts };
    }

    return {
      success: true,
      message: `Migrasi selesai! ${totalMigratedProducts} produk, ${categories.length} kategori, dan ${orders.length} transaksi berhasil disinkronkan ke MySQL.`,
      counts: lastCounts,
    };
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
 * Ambil daftar kategori dari MySQL
 */
export async function fetchCategoriesFromMySql(tenantSlug: string = 'default'): Promise<Category[] | null> {
  try {
    const res = await fetch(`/api/mysql/categories?tenantSlug=${encodeURIComponent(tenantSlug)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.categories || null;
  } catch {
    return null;
  }
}

/**
 * Simpan satu kategori ke MySQL
 */
export async function saveCategoryToMySql(category: Category, tenantSlug: string = 'default'): Promise<boolean> {
  try {
    const res = await fetch('/api/mysql/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, tenantSlug }),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

/**
 * Simpan daftar kategori ke MySQL
 */
export async function saveCategoriesToMySql(categories: Category[], tenantSlug: string = 'default'): Promise<boolean> {
  try {
    const res = await fetch('/api/mysql/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories, tenantSlug }),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

/**
 * Hapus kategori dari MySQL
 */
export async function deleteCategoryFromMySql(categoryId: string, tenantSlug: string = 'default'): Promise<boolean> {
  try {
    const res = await fetch(`/api/mysql/categories/${encodeURIComponent(categoryId)}?tenantSlug=${encodeURIComponent(tenantSlug)}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

/**
 * Ambil daftar merek dari MySQL
 */
export async function fetchBrandsFromMySql(tenantSlug: string = 'default'): Promise<BrandItem[] | null> {
  try {
    const res = await fetch(`/api/mysql/brands?tenantSlug=${encodeURIComponent(tenantSlug)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.brands || null;
  } catch {
    return null;
  }
}

/**
 * Simpan daftar merek ke MySQL
 */
export async function saveBrandsToMySql(brands: BrandItem[], tenantSlug: string = 'default'): Promise<boolean> {
  try {
    const res = await fetch('/api/mysql/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brands, tenantSlug }),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

/**
 * Hapus merek dari MySQL
 */
export async function deleteBrandFromMySql(brandId: string, tenantSlug: string = 'default'): Promise<boolean> {
  try {
    const res = await fetch(`/api/mysql/brands/${encodeURIComponent(brandId)}?tenantSlug=${encodeURIComponent(tenantSlug)}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
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
