/**
 * Database Settings Manager
 * Menyimpan dan meload semua pengaturan aplikasi dari Database (MySQL / Server Store DB)
 * sebagai patokan utama (single source of truth) aplikasi.
 */

import { BrandHeaderFooterConfig, StoreTenantIdentity, ReceiptInfo, StorePromoInfo, CourierInfo } from '../types';
import { INITIAL_BRAND_CONFIG } from '../data/mockData';
import { getStoreSlugFromUrl, syncBrandConfigFromTenant, normalizeTenantSlug } from './tenantHelper';
import { updateAddressBarFavicon } from './faviconHelper';

export interface AppSettingsPayload {
  slug?: string;
  brandConfig?: BrandHeaderFooterConfig;
  tenant?: StoreTenantIdentity;
  receiptConfigs?: ReceiptInfo[];
  storePromos?: StorePromoInfo[];
  couriers?: CourierInfo[];
}

export interface AppSettingsResponse {
  success: boolean;
  slug: string;
  brandConfig?: BrandHeaderFooterConfig;
  tenant?: StoreTenantIdentity;
  receiptConfigs?: ReceiptInfo[];
  storePromos?: StorePromoInfo[];
  couriers?: CourierInfo[];
  source?: 'database' | 'local_fallback';
  updatedAt?: string;
}

/**
 * Muat seluruh pengaturan aplikasi dari Database Server
 */
export async function loadAppSettingsFromDatabase(
  storeSlug?: string
): Promise<AppSettingsResponse | null> {
  const cleanSlug = normalizeTenantSlug(
    storeSlug || (typeof window !== 'undefined' ? getStoreSlugFromUrl() : 'default')
  );

  try {
    const res = await fetch(`/api/app-settings?slug=${encodeURIComponent(cleanSlug)}`, {
      headers: {
        'Accept': 'application/json',
        'x-tenant-slug': cleanSlug,
      },
      cache: 'no-cache',
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.settings) {
        const settings = data.settings;
        const brandConfig: BrandHeaderFooterConfig = settings.brandConfig
          ? { ...INITIAL_BRAND_CONFIG, ...settings.brandConfig }
          : (settings.tenant ? syncBrandConfigFromTenant(settings.tenant, INITIAL_BRAND_CONFIG) : INITIAL_BRAND_CONFIG);

        const tenant: StoreTenantIdentity | undefined = settings.tenant;

        // Segera sinkronkan logo address bar sesuai database
        if (typeof window !== 'undefined') {
          updateAddressBarFavicon({
            imageUrl: brandConfig.brandLogoImageUrl || tenant?.logoUrl,
            text: brandConfig.brandLogoText || tenant?.logoText,
            storeName: tenant?.storeName || brandConfig.brandNamePart1,
            primaryColor: tenant?.primaryColor,
          });

          // Cache lokal untuk offline fallback
          try {
            if (brandConfig) {
              localStorage.setItem(`toko_online_brand_config_${cleanSlug}`, JSON.stringify(brandConfig));
              if (cleanSlug === 'default') {
                localStorage.setItem('toko_online_brand_config', JSON.stringify(brandConfig));
                localStorage.setItem('kuickmart_brand_config', JSON.stringify(brandConfig));
              }
            }
          } catch {}
        }

        return {
          success: true,
          slug: cleanSlug,
          brandConfig,
          tenant,
          receiptConfigs: settings.receiptConfigs,
          storePromos: settings.storePromos,
          couriers: settings.couriers,
          source: 'database',
          updatedAt: settings.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('[AppSettingsDatabase] Gagal mengambil settingan dari database:', err);
  }

  return null;
}

/**
 * Simpan seluruh konfigurasi aplikasi langsung ke Database Server
 */
export async function saveAppSettingsToDatabase(
  payload: AppSettingsPayload,
  storeSlug?: string
): Promise<boolean> {
  const cleanSlug = normalizeTenantSlug(
    storeSlug || payload.slug || (typeof window !== 'undefined' ? getStoreSlugFromUrl() : 'default')
  );

  const fullPayload: AppSettingsPayload = {
    ...payload,
    slug: cleanSlug,
  };

  // Segera perbarui logo address bar jika payload menyertakan brandConfig atau tenant
  if (typeof window !== 'undefined') {
    const brand = fullPayload.brandConfig;
    const tenant = fullPayload.tenant;
    if (brand || tenant) {
      updateAddressBarFavicon({
        imageUrl: brand?.brandLogoImageUrl || tenant?.logoUrl,
        text: brand?.brandLogoText || tenant?.logoText,
        storeName: tenant?.storeName || brand?.brandNamePart1,
        primaryColor: tenant?.primaryColor,
      });
    }
  }

  try {
    const res = await fetch('/api/app-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-slug': cleanSlug,
      },
      body: JSON.stringify(fullPayload),
    });

    if (res.ok) {
      const result = await res.json();
      if (result && result.success) {
        // Broadcast pembaruan ke komponen lain
        if (typeof window !== 'undefined') {
          if (fullPayload.brandConfig) {
            window.dispatchEvent(
              new CustomEvent('brand_config_updated', { detail: fullPayload.brandConfig })
            );
          }
          if (fullPayload.tenant) {
            window.dispatchEvent(
              new CustomEvent('store_tenant_updated', { detail: fullPayload.tenant })
            );
          }
          window.dispatchEvent(
            new CustomEvent('app_settings_database_synced', { detail: fullPayload })
          );
        }
        return true;
      }
    }
  } catch (err) {
    console.warn('[AppSettingsDatabase] Gagal menyimpan settingan ke database server:', err);
  }

  return false;
}
