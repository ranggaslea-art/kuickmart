import React, { useState, useEffect, useRef } from 'react';
import {
  SplashScreenConfig,
  loadSplashScreenConfig,
  saveSplashScreenConfig,
  resetSplashScreenConfig,
  triggerManualSplashScreen,
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
  Check,
  CheckCircle2,
  Sliders,
  Palette,
  Eye,
  Smartphone,
  Clock,
  Link,
  ChevronRight,
} from 'lucide-react';

interface SplashScreenManagerProps {
  activeTenantSlug?: string;
  currentStoreName?: string;
  storeLogoUrl?: string;
  onOpenFullScreenTest?: () => void;
}

export const SplashScreenManager: React.FC<SplashScreenManagerProps> = ({
  activeTenantSlug = 'default',
  currentStoreName = 'LapakOke Pusat',
  storeLogoUrl,
  onOpenFullScreenTest,
}) => {
  const [config, setConfig] = useState<SplashScreenConfig>(() => loadSplashScreenConfig(activeTenantSlug));
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [previewProgress, setPreviewProgress] = useState<number>(65);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setConfig(loadSplashScreenConfig(activeTenantSlug));
  }, [activeTenantSlug]);

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

  const handleApplyUrl = () => {
    if (!imageUrlInput.trim()) return;
    setConfig((prev) => ({
      ...prev,
      logoUrl: imageUrlInput.trim(),
    }));
    setImageUrlInput('');
  };

  const handleSave = () => {
    saveSplashScreenConfig(config, activeTenantSlug);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  const handleReset = () => {
    if (window.confirm('Kembalikan seluruh pengaturan splash screen ke desain awal LapakOke?')) {
      const def = resetSplashScreenConfig(activeTenantSlug);
      setConfig(def);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const handleTriggerTest = () => {
    saveSplashScreenConfig(config, activeTenantSlug);
    if (onOpenFullScreenTest) {
      onOpenFullScreenTest();
    } else {
      triggerManualSplashScreen();
    }
  };

  const activeThemeObj = SPLASH_THEME_OPTIONS.find((t) => t.id === config.theme) || SPLASH_THEME_OPTIONS[0];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-slate-900 to-orange-950 text-white shadow-lg border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-orange-500 p-2.5 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Editor Splash Screen & Loading Awal
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/30 text-orange-300 border border-orange-400/40">
                Index Page
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Kustomisasi logo pembuka, gambar glossy 3D, teks branding, durasi animasi, dan tema warna saat website pertama kali dimuat.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleTriggerTest}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 active:scale-95 text-white backdrop-blur-md border border-white/20 transition-all shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current text-orange-400" />
            <span>Uji Coba Sekarang</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white shadow-md transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid: Settings on Left, Live Phone Mockup on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Form Konfigurasi (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Penggantian Gambar / Logo */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  1. Gambar / Logo Splash Screen
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                PNG, JPG, WebP, SVG
              </span>
            </div>

            {/* Logo Preview Card */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-900 via-slate-900 to-orange-950 p-2.5 flex items-center justify-center border border-white/10 shadow-md shrink-0">
                <img
                  src={config.logoUrl || '/lapakoke-logo-3d.svg'}
                  alt="Logo Splash"
                  className="w-full h-full object-contain filter drop-shadow-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/lapakoke-logo-3d.svg';
                  }}
                />
              </div>

              <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Logo Aktif Saat Ini
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {config.logoUrl.startsWith('data:')
                      ? 'Gambar Kustom (File Base64 Unggahan)'
                      : config.logoUrl}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah File Gambar</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, logoUrl: '/lapakoke-logo-3d.svg' }))}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Logo 3D Asli</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Input URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Link className="w-3 h-3 text-slate-400" />
                <span>Atau Masukkan Tautan URL Gambar:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="Contoh: https://domain.com/gambar-splash.png"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                >
                  Terapkan
                </button>
              </div>
            </div>

            {/* Preset Logos */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilih Preset Logo Cepat:
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
                          ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-200 ring-2 ring-orange-500/20'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 p-1 flex items-center justify-center mb-1.5">
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="font-bold text-[11px] truncate w-full">
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
                  className="w-full mt-1 py-1.5 px-3 rounded-xl border border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gunakan Logo Cabang Toko Aktif ({currentStoreName})</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Teks & Identitas Splash */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                2. Teks & Identitas Branding
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Judul Aplikasi:
                </label>
                <input
                  type="text"
                  value={config.appName}
                  onChange={(e) => setConfig((prev) => ({ ...prev, appName: e.target.value }))}
                  placeholder="Contoh: LapakOke.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Slogan / Tagline Pembuka:
                </label>
                <input
                  type="text"
                  value={config.tagline}
                  onChange={(e) => setConfig((prev) => ({ ...prev, tagline: e.target.value }))}
                  placeholder="Contoh: Pusat Belanja Sembako Hemat, Cepat & Terpercaya"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Label Versi / Badge Bawah:
                </label>
                <input
                  type="text"
                  value={config.versionText}
                  onChange={(e) => setConfig((prev) => ({ ...prev, versionText: e.target.value }))}
                  placeholder="Contoh: v2.4.0 • PWA Super App"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Tema Warna & Perilaku */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                3. Tema Tampilan & Durasi Animasi
              </h3>
            </div>

            {/* Tema Grid */}
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
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl shrink-0 border border-white/20 shadow-xs ${theme.bgClass} flex items-center justify-center font-bold text-xs`}
                    >
                      LK
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
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

            {/* Durasi Slider */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
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

            {/* Mode Pemunculan */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Frekuensi Pemunculan Splash Screen:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    config.triggerMode === 'every_reload'
                      ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-500 text-orange-900 dark:text-orange-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="triggerModeManager"
                    checked={config.triggerMode === 'every_reload'}
                    onChange={() => setConfig((prev) => ({ ...prev, triggerMode: 'every_reload' }))}
                    className="mt-0.5 accent-orange-600"
                  />
                  <div>
                    <strong className="block font-bold">Setiap Reload Halaman Index</strong>
                    <span className="text-[10px] opacity-75">
                      Selalu muncul saat pengunjung membuka awal halaman index
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    config.triggerMode === 'session_once'
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500 text-blue-900 dark:text-blue-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="triggerModeManager"
                    checked={config.triggerMode === 'session_once'}
                    onChange={() => setConfig((prev) => ({ ...prev, triggerMode: 'session_once' }))}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <strong className="block font-bold">1 Kali per Sesi Browser</strong>
                    <span className="text-[10px] opacity-75">
                      Hanya muncul satu kali selama tab browser aktif
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <label className="flex items-center justify-between text-xs cursor-pointer py-1">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Tampilkan Animasi Progress Bar Loading
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
                  Aktifkan Fitur Splash Screen
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

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Desain Bawaan</span>
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 active:scale-95 shadow-md shadow-orange-500/20 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Splash Screen</span>
              </button>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Live Mobile Mockup (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="sticky top-6 w-full flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Pratinjau Layar Langsung (Smartphone)
              </span>
            </div>

            {/* Phone Case */}
            <div className="w-[280px] sm:w-[310px] h-[540px] sm:h-[580px] rounded-[38px] bg-slate-950 p-3 shadow-2xl border-4 border-slate-700 relative overflow-hidden flex flex-col">
              {/* Speaker Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-full z-20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-900 mr-2" />
                <div className="w-8 h-1 rounded-full bg-slate-700" />
              </div>

              {/* Mockup Display */}
              <div
                className={`w-full h-full rounded-[28px] overflow-hidden flex flex-col justify-between items-center p-4 relative text-center select-none ${activeThemeObj.bgClass}`}
              >
                {/* Glow */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-orange-500/20 rounded-full blur-2xl" />
                </div>

                {/* Header in Mockup */}
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

                  <h4 className="text-xl font-black tracking-tight text-white drop-shadow">
                    {config.appName}
                  </h4>

                  {config.tagline && (
                    <p className="mt-1 text-[10px] text-white/80 line-clamp-2 leading-tight">
                      {config.tagline}
                    </p>
                  )}

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

                {/* Bottom in Mockup */}
                <div className="relative z-10 text-[8px] text-white/60 pb-1">
                  <span>{config.versionText || 'v2.4.0 PWA'}</span>
                  <p className="text-[7px] text-white/40 mt-0.5">
                    © 2026 LapakOke.com
                  </p>
                </div>
              </div>
            </div>

            {/* Simulator Button */}
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
                }, 100);
              }}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Simulasikan Bar Animasi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
