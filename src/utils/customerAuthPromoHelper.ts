import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CustomerAuthPromoConfig } from '../types';
import { getTenantStorageKey } from './tenantHelper';

export const DEFAULT_CUSTOMER_AUTH_PROMO: CustomerAuthPromoConfig = {
  bonusPoints: 500,
  bonusStamps: 1,
  bannerTitle: 'Bonus Pendaftaran Gratis:',
  bannerDescription: 'Dapatkan langsung 500 Poin Loyalitas + 1 Stamp Belanja untuk diskon pesanan Anda!',
  submitButtonText: 'Daftar Sekarang & Klaim 500 Poin',
  badgeText: 'Member & Poin',
  signInNote: 'Masuk dengan akun WhatsApp atau email Anda untuk menggunakan poin diskon dan riwayat belanja.',
  showPromoBanner: true,
  accentColor: 'amber',
  lastUpdated: new Date().toISOString()
};

const BASE_STORAGE_KEY = 'lapakoke_customer_auth_promo_config';

export function getCustomerAuthPromoStorageKey(slug?: string): string {
  return getTenantStorageKey(BASE_STORAGE_KEY, slug);
}

export function loadCustomerAuthPromoConfig(slug?: string): CustomerAuthPromoConfig {
  if (typeof window === 'undefined') return DEFAULT_CUSTOMER_AUTH_PROMO;
  try {
    const key = getCustomerAuthPromoStorageKey(slug);
    const raw = localStorage.getItem(key) || localStorage.getItem(BASE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_CUSTOMER_AUTH_PROMO,
          ...parsed,
          bonusPoints: typeof parsed.bonusPoints === 'number' ? parsed.bonusPoints : DEFAULT_CUSTOMER_AUTH_PROMO.bonusPoints,
          bonusStamps: typeof parsed.bonusStamps === 'number' ? parsed.bonusStamps : DEFAULT_CUSTOMER_AUTH_PROMO.bonusStamps
        };
      }
    }
  } catch (e) {
    console.warn('Error reading customer promo config from localStorage', e);
  }
  return DEFAULT_CUSTOMER_AUTH_PROMO;
}

export async function saveCustomerAuthPromoConfig(
  config: CustomerAuthPromoConfig,
  slug?: string
): Promise<boolean> {
  const updated: CustomerAuthPromoConfig = {
    ...config,
    lastUpdated: new Date().toISOString()
  };

  // 1. LocalStorage
  try {
    const key = getCustomerAuthPromoStorageKey(slug);
    localStorage.setItem(key, JSON.stringify(updated));
    localStorage.setItem(BASE_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error saving customer promo config to localStorage', e);
  }

  // 2. Firestore Sync
  try {
    const docId = slug && slug !== 'default' ? `promo_${slug}` : 'promo_default';
    const docRef = doc(db, 'store_settings', docId);
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.warn('Notice: Firestore save promo settings offline fallback', err);
  }

  return true;
}

export async function fetchOnlineCustomerAuthPromoConfig(
  slug?: string
): Promise<CustomerAuthPromoConfig | null> {
  try {
    const docId = slug && slug !== 'default' ? `promo_${slug}` : 'promo_default';
    const docRef = doc(db, 'store_settings', docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as CustomerAuthPromoConfig;
      if (data && typeof data === 'object') {
        const merged: CustomerAuthPromoConfig = {
          ...DEFAULT_CUSTOMER_AUTH_PROMO,
          ...data
        };
        // Save to cache
        const key = getCustomerAuthPromoStorageKey(slug);
        localStorage.setItem(key, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (e) {
    // Offline fallback
  }
  return null;
}
