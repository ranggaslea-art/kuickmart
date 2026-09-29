import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  Video,
  Film,
  HardDrive,
  ExternalLink,
  Play,
  FolderOpen,
  LogOut,
  Loader2
} from 'lucide-react';
import { StorePromoInfo, PromoType, Store, PromoMediaType } from '../types';
import { compressImageFile, COMMON_IMAGE_PRESETS, formatImageUrl, resolvePromoMediaUrl } from '../utils/imageHelper';
import { 
  initDriveAuth, 
  signInWithGoogleDrive, 
  logoutGoogleDrive, 
  getDriveAccessToken 
} from '../lib/googleDriveAuth';
import { 
  uploadMediaToGoogleDrive, 
  listGoogleDrivePromoMedia, 
  DriveUploadedFile 
} from '../lib/googleDriveService';
import { User } from 'firebase/auth';

interface PromoInfoManagerProps {
  promos: StorePromoInfo[];
  stores: Store[];
  onUpdatePromos: (promos: StorePromoInfo[]) => void;
  onSelectCategory?: (categorySlug: string) => void;
  canEdit?: boolean;
}

export const PromoInfoManager: React.FC<PromoInfoManagerProps> = ({
  promos,
  stores,
  onUpdatePromos,
  canEdit = true,
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

  // Google Drive state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveUploadProgress, setDriveUploadProgress] = useState<string | null>(null);
  const [showDriveMediaPicker, setShowDriveMediaPicker] = useState(false);
  const [driveMediaList, setDriveMediaList] = useState<DriveUploadedFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);

  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user, _token) => {
        setGoogleUser(user);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Connect Google Drive
  const handleConnectGoogleDrive = async () => {
    setIsConnectingDrive(true);
    try {
      const res = await signInWithGoogleDrive();
      if (res) {
        setGoogleUser(res.user);
        showNotification(`Berhasil terhubung ke Google Drive (${res.user.email || res.user.displayName})!`);
        // Load files from drive folder
        loadDriveFiles();
      }
    } catch (err: any) {
      console.error(err);
      alert(`Gagal menghubungkan Google Drive: ${err.message || 'Coba lagi'}`);
    } finally {
      setIsConnectingDrive(false);
    }
  };

  // Disconnect Google Drive
  const handleDisconnectDrive = async () => {
    await logoutGoogleDrive();
    setGoogleUser(null);
    setDriveMediaList([]);
    showNotification('Akun Google Drive telah diputuskan.');
  };

  // Load Google Drive Media Files
  const loadDriveFiles = async () => {
    setIsLoadingDriveFiles(true);
    try {
      const files = await listGoogleDrivePromoMedia();
      setDriveMediaList(files);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  // Upload video/photo/gif directly to Google Drive
  const handleUploadFileToGoogleDrive = async (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const isGif = file.type === 'image/gif';
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      alert('Format file tidak didukung! Mohon pilih file Video (MP4, WebM), Foto (JPG, PNG), atau GIF Animator.');
      return;
    }

    // Auto connect to Google Drive if not connected yet
    let token = await getDriveAccessToken();
    if (!token) {
      try {
        const authRes = await signInWithGoogleDrive();
        if (!authRes) return;
        setGoogleUser(authRes.user);
        token = authRes.accessToken;
      } catch (err: any) {
        alert('Otorisasi Google Drive diperlukan untuk mengunggah file media.');
        return;
      }
    }

    setIsUploadingToDrive(true);
    setDriveUploadProgress(`Mengunggah "${file.name}" ke Google Drive...`);
    try {
      const res = await uploadMediaToGoogleDrive(file);
      const mediaType: PromoMediaType = isVideo ? 'video' : isGif ? 'gif' : 'photo';

      if (currentPromo) {
        setCurrentPromo({
          ...currentPromo,
          mediaType: mediaType,
          videoUrl: isVideo ? res.driveViewUrl : undefined,
          imageUrl: isVideo ? (currentPromo.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800') : res.driveViewUrl,
          driveFileId: res.fileId,
          driveViewUrl: res.driveViewUrl,
          displayMode: currentPromo.displayMode || 'full_image',
        });
      }

      showNotification(`File ${mediaType.toUpperCase()} berhasil disimpan di Google Drive & diterapkan ke promo!`);
      // Refresh list
      loadDriveFiles();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Gagal mengunggah file ke Google Drive.');
    } finally {
      setIsUploadingToDrive(false);
      setDriveUploadProgress(null);
    }
  };

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
      mediaType: 'photo',
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

  // Quick Card Image/Video Upload (directly from promo card in the list)
  const handleQuickCardImageUpload = async (promoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const isGif = file.type === 'image/gif';
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      alert('Mohon pilih file media yang valid (Video MP4, Foto JPG/PNG, atau GIF Animator).');
      return;
    }

    try {
      setIsUploadingImage(true);
      const token = await getDriveAccessToken();

      if (isVideo || token) {
        // Simpan langsung ke Google Drive jika ada token atau file video
        const driveRes = await uploadMediaToGoogleDrive(file);
        const updated = promos.map(p => {
          if (p.id === promoId) {
            return {
              ...p,
              mediaType: (isVideo ? 'video' : isGif ? 'gif' : 'photo') as PromoMediaType,
              videoUrl: isVideo ? driveRes.driveViewUrl : undefined,
              imageUrl: isVideo ? (p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800') : driveRes.driveViewUrl,
              driveFileId: driveRes.fileId,
              driveViewUrl: driveRes.driveViewUrl,
              displayMode: p.displayMode || 'full_image',
              updatedAt: new Date().toISOString().split('T')[0],
            };
          }
          return p;
        });
        onUpdatePromos(updated);
        showNotification(`Media ${isVideo ? 'Video' : 'Foto'} berhasil diunggah ke Google Drive & diperbarui!`);
      } else {
        const base64 = await compressImageFile(file, 1200, 0.85);
        const updated = promos.map(p => {
          if (p.id === promoId) {
            return { 
              ...p, 
              imageUrl: base64,
              mediaType: (isGif ? 'gif' : 'photo') as PromoMediaType,
              displayMode: p.displayMode || 'full_image',
              updatedAt: new Date().toISOString().split('T')[0] 
            };
          }
          return p;
        });
        onUpdatePromos(updated);
        showNotification('Foto promosi berhasil diperbarui langsung!');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Gagal mengunggah file media promo.');
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

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Google Drive Status & Connection Button */}
            {googleUser ? (
              <div className="flex items-center gap-1.5 bg-white border border-emerald-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-bold text-stone-800 max-w-[140px] truncate" title={googleUser.email || ''}>
                  {googleUser.email?.split('@')[0] || 'Google Drive'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    loadDriveFiles();
                    setShowDriveMediaPicker(true);
                  }}
                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-extrabold cursor-pointer transition"
                  title="Buka Koleksi File Media Promo di Google Drive"
                >
                  Buka Vault Drive
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectDrive}
                  className="p-1 text-stone-400 hover:text-red-600 rounded-md transition"
                  title="Putuskan akun Google Drive"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectGoogleDrive}
                disabled={isConnectingDrive}
                className="px-3 py-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Hubungkan akun Google Drive untuk menyimpan file video, photo, dan gif promo"
              >
                {isConnectingDrive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
                ) : (
                  <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>{isConnectingDrive ? 'Menghubungkan...' : 'Hubungkan Google Drive'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenAdd('banner')}
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Promo Baru</span>
            </button>
          </div>
        )}
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
                  {/* Background display according to displayMode and mediaType */}
                  {promo.mediaType === 'video' || promo.videoUrl ? (
                    <div className="absolute inset-0 pointer-events-none bg-black">
                      {promo.driveFileId ? (
                        <iframe
                          src={`https://drive.google.com/file/d/${promo.driveFileId}/preview`}
                          className="w-full h-full border-0 pointer-events-none scale-105"
                          title={promo.title}
                          allow="autoplay"
                        />
                      ) : (
                        <video
                          src={promo.videoUrl || promo.imageUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover object-center"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30 pointer-events-none" />
                    </div>
                  ) : promo.displayMode === 'full_image' && promo.imageUrl ? (
                    <div className="absolute inset-0 pointer-events-none">
                      <img
                        src={formatImageUrl(promo.imageUrl)}
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
                          src={formatImageUrl(promo.imageUrl)}
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

                      {/* Media Type Badge */}
                      {promo.mediaType === 'video' || promo.videoUrl ? (
                        <span className="text-[10px] font-bold bg-purple-600/90 backdrop-blur-xs text-white px-2 py-0.5 rounded-full border border-purple-400 flex items-center gap-1" title="Video Promosi">
                          <Video className="w-3 h-3 text-purple-200" />
                          <span>Video</span>
                        </span>
                      ) : promo.mediaType === 'gif' ? (
                        <span className="text-[10px] font-bold bg-pink-600/90 backdrop-blur-xs text-white px-2 py-0.5 rounded-full border border-pink-400 flex items-center gap-1" title="GIF Animator">
                          <Film className="w-3 h-3 text-pink-200" />
                          <span>GIF Animasi</span>
                        </span>
                      ) : promo.imageUrl ? (
                        <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs text-white px-2 py-0.5 rounded-full border border-white/30 flex items-center gap-1" title="Foto Promosi Terpasang">
                          <ImageIcon className="w-3 h-3 text-amber-300" />
                          <span>{promo.displayMode === 'full_image' ? 'Poster Foto' : 'Foto'}</span>
                        </span>
                      ) : null}

                      {/* Google Drive Stored Badge */}
                      {promo.driveFileId && (
                        <span className="text-[9px] font-bold bg-emerald-600/90 text-white px-1.5 py-0.5 rounded-full flex items-center gap-1" title="Disimpan di Google Drive">
                          <HardDrive className="w-2.5 h-2.5 text-emerald-200" />
                          <span>Drive</span>
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
                    {/* Quick photo/video upload button */}
                    <label 
                      className="p-1.5 text-stone-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer" 
                      title="Upload / Ganti Media Promosi (Video/Foto/GIF)"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => handleQuickCardImageUpload(promo.id, e)}
                        disabled={isUploadingImage}
                        className="hidden"
                      />
                    </label>

                    {canEdit ? (
                      <>
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
                      </>
                    ) : (
                      <span className="text-[10px] text-stone-400 font-medium italic px-2 py-1 bg-stone-100 rounded-lg">
                        Hanya Lihat
                      </span>
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

                {/* 12. Media Promosi: Video, Photo, dan GIF Animator (Google Drive Integration) */}
                <div className="md:col-span-2 space-y-3 bg-stone-50/80 p-4 rounded-2xl border border-stone-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-black text-stone-900 flex items-center gap-1.5">
                        <Film className="w-4 h-4 text-orange-600" />
                        <span>Media Promosi (Video, Photo, dan GIF Animator)</span>
                      </label>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Dapat dieksekusi dari file lokal perangkat atau disimpan langsung ke <strong>Google Drive</strong>.
                      </p>
                    </div>

                    {(currentPromo.imageUrl || currentPromo.videoUrl) && (
                      <button
                        type="button"
                        onClick={() => setCurrentPromo({ ...currentPromo, imageUrl: '', videoUrl: '', driveFileId: undefined, driveViewUrl: undefined })}
                        className="text-[11px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus Media</span>
                      </button>
                    )}
                  </div>

                  {/* Pilihan Tipe Media (Photo, Video, GIF) */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: 'photo' as const, label: 'Foto / Poster', icon: <ImageIcon className="w-3.5 h-3.5" />, desc: 'JPG, PNG, WEBP' },
                      { type: 'video' as const, label: 'Video Promosi', icon: <Video className="w-3.5 h-3.5" />, desc: 'MP4, WebM, Stream' },
                      { type: 'gif' as const, label: 'GIF Animator', icon: <Film className="w-3.5 h-3.5" />, desc: 'Animasi Bergerak' },
                    ].map((m) => {
                      const isSelected = (currentPromo.mediaType || 'photo') === m.type;
                      return (
                        <button
                          key={m.type}
                          type="button"
                          onClick={() => setCurrentPromo({ ...currentPromo, mediaType: m.type })}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-orange-50 border-orange-500 text-orange-950 ring-1 ring-orange-500 shadow-2xs'
                              : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <span className={isSelected ? 'text-orange-600' : 'text-stone-500'}>{m.icon}</span>
                            <span>{m.label}</span>
                          </div>
                          <div className="text-[10px] text-stone-500 mt-0.5">{m.desc}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Drag and Drop Zone & Upload Input */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all ${
                      isDraggingFile
                        ? 'border-orange-500 bg-orange-50/70 scale-[1.01]'
                        : currentPromo.imageUrl || currentPromo.videoUrl
                        ? 'border-stone-300 bg-white'
                        : 'border-stone-300 hover:border-orange-400 bg-white hover:bg-orange-50/30'
                    }`}
                  >
                    {isUploadingToDrive && (
                      <div className="py-6 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                        <p className="text-xs font-bold text-stone-800">{driveUploadProgress || 'Mengunggah file ke Google Drive...'}</p>
                        <p className="text-[10px] text-stone-500">Menyimpan dan mengatur izin akses publik Google Drive</p>
                      </div>
                    )}

                    {!isUploadingToDrive && (currentPromo.imageUrl || currentPromo.videoUrl) ? (
                      <div className="flex flex-col sm:flex-row items-center gap-4 text-left">
                        {/* Preview Thumbnail: Photo / GIF / Video */}
                        <div className="relative w-full sm:w-56 h-36 rounded-xl overflow-hidden bg-stone-900 shadow-sm border border-stone-200 shrink-0 group">
                          {currentPromo.mediaType === 'video' || currentPromo.videoUrl ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-black">
                              {currentPromo.driveFileId ? (
                                <iframe
                                  src={`https://drive.google.com/file/d/${currentPromo.driveFileId}/preview`}
                                  className="w-full h-full border-0 pointer-events-none"
                                  title="Google Drive Video Preview"
                                />
                              ) : (
                                <video
                                  src={currentPromo.videoUrl || currentPromo.imageUrl}
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  className="w-full h-full object-cover"
                                />
                              )}
                              <div className="absolute top-2 left-2 bg-purple-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 backdrop-blur-xs">
                                <Play className="w-3 h-3 fill-white" />
                                <span>Video Preview</span>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={formatImageUrl(currentPromo.imageUrl)}
                              alt="Preview Foto/GIF Promosi"
                              className="w-full h-full object-cover"
                            />
                          )}

                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label className="p-2 bg-white text-stone-900 rounded-lg text-xs font-bold cursor-pointer hover:bg-stone-100 shadow" title="Ganti File">
                              <Upload className="w-4 h-4" />
                              <input
                                type="file"
                                accept={currentPromo.mediaType === 'video' ? 'video/*' : 'image/*'}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) await handleUploadFileToGoogleDrive(file);
                                  e.target.value = '';
                                }}
                                disabled={isUploadingToDrive || isUploadingImage}
                                className="hidden"
                              />
                            </label>
                            {currentPromo.driveViewUrl && (
                              <a
                                href={currentPromo.driveViewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow"
                                title="Buka di Google Drive"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setCurrentPromo({ ...currentPromo, imageUrl: '', videoUrl: '', driveFileId: undefined, driveViewUrl: undefined })}
                              className="p-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 shadow cursor-pointer"
                              title="Hapus media"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Info & Options */}
                        <div className="flex-1 w-full space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Media {currentPromo.mediaType === 'video' ? 'Video' : currentPromo.mediaType === 'gif' ? 'GIF Animator' : 'Foto'} Siap Tayang</span>
                            </span>
                            {currentPromo.driveFileId && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-md flex items-center gap-1">
                                <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                                <span>Tersimpan di Google Drive</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-600">
                            File media promo berhasil disinkronkan dan dapat dieksekusi dengan mulus pada banner carousel & widget promo toko.
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {/* Upload to Google Drive button */}
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all">
                              <HardDrive className="w-3.5 h-3.5" />
                              <span>Simpan ke Google Drive</span>
                              <input
                                type="file"
                                accept={currentPromo.mediaType === 'video' ? 'video/*' : 'image/*'}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) await handleUploadFileToGoogleDrive(file);
                                  e.target.value = '';
                                }}
                                disabled={isUploadingToDrive}
                                className="hidden"
                              />
                            </label>

                            {/* Local device upload */}
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold border border-stone-300 transition-all">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload dari Perangkat</span>
                              <input
                                type="file"
                                accept={currentPromo.mediaType === 'video' ? 'video/*' : 'image/*'}
                                onChange={handleImageFileUpload}
                                disabled={isUploadingImage}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => setCurrentPromo({ ...currentPromo, imageUrl: '', videoUrl: '', driveFileId: undefined, driveViewUrl: undefined })}
                              className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : !isUploadingToDrive ? (
                      <div className="py-4 flex flex-col items-center justify-center gap-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-2xs">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
                            <HardDrive className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-stone-800">
                            Pilih atau Tarik & Lepas file <strong>Video (MP4)</strong>, <strong>Foto (JPG/PNG)</strong>, atau <strong>GIF Animator</strong>
                          </p>
                          <p className="text-[11px] text-stone-500">
                            File dapat diunggah dan disimpan langsung ke Google Drive agar hemat ruang dan mudah diakses bersama.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          {/* Tombol Utama: Upload langsung ke Google Drive */}
                          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer">
                            <HardDrive className="w-4 h-4" />
                            <span>Upload & Simpan di Google Drive</span>
                            <input
                              type="file"
                              accept="image/*,video/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) await handleUploadFileToGoogleDrive(file);
                                e.target.value = '';
                              }}
                              disabled={isUploadingToDrive}
                              className="hidden"
                            />
                          </label>

                          {/* Tombol Cadangan: Upload biasa perangkat */}
                          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer">
                            <Upload className="w-4 h-4" />
                            <span>Pilih dari Perangkat</span>
                            <input
                              type="file"
                              accept="image/*,video/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.type.startsWith('video/')) {
                                  // Video sebaiknya ke Google Drive
                                  await handleUploadFileToGoogleDrive(file);
                                } else {
                                  await processPromoPhotoFile(file);
                                }
                                e.target.value = '';
                              }}
                              disabled={isUploadingImage}
                              className="hidden"
                            />
                          </label>

                          {googleUser && (
                            <button
                              type="button"
                              onClick={() => {
                                loadDriveFiles();
                                setShowDriveMediaPicker(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              <FolderOpen className="w-4 h-4 text-emerald-600" />
                              <span>Pilih dari Google Drive</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Mode Tampilan Foto/Video Promosi (Full Poster vs Gradien) */}
                  {(currentPromo.imageUrl || currentPromo.videoUrl) && currentPromo.type === 'banner' && (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5">
                      <label className="block text-xs font-bold text-amber-950">
                        Pilihan Mode Tampilan Media Banner
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
                            <div className="text-xs font-bold">Poster Penuh (Full Media View)</div>
                            <div className="text-[10px] text-stone-500 mt-0.5">Media video/foto/GIF tampil dominan penuh dengan overlay teks jernih</div>
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
                            <div className="text-xs font-bold">Paduan Gradien Warna Toko</div>
                            <div className="text-[10px] text-stone-500 mt-0.5">Memadukan warna tema gradien dengan latar belakang visual</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Opsi Link URL Media Eksternal & Google Drive Share Link */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-stone-600 block">
                      Atau Tempelkan Link Google Drive / URL Video / GIF Langsung:
                    </span>
                    <input
                      type="url"
                      value={currentPromo.videoUrl || currentPromo.imageUrl || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const isVid = val.endsWith('.mp4') || val.endsWith('.webm') || val.includes('video');
                        const isGifAnim = val.endsWith('.gif');
                        setCurrentPromo({
                          ...currentPromo,
                          imageUrl: val,
                          videoUrl: isVid ? val : undefined,
                          mediaType: isVid ? 'video' : isGifAnim ? 'gif' : currentPromo.mediaType || 'photo',
                        });
                      }}
                      placeholder="https://drive.google.com/file/d/... atau https://example.com/promo.mp4"
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-orange-500"
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
                            onClick={() => setCurrentPromo({ ...currentPromo, imageUrl: preset.url, mediaType: 'photo', videoUrl: undefined })}
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
      {/* MODAL: GOOGLE DRIVE PROMO MEDIA VAULT */}
      {showDriveMediaPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                  <HardDrive className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">Google Drive Media Vault Toko</h3>
                  <p className="text-[11px] text-blue-200">
                    Folder: <code className="bg-white/10 px-1 py-0.2 rounded font-mono">Toko_Promo_Media</code> • Akun: {googleUser?.email || 'Google User'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDriveMediaPicker(false)}
                className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                <div className="text-xs text-blue-900">
                  <span className="font-bold">Unggah file baru ke Google Drive:</span> Mendukung file Video (.mp4), Photo (.jpg, .png), dan GIF animator.
                </div>

                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 shrink-0 self-start sm:self-auto">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File ke Drive</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await handleUploadFileToGoogleDrive(file);
                      }
                      e.target.value = '';
                    }}
                    disabled={isUploadingToDrive}
                    className="hidden"
                  />
                </label>
              </div>

              {isLoadingDriveFiles ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-stone-700">Membaca file promo dari Google Drive...</p>
                </div>
              ) : driveMediaList.length === 0 ? (
                <div className="py-12 text-center space-y-2 border border-dashed border-stone-300 rounded-xl p-6">
                  <FolderOpen className="w-10 h-10 text-stone-300 mx-auto" />
                  <h4 className="text-xs font-bold text-stone-700">Belum ada file media promo di folder Google Drive</h4>
                  <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                    Klik tombol &quot;Upload File ke Drive&quot; di atas untuk mengunggah file video, poster photo, atau GIF animasi pertama Anda.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {driveMediaList.map((file) => {
                    const isVid = file.mimeType.startsWith('video/');
                    const isGif = file.mimeType === 'image/gif';
                    const fileDirectUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;

                    return (
                      <div
                        key={file.id}
                        className="group relative bg-stone-50 border border-stone-200 rounded-xl p-2.5 flex flex-col justify-between hover:border-blue-400 hover:shadow-xs transition"
                      >
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-stone-900 mb-2">
                          {isVid ? (
                            <div className="w-full h-full flex items-center justify-center bg-black/80">
                              <Video className="w-8 h-8 text-purple-400" />
                              <div className="absolute bottom-1 right-1 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                                VIDEO
                              </div>
                            </div>
                          ) : (
                            <img
                              src={`https://drive.google.com/thumbnail?id=${file.id}&sz=w400`}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          )}

                          <div className="absolute top-1 left-1">
                            <span className="text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.2 rounded">
                              {isVid ? 'MP4' : isGif ? 'GIF' : 'IMG'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1 mb-2">
                          <p className="text-xs font-bold text-stone-900 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[10px] text-stone-500 font-mono">
                            ID: {file.id.slice(0, 8)}...
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1 border-t border-stone-200">
                          {currentPromo ? (
                            <button
                              type="button"
                              onClick={() => {
                                const detectedType: PromoMediaType = isVid ? 'video' : isGif ? 'gif' : 'photo';
                                setCurrentPromo({
                                  ...currentPromo,
                                  mediaType: detectedType,
                                  videoUrl: isVid ? fileDirectUrl : undefined,
                                  imageUrl: isVid ? (currentPromo.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800') : fileDirectUrl,
                                  driveFileId: file.id,
                                  driveViewUrl: file.webViewLink,
                                  displayMode: currentPromo.displayMode || 'full_image',
                                });
                                setShowDriveMediaPicker(false);
                                showNotification(`Media "${file.name}" berhasil diterapkan ke promo!`);
                              }}
                              className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition text-center cursor-pointer"
                            >
                              Gunakan
                            </button>
                          ) : null}

                          <a
                            href={file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg transition"
                            title="Buka di tab baru Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-stone-100 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
              <span>{driveMediaList.length} file tersimpan di Google Drive</span>
              <button
                type="button"
                onClick={() => setShowDriveMediaPicker(false)}
                className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
