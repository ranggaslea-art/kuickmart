import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Send,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Users,
  ShieldCheck,
  History,
  Image as ImageIcon,
  Zap,
  Tag,
  Volume2
} from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeUserToPush,
  playNotificationChime,
  getCurrentPushSubscription
} from '../utils/pushNotification';
import { PushSubscriberInfo, PushBroadcastHistoryItem } from '../types';

interface PushNotificationManagerProps {
  canEdit: boolean;
}

export const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({ canEdit }) => {
  // State form broadcast
  const [title, setTitle] = useState('🎉 Flash Sale Kilat KuickMart Express!');
  const [body, setBody] = useState('Dapatkan diskon hingga 50% untuk aneka snack, buah segar, dan minuman dingin sore ini!');
  const [url, setUrl] = useState('/');
  const [image, setImage] = useState('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600');
  const [tag, setTag] = useState('flash-sale');

  // Stats & server state
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const [subscribersList, setSubscribersList] = useState<PushSubscriberInfo[]>([]);
  const [broadcastHistory, setBroadcastHistory] = useState<PushBroadcastHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Status browser lokal
  const isSupported = isPushNotificationSupported();
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission());
  const [isSubscribedLocally, setIsSubscribedLocally] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      // 1. Get subscriber count & list
      const subRes = await fetch('/api/push/subscribers');
      const subType = subRes.headers.get('content-type') || '';
      if (subRes.ok && subType.includes('application/json')) {
        const subData = await subRes.json().catch(() => ({}));
        setTotalSubscribers(subData.total || 0);
        setSubscribersList(subData.subscribers || []);
      }

      // 2. Get broadcast history
      const histRes = await fetch('/api/push/history');
      const histType = histRes.headers.get('content-type') || '';
      if (histRes.ok && histType.includes('application/json')) {
        const histData = await histRes.json().catch(() => ({}));
        setBroadcastHistory(histData.history || []);
      }

      // 3. Check local device subscription
      const existingSub = await getCurrentPushSubscription();
      setIsSubscribedLocally(Boolean(existingSub));
      setPermission(getNotificationPermission());
    } catch (err) {
      console.error('Error fetching push status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSubscribeLocalDevice = async () => {
    try {
      const result = await subscribeUserToPush('Admin KuickMart (Device Uji Coba)');
      if (result.success) {
        setIsSubscribedLocally(true);
        setPermission('granted');
        setFeedback({
          type: 'success',
          message: 'Perangkat ini berhasil terdaftar untuk menerima siaran push notifikasi!',
        });
        fetchStatus();
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Gagal mengaktifkan notifikasi pada perangkat ini.',
        });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    }
  };

  const handleSendTestToSelf = async () => {
    if (!isSubscribedLocally) {
      setFeedback({
        type: 'error',
        message: 'Perangkat Anda belum terdaftar. Silakan klik tombol "Daftarkan Perangkat Ini" terlebih dahulu.',
      });
      return;
    }

    setIsTesting(true);
    setFeedback(null);
    try {
      const sub = await getCurrentPushSubscription();
      if (!sub) throw new Error('Langganan push lokal tidak ditemukan');

      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          title: `[Uji Coba] ${title}`,
          body,
        }),
      });

      const resType = res.headers.get('content-type') || '';
      if (resType.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Gagal mengirim uji coba');
      }

      playNotificationChime();
      setFeedback({
        type: 'success',
        message: 'Uji coba notifikasi berhasil dikirim! Periksa layar notifikasi HP/laptop Anda.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal mengirim uji coba' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleBroadcastPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setFeedback({
        type: 'error',
        message: 'Anda tidak memiliki izin untuk mengirim siaran pesan promosi.',
      });
      return;
    }

    if (!title.trim() || !body.trim()) {
      setFeedback({
        type: 'error',
        message: 'Judul dan isi pesan promosi wajib diisi!',
      });
      return;
    }

    const confirmSend = window.confirm(
      `Kirim notifikasi promosi ini ke seluruh ${totalSubscribers} pelanggan terdaftar sekarang?`
    );
    if (!confirmSend) return;

    setIsSending(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          url,
          image,
          tag,
        }),
      });

      const resType = res.headers.get('content-type') || '';
      let successMsg = `Notifikasi promosi berhasil disiarkan ke pelanggan!`;
      if (resType.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Gagal mengirim siaran promosi');
        if (data.message) successMsg = data.message;
      }

      playNotificationChime();
      setFeedback({
        type: 'success',
        message: successMsg,
      });

      fetchStatus();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Terjadi kendala saat menyiarkan notifikasi promosi.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const applyTemplate = (tpl: { title: string; body: string; tag: string; image: string }) => {
    setTitle(tpl.title);
    setBody(tpl.body);
    setTag(tpl.tag);
    setImage(tpl.image);
    setFeedback({
      type: 'success',
      message: `Template "${tpl.title.slice(0, 30)}..." berhasil dimuat ke formulir siaran.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-2xs transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-950 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-700 text-xs px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-bold tracking-wide">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Web Push PWA • VAPID Tanpa Biaya API Key</span>
            </div>
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span>Siaran Notifikasi Promosi Pelanggan</span>
            </h3>
            <p className="text-xs text-blue-100 leading-relaxed">
              Kirim pengumuman diskon, flash sale, dan voucher belanja langsung ke layar HP pelanggan yang telah menginstal atau mengizinkan notifikasi PWA KuickMart.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={fetchStatus}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all border border-white/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan Status</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Subscribers */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Pelanggan Terdaftar</div>
            <div className="text-lg font-black text-stone-900">{totalSubscribers} Perangkat HP</div>
            <div className="text-[10px] text-emerald-600 font-semibold">Siap menerima siaran</div>
          </div>
        </div>

        {/* Card 2: Push Engine Protocol */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Protokol Server</div>
            <div className="text-sm font-black text-stone-900">VAPID Web Push</div>
            <div className="text-[10px] text-stone-500 font-medium">100% Gratis • Standar W3C</div>
          </div>
        </div>

        {/* Card 3: Local Device Status */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold flex-shrink-0 ${
            isSubscribedLocally ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
          }`}>
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Perangkat Ini</div>
            <div className="text-xs font-black text-stone-900 truncate">
              {isSubscribedLocally ? 'Aktif (Terdaftar)' : 'Belum Terdaftar'}
            </div>
            {!isSubscribedLocally && isSupported ? (
              <button
                type="button"
                onClick={handleSubscribeLocalDevice}
                className="text-[10px] text-blue-600 font-bold hover:underline"
              >
                + Daftarkan Sekarang
              </button>
            ) : (
              <span className="text-[10px] text-stone-400">Izin: {permission}</span>
            )}
          </div>
        </div>

        {/* Card 4: Broadcasts Sent */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Riwayat Siaran</div>
            <div className="text-lg font-black text-stone-900">{broadcastHistory.length} Promo</div>
            <div className="text-[10px] text-stone-500">Tersimpan di log</div>
          </div>
        </div>
      </div>

      {/* Quick Promo Templates */}
      <div className="bg-stone-50 border border-stone-200 rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-xs text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Pilih Template Promo Cepat (1-Klik Terapkan)</span>
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            {
              title: '⚡ Flash Sale Kilat Spesial Sore Ini!',
              body: 'Diskon kilat hingga 50% untuk aneka minuman dingin & cemilan segar. Stok terbatas!',
              tag: 'flash-sale',
              image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600',
              label: '⚡ Flash Sale 50%',
              desc: 'Cocok untuk jam sore/malam',
            },
            {
              title: '🚚 Bebas Ongkir Kilat Akhir Pekan!',
              body: 'Belanja kebutuhan dapur & rumah tangga sekarang, bebas ongkir kilat langsung sampai!',
              tag: 'free-shipping',
              image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=600',
              label: '🚚 Bebas Ongkir',
              desc: 'Promo belanja akhir pekan',
            },
            {
              title: '🍉 Pasokan Buah & Sayur Segar Baru Datang!',
              body: 'Semangka merah manis, apel fuji, dan sayuran hidroponik segar siap diantar.',
              tag: 'fresh-produce',
              image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=600',
              label: '🍉 Buah & Sayur Segar',
              desc: 'Cocok untuk pagi hari',
            },
            {
              title: '🎁 Voucher Gajian Hemat Potongan Rp 20.000',
              body: 'Gunakan kode voucher HEMAT20 untuk belanja aneka kebutuhan pokok hari ini!',
              tag: 'voucher-promo',
              image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=600',
              label: '🎁 Voucher Gajian Rp 20k',
              desc: 'Kupon diskon langsung',
            },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyTemplate(item)}
              className="text-left p-3 rounded-2xl bg-white border border-stone-200 hover:border-blue-400 hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="font-bold text-xs text-stone-900 group-hover:text-blue-700 transition-colors">
                  {item.label}
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">{item.desc}</div>
              </div>
              <span className="text-[10px] font-bold text-blue-600 mt-2 flex items-center gap-1">
                Gunakan Template →
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Form Composer & Phone Simulation Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Composer (8 cols) */}
        <form
          onSubmit={handleBroadcastPromo}
          className="lg:col-span-7 bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs"
        >
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" />
              <span>Komposer Pesan Notifikasi Promosi</span>
            </h4>
            <span className="text-[11px] font-semibold text-stone-400">
              Penerima: <strong className="text-stone-800">{totalSubscribers} Perangkat</strong>
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Judul Notifikasi Promosi:</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: 🎉 Flash Sale Diskon 50% Sore Ini!"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs font-semibold text-stone-900"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Disarankan maksimal 45 karakter agar pas di layar notifikasi ponsel.
              </span>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Isi Pesan Promosi:</label>
              <textarea
                required
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tuliskan detail promosi, diskon hemat, atau penawaran menarik..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs font-normal text-stone-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Tautan / URL Tujuan:</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Contoh: / atau https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-blue-600 text-xs text-stone-900"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">
                  Halaman yang terbuka saat pelanggan mengklik notifikasi.
                </span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Tag Kategori Promo:</label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="Contoh: flash-sale / promo-weekend"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-blue-600 text-xs text-stone-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">URL Gambar Banner (Opsional):</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 focus:outline-none focus:border-blue-600 text-xs text-stone-900 font-mono"
                />
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage('')}
                    className="px-2.5 py-1 text-stone-500 hover:text-stone-800 text-[11px] font-bold border border-stone-200 rounded-xl"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendTestToSelf}
                disabled={isTesting}
                className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                title="Kirim notifikasi hanya ke perangkat Anda untuk melihat hasilnya"
              >
                <Smartphone className="w-3.5 h-3.5 text-stone-600" />
                <span>{isTesting ? 'Mengirim...' : 'Uji Coba di HP Saya'}</span>
              </button>

              <button
                type="button"
                onClick={playNotificationChime}
                className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs transition-all"
                title="Dengarkan nada notifikasi"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="submit"
              disabled={isSending || !canEdit}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-sm flex items-center gap-2 transition-all ${
                isSending || !canEdit
                  ? 'bg-stone-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              }`}
            >
              <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-pulse' : ''}`} />
              <span>{isSending ? 'Menyiarkan ke Pelanggan...' : `Kirim Siaran ke ${totalSubscribers} Pelanggan`}</span>
            </button>
          </div>
        </form>

        {/* Live Phone Preview Simulation (5 cols) */}
        <div className="lg:col-span-5 bg-stone-900 rounded-3xl p-5 text-white shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                Simulasi Layar Notifikasi HP
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-800 text-stone-400">
              Android / iOS PWA
            </span>
          </div>

          {/* Smartphone Mockup */}
          <div className="bg-stone-950 rounded-2xl p-4 border border-stone-800 space-y-3">
            {/* Status bar mock */}
            <div className="flex justify-between items-center text-[10px] text-stone-400 px-1">
              <span>09:41</span>
              <div className="flex items-center gap-1.5">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>

            {/* Notification Card */}
            <div className="bg-stone-900/90 border border-stone-700/80 rounded-2xl p-3.5 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 font-bold text-stone-200">
                  <div className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-[10px]">
                    K
                  </div>
                  <span>KuickMart Express</span>
                  <span className="text-[9px] text-stone-400 font-normal">• Baru saja</span>
                </div>
                <BellRing className="w-3.5 h-3.5 text-blue-400 animate-bounce" />
              </div>

              <div>
                <div className="text-xs font-bold text-white tracking-tight">
                  {title || 'Judul Notifikasi Promosi'}
                </div>
                <div className="text-[11px] text-stone-300 mt-1 leading-snug">
                  {body || 'Isi teks pesan promosi akan tampil di sini kepada pelanggan saat push notification masuk.'}
                </div>
              </div>

              {image && (
                <div className="rounded-xl overflow-hidden border border-stone-800 max-h-36">
                  <img
                    src={image}
                    alt="Banner Promo"
                    className="w-full h-32 object-cover"
                    onError={() => setImage('')}
                  />
                </div>
              )}

              {/* Action buttons mock */}
              <div className="pt-2 border-t border-stone-800 flex gap-2">
                <button
                  type="button"
                  className="flex-1 py-1.5 rounded-lg bg-blue-600/30 text-blue-300 text-[10px] font-bold border border-blue-500/30 text-center"
                >
                  🛍️ Buka Promo
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-400 text-[10px] font-semibold text-center"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-stone-400 leading-relaxed bg-stone-800/60 p-3 rounded-xl border border-stone-800">
            💡 <strong>Info:</strong> Notifikasi ini akan langsung muncul di bar atas HP pelanggan meskipun aplikasi sedang tidak dibuka di browser, selama izin notifikasi telah aktif.
          </div>
        </div>
      </div>

      {/* Subscribers Table & Broadcast History Tabs */}
      <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
          <div>
            <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span>Daftar Perangkat Pelanggan Terdaftar ({totalSubscribers})</span>
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              Token langganan web push terenkripsi yang siap menerima siaran promo
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
              <tr>
                <th className="py-3 px-4">Nama Pelanggan / ID</th>
                <th className="py-3 px-4">Tipe Perangkat</th>
                <th className="py-3 px-4">Cuplikan Token Push</th>
                <th className="py-3 px-4">Terdaftar Sejak</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {subscribersList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400">
                    Belum ada pelanggan yang terdaftar. Klik "Daftarkan Perangkat Ini" untuk menambahkan perangkat Anda.
                  </td>
                </tr>
              ) : (
                subscribersList.map((sub) => (
                  <tr key={sub.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{sub.customerName}</div>
                      <div className="text-[10px] text-stone-400 font-mono">{sub.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 font-semibold text-[11px]">
                        <Smartphone className="w-3 h-3 text-stone-500" />
                        <span>{sub.deviceType}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-stone-500">
                      {sub.endpointSnippet}
                    </td>
                    <td className="py-3 px-4 text-stone-600 text-[11px]">
                      {new Date(sub.subscribedAt).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Aktif</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Broadcast History */}
      {broadcastHistory.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-2xs">
          <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/50">
            <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              <span>Log Riwayat Siaran Promosi Terakhir</span>
            </h4>
          </div>

          <div className="divide-y divide-stone-100">
            {broadcastHistory.map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-stone-900">{item.title}</span>
                    {item.promoTag && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                        {item.promoTag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 line-clamp-1">{item.body}</p>
                  <div className="text-[10px] text-stone-400">
                    Dikirim: {new Date(item.sentAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right flex-shrink-0">
                  <div>
                    <div className="text-xs font-bold text-emerald-700">
                      {item.successCount} Berhasil
                    </div>
                    {item.failedCount > 0 && (
                      <div className="text-[10px] text-rose-600">
                        {item.failedCount} Gagal
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
