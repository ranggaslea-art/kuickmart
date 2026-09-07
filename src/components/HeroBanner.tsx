import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Zap, 
  Timer, 
  Flame, 
  Truck, 
  Gift, 
  ChevronRight, 
  ChevronLeft, 
  ArrowRight, 
  Settings, 
  Megaphone, 
  Tag,
  Hand,
  SlidersHorizontal
} from 'lucide-react';
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
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [mouseStartX, setMouseStartX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
      displayMode: 'standard',
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
      displayMode: 'standard',
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
      displayMode: 'standard',
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
        displayMode: b.displayMode || 'standard',
      }))
    : defaultBanners;

  // Slide navigation handlers
  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };

  // Prevent activeSlide out of bounds when banners are edited/deleted
  useEffect(() => {
    if (activeSlide >= banners.length) {
      setActiveSlide(0);
    }
  }, [banners.length, activeSlide]);

  // Autoplay slider with pause on hover / touch
  useEffect(() => {
    if (banners.length <= 1 || isPaused || isDragging) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length, isPaused, isDragging]);

  // Touch Swipe Handlers for mobile & tablet
  const minSwipeDistance = 40;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  // Mouse Drag Handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignore if clicked on interactive buttons
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setMouseStartX(e.clientX);
    setIsPaused(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    setIsPaused(false);
    if (mouseStartX !== null) {
      const diff = mouseStartX - e.clientX;
      if (diff > minSwipeDistance) {
        nextSlide();
      } else if (diff < -minSwipeDistance) {
        prevSlide();
      }
    }
    setMouseStartX(null);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
    }
    setIsPaused(false);
    setMouseStartX(null);
  };

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
            <span className="sm:hidden">Promo & Diskon Toko Aktif ({banners.length})</span>
          </div>

          <button
            type="button"
            onClick={onOpenPromoManager}
            className="px-2.5 py-1 bg-white hover:bg-orange-50 text-orange-700 hover:text-orange-800 border border-orange-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Tambah, ubah, dan hapus info promo dan diskon toko"
          >
            <Settings className="w-3.5 h-3.5 text-orange-600" />
            <span>Kelola Promo & Diskon Toko</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Hero Slider with full swipe and drag support */}
        <div 
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`lg:col-span-2 relative overflow-hidden rounded-2xl bg-stone-900 shadow-md min-h-[230px] sm:min-h-[270px] flex flex-col justify-between p-5 sm:p-6 text-white select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          title="Geser ke kiri atau kanan untuk melihat banner promo lainnya"
        >
          {/* Background Visual (Image & Gradient) */}
          {currentBanner.displayMode === 'full_image' ? (
            // Full Image Poster Banner
            <div className="absolute inset-0 z-0">
              <img
                src={currentBanner.image}
                alt={currentBanner.title}
                className="w-full h-full object-cover object-center transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-stone-950/75 via-stone-950/30 to-transparent" />
            </div>
          ) : (
            // Standard Aesthetic Gradient with High-Clarity Photo
            <div className="absolute inset-0 z-0 overflow-hidden">
              <div
                className={`absolute inset-0 bg-gradient-to-r ${currentBanner.bgGradient} opacity-95 transition-all duration-700`}
              />
              {currentBanner.image && (
                <img
                  src={currentBanner.image}
                  alt={currentBanner.title}
                  className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50 transition-all duration-700"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
            </div>
          )}

          {/* Navigation Arrows for Easy Sliding */}
          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevSlide();
                }}
                aria-label="Promo Sebelumnya"
                className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-stone-950/50 hover:bg-stone-950/85 text-white backdrop-blur-md flex items-center justify-center transition-all z-20 border border-white/20 shadow-md hover:scale-105 active:scale-95 cursor-pointer group"
                title="Geser ke promo sebelumnya"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextSlide();
                }}
                aria-label="Promo Berikutnya"
                className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-stone-950/50 hover:bg-stone-950/85 text-white backdrop-blur-md flex items-center justify-center transition-all z-20 border border-white/20 shadow-md hover:scale-105 active:scale-95 cursor-pointer group"
                title="Geser ke promo berikutnya"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:translate-x-0.5 transition-transform" />
              </button>
            </>
          )}

          {/* Content */}
          <div className="relative z-10 pr-6 sm:pr-8 pl-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-xs ${currentBanner.badgeColor}`}>
                {currentBanner.badge}
              </span>
              {currentBanner.discountValue && (
                <span className="text-xs bg-white/20 backdrop-blur-xs text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-white/30">
                  <Tag className="w-3 h-3 text-amber-300" />
                  <span>{currentBanner.discountValue}</span>
                </span>
              )}
              <span className="text-xs text-white/80 flex items-center gap-1 font-medium hidden sm:inline-flex">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Spesial Hari Ini
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight max-w-2xl leading-tight mb-2 drop-shadow-xs">
              {currentBanner.title}
            </h2>

            {currentBanner.subtitle && (
              <p className="text-xs sm:text-sm text-stone-200 max-w-xl line-clamp-2 mb-4 drop-shadow-xs">
                {currentBanner.subtitle}
              </p>
            )}
          </div>

          {/* Bottom Actions & Slider Indicators */}
          <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCategory(currentBanner.category);
                }}
                className="inline-flex items-center gap-2 bg-white text-stone-950 hover:bg-stone-100 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <span>{currentBanner.cta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Swipe Tip for User Guidance */}
              <span className="text-[11px] text-white/70 hidden md:inline-flex items-center gap-1">
                <span>👈 Geser untuk promo lainnya 👉</span>
              </span>
            </div>

            {/* Pagination Controls & Counter */}
            {banners.length > 1 && (
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/15">
                <span className="text-[10px] font-bold text-white/90 font-mono">
                  {activeSlide + 1}/{banners.length}
                </span>
                <div className="flex items-center gap-1">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSlide(i);
                      }}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        activeSlide === i ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                      }`}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>
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
              className="w-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs py-2 px-3 rounded-xl border border-white/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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

