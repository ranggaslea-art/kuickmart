import React, { useState } from 'react';
import { 
  ShoppingBag, 
  MapPin, 
  Search, 
  Sparkles, 
  QrCode, 
  Clock, 
  ChevronDown, 
  Store as StoreIcon, 
  Bike, 
  User, 
  Receipt,
  X,
  Flame,
  Layers,
  RefreshCw,
  Database
} from 'lucide-react';
import { Store, MemberProfile, CartItem, Product, StorePromoInfo, BrandHeaderFooterConfig } from '../types';
import { formatRupiah } from '../utils/formatters';
import { formatImageUrl, getProductFallbackImage } from '../utils/imageHelper';

interface HeaderProps {
  currentStore: Store;
  deliveryType: 'delivery' | 'pickup';
  onToggleDeliveryType: (type: 'delivery' | 'pickup') => void;
  onOpenStoreSelector: () => void;
  member: MemberProfile;
  onOpenMemberModal: () => void;
  cartItems: CartItem[];
  onOpenCart: () => void;
  onOpenSupabaseModal: () => void;
  onOpenAdminPanel: () => void;
  isSupabaseConnected: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenOrderHistory: () => void;
  activeOrdersCount: number;
  allProducts: Product[];
  onSelectProduct: (p: Product) => void;
  storePromos?: StorePromoInfo[];
  brandConfig?: BrandHeaderFooterConfig;
  isSyncing?: boolean;
  onRefreshData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStore,
  deliveryType,
  onToggleDeliveryType,
  onOpenStoreSelector,
  member,
  onOpenMemberModal,
  cartItems,
  onOpenCart,
  onOpenSupabaseModal,
  onOpenAdminPanel,
  isSupabaseConnected,
  searchQuery,
  onSearchChange,
  onOpenOrderHistory,
  activeOrdersCount,
  allProducts,
  onSelectProduct,
  storePromos,
  brandConfig,
  isSyncing,
  onRefreshData,
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartPrice = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  // Dynamic active announcement
  const activeAnnouncement = storePromos?.find(p => p.type === 'announcement_bar' && p.isActive);

  // Resolved brand identity
  const logoText = brandConfig?.brandLogoText || 'KM';
  const logoImageUrl = brandConfig?.brandLogoImageUrl || '';
  const logoGradient = brandConfig?.brandLogoBgGradient || 'from-blue-700 via-blue-600 to-amber-500';
  const namePart1 = brandConfig?.brandNamePart1 || 'KUICK';
  const namePart2 = brandConfig?.brandNamePart2 || 'MART';
  const badgeText = brandConfig?.brandBadgeText || 'EXPRESS';
  const badgeColor = brandConfig?.brandBadgeColor || 'bg-red-600';
  const showBadge = brandConfig ? brandConfig.showBrandBadge : true;
  const tagline = brandConfig?.tagline || 'Minimarket Digital Super Cepat';
  const showTagline = brandConfig ? brandConfig.showTagline : true;
  const operatingHoursText = brandConfig?.showOperatingHoursBadge && brandConfig.operatingHoursBadgeText 
    ? brandConfig.operatingHoursBadgeText 
    : currentStore.openHours;

  // Filter products for quick search popup
  const searchResults = searchQuery.trim()
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.barcode.includes(searchQuery)
      ).slice(0, 5)
    : [];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      {/* Top Notification / Promo Bar */}
      <div className={`bg-gradient-to-r ${activeAnnouncement?.bgGradient || 'from-red-600 via-rose-600 to-amber-600'} text-white text-xs py-1.5 px-4 font-medium transition-all`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs ${activeAnnouncement?.badgeColor || 'bg-white text-red-600'}`}>
              {activeAnnouncement?.badgeText || 'JSM HEMAT'}
            </span>
            <span className="truncate">
              {activeAnnouncement?.title || 'Promo Jumat-Sabtu-Minggu: Diskon Minyak, Beras, & Susu s.d 35% + Gratis Ongkir Rp0!'}
              {activeAnnouncement?.discountValue ? ` • ${activeAnnouncement.discountValue}` : ''}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-[11px] shrink-0">
            <button onClick={onOpenMemberModal} className="hover:underline flex items-center gap-1 cursor-pointer">
              <QrCode className="w-3 h-3" />
              <span>Kartu Member: {member.points.toLocaleString('id-ID')} Poin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 cursor-pointer">
              {logoImageUrl ? (
                <img
                  src={logoImageUrl}
                  alt={namePart1 + ' ' + namePart2}
                  className="w-10 h-10 rounded-xl object-cover border border-stone-200 shadow-2xs"
                />
              ) : (
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${logoGradient} flex items-center justify-center text-white shadow-xs font-black text-xl tracking-wider`}>
                  {logoText}
                </div>
              )}
              <div className="leading-tight hidden sm:block">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-lg text-blue-900 tracking-tight">{namePart1}</span>
                  <span className="font-black text-lg text-amber-500 tracking-tight">{namePart2}</span>
                  {showBadge && badgeText && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${badgeColor} text-white px-1.5 py-0.5 rounded ml-1`}>
                      {badgeText}
                    </span>
                  )}
                </div>
                {showTagline && tagline && (
                  <p className="text-[10px] font-medium text-stone-500">{tagline}</p>
                )}
              </div>
            </div>
          </div>

          {/* Delivery & Store Selector */}
          <div className="hidden lg:flex items-center gap-2 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
            <button
              onClick={() => onToggleDeliveryType('delivery')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                deliveryType === 'delivery'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Diantar ke Rumah</span>
            </button>
            <button
              onClick={() => onToggleDeliveryType('pickup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                deliveryType === 'pickup'
                  ? 'bg-white text-red-600 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <StoreIcon className="w-3.5 h-3.5" />
              <span>Ambil di Toko</span>
            </button>

            <div className="h-4 w-px bg-stone-300 mx-1" />

            <button
              onClick={onOpenStoreSelector}
              className="flex items-center gap-1.5 px-2.5 py-1 text-stone-700 hover:text-blue-700 font-medium group text-left max-w-[200px]"
            >
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <div className="truncate">
                <span className="font-semibold block truncate">{currentStore.name}</span>
                <span className="text-[10px] text-stone-500 font-normal">{currentStore.distanceKm} km • {currentStore.openHours}</span>
              </div>
              <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-stone-700 shrink-0" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 relative max-w-xl">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Cari minyak goreng, beras, susu, indomie, snack..."
                className="w-full pl-10 pr-9 py-2 bg-stone-100 hover:bg-stone-50 focus:bg-white border border-stone-300 focus:border-blue-500 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Autocomplete dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSearchFocused(false)}
                />
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-stone-200 z-50 overflow-hidden py-1">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400 border-b border-stone-100 flex items-center justify-between">
                    <span>Hasil Pencarian Cepat</span>
                    <span className="text-[10px] text-blue-600 font-normal">{searchResults.length} barang</span>
                  </div>
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectProduct(p);
                        setIsSearchFocused(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between gap-3 border-b border-stone-50 last:border-0 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <img
                          src={formatImageUrl(p.image)}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = getProductFallbackImage(p.name, p.category);
                          }}
                          className="w-9 h-9 object-cover rounded-md bg-stone-100 shrink-0"
                        />
                        <div className="truncate">
                          <p className="text-xs font-semibold text-stone-800 truncate">{p.name}</p>
                          <p className="text-[11px] text-stone-500">{p.unit} • <span className="text-blue-700 font-bold">{formatRupiah(p.price)}</span></p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-medium shrink-0">
                        {p.brand}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Cloud Sync & Manual Refresh Button */}
            {onRefreshData && (
              <button
                onClick={onRefreshData}
                title="Sinkronisasi Data Real-Time dengan Cloud Supabase (Klik untuk refresh)"
                className={`px-2.5 py-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                  isSyncing
                    ? 'bg-sky-50 border-sky-300 text-sky-700'
                    : isSupabaseConnected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-600' : isSupabaseConnected ? 'text-emerald-600' : 'text-stone-500'}`} />
                <span className="hidden sm:inline font-semibold text-[11px]">
                  {isSyncing ? 'Sinkron...' : isSupabaseConnected ? 'Cloud Aktif' : 'Offline'}
                </span>
              </button>
            )}

            {/* Database Modal Trigger */}
            <button
              onClick={onOpenSupabaseModal}
              title="Koneksi & Database Supabase Multi-Device"
              className="p-2 sm:px-2.5 sm:py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center gap-1.5 transition-all"
            >
              <Database className={`w-4 h-4 ${isSupabaseConnected ? 'text-emerald-600' : 'text-stone-500'}`} />
              <span className="text-xs font-medium hidden md:inline">Database</span>
            </button>

            {/* Admin Panel Button (Satu-satunya Tombol Admin di Header) */}
            <button
              onClick={onOpenAdminPanel}
              title="Masuk Panel Admin & Kasir Toko"
              className="px-2.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span className="text-sm">👑</span>
              <span className="hidden sm:inline">Admin Toko</span>
            </button>

            {/* Member Card Button */}
            <button
              onClick={onOpenMemberModal}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 flex items-center gap-2 transition-all"
            >
              <QrCode className="w-4 h-4 text-amber-700 shrink-0" />
              <div className="text-left hidden md:block leading-tight">
                <div className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">Member {member.tier}</div>
                <div className="text-xs font-black text-amber-950">{member.points.toLocaleString('id-ID')} Poin</div>
              </div>
            </button>

            {/* Order History */}
            <button
              onClick={onOpenOrderHistory}
              title="Daftar Pesanan & Status Belanja"
              className="p-2 sm:px-2.5 sm:py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center gap-1.5 relative transition-all"
            >
              <Receipt className="w-4 h-4" />
              <span className="text-xs font-medium hidden md:inline">Pesanan</span>
              {activeOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {activeOrdersCount}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center gap-2 shadow-sm font-semibold text-xs transition-all relative"
            >
              <ShoppingBag className="w-4 h-4" />
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-[10px] font-normal opacity-90">Keranjang</div>
                <div className="font-bold">{formatRupiah(totalCartPrice)}</div>
              </div>
              {totalCartCount > 0 && (
                <span className="sm:hidden absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Outlet Selector */}
        <div className="flex lg:hidden items-center justify-between gap-2 mt-2 pt-2 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleDeliveryType(deliveryType === 'delivery' ? 'pickup' : 'delivery')}
              className="px-2 py-1 rounded bg-stone-100 font-semibold text-stone-700 flex items-center gap-1"
            >
              {deliveryType === 'delivery' ? <Bike className="w-3 h-3 text-blue-600" /> : <StoreIcon className="w-3 h-3 text-red-600" />}
              <span>{deliveryType === 'delivery' ? 'Antar' : 'Ambil Toko'}</span>
            </button>
            <button
              onClick={onOpenStoreSelector}
              className="flex items-center gap-1 text-stone-700 truncate max-w-[150px] font-medium"
            >
              <MapPin className="w-3 h-3 text-red-500 shrink-0" />
              <span className="truncate">{currentStore.name}</span>
              <ChevronDown className="w-3 h-3 text-stone-400 shrink-0" />
            </button>
          </div>

          {(!brandConfig || brandConfig.showOperatingHoursBadge) && (
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {operatingHoursText}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
