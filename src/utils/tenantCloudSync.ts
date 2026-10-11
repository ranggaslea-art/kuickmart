import { getStoreSlugFromUrl, getTenantStorageKey, STORAGE_TENANT_PREFIX } from './tenantHelper';
import {
  saveCategoriesToMySql,
  saveBrandsToMySql,
  savePurchasesToMySql,
  saveSuppliersToMySql,
  saveProductsToMySql,
  fetchCategoriesFromMySql,
  fetchBrandsFromMySql,
  fetchPurchasesFromMySql,
  fetchSuppliersFromMySql,
  fetchProductsFromMySql,
} from '../lib/mysqlClientApi';

/**
 * Mapping nama key sinkronisasi dengan storage key localStorage
 */
const STORAGE_KEY_MAPPING: Record<string, string> = {
  products: 'toko_online_products',
  categories: 'toko_online_categories',
  brands: 'toko_online_brands',
  identity: STORAGE_TENANT_PREFIX,
  brand: 'toko_online_brand_config',
  vouchers: 'toko_online_vouchers',
  receipts: 'toko_online_receipt_configs',
  promos: 'toko_online_store_promos',
  couriers: 'toko_online_couriers',
  staff: 'toko_online_staff_users',
  suppliers: 'toko_online_suppliers',
  purchases: 'toko_online_purchases',
  customers: 'toko_online_customers',
  points_config: 'toko_online_points_config',
  reward_items: 'toko_online_reward_items',
  points_ledger: 'toko_online_points_ledger',
  stock_cards: 'toko_online_stock_adjustments',
  stock_opnames: 'toko_online_stock_opnames',
  sales_returns: 'toko_online_sales_returns',
  purchase_returns: 'toko_online_purchase_returns',
  stock_mutations: 'toko_online_stock_mutations',
};

/**
 * Simpan data modul tenant ke MySQL Server & Local Storage
 */
export async function saveTenantDataToCloud<T = any>(
  moduleKey: string,
  data: T,
  storeSlug?: string
): Promise<boolean> {
  const effectiveSlug = (storeSlug || (typeof window !== 'undefined' ? getStoreSlugFromUrl() : 'default') || 'default').toLowerCase();
  const now = new Date().toISOString();

  // 1. Simpan segera ke localStorage lokal untuk responsivitas instan
  if (typeof window !== 'undefined') {
    try {
      const baseKey = STORAGE_KEY_MAPPING[moduleKey] || `toko_online_${moduleKey}`;
      const localKey = moduleKey === 'identity' 
        ? `${STORAGE_TENANT_PREFIX}${effectiveSlug}` 
        : getTenantStorageKey(baseKey, effectiveSlug);
      localStorage.setItem(localKey, JSON.stringify(data));
    } catch (e) {
      console.warn(`[CloudSync] Gagal menyimpan ke localStorage untuk ${moduleKey}:`, e);
    }
  }

  // 2. Broadcast event lokal untuk sinkronisasi komponen di window saat ini
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('tenant_cloud_synced', {
        detail: { moduleKey, slug: effectiveSlug, data, timestamp: now },
      })
    );
  }

  // 3. Sinkronisasikan otomatis ke MySQL (MariaDB) Server
  try {
    if (moduleKey === 'categories' && Array.isArray(data)) {
      await saveCategoriesToMySql(data as any, effectiveSlug);
    } else if (moduleKey === 'brands' && Array.isArray(data)) {
      await saveBrandsToMySql(data as any, effectiveSlug);
    } else if (moduleKey === 'purchases' && Array.isArray(data)) {
      await savePurchasesToMySql(data as any, effectiveSlug);
    } else if (moduleKey === 'suppliers' && Array.isArray(data)) {
      await saveSuppliersToMySql(data as any, effectiveSlug);
    } else if (moduleKey === 'products' && Array.isArray(data)) {
      await saveProductsToMySql(data as any, effectiveSlug);
    }
  } catch (mysqlErr) {
    console.warn(`[CloudSync] Sinkronisasi MySQL untuk ${moduleKey}:`, mysqlErr);
  }

  return true;
}

/**
 * Ambil data modul tenant dari MySQL Database Server atau LocalStorage.
 */
export async function fetchTenantDataFromCloud<T = any>(
  moduleKey: string,
  storeSlug?: string
): Promise<T | null> {
  const effectiveSlug = (storeSlug || (typeof window !== 'undefined' ? getStoreSlugFromUrl() : 'default') || 'default').toLowerCase();

  // 1. Coba ambil dari MySQL Database Server terlebih dahulu
  try {
    if (moduleKey === 'categories') {
      const dbCategories = await fetchCategoriesFromMySql(effectiveSlug);
      if (dbCategories && dbCategories.length > 0) return dbCategories as any;
    } else if (moduleKey === 'brands') {
      const dbBrands = await fetchBrandsFromMySql(effectiveSlug);
      if (dbBrands && dbBrands.length > 0) return dbBrands as any;
    } else if (moduleKey === 'purchases') {
      const dbPurchases = await fetchPurchasesFromMySql(effectiveSlug);
      if (dbPurchases && dbPurchases.length > 0) return dbPurchases as any;
    } else if (moduleKey === 'suppliers') {
      const dbSuppliers = await fetchSuppliersFromMySql(effectiveSlug);
      if (dbSuppliers && dbSuppliers.length > 0) return dbSuppliers as any;
    } else if (moduleKey === 'products') {
      const dbProducts = await fetchProductsFromMySql(effectiveSlug);
      if (dbProducts && dbProducts.length > 0) return dbProducts as any;
    }
  } catch (err) {
    console.warn(`[CloudSync] Fallback ke cache lokal untuk ${moduleKey}:`, err);
  }

  // 2. Fallback membaca dari localStorage lokal
  if (typeof window !== 'undefined') {
    try {
      const baseKey = STORAGE_KEY_MAPPING[moduleKey] || `toko_online_${moduleKey}`;
      const localKey = moduleKey === 'identity' 
        ? `${STORAGE_TENANT_PREFIX}${effectiveSlug}` 
        : getTenantStorageKey(baseKey, effectiveSlug);
      const cached = localStorage.getItem(localKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch {}
  }

  return null;
}

/**
 * Ambil seluruh data identitas tenant dari LocalStorage & registrasi toko
 */
export async function fetchAllTenantIdentitiesFromCloud(): Promise<any[]> {
  if (typeof window === 'undefined') return [];
  try {
    const list: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_TENANT_PREFIX)) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (item && item.storeSlug) {
            list.push(item);
          }
        } catch {}
      }
    }
    return list;
  } catch (err) {
    console.warn('[CloudSync] Gagal membaca list identitas tenant:', err);
    return [];
  }
}

/**
 * Listener sinkronisasi perubahan data tenant di window/tab browser
 */
export function subscribeToTenantCloudChanges(
  storeSlug: string,
  onTenantUpdate: (moduleKey: string, data: any) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const effectiveSlug = (storeSlug || getStoreSlugFromUrl() || 'default').toLowerCase();

  const handleSyncEvent = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail && customEvent.detail.slug === effectiveSlug) {
      onTenantUpdate(customEvent.detail.moduleKey, customEvent.detail.data);
    }
  };

  window.addEventListener('tenant_cloud_synced', handleSyncEvent);

  return () => {
    window.removeEventListener('tenant_cloud_synced', handleSyncEvent);
  };
}
