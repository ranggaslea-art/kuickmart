import React, { useState, useEffect, useRef } from 'react';
import {
  SplashScreenConfig,
  loadSplashScreenConfig,
  saveSplashScreenConfig,
  resetSplashScreenConfig,
  triggerManualSplashScreen,
  DEFAULT_SPLASH_SCREEN_CONFIG,
  SPLASH_PRESET_LOGOS,
  SPLASH_THEME_OPTIONS,
} from '../utils/splashScreenHelper';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Play,
  Save,
  X,
  Check,
  CheckCircle2,
  Sliders,
  Palette,
  Eye,
  Smartphone,
  Info,
  Clock,
  Layers,
  Link,
  ChevronRight,
} from 'lucide-react';

interface SplashScreenEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTenantSlug?: string;
  currentStoreName?: string;
  storeLogoUrl?: string;
}

export const SplashScreenEditorModal: React.FC<SplashScreenEditorModalProps> = ({
  isOpen,
  onClose,
  activeTenantSlug = 'default',
  currentStoreName = 'LapakOke Pusat',
  storeLogoUrl,
}) => {
  const [config, setConfig] = useState<SplashScreenConfig>(() => loadSplashScreenConfig(activeTenantSlug));
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [previewProgress, setPreviewProgress] = useState<number>(65);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Muat ulang config ketika modal dibuka
  useEffect(() => {
    if (isOpen) {
      setConfig(loadSplashScreenConfig(activeTenantSlug));
      setSavedSuccess(false);
      setImageUrlInput('');
    }
  }, [isOpen, activeTenantSlug]);

  if (!isOpen) return null;

  // Handle upload file gambar
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (PNG, JPG, SVG, atau WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setConfig((prev) => ({
          ...prev,
          logoUrl: result,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle URL gambar manual
  const handleApplyUrl = () => {
    if (!imageUrlInput.trim()) return;
    setConfig((prev) => ({
      ...prev,
      logoUrl: imageUrlInput.trim(),
    }));
    setImageUrlInput('');
  };

  // Simpan perubahan
  const handleSave = () => {
    saveSplashScreenConfig(config, activeTenantSlug);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  // Reset ke bawaan
  const handleReset = () => {
    if (window.confirm('Kembalikan seluruh pengaturan splash screen ke desain awal LapakOke?')) {
      const def = resetSplashScreenConfig(activeTenantSlug);
      setConfig(def);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  // Uji coba langsung layar penuh
  const handleTestFullScreen = () => {
    saveSplashScreenConfig(config, activeTenantSlug);
    onClose();
    setTimeout(() => {
      triggerManualSplashScreen();
    }, 150);
  };

  const activeThemeObj = SPLASH_THEME_OPTIONS.find((t) => t.id === config.theme) || SPLASH_THEME_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-orange-50/50 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Modul Editor Splash Screen
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                  LapakOke.com
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ubah gambar, logo, teks pembuka, durasi animasi, dan tema layar loading awal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestFullScreen}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors"
              title="Simulasikan splash screen secara penuh"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Uji Layar Penuh</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Settings Form, Right Live Mobile Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri: Form Pengaturan (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Penggantian Gambar / Logo */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    1. Gambar / Logo Splash Screen
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Format: PNG, JPG, WebP, SVG
                </span>
              </div>

              {/* Logo Aktif Saat Ini */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-tr from-blue-900 to-slate-900 p-2 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-inner shrink-0">
                  <img
                    src={config.logoUrl || '/lapakoke-logo-3d.svg'}
                    alt="Logo Splash"
                    className="w-full h-full object-contain filter drop-shadow-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/lapakoke-logo-3d.svg';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Logo Aktif Saat Ini
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {config.logoUrl.startsWith('data:')
                      ? 'Gambar Kustom (File Lokal Base64)'
                      : config.logoUrl}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Gambar Baru</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Opsi URL Gambar Manual */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Link className="w-3 h-3 text-slate-400" />
                  <span>Atau Tempel Tautan URL Gambar:</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Contoh: https://domain.com/logo-anda.png"
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                  >
                    Terapkan
                  </button>
                </div>
              </div>

              {/* Preset Logo Bawaan */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Pilih dari Preset Logo Bawaan:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SPLASH_PRESET_LOGOS.map((preset) => {
                    const isSelected = config.logoUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, logoUrl: preset.url }))}
                        className={`flex flex-col items-center text-center p-2.5 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-200 ring-2 ring-orange-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 flex items-center justify-center mb-1.5">
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="font-semibold text-[11px] truncate w-full">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {storeLogoUrl && storeLogoUrl !== config.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, logoUrl: storeLogoUrl }))}
                    className="w-full mt-1.5 py-1.5 px-3 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gunakan Logo Cabang Toko Aktif ({currentStoreName})</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. Teks & Identitas Splash */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  2. Teks & Identitas Branding
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Nama Judul Aplikasi:
                  </label>
                  <input
                    type="text"
                    value={config.appName}
                    onChange={(e) => setConfig((prev) => ({ ...prev, appName: e.target.value }))}
                    placeholder="Contoh: LapakOke.com"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Slogan / Tagline Pembuka:
                  </label>
                  <input
                    type="text"
                    value={config.tagline}
                    onChange={(e) => setConfig((prev) => ({ ...prev, tagline: e.target.value }))}
                    placeholder="Contoh: Pusat Belanja Sembako Hemat, Cepat & Terpercaya"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Label Versi / Badge Bawah:
                  </label>
                  <input
                    type="text"
                    value={config.versionText}
                    onChange={(e) => setConfig((prev) => ({ ...prev, versionText: e.target.value }))}
                    placeholder="Contoh: v2.4.0 • PWA Super App"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Tema Warna & Durasi */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  3. Tema Tampilan & Durasi Animasi
                </h3>
              </div>

              {/* Pilihan Tema */}
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-2">
                  Pilih Tema Latar Belakang:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SPLASH_THEME_OPTIONS.map((theme) => {
                    const isSelected = config.theme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, theme: theme.id as any }))}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg shrink-0 border border-white/20 shadow-sm ${theme.bgClass} flex items-center justify-center font-bold text-xs`}
                        >
                          LK
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{theme.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {theme.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slider Durasi Tampil */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Durasi Tampil Layar:
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                    {(config.durationMs / 1000).toFixed(1)} Detik
                  </span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="6000"
                  step="200"
                  value={config.durationMs}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, durationMs: Number(e.target.value) }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Cepat (1.0 dtk)</span>
                  <span>Standar (2.4 dtk)</span>
                  <span>Lama (6.0 dtk)</span>
                </div>
              </div>

              {/* Frekuensi / Trigger Mode */}
              <div className="pt-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-2">
                  Frekuensi Muncul Splash Screen:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      config.triggerMode === 'every_reload'
                        ? 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-500 text-orange-900 dark:text-orange-200'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="triggerMode"
                      checked={config.triggerMode === 'every_reload'}
                      onChange={() => setConfig((prev) => ({ ...prev, triggerMode: 'every_reload' }))}
                      className="mt-0.5 accent-orange-600"
                    />
                    <div>
                      <strong className="block font-semibold">Setiap Reload / Buka Index</strong>
                      <span className="text-[10px] opacity-75">
                        Muncul setiap kali halaman index dimuat ulang (Permintaan Pengguna)
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      config.triggerMode === 'session_once'
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 text-blue-900 dark:text-blue-200'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="triggerMode"
                      checked={config.triggerMode === 'session_once'}
                      onChange={() => setConfig((prev) => ({ ...prev, triggerMode: 'session_once' }))}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <strong className="block font-semibold">Hanya 1x per Sesi Tab</strong>
                      <span className="text-[10px] opacity-75">
                        Hanya muncul sekali saat pertama kali tab dibuka
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-2">
                <label className="flex items-center justify-between text-xs cursor-pointer py-1">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Tampilkan Progress Bar Animasi Loading
                  </span>
                  <input
                    type="checkbox"
                    checked={config.showProgressBar}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showProgressBar: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer py-1">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Tampilkan Badge Info Cabang / Subdomain
                  </span>
                  <input
                    type="checkbox"
                    checked={config.showSubdomainInfo}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showSubdomainInfo: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer py-1">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Tampilkan Tombol 'Lewati' (Skip)
                  </span>
                  <input
                    type="checkbox"
                    checked={config.showSkipButton}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showSkipButton: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer py-1">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Aktifkan Splash Screen
                  </span>
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 accent-orange-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Live Mobile Mockup Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="sticky top-0 w-full flex flex-col items-center">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pratinjau Langsung (Live Preview)
                </span>
              </div>

              {/* Smartphone Frame */}
              <div className="w-[280px] sm:w-[310px] h-[540px] sm:h-[580px] rounded-[36px] bg-slate-950 p-3 shadow-2xl border-4 border-slate-700 relative overflow-hidden flex flex-col">
                {/* Notch & Speaker */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-full z-20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-900 mr-2" />
                  <div className="w-8 h-1 rounded-full bg-slate-700" />
                </div>

                {/* Splash Screen Mockup Screen Canvas */}
                <div
                  className={`w-full h-full rounded-[28px] overflow-hidden flex flex-col justify-between items-center p-4 relative text-center select-none ${activeThemeObj.bgClass}`}
                >
                  {/* Subtle Background Glow inside Phone */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-orange-500/20 rounded-full blur-2xl" />
                  </div>

                  {/* Top Bar inside mockup */}
                  <div className="w-full flex items-center justify-between pt-3 relative z-10">
                    {config.showSubdomainInfo ? (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 truncate max-w-[130px] text-white">
                        📍 {currentStoreName}
                      </span>
                    ) : (
                      <div />
                    )}

                    {config.showSkipButton && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-white flex items-center gap-0.5">
                        Lewati <ChevronRight className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Center Content Mockup */}
                  <div className="flex flex-col items-center my-auto relative z-10 w-full px-2">
                    {/* Logo */}
                    <div className="relative mb-3">
                      <div className="w-24 h-24 rounded-full p-2 bg-gradient-to-b from-white/30 to-transparent backdrop-blur-md border border-white/30 shadow-lg flex items-center justify-center">
                        <img
                          src={config.logoUrl || '/lapakoke-logo-3d.svg'}
                          alt="Splash Logo"
                          className="w-full h-full object-contain filter drop-shadow"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/lapakoke-logo-3d.svg';
                          }}
                        />
                      </div>
                    </div>

                    {/* App Title */}
                    <h4 className="text-xl font-black tracking-tight text-white drop-shadow">
                      {config.appName}
                    </h4>

                    {/* Tagline */}
                    {config.tagline && (
                      <p className="mt-1 text-[10px] text-white/80 line-clamp-2 leading-tight">
                        {config.tagline}
                      </p>
                    )}

                    {/* Loading Progress Bar in Mockup */}
                    {config.showProgressBar && (
                      <div className="w-full max-w-[180px] mt-5">
                        <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden p-0.5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-orange-500"
                            style={{ width: `${previewProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[8px] text-white/70 mt-1">
                          <span>Memuat katalog...</span>
                          <span>{previewProgress}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer inside Mockup */}
                  <div className="relative z-10 text-[8px] text-white/60 pb-1">
                    <span>{config.versionText || 'v2.4.0 PWA'}</span>
                    <p className="text-[7px] text-white/40 mt-0.5">
                      © 2026 LapakOke.com
                    </p>
                  </div>
                </div>
              </div>

              {/* Tombol Simulasikan Animasi */}
              <button
                type="button"
                onClick={() => {
                  setPreviewProgress(0);
                  const int = setInterval(() => {
                    setPreviewProgress((p) => {
                      if (p >= 100) {
                        clearInterval(int);
                        return 100;
                      }
                      return p + 10;
                    });
                  }, 120);
                }}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulasikan Bar Animasi Mockup</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Bawaan LapakOke</span>
            </button>

            <button
              type="button"
              onClick={handleTestFullScreen}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-blue-200 dark:border-blue-800 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Uji Layar Penuh</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {savedSuccess && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Berhasil Disimpan!</span>
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 active:scale-95 shadow-md shadow-orange-500/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
