export interface ProductUnitConversion {
  id: string;
  unitName: string; // User free input, e.g. "Dus", "Bal", "Pak", "Karung", "Lusin", "Slop", "Renceng", "Box", dll.
  containsQty: number | string; // Jumlah isi terhadap satuan acuan (contoh: 20 pcs, 5 pak, 10 bal, 24 pcs, 12 pcs)
  containsUnit: string; // Satuan acuan yang diisi (contoh: "Pcs", "Pak", "Bal", dll)
  totalMultiplier: number; // Total pengali kumulatif terhadap satuan dasar (contoh: 10 x 5 x 20 = 1000 pcs)
  price?: number; // Harga jual khusus satuan kemasan ini (opsional, jika kosong dihitung dari harga dasar x pengali)
  barcode?: string; // Barcode unik satuan kemasan ini (opsional)
  description?: string; // Formula teks konversi (contoh: "1 Karung = 10 Bal × 5 Pak × 20 Pcs = 1.000 Pcs")
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory?: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  unit: string; // Satuan dasar terkecil (contoh: "Pcs", "Bks", "Botol", "Kg", dll)
  unitConversions?: ProductUnitConversion[]; // Konversi bertingkat / multi-satuan
  image: string;
  stock: number;
  rating: number;
  soldCount: number;
  tags?: ('JSM' | 'Beli 1 Gratis 1' | 'Flash Sale' | 'Poin Ekstra' | 'Best Seller' | 'Fresh' | 'Hemat')[];
  description: string;
  barcode: string;
  isPopular?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  badge?: string;
  color?: string;
}

export interface Store {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  distanceKm: number;
  is24Hours: boolean;
  isOpen: boolean;
  openHours: string;
  phone: string;
  readyForPickup: boolean;
  readyForDelivery: boolean;
  deliveryFee: number;
  minOrder: number;
}

export interface CartItem {
  cartItemId?: string;
  product: Product;
  quantity: number;
  notes?: string;
  selectedUnit?: string;
  unitPrice?: number;
  conversionMultiplier?: number;
  conversionDescription?: string;
}

export interface Voucher {
  id: string;
  code: string;
  title: string;
  discountAmount: number;
  type: 'percentage' | 'fixed' | 'free_shipping';
  minSpend: number;
  maxDiscount?: number;
  validUntil: string;
  description: string;
  isClaimed?: boolean;
}

export interface Address {
  id: string;
  label: string; // e.g. Rumah, Kantor, Kos
  recipientName: string;
  phone: string;
  fullAddress: string;
  city: string;
  detailNote?: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
  mapsUrl?: string;
  accuracy?: number;
  recordedAt?: string;
}

export type OrderStatus =
  | 'pending_payment'
  | 'processing'
  | 'picking'
  | 'delivering'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled';

export type PaymentMethod =
  | 'qris'
  | 'gopay'
  | 'shopeepay'
  | 'ovo'
  | 'bca_va'
  | 'mandiri_va'
  | 'bri_va'
  | 'bni_va'
  | 'permata_va'
  | 'cod'
  | 'pay_at_store';

export interface CourierInfo {
  id: string;
  name: string;
  phone: string; // Telepon lokal e.g. "0813-8899-7721"
  whatsapp?: string; // Nomor WhatsApp (opsional, jika beda dari phone)
  vehicleType: 'motor' | 'mobil' | 'sepeda_listrik';
  vehiclePlate: string; // Plat Nomor e.g. "B 4120 SMT"
  photo: string;
  isVerified: boolean;
  status: 'available' | 'delivering' | 'off';
  rating: number; // e.g. 4.9
  totalDeliveries: number; // e.g. 450
  storeId?: string; // Cabang toko terkait atau 'all'
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  items: CartItem[];
  store: Store;
  deliveryType: 'delivery' | 'pickup';
  deliverySlot?: string;
  pickupTime?: string;
  address?: Address;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'unpaid';
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  pointsUsed: number;
  pointsEarned: number;
  total: number;
  appliedVoucher?: Voucher;
  customerNotes?: string;
  dokuPayment?: {
    clientId?: string;
    invoiceNumber?: string;
    vaNumber?: string;
    bankName?: string;
    qrContent?: string;
    qrImageUrl?: string;
    expiredDate?: string;
    isSimulated?: boolean;
  };
  customerLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    mapsUrl: string;
    recordedAt: string;
    addressText?: string;
  };
  driver?: {
    id?: string;
    name: string;
    phone: string;
    whatsapp?: string;
    vehiclePlate: string;
    photo: string;
    vehicleType?: string;
    isVerified?: boolean;
    rating?: number;
    totalDeliveries?: number;
  };
  trackingSteps: {
    status: OrderStatus;
    title: string;
    description: string;
    timestamp: string;
    isCompleted: boolean;
  }[];
}

export interface MemberProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  memberNumber: string;
  barcode: string;
  points: number;
  stamps: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  joinedDate: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt?: string;
  errorMessage?: string;
}

export interface StaffUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'supervisor' | 'kasir' | 'gudang';
  pin: string;
  phone?: string;
  email?: string;
  storeId?: string;
  storeName?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface ReceiptInfo {
  id: string;
  storeId?: string; // ID cabang terkait atau 'all' (semua cabang)
  profileName: string; // Nama profil struk
  headerBrand: string; // Judul Brand Utama Struk (misal: "NUSA MART EXPRESS")
  subHeader?: string; // Slogan / Subjudul
  storeName: string; // Nama Toko / Cabang
  address: string; // Alamat Lengkap Toko
  city?: string; // Kota Toko
  phone: string; // Nomor Telepon / WA Toko
  taxIdOrNpwp?: string; // NPWP atau No Izin Usaha
  websiteOrSocial?: string; // Website / Instagram Toko
  cashierName?: string; // Nama atau ID Kasir
  footerMessage1: string; // Pesan Kaki 1 (bukti pembayaran sah)
  footerMessage2?: string; // Pesan Kaki 2 (kebijakan retur / ucapan)
  csHotline?: string; // Nomor CS Hotline
  showBarcode?: boolean; // Tampilkan Barcode Transaksi
  showStoreLogo?: boolean; // Tampilkan Logo / Simbol Toko
  paperWidth?: '58mm' | '80mm'; // Format Lebar Kertas Struk
  isDefault?: boolean; // Menjadi Struk Aktif Utama
  updatedAt?: string;
}

export type PromoType = 'banner' | 'flash_sale' | 'announcement_bar' | 'perk_card';

export interface StorePromoInfo {
  id: string;
  type: PromoType;
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeColor?: string;
  ctaText?: string;
  targetCategory?: string;
  discountValue?: string; // e.g. "Hemat s.d 35%", "Diskon 40%", "Beli 2 Gratis 1"
  bgGradient?: string;
  imageUrl?: string;
  flashHours?: number;
  flashMinutes?: number;
  isActive: boolean;
  orderSeq: number;
  validUntil?: string;
  storeId?: string; // Cabang toko terkait atau 'all'
  createdAt?: string;
  updatedAt?: string;
}
