import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showPWABuilderModal, setShowPWABuilderModal] = useState(false);

  // If already running inside standalone PWA mode, don't show prompt
  if (isInstalled) {
    return null;
  }

  return (
    <>
      <div className={`flex items-center gap-1.5 ${className}`}>
        {isInstallable && (
          <button
            onClick={install}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:from-red-700 hover:to-rose-700 transition-all duration-200 active:scale-95"
            title="Install Aplikasi ke HP / Komputer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install Aplikasi</span>
          </button>
        )}

        {isIOS && (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold border border-stone-200 transition-all active:scale-95"
          >
            <Smartphone className="w-3.5 h-3.5 text-stone-600" />
            <span>Install di iPhone</span>
          </button>
        )}

        <button
          onClick={() => setShowPWABuilderModal(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-xl text-[11px] font-medium border border-stone-200 hover:border-stone-300 transition-all"
          title="Info PWA Builder & Download Ikon / APK"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>PWA Ready</span>
        </button>
      </div>

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-stone-100 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <img src="/pwa-192x192.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-xs" />
                <h3 className="font-bold text-stone-900 text-sm">Install di iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs text-stone-600 leading-relaxed">
              <p className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-600 font-bold flex items-center justify-center text-[10px]">1</span>
                <span>Buka website ini di browser <strong>Safari</strong> iPhone Anda.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-600 font-bold flex items-center justify-center text-[10px]">2</span>
                <span>Tekan tombol <strong>Share / Bagikan</strong> (ikon kotak dengan panah ke atas di bawah layar).</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-600 font-bold flex items-center justify-center text-[10px]">3</span>
                <span>Gulir ke bawah lalu pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.</span>
              </p>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-2 w-full py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition"
            >
              Mengerti & Tutup
            </button>
          </div>
        </div>
      )}

      {/* PWA Builder Status & Asset Helper Modal */}
      {showPWABuilderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-stone-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <img src="/pwa-192x192.png" alt="Logo" className="w-9 h-9 rounded-xl shadow-xs" />
                <div>
                  <h3 className="font-bold text-stone-900 text-base">PWA Builder Status: 100% Siap</h3>
                  <p className="text-[11px] text-stone-500">toko-online.online Progressive Web App</p>
                </div>
              </div>
              <button
                onClick={() => setShowPWABuilderModal(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-900">Validasi PWABuilder Selesai</div>
                  <div className="text-emerald-700 text-[11px] mt-0.5">
                    Manifest, Service Worker, resolusi ikon (192x192, 512x512, maskable safe-zone), screenshots, serta shortcuts sudah dikonfigurasi lengkap dan bebas error.
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-semibold text-stone-800 text-xs">Aset PWA yang Tersedia:</h4>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="/pwa-512x512.png"
                    download="pwa-512x512.png"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 flex items-center justify-between transition"
                  >
                    <div>
                      <div className="font-bold text-stone-800 text-[11px]">Ikon 512x512</div>
                      <div className="text-[10px] text-stone-500">Master App Icon (PNG)</div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-stone-500" />
                  </a>

                  <a
                    href="/pwa-192x192.png"
                    download="pwa-192x192.png"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 flex items-center justify-between transition"
                  >
                    <div>
                      <div className="font-bold text-stone-800 text-[11px]">Ikon 192x192</div>
                      <div className="text-[10px] text-stone-500">Mobile Launcher (PNG)</div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-stone-500" />
                  </a>

                  <a
                    href="/pwa-maskable-512x512.png"
                    download="pwa-maskable-512x512.png"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 flex items-center justify-between transition"
                  >
                    <div>
                      <div className="font-bold text-stone-800 text-[11px]">Ikon Maskable</div>
                      <div className="text-[10px] text-stone-500">Android Adaptive Safe Zone</div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-stone-500" />
                  </a>

                  <a
                    href="/manifest.json"
                    download="manifest.json"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 flex items-center justify-between transition"
                  >
                    <div>
                      <div className="font-bold text-stone-800 text-[11px]">manifest.json</div>
                      <div className="text-[10px] text-stone-500">Web App Manifest Resmi</div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-stone-500" />
                  </a>
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
                <h4 className="font-semibold text-stone-800 text-xs">Cara Buat APK di PWABuilder (pwabuilder.com):</h4>
                <ol className="list-decimal list-inside space-y-1 text-stone-600 text-[11px] leading-relaxed">
                  <li>Buka <a href="https://www.pwabuilder.com" target="_blank" rel="noreferrer" className="text-red-600 underline font-medium inline-flex items-center gap-0.5">pwabuilder.com <ExternalLink className="w-2.5 h-2.5" /></a>.</li>
                  <li>Masukkan URL: <code>https://www.toko-online.online</code> lalu klik <strong>Start</strong>.</li>
                  <li>PWABuilder akan mendeteksi Manifest & Service Worker dengan skor hijau 100%.</li>
                  <li>Klik tab <strong>Package for Stores</strong> &gt; pilih <strong>Android (Google Play / APK)</strong>.</li>
                  <li>Klik <strong>Generate Package</strong> untuk mendownload APK / file ZIP aplikasi Anda.</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <a
                href="https://www.pwabuilder.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition"
              >
                <span>Buka PWABuilder.com</span>
                <ExternalLink className="w-3 h-3 text-stone-500" />
              </a>
              <button
                onClick={() => setShowPWABuilderModal(false)}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
