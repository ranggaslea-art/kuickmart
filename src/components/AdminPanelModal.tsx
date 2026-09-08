import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, 
  Settings, 
  Package, 
  Receipt, 
  Tag, 
  Store as StoreIcon, 
  Database, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Save, 
  UploadCloud, 
  Sparkles,
  DollarSign,
  Boxes,
  FileSpreadsheet,
  Lock,
  KeyRound,
  UserCheck,
  LogOut,
  Eye,
  EyeOff,
  User,
  Users,
  UserPlus,
  Shield,
  Copy,
  Check,
  CheckCheck,
  Percent,
  Truck,
  Power,
  MapPin,
  Phone,
  Clock,
  Navigation,
  Building2,
  Ticket,
  Calculator,
  Layers,
  ArrowRight,
  HelpCircle,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  AlertTriangle,
  ExternalLink,
  Megaphone,
  Bike,
  Loader2,
  Palette,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  BellRing
} from 'lucide-react';
import { Product, Order, Store, Voucher, OrderStatus, StaffUser, ProductUnitConversion, ReceiptInfo, StorePromoInfo, CourierInfo, BrandHeaderFooterConfig, SystemModuleKey, UserPermissions, ModulePermission } from '../types';
import { INITIAL_STAFF_USERS, INITIAL_RECEIPT_CONFIGS, INITIAL_STORE_PROMOS, INITIAL_COURIERS, INITIAL_BRAND_CONFIG } from '../data/mockData';
import { formatRupiah } from '../utils/formatters';
import { computeConversionChains, formatStockBreakdown, getProductUnitOptions } from '../utils/unitConversion';
import { 
  formatImageUrl, 
  getProductFallbackImage, 
  isGoogleDriveUrl, 
  getGoogleDriveFileId, 
  compressImageFile, 
  COMMON_IMAGE_PRESETS 
} from '../utils/imageHelper';
import { 
  SYSTEM_MODULES, 
  DEFAULT_ROLE_PERMISSIONS, 
  getEffectivePermissions, 
  countUserPermissions, 
  getRoleDisplayName 
} from '../utils/permissions';
import { ModulePermissionModal } from './ModulePermissionModal';
import { UserAccessManager } from './UserAccessManager';
import { ReceiptInfoManager } from './ReceiptInfoManager';
import { PromoInfoManager } from './PromoInfoManager';
import { CourierManager } from './CourierManager';
import { BrandInfoManager } from './BrandInfoManager';
import { PushNotificationManager } from './PushNotificationManager';
import { syncOrderToSupabase, saveStaffUserToSupabase, deleteStaffUserFromSupabase } from '../lib/supabase';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  onAddProduct?: (product: Product) => Promise<{ success: boolean; error?: string }>;
  onEditProduct?: (product: Product) => Promise<{ success: boolean; error?: string }>;
  onDeleteProduct?: (productId: string) => Promise<{ success: boolean; error?: string }>;
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  stores: Store[];
  currentStore: Store;
  onSelectStore: (store: Store) => void;
  onUpdateStores: (stores: Store[]) => void;
  vouchers: Voucher[];
  onUpdateVouchers: (vouchers: Voucher[]) => void;
  isSupabaseConnected: boolean;
  onOpenSupabaseModal: () => void;
  receiptConfigs?: ReceiptInfo[];
  onUpdateReceiptConfigs?: (configs: ReceiptInfo[]) => void;
  storePromos?: StorePromoInfo[];
  onUpdateStorePromos?: (promos: StorePromoInfo[]) => void;
  couriers?: CourierInfo[];
  onUpdateCouriers?: (couriers: CourierInfo[]) => void;
  brandConfig?: BrandHeaderFooterConfig;
  onUpdateBrandConfig?: (config: BrandHeaderFooterConfig) => void;
  staffUsers?: StaffUser[];
  onUpdateStaffUsers?: (users: StaffUser[]) => void;
  initialTab?: 'products' | 'orders' | 'stores' | 'vouchers' | 'users' | 'bulk_import' | 'receipts' | 'promos' | 'couriers' | 'brand_info' | 'push_notifications';
}

interface AdminUser {
  username: string;
  role: 'admin' | 'supervisor' | 'kasir' | 'gudang';
  name: string;
  permissions?: Partial<UserPermissions>;
}

const DEFAULT_ACCOUNTS = [
  { username: 'admin', pin: 'admin123', role: 'admin' as const, name: 'Store Manager (Admin)', permissions: DEFAULT_ROLE_PERMISSIONS.admin },
  { username: 'kasir', pin: '1234', role: 'kasir' as const, name: 'Kasir Shift Toko', permissions: DEFAULT_ROLE_PERMISSIONS.kasir },
  { username: 'spv', pin: 'spv2026', role: 'supervisor' as const, name: 'Supervisor Toko', permissions: DEFAULT_ROLE_PERMISSIONS.supervisor },
  { username: 'gudang', pin: 'gudang2026', role: 'gudang' as const, name: 'Staff Gudang & Stok', permissions: DEFAULT_ROLE_PERMISSIONS.gudang },
];

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  products,
  onUpdateProducts,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  orders,
  onUpdateOrderStatus,
  stores,
  currentStore,
  onSelectStore,
  onUpdateStores,
  vouchers,
  onUpdateVouchers,
  isSupabaseConnected,
  onOpenSupabaseModal,
  receiptConfigs,
  onUpdateReceiptConfigs,
  storePromos,
  onUpdateStorePromos,
  couriers,
  onUpdateCouriers,
  brandConfig,
  onUpdateBrandConfig,
  staffUsers: propStaffUsers,
  onUpdateStaffUsers,
  initialTab,
}) => {
  // Helper to ensure all staff users have permissions and default accounts exist
  const ensureStaffPermissions = (users: StaffUser[]): StaffUser[] => {
    const defaultMap = new Map<string, StaffUser>();
    INITIAL_STAFF_USERS.forEach(u => {
      if (u && u.username) {
        defaultMap.set(u.username.toLowerCase(), u);
      }
    });

    const safeUsers = Array.isArray(users) ? users.filter(Boolean) : [];
    const existingUsernames = new Set(safeUsers.map(u => (u?.username || '').toLowerCase()).filter(Boolean));
    const missingDefaults: StaffUser[] = [];
    INITIAL_STAFF_USERS.forEach(def => {
      if (def?.username && !existingUsernames.has(def.username.toLowerCase())) {
        missingDefaults.push({ ...def });
      }
    });

    const fullList = [...safeUsers, ...missingDefaults];
    return fullList.map(u => {
      const uUsername = (u?.username || '').toLowerCase();
      const defaultUser = defaultMap.get(uUsername);
      const role = (u?.role || defaultUser?.role || 'kasir') as 'admin' | 'supervisor' | 'kasir' | 'gudang';
      const roleFallback = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.kasir;

      return {
        ...u,
        id: u?.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        username: u?.username || defaultUser?.username || `staff_${Date.now()}`,
        name: u?.name || defaultUser?.name || 'Staff User',
        role,
        pin: u?.pin || defaultUser?.pin || '1234',
        isActive: u?.isActive ?? true,
        permissions: u?.permissions || defaultUser?.permissions || roleFallback,
      };
    });
  };

  // Staff Users State (Persistent in localStorage & Supabase sync)
  const [internalStaffUsers, setInternalStaffUsers] = useState<StaffUser[]>(() => {
    try {
      const saved = localStorage.getItem('kuickmart_staff_users');
      const parsed = saved ? JSON.parse(saved) : INITIAL_STAFF_USERS;
      return ensureStaffPermissions(parsed);
    } catch {
      return ensureStaffPermissions(INITIAL_STAFF_USERS);
    }
  });

  const staffUsers = propStaffUsers && propStaffUsers.length > 0 ? ensureStaffPermissions(propStaffUsers) : internalStaffUsers;
  const setStaffUsers = (updateAction: StaffUser[] | ((prev: StaffUser[]) => StaffUser[])) => {
    const updatedUsers = typeof updateAction === 'function' ? updateAction(staffUsers) : updateAction;
    if (onUpdateStaffUsers) {
      onUpdateStaffUsers(updatedUsers);
    }
    setInternalStaffUsers(updatedUsers);
    try {
      localStorage.setItem('kuickmart_staff_users', JSON.stringify(updatedUsers));
    } catch (e) {
      console.error(e);
    }
  };

  // Internal fallback for receipt configs if not provided via props
  const [internalReceiptConfigs, setInternalReceiptConfigs] = useState<ReceiptInfo[]>(() => {
    try {
      const saved = localStorage.getItem('nusamart_receipt_configs');
      return saved ? JSON.parse(saved) : INITIAL_RECEIPT_CONFIGS;
    } catch {
      return INITIAL_RECEIPT_CONFIGS;
    }
  });

  const activeReceiptConfigs = receiptConfigs || internalReceiptConfigs;
  const handleUpdateReceiptConfigs = (newConfigs: ReceiptInfo[]) => {
    if (onUpdateReceiptConfigs) {
      onUpdateReceiptConfigs(newConfigs);
    }
    setInternalReceiptConfigs(newConfigs);
    try {
      localStorage.setItem('nusamart_receipt_configs', JSON.stringify(newConfigs));
    } catch (e) {
      console.error(e);
    }
  };

  // Internal fallback for store promos if not provided via props
  const [internalStorePromos, setInternalStorePromos] = useState<StorePromoInfo[]>(() => {
    try {
      const saved = localStorage.getItem('nusamart_store_promos');
      return saved ? JSON.parse(saved) : INITIAL_STORE_PROMOS;
    } catch {
      return INITIAL_STORE_PROMOS;
    }
  });

  const activeStorePromos = storePromos || internalStorePromos;
  const handleUpdateStorePromos = (newPromos: StorePromoInfo[]) => {
    if (onUpdateStorePromos) {
      onUpdateStorePromos(newPromos);
    }
    setInternalStorePromos(newPromos);
    try {
      localStorage.setItem('nusamart_store_promos', JSON.stringify(newPromos));
    } catch (e) {
      console.error(e);
    }
  };

  // Internal fallback for couriers if not provided via props
  const [internalCouriers, setInternalCouriers] = useState<CourierInfo[]>(() => {
    try {
      const saved = localStorage.getItem('kuickmart_couriers');
      return saved ? JSON.parse(saved) : INITIAL_COURIERS;
    } catch {
      return INITIAL_COURIERS;
    }
  });

  const activeCouriers = couriers || internalCouriers;
  const handleUpdateCouriers = (newCouriers: CourierInfo[]) => {
    if (onUpdateCouriers) {
      onUpdateCouriers(newCouriers);
    }
    setInternalCouriers(newCouriers);
    try {
      localStorage.setItem('kuickmart_couriers', JSON.stringify(newCouriers));
    } catch (e) {
      console.error(e);
    }
  };

  // Internal fallback for brand config if not provided via props
  const [internalBrandConfig, setInternalBrandConfig] = useState<BrandHeaderFooterConfig>(() => {
    try {
      const saved = localStorage.getItem('kuickmart_brand_config');
      return saved ? JSON.parse(saved) : INITIAL_BRAND_CONFIG;
    } catch {
      return INITIAL_BRAND_CONFIG;
    }
  });

  const activeBrandConfig = brandConfig || internalBrandConfig;
  const handleUpdateBrandConfig = useCallback((newConfig: BrandHeaderFooterConfig) => {
    if (onUpdateBrandConfig) {
      onUpdateBrandConfig(newConfig);
    }
    setInternalBrandConfig(newConfig);
    try {
      localStorage.setItem('kuickmart_brand_config', JSON.stringify(newConfig));
      window.dispatchEvent(new CustomEvent('brand_config_updated', { detail: newConfig }));
    } catch (e) {
      console.error(e);
    }
  }, [onUpdateBrandConfig]);

  // Login Authentication State - Persist session if user previously logged in
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('kuickmart_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [inputUsername, setInputUsername] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Periksa sesi tersimpan saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setLoginError(null);
      try {
        const saved = localStorage.getItem('kuickmart_admin_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.username && parsed.role) {
            const match = (staffUsers || []).find(
              u => (u?.username || '').toLowerCase() === parsed.username.toLowerCase()
            );
            if (!match || match.isActive) {
              setCurrentUser(parsed);
              return;
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [isOpen]);

  const handleClose = () => {
    setLoginError(null);
    onClose();
  };

  // Tab State
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'stores' | 'vouchers' | 'users' | 'permissions' | 'bulk_import' | 'receipts' | 'promos' | 'couriers' | 'brand_info' | 'push_notifications'>(initialTab || 'products');
  const [userSubTab, setUserSubTab] = useState<'accounts' | 'permissions'>('accounts');
  
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [productSearch, setProductSearch] = useState('');
  
  // Product Edit/Add State
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('snack-biscuit');
  const [formPrice, setFormPrice] = useState(15000);
  const [formOriginalPrice, setFormOriginalPrice] = useState(15000);
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formStock, setFormStock] = useState(50);
  const [formBarcode, setFormBarcode] = useState('');
  const [formImage, setFormImage] = useState('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400');
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formTags, setFormTags] = useState<string>('Best Seller');
  const [formConversions, setFormConversions] = useState<ProductUnitConversion[]>([]);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productFeedback, setProductFeedback] = useState<{ type: 'success' | 'error'; message: string; isRlsError?: boolean } | null>(null);

  // Orders Sync State & Handler
  const [isSyncingOrders, setIsSyncingOrders] = useState(false);
  const [orderSyncFeedback, setOrderSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSyncAllOrdersToSupabase = async () => {
    if (!isSupabaseConnected) {
      setOrderSyncFeedback({
        type: 'error',
        message: 'Supabase belum terhubung. Silakan hubungkan database Supabase terlebih dahulu.'
      });
      return;
    }
    if (orders.length === 0) {
      setOrderSyncFeedback({
        type: 'error',
        message: 'Tidak ada data transaksi pesanan untuk disinkronkan.'
      });
      return;
    }

    setIsSyncingOrders(true);
    setOrderSyncFeedback(null);
    try {
      let successCount = 0;
      let lastError = '';
      for (const order of orders) {
        const res = await syncOrderToSupabase(order);
        if (res.success) {
          successCount++;
        } else if (res.error) {
          lastError = res.error;
        }
      }

      if (successCount === orders.length) {
        setOrderSyncFeedback({
          type: 'success',
          message: `Berhasil! Seluruh ${successCount} transaksi pesanan dan rincian barang terjual telah tersimpan aman di database Supabase.`
        });
      } else {
        setOrderSyncFeedback({
          type: 'error',
          message: `Tersinkron ${successCount} dari ${orders.length} pesanan. Info: ${lastError}`
        });
      }
    } catch (err: any) {
      setOrderSyncFeedback({
        type: 'error',
        message: `Terjadi kendala sinkronisasi: ${err?.message || err}`
      });
    } finally {
      setIsSyncingOrders(false);
    }
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingImage(true);
      const compressedDataUrl = await compressImageFile(file, 600, 0.85);
      setFormImage(compressedDataUrl);
      setImagePreviewError(false);
    } catch (err) {
      console.error(err);
      alert('Gagal memproses file foto. Pastikan format file adalah gambar (JPG/PNG).');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Interactive Conversion Calculator Modal State
  const [showConversionCalculator, setShowConversionCalculator] = useState(false);
  const [calcProductId, setCalcProductId] = useState<string>('');
  const [calcSelectedUnit, setCalcSelectedUnit] = useState<string>('Dus');
  const [calcQty, setCalcQty] = useState<number | string>(2);

  // Store Edit/Add State
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  const [storeName, setStoreName] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeCity, setStoreCity] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeOpenHours, setStoreOpenHours] = useState('06.00 - 23.00 WIB');
  const [storeDistanceKm, setStoreDistanceKm] = useState(1.0);
  const [storeDeliveryFee, setStoreDeliveryFee] = useState(8000);
  const [storeMinOrder, setStoreMinOrder] = useState(25000);
  const [storeIsOpen, setStoreIsOpen] = useState(true);
  const [storeIs24Hours, setStoreIs24Hours] = useState(false);
  const [storeReadyForPickup, setStoreReadyForPickup] = useState(true);
  const [storeReadyForDelivery, setStoreReadyForDelivery] = useState(true);
  const [storeFeedback, setStoreFeedback] = useState<string | null>(null);

  // User Management State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [userName, setUserName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userPin, setUserPin] = useState('');
  const [showUserPin, setShowUserPin] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'supervisor' | 'kasir' | 'gudang'>('kasir');
  const [userStoreId, setUserStoreId] = useState('all');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userIsActive, setUserIsActive] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userFilterRole, setUserFilterRole] = useState<string>('all');
  const [userFeedback, setUserFeedback] = useState<string | null>(null);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<StaffUser | null>(null);
  const [userCustomPermissions, setUserCustomPermissions] = useState<UserPermissions>(() => DEFAULT_ROLE_PERMISSIONS.kasir);
  const [showUserPinInTable, setShowUserPinInTable] = useState<Record<string, boolean>>({});

  // Hak akses user yang sedang login
  const currentUserPermissions: UserPermissions = useMemo(() => {
    if (!currentUser) return DEFAULT_ROLE_PERMISSIONS.kasir;
    return getEffectivePermissions(currentUser.role, currentUser.permissions);
  }, [currentUser]);

  // Simpan hak akses per modul untuk user tertentu
  const handleSaveUserPermissions = async (targetUserId: string, newPermissions: UserPermissions) => {
    const updatedList = staffUsers.map(u => {
      if (u.id === targetUserId) {
        return {
          ...u,
          permissions: newPermissions,
        };
      }
      return u;
    });

    setStaffUsers(updatedList);

    const targetUser = staffUsers.find(u => u.id === targetUserId);
    if (targetUser && isSupabaseConnected) {
      saveStaffUserToSupabase({
        ...targetUser,
        permissions: newPermissions,
      }).catch(console.error);
    }

    if (targetUser && currentUser && (currentUser.username || '').toLowerCase() === (targetUser.username || '').toLowerCase()) {
      setCurrentUser(prev => prev ? { ...prev, permissions: newPermissions } : null);
    }

    setUserFeedback(`Hak akses modul untuk "${targetUser?.name || 'Staff'}" berhasil diperbarui!`);
    setTimeout(() => setUserFeedback(null), 3500);
  };

  const handleUpdateStaffUsersFromAccessManager = (updatedUsers: StaffUser[]) => {
    setStaffUsers(updatedUsers);
    if (currentUser) {
      const match = (updatedUsers || []).find(u => (u?.username || '').toLowerCase() === (currentUser.username || '').toLowerCase());
      if (match) {
        setCurrentUser(match);
        try {
          localStorage.setItem('pos_current_user', JSON.stringify(match));
        } catch (e) {
          console.error(e);
        }
      }
    }
    if (isSupabaseConnected) {
      updatedUsers.forEach(u => saveStaffUserToSupabase(u).catch(console.error));
    }
  };

  // Reset default akun & izin bawaan
  const handleResetDefaultStaffUsers = () => {
    if (window.confirm('Sinkronkan & pastikan 4 akun peran bawaan (admin, spv, kasir, gudang) tersedia dengan izin standar? Akun kustom Anda tidak akan dihapus.')) {
      const reset = ensureStaffPermissions(staffUsers);
      setStaffUsers(reset);
      setUserFeedback('Akun bawaan dan hak akses modul berhasil disinkronkan!');
      setTimeout(() => setUserFeedback(null), 3500);
    }
  };

  // Voucher Management State
  const [isAddingVoucher, setIsAddingVoucher] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherTitle, setVoucherTitle] = useState('');
  const [voucherType, setVoucherType] = useState<'percentage' | 'fixed' | 'free_shipping'>('percentage');
  const [voucherDiscountAmount, setVoucherDiscountAmount] = useState(20);
  const [voucherMinSpend, setVoucherMinSpend] = useState(50000);
  const [voucherMaxDiscount, setVoucherMaxDiscount] = useState(25000);
  const [voucherValidUntil, setVoucherValidUntil] = useState('31 Des 2026');
  const [voucherDescription, setVoucherDescription] = useState('');
  const [voucherSearch, setVoucherSearch] = useState('');
  const [voucherFilterType, setVoucherFilterType] = useState<string>('all');
  const [voucherFeedback, setVoucherFeedback] = useState<string | null>(null);
  const [copiedVoucherCode, setCopiedVoucherCode] = useState<string | null>(null);

  // Bulk Import state (for spreadsheet data)
  const [bulkText, setBulkText] = useState(`DJARUM SUPER | 24000 | 50 | rokok-tembakau | Djarum
DJARUM COKLAT | 18000 | 45 | rokok-tembakau | Djarum
LA BOLD 20 | 32000 | 60 | rokok-tembakau | Djarum
LA LIGHT | 30000 | 40 | rokok-tembakau | Djarum
MLD BLACK 16 | 31000 | 55 | rokok-tembakau | Djarum
DJARUM 76 MANGGA | 16500 | 30 | rokok-tembakau | Djarum`);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Login Action (Dynamic Authentication against staffUsers + fallback DEFAULT_ACCOUNTS only for unseeded users)
  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);

    const cleanInputUser = inputUsername.trim().toLowerCase();
    const cleanPin = inputPin.trim();

    if (!cleanInputUser || !cleanPin) {
      setLoginError('Harap masukkan ID Pengguna dan Password/PIN.');
      return;
    }

    // 1. Cek apakah pengguna terdaftar di daftar staffUsers aktif
    const staffMatch = (staffUsers || []).find(
      u => (u?.username || '').toLowerCase() === cleanInputUser
    );

    let matchedAccount: StaffUser | typeof DEFAULT_ACCOUNTS[0] | null = null;

    if (staffMatch) {
      // Pengguna terdaftar dalam sistem: Wajib mencocokkan password/PIN terbaru dari staffUsers
      if (String(staffMatch.pin).trim() === cleanPin) {
        matchedAccount = staffMatch;
      } else {
        setLoginError('Password / PIN yang Anda masukkan salah. Silakan periksa kembali.');
        return;
      }
    } else {
      // 2. Hanya fallback ke DEFAULT_ACCOUNTS jika username ini belum ada di data staffUsers sama sekali
      const defaultMatch = DEFAULT_ACCOUNTS.find(
        acc => (acc?.username || '').toLowerCase() === cleanInputUser && String(acc.pin).trim() === cleanPin
      );
      if (defaultMatch) {
        matchedAccount = defaultMatch;
      }
    }

    if (matchedAccount) {
      if (staffMatch && !staffMatch.isActive) {
        setLoginError('Akun ini sedang dinonaktifkan oleh Administrator Toko.');
        return;
      }

      // Record last login
      const nowStr = new Intl.DateTimeFormat('id-ID', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date());

      if (staffMatch) {
        setStaffUsers(prev => prev.map(u => 
          u.id === staffMatch.id ? { ...u, lastLogin: `${nowStr} WIB` } : u
        ));
      }

      const userPerms = staffMatch?.permissions || (matchedAccount as any).permissions || DEFAULT_ROLE_PERMISSIONS[matchedAccount.role as keyof typeof DEFAULT_ROLE_PERMISSIONS] || DEFAULT_ROLE_PERMISSIONS.kasir;

      const authUser: AdminUser = {
        username: matchedAccount.username,
        role: matchedAccount.role,
        name: matchedAccount.name,
        permissions: userPerms,
      };

      setCurrentUser(authUser);
      try {
        localStorage.setItem('kuickmart_admin_user', JSON.stringify(authUser));
      } catch (e) {
        console.error(e);
      }
      setLoginError(null);
      setInputPin('');

      // Auto-redirect if current activeTab is not permitted to view
      const effPerms = getEffectivePermissions(matchedAccount.role, userPerms);
      const currentModule = activeTab as SystemModuleKey;
      if (!effPerms[currentModule]?.canView) {
        const orderPriority: SystemModuleKey[] = ['products', 'orders', 'promos', 'couriers', 'receipts', 'stores', 'vouchers', 'users', 'brand_info', 'bulk_import'];
        const firstViewable = orderPriority.find(k => effPerms[k]?.canView) || 'orders';
        setActiveTab(firstViewable as any);
      }
    } else {
      setLoginError('ID Pengguna tidak ditemukan atau Password/PIN salah. Silakan coba kembali.');
    }
  };

  // Quick Instant Login for seamless access / demo switching
  const handleQuickLogin = (targetUsername: string, fallbackPin?: string) => {
    setLoginError(null);
    const cleanInputUser = targetUsername.trim().toLowerCase();

    // 1. Cek di data staffUsers
    const staffMatch = (staffUsers || []).find(
      u => (u?.username || '').toLowerCase() === cleanInputUser
    );
    const defaultMatch = DEFAULT_ACCOUNTS.find(
      acc => (acc?.username || '').toLowerCase() === cleanInputUser
    );

    const matchedAccount = staffMatch || defaultMatch;

    if (matchedAccount) {
      if (staffMatch && !staffMatch.isActive) {
        // Auto-reactivate on explicit quick login
        setStaffUsers(prev => prev.map(u => u.id === staffMatch.id ? { ...u, isActive: true } : u));
      }

      const nowStr = new Intl.DateTimeFormat('id-ID', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date());

      if (staffMatch) {
        setStaffUsers(prev => prev.map(u => 
          u.id === staffMatch.id ? { ...u, lastLogin: `${nowStr} WIB`, isActive: true } : u
        ));
      }

      const userPerms = staffMatch?.permissions || (matchedAccount as any).permissions || DEFAULT_ROLE_PERMISSIONS[matchedAccount.role as keyof typeof DEFAULT_ROLE_PERMISSIONS] || DEFAULT_ROLE_PERMISSIONS.admin;

      const authUser: AdminUser = {
        username: matchedAccount.username,
        role: matchedAccount.role,
        name: matchedAccount.name,
        permissions: userPerms,
      };

      setCurrentUser(authUser);
      try {
        localStorage.setItem('kuickmart_admin_user', JSON.stringify(authUser));
      } catch (e) {
        console.error(e);
      }
      setLoginError(null);
      setInputUsername('');
      setInputPin('');

      // Auto-redirect if current activeTab is not permitted to view
      const effPerms = getEffectivePermissions(matchedAccount.role, userPerms);
      const currentModule = activeTab as SystemModuleKey;
      if (!effPerms[currentModule]?.canView) {
        const orderPriority: SystemModuleKey[] = ['products', 'orders', 'promos', 'couriers', 'receipts', 'stores', 'vouchers', 'users', 'brand_info', 'bulk_import'];
        const firstViewable = orderPriority.find(k => effPerms[k]?.canView) || 'products';
        setActiveTab(firstViewable as any);
      }
    } else {
      setLoginError(`Akun "${targetUsername}" tidak ditemukan. Silakan reset ke akun bawaan.`);
    }
  };

  const handleResetStaffToDefaults = () => {
    if (window.confirm('Reset semua akun staff dan password ke konfigurasi bawaan (Admin: admin123, SPV: spv2026, Kasir: 1234, Gudang: gudang2026)?')) {
      setStaffUsers(INITIAL_STAFF_USERS);
      try {
        localStorage.setItem('kuickmart_staff_users', JSON.stringify(INITIAL_STAFF_USERS));
      } catch {}
      setLoginError(null);
      setInputUsername('admin');
      setInputPin('admin123');
      setUserFeedback('Data akun staff berhasil direset ke pengaturan default.');
      setTimeout(() => setUserFeedback(null), 3500);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Yakin ingin keluar dari sesi Admin KuickMart?')) {
      setCurrentUser(null);
      setInputUsername('');
      setInputPin('');
      setLoginError(null);
      try {
        localStorage.removeItem('kuickmart_admin_user');
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Stats calculation
  const totalRevenue = (orders || []).reduce((sum, o) => sum + (o.status !== 'cancelled' ? (o.total || 0) : 0), 0);
  const totalProducts = (products || []).length;
  const lowStockCount = (products || []).filter(p => (p?.stock || 0) < 10).length;

  // PRODUCT ACTIONS
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    setFormBrand('');
    setFormCategory('snack-biscuit');
    setFormPrice(15000);
    setFormOriginalPrice(15000);
    setFormUnit('Pcs');
    setFormStock(50);
    setFormBarcode(Math.floor(1000000000000 + Math.random() * 9000000000000).toString());
    setFormImage('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400');
    setFormDescription('Produk segar dan berkualitas KuickMart Express');
    setFormTags('Best Seller');
    setFormConversions([]);
    setIsAddingProduct(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormBrand(p.brand);
    setFormCategory(p.category);
    setFormPrice(p.price);
    setFormOriginalPrice(p.originalPrice || p.price);
    setFormUnit(p.unit);
    setFormStock(p.stock);
    setFormBarcode(p.barcode);
    setFormImage(p.image);
    setFormDescription(p.description);
    setFormTags(p.tags?.join(', ') || '');
    setFormConversions(p.unitConversions ? [...p.unitConversions] : []);
    setIsAddingProduct(true);
  };

  // Unit Conversion Handlers for Product Form
  const handleAddConversionRow = () => {
    const base = formUnit.trim() || 'Pcs';
    const fallbackParent = formConversions.length > 0 ? formConversions[formConversions.length - 1].unitName : base;
    const newRow: ProductUnitConversion = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      unitName: formConversions.length === 0 ? 'Box' : 'Dus',
      containsQty: 12,
      containsUnit: fallbackParent,
      totalMultiplier: 12,
      price: undefined,
      description: '',
    };
    const updated = [...formConversions, newRow];
    setFormConversions(computeConversionChains(base, updated));
  };

  const handleUpdateConversionField = (index: number, field: keyof ProductUnitConversion, value: any) => {
    const base = formUnit.trim() || 'Pcs';
    const updated = [...formConversions];
    updated[index] = { ...updated[index], [field]: value };
    setFormConversions(computeConversionChains(base, updated));
  };

  const handleRemoveConversionRow = (index: number) => {
    const base = formUnit.trim() || 'Pcs';
    const updated = formConversions.filter((_, idx) => idx !== index);
    setFormConversions(computeConversionChains(base, updated));
  };

  const handleApplyPreset = (type: 'dus-box-pcs' | 'dus-lusin-pcs' | 'dus-pcs' | 'karung-bal-pak-pcs' | 'karton-pak-bks' | 'slop-bks-btg') => {
    const base = formUnit.trim() || 'Pcs';
    let newConvs: ProductUnitConversion[] = [];

    if (type === 'dus-box-pcs') {
      // 1 Dus -> 2 Box, 1 Box -> 12 Pcs => 1 Dus = 24 Pcs (User's exact example)
      newConvs = [
        {
          id: `conv_${Date.now()}_1`,
          unitName: 'Box',
          containsQty: 12,
          containsUnit: base,
          totalMultiplier: 12,
          price: formPrice > 0 ? formPrice * 12 : undefined,
          description: `1 Box = 12 ${base}`,
        },
        {
          id: `conv_${Date.now()}_2`,
          unitName: 'Dus',
          containsQty: 2,
          containsUnit: 'Box',
          totalMultiplier: 24,
          price: formPrice > 0 ? formPrice * 24 : undefined,
          description: `1 Dus = 2 Box × 12 ${base} = 24 ${base}`,
        },
      ];
    } else if (type === 'dus-lusin-pcs') {
      newConvs = [
        {
          id: `conv_${Date.now()}_1`,
          unitName: 'Lusin',
          containsQty: 12,
          containsUnit: base,
          totalMultiplier: 12,
          price: formPrice > 0 ? formPrice * 12 : undefined,
          description: `1 Lusin = 12 ${base}`,
        },
        {
          id: `conv_${Date.now()}_2`,
          unitName: 'Dus',
          containsQty: 2,
          containsUnit: 'Lusin',
          totalMultiplier: 24,
          price: formPrice > 0 ? formPrice * 24 : undefined,
          description: `1 Dus = 2 Lusin × 12 ${base} = 24 ${base}`,
        },
      ];
    } else if (type === 'dus-pcs') {
      newConvs = [
        {
          id: `conv_${Date.now()}_1`,
          unitName: 'Dus',
          containsQty: 12,
          containsUnit: base,
          totalMultiplier: 12,
          price: formPrice > 0 ? formPrice * 12 : undefined,
          description: `1 Dus = 12 ${base}`,
        },
      ];
    } else if (type === 'karung-bal-pak-pcs') {
      newConvs = [
        {
          id: `conv_${Date.now()}_1`,
          unitName: 'Pak',
          containsQty: 20,
          containsUnit: base,
          totalMultiplier: 20,
          price: formPrice > 0 ? formPrice * 20 : undefined,
          description: `1 Pak = 20 ${base}`,
        },
        {
          id: `conv_${Date.now()}_2`,
          unitName: 'Bal',
          containsQty: 5,
          containsUnit: 'Pak',
          totalMultiplier: 100,
          price: formPrice > 0 ? formPrice * 100 : undefined,
          description: `1 Bal = 5 Pak × 20 ${base} = 100 ${base}`,
        },
        {
          id: `conv_${Date.now()}_3`,
          unitName: 'Karung',
          containsQty: 10,
          containsUnit: 'Bal',
          totalMultiplier: 1000,
          price: formPrice > 0 ? formPrice * 1000 : undefined,
          description: `1 Karung = 10 Bal × 5 Pak × 20 ${base} = 1.000 ${base}`,
        },
      ];
    } else if (type === 'karton-pak-bks') {
      newConvs = [
        {
          id: `conv_${Date.now()}_1`,
          unitName: 'Pak',
          containsQty: 10,
          containsUnit: base,
          totalMultiplier: 10,
          price: formPrice > 0 ? formPrice * 10 : undefined,
          description: `1 Pak = 10 ${base}`,
        },
        {
          id: `conv_${Date.now()}_2`,
          unitName: 'Karton',
          containsQty: 4,
          containsUnit: 'Pak',
          totalMultiplier: 40,
          price: formPrice > 0 ? formPrice * 40 : undefined,
          description: `1 Karton = 4 Pak × 10 ${base} = 40 ${base}`,
        },
      ];
    } else if (type === 'slop-bks-btg') {
      newConvs = [
        {
          id: `conv_${Date.now()}_1`,
          unitName: 'Bungkus',
          containsQty: 16,
          containsUnit: base,
          totalMultiplier: 16,
          price: formPrice > 0 ? formPrice * 16 : undefined,
          description: `1 Bungkus = 16 ${base}`,
        },
        {
          id: `conv_${Date.now()}_2`,
          unitName: 'Slop',
          containsQty: 10,
          containsUnit: 'Bungkus',
          totalMultiplier: 160,
          price: formPrice > 0 ? formPrice * 160 : undefined,
          description: `1 Slop = 10 Bungkus × 16 ${base} = 160 ${base}`,
        },
      ];
    }
    setFormConversions(computeConversionChains(base, newConvs));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const discount = formOriginalPrice > formPrice ? Math.round(((formOriginalPrice - formPrice) / formOriginalPrice) * 100) : 0;
    const tagList = formTags ? formTags.split(',').map(t => t.trim()) : [];

    const validConversions = formConversions
      .filter(c => c.unitName && c.unitName.trim().length > 0 && Number(c.containsQty) > 0)
      .map(c => ({
        ...c,
        containsQty: Math.max(1, Number(c.containsQty) || 1),
      }));
    const finalConversions = validConversions.length > 0 ? computeConversionChains(formUnit.trim() || 'Pcs', validConversions) : undefined;

    setIsSavingProduct(true);
    setProductFeedback(null);

    try {
      if (editingProduct) {
        const updatedProd: Product = {
          ...editingProduct,
          name: formName,
          brand: formBrand,
          category: formCategory,
          price: Number(formPrice),
          originalPrice: Number(formOriginalPrice),
          discountPercent: discount,
          unit: formUnit,
          stock: Number(formStock),
          barcode: formBarcode,
          image: formImage,
          description: formDescription,
          tags: tagList as any,
          unitConversions: finalConversions,
        };

        if (onEditProduct) {
          const res = await onEditProduct(updatedProd);
          if (!res.success && res.error) {
            const isRls = res.error.toLowerCase().includes('violates row-level security') || res.error.toLowerCase().includes('rls');
            setProductFeedback({
              type: 'error',
              message: `Perubahan tersimpan di browser, namun gagal disimpan ke Supabase: "${res.error}".`,
              isRlsError: isRls,
            });
          } else {
            setProductFeedback({
              type: 'success',
              message: isSupabaseConnected 
                ? 'Perubahan info produk berhasil disimpan permanen ke Supabase Cloud!' 
                : 'Perubahan produk berhasil disimpan!',
            });
          }
        } else {
          onUpdateProducts(products.map(p => p.id === updatedProd.id ? updatedProd : p));
          setProductFeedback({
            type: 'success',
            message: 'Perubahan produk berhasil disimpan!',
          });
        }
      } else {
        const newProd: Product = {
          id: `prod_${Date.now()}`,
          name: formName,
          brand: formBrand,
          category: formCategory,
          price: Number(formPrice),
          originalPrice: Number(formOriginalPrice),
          discountPercent: discount,
          unit: formUnit,
          stock: Number(formStock),
          barcode: formBarcode || Math.floor(1000000000000 + Math.random() * 9000000000000).toString(),
          image: formImage,
          description: formDescription,
          rating: 4.8,
          soldCount: 0,
          tags: tagList as any,
          unitConversions: finalConversions,
        };

        if (onAddProduct) {
          const res = await onAddProduct(newProd);
          if (!res.success && res.error) {
            const isRls = res.error.toLowerCase().includes('violates row-level security') || res.error.toLowerCase().includes('rls');
            setProductFeedback({
              type: 'error',
              message: `Produk tersimpan di lokal, namun GAGAL disimpan ke Supabase Cloud: "${res.error}".`,
              isRlsError: isRls,
            });
          } else {
            setProductFeedback({
              type: 'success',
              message: isSupabaseConnected 
                ? `Produk "${newProd.name}" berhasil ditambahkan dan tersimpan permanen ke Supabase Cloud!` 
                : `Produk "${newProd.name}" berhasil ditambahkan ke katalog lokal!`,
            });
          }
        } else {
          onUpdateProducts([newProd, ...products]);
          setProductFeedback({
            type: 'success',
            message: `Produk "${newProd.name}" berhasil ditambahkan!`,
          });
        }
      }
      setIsAddingProduct(false);
      setEditingProduct(null);
    } catch (err: any) {
      setProductFeedback({
        type: 'error',
        message: `Gagal menyimpan produk: ${err.message || err}`,
      });
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus produk ini dari katalog?')) {
      if (onDeleteProduct) {
        await onDeleteProduct(id);
      } else {
        onUpdateProducts(products.filter(p => p.id !== id));
      }
      setProductFeedback({
        type: 'success',
        message: 'Produk berhasil dihapus dari katalog.',
      });
      setTimeout(() => setProductFeedback(null), 4000);
    }
  };

  // STORE MANAGEMENT ACTIONS
  const handleOpenAddStore = () => {
    setEditingStore(null);
    setStoreName('KuickMart Express - Cabang Baru');
    setStoreCode(`KM-${Math.floor(100 + Math.random() * 900)}`);
    setStoreAddress('Jl. Raya Utama No. 10');
    setStoreCity('');
    setStorePhone('021-88990011');
    setStoreOpenHours('06.00 - 23.00 WIB');
    setStoreDistanceKm(1.2);
    setStoreDeliveryFee(8000);
    setStoreMinOrder(25000);
    setStoreIsOpen(true);
    setStoreIs24Hours(false);
    setStoreReadyForPickup(true);
    setStoreReadyForDelivery(true);
    setIsAddingStore(true);
  };

  const handleOpenEditStore = (store: Store) => {
    setEditingStore(store);
    setStoreName(store.name);
    setStoreCode(store.code);
    setStoreAddress(store.address);
    setStoreCity(store.city);
    setStorePhone(store.phone);
    setStoreOpenHours(store.openHours);
    setStoreDistanceKm(store.distanceKm);
    setStoreDeliveryFee(store.deliveryFee);
    setStoreMinOrder(store.minOrder);
    setStoreIsOpen(store.isOpen);
    setStoreIs24Hours(store.is24Hours);
    setStoreReadyForPickup(store.readyForPickup);
    setStoreReadyForDelivery(store.readyForDelivery);
    setIsAddingStore(true);
  };

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !storeAddress.trim()) {
      alert('Nama dan alamat cabang toko wajib diisi!');
      return;
    }

    if (editingStore) {
      const updatedStore: Store = {
        ...editingStore,
        name: storeName.trim(),
        code: storeCode.trim() || editingStore.code,
        address: storeAddress.trim(),
        city: storeCity.trim(),
        phone: storePhone.trim(),
        openHours: storeIs24Hours ? 'Buka 24 Jam Non-Stop' : storeOpenHours.trim(),
        distanceKm: Number(storeDistanceKm) || 1.0,
        deliveryFee: Number(storeDeliveryFee) || 0,
        minOrder: Number(storeMinOrder) || 0,
        isOpen: storeIsOpen,
        is24Hours: storeIs24Hours,
        readyForPickup: storeReadyForPickup,
        readyForDelivery: storeReadyForDelivery,
      };

      const newStoreList = stores.map(s => s.id === editingStore.id ? updatedStore : s);
      onUpdateStores(newStoreList);

      // If updating currently selected store, refresh selected store
      if (currentStore.id === editingStore.id) {
        onSelectStore(updatedStore);
      }

      setStoreFeedback(`Informasi cabang "${updatedStore.name}" berhasil diperbarui!`);
    } else {
      const newStore: Store = {
        id: `str_${Date.now()}`,
        name: storeName.trim(),
        code: storeCode.trim() || `KM-${Math.floor(100 + Math.random() * 900)}`,
        address: storeAddress.trim(),
        city: storeCity.trim() || 'Jakarta',
        phone: storePhone.trim() || '021-12345678',
        openHours: storeIs24Hours ? 'Buka 24 Jam Non-Stop' : storeOpenHours.trim(),
        distanceKm: Number(storeDistanceKm) || 1.0,
        deliveryFee: Number(storeDeliveryFee) || 8000,
        minOrder: Number(storeMinOrder) || 25000,
        isOpen: storeIsOpen,
        is24Hours: storeIs24Hours,
        readyForPickup: storeReadyForPickup,
        readyForDelivery: storeReadyForDelivery,
      };

      onUpdateStores([...stores, newStore]);
      setStoreFeedback(`Cabang baru "${newStore.name}" berhasil ditambahkan!`);
    }

    setTimeout(() => setStoreFeedback(null), 3500);
    setIsAddingStore(false);
    setEditingStore(null);
  };

  const handleDeleteStore = (storeId: string, storeNameToDelete: string) => {
    if (stores.length <= 1) {
      alert('Minimal harus ada 1 cabang toko aktif di sistem!');
      return;
    }
    if (window.confirm(`Yakin ingin menghapus cabang toko "${storeNameToDelete}"?`)) {
      const remaining = stores.filter(s => s.id !== storeId);
      onUpdateStores(remaining);
      if (currentStore.id === storeId) {
        onSelectStore(remaining[0]);
      }
      setStoreFeedback(`Cabang "${storeNameToDelete}" berhasil dihapus.`);
      setTimeout(() => setStoreFeedback(null), 3500);
    }
  };

  // Quick bulk import parser
  const handleBulkImport = () => {
    try {
      const lines = bulkText.split('\n').filter(l => l.trim().length > 0);
      const newItems: Product[] = [];

      lines.forEach((line, index) => {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 2) {
          const name = parts[0];
          const price = parseInt(parts[1].replace(/[^0-9]/g, ''), 10) || 15000;
          const stock = parts[2] ? parseInt(parts[2], 10) || 30 : 30;
          const category = parts[3] || 'sembako-dapur';
          const brand = parts[4] || 'KuickMart';

          newItems.push({
            id: `bulk_${Date.now()}_${index}`,
            name,
            brand,
            category,
            price,
            originalPrice: price,
            unit: 'Pcs / Bks',
            stock,
            rating: 4.9,
            soldCount: 0,
            barcode: Math.floor(8990000000000 + Math.random() * 999999999).toString(),
            image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400',
            description: `Produk resmi ${name} berkualitas tinggi di minimarket KuickMart Express.`,
            tags: ['Best Seller'],
          });
        }
      });

      if (newItems.length > 0) {
        onUpdateProducts([...newItems, ...products]);
        setImportFeedback(`Berhasil menambahkan ${newItems.length} produk ke dalam katalog!`);
        setTimeout(() => setImportFeedback(null), 4000);
      }
    } catch (err: any) {
      setImportFeedback(`Gagal import: ${err.message}`);
    }
  };

  const filteredCatalog = (products || []).filter(p => {
    if (!p) return false;
    const name = (p.name || '').toLowerCase();
    const brand = (p.brand || '').toLowerCase();
    const barcode = p.barcode || '';
    const search = (productSearch || '').toLowerCase();
    return name.includes(search) || brand.includes(search) || barcode.includes(productSearch);
  });

  // USER MANAGEMENT HANDLERS
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserName('');
    setUserUsername('');
    setUserPin('');
    setShowUserPin(false);
    setUserRole('kasir');
    setUserCustomPermissions(DEFAULT_ROLE_PERMISSIONS.kasir);
    setUserStoreId(stores.length > 0 ? stores[0].id : 'all');
    setUserPhone('');
    setUserEmail('');
    setUserIsActive(true);
    setIsAddingUser(true);
  };

  const handleOpenEditUser = (u: StaffUser) => {
    setEditingUser(u);
    setUserName(u.name);
    setUserUsername(u.username);
    setUserPin(u.pin);
    setShowUserPin(false);
    setUserRole(u.role);
    setUserCustomPermissions(getEffectivePermissions(u.role, u.permissions));
    setUserStoreId(u.storeId || 'all');
    setUserPhone(u.phone || '');
    setUserEmail(u.email || '');
    setUserIsActive(u.isActive);
    setIsAddingUser(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userUsername.trim() || !userPin.trim()) {
      alert('Nama, Username, dan Password/PIN wajib diisi!');
      return;
    }

    const cleanUsername = userUsername.trim().toLowerCase();

    // Check duplicate username
    const duplicate = (staffUsers || []).find(
      u => (u?.username || '').toLowerCase() === cleanUsername && (!editingUser || u.id !== editingUser.id)
    );
    if (duplicate) {
      alert(`Username "${cleanUsername}" sudah digunakan! Silakan pilih username lain.`);
      return;
    }

    const selectedStore = stores.find(s => s.id === userStoreId);
    const storeDisplayName = userStoreId === 'all' ? 'Semua Cabang' : (selectedStore ? selectedStore.name : 'Semua Cabang');

    if (editingUser) {
      const updated: StaffUser = {
        ...editingUser,
        name: userName.trim(),
        username: cleanUsername,
        pin: userPin.trim(),
        role: userRole,
        permissions: userCustomPermissions,
        storeId: userStoreId,
        storeName: storeDisplayName,
        phone: userPhone.trim(),
        email: userEmail.trim(),
        isActive: userIsActive,
      };

      setStaffUsers(prev => prev.map(u => 
        (u.id === editingUser.id || (u?.username || '').toLowerCase() === (editingUser?.username || '').toLowerCase()) ? updated : u
      ));

      if (isSupabaseConnected) {
        saveStaffUserToSupabase(updated).catch(() => {});
      }

      if ((currentUser?.username || '').toLowerCase() === (editingUser?.username || '').toLowerCase()) {
        const updatedAuth: AdminUser = {
          username: cleanUsername,
          role: userRole,
          name: userName.trim(),
          permissions: userCustomPermissions,
        };
        setCurrentUser(updatedAuth);
      }

      setUserFeedback(`Password dan data akun "${updated.name}" (@${updated.username}) berhasil disimpan dan aktif!`);
    } else {
      const newUser: StaffUser = {
        id: `usr_${Date.now()}`,
        name: userName.trim(),
        username: cleanUsername,
        pin: userPin.trim(),
        role: userRole,
        permissions: userCustomPermissions,
        storeId: userStoreId,
        storeName: storeDisplayName,
        phone: userPhone.trim(),
        email: userEmail.trim(),
        isActive: userIsActive,
        createdAt: new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date()),
      };

      setStaffUsers(prev => [newUser, ...prev]);

      if (isSupabaseConnected) {
        saveStaffUserToSupabase(newUser).catch(() => {});
      }

      setUserFeedback(`Pengguna baru "${newUser.name}" (@${newUser.username}) berhasil ditambahkan!`);
    }

    setIsAddingUser(false);
    setEditingUser(null);
    setTimeout(() => setUserFeedback(null), 3500);
  };

  const handleToggleUserStatus = (u: StaffUser) => {
    if ((currentUser?.username || '').toLowerCase() === (u?.username || '').toLowerCase()) {
      alert('Anda tidak dapat menonaktifkan akun yang sedang Anda gunakan saat ini!');
      return;
    }

    const updated = staffUsers.map(item => item.id === u.id ? { ...item, isActive: !item.isActive } : item);
    setStaffUsers(updated);

    if (isSupabaseConnected) {
      saveStaffUserToSupabase({ ...u, isActive: !u.isActive }).catch(() => {});
    }

    setUserFeedback(`Status akun "${u.name}" diubah menjadi ${!u.isActive ? 'AKTIF' : 'NONAKTIF'}.`);
    setTimeout(() => setUserFeedback(null), 3500);
  };

  const handleDeleteUser = (u: StaffUser) => {
    if ((currentUser?.username || '').toLowerCase() === (u?.username || '').toLowerCase()) {
      alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan!');
      return;
    }

    const adminCount = staffUsers.filter(item => item.role === 'admin' && item.isActive).length;
    if (u.role === 'admin' && adminCount <= 1) {
      alert('Tidak dapat menghapus akun ini. Minimal harus ada 1 akun Admin utama yang aktif dalam sistem!');
      return;
    }

    if (window.confirm(`Yakin ingin menghapus akun pengguna "${u.name}" (@${u.username}) secara permanen?`)) {
      setStaffUsers(prev => prev.filter(item => item.id !== u.id));

      if (isSupabaseConnected) {
        deleteStaffUserFromSupabase(u.id).catch(() => {});
      }

      setUserFeedback(`Akun pengguna "${u.name}" telah berhasil dihapus.`);
      setTimeout(() => setUserFeedback(null), 3500);
    }
  };

  const filteredUsers = (staffUsers || []).filter(u => {
    if (!u) return false;
    const search = (userSearch || '').toLowerCase();
    const matchesSearch = 
      (u.name || '').toLowerCase().includes(search) ||
      (u.username || '').toLowerCase().includes(search) ||
      Boolean(u.phone && u.phone.includes(userSearch));
    const matchesRole = userFilterRole === 'all' || u.role === userFilterRole;
    return matchesSearch && matchesRole;
  });

  // VOUCHER & DISCOUNT HANDLERS
  const handleOpenAddVoucher = () => {
    setEditingVoucher(null);
    setVoucherCode(`KUICK${Math.floor(100 + Math.random() * 900)}`);
    setVoucherTitle('Diskon Spesial KuickMart');
    setVoucherType('percentage');
    setVoucherDiscountAmount(20);
    setVoucherMinSpend(50000);
    setVoucherMaxDiscount(25000);
    setVoucherValidUntil('31 Des 2026');
    setVoucherDescription('Potongan 20% s.d. Rp 25.000 untuk belanja di KuickMart Express');
    setIsAddingVoucher(true);
  };

  const handleOpenEditVoucher = (v: Voucher) => {
    setEditingVoucher(v);
    setVoucherCode(v.code);
    setVoucherTitle(v.title);
    setVoucherType(v.type);
    setVoucherDiscountAmount(v.discountAmount);
    setVoucherMinSpend(v.minSpend);
    setVoucherMaxDiscount(v.maxDiscount || 0);
    setVoucherValidUntil(v.validUntil);
    setVoucherDescription(v.description);
    setIsAddingVoucher(true);
  };

  const handleSaveVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim() || !voucherTitle.trim()) {
      alert('Kode voucher dan judul voucher wajib diisi!');
      return;
    }

    const cleanCode = voucherCode.trim().toUpperCase().replace(/\s+/g, '');

    if (editingVoucher) {
      const updatedVoucher: Voucher = {
        ...editingVoucher,
        code: cleanCode,
        title: voucherTitle.trim(),
        type: voucherType,
        discountAmount: Number(voucherDiscountAmount) || 0,
        minSpend: Number(voucherMinSpend) || 0,
        maxDiscount: voucherType === 'percentage' && Number(voucherMaxDiscount) > 0 ? Number(voucherMaxDiscount) : undefined,
        validUntil: voucherValidUntil.trim() || '31 Des 2026',
        description: voucherDescription.trim(),
      };

      const updatedList = vouchers.map(v => v.id === editingVoucher.id ? updatedVoucher : v);
      onUpdateVouchers(updatedList);
      setVoucherFeedback(`Voucher "${updatedVoucher.code}" berhasil diperbarui!`);
    } else {
      const newVoucher: Voucher = {
        id: `vch_${Date.now()}`,
        code: cleanCode,
        title: voucherTitle.trim(),
        type: voucherType,
        discountAmount: Number(voucherDiscountAmount) || 0,
        minSpend: Number(voucherMinSpend) || 0,
        maxDiscount: voucherType === 'percentage' && Number(voucherMaxDiscount) > 0 ? Number(voucherMaxDiscount) : undefined,
        validUntil: voucherValidUntil.trim() || '31 Des 2026',
        description: voucherDescription.trim(),
        isClaimed: false,
      };

      onUpdateVouchers([newVoucher, ...vouchers]);
      setVoucherFeedback(`Voucher baru "${newVoucher.code}" berhasil ditambahkan ke sistem!`);
    }

    setIsAddingVoucher(false);
    setEditingVoucher(null);
    setTimeout(() => setVoucherFeedback(null), 3500);
  };

  const handleDeleteVoucher = (id: string, code: string) => {
    if (window.confirm(`Yakin ingin menghapus voucher "${code}"? Pelanggan tidak akan bisa lagi menggunakan voucher ini.`)) {
      const updatedList = vouchers.filter(v => v.id !== id);
      onUpdateVouchers(updatedList);
      setVoucherFeedback(`Voucher "${code}" telah berhasil dihapus.`);
      setTimeout(() => setVoucherFeedback(null), 3500);
    }
  };

  const handleCopyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucherCode(code);
    setTimeout(() => setCopiedVoucherCode(null), 2000);
  };

  const filteredVouchers = (vouchers || []).filter(v => {
    if (!v) return false;
    const search = (voucherSearch || '').toLowerCase();
    const matchesSearch = 
      (v.code || '').toLowerCase().includes(search) ||
      (v.title || '').toLowerCase().includes(search) ||
      (v.description || '').toLowerCase().includes(search);
    const matchesType = voucherFilterType === 'all' || v.type === voucherFilterType;
    return matchesSearch && matchesType;
  });

  // ==========================================
  // IF NOT AUTHENTICATED -> RENDER LOGIN FORM
  // ==========================================
  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header Login */}
          <div className="p-6 bg-gradient-to-br from-stone-900 via-stone-800 to-blue-950 text-white relative">
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black text-2xl shadow-lg mb-3">
              KM
            </div>

            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-xl text-white">Login Admin & Kasir</h3>
              <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                KuickMart POS
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-1">
              Masukkan ID Pengguna & Password/PIN untuk mengakses manajemen katalog, pesanan, dan cabang toko.
            </p>
          </div>

          {/* Form Login (Clean tanpa label akun bawaan) */}
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl space-y-2 text-xs text-red-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{loginError}</span>
                </div>
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetStaffToDefaults}
                    className="text-[11px] font-bold text-red-800 hover:text-red-950 underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Data Akun Staff ke Bawaan (Admin: admin123)</span>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-500" />
                <span>ID Pengguna / Username:</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={inputUsername}
                  onChange={e => setInputUsername(e.target.value)}
                  placeholder="Masukkan username (admin, spv, kasir, gudang)..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 focus:border-blue-600 rounded-xl text-sm font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-stone-500" />
                <span>Password / PIN Kasir:</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={inputPin}
                  onChange={e => setInputPin(e.target.value)}
                  placeholder="Masukkan password atau PIN..."
                  className="w-full pl-3.5 pr-10 py-2.5 bg-stone-50 border border-stone-300 focus:border-blue-600 rounded-xl text-sm font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-transform active:scale-98 cursor-pointer mt-2"
            >
              <Lock className="w-4 h-4 text-amber-300" />
              <span>Masuk ke Panel Admin</span>
            </button>

            {/* Quick Demo Switcher for Testing Role Permissions */}
            <div className="pt-3 border-t border-stone-100">
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Pilih Akun & Masuk Langsung (1-Klik):</span>
                <span className="text-[9px] text-emerald-600 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  ⚡ Auto-Login
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-left">
                {(() => {
                  const getPin = (uname: string, defPin: string) => {
                    const u = (staffUsers || []).find(item => (item?.username || '').toLowerCase() === uname.toLowerCase());
                    return u?.pin || defPin;
                  };
                  const isCustom = (uname: string, defPin: string) => {
                    const u = (staffUsers || []).find(item => (item?.username || '').toLowerCase() === uname.toLowerCase());
                    return Boolean(u && u.pin !== defPin);
                  };

                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('admin', getPin('admin', 'admin123'))}
                        className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-[11px] transition-all flex flex-col text-left group active:scale-98 cursor-pointer shadow-2xs"
                        title="Klik untuk langsung masuk sebagai Store Manager (Admin)"
                      >
                        <div className="font-bold text-amber-900 flex items-center justify-between w-full">
                          <span className="flex items-center gap-1">
                            <span>👑 Admin</span>
                            <span className="text-[9px] bg-amber-200 text-amber-800 px-1 rounded font-mono">admin</span>
                          </span>
                          <span className="text-[8px] bg-amber-200/80 text-amber-900 font-extrabold px-1 rounded">
                            Masuk ➔
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-700 mt-0.5">Akses Penuh Semua Modul</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickLogin('spv', getPin('spv', 'spv2026'))}
                        className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-300 text-[11px] transition-all flex flex-col text-left group active:scale-98 cursor-pointer shadow-2xs"
                        title="Klik untuk langsung masuk sebagai Supervisor Toko"
                      >
                        <div className="font-bold text-blue-900 flex items-center justify-between w-full">
                          <span className="flex items-center gap-1">
                            <span>👔 Supervisor</span>
                            <span className="text-[9px] bg-blue-200 text-blue-800 px-1 rounded font-mono">spv</span>
                          </span>
                          <span className="text-[8px] bg-blue-200/80 text-blue-900 font-extrabold px-1 rounded">
                            Masuk ➔
                          </span>
                        </div>
                        <span className="text-[10px] text-blue-700 mt-0.5">Katalog & Cabang Toko</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickLogin('kasir', getPin('kasir', '1234'))}
                        className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-[11px] transition-all flex flex-col text-left group active:scale-98 cursor-pointer shadow-2xs"
                        title="Klik untuk langsung masuk sebagai Kasir Toko"
                      >
                        <div className="font-bold text-emerald-900 flex items-center justify-between w-full">
                          <span className="flex items-center gap-1">
                            <span>💳 Kasir</span>
                            <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1 rounded font-mono">kasir</span>
                          </span>
                          <span className="text-[8px] bg-emerald-200/80 text-emerald-900 font-extrabold px-1 rounded">
                            Masuk ➔
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-700 mt-0.5">Penjualan & Pesanan POS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickLogin('gudang', getPin('gudang', 'gudang2026'))}
                        className="p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-300 text-[11px] transition-all flex flex-col text-left group active:scale-98 cursor-pointer shadow-2xs"
                        title="Klik untuk langsung masuk sebagai Staff Gudang"
                      >
                        <div className="font-bold text-orange-900 flex items-center justify-between w-full">
                          <span className="flex items-center gap-1">
                            <span>📦 Gudang</span>
                            <span className="text-[9px] bg-orange-200 text-orange-800 px-1 rounded font-mono">gudang</span>
                          </span>
                          <span className="text-[8px] bg-orange-200/80 text-orange-900 font-extrabold px-1 rounded">
                            Masuk ➔
                          </span>
                        </div>
                        <span className="text-[10px] text-orange-700 mt-0.5">Stok & Katalog Produk</span>
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          </form>

        </div>
      </div>
    );
  }

  // ==========================================
  // Helpers for RBAC enforcement
  const renderAccessDenied = (moduleTitle: string) => {
    const allowedModules = SYSTEM_MODULES.filter(m => currentUserPermissions[m.key]?.canView);

    return (
      <div className="p-8 sm:p-12 text-center bg-stone-50 border border-stone-200 rounded-3xl space-y-4 max-w-2xl mx-auto my-6 animate-in fade-in">
        <div className="w-16 h-16 bg-red-100 text-red-700 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-extrabold text-base sm:text-lg text-stone-900">Akses Dibatasi: Modul {moduleTitle}</h3>
          <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
            Akun Anda dengan peran <strong>{getRoleDisplayName(currentUser?.role || 'kasir')}</strong> (@{currentUser?.username}) tidak memiliki izin untuk melihat modul ini.
          </p>
        </div>

        <div className="p-3.5 bg-white border border-stone-200 rounded-2xl text-xs space-y-2 max-w-md mx-auto shadow-2xs">
          <div className="font-bold text-stone-800 text-[11px] flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Modul yang Dapat Anda Akses Saat Ini:</span>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {allowedModules.length > 0 ? (
              allowedModules.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setActiveTab(m.key as any)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3 text-emerald-600" />
                  <span>Buka {m.name.split('&')[0].trim()}</span>
                </button>
              ))
            ) : (
              <span className="text-stone-400 italic text-[11px]">Tidak ada modul yang diizinkan untuk akun ini.</span>
            )}
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin('admin', 'admin123')}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>👑 Beralih ke Akun Store Manager (Admin)</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Ganti Akun Lain
          </button>
        </div>
      </div>
    );
  };

  const renderReadOnlyBanner = (moduleTitle: string) => (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-950 mb-4">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-amber-700 shrink-0" />
        <span>
          <strong>Mode Akses Terbatas (Hanya Lihat):</strong> Anda memiliki izin melihat data <strong>{moduleTitle}</strong>, namun izin untuk menambah, mengubah, atau menghapus data dibatasi.
        </span>
      </div>
      <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-amber-200 text-amber-900 shrink-0 uppercase tracking-wide">
        Hanya Lihat
      </span>
    </div>
  );

  // AUTHENTICATED ADMIN PANEL DASHBOARD
  // ==========================================
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="p-4 sm:px-6 border-b border-stone-100 bg-gradient-to-r from-stone-900 via-stone-800 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-md">
              KM
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                  Panel Admin & Kasir KuickMart
                </h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    <span>{currentUser.name}</span>
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    currentUser.role === 'admin' ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' :
                    currentUser.role === 'supervisor' ? 'bg-blue-400/20 text-blue-300 border-blue-400/30' :
                    currentUser.role === 'kasir' ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30' :
                    'bg-orange-400/20 text-orange-300 border-orange-400/30'
                  }`}>
                    {getRoleDisplayName(currentUser.role)}
                  </span>
                  <span className="text-[10px] text-stone-300 bg-white/10 px-2 py-0.5 rounded-full">
                    Akses: {Object.values(currentUserPermissions).filter(p => p?.canView).length}/10 Modul
                  </span>
                </div>
              </div>
              <p className="text-xs text-stone-300">
                Kelola master produk, stok barang, transaksi masuk, cabang toko, & database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSupabaseModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/10"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isSupabaseConnected ? 'DB Terhubung' : 'DB Supabase'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 text-xs font-bold"
              title="Keluar / Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 p-4 bg-stone-50 border-b border-stone-200 text-xs">
          <div className="bg-white p-3 rounded-2xl border border-stone-200 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-stone-400 uppercase">Total Produk</div>
              <div className="text-sm font-black text-stone-900">{totalProducts} Item</div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-stone-200 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-stone-400 uppercase">Omzet Toko</div>
              <div className="text-sm font-black text-emerald-700">{formatRupiah(totalRevenue)}</div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-stone-200 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-stone-400 uppercase">Total Pesanan</div>
              <div className="text-sm font-black text-stone-900">{orders.length} Transaksi</div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-stone-200 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-stone-400 uppercase">Cabang Toko</div>
              <div className="text-sm font-black text-purple-700">{stores.length} Outlet</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Permission-Aware) */}
        <div className="flex border-b border-stone-200 px-4 sm:px-6 bg-white overflow-x-auto scrollbar-none">
          {[
            { id: 'products', moduleKey: 'products' as SystemModuleKey, label: 'Katalog & Stok', icon: <Package className="w-4 h-4" />, count: products.length },
            { id: 'orders', moduleKey: 'orders' as SystemModuleKey, label: 'Pesanan Masuk', icon: <Receipt className="w-4 h-4" />, count: orders.length },
            { id: 'stores', moduleKey: 'stores' as SystemModuleKey, label: 'Cabang Toko', icon: <StoreIcon className="w-4 h-4 text-purple-600" />, count: stores.length },
            { id: 'receipts', moduleKey: 'receipts' as SystemModuleKey, label: 'Struk Info Toko', icon: <Receipt className="w-4 h-4 text-blue-600" />, count: activeReceiptConfigs.length },
            { id: 'promos', moduleKey: 'promos' as SystemModuleKey, label: 'Promo & Info Toko', icon: <Megaphone className="w-4 h-4 text-orange-600" />, count: activeStorePromos.length },
            { id: 'push_notifications', moduleKey: 'push_notifications' as SystemModuleKey, label: 'Push Notifikasi Promo', icon: <BellRing className="w-4 h-4 text-rose-500" /> },
            { id: 'brand_info', moduleKey: 'brand_info' as SystemModuleKey, label: 'Info Brand & Footer', icon: <Palette className="w-4 h-4 text-amber-500" /> },
            { id: 'couriers', moduleKey: 'couriers' as SystemModuleKey, label: 'Kurir & Armada', icon: <Bike className="w-4 h-4 text-blue-600" />, count: activeCouriers.length },
            { id: 'vouchers', moduleKey: 'vouchers' as SystemModuleKey, label: 'Voucher & Diskon', icon: <Ticket className="w-4 h-4 text-amber-600" />, count: vouchers.length },
            { id: 'users', moduleKey: 'users' as SystemModuleKey, label: 'Manajemen User', icon: <Users className="w-4 h-4 text-emerald-600" />, count: staffUsers.length },
            { id: 'permissions', moduleKey: 'users' as SystemModuleKey, label: 'Hak Akses Modul', icon: <Shield className="w-4 h-4 text-emerald-600" /> },
            { id: 'bulk_import', moduleKey: 'bulk_import' as SystemModuleKey, label: 'Import Cepat Excel', icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> },
          ].map(item => {
            const perm = currentUserPermissions[item.moduleKey] || { canView: false, canEdit: false };
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setIsAddingProduct(false);
                  setIsAddingStore(false);
                  setIsAddingUser(false);
                  setIsAddingVoucher(false);
                }}
                className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : !perm.canView
                    ? 'border-transparent text-stone-400 hover:text-stone-600 bg-stone-50/40'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
                }`}
                title={
                  !perm.canView
                    ? `Modul ${item.label} dibatasi untuk peran ${getRoleDisplayName(currentUser.role)}`
                    : !perm.canEdit
                    ? `Modul ${item.label} (Hanya Lihat)`
                    : `Modul ${item.label} (Akses Penuh)`
                }
              >
                {item.icon}
                <span>
                  {item.label} {item.count !== undefined ? `(${item.count})` : ''}
                </span>
                {!perm.canView ? (
                  <span className="p-0.5 rounded bg-stone-200 text-stone-600" title="Terkunci">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                ) : !perm.canEdit ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200" title="Hanya Lihat">
                    Lihat
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          
          {/* TAB 1: PRODUCTS MANAGEMENT */}
          {activeTab === 'products' && (!currentUserPermissions.products?.canView ? (
            renderAccessDenied('Katalog & Stok Produk')
          ) : (
            <div className="space-y-4">
              {!currentUserPermissions.products?.canEdit && renderReadOnlyBanner('Katalog & Stok Produk')}

              {productFeedback && (
                <div className={`p-4 rounded-2xl text-xs font-semibold flex items-start justify-between gap-3 shadow-2xs transition-all ${
                  productFeedback.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-950 border border-amber-300'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {productFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      )}
                      <span className="font-bold">{productFeedback.message}</span>
                    </div>
                    {productFeedback.isRlsError && (
                      <p className="text-[11px] text-amber-800 font-normal pl-6">
                        Penyebab: Supabase Row Level Security (RLS) masih mengunci izin INSERT/UPDATE pada tabel <code>products</code>. Buka modal Supabase lalu jalankan script SQL perbaikan izin RLS.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {productFeedback.isRlsError && (
                      <button
                        type="button"
                        onClick={onOpenSupabaseModal}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-[11px] shadow-sm flex items-center gap-1"
                      >
                        <Database className="w-3 h-3" />
                        <span>Perbaiki Izin RLS</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setProductFeedback(null)}
                      className="text-stone-400 hover:text-stone-700 text-xs px-1.5 py-0.5"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {isAddingProduct ? (
                /* Add / Edit Product Form */
                <form onSubmit={handleSaveProduct} className="bg-stone-50 border border-stone-200 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                    <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>{editingProduct ? 'Edit Informasi Produk' : 'Tambah Produk Baru ke Minimarket'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingProduct(false)}
                      className="text-xs text-stone-500 hover:text-stone-800 font-semibold"
                    >
                      Batal
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Nama Produk:</label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        placeholder="Contoh: Djarum Super 12 / Bimoli 2L"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Brand / Merek:</label>
                      <input
                        type="text"
                        required
                        value={formBrand}
                        onChange={e => setFormBrand(e.target.value)}
                        placeholder="Contoh: Djarum, Indofood, Unilever"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Kategori:</label>
                      <select
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                      >
                        <option value="sembako-dapur">Sembako & Kebutuhan Dapur</option>
                        <option value="minuman-segar">Minuman Segar & Kopi</option>
                        <option value="snack-biscuit">Snack, Biskuit & Cokelat</option>
                        <option value="perawatan-diri">Perawatan Diri & Sabun</option>
                        <option value="kebutuhan-rumah">Kebutuhan Rumah Tangga</option>
                        <option value="ibu-bayi">Kebutuhan Ibu & Bayi</option>
                        <option value="rokok-tembakau">Rokok & Tembakau</option>
                        <option value="obat-p3k">Obat & Kesehatan P3K</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-stone-700 text-xs">Satuan Kemasan (Unit Bebas):</label>
                        <span className="text-[10px] text-stone-400">Ketik bebas atau pilih preset</span>
                      </div>
                      <input
                        type="text"
                        list="standard-units-list"
                        value={formUnit}
                        onChange={e => setFormUnit(e.target.value)}
                        placeholder="Contoh: Dus, Box, Lusin, Bal, Karung, Pcs, dll"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium text-xs text-stone-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <datalist id="standard-units-list">
                        <option value="Dus" />
                        <option value="Box" />
                        <option value="Lusin (12 pcs)" />
                        <option value="Bal" />
                        <option value="Karung" />
                        <option value="Pcs" />
                        <option value="Pack" />
                        <option value="Bks (Bungkus)" />
                        <option value="Botol" />
                        <option value="Can / Kaleng" />
                        <option value="Kg (Kilogram)" />
                        <option value="Gram" />
                        <option value="Liter" />
                        <option value="Pouch" />
                        <option value="Renceng" />
                        <option value="Roll" />
                        <option value="Kodi (20 pcs)" />
                        <option value="Gross (144 pcs)" />
                        <option value="Sachet" />
                        <option value="Toples" />
                        <option value="Galon" />
                        <option value="Cup" />
                        <option value="Tray" />
                        <option value="Papan" />
                        <option value="Batang" />
                        <option value="Ikat" />
                        <option value="Slop" />
                      </datalist>

                      {/* Quick Unit Presets */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {['Dus', 'Box', 'Lusin', 'Bal', 'Karung', 'Pcs', 'Pack', 'Bks', 'Botol', 'Kg', 'Pouch', 'Renceng', 'Kaleng', 'Galon'].map(u => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setFormUnit(u)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                              formUnit.toLowerCase() === u.toLowerCase()
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                            }`}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Harga Jual (Rp):</label>
                      <input
                        type="number"
                        required
                        value={formPrice}
                        onChange={e => setFormPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Harga Normal / Sebelum Diskon (Rp):</label>
                      <input
                        type="number"
                        value={formOriginalPrice}
                        onChange={e => setFormOriginalPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Stok Tersedia:</label>
                      <input
                        type="number"
                        required
                        value={formStock}
                        onChange={e => setFormStock(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Barcode (EAN-13):</label>
                      <input
                        type="text"
                        value={formBarcode}
                        onChange={e => setFormBarcode(e.target.value)}
                        placeholder="899..."
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-stone-700 mb-1">URL Foto Produk:</label>
                      <input
                        type="text"
                        value={formImage}
                        onChange={e => setFormImage(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-stone-700 mb-1">Deskripsi & Catatan Produk:</label>
                      <textarea
                        rows={2}
                        value={formDescription}
                        onChange={e => setFormDescription(e.target.value)}
                        placeholder="Keterangan lengkap produk minimarket..."
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-stone-700 mb-1">Label / Tags Promo (Pisahkan dengan koma):</label>
                      <input
                        type="text"
                        value={formTags}
                        onChange={e => setFormTags(e.target.value)}
                        placeholder="JSM, Flash Sale, Beli 1 Gratis 1, Best Seller"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                      />
                    </div>

                    {/* HIERARCHICAL UNIT CONVERSIONS SECTION */}
                    <div className="sm:col-span-2 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-stone-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs mt-0.5">
                            <Boxes className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                              <span>Konversi Satuan Bertingkat & Grosir</span>
                              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                                Bebas Atur Sesuai Toko
                              </span>
                            </h4>
                            <p className="text-[11px] text-stone-600 leading-snug mt-0.5">
                              Tentukan satuan kemasan berjenjang (contoh: <strong>1 Dus = 2 Box</strong>, <strong>1 Box = 12 Pcs</strong> → <strong>1 Dus = 24 Pcs</strong>). Berlaku otomatis saat penjualan kasir & pemotongan stok.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddConversionRow}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs self-start sm:self-auto shrink-0 transition-transform active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Tambah Tingkat Satuan</span>
                        </button>
                      </div>

                      {/* Quick Preset Templates */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            Template Konversi Siap Pakai:
                          </span>
                          <span className="text-[10px] text-stone-400">Klik untuk langsung terapkan rumus</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleApplyPreset('dus-box-pcs')}
                            className="text-[11px] bg-white hover:bg-blue-100 text-blue-900 border border-blue-200 hover:border-blue-400 px-2.5 py-1 rounded-xl font-semibold transition-all shadow-2xs flex items-center gap-1"
                          >
                            <span className="bg-blue-600 text-white text-[9px] px-1 rounded font-black">Utama</span>
                            <span>1 Dus = 2 Box @ 12 Pcs = 24 Pcs</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset('dus-lusin-pcs')}
                            className="text-[11px] bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 hover:border-indigo-400 px-2.5 py-1 rounded-xl font-semibold transition-all shadow-2xs"
                          >
                            1 Dus = 2 Lusin @ 12 Pcs = 24 Pcs
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset('dus-pcs')}
                            className="text-[11px] bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 hover:border-stone-400 px-2.5 py-1 rounded-xl font-semibold transition-all shadow-2xs"
                          >
                            1 Dus = 12 Pcs Langsung
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset('karung-bal-pak-pcs')}
                            className="text-[11px] bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 hover:border-emerald-400 px-2.5 py-1 rounded-xl font-semibold transition-all shadow-2xs"
                          >
                            1 Karung = 10 Bal × 5 Pak × 20 Pcs = 1.000 Pcs
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset('karton-pak-bks')}
                            className="text-[11px] bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 hover:border-amber-400 px-2.5 py-1 rounded-xl font-semibold transition-all shadow-2xs"
                          >
                            1 Karton = 4 Pak @ 10 Bks = 40 Bks
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset('slop-bks-btg')}
                            className="text-[11px] bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 hover:border-stone-400 px-2.5 py-1 rounded-xl font-semibold transition-all shadow-2xs"
                          >
                            1 Slop = 10 Bks @ 16 Btg = 160 Batang
                          </button>
                        </div>
                      </div>

                      {/* Conversion Rows List */}
                      {formConversions.length === 0 ? (
                        <div className="bg-white/80 border border-dashed border-stone-300 rounded-xl p-4 text-center">
                          <p className="text-xs text-stone-600 font-medium mb-1">
                            Produk ini saat ini hanya dijual dalam <strong>Satuan Dasar: {formUnit || 'Pcs'}</strong>.
                          </p>
                          <p className="text-[11px] text-stone-400 mb-2.5">
                            Tambahkan satuan kemasan grosir seperti Dus, Box, Bal, Pak, atau Lusin agar pembeli dapat memilih satuan saat belanja.
                          </p>
                          <button
                            type="button"
                            onClick={handleAddConversionRow}
                            className="text-xs text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Buat Konversi Satuan Baru
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-[11px] font-bold text-stone-700 flex items-center justify-between">
                            <span>Daftar Satuan Kemasan & Rasio Konversi:</span>
                            <span className="text-[10px] text-blue-700 font-medium">Satuan Dasar Produk: <strong>{formUnit || 'Pcs'}</strong></span>
                          </div>

                          <div className="space-y-2.5">
                            {formConversions.map((conv, idx) => {
                              const parentOptions = [
                                formUnit.trim() || 'Pcs',
                                ...formConversions
                                  .slice(0, idx)
                                  .map(c => c.unitName)
                                  .filter(u => u && u.trim().length > 0)
                              ].filter((v, i, a) => a.indexOf(v) === i);

                              return (
                                <div
                                  key={conv.id || idx}
                                  className="bg-white border border-blue-200/90 rounded-xl p-3 shadow-2xs space-y-2"
                                >
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                    {/* Level badge */}
                                    <div className="sm:col-span-1 flex items-center justify-center">
                                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold flex items-center justify-center">
                                        T{idx + 1}
                                      </span>
                                    </div>

                                    {/* Unit Name */}
                                    <div className="sm:col-span-3">
                                      <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                                        1 Satuan Kemasan:
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="Contoh: Dus, Box, Bal"
                                        value={conv.unitName}
                                        onChange={e => handleUpdateConversionField(idx, 'unitName', e.target.value)}
                                        className="w-full text-xs font-bold px-2.5 py-1.5 border border-stone-300 rounded-lg bg-stone-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
                                      />
                                    </div>

                                    {/* Contains Qty */}
                                    <div className="sm:col-span-2">
                                      <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                                        Berisi Jumlah:
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        step="any"
                                        placeholder="1"
                                        value={conv.containsQty === '' || conv.containsQty === undefined ? '' : conv.containsQty}
                                        onChange={e => {
                                          const val = e.target.value;
                                          if (val === '') {
                                            handleUpdateConversionField(idx, 'containsQty', '');
                                          } else {
                                            const num = Number(val);
                                            handleUpdateConversionField(idx, 'containsQty', isNaN(num) ? '' : num);
                                          }
                                        }}
                                        onBlur={() => {
                                          if (conv.containsQty === '' || Number(conv.containsQty) <= 0) {
                                            handleUpdateConversionField(idx, 'containsQty', 1);
                                          }
                                        }}
                                        className="w-full text-xs font-bold px-2.5 py-1.5 border border-stone-300 rounded-lg bg-stone-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
                                      />
                                    </div>

                                    {/* Contains Unit */}
                                    <div className="sm:col-span-3">
                                      <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                                        Satuan Isi:
                                      </label>
                                      <select
                                        value={conv.containsUnit}
                                        onChange={e => handleUpdateConversionField(idx, 'containsUnit', e.target.value)}
                                        className="w-full text-xs font-semibold px-2.5 py-1.5 border border-stone-300 rounded-lg bg-stone-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
                                      >
                                        {parentOptions.map((opt, oIdx) => (
                                          <option key={oIdx} value={opt}>
                                            {opt} {opt === (formUnit.trim() || 'Pcs') ? '(Satuan Dasar)' : ''}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Price Per Unit (Optional) */}
                                    <div className="sm:col-span-2">
                                      <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                                        Harga Jual (Rp):
                                      </label>
                                      <input
                                        type="number"
                                        placeholder={String(formPrice * (conv.totalMultiplier || 1))}
                                        value={conv.price !== undefined ? conv.price : ''}
                                        onChange={e => handleUpdateConversionField(idx, 'price', e.target.value ? Number(e.target.value) : undefined)}
                                        className="w-full text-xs font-semibold px-2 py-1.5 border border-stone-300 rounded-lg bg-stone-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
                                      />
                                    </div>

                                    {/* Delete Row Button */}
                                    <div className="sm:col-span-1 flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveConversionRow(idx)}
                                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Hapus Satuan Ini"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Live Chain Formula Display */}
                                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] bg-blue-50/70 border border-blue-100 rounded-lg px-2.5 py-1 text-blue-900">
                                    <div className="flex items-center gap-1.5">
                                      <ArrowRight className="w-3 h-3 text-blue-600 shrink-0" />
                                      <span>
                                        <strong>1 {conv.unitName || 'Satuan'}</strong> = {conv.containsQty} {conv.containsUnit}
                                        {conv.containsUnit !== (formUnit.trim() || 'Pcs') && (
                                          <span className="text-blue-700 font-semibold">
                                            {' '}➔ Total <strong>{conv.totalMultiplier} {formUnit || 'Pcs'}</strong> (Satuan Dasar)
                                          </span>
                                        )}
                                      </span>
                                    </div>

                                    <div className="text-[10px] text-stone-500 font-medium">
                                      Harga: <strong className="text-stone-800">{formatRupiah(conv.price || (formPrice * conv.totalMultiplier))}</strong>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Live Simulation Box */}
                          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-2 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900">
                              <Calculator className="w-4 h-4 text-amber-600" />
                              <span>Simulasi Perhitungan Stok & Penjualan Kasir:</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-amber-950">
                              <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                                <strong>Stok Fisik di Gudang:</strong> {formStock} {formUnit || 'Pcs'}
                                <div className="text-stone-600 text-[10px] mt-0.5">
                                  {formatStockBreakdown(formStock, formUnit || 'Pcs', formConversions).compact}
                                </div>
                              </div>

                              <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                                <strong>Contoh Transaksi Penjualan:</strong>
                                {formConversions.length > 0 && (
                                  <div className="text-stone-700 text-[10px] mt-0.5 leading-snug">
                                    Jika pembeli membeli <strong>2 {formConversions[formConversions.length - 1].unitName}</strong>,
                                    sistem kasir otomatis mengurangi <strong>2 × {formConversions[formConversions.length - 1].totalMultiplier} = {2 * formConversions[formConversions.length - 1].totalMultiplier} {formUnit || 'Pcs'}</strong> dari stok gudang.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => setIsAddingProduct(false)}
                      className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProduct}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      {isSavingProduct ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isSavingProduct
                          ? 'Menyimpan...'
                          : editingProduct
                          ? 'Simpan Perubahan'
                          : 'Tambahkan Produk'}
                      </span>
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Top Bar Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                      <input
                        type="text"
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        placeholder="Cari nama, brand, atau barcode..."
                        className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-100"
                      />
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setCalcProductId(products[0]?.id || '');
                          setShowConversionCalculator(true);
                        }}
                        className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-transform active:scale-95"
                      >
                        <Calculator className="w-3.5 h-3.5 text-amber-600" />
                        <span>Kalkulator & Simulasi Konversi</span>
                      </button>

                      {currentUserPermissions.bulk_import?.canView && (
                        <button
                          onClick={() => setActiveTab('bulk_import')}
                          className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Import Excel</span>
                        </button>
                      )}

                      {currentUserPermissions.products?.canEdit && (
                        <button
                          onClick={handleOpenAdd}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah Produk</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Products Table */}
                  <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto max-h-[50vh]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-stone-100 text-stone-600 font-bold border-b border-stone-200 sticky top-0 z-10">
                            <th className="p-3">Produk & Satuan</th>
                            <th className="p-3">Kategori</th>
                            <th className="p-3">Harga</th>
                            <th className="p-3">Stok Gudang & Kemasan</th>
                            <th className="p-3">Barcode</th>
                            <th className="p-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {filteredCatalog.map(p => (
                            <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                              <td className="p-3">
                                <div className="flex items-start gap-2.5">
                                  <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded-lg bg-stone-100 shrink-0 border border-stone-200 mt-0.5" />
                                  <div className="min-w-0">
                                    <div className="font-bold text-stone-900">{p.name}</div>
                                    <div className="text-[10px] text-stone-500 font-medium">
                                      {p.brand} • Dasar: <span className="font-bold text-stone-700">{p.unit}</span>
                                    </div>
                                    {p.unitConversions && p.unitConversions.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {p.unitConversions.map((conv, cIdx) => (
                                          <span
                                            key={cIdx}
                                            className="bg-blue-50 text-blue-900 border border-blue-200 px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1"
                                            title={conv.description || `1 ${conv.unitName} = ${conv.totalMultiplier} ${p.unit}`}
                                          >
                                            <Boxes className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                            <span>1 {conv.unitName} = {conv.totalMultiplier} {p.unit}</span>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-[10px] font-medium">
                                  {p.category}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-blue-900">
                                {formatRupiah(p.price)}
                                {p.discountPercent ? (
                                  <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded font-extrabold">
                                    -{p.discountPercent}%
                                  </span>
                                ) : null}
                              </td>
                              <td className="p-3">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] w-fit ${
                                      p.stock <= 5 ? 'bg-red-100 text-red-700' : p.stock <= 15 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      Sisa: {p.stock} {p.unit || 'Item'}
                                    </span>
                                    <span className="bg-blue-50 text-blue-800 border border-blue-200 font-semibold px-1.5 py-0.5 rounded-full text-[9px] w-fit" title="Jumlah barang yang sudah terjual">
                                      Terjual: {p.soldCount || 0} {p.unit}
                                    </span>
                                  </div>
                                  {p.unitConversions && p.unitConversions.length > 0 && (
                                    <span className="text-[10px] text-stone-500 font-medium leading-tight">
                                      {formatStockBreakdown(p.stock, p.unit, p.unitConversions).compact}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 font-mono text-[10px] text-stone-500">
                                {p.barcode}
                              </td>
                              <td className="p-3 text-right space-x-1">
                                {currentUserPermissions.products?.canEdit ? (
                                  <>
                                    <button
                                      onClick={() => handleOpenEdit(p)}
                                      className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700"
                                      title="Edit Produk"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProduct(p.id)}
                                      className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600"
                                      title="Hapus Produk"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-stone-400 font-medium italic px-2 py-0.5 bg-stone-100 rounded">
                                    Hanya Lihat
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* TAB 2: ORDERS MANAGEMENT */}
          {activeTab === 'orders' && (!currentUserPermissions.orders?.canView ? (
            renderAccessDenied('Pesanan Masuk & Kasir')
          ) : (
            <div className="space-y-4">
              {!currentUserPermissions.orders?.canEdit && renderReadOnlyBanner('Pesanan Masuk & Kasir')}

              {/* Cloud Database Sync Status Card */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isSupabaseConnected 
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSupabaseConnected ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs">
                        {isSupabaseConnected ? 'Penyimpanan Database Cloud (Supabase) Aktif' : 'Penyimpanan Cloud Belum Terhubung'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSupabaseConnected ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                      }`}>
                        {isSupabaseConnected ? 'Real-Time Sync' : 'Penyimpanan Lokal'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 mt-0.5">
                      {isSupabaseConnected 
                        ? 'Setiap barang yang terjual dan transaksi pesanan otomatis disimpan ke database cloud (tabel orders & order_items) serta memperbarui stok.' 
                        : 'Hubungkan Supabase agar data penjualan dan stok tersimpan permanen di database cloud.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isSupabaseConnected ? (
                    <button
                      onClick={handleSyncAllOrdersToSupabase}
                      disabled={isSyncingOrders || orders.length === 0}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      {isSyncingOrders ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan ke Cloud...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Sinkronkan ke Cloud ({orders.length})</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={onOpenSupabaseModal}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Hubungkan Supabase</span>
                    </button>
                  )}
                </div>
              </div>

              {orderSyncFeedback && (
                <div className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 animate-in fade-in duration-200 ${
                  orderSyncFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-red-100 text-red-900 border border-red-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {orderSyncFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />}
                    <span>{orderSyncFeedback.message}</span>
                  </div>
                  <button onClick={() => setOrderSyncFeedback(null)} className="text-stone-500 hover:text-stone-800 text-xs font-bold cursor-pointer">×</button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-stone-900">Daftar Transaksi Kasir & Pesanan Masuk</h4>
                <span className="text-xs text-stone-500">{orders.length} total pesanan</span>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 border border-stone-200 rounded-3xl">
                  <Receipt className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                  <p className="font-bold text-stone-700 text-xs">Belum ada pesanan masuk</p>
                  <p className="text-[11px] text-stone-500">Pesanan dari aplikasi pelanggan akan langsung muncul di sini secara real-time.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map(order => (
                    <div key={order.id} className="bg-white border border-stone-200 p-4 rounded-2xl shadow-2xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-stone-900">{order.orderNumber}</span>
                          <span className="text-[10px] text-stone-400">{order.createdAt}</span>
                          {isSupabaseConnected && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                              <Database className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Tersimpan di Cloud Database</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-blue-900">{formatRupiah(order.total)}</span>
                          <select
                            value={order.status}
                            onChange={e => onUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                            className="text-xs font-bold bg-stone-100 border border-stone-300 rounded-xl px-2.5 py-1 text-stone-800"
                          >
                            <option value="pending_payment">Menunggu Pembayaran</option>
                            <option value="processing">Diproses Kasir</option>
                            <option value="picking">Sedang Dikemas (Picking)</option>
                            <option value="delivering">Sedang Diantar Kurir</option>
                            <option value="ready_for_pickup">Siap Diambil di Toko</option>
                            <option value="completed">Pesanan Selesai</option>
                            <option value="cancelled">Dibatalkan</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-[10px] font-semibold text-stone-400 uppercase">Item yang Dibeli & Pengurangan Stok:</div>
                          <ul className="mt-1 space-y-1.5 text-stone-700">
                            {order.items.map((item, idx) => {
                              const itemUnit = item.selectedUnit || item.product.unit;
                              const itemPrice = item.unitPrice || item.product.price;
                              const isConverted = item.conversionMultiplier && item.conversionMultiplier > 1;
                              const totalBaseQty = item.quantity * (item.conversionMultiplier || 1);
                              return (
                                <li key={idx} className="border-b border-stone-100 last:border-0 pb-1">
                                  <div className="flex justify-between font-medium">
                                    <span>
                                      {item.quantity} {itemUnit} × {item.product.name}
                                    </span>
                                    <span className="font-bold">{formatRupiah(itemPrice * item.quantity)}</span>
                                  </div>
                                  {isConverted && (
                                    <div className="text-[10px] text-blue-700 font-semibold flex items-center gap-1 mt-0.5">
                                      <Boxes className="w-3 h-3 text-blue-600 shrink-0" />
                                      <span>
                                        Konversi: {item.quantity} {itemUnit} = <strong>{totalBaseQty} {item.product.unit}</strong> Satuan Dasar (Terpotong -{totalBaseQty} {item.product.unit} stok)
                                      </span>
                                    </div>
                                  )}
                                  {item.conversionDescription && (
                                    <div className="text-[9px] text-stone-400 italic">
                                      {item.conversionDescription}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                        <div className="text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-xl space-y-1">
                          <div><strong>Metode:</strong> {order.paymentMethod.toUpperCase()} ({order.paymentStatus})</div>
                          <div><strong>Tipe:</strong> {order.deliveryType === 'delivery' ? 'Antar ke Rumah' : 'Ambil di Toko'}</div>
                          {order.address && (
                            <div><strong>Alamat:</strong> {order.address.fullAddress}</div>
                          )}
                          {(order.customerLocation || order.address?.latitude) && (
                            <div className="mt-2 pt-2 border-t border-stone-200">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-emerald-800 flex items-center gap-1">
                                  <Navigation className="w-3 h-3 text-emerald-600" />
                                  <span>Lokasi Google Maps Rumah:</span>
                                </span>
                                <a
                                  href={order.customerLocation?.mapsUrl || order.address?.mapsUrl || `https://www.google.com/maps?q=${order.address?.latitude},${order.address?.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-2xs hover:bg-blue-50"
                                >
                                  <span>Buka Peta</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                              <div className="font-mono text-[10px] text-stone-700 mt-0.5">
                                {(order.customerLocation?.latitude || order.address?.latitude)?.toFixed(6)}, {(order.customerLocation?.longitude || order.address?.longitude)?.toFixed(6)}
                                {order.customerLocation?.accuracy && ` (±${Math.round(order.customerLocation.accuracy)}m)`}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* TAB 3: STORES MANAGEMENT (Full Edit & Add Branch) */}
          {activeTab === 'stores' && (!currentUserPermissions.stores?.canView ? (
            renderAccessDenied('Cabang Toko / Outlet')
          ) : (
            <div className="space-y-4">
              {!currentUserPermissions.stores?.canEdit && renderReadOnlyBanner('Cabang Toko / Outlet')}

              {storeFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{storeFeedback}</span>
                </div>
              )}

              {isAddingStore ? (
                /* Form Edit / Tambah Cabang Toko */
                <form onSubmit={handleSaveStore} className="bg-stone-50 border border-stone-200 rounded-3xl p-5 space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-stone-900">
                          {editingStore ? `Edit Info Cabang: ${editingStore.name}` : 'Tambah Cabang Minimarket Baru'}
                        </h4>
                        <p className="text-[11px] text-stone-500">Ubah nama outlet, alamat, nomor telepon, jam operasional, dan tarif pengiriman.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingStore(false)}
                      className="text-xs text-stone-500 hover:text-stone-800 font-semibold"
                    >
                      Batal
                    </button>
                  </div>

                  {/* Section 1: Informasi Toko */}
                  <div className="space-y-3">
                    <div className="text-[11px] font-black uppercase text-purple-700 tracking-wider">
                      1. Identitas & Lokasi Cabang
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-stone-700 mb-1">
                          Nama Cabang Minimarket: <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={storeName}
                          onChange={e => setStoreName(e.target.value)}
                          placeholder="Contoh: KuickMart Express - Sudirman Thamrin"
                          className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-white font-semibold text-stone-900 focus:ring-2 focus:ring-purple-200"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Kode Cabang / Outlet:
                        </label>
                        <input
                          type="text"
                          value={storeCode}
                          onChange={e => setStoreCode(e.target.value)}
                          placeholder="Contoh: KM-SDM01"
                          className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-white font-mono uppercase text-stone-900 focus:ring-2 focus:ring-purple-200"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Kota / Wilayah:
                        </label>
                        <input
                          type="text"
                          required
                          value={storeCity}
                          onChange={e => setStoreCity(e.target.value)}
                          placeholder="Contoh: Pangandaran / Bandung"
                          className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-white font-medium text-stone-900 focus:ring-2 focus:ring-purple-200"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-bold text-stone-700 mb-1">
                          Alamat Lengkap Toko: <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={storeAddress}
                          onChange={e => setStoreAddress(e.target.value)}
                          placeholder="Contoh: Jl. Jendral Sudirman No. 18, Menteng"
                          className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-white font-medium text-stone-900 focus:ring-2 focus:ring-purple-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Kontak & Operasional */}
                  <div className="space-y-3 pt-3 border-t border-stone-200">
                    <div className="text-[11px] font-black uppercase text-purple-700 tracking-wider">
                      2. Kontak & Jam Operasional
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Nomor Telepon / WhatsApp Toko:
                        </label>
                        <input
                          type="text"
                          value={storePhone}
                          onChange={e => setStorePhone(e.target.value)}
                          placeholder="021-3901234 / 0812-3456-7890"
                          className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-white font-medium text-stone-900 focus:ring-2 focus:ring-purple-200"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Jam Buka - Tutup Toko:
                        </label>
                        <input
                          type="text"
                          disabled={storeIs24Hours}
                          value={storeIs24Hours ? 'Buka 24 Jam Non-Stop' : storeOpenHours}
                          onChange={e => setStoreOpenHours(e.target.value)}
                          placeholder="Contoh: 06.00 - 23.00 WIB"
                          className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-white font-medium text-stone-900 disabled:bg-stone-100 disabled:text-stone-500"
                        />
                      </div>

                      <div className="sm:col-span-2 flex flex-wrap gap-4 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800 select-none">
                          <input
                            type="checkbox"
                            checked={storeIsOpen}
                            onChange={e => setStoreIsOpen(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded-sm border-stone-300"
                          />
                          <span>Status Toko BUKA (Menerima Pesanan Sekarang)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800 select-none">
                          <input
                            type="checkbox"
                            checked={storeIs24Hours}
                            onChange={e => setStoreIs24Hours(e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded-sm border-stone-300"
                          />
                          <span>Buka 24 Jam Non-Stop</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Tarif & Layanan Pengiriman */}
                  <div className="space-y-3 pt-3 border-t border-stone-200">
                    <div className="text-[11px] font-black uppercase text-purple-700 tracking-wider">
                      3. Layanan & Tarif Pengiriman
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Tarif Ongkir Standar (Rp):
                        </label>
                        <input
                          type="number"
                          value={storeDeliveryFee}
                          onChange={e => setStoreDeliveryFee(Number(e.target.value))}
                          placeholder="8000"
                          className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-white font-semibold text-stone-900"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Minimal Belanja (Rp):
                        </label>
                        <input
                          type="number"
                          value={storeMinOrder}
                          onChange={e => setStoreMinOrder(Number(e.target.value))}
                          placeholder="25000"
                          className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-white font-semibold text-stone-900"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Estimasi Jarak (Km):
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={storeDistanceKm}
                          onChange={e => setStoreDistanceKm(Number(e.target.value))}
                          placeholder="1.2"
                          className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-white font-semibold text-stone-900"
                        />
                      </div>

                      <div className="sm:col-span-3 flex flex-wrap gap-4 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800 select-none">
                          <input
                            type="checkbox"
                            checked={storeReadyForDelivery}
                            onChange={e => setStoreReadyForDelivery(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded-sm border-stone-300"
                          />
                          <span>Aktifkan Pengiriman Kilat ke Rumah (Express Delivery)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800 select-none">
                          <input
                            type="checkbox"
                            checked={storeReadyForPickup}
                            onChange={e => setStoreReadyForPickup(e.target.checked)}
                            className="w-4 h-4 text-amber-600 rounded-sm border-stone-300"
                          />
                          <span>Aktifkan Ambil Sendiri di Toko (Click & Collect)</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Submit buttons */}
                  <div className="flex justify-end gap-2 pt-4 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => setIsAddingStore(false)}
                      className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{editingStore ? 'Simpan Perubahan Info Toko' : 'Simpan & Tambahkan Cabang'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Top Bar Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/70 border border-purple-200 p-4 rounded-2xl">
                    <div>
                      <h4 className="font-extrabold text-sm text-purple-950 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-purple-700" />
                        <span>Manajemen Cabang Minimarket KuickMart</span>
                      </h4>
                      <p className="text-xs text-purple-800 mt-0.5">
                        Kelola nama toko, alamat, kontak telepon, jam operasional, dan tarif kurir per cabang.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setActiveTab('receipts'); setIsAddingStore(false); }}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                      >
                        <Receipt className="w-4 h-4 text-blue-600" />
                        <span>Pengaturan Struk Toko</span>
                      </button>

                      {currentUserPermissions.stores?.canEdit && (
                        <button
                          type="button"
                          onClick={handleOpenAddStore}
                          className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah Cabang Baru</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List of Stores */}
                  <div className="space-y-3">
                    {stores.map(store => {
                      const isCurrent = store.id === currentStore.id;
                      return (
                        <div 
                          key={store.id} 
                          className={`p-4 bg-white border rounded-2xl transition-all shadow-2xs space-y-3 ${
                            isCurrent ? 'border-purple-400 ring-2 ring-purple-100 bg-purple-50/20' : 'border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-extrabold bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                                  {store.code}
                                </span>
                                <span className="font-extrabold text-stone-900 text-sm">{store.name}</span>
                                {isCurrent && (
                                  <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    <span>Toko Aktif Utama</span>
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  store.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {store.isOpen ? 'BUKA' : 'TUTUP SEMENTARA'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium mt-1">
                                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                <span>{store.address}, <strong>{store.city}</strong></span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5">
                              {currentUserPermissions.stores?.canEdit ? (
                                <>
                                  <button
                                    onClick={() => handleOpenEditStore(store)}
                                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Edit Info Toko</span>
                                  </button>

                                  {!isCurrent ? (
                                    <button
                                      onClick={() => {
                                        onSelectStore(store);
                                        setStoreFeedback(`Toko aktif berhasil diubah ke "${store.name}".`);
                                        setTimeout(() => setStoreFeedback(null), 3500);
                                      }}
                                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors"
                                    >
                                      Jadikan Toko Aktif
                                    </button>
                                  ) : null}

                                  <button
                                    onClick={() => handleDeleteStore(store.id, store.name)}
                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl"
                                    title="Hapus Cabang"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  {!isCurrent ? (
                                    <button
                                      onClick={() => {
                                        onSelectStore(store);
                                        setStoreFeedback(`Toko aktif berhasil diubah ke "${store.name}".`);
                                        setTimeout(() => setStoreFeedback(null), 3500);
                                      }}
                                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors"
                                    >
                                      Jadikan Toko Aktif
                                    </button>
                                  ) : null}
                                  <span className="text-[10px] text-stone-400 font-medium italic px-2 py-1 bg-stone-100 rounded-lg">
                                    Hanya Lihat
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Detail Pills */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-2 border-t border-stone-100">
                            <div className="bg-stone-50 p-2 rounded-xl text-stone-700 flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                              <span className="truncate">{store.phone || '-'}</span>
                            </div>

                            <div className="bg-stone-50 p-2 rounded-xl text-stone-700 flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                              <span className="truncate">{store.is24Hours ? '24 Jam' : store.openHours}</span>
                            </div>

                            <div className="bg-stone-50 p-2 rounded-xl text-stone-700 flex items-center gap-1.5">
                              <Navigation className="w-3 h-3 text-stone-400 shrink-0" />
                              <span>Ongkir: <strong>{formatRupiah(store.deliveryFee)}</strong></span>
                            </div>

                            <div className="bg-stone-50 p-2 rounded-xl text-stone-700 flex items-center gap-1.5">
                              <Boxes className="w-3 h-3 text-stone-400 shrink-0" />
                              <span>Min Order: <strong>{formatRupiah(store.minOrder)}</strong></span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ))}

          {/* TAB 4: BULK IMPORT EXCEL */}
          {activeTab === 'bulk_import' && (!currentUserPermissions.bulk_import?.canView ? (
            renderAccessDenied('Import Cepat Excel')
          ) : (
            <div className="space-y-4">
              {!currentUserPermissions.bulk_import?.canEdit && renderReadOnlyBanner('Import Cepat Excel')}

              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Import Massal Data Excel / Spreadsheet (Contoh: Daftar Rokok Djarum, Sembako, dll)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-800">
                  Format per baris: <code>Nama Barang | Harga | Stok | Kategori | Brand</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Tempelkan (Paste) Teks atau Baris Data Excel di sini:
                </label>
                <textarea
                  rows={8}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  disabled={!currentUserPermissions.bulk_import?.canEdit}
                  className="w-full p-3 font-mono text-xs border border-stone-300 rounded-2xl bg-white focus:ring-2 focus:ring-emerald-200 disabled:bg-stone-100 disabled:cursor-not-allowed"
                />
              </div>

              {importFeedback && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{importFeedback}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-stone-500">
                  Total baris yang akan diproses: {bulkText.split('\n').filter(l => l.trim().length > 0).length} produk
                </span>

                {currentUserPermissions.bulk_import?.canEdit && (
                  <button
                    onClick={handleBulkImport}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Eksekusi & Masukkan ke Katalog</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* TAB 4: VOUCHERS & DISCOUNTS */}
          {activeTab === 'vouchers' && (!currentUserPermissions.vouchers?.canView ? (
            renderAccessDenied('Voucher & Diskon')
          ) : (
            <div className="space-y-4">
              {!currentUserPermissions.vouchers?.canEdit && renderReadOnlyBanner('Voucher & Diskon')}

              {/* Feedback toast */}
              {voucherFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">{voucherFeedback}</span>
                  </div>
                  <button onClick={() => setVoucherFeedback(null)} className="text-stone-400 hover:text-stone-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <div>
                  <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-amber-600" />
                    <span>Manajemen Voucher Promo & Diskon</span>
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Buat kode promo, atur potongan harga persentase, nominal tetap, atau bebas ongkir toko.
                  </p>
                </div>

                {!isAddingVoucher && currentUserPermissions.vouchers?.canEdit && (
                  <button
                    onClick={handleOpenAddVoucher}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Voucher Baru</span>
                  </button>
                )}
              </div>

              {isAddingVoucher ? (
                /* ADD / EDIT VOUCHER FORM */
                <form onSubmit={handleSaveVoucher} className="bg-stone-50 border border-stone-200 rounded-3xl p-5 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                    <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>{editingVoucher ? `Edit Voucher: ${editingVoucher.code}` : 'Buat Kupon Promo & Diskon Baru'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => { setIsAddingVoucher(false); setEditingVoucher(null); }}
                      className="text-stone-400 hover:text-stone-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Presets */}
                  {!editingVoucher && (
                    <div className="bg-white p-3 rounded-2xl border border-stone-200">
                      <div className="text-[11px] font-bold text-stone-600 mb-2">Preset Cepat Promo:</div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setVoucherCode('DISKON10');
                            setVoucherTitle('Diskon Belanja 10%');
                            setVoucherType('percentage');
                            setVoucherDiscountAmount(10);
                            setVoucherMinSpend(30000);
                            setVoucherMaxDiscount(15000);
                            setVoucherDescription('Potongan 10% s.d Rp 15.000 untuk belanja min. Rp 30.000');
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold"
                        >
                          Diskon 10% (Min 30rb)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVoucherCode('DISKON20');
                            setVoucherTitle('Promo Gajian Diskon 20%');
                            setVoucherType('percentage');
                            setVoucherDiscountAmount(20);
                            setVoucherMinSpend(50000);
                            setVoucherMaxDiscount(25000);
                            setVoucherDescription('Diskon 20% spesial gajian hemat KuickMart');
                          }}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold"
                        >
                          Diskon 20% (Min 50rb)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVoucherCode('HEMAT15RB');
                            setVoucherTitle('Potongan Langsung Rp 15.000');
                            setVoucherType('fixed');
                            setVoucherDiscountAmount(15000);
                            setVoucherMinSpend(60000);
                            setVoucherMaxDiscount(15000);
                            setVoucherDescription('Potongan langsung Rp 15.000 belanja sembako & snack');
                          }}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold"
                        >
                          Potong Rp 15rb (Min 60rb)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVoucherCode('FREEONGKIR');
                            setVoucherTitle('Bebas Biaya Pengantaran');
                            setVoucherType('free_shipping');
                            setVoucherDiscountAmount(8000);
                            setVoucherMinSpend(30000);
                            setVoucherMaxDiscount(8000);
                            setVoucherDescription('Gratis ongkir kilat KuickMart Express hingga Rp 8.000');
                          }}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-semibold"
                        >
                          Gratis Ongkir (Min 30rb)
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Kode Voucher (Kapital):</label>
                      <input
                        type="text"
                        required
                        value={voucherCode}
                        onChange={e => setVoucherCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                        placeholder="Contoh: HEMAT2026 / PROMOJUMAT"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-mono font-bold tracking-wider text-blue-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Judul Kupon Promosi:</label>
                      <input
                        type="text"
                        required
                        value={voucherTitle}
                        onChange={e => setVoucherTitle(e.target.value)}
                        placeholder="Contoh: Diskon Kilat Weekend 20%"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Jenis Potongan / Tipe Kupon:</label>
                      <select
                        value={voucherType}
                        onChange={e => setVoucherType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                      >
                        <option value="percentage">Persentase (%) - Contoh: 10%, 20%, 50%</option>
                        <option value="fixed">Nominal Tetap (Rp) - Contoh: Rp 10.000, Rp 25.000</option>
                        <option value="free_shipping">Gratis Ongkos Kirim (Bebas Ongkir)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        {voucherType === 'percentage' ? 'Nilai Persentase Diskon (%):' : 'Besaran Potongan (Rp):'}
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={voucherDiscountAmount}
                        onChange={e => setVoucherDiscountAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-bold text-stone-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Minimal Belanja (Rp):</label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={voucherMinSpend}
                        onChange={e => setVoucherMinSpend(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                      />
                    </div>

                    {voucherType === 'percentage' && (
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">Maksimal Nilai Diskon (Rp, opsional):</label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={voucherMaxDiscount}
                          onChange={e => setVoucherMaxDiscount(Number(e.target.value))}
                          placeholder="Contoh: 25000 (0 jika tanpa batas)"
                          className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Berlaku Sampai Dengan:</label>
                      <input
                        type="text"
                        value={voucherValidUntil}
                        onChange={e => setVoucherValidUntil(e.target.value)}
                        placeholder="Contoh: 31 Des 2026"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-stone-700 mb-1">Deskripsi Syarat & Ketentuan:</label>
                      <textarea
                        rows={2}
                        value={voucherDescription}
                        onChange={e => setVoucherDescription(e.target.value)}
                        placeholder="Contoh: Berlaku untuk semua produk di seluruh gerai KuickMart Express"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => { setIsAddingVoucher(false); setEditingVoucher(null); }}
                      className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingVoucher ? 'Simpan Perubahan' : 'Buat & Terbitkan Voucher'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* VOUCHER LIST & FILTERS */
                <>
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Cari voucher berdasarkan kode atau judul promo..."
                        value={voucherSearch}
                        onChange={e => setVoucherSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-stone-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex gap-1 overflow-x-auto">
                      {[
                        { id: 'all', label: 'Semua Tipe' },
                        { id: 'percentage', label: 'Diskon %' },
                        { id: 'fixed', label: 'Nominal Rp' },
                        { id: 'free_shipping', label: 'Bebas Ongkir' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setVoucherFilterType(tab.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            voucherFilterType === tab.id
                              ? 'bg-stone-900 text-white shadow-2xs'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vouchers Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredVouchers.map(v => (
                      <div
                        key={v.id}
                        className="bg-white border border-stone-200 hover:border-blue-300 rounded-2xl p-4 shadow-2xs transition-all relative flex flex-col justify-between group"
                      >
                        <div>
                          {/* Top row: Code + Type badge */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 tracking-wider">
                                {v.code}
                              </span>
                              <button
                                onClick={() => handleCopyVoucherCode(v.code)}
                                className="p-1 text-stone-400 hover:text-blue-600 transition-colors"
                                title="Salin Kode"
                              >
                                {copiedVoucherCode === v.code ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              v.type === 'percentage' 
                                ? 'bg-amber-100 text-amber-800' 
                                : v.type === 'free_shipping'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {v.type === 'percentage' ? (
                                <>
                                  <Percent className="w-3 h-3" />
                                  <span>Diskon {v.discountAmount}%</span>
                                </>
                              ) : v.type === 'free_shipping' ? (
                                <>
                                  <Truck className="w-3 h-3" />
                                  <span>Bebas Ongkir</span>
                                </>
                              ) : (
                                <>
                                  <DollarSign className="w-3 h-3" />
                                  <span>Potongan {formatRupiah(v.discountAmount)}</span>
                                </>
                              )}
                            </span>
                          </div>

                          {/* Title & Description */}
                          <h5 className="font-bold text-xs text-stone-900 mb-1">{v.title}</h5>
                          <p className="text-[11px] text-stone-500 mb-2 leading-relaxed">{v.description}</p>

                          {/* Requirements & Validity */}
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-600 pt-2 border-t border-stone-100">
                            <span className="bg-stone-100 px-2 py-0.5 rounded font-medium">
                              Min. Belanja: {formatRupiah(v.minSpend)}
                            </span>
                            {v.maxDiscount && v.type === 'percentage' && (
                              <span className="bg-stone-100 px-2 py-0.5 rounded font-medium">
                                Maks. Diskon: {formatRupiah(v.maxDiscount)}
                              </span>
                            )}
                            <span className="text-stone-400 font-medium">
                              Berlaku s.d: {v.validUntil}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-stone-100">
                          {currentUserPermissions.vouchers?.canEdit ? (
                            <>
                              <button
                                onClick={() => handleOpenEditVoucher(v)}
                                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteVoucher(v.id, v.code)}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-stone-400 font-medium italic px-2 py-0.5 bg-stone-100 rounded">
                              Hanya Lihat
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {filteredVouchers.length === 0 && (
                      <div className="col-span-2 text-center py-12 bg-stone-50 rounded-2xl border border-stone-200">
                        <Ticket className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-stone-600">Tidak ada voucher yang ditemukan</p>
                        <p className="text-[11px] text-stone-400">Silakan buat voucher baru atau sesuaikan pencarian Anda.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          {/* TAB 5: USER MANAGEMENT */}
          {activeTab === 'users' && (!currentUserPermissions.users?.canView ? (
            renderAccessDenied('Manajemen Pengguna & Hak Akses')
          ) : (
            <div className="space-y-4">
              {!currentUserPermissions.users?.canEdit && renderReadOnlyBanner('Manajemen Pengguna & Hak Akses')}

              {/* Feedback toast */}
              {userFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">{userFeedback}</span>
                  </div>
                  <button onClick={() => setUserFeedback(null)} className="text-stone-400 hover:text-stone-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <div>
                  <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Manajemen Akun Pengguna & Hak Akses Staff</span>
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Kelola akun login Store Manager (Admin), Supervisor, Kasir Toko, dan Staff Gudang KuickMart Express.
                  </p>
                </div>

                {!isAddingUser && userSubTab === 'accounts' && currentUserPermissions.users?.canEdit && (
                  <button
                    onClick={handleOpenAddUser}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Tambah Akun Staff Baru</span>
                  </button>
                )}
              </div>

              {/* Subtabs: Akun Staff vs Matriks Akses */}
              <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
                <button
                  type="button"
                  onClick={() => setUserSubTab('accounts')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    userSubTab === 'accounts'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Daftar Akun Staff ({staffUsers.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUserSubTab('permissions')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    userSubTab === 'permissions'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Matriks & Preset Hak Akses Modul</span>
                </button>
              </div>

              {userSubTab === 'permissions' ? (
                <UserAccessManager
                  staffUsers={staffUsers}
                  currentUser={currentUser || staffUsers[0]}
                  onUpdateStaffUsers={handleUpdateStaffUsersFromAccessManager}
                  onSwitchUser={(user) => {
                    setCurrentUser(user);
                    try {
                      localStorage.setItem('pos_current_user', JSON.stringify(user));
                    } catch (e) {
                      console.error(e);
                    }
                    setUserFeedback(`Sesi simulasi beralih ke "${user.name}" (${user.role.toUpperCase()})`);
                    setTimeout(() => setUserFeedback(null), 3500);
                  }}
                  onOpenAddUser={() => {
                    setUserSubTab('accounts');
                    handleOpenAddUser();
                  }}
                />
              ) : isAddingUser ? (
                /* ADD / EDIT USER FORM */
                <form onSubmit={handleSaveUser} className="bg-stone-50 border border-stone-200 rounded-3xl p-5 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                    <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <span>{editingUser ? `Edit Akun: ${editingUser.name} (@${editingUser.username})` : 'Tambah Akun Pengguna Baru'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => { setIsAddingUser(false); setEditingUser(null); }}
                      className="text-stone-400 hover:text-stone-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Nama Lengkap Staff:</label>
                      <input
                        type="text"
                        required
                        value={userName}
                        onChange={e => setUserName(e.target.value)}
                        placeholder="Contoh: Rina Wahyuni / Bambang S."
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium text-stone-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">ID Pengguna (Username Login):</label>
                      <input
                        type="text"
                        required
                        value={userUsername}
                        onChange={e => setUserUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        placeholder="Contoh: kasir_rina / admin_pusat"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-mono text-stone-900"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-stone-700">Password / PIN Akses:</label>
                        {editingUser && (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            userPin !== editingUser.pin 
                              ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {userPin !== editingUser.pin ? 'Password diubah (siap simpan)' : 'Password saat ini tersimpan'}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showUserPin ? 'text' : 'password'}
                          required
                          value={userPin}
                          onChange={e => setUserPin(e.target.value)}
                          placeholder="Masukkan Password atau PIN 4-8 digit"
                          className="w-full px-3 py-2 pr-10 border border-stone-300 rounded-xl bg-white font-mono text-stone-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowUserPin(!showUserPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                          title={showUserPin ? "Sembunyikan password" : "Lihat password"}
                        >
                          {showUserPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">
                        Password ini digunakan untuk login ke Panel Admin dan Kasir POS.
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Peran / Jabatan (Hak Akses):</label>
                      <select
                        value={userRole}
                        onChange={e => setUserRole(e.target.value as any)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium text-stone-900"
                      >
                        <option value="admin">Store Manager (Admin Penuh)</option>
                        <option value="supervisor">Supervisor Toko (Katalog & Cabang)</option>
                        <option value="kasir">Kasir Toko (Penjualan POS & Pesanan)</option>
                        <option value="gudang">Staff Gudang (Manajemen Stok & Produk)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Penempatan Cabang Toko:</label>
                      <select
                        value={userStoreId}
                        onChange={e => setUserStoreId(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium text-stone-900"
                      >
                        <option value="all">Semua Cabang Toko</option>
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Nomor WhatsApp / HP (Opsional):</label>
                      <input
                        type="text"
                        value={userPhone}
                        onChange={e => setUserPhone(e.target.value)}
                        placeholder="0812-xxxx-xxxx"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium text-stone-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Email Staff (Opsional):</label>
                      <input
                        type="email"
                        value={userEmail}
                        onChange={e => setUserEmail(e.target.value)}
                        placeholder="staff@kuickmart.id"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium text-stone-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Status Keaktifan Akun:</label>
                      <div className="flex items-center gap-3 h-10">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userIsActive}
                            onChange={e => setUserIsActive(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300"
                          />
                          <span className="font-bold text-stone-800">
                            {userIsActive ? 'Akun Aktif (Dapat Login)' : 'Akun Nonaktif (Blokir Akses)'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => { setIsAddingUser(false); setEditingUser(null); }}
                      className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingUser ? 'Simpan Perubahan Akun' : 'Daftarkan Akun Baru'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* USER LIST & FILTERS */
                <>
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Cari staff berdasarkan nama, username, atau nomor telepon..."
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-stone-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex gap-1 overflow-x-auto">
                      {[
                        { id: 'all', label: 'Semua Peran' },
                        { id: 'admin', label: 'Admin' },
                        { id: 'supervisor', label: 'Supervisor' },
                        { id: 'kasir', label: 'Kasir' },
                        { id: 'gudang', label: 'Gudang' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setUserFilterRole(tab.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            userFilterRole === tab.id
                              ? 'bg-stone-900 text-white shadow-2xs'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                    <div className="overflow-x-auto max-h-[52vh]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-stone-100 text-stone-600 font-bold border-b border-stone-200 sticky top-0 z-10">
                            <th className="p-3">Staff / Pengguna</th>
                            <th className="p-3">Jabatan & Hak Akses</th>
                            <th className="p-3">Penempatan Cabang</th>
                            <th className="p-3">Kontak</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Login Terakhir</th>
                            <th className="p-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {filteredUsers.map(u => {
                            const isCurrentSession = Boolean(currentUser?.username && u?.username && currentUser.username.toLowerCase() === u.username.toLowerCase());
                            return (
                              <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                                <td className="p-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                      u.role === 'admin'
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : u.role === 'supervisor'
                                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                        : u.role === 'kasir'
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                        : 'bg-orange-100 text-orange-900 border border-orange-300'
                                    }`}>
                                      {(u.name || 'S').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-bold text-stone-900 flex items-center gap-1.5">
                                        <span>{u.name}</span>
                                        {isCurrentSession && (
                                          <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-extrabold">
                                            (Anda)
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] font-mono text-stone-500">@{u.username}</span>
                                        <span className="text-stone-300">•</span>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                                          <KeyRound className="w-2.5 h-2.5 text-stone-400" />
                                          <span>{showUserPinInTable[u.id] ? u.pin : '••••••'}</span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowUserPinInTable(prev => ({ ...prev, [u.id]: !prev[u.id] }));
                                            }}
                                            className="text-stone-400 hover:text-stone-700 ml-0.5 p-0.5"
                                            title={showUserPinInTable[u.id] ? "Sembunyikan password" : "Lihat password"}
                                          >
                                            {showUserPinInTable[u.id] ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                                          </button>
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    u.role === 'admin'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                      : u.role === 'supervisor'
                                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                      : u.role === 'kasir'
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                      : 'bg-orange-100 text-orange-900 border border-orange-200'
                                  }`}>
                                    {u.role === 'admin' ? 'Store Manager (Admin)' : u.role === 'supervisor' ? 'Supervisor Toko' : u.role === 'kasir' ? 'Kasir Toko' : 'Staff Gudang'}
                                  </span>
                                </td>

                                <td className="p-3">
                                  <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-[10px] font-medium">
                                    {u.storeName || 'Semua Cabang'}
                                  </span>
                                </td>

                                <td className="p-3 text-[11px] text-stone-600">
                                  <div>{u.phone || '-'}</div>
                                  {u.email && <div className="text-[10px] text-stone-400">{u.email}</div>}
                                </td>

                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                    u.isActive 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    {u.isActive ? 'Aktif' : 'Nonaktif'}
                                  </span>
                                </td>

                                <td className="p-3 text-[10px] text-stone-500">
                                  {u.lastLogin || '-'}
                                </td>

                                <td className="p-3 text-right space-x-1 whitespace-nowrap">
                                  {/* Toggle Status Button */}
                                  <button
                                    onClick={() => handleToggleUserStatus(u)}
                                    disabled={isCurrentSession}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      isCurrentSession
                                        ? 'opacity-30 cursor-not-allowed bg-stone-100 text-stone-400'
                                        : u.isActive
                                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                    }`}
                                    title={u.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                                  >
                                    <Power className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Edit Button */}
                                  <button
                                    onClick={() => handleOpenEditUser(u)}
                                    className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                                    title="Edit Akun"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Permissions Modal Button */}
                                  <button
                                    onClick={() => setSelectedUserForPermissions(u)}
                                    className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors"
                                    title="Konfigurasi Hak Akses Modul"
                                  >
                                    <Shield className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    disabled={isCurrentSession}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      isCurrentSession 
                                        ? 'opacity-30 cursor-not-allowed bg-stone-100 text-stone-400'
                                        : 'bg-red-50 hover:bg-red-100 text-red-600'
                                    }`}
                                    title="Hapus Akun Pengguna"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* TAB 7: STRUK INFO TOKO (RECEIPT SETTINGS & MANAGEMENT) */}
          {activeTab === 'receipts' && (!currentUserPermissions.receipts?.canView ? (
            renderAccessDenied('Pengaturan Struk Toko')
          ) : (
            <div className="space-y-4">
              {!currentUserPermissions.receipts?.canEdit && renderReadOnlyBanner('Pengaturan Struk Toko')}
              <ReceiptInfoManager
                receiptConfigs={activeReceiptConfigs}
                stores={stores}
                onUpdateReceiptConfigs={handleUpdateReceiptConfigs}
                onSelectActiveConfig={(cfg) => {
                  const matchedStore = stores.find(s => s.id === cfg.storeId);
                  if (matchedStore) {
                    onSelectStore(matchedStore);
                  }
                }}
              />
            </div>
          ))}

          {/* TAB 8: PROMO & INFO TOKO (DISCOUNT & STORE PROMOS MANAGEMENT) */}
          {activeTab === 'promos' && (!currentUserPermissions.promos?.canView ? (
            renderAccessDenied('Promo & Info Toko')
          ) : (
            <div className="space-y-4">
              {!currentUserPermissions.promos?.canEdit && renderReadOnlyBanner('Promo & Info Toko')}
              <PromoInfoManager
                promos={activeStorePromos}
                stores={stores}
                canEdit={currentUserPermissions.promos?.canEdit ?? true}
                onUpdatePromos={handleUpdateStorePromos}
                onSelectCategory={(cat) => {
                  onClose();
                }}
              />
            </div>
          ))}

          {/* TAB 9: KURIR & ARMADA PENGIRIMAN (COURIER & FLEET MANAGEMENT) */}
          {activeTab === 'couriers' && (!currentUserPermissions.couriers?.canView ? (
            renderAccessDenied('Kurir & Armada Pengiriman')
          ) : (
            <div className="space-y-4">
              {!currentUserPermissions.couriers?.canEdit && renderReadOnlyBanner('Kurir & Armada Pengiriman')}
              <CourierManager
                couriers={activeCouriers}
                stores={stores}
                onUpdateCouriers={handleUpdateCouriers}
              />
            </div>
          ))}

          {/* TAB 10: INFO BRAND, HEADER & FOOTER (KUSTOMISASI LOGO & FOOTER) */}
          {activeTab === 'brand_info' && (!currentUserPermissions.brand_info?.canView ? (
            renderAccessDenied('Informasi Brand & Footer')
          ) : (
            <div className="space-y-4">
              {!currentUserPermissions.brand_info?.canEdit && renderReadOnlyBanner('Informasi Brand & Footer')}
              <BrandInfoManager
                brandConfig={activeBrandConfig}
                onUpdateBrandConfig={handleUpdateBrandConfig}
              />
            </div>
          ))}

          {/* TAB 11: PUSH NOTIFIKASI PROMO PWA (VAPID) */}
          {activeTab === 'push_notifications' && (!currentUserPermissions.push_notifications?.canView ? (
            renderAccessDenied('Push Notifikasi Promo PWA')
          ) : (
            <div className="space-y-4">
              {!currentUserPermissions.push_notifications?.canEdit && renderReadOnlyBanner('Push Notifikasi Promo PWA')}
              <PushNotificationManager
                canEdit={currentUserPermissions.push_notifications?.canEdit ?? true}
              />
            </div>
          ))}

          {/* TAB 12: MANAJEMEN HAK AKSES MODUL (USER ACCESS CONTROL & RBAC) */}
          {activeTab === 'permissions' && (!currentUserPermissions.users?.canView ? (
            renderAccessDenied('Manajemen Hak Akses Pengguna')
          ) : (
            <div className="space-y-4">
              {!currentUserPermissions.users?.canEdit && renderReadOnlyBanner('Manajemen Hak Akses Pengguna')}
              <UserAccessManager
                staffUsers={staffUsers}
                currentUser={currentUser || staffUsers[0]}
                onUpdateStaffUsers={handleUpdateStaffUsersFromAccessManager}
                onSwitchUser={(user) => {
                  setCurrentUser(user);
                  try {
                    localStorage.setItem('pos_current_user', JSON.stringify(user));
                  } catch (e) {
                    console.error(e);
                  }
                  setUserFeedback(`Sesi simulasi beralih ke "${user.name}" (${user.role.toUpperCase()})`);
                  setTimeout(() => setUserFeedback(null), 3500);
                }}
                onOpenAddUser={() => {
                  setActiveTab('users');
                  setUserSubTab('accounts');
                  handleOpenAddUser();
                }}
              />
            </div>
          ))}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between text-xs">
          <div className="text-stone-500 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-stone-400" />
            <span>KuickMart POS & Inventory Management v2.5</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold"
            >
              Keluar Sesi
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-stone-900 text-white font-bold hover:bg-black"
            >
              Tutup Panel
            </button>
          </div>
        </div>

      </div>

      {/* INTERACTIVE CONVERSION CALCULATOR MODAL */}
      {showConversionCalculator && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">
                    Kalkulator & Simulasi Konversi Satuan
                  </h3>
                  <p className="text-xs text-stone-500">
                    Uji coba rumus konversi bertingkat & perhitungan potongan stok otomatis
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConversionCalculator(false)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">
                Pilih Produk yang Ingin Diuji:
              </label>
              <select
                value={calcProductId}
                onChange={e => {
                  setCalcProductId(e.target.value);
                  const prod = products.find(p => p.id === e.target.value);
                  if (prod) {
                    const firstConv = prod.unitConversions?.[prod.unitConversions.length - 1];
                    setCalcSelectedUnit(firstConv?.unitName || prod.unit);
                  }
                }}
                className="w-full text-xs font-bold px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.unitConversions && p.unitConversions.length > 0 ? `${p.unitConversions.length} Tingkat Konversi` : `Satuan Tunggal: ${p.unit}`}) - Stok: {p.stock} {p.unit}
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const selectedProduct = products.find(p => p.id === calcProductId) || products[0];
              if (!selectedProduct) return null;

              const unitOptions = getProductUnitOptions(selectedProduct);
              const activeUnitOption = unitOptions.find(u => u.unitName === calcSelectedUnit) || unitOptions[unitOptions.length - 1] || unitOptions[0];
              const multiplier = activeUnitOption?.multiplier || 1;
              const safeCalcQty = Number(calcQty) > 0 ? Number(calcQty) : 1;
              const totalBasePieces = safeCalcQty * multiplier;
              const unitPrice = activeUnitOption?.price || (selectedProduct.price * multiplier);
              const totalPrice = unitPrice * safeCalcQty;
              const remainingStock = selectedProduct.stock - totalBasePieces;
              const isStockSufficient = remainingStock >= 0;

              return (
                <div className="space-y-4">
                  {/* Product Info Card */}
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedProduct.image}
                        alt={selectedProduct.name}
                        className="w-12 h-12 rounded-xl object-cover border border-stone-200 bg-white"
                      />
                      <div>
                        <div className="font-bold text-stone-900">{selectedProduct.name}</div>
                        <div className="text-[11px] text-stone-500">
                          Satuan Dasar: <strong>{selectedProduct.unit}</strong> • Harga Eceran: {formatRupiah(selectedProduct.price)}/{selectedProduct.unit}
                        </div>
                        <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                          Stok Tersedia: {selectedProduct.stock} {selectedProduct.unit}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hierarchical Chains Visualization */}
                  {selectedProduct.unitConversions && selectedProduct.unitConversions.length > 0 ? (
                    <div className="bg-blue-50/60 border border-blue-200/70 rounded-2xl p-3.5 space-y-2">
                      <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">
                        Hierarki Konversi Terdaftar:
                      </span>
                      <div className="space-y-1.5">
                        {selectedProduct.unitConversions.map((conv, cIdx) => (
                          <div key={cIdx} className="text-xs bg-white border border-blue-200 rounded-xl px-3 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold flex items-center justify-center">
                                {cIdx + 1}
                              </span>
                              <span className="font-bold text-stone-800">
                                1 {conv.unitName}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                              <span className="text-stone-600">
                                {conv.containsQty} {conv.containsUnit}
                              </span>
                            </div>
                            <span className="text-blue-800 font-extrabold bg-blue-50 px-2 py-0.5 rounded-md text-[11px]">
                              = {conv.totalMultiplier} {selectedProduct.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900">
                      Produk ini belum memiliki konversi satuan bertingkat. Anda dapat mengaturnya melalui tombol <strong>Edit Produk</strong> di katalog.
                    </div>
                  )}

                  {/* Simulation Interactive Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 border border-stone-200 rounded-2xl p-3.5">
                    <div>
                      <label className="text-[11px] font-bold text-stone-600 uppercase mb-1 block">
                        Pilih Satuan Pembelian:
                      </label>
                      <select
                        value={calcSelectedUnit}
                        onChange={e => setCalcSelectedUnit(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2 border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                      >
                        {unitOptions.map((opt, oIdx) => (
                          <option key={oIdx} value={opt.unitName}>
                            {opt.unitName} {opt.isBase ? '(Satuan Dasar)' : `(= ${opt.multiplier} ${selectedProduct.unit})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-stone-600 uppercase mb-1 block">
                        Jumlah Pembelian:
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        placeholder="1"
                        value={calcQty === '' ? '' : calcQty}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') {
                            setCalcQty('');
                          } else {
                            const num = Number(val);
                            setCalcQty(isNaN(num) ? '' : num);
                          }
                        }}
                        onBlur={() => {
                          if (calcQty === '' || Number(calcQty) <= 0) {
                            setCalcQty(1);
                          }
                        }}
                        className="w-full text-xs font-bold px-3 py-2 border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Simulation Output Card */}
                  <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300/80 rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                      <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Hasil Simulasi Kasir & Pemotongan Stok
                      </span>
                      <span className="text-xs font-black text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        {safeCalcQty} {calcSelectedUnit}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-emerald-950">
                      <div className="flex justify-between items-center py-1 border-b border-emerald-200/40">
                        <span className="text-emerald-800">Rumus Konversi:</span>
                        <span className="font-mono font-bold">
                          {activeUnitOption?.isBase
                            ? `1 ${calcSelectedUnit} = 1 ${selectedProduct.unit}`
                            : (activeUnitOption?.breakdownText || `1 ${calcSelectedUnit} = ${multiplier} ${selectedProduct.unit}`)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-emerald-200/40">
                        <span className="text-emerald-800">Total Satuan Dasar Terpotong:</span>
                        <span className="font-extrabold text-blue-950 bg-blue-100 px-2 py-0.5 rounded">
                          {safeCalcQty} {calcSelectedUnit} × {multiplier} = {totalBasePieces} {selectedProduct.unit}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-emerald-200/40">
                        <span className="text-emerald-800">Total Nilai Transaksi:</span>
                        <span className="font-black text-emerald-900 text-sm">
                          {formatRupiah(totalPrice)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1">
                        <span className="text-emerald-800">Kondisi Stok Gudang:</span>
                        <span className={`font-bold ${isStockSufficient ? 'text-emerald-800' : 'text-red-700'}`}>
                          {selectedProduct.stock} - {totalBasePieces} = {remainingStock} {selectedProduct.unit}
                          {isStockSufficient ? ' (Cukup ✓)' : ' (Kurang ⚠️)'}
                        </span>
                      </div>
                    </div>

                    {/* Explanatory Box directly matching user prompt */}
                    <div className="bg-white/90 border border-emerald-300 rounded-xl p-3 text-[11px] text-stone-700 leading-relaxed">
                      <strong>💡 Catatan Logika:</strong> Jika pembeli membeli <strong>{safeCalcQty} {calcSelectedUnit}</strong>,
                      sistem POS otomatis memotong <strong>{totalBasePieces} {selectedProduct.unit}</strong> dari stok gudang dan mencatat transaksi senilai <strong>{formatRupiah(totalPrice)}</strong>.
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowConversionCalculator(false)}
                className="px-5 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-black"
              >
                Tutup Simulasi
              </button>
            </div>
          </div>
        </div>
      )}
      {/* USER MODULE PERMISSION MODAL */}
      <ModulePermissionModal
        isOpen={!!selectedUserForPermissions}
        onClose={() => setSelectedUserForPermissions(null)}
        user={selectedUserForPermissions}
        onSavePermissions={handleSaveUserPermissions}
        isCurrentUserAdmin={currentUser?.role === 'admin'}
      />
    </div>
  );
};
