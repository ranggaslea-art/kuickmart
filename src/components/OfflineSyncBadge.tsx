import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  X,
  ArrowRight,
  ShieldCheck,
  Server
} from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { getStoredSupabaseConfig } from '../lib/supabase';

interface OfflineSyncBadgeProps {
  variant?: 'header' | 'pos' | 'admin';
  className?: string;
}

export const OfflineSyncBadge: React.FC<OfflineSyncBadgeProps> = ({
  variant = 'header',
  className = '',
}) => {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    queue,
    lastSyncTime,
    triggerSyncNow,
    clearQueue,
    removeItem,
  } = useOfflineSync();

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const supabaseConfig = getStoredSupabaseConfig();
  const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

  const handleManualSync = async () => {
    setSyncFeedback('Sedang memproses sinkronisasi data ke Supabase...');
    const result = await triggerSyncNow();
    if (result.stoppedDueToOffline) {
      setSyncFeedback('Koneksi internet masih belum stabil atau terputus. Data tetap aman di antrean lokal.');
    } else if (result.succeeded > 0) {
      setSyncFeedback(`Berhasil menyinkronkan ${result.succeeded} data transaksi ke database Supabase!`);
    } else if (result.failed > 0) {
      setSyncFeedback(`Beberapa item (${result.failed}) gagal dikirim. Silakan cek status koneksi database.`);
    } else {
      setSyncFeedback('Semua data sudah tersinkronisasi sempurna!');
    }
    setTimeout(() => {
      setSyncFeedback(null);
    }, 4500);
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return 'Belum pernah';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <>
      {/* TRIGGER BADGE */}
      <button
        id="offline-sync-status-badge"
        type="button"
        onClick={() => setIsOpenModal(true)}
        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs border ${
          !isOnline
            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 animate-pulse'
            : isSyncing
            ? 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100'
            : pendingCount > 0
            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            : variant === 'pos'
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900/90'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
        } ${className}`}
        title={
          !isOnline
            ? 'Koneksi Offline: Transaksi tersimpan lokal dan akan disinkronkan otomatis saat online'
            : isSyncing
            ? 'Sedang menyinkronkan data ke Supabase...'
            : pendingCount > 0
            ? `${pendingCount} data dalam antrean sinkronisasi`
            : 'Sistem Online & Database Cloud Terhubung'
        }
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
            <span className="font-medium whitespace-nowrap">
              Offline {pendingCount > 0 ? `(${pendingCount} Tertunda)` : ''}
            </span>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />
            <span className="font-medium whitespace-nowrap">Sinkronisasi...</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <Cloud className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-medium whitespace-nowrap">
              Sync ({pendingCount})
            </span>
          </>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium whitespace-nowrap">
              Cloud Online
            </span>
          </>
        )}
      </button>

      {/* DETAILED SYNC MODAL */}
      {isOpenModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/80">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                    Status Koneksi & Sinkronisasi Cloud
                  </h3>
                  <p className="text-xs text-stone-500">
                    Sistem KuickMart Offline-First & Supabase Sync
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-stone-700">
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                !isOnline
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : pendingCount > 0
                  ? 'bg-sky-50 border-sky-200 text-sky-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                {!isOnline ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : pendingCount > 0 ? (
                  <Clock className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {!isOnline
                      ? 'Koneksi Internet Sedang Terputus (Mode Offline Aktif)'
                      : pendingCount > 0
                      ? `Ada ${pendingCount} Transaksi Menunggu Sinkronisasi`
                      : 'Semua Transaksi Telah Sinkron dengan Cloud Supabase'}
                  </div>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">
                    {!isOnline
                      ? 'Kasir dan toko tetap dapat bertransaksi, memindai barcode, mencetak struk, dan memotong stok. Transaksi otomatis dicatat di memori lokal dan akan terkirim ke Supabase saat sinyal kembali.'
                      : pendingCount > 0
                      ? 'Data tersimpan dengan aman di antrean lokal perangkat ini dan sedang/akan otomatis diunggah ke database Supabase secara bertahap.'
                      : 'Koneksi aktif dan database Supabase telah diperbarui dengan data terbaru.'}
                  </p>
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <span className="text-xs text-stone-500 font-medium block">Koneksi Perangkat</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="font-semibold text-stone-900 text-xs sm:text-sm">
                      {isOnline ? 'Online (Terhubung)' : 'Offline (Terputus)'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <span className="text-xs text-stone-500 font-medium block">Database Supabase</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Database className={`w-3.5 h-3.5 ${isSupabaseConfigured ? 'text-indigo-600' : 'text-stone-400'}`} />
                    <span className="font-semibold text-stone-900 text-xs sm:text-sm truncate">
                      {isSupabaseConfigured ? 'Terkonfigurasi' : 'Belum Diisi'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Last Sync Info */}
              <div className="flex items-center justify-between text-xs px-1 text-stone-500">
                <span>Terakhir Berhasil Sinkron:</span>
                <span className="font-semibold text-stone-700">{formatTime(lastSyncTime)}</span>
              </div>

              {/* Feedback Alert */}
              {syncFeedback && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{syncFeedback}</span>
                </div>
              )}

              {/* Pending Queue Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-stone-500">
                    Antrean Tertunda ({queue.length})
                  </h4>
                  {queue.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Apakah Anda yakin ingin mengosongkan antrean sinkronisasi lokal?')) {
                          clearQueue();
                        }
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium"
                    >
                      <Trash2 className="w-3 h-3" /> Bersihkan
                    </button>
                  )}
                </div>

                {queue.length === 0 ? (
                  <div className="py-6 px-4 text-center bg-stone-50 border border-dashed border-stone-200 rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                    <p className="text-xs font-semibold text-stone-700">Antrean Bersih</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Tidak ada transaksi atau data kasir yang tertunda.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-2 border border-stone-200 rounded-xl p-2 bg-stone-50/50">
                    {queue.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-white border border-stone-200 rounded-lg shadow-2xs flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-stone-900 truncate">
                              {item.title}
                            </span>
                            {item.retryCount > 0 && (
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded font-medium">
                                Retry {item.retryCount}x
                              </span>
                            )}
                          </div>
                          {item.detail && (
                            <p className="text-[11px] text-stone-500 truncate mt-0.5">{item.detail}</p>
                          )}
                          <span className="text-[10px] text-stone-400 block mt-1">
                            Waktu: {formatTime(item.createdAt)}
                          </span>
                          {item.lastError && (
                            <span className="text-[10px] text-rose-600 block truncate mt-0.5">
                              Error: {item.lastError}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors"
                          title="Hapus dari antrean"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-100 bg-stone-50/80 flex items-center justify-between gap-3">
              <div className="text-[11px] text-stone-500">
                {isOnline ? 'Otomatis sync saat online' : 'Menunggu koneksi internet...'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200/70 rounded-xl transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={isSyncing || !isOnline || queue.length === 0}
                  onClick={handleManualSync}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
