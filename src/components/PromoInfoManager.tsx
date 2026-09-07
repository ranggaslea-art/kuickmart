import React, { useState } from 'react';
import { 
  Megaphone, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  Eye, 
  ArrowRight, 
  Flame, 
  Timer, 
  Zap, 
  Gift, 
  Image as ImageIcon, 
  Upload, 
  Store as StoreIcon, 
  Calendar, 
  Tag, 
  Percent, 
  Layers, 
  CheckCircle2, 
  X,
  AlertCircle,
  Search,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { StorePromoInfo, PromoType, Store } from '../types';
import { compressImageFile, COMMON_IMAGE_PRESETS } from '../utils/imageHelper';

interface PromoInfoManagerProps {
  promos: StorePromoInfo[];
  stores: Store[];
  onUpdatePromos: (promos: StorePromoInfo[]) => void;
  onSelectCategory?: (categorySlug: string) => void;
}

export const PromoInfoManager: React.FC<PromoInfoManagerProps> = ({
  promos,
  stores,
  onUpdatePromos,
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | PromoType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentPromo, setCurrentPromo] = useState<StorePromoInfo | null>(null);
  const [isNewPromo, setIsNewPromo] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Gradient presets
  const GRADIENT_PRESETS = [
    { label: 'Blue Indigo Red', value: 'from-blue-900 via-indigo-900 to-red-900' },
    { label: 'Red Rose Amber', value: 'from-red-900 via-rose-900 to-amber-900' },
    { label: 'Fire Orange Amber (Flash Sale)', value: 'from-amber-500 via-orange-500 to-red-600' },
    { label: 'Emerald Teal Blue (Fresh/Gratis Ongkir)', value: 'from-emerald-950 via-teal-900 to-blue-900' },
    { label: 'Purple Indigo Rose', value: 'from-purple-900 via-indigo-900 to-rose-900' },
    { label: 'Dark Slate Modern', value: 'from-stone-900 via-stone-800 to-stone-950' },
    { label: 'Vibrant Sunset', value: 'from-rose-600 via-orange-600 to-amber-500' },
  ];

  // Badge color presets
  const BADGE_COLOR_PRESETS = [
    { label: 'Merah Promo JSM', value: 'bg-red-500 text-white' },
    { label: 'Kuning/Emas Kilat', value: 'bg-amber-400 text-amber-950 font-bold' },
    { label: 'Hijau Segar & Hemat', value: 'bg-emerald-500 text-white font-bold' },
    { label: 'Biru Modern NusaMart', value: 'bg-blue-600 text-white font-bold' },
    { label: 'Ungu Eksklusif', value: 'bg-purple-600 text-white font-bold' },
    { label: 'Putih Teks Merah (Ticker)', value: 'bg-white text-red-600 font-bold' },
    { label: 'Amber Gold Member', value: 'bg-amber-100 text-amber-800 font-extrabold' },
  ];

  // Filtered promos
  const filteredPromos = promos.filter(p => {
    const matchesType = selectedTypeFilter === 'all' || p.type === selectedTypeFilter;
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.badgeText && p.badgeText.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.discountValue && p.discountValue.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const showNotification = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  // Open Form to Add
  const handleOpenAdd = (defaultType: PromoType = 'banner') => {
    const newPromo: StorePromoInfo = {
      id: `prm_${Date.now()}`,
      type: defaultType,
      title: defaultType === 'flash_sale' ? 'FLASH SALE SPESIAL KILAT' : 'Promo Diskon Baru Toko',
      subtitle: 'Dapatkan diskon hemat dan harga spesial untuk produk pilihan.',
      badgeText: defaultType === 'flash_sale' ? 'FLASH SALE KILAT' : 'DISKON SPESIAL',
      badgeColor: defaultType === 'flash_sale' ? 'bg-amber-400 text-amber-950 font-bold' : 'bg-red-500 text-white',
      ctaText: defaultType === 'flash_sale' ? 'Lihat Produk Flash Deals' : 'Cek Promo Sekarang',
      targetCategory: 'jsm-promo',
      discountValue: defaultType === 'flash_sale' ? 'Diskon 40%' : 'Hemat 30%',
      bgGradient: defaultType === 'flash_sale' ? 'from-amber-500 via-orange-500 to-red-600' : 'from-blue-900 via-indigo-900 to-red-900',
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=60',
      displayMode: 'standard',
      flashHours: defaultType === 'flash_sale' ? 4 : undefined,
      flashMinutes: defaultType === 'flash_sale' ? 59 : undefined,
      isActive: true,
      orderSeq: promos.length + 1,
      validUntil: 'Promo Hari Ini',
      storeId: 'all',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setCurrentPromo(newPromo);
    setIsNewPromo(true);
    setIsEditing(true);
  };

  // Open Form to Edit
  const handleOpenEdit = (promo: StorePromoInfo) => {
    setCurrentPromo({ ...promo });
    setIsNewPromo(false);
    setIsEditing(true);
  };

  // Save Promo
  const handleSavePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPromo || !currentPromo.title.trim()) {
      alert('Mohon masukkan judul promo.');
      return;
    }

    const updated = {
      ...currentPromo,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    if (isNewPromo) {
      const newList = [updated, ...promos];
      onUpdatePromos(newList);
      showNotification(`Promo baru "${updated.title}" berhasil ditambahkan!`);
    } else {
      const newList = promos.map(p => p.id === updated.id ? updated : p);
      onUpdatePromos(newList);
      showNotification(`Promo "${updated.title}" berhasil diperbarui!`);
    }

    setIsEditing(false);
    setCurrentPromo(null);
  };

  // Duplicate Promo
  const handleDuplicate = (promo: StorePromoInfo) => {
    const duplicated: StorePromoInfo = {
      ...promo,
      id: `prm_${Date.now()}`,
      title: `${promo.title} (Salinan)`,
      orderSeq: promos.length + 1,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    onUpdatePromos([duplicated, ...promos]);
    showNotification(`Promo "${promo.title}" berhasil diduplikasi!`);
  };

  // Toggle Active Status
  const handleToggleActive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = promos.map(p => {
      if (p.id === id) {
        return { ...p, isActive: !p.isActive, updatedAt: new Date().toISOString().split('T')[0] };
      }
      return p;
    });
    onUpdatePromos(updated);
    const target = updated.find(p => p.id === id);
    showNotification(`Status promo diubah menjadi: ${target?.isActive ? 'Aktif' : 'Nonaktif'}`);
  };

  // Delete Promo
  const handleDeletePromo = (id: string) => {
    const target = promos.find(p => p.id === id);
    const filtered = promos.filter(p => p.id !== id);
    onUpdatePromos(filtered);
    setDeleteConfirmId(null);
    showNotification(`Promo "${target?.title || 'Promo'}" berhasil dihapus.`);
  };

  // Process promo photo file with high quality compression
  const processPromoPhotoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (JPG, PNG, WEBP, GIF).');
      return;
    }
    try {
      setIsUploadingImage(true);
      const base64 = await compressImageFile(file, 1200, 0.85);
      if (currentPromo) {
        setCurrentPromo({ 
          ...currentPromo, 
          imageUrl: base64,
          displayMode: currentPromo.displayMode || 'full_image'
        });
      }
      showNotification('Foto promosi berhasil diunggah & dipasang!');
    } catch (err) {
      console.error(err);
      alert('Gagal mengunggah foto promosi. Silakan coba lagi.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Image File Upload via Click
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentPromo) return;
    await processPromoPhotoFile(file);
    e.target.value = '';
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processPromoPhotoFile(file);
    }
  };

  // Quick Card Image Upload (directly from promo card in the list)
  const handleQuickCardImageUpload = async (promoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (JPG, PNG, WEBP).');
      return;
    }
    try {
      setIsUploadingImage(true);
      const base64 = await compressImageFile(file, 1200, 0.85);
      const updated = promos.map(p => {
        if (p.id === promoId) {
          return { 
            ...p, 
            imageUrl: base64, 
            displayMode: p.displayMode || 'full_image',
            updatedAt: new Date().toISOString().split('T')[0] 
          };
        }
        return p;
      });
      onUpdatePromos(updated);
      showNotification('Foto promosi berhasil diperbarui langsung!');
    } catch (err) {
      console.error(err);
      alert('Gagal mengunggah foto promo.');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Counters
  const countBanners = promos.filter(p => p.type === 'banner').length;
  const countFlash = promos.filter(p => p.type === 'flash_sale').length;
  const countAnnounce = promos.filter(p => p.type === 'announcement_bar').length;
  const countPerk = promos.filter(p => p.type === 'perk_card').length;

  return (
    <div className="space-y-5">
      {/* Toast Feedback */}
      {feedbackNotice && (
        <div className="bg-stone-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between animate-fade-in border border-stone-700">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedbackNotice}</span>
          </div>
          <button onClick={() => setFeedbackNotice(null)} className="text-stone-400 hover:text-white ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-orange-50 via-amber-50 to-red-50 p-4 rounded-2xl border border-amber-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold shadow-2xs">
              <Megaphone className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-stone-900 text-base">Manajemen Promo & Info Diskon Toko</h3>
          </div>
          <p className="text-xs text-stone-600 mt-1">
            Kelola banner diskon utama, widget flash sale kilat, pengumuman promo, dan penawaran toko secara instan.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleOpenAdd('banner')}
            className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Promo Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedTypeFilter === 'all'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Semua Info ({promos.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedTypeFilter('banner')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedTypeFilter === 'banner'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Banner Carousel ({countBanners})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTypeFilter('flash_sale')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedTypeFilter === 'flash_sale'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Flash Sale Kilat ({countFlash})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTypeFilter('announcement_bar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedTypeFilter === 'announcement_bar'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-red-50 text-red-800 hover:bg-red-100'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Pengumuman Bar ({countAnnounce})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTypeFilter('perk_card')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedTypeFilter === 'perk_card'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Kartu Penawaran ({countPerk})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari promo / diskon..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-orange-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Promos Grid / List */}
      {filteredPromos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300 p-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
            <Megaphone className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-stone-800 text-sm">Tidak ada info promo yang cocok</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {searchQuery ? `Tidak ada hasil untuk kata kunci "${searchQuery}".` : 'Belum ada info promo yang ditambahkan pada kategori ini.'}
          </p>
          <button
            type="button"
            onClick={() => handleOpenAdd('banner')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Promo Pertama Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPromos.map((promo) => {
            const isBanner = promo.type === 'banner';
            const isFlash = promo.type === 'flash_sale';
            const isAnnounce = promo.type === 'announcement_bar';
            const isPerk = promo.type === 'perk_card';

            return (
              <div
                key={promo.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-sm ${
                  promo.isActive ? 'border-stone-200' : 'border-stone-200 opacity-60 bg-stone-50/70'
                }`}
              >
                {/* Visual Preview Header of Promo */}
                <div className="relative p-4 text-white overflow-hidden min-h-[140px] flex flex-col justify-between bg-stone-900">
                  {/* Background display according to displayMode */}
                  {promo.displayMode === 'full_image' && promo.imageUrl ? (
                    <div className="absolute inset-0 pointer-events-none">
                      <img
                        src={promo.imageUrl}
                        alt={promo.title}
                        className="w-full h-full object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />
                    </div>
                  ) : (
                    <>
                      <div className={`absolute inset-0 bg-gradient-to-r ${promo.bgGradient || 'from-stone-900 to-stone-800'} opacity-95`} />
                      {promo.imageUrl && (
                        <img
                          src={promo.imageUrl}
                          alt={promo.title}
                          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-35 pointer-events-none"
                        />
                      )}
                    </>
                  )}

                  {/* Top Badges & Status */}
                  <div className="relative z-10 flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs ${promo.badgeColor || 'bg-red-500 text-white'}`}>
                        {promo.badgeText || (isBanner ? 'BANNER PROMO' : isFlash ? 'FLASH SALE' : 'PENGUMUMAN')}
                      </span>

                      {promo.imageUrl && (
                        <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs text-white px-2 py-0.5 rounded-full border border-white/30 flex items-center gap-1" title="Foto Promosi Terpasang">
                          <ImageIcon className="w-3 h-3 text-amber-300" />
                          <span>{promo.displayMode === 'full_image' ? 'Poster Foto' : 'Foto Aktif'}</span>
                        </span>
                      )}

                      {promo.discountValue && (
                        <span className="text-[10px] font-black bg-white/20 backdrop-blur-xs text-white px-2 py-0.5 rounded-full border border-white/30 flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />
                          <span>{promo.discountValue}</span>
                        </span>
                      )}

                      <span className="text-[9px] font-medium bg-black/40 text-stone-200 px-1.5 py-0.5 rounded">
                        {isBanner ? 'Carousel Banner' : isFlash ? 'Flash Sale Widget' : isAnnounce ? 'Announcement Bar' : 'Perk Card'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleToggleActive(promo.id, e)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-all ${
                        promo.isActive 
                          ? 'bg-emerald-500 text-white shadow-2xs' 
                          : 'bg-stone-700 text-stone-300'
                      }`}
                      title="Klik untuk aktifkan/nonaktifkan"
                    >
                      {promo.isActive ? '● Aktif di Toko' : '○ Nonaktif'}
                    </button>
                  </div>

                  {/* Content Preview */}
                  <div className="relative z-10 my-2 space-y-1">
                    <h4 className="font-extrabold text-sm sm:text-base leading-tight tracking-tight line-clamp-2">
                      {promo.title}
                    </h4>
                    {promo.subtitle && (
                      <p className="text-[11px] text-stone-200 line-clamp-2 leading-snug">
                        {promo.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Bottom Preview info */}
                  <div className="relative z-10 flex items-center justify-between pt-1 border-t border-white/20 text-[10px] text-stone-200">
                    <div className="flex items-center gap-2">
                      {isFlash && (
                        <span className="font-mono bg-black/40 px-1.5 py-0.5 rounded font-bold text-amber-300 flex items-center gap-1">
                          <Timer className="w-2.5 h-2.5" />
                          <span>0{promo.flashHours || 4} : {promo.flashMinutes || 59} : 00</span>
                        </span>
                      )}
                      <span>CTA: <strong>{promo.ctaText || 'Lihat Promo'}</strong></span>
                      <span>• Target: <code className="bg-black/30 px-1 rounded">{promo.targetCategory || 'all'}</code></span>
                    </div>

                    {promo.validUntil && (
                      <span className="italic text-stone-300">
                        {promo.validUntil}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Controls & Detail Information */}
                <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-stone-500 truncate flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">Diperbarui: {promo.updatedAt || promo.createdAt || '-'}</span>
                    {promo.storeId && promo.storeId !== 'all' && (
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                        Cabang Tertentu
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Quick photo upload button */}
                    <label 
                      className="p-1.5 text-stone-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer" 
                      title="Upload / Ganti Foto Promosi Langsung"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleQuickCardImageUpload(promo.id, e)}
                        disabled={isUploadingImage}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(promo)}
                      className="p-1.5 text-stone-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Duplikasi info promo ini"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(promo)}
                      className="px-2.5 py-1 bg-white hover:bg-orange-50 text-orange-700 hover:text-orange-800 border border-orange-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-2xs active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Ubah</span>
                    </button>

                    {deleteConfirmId === promo.id ? (
                      <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200 animate-fade-in">
                        <button
                          type="button"
                          onClick={() => handleDeletePromo(promo.id)}
                          className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700 transition-colors"
                        >
                          Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-1.5 py-0.5 bg-stone-200 text-stone-700 rounded text-[10px] hover:bg-stone-300"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(promo.id)}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus promo ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL FORM: TAMBAH / UBAH INFO PROMO */}
      {isEditing && currentPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-3xl w-full overflow-hidden my-auto animate-scale-in">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold">
                  {currentPromo.type === 'flash_sale' ? <Flame className="w-4 h-4 text-amber-200" /> : <Megaphone className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    {isNewPromo ? 'Tambah Info Promo & Diskon Baru' : 'Ubah Info Promo Toko'}
                  </h3>
                  <p className="text-[11px] text-orange-100">
                    Perubahan akan langsung diterapkan secara live di beranda toko.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setIsEditing(false); setCurrentPromo(null); }}
                className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Form & Live Preview */}
            <form onSubmit={handleSavePromo} className="p-5 max-h-[80vh] overflow-y-auto space-y-5">
              
              {/* LIVE PREVIEW COMPONENT */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-orange-600" />
                    <span>Live Preview Tampilan Pembeli:</span>
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    Tipe: {currentPromo.type.toUpperCase()}
                  </span>
                </div>

                {/* Simulated Live Widget */}
                <div className="relative rounded-2xl overflow-hidden p-5 text-white shadow-md min-h-[160px] flex flex-col justify-between bg-stone-950">
                  {currentPromo.displayMode === 'full_image' && currentPromo.imageUrl ? (
                    <div className="absolute inset-0 pointer-events-none">
                      <img
                        src={currentPromo.imageUrl}
                        alt="Preview Foto Poster"
                        className="w-full h-full object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />
                    </div>
                  ) : (
                    <>
                      <div className={`absolute inset-0 bg-gradient-to-r ${currentPromo.bgGradient || 'from-stone-900 to-stone-800'} opacity-95 transition-all`} />
                      {currentPromo.imageUrl && (
                        <img
                          src={currentPromo.imageUrl}
                          alt="Preview"
                          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-35 pointer-events-none"
                        />
                      )}
                    </>
                  )}

                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${currentPromo.badgeColor || 'bg-red-500 text-white'}`}>
                        {currentPromo.badgeText || 'PROMO'}
                      </span>
                      {currentPromo.discountValue && (
                        <span className="text-[11px] font-bold bg-white/20 backdrop-blur-xs text-white px-2 py-0.5 rounded-full border border-white/30 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>{currentPromo.discountValue}</span>
                        </span>
                      )}
                    </div>

                    {currentPromo.type === 'flash_sale' && (
                      <div className="flex items-center gap-1 text-[11px] font-mono font-bold bg-black/40 px-2 py-0.5 rounded-md text-amber-200">
                        <Timer className="w-3 h-3" />
                        <span>0{currentPromo.flashHours || 4} : {currentPromo.flashMinutes || 59} : 00</span>
                      </div>
                    )}
                  </div>

                  <div className="relative z-10 my-2 space-y-1">
                    <h3 className="text-lg sm:text-xl font-black leading-tight tracking-tight">
                      {currentPromo.title || 'Judul Promo Toko'}
                    </h3>
                    <p className="text-xs text-stone-200 line-clamp-2 max-w-lg">
                      {currentPromo.subtitle || 'Deskripsi rincian penawaran promo dan diskon minimarket.'}
                    </p>
                  </div>

                  <div className="relative z-10 flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 bg-white text-stone-950 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm">
                      <span>{currentPromo.ctaText || 'Lihat Promo'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>

                    <span className="text-[11px] text-stone-300 italic">
                      {currentPromo.validUntil || 'Promo Berlaku'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-stone-200">
                {/* 1. Tipe Promo */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Tipe / Format Tampilan Promo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={currentPromo.type}
                    onChange={(e) => {
                      const newType = e.target.value as PromoType;
                      setCurrentPromo({
                        ...currentPromo,
                        type: newType,
                        bgGradient: newType === 'flash_sale' ? 'from-amber-500 via-orange-500 to-red-600' : currentPromo.bgGradient,
                        badgeColor: newType === 'flash_sale' ? 'bg-amber-400 text-amber-950 font-bold' : currentPromo.badgeColor,
                        badgeText: newType === 'flash_sale' ? 'FLASH SALE KILAT' : currentPromo.badgeText,
                      });
                    }}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:border-orange-500"
                  >
                    <option value="banner">Banner Carousel Utama (Slide Beranda Atas)</option>
                    <option value="flash_sale">Widget Flash Sale & Diskon Kilat (Hitung Mundur)</option>
                    <option value="announcement_bar">Pengumuman Bar / Ticker Berjalan (Header)</option>
                    <option value="perk_card">Kartu Penawaran / Promo Perk Member</option>
                  </select>
                  <p className="text-[10px] text-stone-500 mt-1">
                    Pilih di mana info promo ini akan ditampilkan pada toko.
                  </p>
                </div>

                {/* 2. Status Aktif */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Status Publikasi Promo
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800">
                      <input
                        type="checkbox"
                        checked={currentPromo.isActive}
                        onChange={(e) => setCurrentPromo({ ...currentPromo, isActive: e.target.checked })}
                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-stone-300"
                      />
                      <span>Tampilkan Aktif di Aplikasi</span>
                    </label>
                  </div>
                </div>

                {/* 3. Judul Promo */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Judul Utama Promo / Diskon <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={currentPromo.title}
                    onChange={(e) => setCurrentPromo({ ...currentPromo, title: e.target.value })}
                    placeholder="Contoh: Kebutuhan Dapur & Sembako Hemat s.d. 35%"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* 4. Subjudul / Deskripsi */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Deskripsi / Rincian Produk Promo
                  </label>
                  <textarea
                    rows={2}
                    value={currentPromo.subtitle || ''}
                    onChange={(e) => setCurrentPromo({ ...currentPromo, subtitle: e.target.value })}
                    placeholder="Contoh: Minyak Bimoli 2L, Beras Ramos 5kg, & Gula Pasir harga spesial minimarket."
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* 5. Teks Badge & Nilai Diskon */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Teks Label Badge (Pojok Kiri)
                  </label>
                  <input
                    type="text"
                    value={currentPromo.badgeText || ''}
                    onChange={(e) => setCurrentPromo({ ...currentPromo, badgeText: e.target.value })}
                    placeholder="Contoh: PROMO JSM AKHIR PEKAN, FLASH SALE KILAT, DISKON GAJIAN"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nilai / Highlight Diskon
                  </label>
                  <input
                    type="text"
                    value={currentPromo.discountValue || ''}
                    onChange={(e) => setCurrentPromo({ ...currentPromo, discountValue: e.target.value })}
                    placeholder="Contoh: Hemat s.d 35%, Diskon 40%, Beli 2 Gratis 1, Potongan Rp 15.000"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* 6. Warna Badge Preset */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Warna Badge Label
                  </label>
                  <select
                    value={currentPromo.badgeColor || 'bg-red-500 text-white'}
                    onChange={(e) => setCurrentPromo({ ...currentPromo, badgeColor: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-orange-500"
                  >
                    {BADGE_COLOR_PRESETS.map((p, idx) => (
                      <option key={idx} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                {/* 7. Tombol Aksi (CTA) */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Teks Tombol Aksi (CTA)
                  </label>
                  <input
                    type="text"
                    value={currentPromo.ctaText || ''}
                    onChange={(e) => setCurrentPromo({ ...currentPromo, ctaText: e.target.value })}
                    placeholder="Contoh: Serbu Promo JSM, Cek Flash Deals, Belanja Sekarang"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* 8. Kategori Tujuan */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Kategori / Link Tujuan Belanja
                  </label>
                  <select
                    value={currentPromo.targetCategory || 'all'}
                    onChange={(e) => setCurrentPromo({ ...currentPromo, targetCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-orange-500"
                  >
                    <option value="all">Semua Produk Minimarket (all)</option>
                    <option value="jsm-promo">Promo JSM & Hemat (jsm-promo)</option>
                    <option value="sembako-dapur">Sembako & Kebutuhan Dapur</option>
                    <option value="minuman">Minuman & Segar</option>
                    <option value="snack-biskuit">Makanan Ringan & Biskuit</option>
                    <option value="buah-sayur">Buah & Sayur Segar</option>
                    <option value="susu-olahan">Susu & Produk Olahan</option>
                    <option value="kebersihan">Kebersihan Rumah Tangga</option>
                    <option value="ibu-bayi">Kebutuhan Ibu & Bayi</option>
                  </select>
                </div>

                {/* 9. Masa Berlaku Promo */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Masa Berlaku Promo
                  </label>
                  <input
                    type="text"
                    value={currentPromo.validUntil || ''}
                    onChange={(e) => setCurrentPromo({ ...currentPromo, validUntil: e.target.value })}
                    placeholder="Contoh: Setiap Jumat - Minggu, Hari Ini Saja, s.d 30 Sep 2026"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* 10. Timer Flash Sale (Khusus Flash Sale) */}
                {currentPromo.type === 'flash_sale' && (
                  <div className="md:col-span-2 bg-amber-50 p-3 rounded-2xl border border-amber-200 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-amber-950 mb-1">
                        Countdown Timer: Sisa Jam
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={currentPromo.flashHours ?? 4}
                        onChange={(e) => setCurrentPromo({ ...currentPromo, flashHours: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-950 mb-1">
                        Countdown Timer: Sisa Menit
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={currentPromo.flashMinutes ?? 59}
                        onChange={(e) => setCurrentPromo({ ...currentPromo, flashMinutes: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-900"
                      />
                    </div>
                  </div>
                )}

                {/* 11. Tema Warna Gradien Background */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Tema Warna Background (Gradien)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {GRADIENT_PRESETS.map((g, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentPromo({ ...currentPromo, bgGradient: g.value })}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                          currentPromo.bgGradient === g.value
                            ? 'border-orange-500 bg-orange-50/50 shadow-2xs'
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-lg bg-gradient-to-r ${g.value} shrink-0 shadow-2xs`} />
                        <span className="text-[11px] font-semibold text-stone-800 truncate">{g.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 12. Upload & Pengaturan Foto Promosi */}
                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-stone-700">
                      Foto / Banner Promosi (Upload Poster Promosi Toko)
                    </label>
                    {currentPromo.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setCurrentPromo({ ...currentPromo, imageUrl: '' })}
                        className="text-[11px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus Foto</span>
                      </button>
                    )}
                  </div>

                  {/* Drag and Drop Zone & Upload Input */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all ${
                      isDraggingFile
                        ? 'border-orange-500 bg-orange-50/70 scale-[1.01]'
                        : currentPromo.imageUrl
                        ? 'border-stone-300 bg-stone-50/70'
                        : 'border-stone-300 hover:border-orange-400 bg-stone-50 hover:bg-orange-50/30'
                    }`}
                  >
                    {currentPromo.imageUrl ? (
                      <div className="flex flex-col sm:flex-row items-center gap-4 text-left">
                        {/* Preview Thumbnail */}
                        <div className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-stone-900 shadow-sm border border-stone-200 shrink-0 group">
                          <img
                            src={currentPromo.imageUrl}
                            alt="Preview Foto Promosi"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label className="p-1.5 bg-white text-stone-900 rounded-lg text-xs font-bold cursor-pointer hover:bg-stone-100 shadow">
                              <Upload className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageFileUpload}
                                disabled={isUploadingImage}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setCurrentPromo({ ...currentPromo, imageUrl: '' })}
                              className="p-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 shadow cursor-pointer"
                              title="Hapus foto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Info & Options */}
                        <div className="flex-1 w-full space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Foto Promosi Terpasang
                            </span>
                          </div>
                          <p className="text-xs text-stone-600">
                            Foto poster promosi siap ditampilkan di toko. Anda dapat memilih apakah foto ingin ditampilkan penuh (banner poster) atau dengan gradien warna.
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{isUploadingImage ? 'Mengompres...' : 'Ganti Foto Lain'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageFileUpload}
                                disabled={isUploadingImage}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => setCurrentPromo({ ...currentPromo, imageUrl: '' })}
                              className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              Hapus Foto
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-2xs">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-stone-800">
                            Tarik & lepas file foto promosi ke sini, atau klik untuk memilih
                          </p>
                          <p className="text-[11px] text-stone-500">
                            Mendukung file JPG, PNG, WEBP dari galeri perangkat atau kamera (otomatis dikompres)
                          </p>
                        </div>

                        <div className="pt-2">
                          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer">
                            <Upload className="w-4 h-4" />
                            <span>{isUploadingImage ? 'Mengompres Foto...' : 'Pilih Foto dari Perangkat'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageFileUpload}
                              disabled={isUploadingImage}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mode Tampilan Foto Promosi (Full Poster vs Gradien) */}
                  {currentPromo.imageUrl && currentPromo.type === 'banner' && (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5">
                      <label className="block text-xs font-bold text-amber-950">
                        Pilihan Mode Tampilan Foto Banner
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentPromo({ ...currentPromo, displayMode: 'full_image' })}
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                            currentPromo.displayMode === 'full_image'
                              ? 'bg-amber-100 border-amber-500 text-amber-950 shadow-2xs'
                              : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full border-2 border-amber-600 flex items-center justify-center mt-0.5 shrink-0">
                            {currentPromo.displayMode === 'full_image' && <div className="w-2 h-2 rounded-full bg-amber-600" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold">Poster Foto Penuh (Full Image)</div>
                            <div className="text-[10px] text-stone-500 mt-0.5">Foto promosi tampil dominan & tajam dengan efek gelap lembut di teks</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCurrentPromo({ ...currentPromo, displayMode: 'standard' })}
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                            currentPromo.displayMode !== 'full_image'
                              ? 'bg-amber-100 border-amber-500 text-amber-950 shadow-2xs'
                              : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full border-2 border-amber-600 flex items-center justify-center mt-0.5 shrink-0">
                            {currentPromo.displayMode !== 'full_image' && <div className="w-2 h-2 rounded-full bg-amber-600" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold">Foto + Tema Gradien Warna</div>
                            <div className="text-[10px] text-stone-500 mt-0.5">Memadukan warna gradien toko dengan foto latar belakang</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Opsi Link URL Foto & Preset Cepat */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-stone-600 block">
                      Atau masukkan URL / Link Gambar Eksternal:
                    </span>
                    <input
                      type="url"
                      value={currentPromo.imageUrl || ''}
                      onChange={(e) => setCurrentPromo({ ...currentPromo, imageUrl: e.target.value })}
                      placeholder="https://example.com/foto-promo-diskon.jpg"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-orange-500"
                    />

                    {/* Preset Banner Images */}
                    <div className="pt-1">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Pilihan Cepat Gambar Minimarket Siap Pakai:
                      </span>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {COMMON_IMAGE_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCurrentPromo({ ...currentPromo, imageUrl: preset.url })}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-orange-100 hover:text-orange-800 text-stone-700 rounded-lg text-[10px] font-semibold transition-all shrink-0 border border-stone-200 cursor-pointer"
                          >
                            {preset.label.split('(')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 13. Cabang Toko */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Penerapan Cabang Toko
                  </label>
                  <select
                    value={currentPromo.storeId || 'all'}
                    onChange={(e) => setCurrentPromo({ ...currentPromo, storeId: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-orange-500"
                  >
                    <option value="all">Berlaku untuk Semua Cabang Toko</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setCurrentPromo(null); }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>{isNewPromo ? 'Simpan Promo Baru' : 'Simpan Perubahan Promo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
