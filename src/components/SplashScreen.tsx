import React, { useState, useEffect, useRef } from 'react';
import {
  SplashScreenConfig,
  loadSplashScreenConfig,
  SPLASH_CONFIG_UPDATED_EVENT,
  TRIGGER_SPLASH_SCREEN_EVENT,
  SPLASH_THEME_OPTIONS,
} from '../utils/splashScreenHelper';
import { Sparkles, X, ChevronRight, CheckCircle2, ShoppingBag } from 'lucide-react';

interface SplashScreenProps {
  activeTenantSlug?: string;
  currentStoreName?: string;
  onFinished?: () => void;
  forceShow?: boolean;
}

const SESSION_SPLASH_KEY = 'lapakoke_splash_shown_in_session';

const LOADING_STATUS_STEPS = [
  'Memuat katalog produk & sembako...',
  'Menyiapkan promo & diskon hari ini...',
  'Menghubungkan sistem kasir & pembayaran DOKU...',
  'Memeriksa status subdomain cabang...',
  'Selamat Datang di LapakOke!',
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  activeTenantSlug = 'default',
  currentStoreName = 'LapakOke Pusat',
  onFinished,
  forceShow = false,
}) => {
  const [config, setConfig] = useState<SplashScreenConfig>(() => loadSplashScreenConfig(activeTenantSlug));
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (forceShow) return true;
    if (typeof window === 'undefined') return false;

    // Cek apakah diizinkan aktif
    const cfg = loadSplashScreenConfig(activeTenantSlug);
    if (!cfg.enabled) return false;

    // Jika mode 'session_once', periksa apakah sudah pernah tampil di tab ini
    if (cfg.triggerMode === 'session_once') {
      const alreadyShown = sessionStorage.getItem(SESSION_SPLASH_KEY);
      if (alreadyShown) return false;
    }

    return true;
  });

  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusTextIndex, setStatusTextIndex] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Perbarui config jika ada event penyimpanan dari editor
  useEffect(() => {
    const handleConfigUpdate = (e: any) => {
      if (e.detail) {
        setConfig(e.detail);
      } else {
        setConfig(loadSplashScreenConfig(activeTenantSlug));
      }
    };

    const handleManualTrigger = () => {
      setIsFadingOut(false);
      setProgress(0);
      setStatusTextIndex(0);
      setIsVisible(true);
    };

    window.addEventListener(SPLASH_CONFIG_UPDATED_EVENT, handleConfigUpdate);
    window.addEventListener(TRIGGER_SPLASH_SCREEN_EVENT, handleManualTrigger);

    return () => {
      window.removeEventListener(SPLASH_CONFIG_UPDATED_EVENT, handleConfigUpdate);
      window.removeEventListener(TRIGGER_SPLASH_SCREEN_EVENT, handleManualTrigger);
    };
  }, [activeTenantSlug]);

  // Efek jika forceShow berubah
  useEffect(() => {
    if (forceShow) {
      setIsFadingOut(false);
      setProgress(0);
      setStatusTextIndex(0);
      setIsVisible(true);
    }
  }, [forceShow]);

  // Animasi Progress Bar & Siklus Hidup Splash
  useEffect(() => {
    if (!isVisible) return;

    if (config.triggerMode === 'session_once') {
      try {
        sessionStorage.setItem(SESSION_SPLASH_KEY, 'true');
      } catch {}
    }

    const duration = Math.max(1000, Math.min(8000, config.durationMs || 2400));
    const stepInterval = 40; // ms
    const totalSteps = duration / stepInterval;
    const increment = 100 / totalSteps;

    let currentProgress = 0;

    intervalRef.current = setInterval(() => {
      currentProgress += increment;

      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        if (intervalRef.current) clearInterval(intervalRef.current);

        // Mulai transisi fade out
        setIsFadingOut(true);
        timerRef.current = setTimeout(() => {
          setIsVisible(false);
          setIsFadingOut(false);
          if (onFinished) onFinished();
        }, 500);
      } else {
        setProgress(Math.floor(currentProgress));
        // Perbarui teks status
        const step = Math.min(
          LOADING_STATUS_STEPS.length - 1,
          Math.floor((currentProgress / 100) * LOADING_STATUS_STEPS.length)
        );
        setStatusTextIndex(step);
      }
    }, stepInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isVisible, config.durationMs, config.triggerMode, onFinished]);

  const handleSkip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsFadingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsFadingOut(false);
      if (onFinished) onFinished();
    }, 250);
  };

  if (!isVisible) return null;

  // Tentukan styling tema
  const activeTheme = SPLASH_THEME_OPTIONS.find((t) => t.id === config.theme) || SPLASH_THEME_OPTIONS[0];

  return (
    <div
      aria-label="LapakOke Loading Splash Screen"
      className={`fixed inset-0 z-[99999] flex flex-col justify-between items-center select-none transition-all duration-500 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      } ${activeTheme.bgClass}`}
      style={{
        touchAction: 'none',
      }}
    >
      {/* Background Ambient Glow & Radial Rings */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-r from-blue-500/20 via-orange-500/20 to-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-400/15 rounded-full blur-2xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header Bar: Subdomain info & Skip Button */}
      <div className="relative z-10 w-full max-w-2xl px-6 pt-6 flex items-center justify-between">
        {config.showSubdomainInfo ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-medium tracking-wide shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="opacity-80">Cabang:</span>
            <strong className="text-white font-semibold truncate max-w-[180px] sm:max-w-[280px]">
              {currentStoreName}
            </strong>
          </div>
        ) : (
          <div />
        )}

        {config.showSkipButton && (
          <button
            onClick={handleSkip}
            className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-semibold tracking-wide backdrop-blur-md border border-white/20 transition-all text-white shadow-sm"
          >
            <span>Lewati</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Main Center Stage: 3D Glossy Logo & Typographic Branding */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 my-auto max-w-md w-full">
        {/* Logo Container with 3D Pop & Hover Float Animation */}
        <div className="relative mb-6">
          {/* Animated Glow Aura */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/40 via-orange-500/40 to-amber-400/30 rounded-full blur-xl animate-pulse opacity-80" />

          {/* Logo Frame */}
          <div
            className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-full p-2.5 bg-gradient-to-b from-white/30 via-white/10 to-transparent backdrop-blur-xl border border-white/30 shadow-2xl flex items-center justify-center transform transition-transform duration-700 ${
              config.pulseAnimation ? 'hover:scale-105 active:scale-95' : ''
            }`}
          >
            <img
              src={config.logoUrl || '/lapakoke-logo-3d.svg'}
              alt={config.appName || 'LapakOke.com'}
              className="w-full h-full object-contain filter drop-shadow-xl"
              onError={(e) => {
                // Fallback jika url eksternal gagal dimuat
                (e.target as HTMLImageElement).src = '/lapakoke-logo-3d.svg';
              }}
            />
          </div>
        </div>

        {/* Brand App Name */}
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-md">
            {config.appName === 'LapakOke.com' ? (
              <span className="inline-flex items-center">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-white">
                  Lapak
                </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-200">
                  Oke
                </span>
                <span className="text-sm sm:text-base font-bold ml-1 px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-sm border border-white/20">
                  .com
                </span>
              </span>
            ) : (
              <span className="text-white drop-shadow-lg">{config.appName}</span>
            )}
          </h1>
        </div>

        {/* Tagline / Subtitle */}
        {config.tagline && (
          <p className="mt-3 text-xs sm:text-sm font-medium text-white/80 max-w-xs sm:max-w-sm line-clamp-2 leading-relaxed">
            {config.tagline}
          </p>
        )}

        {/* Loading Progress Bar Container */}
        {config.showProgressBar && (
          <div className="w-full max-w-xs mt-8 flex flex-col items-center">
            {/* Progress Bar Track */}
            <div className="w-full h-2.5 bg-white/20 backdrop-blur-md rounded-full overflow-hidden p-0.5 border border-white/25 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-amber-400 to-orange-500 transition-all duration-100 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                {/* Shimmer light sweep */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
              </div>
            </div>

            {/* Progress Percentage & Status Message */}
            <div className="w-full flex items-center justify-between mt-2.5 text-[11px] text-white/85 font-mono">
              <span className="truncate max-w-[220px] font-sans font-medium text-white/90 animate-pulse">
                {LOADING_STATUS_STEPS[statusTextIndex] || 'Memuat...'}
              </span>
              <span className="font-bold">{progress}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info: Version & Trust Badge */}
      <div className="relative z-10 w-full max-w-md px-6 pb-6 flex flex-col items-center text-center gap-1.5 text-xs text-white/60">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-mono font-medium text-white/80 border border-white/10">
            {config.versionText || 'v2.4.0 PWA'}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-emerald-300 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sistem Aktif & Siap Belanja
          </span>
        </div>
        <p className="text-[10px] text-white/50">
          © 2026 LapakOke.com • Belanja Sembako Hemat Langsung Diantar
        </p>
      </div>
    </div>
  );
};
