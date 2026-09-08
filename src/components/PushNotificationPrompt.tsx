import React, { useState, useEffect } from 'react';
import { BellRing, CheckCircle2, Sparkles, X } from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeUserToPush,
  getCurrentPushSubscription
} from '../utils/pushNotification';

export const PushNotificationPrompt: React.FC = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (!isPushNotificationSupported()) {
        setIsSupported(false);
        return;
      }
      setIsSupported(true);

      const perm = getNotificationPermission();
      if (perm === 'denied') {
        setIsVisible(false);
        return;
      }

      const existingSub = await getCurrentPushSubscription();
      if (existingSub) {
        setIsSubscribed(true);
        setIsVisible(false);
      } else {
        // Cek apakah baru saja ditutup oleh pengguna
        const dismissed = sessionStorage.getItem('kuickmart_push_prompt_dismissed');
        if (!dismissed) {
          // Tampilkan sedikit jeda (2 detik) agar tidak mengagetkan pengunjung baru
          const timer = setTimeout(() => {
            setIsVisible(true);
          }, 2000);
          return () => clearTimeout(timer);
        }
      }
    };

    checkStatus();
  }, []);

  const handleEnablePush = async () => {
    setIsLoading(true);
    try {
      const result = await subscribeUserToPush('Pelanggan KuickMart Store');
      if (result.success) {
        setIsSubscribed(true);
        setIsVisible(false);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 4000);
      } else {
        alert(result.error || 'Izin notifikasi tidak diberikan');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengaktifkan notifikasi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem('kuickmart_push_prompt_dismissed', 'true');
    } catch (e) {}
  };

  if (!isSupported) return null;

  return (
    <>
      {/* Floating Prompt Bar (Discreet & Attractive) */}
      {isVisible && !isSubscribed && (
        <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-fade-in">
          <div className="bg-stone-900/95 backdrop-blur-md text-white p-4 rounded-3xl border border-stone-700 shadow-2xl flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm animate-pulse">
              <BellRing className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                <Sparkles className="w-3 h-3" />
                <span>INFO PROMO KILAT</span>
              </div>
              <h5 className="text-xs font-bold text-white mt-0.5">
                Nyalakan Notifikasi Promo KuickMart?
              </h5>
              <p className="text-[11px] text-stone-300 mt-1 leading-snug">
                Dapatkan info flash sale, diskon kilat, dan voucher gratis ongkir langsung di layar HP Anda.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={isLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-[11px] shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Mengaktifkan...' : 'Aktifkan Notifikasi'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-2.5 py-1.5 rounded-xl text-stone-400 hover:text-white font-medium text-[11px] transition-colors"
                >
                  Nanti Saja
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="text-stone-400 hover:text-white text-xs p-1"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-emerald-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>Notifikasi promo KuickMart berhasil aktif di perangkat Anda! 🎁</span>
          </div>
        </div>
      )}
    </>
  );
};
