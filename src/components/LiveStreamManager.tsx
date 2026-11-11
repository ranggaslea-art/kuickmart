import React, { useState, useEffect, useMemo } from 'react';
import { Product, Store } from '../types';
import {
  LiveStreamConfig,
  loadLiveStreamConfig,
  saveLiveStreamConfig,
  triggerOpenLiveStream,
  PRESET_STREAM_VIDEOS,
} from '../utils/liveStreamHelper';
import { formatImageUrl, getProductFallbackImage } from '../utils/imageHelper';
import {
  Radio,
  Play,
  Save,
  CheckCircle2,
  Video,
  Sparkles,
  Layers,
  ShoppingBag,
  RotateCcw,
  Eye,
  Camera,
  Link,
  Flame,
  MessageSquare,
  Search,
  Check,
  Plus,
  Trash2,
  Star,
  Tag,
} from 'lucide-react';

interface LiveStreamManagerProps {
  currentStore: Store;
  activeTenantSlug?: string;
  storeLogoUrl?: string;
  products: Product[];
  onOpenLiveTest?: () => void;
}

export const LiveStreamManager: React.FC<LiveStreamManagerProps> = ({
  currentStore,
  activeTenantSlug = 'default',
  storeLogoUrl,
  products = [],
  onOpenLiveTest,
}) => {
  const [config, setConfig] = useState<LiveStreamConfig>(() =>
    loadLiveStreamConfig(activeTenantSlug, currentStore.name, storeLogoUrl, products)
  );
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');

  useEffect(() => {
    setConfig(loadLiveStreamConfig(activeTenantSlug, currentStore.name, storeLogoUrl, products));
  }, [activeTenantSlug, currentStore.name, storeLogoUrl, products]);

  const handleSave = () => {
    saveLiveStreamConfig(config, activeTenantSlug);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  const handleTestLive = () => {
    saveLiveStreamConfig(config, activeTenantSlug);
    if (onOpenLiveTest) {
      onOpenLiveTest();
    } else {
      triggerOpenLiveStream('fullscreen');
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    setConfig((prev) => ({
      ...prev,
      streamType: 'custom_url',
      videoUrl: customUrlInput.trim(),
    }));
    setCustomUrlInput('');
  };

  const selectedProductIds: string[] = useMemo(() => {
    if (Array.isArray(config.pinnedProductIds) && config.pinnedProductIds.length > 0) {
      return config.pinnedProductIds;
    }
    return config.pinnedProductId ? [config.pinnedProductId] : [];
  }, [config.pinnedProductIds, config.pinnedProductId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !productSearch.trim() ||
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(productSearch.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase()));
      const matchCat = selectedFilterCategory === 'all' || p.category === selectedFilterCategory;
      return matchSearch && matchCat;
    });
  }, [products, productSearch, selectedFilterCategory]);

  const handleToggleProduct = (productId: string) => {
    const isCurrentlySelected = selectedProductIds.includes(productId);
    let updatedIds: string[];

    if (isCurrentlySelected) {
      updatedIds = selectedProductIds.filter((id) => id !== productId);
    } else {
      updatedIds = [...selectedProductIds, productId];
    }

    const updatedPrimary =
      config.pinnedProductId === productId && isCurrentlySelected
        ? updatedIds[0] || undefined
        : config.pinnedProductId || updatedIds[0] || undefined;

    setConfig((prev) => ({
      ...prev,
      pinnedProductIds: updatedIds,
      pinnedProductId: updatedPrimary,
    }));
  };

  const handleSetPrimaryProduct = (productId: string) => {
    let updatedIds = selectedProductIds;
    if (!updatedIds.includes(productId)) {
      updatedIds = [productId, ...updatedIds];
    }
    setConfig((prev) => ({
      ...prev,
      pinnedProductId: productId,
      pinnedProductIds: updatedIds,
    }));
  };

  const handleSelectTop = (count: number) => {
    const topIds = products.slice(0, count).map((p) => p.id);
    setConfig((prev) => ({
      ...prev,
      pinnedProductIds: topIds,
      pinnedProductId: topIds[0] || undefined,
    }));
  };

  const handleClearAllSelected = () => {
    setConfig((prev) => ({
      ...prev,
      pinnedProductIds: [],
      pinnedProductId: undefined,
    }));
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-900 via-rose-950 to-orange-950 text-white shadow-lg border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-500 to-orange-500 p-2.5 flex items-center justify-center text-white shadow-md shadow-red-500/30 shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Kelola Toko Live Streaming (TikTok & Shopee Live)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/30 text-red-300 border border-red-400/40">
                🔴 Fitur Siaran Langsung
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Siarkan langsung penjualan produk toko di halaman index. Pengunjung dapat menonton secara melayang (PiP), memperbesar ke layar penuh, like hati, chat interaktif, dan langsung belanja dari keranjang kuning!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleTestLive}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 active:scale-95 text-white backdrop-blur-md border border-white/20 transition-all shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current text-red-400" />
            <span>Uji Coba Siaran</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 active:scale-95 text-white shadow-md transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* Main Form Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Pengaturan Siaran (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Status & Saklar Siaran */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  1. Status Siaran Toko
                </h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-red-600" />
                <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {config.enabled ? 'Aktif (Sedang Siaran)' : 'Nonaktif'}
                </span>
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Judul Siaran Live Streaming:
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Contoh: 🔥 Cuci Gudang Sembako & Snack Murah Spesial Hari Ini!"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Host / Toko yang Ditampilkan:
                </label>
                <input
                  type="text"
                  value={config.streamerName}
                  onChange={(e) => setConfig((prev) => ({ ...prev, streamerName: e.target.value }))}
                  placeholder={`Contoh: Host Live • ${currentStore.name}`}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Pilihan Sumber Video Live */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                2. Sumber Video Streaming
              </h3>
            </div>

            {/* Pilihan Tipe Sumber Video Toko */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, streamType: 'preset_video' }))}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  config.streamType === 'preset_video' || (config.streamType as any) === 'webcam'
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-900 dark:text-red-200 ring-2 ring-red-500/20 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-red-600" />
                    Klip Host Siaran Toko (Rekomendasi)
                  </span>
                  {(config.streamType === 'preset_video' || (config.streamType as any) === 'webcam') && (
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400">Aktif ✓</span>
                  )}
                </div>
                <span className="text-[10px] opacity-80 mt-1">
                  Video host e-commerce jualan sembako & snack otomatis looping yang ditonton oleh semua pengunjung di HP maupun Laptop.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, streamType: 'custom_url' }))}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  config.streamType === 'custom_url'
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-900 dark:text-red-200 ring-2 ring-red-500/20 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Link className="w-3.5 h-3.5 text-blue-600" />
                    Tautan URL Video / Stream Langsung
                  </span>
                  {config.streamType === 'custom_url' && (
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Aktif ✓</span>
                  )}
                </div>
                <span className="text-[10px] opacity-80 mt-1">
                  Gunakan video URL kustom toko Anda (format MP4, WebM, atau link siaran langsung HLS/m3u8).
                </span>
              </button>
            </div>

            {/* Jika mode preset video: Daftar Pilihan Video Preset */}
            {config.streamType === 'preset_video' && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Pilih Klip Host Siaran Toko:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {PRESET_STREAM_VIDEOS.map((preset) => {
                    const isSelected = config.videoUrl === preset.videoUrl;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => setConfig((prev) => ({ ...prev, videoUrl: preset.videoUrl }))}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-950 dark:text-orange-200 ring-1 ring-orange-500/30'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-black/10">
                          <img
                            src={preset.poster}
                            alt={preset.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {preset.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {preset.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold">✓</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Jika mode custom URL */}
            {config.streamType === 'custom_url' && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Masukkan URL Video Stream (MP4 / WebM / HLS):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customUrlInput || config.videoUrl}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://example.com/live-stream.mp4"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 transition-colors"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Produk Pinned Multi-Item / Keranjang Kuning */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  3. Barang & Produk Promosi Live Streaming ("Keranjang Kuning" 🛍️)
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                  {selectedProductIds.length} Produk Dipilih
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Admin dapat bebas memilih beberapa produk untuk dipromosikan sekaligus dalam siaran live. Pengunjung dapat melihat seluruh item ini di etalase live dan carousel produk tersemat.
            </p>

            {/* Quick Action Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Pilihan Cepat:</span>
              <button
                type="button"
                onClick={() => handleSelectTop(3)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
              >
                + 3 Produk Teratas
              </button>
              <button
                type="button"
                onClick={() => handleSelectTop(5)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
              >
                + 5 Produk Teratas
              </button>
              <button
                type="button"
                onClick={() => handleSelectTop(products.length)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 transition-colors"
              >
                Pilih Semua ({products.length})
              </button>
              {selectedProductIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllSelected}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-auto"
                >
                  Kosongkan Pilihan
                </button>
              )}
            </div>

            {/* Daftar Produk Terpilih Saat Ini (Selected Promo Items) */}
            {selectedProductIds.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-950 dark:text-amber-200">
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>Daftar Produk Live Aktif ({selectedProductIds.length} item):</span>
                  </span>
                  <span className="text-[10px] font-normal text-amber-800 dark:text-amber-300">
                    Bintang emas (⭐) = Pin Utama #1 di Layar
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {selectedProductIds.map((id, idx) => {
                    const prod = products.find((p) => p.id === id);
                    if (!prod) return null;
                    const isPrimary = config.pinnedProductId === id || (!config.pinnedProductId && idx === 0);
                    return (
                      <div
                        key={id}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          isPrimary
                            ? 'bg-white dark:bg-slate-900 border-amber-400 ring-2 ring-amber-400/30 shadow-xs'
                            : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                            <img
                              src={formatImageUrl(prod.image)}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = getProductFallbackImage(prod.name, prod.category);
                              }}
                            />
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[8px] font-black px-1.5 py-0.2 rounded-md ${
                                  isPrimary
                                    ? 'bg-red-600 text-white'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                #{idx + 1} {isPrimary ? 'SPILL UTAMA' : 'PROMO LIVE'}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
                              {prod.name}
                            </p>
                            <p className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                              Rp {prod.price.toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryProduct(id)}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold flex items-center gap-0.5"
                              title="Jadikan produk utama yang pertama di-spill host"
                            >
                              <Star className="w-3 h-3" />
                              <span className="hidden sm:inline">Set #1</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleProduct(id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Hapus dari siaran live"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter & Pencarian Katalog untuk Ditambahkan */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Tambah / Hapus Produk dari Katalog Toko:
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Cari nama barang atau merk..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <select
                  value={selectedFilterCategory}
                  onChange={(e) => setSelectedFilterCategory(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid Katalog Produk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const isSelected = selectedProductIds.includes(p.id);
                  const isPrimary = config.pinnedProductId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleToggleProduct(p.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 ring-1 ring-amber-400/40'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                          <img
                            src={formatImageUrl(p.image)}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = getProductFallbackImage(p.name, p.category);
                            }}
                          />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {p.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">
                              Rp {p.price.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[9px] text-slate-400 truncate">
                              {p.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-white font-bold shadow-xs'
                              : 'border border-slate-300 dark:border-slate-600 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Voucher Diskon Khusus Live */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Kode Kupon Diskon Live:
                </label>
                <input
                  type="text"
                  value={config.promoVoucherCode || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, promoVoucherCode: e.target.value.toUpperCase() }))}
                  placeholder="Contoh: LIVEHEMAT20"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Teks Keterangan Kupon:
                </label>
                <input
                  type="text"
                  value={config.promoVoucherText || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, promoVoucherText: e.target.value }))}
                  placeholder="Contoh: Diskon 20% Khusus Penonton Live!"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Auto Chat Toggle */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center justify-between text-xs cursor-pointer py-1">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Aktifkan Simulasi Komentar Penonton (Auto-Chat)
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Memunculkan pertanyaan dan antusiasme pembeli secara otomatis layaknya siaran TikTok / Shopee Live yang ramai.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.autoChatEnabled !== false}
                  onChange={(e) => setConfig((prev) => ({ ...prev, autoChatEnabled: e.target.checked }))}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer ml-3"
                />
              </label>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Kembalikan seluruh pengaturan Live Streaming ke bawaan?')) {
                  const def = loadLiveStreamConfig(activeTenantSlug, currentStore.name, storeLogoUrl, products);
                  setConfig(def);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Bawaan</span>
            </button>

            <div className="flex items-center gap-2">
              {savedSuccess && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pengaturan Berhasil Disimpan!</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 active:scale-95 shadow-md shadow-red-500/20 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Live Streaming</span>
              </button>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Pratinjau Smartphone Vertikal (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="sticky top-6 w-full flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Pratinjau Tampilan TikTok/Shopee Live
              </span>
            </div>

            {/* Phone Case Frame */}
            <div className="w-[280px] sm:w-[300px] h-[520px] sm:h-[550px] rounded-[38px] bg-slate-950 p-3 shadow-2xl border-4 border-slate-700 relative overflow-hidden flex flex-col">
              {/* Speaker Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-slate-800 rounded-full z-20" />

              {/* Display Mockup */}
              <div className="w-full h-full rounded-[26px] overflow-hidden relative flex flex-col justify-between p-3 text-white bg-slate-900">
                {/* Background Video Player in Admin Phone Mockup */}
                <div className="absolute inset-0">
                  <video
                    key={config.videoUrl || PRESET_STREAM_VIDEOS[0].videoUrl}
                    src={config.videoUrl || PRESET_STREAM_VIDEOS[0].videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover filter brightness-90"
                    poster={
                      PRESET_STREAM_VIDEOS.find((p) => p.videoUrl === config.videoUrl)?.poster ||
                      PRESET_STREAM_VIDEOS[0].poster
                    }
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80 pointer-events-none" />
                </div>

                {/* Mockup Header */}
                <div className="relative z-10 flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5 p-1 pr-2.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20">
                    <div className="w-7 h-7 rounded-full bg-slate-800 overflow-hidden shrink-0">
                      <img
                        src={config.streamerAvatar || storeLogoUrl || '/pwa-192x192.png'}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] font-bold truncate max-w-[90px]">
                      {currentStore.name}
                    </span>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
                    🔴 LIVE
                  </span>
                </div>

                {/* Mockup Chat Bubble */}
                <div className="relative z-10 space-y-1 text-left">
                  <div className="inline-block px-2 py-1 rounded-xl bg-black/60 backdrop-blur-md text-[10px] text-white">
                    <span className="font-bold text-amber-300">Rina:</span> Minyak goreng diskon berapa min?
                  </div>
                  <div className="inline-block px-2 py-1 rounded-xl bg-black/60 backdrop-blur-md text-[10px] text-white">
                    <span className="font-bold text-rose-300">Budi:</span> Udah CO 2 pack mantap min!
                  </div>
                </div>

                {/* Mockup Pinned Product */}
                <div className="relative z-10 p-2 rounded-xl bg-slate-900/90 border border-amber-400 text-white flex items-center justify-between gap-2 shadow-lg">
                  <div className="min-w-0 text-left">
                    <span className="text-[8px] font-black text-amber-400 uppercase">#1 Di-Spill</span>
                    <p className="text-[10px] font-bold truncate">
                      {products.find((p) => p.id === config.pinnedProductId)?.name || 'Produk Sembako Unggulan'}
                    </p>
                    <span className="text-[10px] font-black text-amber-300">
                      Rp {((products.find((p) => p.id === config.pinnedProductId)?.price) || 25000).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black shrink-0">
                    Beli
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestLive}
              className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Buka Siaran Langsung Layar Penuh</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
