import React, { useState, useEffect, useMemo } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  HeroBanner 
} from './components/HeroBanner';
import { 
  CategoryBar 
} from './components/CategoryBar';
import { 
  ProductCard 
} from './components/ProductCard';
import { 
  ProductDetailModal 
} from './components/ProductDetailModal';
import { 
  CartDrawer 
} from './components/CartDrawer';
import { 
  CheckoutModal 
} from './components/CheckoutModal';
import { 
  OrderTrackerModal 
} from './components/OrderTrackerModal';
import { 
  OrderHistoryView 
} from './components/OrderHistoryView';
import { 
  MemberCardModal 
} from './components/MemberCardModal';
import { 
  StoreSelectorModal 
} from './components/StoreSelectorModal';
import { 
  SupabaseModal 
} from './components/SupabaseModal';
import { 
  AdminPanelModal 
} from './components/AdminPanelModal';
import { 
  VisitorCounterWidget 
} from './components/VisitorCounterWidget';
import { 
  LiveTrafficModal 
} from './components/LiveTrafficModal';
import { 
  PushNotificationPrompt 
} from './components/PushNotificationPrompt';
import { cleanReceiptText } from './utils/sanitizeReceipt';
import { 
  Product, 
  Store, 
  Category,
  CartItem, 
  Voucher, 
  Address, 
  Order, 
  MemberProfile, 
  OrderStatus,
  ReceiptInfo,
  StorePromoInfo,
  CourierInfo,
  BrandHeaderFooterConfig,
  StaffUser
} from './types';
import { 
  PRODUCTS, 
  CATEGORIES, 
  INITIAL_STORES, 
  VOUCHERS, 
  INITIAL_ADDRESSES, 
  INITIAL_MEMBER,
  INITIAL_RECEIPT_CONFIGS,
  INITIAL_STORE_PROMOS,
  INITIAL_COURIERS,
  INITIAL_BRAND_CONFIG,
  INITIAL_STAFF_USERS
} from './data/mockData';
import { 
  getSupabase, 
  testSupabaseConnection, 
  syncOrderToSupabase, 
  fetchProductsFromSupabase,
  fetchStoresFromSupabase,
  fetchCategoriesFromSupabase,
  fetchVouchersFromSupabase,
  fetchOrdersFromSupabase,
  saveProductToSupabase,
  deleteProductFromSupabase,
  saveStoreToSupabase,
  saveVoucherToSupabase,
  deleteVoucherFromSupabase,
  updateProductSalesAndStockInSupabase,
  fetchBrandConfigFromSupabase,
  saveBrandConfigToSupabase,
  fetchReceiptConfigsFromSupabase,
  saveReceiptConfigToSupabase,
  deleteReceiptConfigFromSupabase,
  fetchStorePromosFromSupabase,
  saveStorePromoToSupabase,
  deleteStorePromoFromSupabase,
  fetchCouriersFromSupabase,
  saveCourierToSupabase,
  deleteCourierFromSupabase,
  fetchStaffUsersFromSupabase,
  saveStaffUserToSupabase,
  deleteStaffUserFromSupabase,
  subscribeToSupabaseChanges
} from './lib/supabase';
import { 
  Zap, 
  Sparkles, 
  SlidersHorizontal, 
  Search, 
  ShoppingBag, 
  Flame, 
  RefreshCw, 
  HelpCircle, 
  ShieldCheck, 
  Truck,
  Layers,
  Clock,
  CheckCircle2,
  MapPin,
  Phone,
  Heart,
  Star,
  CreditCard,
  Store as StoreIcon,
  Headphones,
  BadgePercent,
  ChevronRight
} from 'lucide-react';
import { formatRupiah } from './utils/formatters';
import { formatImageUrl, getProductFallbackImage } from './utils/imageHelper';

const STORAGE_CART_KEY = 'nusamart_cart';
const STORAGE_ORDERS_KEY = 'nusamart_orders';
const STORAGE_MEMBER_KEY = 'nusamart_member';
const STORAGE_VOUCHERS_KEY = 'kuickmart_vouchers';
const STORAGE_PRODUCTS_KEY = 'kuickmart_products_v2';
const STORAGE_STORES_KEY = 'kuickmart_stores';
const STORAGE_RECEIPT_CONFIGS_KEY = 'nusamart_receipt_configs';
const STORAGE_STORE_PROMOS_KEY = 'nusamart_store_promos';
const STORAGE_COURIERS_KEY = 'kuickmart_couriers';
const STORAGE_BRAND_CONFIG_KEY = 'kuickmart_brand_config';
const STORAGE_STAFF_USERS_KEY = 'kuickmart_staff_users';
const STORAGE_MY_ORDER_IDS_KEY = 'nusamart_my_order_ids';
const STORAGE_VISITOR_ID_KEY = 'nusamart_visitor_id';

const sanitizeReceiptConfigs = (configs: ReceiptInfo[]): ReceiptInfo[] => {
  return configs.map((c) => ({
    ...c,
    address: cleanReceiptText(c.address),
    city: cleanReceiptText(c.city),
    profileName: cleanReceiptText(c.profileName),
    storeName: cleanReceiptText(c.storeName),
  }));
};

const sanitizeStores = (list: Store[]): Store[] => {
  return list.map((s) => ({
    ...s,
    address: cleanReceiptText(s.address),
    city: cleanReceiptText(s.city),
  }));
};

export default function App() {
  // Visitor ID & Visitor-specific Orders
  const [visitorId] = useState<string>(() => {
    try {
      let id = localStorage.getItem(STORAGE_VISITOR_ID_KEY);
      if (!id) {
        id = 'vis_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem(STORAGE_VISITOR_ID_KEY, id);
      }
      return id;
    } catch {
      return 'vis_' + Date.now().toString(36);
    }
  });

  const [myOrderIds, setMyOrderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MY_ORDER_IDS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MY_ORDER_IDS_KEY, JSON.stringify(myOrderIds));
    } catch (e) {
      console.warn('Gagal menyimpan myOrderIds:', e);
    }
  }, [myOrderIds]);
  // Products & Catalogs
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PRODUCTS_KEY);
      const rawList: Product[] = saved ? JSON.parse(saved) : PRODUCTS;
      return rawList.map(p => ({
        ...p,
        image: formatImageUrl(p.image),
      }));
    } catch {
      return PRODUCTS;
    }
  });
  const [stores, setStores] = useState<Store[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STORES_KEY);
      const list = saved ? JSON.parse(saved) : INITIAL_STORES;
      return sanitizeStores(list);
    } catch {
      return sanitizeStores(INITIAL_STORES);
    }
  });
  const [currentStore, setCurrentStore] = useState<Store>(() => {
    const list = sanitizeStores(INITIAL_STORES);
    return list[0];
  });
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [vouchers, setVouchers] = useState<Voucher[]>(() => {
    const saved = localStorage.getItem(STORAGE_VOUCHERS_KEY);
    return saved ? JSON.parse(saved) : VOUCHERS;
  });
  const [addresses, setAddresses] = useState<Address[]>(INITIAL_ADDRESSES);
  const [currentAddress, setCurrentAddress] = useState<Address>(INITIAL_ADDRESSES[0]);
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');

  // Member & Loyalty
  const [member, setMember] = useState<MemberProfile>(() => {
    const saved = localStorage.getItem(STORAGE_MEMBER_KEY);
    return saved ? JSON.parse(saved) : INITIAL_MEMBER;
  });

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_CART_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Orders State
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(STORAGE_ORDERS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'popular' | 'price-asc' | 'price-desc' | 'discount'>('popular');

  // Checkout discounts & points
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(() => {
    const saved = localStorage.getItem(STORAGE_VOUCHERS_KEY);
    const initialList = saved ? JSON.parse(saved) : VOUCHERS;
    return initialList.length > 0 ? initialList[0] : null;
  });
  const [usePoints, setUsePoints] = useState<boolean>(false);

  // Modals & Navigation
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isStoreSelectorOpen, setIsStoreSelectorOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminPanelInitialTab, setAdminPanelInitialTab] = useState<'products' | 'orders' | 'stores' | 'vouchers' | 'users' | 'bulk_import' | 'receipts' | 'promos' | 'couriers' | 'brand_info' | 'push_notifications'>('products');
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [isViewingOrderHistory, setIsViewingOrderHistory] = useState(false);
  const [isLiveTrafficModalOpen, setIsLiveTrafficModalOpen] = useState(false);

  // Brand, Header & Footer Configurations State (Add, Edit, Delete Info Brand & Footer)
  const [brandConfig, setBrandConfig] = useState<BrandHeaderFooterConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BRAND_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_BRAND_CONFIG,
          ...parsed,
          sections: Array.isArray(parsed.sections) && parsed.sections.length > 0
            ? parsed.sections
            : INITIAL_BRAND_CONFIG.sections,
          bottomLinks: Array.isArray(parsed.bottomLinks) && parsed.bottomLinks.length > 0
            ? parsed.bottomLinks
            : INITIAL_BRAND_CONFIG.bottomLinks,
        };
      }
      return INITIAL_BRAND_CONFIG;
    } catch {
      return INITIAL_BRAND_CONFIG;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_BRAND_CONFIG_KEY, JSON.stringify(brandConfig));
  }, [brandConfig]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_BRAND_CONFIG_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setBrandConfig((prev) => ({ ...prev, ...parsed }));
        } catch (err) {
          console.error(err);
        }
      }
    };
    const handleCustom = (e: CustomEvent<BrandHeaderFooterConfig>) => {
      if (e.detail) {
        setBrandConfig(e.detail);
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('brand_config_updated', handleCustom as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('brand_config_updated', handleCustom as EventListener);
    };
  }, []);

  // Store Receipt Configurations State (Add, Edit, Delete Struk Info Toko)
  const [receiptConfigs, setReceiptConfigs] = useState<ReceiptInfo[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RECEIPT_CONFIGS_KEY);
      const list = saved ? JSON.parse(saved) : INITIAL_RECEIPT_CONFIGS;
      return sanitizeReceiptConfigs(list);
    } catch {
      return sanitizeReceiptConfigs(INITIAL_RECEIPT_CONFIGS);
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_RECEIPT_CONFIGS_KEY, JSON.stringify(receiptConfigs));
  }, [receiptConfigs]);

  // Store Promo & Discount Configurations State (Add, Edit, Delete Info Diskon / Promo Apapun)
  const [storePromos, setStorePromos] = useState<StorePromoInfo[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STORE_PROMOS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_STORE_PROMOS;
    } catch {
      return INITIAL_STORE_PROMOS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_STORE_PROMOS_KEY, JSON.stringify(storePromos));
  }, [storePromos]);

  // Couriers Management State (Add, Edit, Delete Info Kurir Pengiriman)
  const [couriers, setCouriers] = useState<CourierInfo[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COURIERS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_COURIERS;
    } catch {
      return INITIAL_COURIERS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_COURIERS_KEY, JSON.stringify(couriers));
  }, [couriers]);

  // Staff Users Management State (Admin, Supervisor, Kasir, Gudang)
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STAFF_USERS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_STAFF_USERS;
    } catch {
      return INITIAL_STAFF_USERS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_STAFF_USERS_KEY, JSON.stringify(staffUsers));
  }, [staffUsers]);

  // Supabase State
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load all live catalog & system data from Supabase
  const loadAllFromSupabase = async () => {
    setIsSyncing(true);
    try {
      const [
        dbProducts, 
        dbStores, 
        dbCategories, 
        dbVouchers, 
        dbOrders,
        dbBrandConfig,
        dbReceiptConfigs,
        dbStorePromos,
        dbCouriers,
        dbStaffUsers
      ] = await Promise.all([
        fetchProductsFromSupabase(),
        fetchStoresFromSupabase(),
        fetchCategoriesFromSupabase(),
        fetchVouchersFromSupabase(),
        fetchOrdersFromSupabase(),
        fetchBrandConfigFromSupabase(),
        fetchReceiptConfigsFromSupabase(),
        fetchStorePromosFromSupabase(),
        fetchCouriersFromSupabase(),
        fetchStaffUsersFromSupabase()
      ]);

      if (dbProducts !== null) {
        setIsSupabaseConnected(true);
      }

      if (dbProducts && dbProducts.length > 0) {
        const formattedDb = dbProducts.map((p) => ({
          ...p,
          image: formatImageUrl(p.image),
        }));
        setProducts(formattedDb);
        try {
          localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(formattedDb));
        } catch (e) {
          console.warn('Gagal cache produk Supabase ke localStorage:', e);
        }
      }
      if (dbStores && dbStores.length > 0) {
        setStores(dbStores);
        try {
          localStorage.setItem(STORAGE_STORES_KEY, JSON.stringify(dbStores));
        } catch {}
        setCurrentStore((prev) => dbStores.find((s) => s.id === prev.id) || dbStores[0]);
      }
      if (dbCategories && dbCategories.length > 0) {
        setCategories(dbCategories);
      }
      if (dbVouchers && dbVouchers.length > 0) {
        setVouchers(dbVouchers);
        try {
          localStorage.setItem(STORAGE_VOUCHERS_KEY, JSON.stringify(dbVouchers));
        } catch {}
      }
      if (dbOrders && dbOrders.length > 0) {
        setOrders(dbOrders);
        try {
          localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(dbOrders));
        } catch {}
      }
      // 1. Pengaturan Brand & Struk
      if (dbBrandConfig) {
        setBrandConfig(dbBrandConfig);
        try {
          localStorage.setItem(STORAGE_BRAND_CONFIG_KEY, JSON.stringify(dbBrandConfig));
        } catch {}
      }
      if (dbReceiptConfigs && dbReceiptConfigs.length > 0) {
        setReceiptConfigs(dbReceiptConfigs);
        try {
          localStorage.setItem(STORAGE_RECEIPT_CONFIGS_KEY, JSON.stringify(dbReceiptConfigs));
        } catch {}
      }
      // 2. Info Promo & Flash Sale
      if (dbStorePromos && dbStorePromos.length > 0) {
        setStorePromos(dbStorePromos);
        try {
          localStorage.setItem(STORAGE_STORE_PROMOS_KEY, JSON.stringify(dbStorePromos));
        } catch {}
      }
      // 3. Kurir & Armada
      if (dbCouriers && dbCouriers.length > 0) {
        setCouriers(dbCouriers);
        try {
          localStorage.setItem(STORAGE_COURIERS_KEY, JSON.stringify(dbCouriers));
        } catch {}
      }
      // 4. Manajemen User / Staff
      if (dbStaffUsers && dbStaffUsers.length > 0) {
        setStaffUsers(dbStaffUsers);
        try {
          localStorage.setItem(STORAGE_STAFF_USERS_KEY, JSON.stringify(dbStaffUsers));
        } catch {}
      }
    } catch (e) {
      console.warn('Gagal memuat data dari Supabase:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Immediate multi-device sync on load, focus, real-time events, and polling
  useEffect(() => {
    // 1. Load instantly on mount
    loadAllFromSupabase();

    // 2. Test connectivity
    testSupabaseConnection().then((res) => {
      setIsSupabaseConnected(res.success);
    });

    // 3. Subscribe to Supabase real-time changes
    const unsubscribe = subscribeToSupabaseChanges(() => {
      loadAllFromSupabase();
    });

    // 4. Auto sync when tab is focused / phone screen unlocked
    const handleFocus = () => {
      loadAllFromSupabase();
    };
    window.addEventListener('focus', handleFocus);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadAllFromSupabase();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 5. Background polling every 10 seconds to keep all phones completely in sync
    const interval = setInterval(() => {
      loadAllFromSupabase();
    }, 10000);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  // CRUD Produk Terjamin Persistensinya
  const handleAddProduct = async (newProd: Product): Promise<{ success: boolean; error?: string }> => {
    // 1. Simpan langsung ke state produk lokal
    setProducts((prev) => [newProd, ...prev]);

    // 2. Langsung simpan ke localStorage secara sinkron
    try {
      const saved = localStorage.getItem(STORAGE_PRODUCTS_KEY);
      const list: Product[] = saved ? JSON.parse(saved) : products;
      localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify([newProd, ...list.filter(p => p.id !== newProd.id)]));
    } catch (err) {
      console.warn('Gagal simpan produk baru ke localStorage:', err);
    }

    // 3. Simpan ke Supabase
    const res = await saveProductToSupabase(newProd);
    return res;
  };

  const handleEditProduct = async (updatedProd: Product): Promise<{ success: boolean; error?: string }> => {
    setProducts((prev) => prev.map((p) => (p.id === updatedProd.id ? updatedProd : p)));

    try {
      const saved = localStorage.getItem(STORAGE_PRODUCTS_KEY);
      const list: Product[] = saved ? JSON.parse(saved) : products;
      localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(list.map(p => p.id === updatedProd.id ? updatedProd : p)));
    } catch (err) {
      console.warn('Gagal update produk di localStorage:', err);
    }

    const res = await saveProductToSupabase(updatedProd);
    return res;
  };

  const handleDeleteProduct = async (productId: string): Promise<{ success: boolean; error?: string }> => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    try {
      const saved = localStorage.getItem(STORAGE_PRODUCTS_KEY);
      const list: Product[] = saved ? JSON.parse(saved) : products;
      localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(list.filter(p => p.id !== productId)));
    } catch (err) {
      console.warn('Gagal hapus produk di localStorage:', err);
    }

    const res = await deleteProductFromSupabase(productId);
    return res;
  };

  const handleUpdateProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    newProducts.forEach((p) => {
      saveProductToSupabase(p).catch(() => {});
    });
  };

  const handleUpdateStores = (newStores: Store[]) => {
    setStores(newStores);
    newStores.forEach((s) => {
      saveStoreToSupabase(s).catch(() => {});
    });
  };

  const handleUpdateVouchers = (newVouchers: Voucher[]) => {
    const newIds = new Set(newVouchers.map(v => v.id));
    vouchers.forEach(v => {
      if (!newIds.has(v.id)) {
        deleteVoucherFromSupabase(v.id).catch(() => {});
      }
    });
    newVouchers.forEach((v) => {
      saveVoucherToSupabase(v).catch(() => {});
    });
    setVouchers(newVouchers);
  };

  const handleUpdateBrandConfig = (newConfig: BrandHeaderFooterConfig | ((prev: BrandHeaderFooterConfig) => BrandHeaderFooterConfig)) => {
    setBrandConfig((prev) => {
      const next = typeof newConfig === 'function' ? newConfig(prev) : newConfig;
      saveBrandConfigToSupabase(next).catch(() => {});
      return next;
    });
  };

  const handleUpdateReceiptConfigs = (newConfigs: ReceiptInfo[]) => {
    const newIds = new Set(newConfigs.map(r => r.id));
    receiptConfigs.forEach(r => {
      if (!newIds.has(r.id)) {
        deleteReceiptConfigFromSupabase(r.id).catch(() => {});
      }
    });
    newConfigs.forEach((r) => {
      saveReceiptConfigToSupabase(r).catch(() => {});
    });
    setReceiptConfigs(newConfigs);
  };

  const handleUpdateStorePromos = (newPromos: StorePromoInfo[]) => {
    const newIds = new Set(newPromos.map(p => p.id));
    storePromos.forEach(p => {
      if (!newIds.has(p.id)) {
        deleteStorePromoFromSupabase(p.id).catch(() => {});
      }
    });
    newPromos.forEach((p) => {
      saveStorePromoToSupabase(p).catch(() => {});
    });
    setStorePromos(newPromos);
  };

  const handleUpdateCouriers = (newCouriers: CourierInfo[]) => {
    const newIds = new Set(newCouriers.map(c => c.id));
    couriers.forEach(c => {
      if (!newIds.has(c.id)) {
        deleteCourierFromSupabase(c.id).catch(() => {});
      }
    });
    newCouriers.forEach((c) => {
      saveCourierToSupabase(c).catch(() => {});
    });
    setCouriers(newCouriers);
  };

  const handleUpdateStaffUsers = (newUsers: StaffUser[]) => {
    // 1. Immediately persist synchronously to localStorage
    try {
      localStorage.setItem(STORAGE_STAFF_USERS_KEY, JSON.stringify(newUsers));
    } catch {}

    // 2. Sync to Supabase in background
    const newIds = new Set(newUsers.map(u => u.id));
    staffUsers.forEach(u => {
      if (!newIds.has(u.id)) {
        deleteStaffUserFromSupabase(u.id).catch(() => {});
      }
    });
    newUsers.forEach((u) => {
      saveStaffUserToSupabase(u).catch(() => {});
    });

    // 3. Update React state
    setStaffUsers(newUsers);
  };

  // Save Cart to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  // Save Orders to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
  }, [orders]);

  // Save Member to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_MEMBER_KEY, JSON.stringify(member));
  }, [member]);

  // Save Vouchers to LocalStorage & Keep appliedVoucher in sync
  useEffect(() => {
    localStorage.setItem(STORAGE_VOUCHERS_KEY, JSON.stringify(vouchers));
    if (appliedVoucher) {
      const existing = vouchers.find(v => v.id === appliedVoucher.id);
      if (!existing) {
        setAppliedVoucher(null);
      } else if (existing !== appliedVoucher) {
        setAppliedVoucher(existing);
      }
    }
  }, [vouchers]);

  // Save Products to LocalStorage with Quota Safe Guard
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products));
    } catch (e) {
      console.warn('Storage quota warning on saving products:', e);
      try {
        // Fallback jika foto upload Base64 terlalu besar untuk batas 5MB localStorage
        const lean = products.map(p => ({
          ...p,
          image: p.image && p.image.length > 3000 ? getProductFallbackImage(p.category) : p.image
        }));
        localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(lean));
      } catch (err) {
        console.error('Failed to save products to localStorage:', err);
      }
    }
  }, [products]);

  // Count products by category
  const productCountByCategory = categories.reduce((acc, cat) => {
    if (cat.slug === 'all') {
      acc[cat.slug] = products.length;
    } else if (cat.slug === 'jsm-promo') {
      acc[cat.slug] = products.filter((p) => p.tags?.includes('JSM') || (p.discountPercent && p.discountPercent > 0)).length;
    } else {
      acc[cat.slug] = products.filter((p) => p.category === cat.slug).length;
    }
    return acc;
  }, {} as Record<string, number>);

  // Filter & Sort Products
  const filteredProducts = products.filter((p) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery);
      if (!matchSearch) return false;
    }

    // 2. Category Filter
    if (selectedCategory === 'jsm-promo') {
      const isJsm = p.tags?.includes('JSM') || (p.discountPercent && p.discountPercent > 0);
      if (!isJsm) return false;
    } else if (selectedCategory !== 'all') {
      if (p.category !== selectedCategory) return false;
    }

    // 3. Tag Filter
    if (activeTagFilter) {
      if (activeTagFilter === 'Flash Sale' && !p.tags?.includes('Flash Sale')) return false;
      if (activeTagFilter === 'Beli 1 Gratis 1' && !p.tags?.includes('Beli 1 Gratis 1')) return false;
      if (activeTagFilter === 'Fresh' && !p.tags?.includes('Fresh')) return false;
      if (activeTagFilter === 'Diskon' && (!p.discountPercent || p.discountPercent <= 0)) return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'discount') return (b.discountPercent || 0) - (a.discountPercent || 0);
    return b.soldCount - a.soldCount; // popular default
  });

  // Cart Operations
  const handleAddToCart = (
    product: Product, 
    quantity = 1, 
    notes?: string,
    unitOption?: { unitName: string; price: number; multiplier: number; breakdownText: string }
  ) => {
    const selectedUnit = unitOption ? unitOption.unitName : product.unit;
    const unitPrice = unitOption ? unitOption.price : product.price;
    const conversionMultiplier = unitOption ? unitOption.multiplier : 1;
    const conversionDescription = unitOption ? unitOption.breakdownText : undefined;
    const cartItemId = `${product.id}_${selectedUnit}`;

    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => (item.cartItemId || `${item.product.id}_${item.selectedUnit || item.product.unit}`) === cartItemId
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
          notes: notes || updated[existingIndex].notes,
        };
        return updated;
      }
      return [
        ...prev,
        {
          cartItemId,
          product,
          quantity,
          notes,
          selectedUnit,
          unitPrice,
          conversionMultiplier,
          conversionDescription,
        },
      ];
    });
  };

  const handleUpdateQuantity = (itemIdentifier: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(itemIdentifier);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => {
        const key = item.cartItemId || item.product.id;
        return key === itemIdentifier || item.product.id === itemIdentifier
          ? { ...item, quantity }
          : item;
      })
    );
  };

  const handleRemoveFromCart = (itemIdentifier: string) => {
    setCartItems((prev) =>
      prev.filter((item) => {
        const key = item.cartItemId || item.product.id;
        return key !== itemIdentifier && item.product.id !== itemIdentifier;
      })
    );
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Order Operations
  const handleOrderCreated = (newOrder: Order) => {
    // Tambahkan ID dan nomor pesanan ke daftar pesanan pribadi milik pengunjung ini
    setMyOrderIds((prev) => {
      const updated = Array.from(new Set([newOrder.id, newOrder.orderNumber, ...prev]));
      try {
        localStorage.setItem(STORAGE_MY_ORDER_IDS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setOrders((prev) => [newOrder, ...prev]);
    setCartItems([]);

    // Deduct stock in base units based on items and conversion multipliers
    const updatedProducts: Product[] = [];
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const matchingItems = newOrder.items.filter((item) => item.product.id === p.id);
        if (matchingItems.length > 0) {
          const totalDeduction = matchingItems.reduce(
            (sum, item) => sum + item.quantity * (item.conversionMultiplier || 1),
            0
          );
          const updated = {
            ...p,
            stock: Math.max(0, p.stock - totalDeduction),
            soldCount: (p.soldCount || 0) + totalDeduction,
          };
          updatedProducts.push(updated);
          return updated;
        }
        return p;
      })
    );

    // Update Member Points & Stamps
    setMember((prev) => ({
      ...prev,
      points: prev.points - newOrder.pointsUsed + newOrder.pointsEarned,
      stamps: Math.min(5, prev.stamps + (newOrder.subtotal >= 50000 ? 1 : 0)),
    }));

    // Simpan pengurangan stok & penambahan barang terjual ke database Supabase
    if (updatedProducts.length > 0) {
      updatedProducts.forEach((p) => {
        saveProductToSupabase(p).catch((err) => {
          console.warn(`Gagal memperbarui stok/terjual ${p.name} ke database:`, err);
        });
      });
    }

    // Sync order beserta rincian barang terjual ke Supabase
    syncOrderToSupabase(newOrder).catch((err) => {
      console.warn('Gagal sinkronisasi transaksi pesanan ke Supabase:', err);
    });

    // Open live tracker immediately
    setTrackedOrder(newOrder);
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const updated = { ...ord, status: newStatus };
          if (trackedOrder?.id === orderId) {
            setTrackedOrder(updated);
          }
          // Sync update
          syncOrderToSupabase(updated);
          return updated;
        }
        return ord;
      })
    );
  };

  const handleReorder = (order: Order) => {
    order.items.forEach((item) => {
      handleAddToCart(item.product, item.quantity, item.notes);
    });
    setIsViewingOrderHistory(false);
    setIsCartOpen(true);
  };

  const handleClaimVoucher = (voucherId: string) => {
    setVouchers((prev) =>
      prev.map((v) => (v.id === voucherId ? { ...v, isClaimed: true } : v))
    );
  };

  // Filter pesanan: Pengunjung HANYA melihat pesanannya sendiri di tombol Pesanan dan riwayat
  const myOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Apakah ID atau nomor pesanan ada di daftar pesanan milik pengunjung ini?
      if (myOrderIds.includes(order.id) || myOrderIds.includes(order.orderNumber)) {
        return true;
      }
      // 2. Apakah cocok dengan deviceSessionId atau visitorId perangkat ini?
      if (order.deviceSessionId && order.deviceSessionId === visitorId) {
        return true;
      }
      // 3. Jika pengguna member dan ada customerId spesifik milik visitor
      if (order.customerId && order.customerId === visitorId) {
        return true;
      }
      return false;
    });
  }, [orders, myOrderIds, visitorId]);

  // Pesanan aktif milik pengunjung ini saja (untuk badge tombol Pesanan & banner aktif)
  const myActiveOrders = useMemo(() => {
    return myOrders.filter(
      (o) => o.status !== 'completed' && o.status !== 'cancelled'
    );
  }, [myOrders]);

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartPrice = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  // Kembali ke halaman index / beranda utama saat logo diklik
  const handleGoHome = () => {
    setIsViewingOrderHistory(false);
    setSearchQuery('');
    setSelectedCategory('all');
    setActiveTagFilter(null);
    setSelectedProductDetail(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    setTrackedOrder(null);
    setIsAdminPanelOpen(false);
    setIsMemberModalOpen(false);
    setIsStoreSelectorOpen(false);
    setIsSupabaseModalOpen(false);
    setIsLiveTrafficModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen w-full min-w-full flex-1 bg-[#F8F9FA] text-[#1E2022] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* Sticky Header */}
      <Header
        currentStore={currentStore}
        deliveryType={deliveryType}
        onToggleDeliveryType={setDeliveryType}
        onOpenStoreSelector={() => setIsStoreSelectorOpen(true)}
        member={member}
        onOpenMemberModal={() => setIsMemberModalOpen(true)}
        cartItems={cartItems}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onOpenLiveTrafficModal={() => setIsLiveTrafficModalOpen(true)}
        isSupabaseConnected={isSupabaseConnected}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenOrderHistory={() => setIsViewingOrderHistory(true)}
        activeOrdersCount={myActiveOrders.length}
        allProducts={products}
        onSelectProduct={(p) => setSelectedProductDetail(p)}
        storePromos={storePromos}
        brandConfig={brandConfig}
        isSyncing={isSyncing}
        onRefreshData={loadAllFromSupabase}
        onGoHome={handleGoHome}
      />

      {/* Main View Container */}
      {isViewingOrderHistory ? (
        <main className="flex-1 w-full min-w-full">
          <OrderHistoryView
            orders={myOrders}
            allOrders={orders}
            onClaimOrder={(orderIdOrNumber) => {
              const query = orderIdOrNumber.trim().toUpperCase();
              const found = orders.find(
                (o) => o.id === orderIdOrNumber.trim() || o.orderNumber.toUpperCase() === query
              );
              if (found) {
                setMyOrderIds((prev) => {
                  const updated = Array.from(new Set([found.id, found.orderNumber, ...prev]));
                  try {
                    localStorage.setItem(STORAGE_MY_ORDER_IDS_KEY, JSON.stringify(updated));
                  } catch {}
                  return updated;
                });
                return true;
              }
              return false;
            }}
            onBackToShopping={() => setIsViewingOrderHistory(false)}
            onTrackOrder={(order) => setTrackedOrder(order)}
            onReorder={handleReorder}
          />
        </main>
      ) : (
        <main className="flex-1 w-full min-w-full">
          {/* Hero Promotional Banner & Flash Deals */}
          <HeroBanner
            onSelectCategory={(slug) => {
              setSelectedCategory(slug);
              setActiveTagFilter(null);
            }}
            onOpenMemberModal={() => setIsMemberModalOpen(true)}
            storePromos={storePromos}
            onOpenPromoManager={() => {
              setAdminPanelInitialTab('promos');
              setIsAdminPanelOpen(true);
            }}
          />

          {/* Quick Category Bar */}
          <CategoryBar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(slug) => {
              setSelectedCategory(slug);
              setActiveTagFilter(null);
            }}
            productCountByCategory={productCountByCategory}
          />

          {/* Tag Filters & Sort Section */}
          <div className="w-full min-w-full px-3 sm:px-6 lg:px-8 py-2">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
              {/* Quick Tag Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setActiveTagFilter(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTagFilter === null
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Semua Promo
                </button>
                <button
                  onClick={() => setActiveTagFilter(activeTagFilter === 'Flash Sale' ? null : 'Flash Sale')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                    activeTagFilter === 'Flash Sale'
                      ? 'bg-amber-500 text-amber-950'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <Flame className="w-3 h-3 text-amber-600" />
                  <span>Flash Sale</span>
                </button>
                <button
                  onClick={() => setActiveTagFilter(activeTagFilter === 'Beli 1 Gratis 1' ? null : 'Beli 1 Gratis 1')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTagFilter === 'Beli 1 Gratis 1'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  Beli 2 Dpt 3
                </button>
                <button
                  onClick={() => setActiveTagFilter(activeTagFilter === 'Fresh' ? null : 'Fresh')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTagFilter === 'Fresh'
                      ? 'bg-teal-600 text-white'
                      : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
                  }`}
                >
                  Produk Fresh
                </button>
                <button
                  onClick={() => setActiveTagFilter(activeTagFilter === 'Diskon' ? null : 'Diskon')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTagFilter === 'Diskon'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  }`}
                >
                  Diskon Spesial
                </button>
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 text-xs text-stone-600">
                <SlidersHorizontal className="w-3.5 h-3.5 text-stone-400" />
                <span className="font-semibold hidden sm:inline">Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 font-semibold text-stone-800 focus:outline-hidden text-xs cursor-pointer"
                >
                  <option value="popular">Paling Populer & Terlaris</option>
                  <option value="discount">Diskon Tertinggi</option>
                  <option value="price-asc">Harga: Termurah</option>
                  <option value="price-desc">Harga: Termahal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Orders Quick Alert (if any active of THIS visitor) */}
          {myActiveOrders.length > 0 && (
            <div className="w-full min-w-full px-3 sm:px-6 lg:px-8 mt-2">
              <div 
                onClick={() => setTrackedOrder(myActiveOrders[0])}
                className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-md cursor-pointer hover:opacity-95 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center animate-pulse">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <span>Pesanan Aktif ({myActiveOrders[0].orderNumber})</span>
                      <span className="bg-amber-400 text-amber-950 text-[9px] px-1.5 py-0.2 rounded font-extrabold">
                        {myActiveOrders[0].deliveryType === 'delivery' ? 'Sedang Diantar' : 'Siap Diambil'}
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-100 mt-0.5">
                      {myActiveOrders[0].store.name} • Klik untuk lihat live status & struk
                    </p>
                  </div>
                </div>
                <button className="bg-white text-blue-900 text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs">
                  Lacak Sekarang
                </button>
              </div>
            </div>
          )}

          {/* Product Grid Catalog */}
          <div className="w-full min-w-full px-3 sm:px-6 lg:px-8 py-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-stone-900 tracking-tight">
                  {selectedCategory === 'all'
                    ? 'Semua Produk Minimarket'
                    : selectedCategory === 'jsm-promo'
                    ? 'Promo JSM & Hemat Akhir Pekan'
                    : categories.find((c) => c.slug === selectedCategory)?.name}
                </h3>
                <p className="text-xs text-stone-500">
                  Menampilkan {filteredProducts.length} produk siap antar langsung dari {currentStore.name}
                </p>
              </div>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  Reset Pencarian
                </button>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center my-6">
                <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mx-auto mb-3">
                  <Search className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-stone-800 text-base mb-1">Produk Tidak Ditemukan</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
                  Coba kata kunci pencarian lain atau pilih kategori sembako, minuman, dan snack lainnya.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setActiveTagFilter(null);
                  }}
                  className="bg-blue-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl"
                >
                  Lihat Semua Produk
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-3 sm:gap-4">
                {filteredProducts.map((product) => {
                  const inCart = cartItems.find((item) => item.product.id === product.id);
                  const qty = inCart ? inCart.quantity : 0;

                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      quantityInCart={qty}
                      onAddToCart={(p, q = 1, n, opt) => handleAddToCart(p, q, n, opt)}
                      onUpdateQuantity={handleUpdateQuantity}
                      onOpenDetail={(p) => setSelectedProductDetail(p)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Real-Time Visitor Counter & Origin Stats Widget (Di Bawah Halaman Indeks, Ukuran 1/4) */}
          <VisitorCounterWidget 
            visitorId={visitorId} 
            staffUsers={staffUsers}
            onOpenLiveTrafficModal={() => setIsLiveTrafficModalOpen(true)}
          />

          {/* Floating Cart Button on Mobile */}
          {cartItems.length > 0 && (
            <div className="fixed bottom-4 left-4 right-4 z-20 sm:hidden">
              <button
                onClick={() => setIsCartOpen(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between font-bold text-xs active:scale-98 transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white text-blue-700 flex items-center justify-center text-xs font-black">
                    {cartItems.reduce((a, b) => a + b.quantity, 0)}
                  </div>
                  <span>Keranjang Belanja</span>
                </div>
                <div className="font-black text-sm">
                  {formatRupiah(
                    cartItems.reduce((a, b) => a + (b.unitPrice || b.product.price) * b.quantity, 0)
                  )}
                </div>
              </button>
            </div>
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="w-full min-w-full border-t border-stone-200 bg-white py-8 px-3 sm:px-6 lg:px-8 text-stone-600 mt-12">
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 text-xs">
          {/* Brand Info Col */}
          <div>
            <div className="flex items-center gap-2 mb-2 font-black text-blue-900 text-base">
              {brandConfig.brandLogoImageUrl ? (
                <img
                  src={brandConfig.brandLogoImageUrl}
                  alt={brandConfig.footerBrandName || (brandConfig.brandNamePart1 + ' ' + brandConfig.brandNamePart2)}
                  className="w-7 h-7 rounded-lg object-cover border border-stone-200 shadow-2xs"
                />
              ) : (
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${brandConfig.brandLogoBgGradient || 'from-blue-700 via-blue-600 to-amber-500'} text-white flex items-center justify-center text-xs font-black shadow-2xs`}>
                  {brandConfig.brandLogoText || 'KM'}
                </div>
              )}
              <div className="flex items-center gap-1 font-black text-base">
                {brandConfig.footerBrandName ? (
                  <span className="text-blue-900">{brandConfig.footerBrandName}</span>
                ) : (
                  <>
                    <span className="text-blue-900">{brandConfig.brandNamePart1}</span>
                    <span className="text-amber-500">{brandConfig.brandNamePart2}</span>
                  </>
                )}
                {brandConfig.showBrandBadge && brandConfig.brandBadgeText && (
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${brandConfig.brandBadgeColor || 'bg-red-600'} text-white px-1 py-0.5 rounded ml-1`}>
                    {brandConfig.brandBadgeText}
                  </span>
                )}
              </div>
            </div>
            <p className="text-stone-500 leading-relaxed">
              {brandConfig.footerDescription || 'Platform belanja minimarket online modern seperti Klik Indomaret & Alfagift dengan integrasi Supabase cloud database, pengiriman instan 30 menit, dan promo JSM hemat.'}
            </p>
          </div>

          {/* Dynamic Footer Sections */}
          {(brandConfig.sections || [])
            .filter((section) => section.isVisible)
            .map((section) => {
              const iconMap: Record<string, React.ReactNode> = {
                truck: <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />,
                'shield-check': <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />,
                sparkles: <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />,
                clock: <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />,
                'credit-card': <CreditCard className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />,
                store: <StoreIcon className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />,
                headphones: <Headphones className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />,
                'badge-percent': <BadgePercent className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />,
                'map-pin': <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />,
                'check-circle': <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />,
                heart: <Heart className="w-3.5 h-3.5 text-pink-600 shrink-0 mt-0.5" />,
                star: <Star className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              };

              return (
                <div key={section.id}>
                  <h4 className="font-bold text-stone-900 mb-2">{section.title}</h4>
                  
                  {/* 1. Features list (Keunggulan Layanan / Poin Berikon) */}
                  {section.type === 'features_list' && section.items && (
                    <ul className="space-y-2 text-stone-500">
                      {section.items.map((item) => (
                        <li key={item.id} className="flex items-start gap-1.5">
                          {iconMap[item.icon] || <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />}
                          <div className="min-w-0">
                            <span className="font-medium text-stone-700 leading-snug block">{item.text}</span>
                            {item.subtext && (
                              <p className="text-[11px] text-stone-400 leading-tight mt-0.5">
                                {item.subtext}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* 2. Payment Methods */}
                  {section.type === 'payment_methods' && (
                    <div>
                      {section.content && (
                        <p className="text-stone-500 leading-relaxed mb-2">{section.content}</p>
                      )}
                      {section.paymentTags && section.paymentTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {section.paymentTags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="bg-stone-100 text-stone-700 text-[10px] font-medium px-2 py-0.5 rounded border border-stone-200 shadow-2xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Contact Hours & Hotline CS */}
                  {section.type === 'contact_hours' && (
                    <div>
                      {section.content && (
                        <p className="text-stone-500 leading-relaxed mb-1.5">{section.content}</p>
                      )}
                      {section.subContent && (
                        <p className="text-stone-400 text-[11px] leading-relaxed">{section.subContent}</p>
                      )}
                    </div>
                  )}

                  {/* 4. Text Block */}
                  {section.type === 'text_block' && (
                    <div>
                      {section.content && (
                        <p className="text-stone-500 leading-relaxed mb-1.5">{section.content}</p>
                      )}
                      {section.subContent && (
                        <p className="text-stone-400 text-[11px] leading-relaxed">{section.subContent}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Footer Bottom Bar */}
        <div className="w-full mt-6 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-400">
          <div>{brandConfig.copyrightText || '© 2026 KuickMart Express. All rights reserved.'}</div>
          <div className="flex items-center gap-4 mt-2 sm:mt-0">
            <button
              onClick={() => {
                setAdminPanelInitialTab('brand_info');
                setIsAdminPanelOpen(true);
              }}
              className="text-blue-600 hover:text-blue-800 font-bold transition-colors cursor-pointer flex items-center gap-1 hover:underline"
            >
              <span>⚙️ Kelola Info Brand & Footer</span>
            </button>
            {brandConfig.bottomLinks && brandConfig.bottomLinks.length > 0 ? (
              brandConfig.bottomLinks.map((item) => (
                <a key={item.id} href={item.url || '#'} className="hover:text-stone-600 transition-colors">
                  {item.label}
                </a>
              ))
            ) : (
              <>
                <span>Syarat & Ketentuan</span>
                <span>Kebijakan Privasi</span>
                <span>Pusat Bantuan 24/7</span>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* ALL MODAL OVERLAYS */}
      {/* 1. Product Detail Modal */}
      <ProductDetailModal
        product={selectedProductDetail}
        onClose={() => setSelectedProductDetail(null)}
        quantityInCart={
          selectedProductDetail
            ? cartItems.find((i) => i.product.id === selectedProductDetail.id)?.quantity || 0
            : 0
        }
        onAddToCart={handleAddToCart}
      />

      {/* 2. Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        member={member}
        appliedVoucher={appliedVoucher}
        onApplyVoucher={setAppliedVoucher}
        availableVouchers={vouchers}
        usePoints={usePoints}
        onToggleUsePoints={setUsePoints}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        store={currentStore}
        deliveryType={deliveryType}
      />

      {/* 3. Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        store={currentStore}
        addresses={addresses}
        currentAddress={currentAddress}
        onSelectAddress={setCurrentAddress}
        deliveryType={deliveryType}
        onSelectDeliveryType={setDeliveryType}
        appliedVoucher={appliedVoucher}
        usePoints={usePoints}
        member={member}
        onOrderCreated={handleOrderCreated}
        couriers={couriers}
        visitorId={visitorId}
      />

      {/* 4. Live Order Tracker Modal */}
      <OrderTrackerModal
        order={trackedOrder}
        onClose={() => setTrackedOrder(null)}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        receiptConfigs={receiptConfigs}
        onOpenReceiptManager={() => {
          setAdminPanelInitialTab('receipts');
          setIsAdminPanelOpen(true);
        }}
        onOpenCourierManager={() => {
          setAdminPanelInitialTab('couriers');
          setIsAdminPanelOpen(true);
        }}
        couriers={couriers}
      />

      {/* 5. Member Card Modal */}
      <MemberCardModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        member={member}
        vouchers={vouchers}
        onClaimVoucher={handleClaimVoucher}
      />

      {/* 6. Store Selector Modal */}
      <StoreSelectorModal
        isOpen={isStoreSelectorOpen}
        onClose={() => setIsStoreSelectorOpen(false)}
        stores={stores}
        currentStore={currentStore}
        onSelectStore={setCurrentStore}
      />

      {/* 7. Supabase Cloud Setup & SQL Schema Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        isSupabaseConnected={isSupabaseConnected}
        onConnectionChange={(connected) => {
          setIsSupabaseConnected(connected);
          if (connected) {
            loadAllFromSupabase();
          }
        }}
        onRefreshData={loadAllFromSupabase}
        currentData={{ 
          products, 
          stores, 
          categories, 
          vouchers,
          brandConfig,
          receiptConfigs,
          storePromos,
          couriers,
          staffUsers
        }}
      />

      {/* 8. Admin & POS Store Management Panel Modal */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        products={products}
        onUpdateProducts={handleUpdateProducts}
        onAddProduct={handleAddProduct}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
        orders={orders}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        stores={stores}
        currentStore={currentStore}
        onSelectStore={setCurrentStore}
        onUpdateStores={handleUpdateStores}
        vouchers={vouchers}
        onUpdateVouchers={handleUpdateVouchers}
        isSupabaseConnected={isSupabaseConnected}
        receiptConfigs={receiptConfigs}
        onUpdateReceiptConfigs={handleUpdateReceiptConfigs}
        storePromos={storePromos}
        onUpdateStorePromos={handleUpdateStorePromos}
        couriers={couriers}
        onUpdateCouriers={handleUpdateCouriers}
        brandConfig={brandConfig}
        onUpdateBrandConfig={handleUpdateBrandConfig}
        staffUsers={staffUsers}
        onUpdateStaffUsers={handleUpdateStaffUsers}
        initialTab={adminPanelInitialTab}
        onOpenSupabaseModal={() => {
          setIsAdminPanelOpen(false);
          setIsSupabaseModalOpen(true);
        }}
      />

      {/* 9. Live Traffic Analytics Modal (Wajib Login) */}
      <LiveTrafficModal
        isOpen={isLiveTrafficModalOpen}
        onClose={() => setIsLiveTrafficModalOpen(false)}
        staffUsers={staffUsers}
      />

      {/* 10. Web Push PWA Notification Prompt Banner */}
      <PushNotificationPrompt />

      {/* 9. Floating Bottom Cart Bar (Akses Cepat Keranjang Belanja) */}
      {cartItems.length > 0 && !isCartOpen && !isCheckoutOpen && (
        <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-auto sm:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-200">
          <div
            onClick={() => setIsCartOpen(true)}
            className="bg-stone-950/95 hover:bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 sm:gap-6 cursor-pointer border border-white/10 transition-all hover:scale-[1.02] active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white relative shadow-sm shrink-0">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center border border-stone-950">
                  {totalCartCount}
                </span>
              </div>
              <div>
                <p className="text-[11px] text-stone-300 font-medium">Total ({totalCartCount} item)</p>
                <p className="text-sm font-extrabold text-amber-400">{formatRupiah(totalCartPrice)}</p>
              </div>
            </div>
            <button className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs shrink-0">
              <span>Buka Keranjang</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
