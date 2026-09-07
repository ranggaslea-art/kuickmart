import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Order, MemberProfile, Store, Category, Voucher } from '../types';
import { PRODUCTS, INITIAL_STORES, CATEGORIES, VOUCHERS } from '../data/mockData';

const STORAGE_KEY_URL = 'nusamart_supabase_url';
const STORAGE_KEY_KEY = 'nusamart_supabase_anon_key';

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const metaEnv = (import.meta as any).env || {};
  const envUrl = metaEnv.VITE_SUPABASE_URL || '';
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

  const savedUrl = localStorage.getItem(STORAGE_KEY_URL) || envUrl;
  const savedKey = localStorage.getItem(STORAGE_KEY_KEY) || envKey;

  return { url: savedUrl, anonKey: savedKey };
}

export function saveStoredSupabaseConfig(url: string, anonKey: string): void {
  if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
  else localStorage.removeItem(STORAGE_KEY_URL);

  if (anonKey) localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  else localStorage.removeItem(STORAGE_KEY_KEY);
}

let supabaseInstance: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseConfig();
  if (!url || !anonKey) {
    return null;
  }

  const key = `${url}_${anonKey}`;
  if (!supabaseInstance || currentConfigKey !== key) {
    try {
      supabaseInstance = createClient(url, anonKey);
      currentConfigKey = key;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }

  return supabaseInstance;
}

// Test connection to Supabase
export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{ success: boolean; message: string }> {
  try {
    const targetUrl = url || getStoredSupabaseConfig().url;
    const targetKey = anonKey || getStoredSupabaseConfig().anonKey;

    if (!targetUrl || !targetKey) {
      return { success: false, message: 'URL dan Anon Key Supabase belum diisi.' };
    }

    const testClient = createClient(targetUrl, targetKey);
    // Simple query to verify connection
    const { error } = await testClient.from('products').select('count', { count: 'exact', head: true });
    
    if (error) {
      // If table doesn't exist yet, it's still a reachable database!
      if (error.code === '42P01') {
        return { 
          success: true, 
          message: 'Terhubung ke Supabase! (Tabel belum dibuat, Anda dapat mengeksekusi SQL schema).' 
        };
      }
      return { success: false, message: `Gagal query: ${error.message}` };
    }

    return { success: true, message: 'Koneksi ke database Supabase berhasil & tabel terverifikasi!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Koneksi gagal diperiksa.' };
  }
}

// Seed initial or current catalog data to Supabase
export async function seedDataToSupabase(customData?: {
  products?: Product[];
  stores?: Store[];
  categories?: Category[];
  vouchers?: Voucher[];
}): Promise<{ success: boolean; message: string; count?: number }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Supabase client belum terhubung. Konfigurasi kredensial terlebih dahulu.' };
  }

  const storesToSeed = customData?.stores && customData.stores.length > 0 ? customData.stores : INITIAL_STORES;
  const categoriesToSeed = customData?.categories && customData.categories.length > 0 ? customData.categories : CATEGORIES;
  const vouchersToSeed = customData?.vouchers && customData.vouchers.length > 0 ? customData.vouchers : VOUCHERS;
  const productsToSeed = customData?.products && customData.products.length > 0 ? customData.products : PRODUCTS;

  try {
    // 1. Seed Stores
    const storesPayload = storesToSeed.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      address: s.address,
      city: s.city,
      distance_km: s.distanceKm,
      is_24_hours: s.is24Hours,
      is_open: s.isOpen,
      open_hours: s.openHours,
      phone: s.phone,
      ready_for_pickup: s.readyForPickup,
      ready_for_delivery: s.readyForDelivery,
      delivery_fee: s.deliveryFee,
      min_order: s.minOrder,
    }));
    await supabase.from('stores').upsert(storesPayload, { onConflict: 'id' });

    // 2. Seed Categories
    const categoriesPayload = categoriesToSeed.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      badge: c.badge || null,
      color: c.color || null,
    }));
    await supabase.from('categories').upsert(categoriesPayload, { onConflict: 'id' });

    // 3. Seed Vouchers
    const vouchersPayload = vouchersToSeed.map((v) => ({
      id: v.id,
      code: v.code,
      title: v.title,
      discount_amount: v.discountAmount,
      type: v.type,
      min_spend: v.minSpend,
      max_discount: v.maxDiscount || null,
      valid_until: v.validUntil,
      description: v.description,
    }));
    await supabase.from('vouchers').upsert(vouchersPayload, { onConflict: 'id' });

    // 4. Seed Products
    const productsPayload = productsToSeed.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category_slug: p.category,
      subcategory: p.subcategory || null,
      price: p.price,
      original_price: p.originalPrice || null,
      discount_percent: p.discountPercent || 0,
      unit: p.unit,
      image: p.image,
      stock: p.stock,
      rating: p.rating,
      sold_count: p.soldCount,
      tags: p.tags || [],
      description: p.description,
      barcode: p.barcode,
      is_popular: p.isPopular || false,
    }));
    const { error: prodError } = await supabase.from('products').upsert(productsPayload, { onConflict: 'id' });

    if (prodError) throw prodError;

    return { 
      success: true, 
      message: `Berhasil sinkronisasi ${productsToSeed.length} produk & data master toko ke Supabase!`,
      count: productsToSeed.length 
    };
  } catch (err: any) {
    return { success: false, message: `Gagal sinkron data: ${err.message || err}` };
  }
}

// Save order to Supabase
export async function syncOrderToSupabase(order: Order): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase not connected' };

  try {
    const orderPayload = {
      id: order.id,
      order_number: order.orderNumber,
      store_id: order.store.id,
      delivery_type: order.deliveryType,
      delivery_slot: order.deliverySlot || null,
      pickup_time: order.pickupTime || null,
      address_json: order.address
        ? {
            ...order.address,
            customerLocation: order.customerLocation,
            latitude: order.customerLocation?.latitude || order.address.latitude,
            longitude: order.customerLocation?.longitude || order.address.longitude,
            mapsUrl: order.customerLocation?.mapsUrl || order.address.mapsUrl,
            recordedAt: order.customerLocation?.recordedAt || order.address.recordedAt,
            accuracy: order.customerLocation?.accuracy || order.address.accuracy,
          }
        : null,
      customer_location: order.customerLocation || null,
      status: order.status,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      discount_amount: order.discountAmount,
      points_used: order.pointsUsed,
      points_earned: order.pointsEarned,
      total: order.total,
      applied_voucher_code: order.appliedVoucher?.code || null,
      customer_notes: order.customerNotes || null,
      driver_json: order.driver || null,
      tracking_steps: order.trackingSteps,
      created_at: order.createdAt,
    };

    const { error: orderError } = await supabase.from('orders').upsert(orderPayload, { onConflict: 'id' });
    if (orderError) throw orderError;

    // Insert order items
    const itemsPayload = order.items.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      product_name: item.product.name,
      unit_price: item.product.price,
      quantity: item.quantity,
      subtotal: item.product.price * item.quantity,
      notes: item.notes || null,
    }));

    if (itemsPayload.length > 0) {
      await supabase.from('order_items').insert(itemsPayload);
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Sync order error:', err);
    return { success: false, error: err.message };
  }
}

// Fetch products from Supabase
export async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from('products').select('*').order('sold_count', { ascending: false });
    if (error || !data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      brand: row.brand,
      category: row.category_slug,
      subcategory: row.subcategory,
      price: Number(row.price),
      originalPrice: row.original_price ? Number(row.original_price) : undefined,
      discountPercent: row.discount_percent,
      unit: row.unit,
      image: row.image,
      stock: row.stock,
      rating: Number(row.rating),
      soldCount: row.sold_count,
      tags: row.tags,
      description: row.description,
      barcode: row.barcode,
      isPopular: row.is_popular,
    }));
  } catch (e) {
    return null;
  }
}

// Fetch stores from Supabase
export async function fetchStoresFromSupabase(): Promise<Store[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from('stores').select('*').order('name');
    if (error || !data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      address: row.address,
      city: row.city,
      distanceKm: Number(row.distance_km || 1.0),
      is24Hours: Boolean(row.is_24_hours),
      isOpen: Boolean(row.is_open),
      openHours: row.open_hours || '24 Jam Nonstop',
      phone: row.phone,
      readyForPickup: Boolean(row.ready_for_pickup),
      readyForDelivery: Boolean(row.ready_for_delivery),
      deliveryFee: Number(row.delivery_fee || 6000),
      minOrder: Number(row.min_order || 15000),
    }));
  } catch (e) {
    return null;
  }
}

// Fetch categories from Supabase
export async function fetchCategoriesFromSupabase(): Promise<Category[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error || !data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      icon: row.icon,
      badge: row.badge || undefined,
      color: row.color || undefined,
    }));
  } catch (e) {
    return null;
  }
}

// Fetch vouchers from Supabase
export async function fetchVouchersFromSupabase(): Promise<Voucher[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });
    if (error || !data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      code: row.code,
      title: row.title,
      discountAmount: Number(row.discount_amount),
      type: row.type,
      minSpend: Number(row.min_spend || 0),
      maxDiscount: row.max_discount ? Number(row.max_discount) : undefined,
      validUntil: row.valid_until,
      description: row.description,
    }));
  } catch (e) {
    return null;
  }
}

// Save single product to Supabase
export async function saveProductToSupabase(product: Product): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Klien Supabase belum terhubung.' };
  try {
    const payload = {
      id: product.id,
      name: product.name || 'Produk Baru',
      brand: product.brand || 'Umum',
      category_slug: product.category || 'sembako-dapur',
      subcategory: product.subcategory || null,
      price: Number(product.price) || 0,
      original_price: product.originalPrice ? Number(product.originalPrice) : null,
      discount_percent: Number(product.discountPercent) || 0,
      unit: product.unit || 'Pcs',
      image: product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400',
      stock: Number(product.stock) || 0,
      rating: Number(product.rating) || 4.8,
      sold_count: Number(product.soldCount) || 0,
      tags: Array.isArray(product.tags) ? product.tags : [],
      description: product.description || '',
      barcode: product.barcode || '',
      is_popular: Boolean(product.isPopular),
    };
    const { error } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Supabase upsert product error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Supabase save product exception:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

// Delete product from Supabase
export async function deleteProductFromSupabase(productId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Klien Supabase belum terhubung.' };
  try {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
      console.error('Supabase delete product error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Supabase delete product exception:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

// Save single store to Supabase
export async function saveStoreToSupabase(store: Store): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const payload = {
      id: store.id,
      name: store.name,
      code: store.code,
      address: store.address,
      city: store.city,
      distance_km: store.distanceKm,
      is_24_hours: store.is24Hours,
      is_open: store.isOpen,
      open_hours: store.openHours,
      phone: store.phone,
      ready_for_pickup: store.readyForPickup,
      ready_for_delivery: store.readyForDelivery,
      delivery_fee: store.deliveryFee,
      min_order: store.minOrder,
    };
    const { error } = await supabase.from('stores').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

// Delete store from Supabase
export async function deleteStoreFromSupabase(storeId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('stores').delete().eq('id', storeId);
    return !error;
  } catch {
    return false;
  }
}

// Save voucher to Supabase
export async function saveVoucherToSupabase(voucher: Voucher): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const payload = {
      id: voucher.id,
      code: voucher.code,
      title: voucher.title,
      discount_amount: voucher.discountAmount,
      type: voucher.type,
      min_spend: voucher.minSpend,
      max_discount: voucher.maxDiscount || null,
      valid_until: voucher.validUntil,
      description: voucher.description,
    };
    const { error } = await supabase.from('vouchers').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

// Delete voucher from Supabase
export async function deleteVoucherFromSupabase(voucherId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('vouchers').delete().eq('id', voucherId);
    return !error;
  } catch {
    return false;
  }
}

