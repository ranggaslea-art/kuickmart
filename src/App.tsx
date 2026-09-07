import React, { useState, useEffect } from 'react';
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
  CourierInfo
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
  INITIAL_COURIERS
} from './data/mockData';
import { 
  getSupabase, 
  testSupabaseConnection, 
  syncOrderToSupabase, 
  fetchProductsFromSupabase,
  fetchStoresFromSupabase,
  fetchCategoriesFromSupabase,
  fetchVouchersFromSupabase,
  saveProductToSupabase,
  deleteProductFromSupabase,
  saveStoreToSupabase,
  saveVoucherToSupabase
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
  Layers
} from 'lucide-react';
import { formatRupiah } from './utils/formatters';
import { formatImageUrl, getProductFallbackImage } from './utils/imageHelper';

const STORAGE_CART_KEY = 'nusamart_cart';
const STORAGE_ORDERS_KEY = 'nusamart_orders';
const STORAGE_MEMBER_KEY = 'nusamart_member';
const STORAGE_VOUCHERS_KEY = 'kuickmart_vouchers';
const STORAGE_PRODUCTS_KEY = 'kuickmart_products_v2';
const STORAGE_RECEIPT_CONFIGS_KEY = 'nusamart_receipt_configs';
const STORAGE_STORE_PROMOS_KEY = 'nusamart_store_promos';
const STORAGE_COURIERS_KEY = 'kuickmart_couriers';

export default function App() {
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
  const [stores, setStores] = useState<Store[]>(INITIAL_STORES);
  const [currentStore, setCurrentStore] = useState<Store>(INITIAL_STORES[0]);
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
  const [adminPanelInitialTab, setAdminPanelInitialTab] = useState<'products' | 'orders' | 'stores' | 'vouchers' | 'users' | 'bulk_import' | 'receipts' | 'promos' | 'couriers'>('products');
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [isViewingOrderHistory, setIsViewingOrderHistory] = useState(false);

  // Store Receipt Configurations State (Add, Edit, Delete Struk Info Toko)
  const [receiptConfigs, setReceiptConfigs] = useState<ReceiptInfo[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RECEIPT_CONFIGS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_RECEIPT_CONFIGS;
    } catch {
      return INITIAL_RECEIPT_CONFIGS;
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

  // Supabase State
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  // Load all live catalog data from Supabase
  const loadAllFromSupabase = async () => {
    try {
      const [dbProducts, dbStores, dbCategories, dbVouchers] = await Promise.all([
        fetchProductsFromSupabase(),
        fetchStoresFromSupabase(),
        fetchCategoriesFromSupabase(),
        fetchVouchersFromSupabase(),
      ]);

      if (dbProducts && dbProducts.length > 0) {
        setProducts((prevProducts) => {
          const dbIds = new Set(dbProducts.map((p) => p.id));
          // Pertahankan produk yang baru saja ditambah di lokal yang belum ada di Supabase
          const localOnly = prevProducts.filter((p) => !dbIds.has(p.id));

          // Auto-sync produk lokal ke Supabase di background agar tidak pernah hilang
          if (localOnly.length > 0) {
            localOnly.forEach((p) => {
              saveProductToSupabase(p).catch(() => {});
            });
          }

          const formattedDb = dbProducts.map((p) => ({
            ...p,
            image: formatImageUrl(p.image),
          }));

          return [...localOnly, ...formattedDb];
        });
      }
      if (dbStores && dbStores.length > 0) {
        setStores((prevStores) => {
          const dbIds = new Set(dbStores.map((s) => s.id));
          const localOnly = prevStores.filter((s) => !dbIds.has(s.id));
          return [...localOnly, ...dbStores];
        });
        setCurrentStore((prev) => dbStores.find((s) => s.id === prev.id) || dbStores[0]);
      }
      if (dbCategories && dbCategories.length > 0) {
        setCategories(dbCategories);
      }
      if (dbVouchers && dbVouchers.length > 0) {
        setVouchers((prevVouchers) => {
          const dbIds = new Set(dbVouchers.map((v) => v.id));
          const localOnly = prevVouchers.filter((v) => !dbIds.has(v.id));
          return [...localOnly, ...dbVouchers];
        });
      }
    } catch (e) {
      console.warn('Gagal memuat data dari Supabase:', e);
    }
  };

  // Check Supabase connection on load
  useEffect(() => {
    testSupabaseConnection().then((res) => {
      setIsSupabaseConnected(res.success);
      if (res.success) {
        loadAllFromSupabase();
      }
    });
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

    // 3. Simpan ke Supabase jika terhubung
    if (isSupabaseConnected) {
      const res = await saveProductToSupabase(newProd);
      return res;
    }
    return { success: true };
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

    if (isSupabaseConnected) {
      const res = await saveProductToSupabase(updatedProd);
      return res;
    }
    return { success: true };
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

    if (isSupabaseConnected) {
      const res = await deleteProductFromSupabase(productId);
      return res;
    }
    return { success: true };
  };

  const handleUpdateProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    if (isSupabaseConnected) {
      newProducts.forEach((p) => {
        saveProductToSupabase(p).catch(() => {});
      });
    }
  };

  const handleUpdateStores = (newStores: Store[]) => {
    setStores(newStores);
    if (isSupabaseConnected) {
      newStores.forEach((s) => {
        saveStoreToSupabase(s).catch(() => {});
      });
    }
  };

  const handleUpdateVouchers = (newVouchers: Voucher[]) => {
    setVouchers(newVouchers);
    if (isSupabaseConnected) {
      newVouchers.forEach((v) => {
        saveVoucherToSupabase(v).catch(() => {});
      });
    }
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
    setOrders((prev) => [newOrder, ...prev]);
    setCartItems([]);

    // Deduct stock in base units based on items and conversion multipliers
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const matchingItems = newOrder.items.filter((item) => item.product.id === p.id);
        if (matchingItems.length > 0) {
          const totalDeduction = matchingItems.reduce(
            (sum, item) => sum + item.quantity * (item.conversionMultiplier || 1),
            0
          );
          return {
            ...p,
            stock: Math.max(0, p.stock - totalDeduction),
            soldCount: p.soldCount + totalDeduction,
          };
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

    // Sync to Supabase in background
    syncOrderToSupabase(newOrder);

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

  const activeOrders = orders.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled'
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E2022] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
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
        isSupabaseConnected={isSupabaseConnected}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenOrderHistory={() => setIsViewingOrderHistory(true)}
        activeOrdersCount={activeOrders.length}
        allProducts={products}
        onSelectProduct={(p) => setSelectedProductDetail(p)}
        storePromos={storePromos}
      />

      {/* Main View Container */}
      {isViewingOrderHistory ? (
        <main className="flex-1">
          <OrderHistoryView
            orders={orders}
            onBackToShopping={() => setIsViewingOrderHistory(false)}
            onTrackOrder={(order) => setTrackedOrder(order)}
            onReorder={handleReorder}
          />
        </main>
      ) : (
        <main className="flex-1">
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
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

          {/* Active Orders Quick Alert (if any active) */}
          {activeOrders.length > 0 && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-2">
              <div 
                onClick={() => setTrackedOrder(activeOrders[0])}
                className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-md cursor-pointer hover:opacity-95 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center animate-pulse">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <span>Pesanan Aktif ({activeOrders[0].orderNumber})</span>
                      <span className="bg-amber-400 text-amber-950 text-[9px] px-1.5 py-0.2 rounded font-extrabold">
                        {activeOrders[0].deliveryType === 'delivery' ? 'Sedang Diantar' : 'Siap Diambil'}
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-100 mt-0.5">
                      {activeOrders[0].store.name} • Klik untuk lihat live status & struk
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
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
      <footer className="border-t border-stone-200 bg-white py-8 px-4 sm:px-6 text-stone-600 mt-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
          <div>
            <div className="flex items-center gap-2 mb-2 font-black text-blue-900 text-base">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black">
                KM
              </div>
              <span>KUICK MART EXPRESS</span>
            </div>
            <p className="text-stone-500 leading-relaxed">
              Platform belanja minimarket online modern seperti Klik Indomaret & Alfagift dengan integrasi Supabase cloud database, pengiriman instan 30 menit, dan promo JSM hemat.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-stone-900 mb-2">Keunggulan Layanan</h4>
            <ul className="space-y-1.5 text-stone-500">
              <li className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span>Pengiriman Kilat 30 Menit</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Barang Original & Expired Aman</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Poin Member & Stamp Reward Tiap Belanja</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-stone-900 mb-2">Metode Pembayaran</h4>
            <p className="text-stone-500 leading-relaxed">
              Menerima QRIS (GoPay, OVO, ShopeePay, Dana), Virtual Account BCA/Mandiri/BRI, dan Bayar di Tempat (COD / Kasir Toko).
            </p>
          </div>

          <div>
            <h4 className="font-bold text-stone-900 mb-2">Jam Operasional & Bantuan</h4>
            <p className="text-stone-500 leading-relaxed mb-1.5">
              Buka setiap hari pk 07:00 - 22:00 WIB. Layanan siap antar kilat ke alamat Anda dalam 30 menit.
            </p>
            <p className="text-stone-400 text-[11px]">
              Hubungi Customer Care 24/7 untuk bantuan pesanan & kendala pengiriman.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-400">
          <div>© 2026 KuickMart Express. All rights reserved.</div>
          <div className="flex items-center gap-4 mt-2 sm:mt-0">
            <span>Syarat & Ketentuan</span>
            <span>Kebijakan Privasi</span>
            <span>Pusat Bantuan 24/7</span>
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
        currentData={{ products, stores, categories, vouchers }}
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
        onUpdateReceiptConfigs={setReceiptConfigs}
        storePromos={storePromos}
        onUpdateStorePromos={setStorePromos}
        couriers={couriers}
        onUpdateCouriers={setCouriers}
        initialTab={adminPanelInitialTab}
        onOpenSupabaseModal={() => {
          setIsAdminPanelOpen(false);
          setIsSupabaseModalOpen(true);
        }}
      />
    </div>
  );
}
