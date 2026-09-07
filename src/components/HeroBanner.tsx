import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, Timer, Flame, Truck, Gift, ChevronRight, ArrowRight, Settings, Megaphone, Tag } from 'lucide-react';
import { StorePromoInfo } from '../types';

interface HeroBannerProps {
  onSelectCategory: (slug: string) => void;
  onOpenMemberModal: () => void;
  storePromos?: StorePromoInfo[];
  onOpenPromoManager?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ 
  onSelectCategory, 
  onOpenMemberModal,
  storePromos,
  onOpenPromoManager 
}) => {
  const [activeSlide, setActiveSlide] = useState(0);

  // Dynamic active banner list
  const dynamicBanners = storePromos?.filter(p => p.type === 'banner' && p.isActive) || [];

  // Dynamic active flash sale card
  const activeFlashSale = storePromos?.find(p => p.type === 'flash_sale' && p.isActive);

  // Dynamic active perk card
  const activePerkCard = storePromos?.find(p => p.type === 'perk_card' && p.isActive);

  // Default fallback banners if none configured
  const defaultBanners = [
    {
      badge: 'PROMO JSM AKHIR PEKAN',
      badgeColor: 'bg-red-500 text-white',
      title: 'Kebutuhan Dapur & Sembako Hemat s.d. 35%',
      subtitle: 'Minyak Bimoli 2L, Beras Ramos 5kg, & Gula Pasir harga spesial minimarket.',
      cta: 'Serbu Promo JSM',
      category: 'jsm-promo',
      bgGradient: 'from-blue-900 via-indigo-900 to-red-900',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=60',
      discountValue: '35%',
    },
    {
      badge: 'FLASH SALE KILAT',
      badgeColor: 'bg-amber-400 text-amber-950 font-bold',
      title: 'Snack & Minuman Segar Beli 2 Gratis 1',
      subtitle: 'Pocari Sweat, Ultra Milk, Chitato, & Sosro harga paling juara se-Indonesia!',
      cta: 'Cek Flash Deals',
      category: 'minuman',
      bgGradient: 'from-red-900 via-rose-900 to-amber-900',
      image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=60',
      discountValue: 'Beli 2 Gratis 1',
    },
    {
      badge: 'GRATIS ONGKIR SEPUASNYA',
      badgeColor: 'bg-emerald-500 text-white font-bold',
      title: 'Pesan Sekarang, Sampai Dalam 30 Menit!',
      subtitle: 'Bebas ongkos kirim minimum belanja Rp 30.000 dengan kode voucher ONGKIRNUSA.',
      cta: 'Belanja Sekarang',
      category: 'all',
      bgGradient: 'from-emerald-950 via-teal-900 to-blue-900',
      image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800&auto=format&fit=crop&q=60',
      discountValue: 'Gratis Ongkir',
    },
  ];

  const banners = dynamicBanners.length > 0 
    ? dynamicBanners.map(b => ({
        badge: b.badgeText || 'PROMO SPESIAL',
        badgeColor: b.badgeColor || 'bg-red-500 text-white',
        title: b.title,
        subtitle: b.subtitle || '',
        cta: b.ctaText || 'Lihat Promo',
        category: b.targetCategory || 'all',
        bgGradient: b.bgGradient || 'from-blue-900 via-indigo-900 to-red-900',
        image: b.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=60',
        discountValue: b.discountValue,
      }))
    : defaultBanners;

  // Prevent activeSlide out of bounds when banners are edited/deleted
  useEffect(() => {
    if (activeSlide >= banners.length) {
      setActiveSlide(0);
    }
  }, [banners.length, activeSlide]);

  const [timeLeft, setTimeLeft] = useState({ 
    hours: activeFlashSale?.flashHours ?? 4, 
    minutes: activeFlashSale?.flashMinutes ?? 59, 
    seconds: 45 
  });

  // Live Flash sale countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 4, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentBanner = banners[activeSlide] || banners[0];

  return (
    <div className="w-full min-w-full px-3 sm:px-6 lg:px-8 pt-3 pb-2">
      {/* Quick Admin Bar if requested */}
      {onOpenPromoManager && (
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2 text-xs text-stone-600 font-medium">
            <Megaphone className="w-3.5 h-3.5 text-orange-600" />
            <span className="hidden sm:inline">Info Promosi & Diskon Aktif Toko: <strong>{banners.length} Banner</strong> • <strong>{activeFlashSale ? '1 Flash Sale' : '0 Flash Sale'}</strong></span>
            <span className="sm:hidden">Promo & Diskon Toko Aktif</span>
          </div>

          <button
            type="button"
            onClick={onOpenPromoManager}
            className="px-2.5 py-1 bg-white hover:bg-orange-50 text-orange-700 hover:text-orange-800 border border-orange-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
            title="Tambah, ubah, dan hapus info promo dan diskon toko"
          >
            <Settings className="w-3.5 h-3.5 text-orange-600" />
            <span>Kelola Promo & Diskon Toko</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Hero Slider */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-stone-900 shadow-md min-h-[220px] sm:min-h-[260px] flex flex-col justify-between p-6 text-white">
          <div
            className={`absolute inset-0 bg-gradient-to-r ${currentBanner.bgGradient} opacity-90 transition-all duration-700 z-0`}
          />
          <img
            src={currentBanner.image}
            alt="Hero Promotion"
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30 z-0"
          />

          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${currentBanner.badgeColor}`}>
                {currentBanner.badge}
              </span>
              {currentBanner.discountValue && (
                <span className="text-xs bg-white/20 backdrop-blur-xs text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-white/30">
                  <Tag className="w-3 h-3 text-amber-300" />
                  <span>{currentBanner.discountValue}</span>
                </span>
              )}
              <span className="text-xs text-white/80 flex items-center gap-1 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Spesial Hari Ini
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight max-w-2xl leading-tight mb-2">
              {currentBanner.title}
            </h2>

            <p className="text-xs sm:text-sm text-stone-200 max-w-xl line-clamp-2 mb-4">
              {currentBanner.subtitle}
            </p>
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <button
              onClick={() => onSelectCategory(currentBanner.category)}
              className="inline-flex items-center gap-2 bg-white text-stone-950 hover:bg-stone-100 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-transform active:scale-95"
            >
              <span>{currentBanner.cta}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Pagination Dots */}
            {banners.length > 1 && (
              <div className="flex items-center gap-1.5">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className={`h-2 rounded-full transition-all ${
                      activeSlide === i ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Flash Deals & Loyalty Highlights Card */}
        <div className="flex flex-col gap-3">
          {/* Flash Sale Countdown Mini-Card */}
          <div className={`rounded-2xl p-4 text-white shadow-sm flex flex-col justify-between flex-1 bg-gradient-to-br ${activeFlashSale?.bgGradient || 'from-amber-500 via-orange-500 to-red-600'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 font-extrabold text-sm tracking-tight">
                <Flame className="w-4 h-4 text-yellow-200 fill-yellow-200 animate-bounce" />
                <span>{activeFlashSale?.title || 'FLASH SALE KILAT'}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono font-bold bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-md">
                <Timer className="w-3 h-3 text-amber-200" />
                <span>{String(timeLeft.hours).padStart(2, '0')} : {String(timeLeft.minutes).padStart(2, '0')} : {String(timeLeft.seconds).padStart(2, '0')}</span>
              </div>
            </div>

            <p className="text-xs text-white/90 mb-3">
              {activeFlashSale?.subtitle || 'Dapatkan diskon kilat s.d 40% untuk item pilihan. Stok sangat terbatas setiap sesinya!'}
            </p>

            <button
              onClick={() => onSelectCategory(activeFlashSale?.targetCategory || 'jsm-promo')}
              className="w-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs py-2 px-3 rounded-xl border border-white/30 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
              <span>{activeFlashSale?.ctaText || 'Lihat Produk Flash Deals'}</span>
            </button>
          </div>

          {/* Member Card Perk Highlight */}
          <div 
            onClick={onOpenMemberModal}
            className="bg-white border border-stone-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Gift className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xs font-bold text-stone-900 group-hover:text-blue-700 flex items-center gap-1">
                  <span>{activePerkCard?.title || 'Stamp & Poin Rewards'}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded ${activePerkCard?.badgeColor || 'bg-amber-100 text-amber-800 font-extrabold'}`}>
                    {activePerkCard?.badgeText || 'GOLD'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  {activePerkCard?.subtitle || 'Tukar 5.000 poin = Potongan Rp 5.000'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
};

