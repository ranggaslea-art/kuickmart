import { getSupabase } from '../lib/supabase';
import { getStoreSlugFromUrl, isDefaultStore, getTenantStorageKey } from './tenantHelper';
import { Product, StoreTenantIdentity, BrandHeaderFooterConfig, Voucher, ReceiptInfo, StorePromoInfo, CourierInfo, StaffUser } from '../types';

/**
 * Mapping nama key sinkronisasi cloud dengan storage key localStorage
 */
const STORAGE_KEY_MAPPING: Record<string, string> = {
  products: 'toko_online_products',
  identity: 'store_tenant_',
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
 * Simpan data modul tenant ke Supabase Cloud (tabel brand_configs)
 * agar langsung dapat dilihat dan disinkronkan oleh perangkat/hardware online lainnya.
 */
export async function saveTenantDataToCloud<T = any>(
  moduleKey: string,
  data: T,
  storeSlug?: string
): Promise<boolean> {
  const effectiveSlug = (storeSlug || (typeof window !== 'undefined' ? getStoreSlugFromUrl() : 'default') || 'default').toLowerCase();
  const cloudDocId = `tenant_${moduleKey}_${effectiveSlug}`;
  const now = new Date().toISOString();

  // 1. Simpan segera ke localStorage lokal untuk responsivitas instan
  if (typeof window !== 'undefined') {
    try {
      const baseKey = STORAGE_KEY_MAPPING[moduleKey] || `toko_online_${moduleKey}`;
      const localKey = moduleKey === 'identity' 
        ? `${baseKey}${effectiveSlug}` 
        : getTenantStorageKey(baseKey, effectiveSlug);
      localStorage.setItem(localKey, JSON.stringify(data));
    } catch (e) {
      console.warn(`[CloudSync] Gagal menyimpan ke localStorage untuk ${moduleKey}:`, e);
    }
  }

  // 2. Simpan ke Supabase Cloud tabel brand_configs
  const supabase = getSupabase();
  if (!supabase) {
    return false;
  }

  try {
    const payload = {
      id: cloudDocId,
      config_json: {
        moduleKey,
        slug: effectiveSlug,
        data,
        updatedAt: now,
      },
      updated_at: now,
    };

    const { error } = await supabase.from('brand_configs').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn(`[CloudSync] Error upsert Supabase untuk ${cloudDocId}:`, error.message);
      return false;
    }

    // 3. Broadcast event lokal untuk sinkronisasi komponen di window saat ini
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('tenant_cloud_synced', {
          detail: { moduleKey, slug: effectiveSlug, data, timestamp: now },
        })
      );
    }

    return true;
  } catch (err) {
    console.warn(`[CloudSync] Exception saat saveTenantDataToCloud (${cloudDocId}):`, err);
    return false;
  }
}

/**
 * Ambil data modul tenant dari Supabase Cloud.
 * Jika ditemukan, otomatis memperbarui cache localStorage lokal.
 */
export async function fetchTenantDataFromCloud<T = any>(
  moduleKey: string,
  storeSlug?: string
): Promise<T | null> {
  const effectiveSlug = (storeSlug || (typeof window !== 'undefined' ? getStoreSlugFromUrl() : 'default') || 'default').toLowerCase();
  const cloudDocId = `tenant_${moduleKey}_${effectiveSlug}`;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('brand_configs')
        .select('*')
        .eq('id', cloudDocId)
        .maybeSingle();

      if (!error && data && data.config_json && data.config_json.data !== undefined) {
        const cloudData = data.config_json.data as T;

        // Perbarui cache localStorage lokal
        if (typeof window !== 'undefined') {
          try {
            const baseKey = STORAGE_KEY_MAPPING[moduleKey] || `toko_online_${moduleKey}`;
            const localKey = moduleKey === 'identity' 
              ? `${baseKey}${effectiveSlug}` 
              : getTenantStorageKey(baseKey, effectiveSlug);
            localStorage.setItem(localKey, JSON.stringify(cloudData));
          } catch {}
        }

        return cloudData;
      }
    } catch (err) {
      console.warn(`[CloudSync] Exception saat fetchTenantDataFromCloud (${cloudDocId}):`, err);
    }
  }

  // Fallback membaca dari localStorage lokal
  if (typeof window !== 'undefined') {
    try {
      const baseKey = STORAGE_KEY_MAPPING[moduleKey] || `toko_online_${moduleKey}`;
      const localKey = moduleKey === 'identity' 
        ? `${baseKey}${effectiveSlug}` 
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
 * Listener Real-time Supabase untuk perubahan data tenant di semua hardware/perangkat.
 */
export function subscribeToTenantCloudChanges(
  storeSlug: string,
  onTenantUpdate: (moduleKey: string, data: any) => void
): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const effectiveSlug = (storeSlug || (typeof window !== 'undefined' ? getStoreSlugFromUrl() : 'default') || 'default').toLowerCase();
  const channelName = `tenant-sync-${effectiveSlug}-${Math.random().toString(36).substring(2, 7)}`;

  try {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'brand_configs',
        },
        (payload: any) => {
          const row = payload.new || payload.old;
          if (row && typeof row.id === 'string' && row.id.startsWith('tenant_')) {
            const match = row.id.match(/^tenant_([a-zA-Z0-9_-]+)_(.+)$/);
            if (match) {
              const [, modKey, rowSlug] = match;
              if (rowSlug.toLowerCase() === effectiveSlug && payload.new?.config_json) {
                const updatedData = payload.new.config_json.data;
                // Update local storage
                if (typeof window !== 'undefined') {
                  try {
                    const baseKey = STORAGE_KEY_MAPPING[modKey] || `toko_online_${modKey}`;
                    const localKey = modKey === 'identity' 
                      ? `${baseKey}${effectiveSlug}` 
                      : getTenantStorageKey(baseKey, effectiveSlug);
                    localStorage.setItem(localKey, JSON.stringify(updatedData));
                  } catch {}
                }
                onTenantUpdate(modKey, updatedData);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[CloudSync] Realtime subscription error:', err);
    return () => {};
  }
}
