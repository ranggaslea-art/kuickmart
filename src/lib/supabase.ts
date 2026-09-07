import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Product, 
  Order, 
  MemberProfile, 
  Store, 
  Category, 
  Voucher, 
  CartItem,
  BrandHeaderFooterConfig,
  ReceiptInfo,
  StorePromoInfo,
  CourierInfo,
  StaffUser
} from '../types';
import { 
  PRODUCTS, 
  INITIAL_STORES, 
  CATEGORIES, 
  VOUCHERS,
  INITIAL_BRAND_CONFIG,
  INITIAL_RECEIPT_CONFIGS,
  INITIAL_STORE_PROMOS,
  INITIAL_COURIERS,
  INITIAL_STAFF_USERS
} from '../data/mockData';

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
  brandConfig?: BrandHeaderFooterConfig;
  receiptConfigs?: ReceiptInfo[];
  storePromos?: StorePromoInfo[];
  couriers?: CourierInfo[];
  staffUsers?: StaffUser[];
}): Promise<{ success: boolean; message: string; count?: number }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Supabase client belum terhubung. Konfigurasi kredensial terlebih dahulu.' };
  }

  const storesToSeed = customData?.stores && customData.stores.length > 0 ? customData.stores : INITIAL_STORES;
  const categoriesToSeed = customData?.categories && customData.categories.length > 0 ? customData.categories : CATEGORIES;
  const vouchersToSeed = customData?.vouchers && customData.vouchers.length > 0 ? customData.vouchers : VOUCHERS;
  const productsToSeed = customData?.products && customData.products.length > 0 ? customData.products : PRODUCTS;
  const brandConfigToSeed = customData?.brandConfig || INITIAL_BRAND_CONFIG;
  const receiptConfigsToSeed = customData?.receiptConfigs && customData.receiptConfigs.length > 0 ? customData.receiptConfigs : INITIAL_RECEIPT_CONFIGS;
  const storePromosToSeed = customData?.storePromos && customData.storePromos.length > 0 ? customData.storePromos : INITIAL_STORE_PROMOS;
  const couriersToSeed = customData?.couriers && customData.couriers.length > 0 ? customData.couriers : INITIAL_COURIERS;
  const staffUsersToSeed = customData?.staffUsers && customData.staffUsers.length > 0 ? customData.staffUsers : INITIAL_STAFF_USERS;

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

    // 5. Seed Brand Configuration (Header & Footer)
    await supabase.from('brand_configs').upsert({
      id: 'default',
      config_json: brandConfigToSeed,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    // 6. Seed Receipt Configurations (Struk Kasir)
    const receiptsPayload = receiptConfigsToSeed.map((r) => ({
      id: r.id,
      store_id: r.storeId || null,
      profile_name: r.profileName,
      header_brand: r.headerBrand,
      sub_header: r.subHeader || null,
      store_name: r.storeName,
      address: r.address,
      city: r.city || null,
      phone: r.phone,
      tax_id_or_npwp: r.taxIdOrNpwp || null,
      website_or_social: r.websiteOrSocial || null,
      cashier_name: r.cashierName || null,
      footer_message1: r.footerMessage1,
      footer_message2: r.footerMessage2 || null,
      cs_hotline: r.csHotline || null,
      show_barcode: r.showBarcode ?? true,
      show_store_logo: r.showStoreLogo ?? true,
      paper_width: r.paperWidth || '58mm',
      is_default: r.isDefault ?? false,
      updated_at: new Date().toISOString()
    }));
    await supabase.from('receipt_configs').upsert(receiptsPayload, { onConflict: 'id' });

    // 7. Seed Store Promos
    const promosPayload = storePromosToSeed.map((p) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      subtitle: p.subtitle || null,
      badge_text: p.badgeText || null,
      badge_color: p.badgeColor || null,
      cta_text: p.ctaText || null,
      target_category: p.targetCategory || null,
      discount_value: p.discountValue || null,
      bg_gradient: p.bgGradient || null,
      image_url: p.imageUrl || null,
      flash_hours: p.flashHours ?? 0,
      flash_minutes: p.flashMinutes ?? 0,
      is_active: p.isActive ?? true,
      order_seq: p.orderSeq ?? 0,
      valid_until: p.validUntil || null,
      store_id: p.storeId || null,
      updated_at: new Date().toISOString()
    }));
    await supabase.from('store_promos').upsert(promosPayload, { onConflict: 'id' });

    // 8. Seed Couriers
    const couriersPayload = couriersToSeed.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      whatsapp: c.whatsapp || null,
      vehicle_type: c.vehicleType,
      vehicle_plate: c.vehiclePlate,
      photo: c.photo || null,
      is_verified: c.isVerified ?? true,
      status: c.status || 'available',
      rating: c.rating ?? 4.9,
      total_deliveries: c.totalDeliveries ?? 0,
      store_id: c.storeId || null,
      notes: c.notes || null,
      updated_at: new Date().toISOString()
    }));
    await supabase.from('couriers').upsert(couriersPayload, { onConflict: 'id' });

    // 9. Seed Staff Users
    const staffPayload = staffUsersToSeed.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      pin: u.pin,
      phone: u.phone || null,
      email: u.email || null,
      store_id: u.storeId || null,
      store_name: u.storeName || null,
      is_active: u.isActive ?? true,
      created_at: u.createdAt || new Date().toISOString(),
      last_login: u.lastLogin || null
    }));
    await supabase.from('staff_users').upsert(staffPayload, { onConflict: 'id' });

    return { 
      success: true, 
      message: `Berhasil sinkronisasi ${productsToSeed.length} produk, brand config, struk, promo, kurir, dan user ke Supabase!`,
      count: productsToSeed.length 
    };
  } catch (err: any) {
    return { success: false, message: `Gagal sinkron data: ${err.message || err}` };
  }
}

// Save order to Supabase (Termasuk Menyimpan Rincian Barang yang Terjual & Mengurangi Stok)
export async function syncOrderToSupabase(order: Order): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase belum terhubung' };

  try {
    // 1. Pastikan toko terdaftar di Supabase agar foreign key store_id aman
    if (order.store) {
      await saveStoreToSupabase(order.store);
    }

    // 2. Simpan atau perbarui data barang yang terjual di tabel products Supabase
    //    agar stok berkurang dan jumlah terjual (sold_count) bertambah permanen di database
    for (const item of order.items) {
      if (item.product) {
        try {
          await saveProductToSupabase(item.product);
        } catch (e) {
          console.warn('Gagal update produk terkait pesanan:', e);
        }
      }
    }

    // 3. Simpan payload pesanan utama dengan Self-Healing Schema Fallback
    const orderPayload: Record<string, any> = {
      id: order.id,
      order_number: order.orderNumber,
      store_id: order.store?.id || 'store_01',
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
      items_json: order.items,
      created_at: order.createdAt,
    };

    // Self-Healing Upsert Loop: Otomatis mendeteksi kolom yang belum ada di tabel Supabase
    // seperti 'customer_location', 'items_json', 'driver_json', dsb.
    const currentPayload: Record<string, any> = { ...orderPayload };
    let orderError: any = null;
    const maxRetries = 8;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const res = await supabase.from('orders').upsert(currentPayload, { onConflict: 'id' });
      orderError = res.error;

      if (!orderError) {
        break;
      }

      // Deteksi error jika kolom tidak ditemukan di tabel Supabase (misal: 'customer_location')
      const missingColumnMatch = orderError.message?.match(/Could not find the '([^']+)' column of/i);
      if (missingColumnMatch && missingColumnMatch[1]) {
        const missingCol = missingColumnMatch[1];
        console.warn(`Kolom '${missingCol}' belum ada di skema tabel 'orders' Supabase. Mengabaikan kolom '${missingCol}' dan menyimpan ulang...`);
        delete currentPayload[missingCol];
        continue;
      }

      break;
    }

    if (orderError) throw orderError;

    // 4. Hapus data order_items sebelumnya (jika pesanan ini diupdate statusnya)
    //    agar tidak terjadi duplikasi baris barang yang terjual
    try {
      await supabase.from('order_items').delete().eq('order_id', order.id);
    } catch {
      // Abaikan jika tabel order_items belum dibuat
    }

    // 5. Masukkan rincian item barang yang dibeli/terjual ke tabel order_items
    const itemsPayload = order.items.map((item) => {
      const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      return {
        id: generatedId,
        order_id: order.id,
        product_id: item.product?.id || null,
        product_name: item.product?.name || 'Barang Terjual',
        unit_price: item.unitPrice || item.product?.price || 0,
        quantity: item.quantity,
        subtotal: (item.unitPrice || item.product?.price || 0) * item.quantity,
        notes: item.notes || (item.selectedUnit ? `Satuan: ${item.selectedUnit}` : null),
      };
    });

    if (itemsPayload.length > 0) {
      const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload);
      if (itemsErr) {
        console.warn('Peringatan saat insert ke order_items:', itemsErr.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Sync order error:', err);
    return { success: false, error: err.message || String(err) };
  }
}

// Update stok dan jumlah terjual produk langsung di Supabase
export async function updateProductSalesAndStockInSupabase(
  productId: string,
  newStock: number,
  newSoldCount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase not connected' };

  try {
    const { error } = await supabase
      .from('products')
      .update({
        stock: newStock,
        sold_count: newSoldCount,
      })
      .eq('id', productId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn(`Update product stock & sales in Supabase failed for ${productId}:`, err);
    return { success: false, error: err.message };
  }
}

// Fetch orders & barang terjual dari Supabase
export async function fetchOrdersFromSupabase(): Promise<Order[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    let ordersData: any[] | null = null;
    const { data: withItems, error: relError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (!relError && withItems) {
      ordersData = withItems;
    } else {
      // Fallback jika relasi order_items belum terbaca di PostgREST schema cache
      const { data: fallbackOrders, error: fallbackError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (fallbackError) {
        console.warn('Gagal memuat pesanan dari Supabase:', fallbackError.message);
        return null;
      }
      ordersData = fallbackOrders;
    }

    if (!ordersData || ordersData.length === 0) return [];

    const stores = await fetchStoresFromSupabase();
    const defaultStore = stores && stores.length > 0 ? stores[0] : null;

    const parsedOrders: Order[] = ordersData.map((row: any) => {
      // 1. Rekonstruksi rincian barang terjual
      let items: CartItem[] = [];
      if (Array.isArray(row.items_json) && row.items_json.length > 0) {
        items = row.items_json;
      } else if (Array.isArray(row.order_items) && row.order_items.length > 0) {
        items = row.order_items.map((it: any): CartItem => ({
          cartItemId: it.id,
          product: {
            id: it.product_id || `prod_${it.id}`,
            name: it.product_name,
            brand: 'Umum',
            category: 'sembako-dapur',
            price: Number(it.unit_price) || 0,
            unit: 'Pcs',
            image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400',
            stock: 99,
            rating: 4.8,
            soldCount: 0,
            description: '',
            barcode: '',
          },
          quantity: Number(it.quantity) || 1,
          notes: it.notes || undefined,
          unitPrice: Number(it.unit_price) || 0,
        }));
      }

      // 2. Rekonstruksi toko
      const matchedStore = stores?.find((s) => s.id === row.store_id) || defaultStore || {
        id: row.store_id || 'store_01',
        name: 'Minimarket Terdekat',
        code: 'STR-01',
        address: 'Jl. Utama',
        city: 'Kota',
        distanceKm: 0.8,
        is24Hours: true,
        isOpen: true,
        openHours: '24 Jam Nonstop',
        phone: '08123456789',
        readyForPickup: true,
        readyForDelivery: true,
        deliveryFee: Number(row.delivery_fee) || 6000,
        minOrder: 15000,
      };

      return {
        id: row.id,
        orderNumber: row.order_number,
        createdAt: row.created_at,
        items,
        store: matchedStore,
        deliveryType: row.delivery_type || 'delivery',
        deliverySlot: row.delivery_slot || undefined,
        pickupTime: row.pickup_time || undefined,
        address: row.address_json || undefined,
        status: row.status,
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status || 'paid',
        subtotal: Number(row.subtotal) || 0,
        deliveryFee: Number(row.delivery_fee) || 0,
        discountAmount: Number(row.discount_amount) || 0,
        pointsUsed: Number(row.points_used) || 0,
        pointsEarned: Number(row.points_earned) || 0,
        total: Number(row.total) || 0,
        appliedVoucher: row.applied_voucher_code
          ? {
              id: 'v_app',
              code: row.applied_voucher_code,
              title: 'Voucher Promo',
              discountAmount: Number(row.discount_amount) || 0,
              type: 'fixed',
              minSpend: 0,
              validUntil: '2026-12-31',
              description: 'Promo Diskon',
            }
          : undefined,
        customerNotes: row.customer_notes || undefined,
        customerLocation: row.customer_location || row.address_json?.customerLocation || (
          row.address_json?.latitude && row.address_json?.longitude
            ? {
                latitude: row.address_json.latitude,
                longitude: row.address_json.longitude,
                mapsUrl: row.address_json.mapsUrl,
                recordedAt: row.address_json.recordedAt,
                accuracy: row.address_json.accuracy,
              }
            : undefined
        ),
        driver: row.driver_json || undefined,
        trackingSteps: Array.isArray(row.tracking_steps) ? row.tracking_steps : [],
      };
    });

    return parsedOrders;
  } catch (err: any) {
    console.warn('Exception saat fetchOrdersFromSupabase:', err);
    return null;
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

// -------------------------------------------------------------
// 1. BRAND CONFIGURATION (Header & Footer Brand, Logo, Slogan)
// -------------------------------------------------------------
export async function fetchBrandConfigFromSupabase(): Promise<BrandHeaderFooterConfig | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('brand_configs').select('*').eq('id', 'default').maybeSingle();
    if (error || !data || !data.config_json) return null;
    return data.config_json as BrandHeaderFooterConfig;
  } catch (e) {
    console.warn('Gagal memuat brand config dari Supabase:', e);
    return null;
  }
}

export async function saveBrandConfigToSupabase(config: BrandHeaderFooterConfig): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('brand_configs').upsert({
      id: 'default',
      config_json: config,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 2. RECEIPT CONFIGURATIONS (Struk Toko & Kasir)
// -------------------------------------------------------------
export async function fetchReceiptConfigsFromSupabase(): Promise<ReceiptInfo[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('receipt_configs').select('*').order('updated_at', { ascending: false });
    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      storeId: row.store_id || undefined,
      profileName: row.profile_name,
      headerBrand: row.header_brand,
      subHeader: row.sub_header || undefined,
      storeName: row.store_name,
      address: row.address,
      city: row.city || undefined,
      phone: row.phone,
      taxIdOrNpwp: row.tax_id_or_npwp || undefined,
      websiteOrSocial: row.website_or_social || undefined,
      cashierName: row.cashier_name || undefined,
      footerMessage1: row.footer_message1,
      footerMessage2: row.footer_message2 || undefined,
      csHotline: row.cs_hotline || undefined,
      showBarcode: row.show_barcode ?? true,
      showStoreLogo: row.show_store_logo ?? true,
      paperWidth: row.paper_width || '58mm',
      isDefault: row.is_default ?? false,
      updatedAt: row.updated_at,
    }));
  } catch (e) {
    return null;
  }
}

export async function saveReceiptConfigToSupabase(receipt: ReceiptInfo): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const payload = {
      id: receipt.id,
      store_id: receipt.storeId || null,
      profile_name: receipt.profileName,
      header_brand: receipt.headerBrand,
      sub_header: receipt.subHeader || null,
      store_name: receipt.storeName,
      address: receipt.address,
      city: receipt.city || null,
      phone: receipt.phone,
      tax_id_or_npwp: receipt.taxIdOrNpwp || null,
      website_or_social: receipt.websiteOrSocial || null,
      cashier_name: receipt.cashierName || null,
      footer_message1: receipt.footerMessage1,
      footer_message2: receipt.footerMessage2 || null,
      cs_hotline: receipt.csHotline || null,
      show_barcode: receipt.showBarcode ?? true,
      show_store_logo: receipt.showStoreLogo ?? true,
      paper_width: receipt.paperWidth || '58mm',
      is_default: receipt.isDefault ?? false,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('receipt_configs').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteReceiptConfigFromSupabase(receiptId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('receipt_configs').delete().eq('id', receiptId);
    return !error;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 3. STORE PROMOS & DISCOUNT BANNERS
// -------------------------------------------------------------
export async function fetchStorePromosFromSupabase(): Promise<StorePromoInfo[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('store_promos').select('*').order('order_seq', { ascending: true });
    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      subtitle: row.subtitle || undefined,
      badgeText: row.badge_text || undefined,
      badgeColor: row.badge_color || undefined,
      ctaText: row.cta_text || undefined,
      targetCategory: row.target_category || undefined,
      discountValue: row.discount_value || undefined,
      bgGradient: row.bg_gradient || undefined,
      imageUrl: row.image_url || undefined,
      flashHours: row.flash_hours ?? undefined,
      flashMinutes: row.flash_minutes ?? undefined,
      isActive: row.is_active ?? true,
      orderSeq: row.order_seq ?? 0,
      validUntil: row.valid_until || undefined,
      storeId: row.store_id || undefined,
      updatedAt: row.updated_at,
    }));
  } catch (e) {
    return null;
  }
}

export async function saveStorePromoToSupabase(promo: StorePromoInfo): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const payload = {
      id: promo.id,
      type: promo.type,
      title: promo.title,
      subtitle: promo.subtitle || null,
      badge_text: promo.badgeText || null,
      badge_color: promo.badgeColor || null,
      cta_text: promo.ctaText || null,
      target_category: promo.targetCategory || null,
      discount_value: promo.discountValue || null,
      bg_gradient: promo.bgGradient || null,
      image_url: promo.imageUrl || null,
      flash_hours: promo.flashHours ?? 0,
      flash_minutes: promo.flashMinutes ?? 0,
      is_active: promo.isActive ?? true,
      order_seq: promo.orderSeq ?? 0,
      valid_until: promo.validUntil || null,
      store_id: promo.storeId || null,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('store_promos').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteStorePromoFromSupabase(promoId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('store_promos').delete().eq('id', promoId);
    return !error;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 4. COURIERS & FLEET MANAGEMENT (Kurir & Armada Pengantaran)
// -------------------------------------------------------------
export async function fetchCouriersFromSupabase(): Promise<CourierInfo[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('couriers').select('*').order('name', { ascending: true });
    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      whatsapp: row.whatsapp || undefined,
      vehicleType: row.vehicle_type,
      vehiclePlate: row.vehicle_plate,
      photo: row.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      isVerified: row.is_verified ?? true,
      status: row.status || 'available',
      rating: Number(row.rating || 4.9),
      totalDeliveries: Number(row.total_deliveries || 0),
      storeId: row.store_id || undefined,
      notes: row.notes || undefined,
      updatedAt: row.updated_at,
    }));
  } catch (e) {
    return null;
  }
}

export async function saveCourierToSupabase(courier: CourierInfo): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const payload = {
      id: courier.id,
      name: courier.name,
      phone: courier.phone,
      whatsapp: courier.whatsapp || null,
      vehicle_type: courier.vehicleType,
      vehicle_plate: courier.vehiclePlate,
      photo: courier.photo || null,
      is_verified: courier.isVerified ?? true,
      status: courier.status || 'available',
      rating: courier.rating ?? 4.9,
      total_deliveries: courier.totalDeliveries ?? 0,
      store_id: courier.storeId || null,
      notes: courier.notes || null,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('couriers').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteCourierFromSupabase(courierId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('couriers').delete().eq('id', courierId);
    return !error;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 5. STAFF USERS (Manajemen User Staff/Kasir/Admin/Supervisor)
// -------------------------------------------------------------
export async function fetchStaffUsersFromSupabase(): Promise<StaffUser[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('staff_users').select('*').order('created_at', { ascending: false });
    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      username: row.username,
      name: row.name,
      role: row.role,
      pin: row.pin,
      phone: row.phone || undefined,
      email: row.email || undefined,
      storeId: row.store_id || undefined,
      storeName: row.store_name || undefined,
      isActive: row.is_active ?? true,
      createdAt: row.created_at,
      lastLogin: row.last_login || undefined,
    }));
  } catch (e) {
    return null;
  }
}

export async function saveStaffUserToSupabase(user: StaffUser): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const payload = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      pin: user.pin,
      phone: user.phone || null,
      email: user.email || null,
      store_id: user.storeId || null,
      store_name: user.storeName || null,
      is_active: user.isActive ?? true,
      created_at: user.createdAt || new Date().toISOString(),
      last_login: user.lastLogin || null,
    };
    const { error } = await supabase.from('staff_users').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteStaffUserFromSupabase(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('staff_users').delete().eq('id', userId);
    return !error;
  } catch {
    return false;
  }
}

