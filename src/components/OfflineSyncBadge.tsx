import React, { useState, useEffect, useCallback } from 'react';
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
  ShieldCheck,
  Server,
  Zap,
  ExternalLink,
  Settings,
  Activity,
  Layers
} from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { getStoredSupabaseConfig, testSupabaseConnection } from '../lib/supabase';
import { setLastSyncTime } from '../lib/offlineSync';

export interface OfflineSyncBadgeProps {
  variant?: 'header' | 'pos' | 'admin';
  className?: string;
  isSupabaseConnected?: boolean;
  onOpenSupabaseModal?: () => void;
}

export const OfflineSyncBadge: React.FC<OfflineSyncBadgeProps> = ({
  variant = 'header',
  className = '',
  isSupabaseConnected: propIsSupabaseConnected,
  onOpenSupabaseModal,
}) => {
  const {
    isOnline,
    isSyncing,
    isManualOffline,
    setManualOffline,
    pendingCount,
    queue,
    lastSyncTime,
    triggerSyncNow,
    clearQueue,
    removeItem,
  } = useOfflineSync();

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Live Supabase Health State
  const supabaseConfig = getStoredSupabaseConfig();
  const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'offline' | 'unconfigured'>(() => {
    if (!isSupabaseConfigured) return 'unconfigured';
    if (propIsSupabaseConnected === true) return 'connected';
    if (propIsSupabaseConnected === false) return 'offline';
    return 'checking';
  });
  const [supabaseLatency, setSupabaseLatency] = useState<number | null>(null);
  const [supabaseMessage, setSupabaseMessage] = useState<string>('');
  const [isPingingSupabase, setIsPingingSupabase] = useState(false);

  // Function to ping and check live Supabase connection
  const checkSupabaseHealth = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSupabaseStatus('unconfigured');
      setSupabaseMessage('URL dan Anon Key Supabase belum dikonfigurasi.');
      return;
    }

    if (!isOnline && !isManualOffline) {
      setSupabaseStatus('offline');
      setSupabaseMessage('Perangkat sedang tidak terhubung ke internet.');
      return;
    }

    if (isManualOffline) {
      setSupabaseStatus('offline');
      setSupabaseMessage('Sistem berjalan dalam mode offline manual.');
      return;
    }

    setIsPingingSupabase(true);
    setSupabaseStatus('checking');

    try {
      const res = await testSupabaseConnection(supabaseConfig.url, supabaseConfig.anonKey);
      if (res.success) {
        setSupabaseStatus('connected');
        setSupabaseLatency(res.latencyMs || null);
        setSupabaseMessage(res.message || 'Terhubung dengan database Supabase');
      } else {
        setSupabaseStatus('offline');
        setSupabaseLatency(res.latencyMs || null);
        setSupabaseMessage(res.message || 'Gagal tersambung ke database Supabase');
      }
    } catch (err: any) {
      setSupabaseStatus('offline');
      setSupabaseMessage(err?.message || 'Koneksi ke Supabase terputus.');
    } finally {
      setIsPingingSupabase(false);
    }
  }, [isSupabaseConfigured, isOnline, isManualOffline, supabaseConfig.url, supabaseConfig.anonKey]);

  // Sync prop changes
  useEffect(() => {
    if (propIsSupabaseConnected !== undefined) {
      if (!isSupabaseConfigured) {
        setSupabaseStatus('unconfigured');
      } else if (propIsSupabaseConnected) {
        setSupabaseStatus('connected');
      } else {
        setSupabaseStatus('offline');
      }
    }
  }, [propIsSupabaseConnected, isSupabaseConfigured]);

  // Check connection on modal open or once on mount if configured
  useEffect(() => {
    if (isOpenModal) {
      checkSupabaseHealth();
    }
  }, [isOpenModal, checkSupabaseHealth]);

  // Periodic health check on mount
  useEffect(() => {
    if (isOnline && !isManualOffline && isSupabaseConfigured) {
      checkSupabaseHealth();
    }
  }, [isOnline, isManualOffline, isSupabaseConfigured]);

  const handleManualSync = async () => {
    setSyncFeedback('Sedang memproses sinkronisasi data ke Supabase...');

    if (queue.length === 0) {
      // If queue is empty, do a live verification with Supabase
      setIsPingingSupabase(true);
      const res = await testSupabaseConnection(supabaseConfig.url, supabaseConfig.anonKey);
      setIsPingingSupabase(false);

      if (res.success) {
        setSupabaseStatus('connected');
        setSupabaseLatency(res.latencyMs || null);
        setLastSyncTime(new Date().toISOString());
        setSyncFeedback(`Koneksi Supabase aktif & stabil (${res.latencyMs || 0} ms). Seluruh data transaksi lokal & cloud tersinkronisasi sempurna!`);
      } else {
        setSupabaseStatus('offline');
        setSupabaseMessage(res.message);
        setSyncFeedback(`Database Supabase offline: ${res.message}. Transaksi baru tetap aman dicatat di memori lokal.`);
      }
      setTimeout(() => setSyncFeedback(null), 5000);
      return;
    }

    const result = await triggerSyncNow();
    if (result.stoppedDueToOffline) {
      setSyncFeedback('Koneksi internet atau database masih belum stabil. Data tetap aman di antrean lokal.');
    } else if (result.succeeded > 0) {
      setSyncFeedback(`Berhasil menyinkronkan ${result.succeeded} data transaksi ke database Supabase!`);
      setSupabaseStatus('connected');
    } else if (result.failed > 0) {
      setSyncFeedback(`Beberapa item (${result.failed}) gagal dikirim. Silakan cek status koneksi database.`);
    } else {
      setSyncFeedback('Semua data sudah tersinkronisasi sempurna!');
      setSupabaseStatus('connected');
    }

    setTimeout(() => {
      setSyncFeedback(null);
    }, 4500);
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return 'Belum pernah';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
    } catch {
      return isoString;
    }
  };

  // Determine actual status for badge
  const isSupabaseOffline = isOnline && !isManualOffline && supabaseStatus === 'offline';

  // Extract clean domain preview
  const supabaseHost = supabaseConfig.url 
    ? supabaseConfig.url.replace(/^https?:\/\//i, '').split('/')[0]
    : 'Belum diisi';

  return (
    <>
      {/* TRIGGER BADGE */}
      <button
        id="offline-sync-status-badge"
        type="button"
        onClick={() => setIsOpenModal(true)}
        className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs border cursor-pointer ${
          isManualOffline
            ? 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100'
            : !isOnline
            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 animate-pulse'
            : isSyncing
            ? 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100'
            : pendingCount > 0
            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            : isSupabaseOffline
            ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            : variant === 'pos'
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900/90'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
        } ${className}`}
        title={
          isManualOffline
            ? 'Mode Offline Manual Kasir Aktif (Simulasi)'
            : !isOnline
            ? 'Koneksi Offline: Transaksi tersimpan lokal dan akan disinkronkan otomatis saat online'
            : isSyncing
            ? 'Sedang menyinkronkan data ke Supabase...'
            : pendingCount > 0
            ? `${pendingCount} data dalam antrean sinkronisasi`
            : isSupabaseOffline
            ? 'Koneksi Internet Online, tetapi Supabase Offline / Tidak Terjangkau'
            : 'Sistem Online & Database Cloud Terhubung'
        }
      >
        {isManualOffline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-purple-600" />
            <span className="font-medium whitespace-nowrap">
              Offline Manual {pendingCount > 0 ? `(${pendingCount})` : ''}
            </span>
          </>
        ) : !isOnline ? (
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
        ) : isSupabaseOffline ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span className="font-medium whitespace-nowrap">
              Supabase Offline
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
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsOpenModal(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/80">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  isManualOffline 
                    ? 'bg-purple-100 text-purple-700'
                    : !isOnline
                    ? 'bg-amber-100 text-amber-700'
                    : isSupabaseOffline
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {isManualOffline || !isOnline ? (
                    <WifiOff className="w-5 h-5" />
                  ) : isSupabaseOffline ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Wifi className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
                    <span>Status Koneksi & Sinkronisasi Cloud</span>
                    {supabaseLatency !== null && supabaseStatus === 'connected' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {supabaseLatency} ms
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Sistem toko-online.online Offline-First & Supabase Sync
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
                title="Tutup dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-stone-700">
              {/* Dynamic Status Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                isManualOffline
                  ? 'bg-purple-50 border-purple-200 text-purple-900'
                  : !isOnline
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : isSupabaseOffline
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : pendingCount > 0
                  ? 'bg-sky-50 border-sky-200 text-sky-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                {isManualOffline ? (
                  <WifiOff className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                ) : !isOnline ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : isSupabaseOffline ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                ) : pendingCount > 0 ? (
                  <Clock className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {isManualOffline
                      ? 'Mode Offline Kasir Aktif (Simulasi Manual)'
                      : !isOnline
                      ? 'Koneksi Internet Sedang Terputus (Mode Offline Otomatis)'
                      : isSupabaseOffline
                      ? 'Database Supabase Cloud Sedang Offline / Tidak Terjangkau'
                      : pendingCount > 0
                      ? `Ada ${pendingCount} Transaksi Menunggu Sinkronisasi`
                      : 'Semua Transaksi Telah Sinkron dengan Cloud Supabase'}
                  </div>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">
                    {isManualOffline
                      ? 'Sistem dipaksa beroperasi tanpa koneksi internet. Semua pemindaian barcode, cetak struk, dan transaksi kasir disimpan instan di memori lokal perangkat ini tanpa lag jaringan.'
                      : !isOnline
                      ? 'Kasir dan toko tetap dapat bertransaksi, memindai barcode, mencetak struk, dan memotong stok. Transaksi otomatis dicatat di memori lokal dan akan terkirim ke Supabase saat sinyal kembali.'
                      : isSupabaseOffline
                      ? `Perangkat Anda terhubung ke internet, namun database Supabase tidak merespons (${supabaseMessage || 'Koneksi ke server cloud terputus'}). Transaksi kasir tetap berjalan lancar secara lokal (Offline-First) dan otomatis diunggah saat database normal.`
                      : pendingCount > 0
                      ? 'Data tersimpan dengan aman di antrean lokal perangkat ini dan sedang/akan otomatis diunggah ke database Supabase secara bertahap.'
                      : 'Koneksi aktif dan database Supabase telah diverifikasi dengan respon stabil.'}
                  </p>
                </div>
              </div>

              {/* Status Grid (Koneksi Perangkat, Database Supabase, Mode Kasir) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Koneksi Perangkat */}
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500 font-medium">Koneksi Perangkat</span>
                    <Wifi className="w-3.5 h-3.5 text-stone-400" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="font-bold text-stone-900 text-xs sm:text-sm">
                      {isOnline ? 'Online (Terhubung)' : 'Offline (Terputus)'}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400 block mt-1">
                    {isOnline ? 'Jaringan internet perangkat aktif' : 'Tidak ada akses internet'}
                  </span>
                </div>

                {/* 2. Database Supabase */}
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500 font-medium">Database Supabase</span>
                    <button
                      type="button"
                      onClick={checkSupabaseHealth}
                      disabled={isPingingSupabase}
                      className="p-1 rounded hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                      title="Periksa ulang koneksi ke Supabase"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isPingingSupabase ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Database className={`w-3.5 h-3.5 ${
                      supabaseStatus === 'connected'
                        ? 'text-emerald-600'
                        : supabaseStatus === 'offline'
                        ? 'text-rose-600'
                        : supabaseStatus === 'checking'
                        ? 'text-sky-600 animate-spin'
                        : 'text-stone-400'
                    }`} />
                    <span className={`font-bold text-xs sm:text-sm truncate ${
                      supabaseStatus === 'connected'
                        ? 'text-emerald-700'
                        : supabaseStatus === 'offline'
                        ? 'text-rose-700'
                        : 'text-stone-900'
                    }`}>
                      {supabaseStatus === 'connected'
                        ? `Online ${supabaseLatency ? `(${supabaseLatency}ms)` : ''}`
                        : supabaseStatus === 'offline'
                        ? 'Offline / Terputus'
                        : supabaseStatus === 'checking'
                        ? 'Memeriksa...'
                        : 'Belum Diisi'}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400 block mt-1 truncate" title={supabaseConfig.url || ''}>
                    {supabaseHost}
                  </span>
                </div>
              </div>

              {/* Mode Offline Kasir (Simulasi / Paksa Offline) */}
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-stone-600" />
                    <span className="font-bold text-xs sm:text-sm text-stone-900">
                      Mode Offline Mandiri (Offline-First)
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5 leading-normal">
                    {isManualOffline
                      ? 'Aktif: Transaksi kasir disimpan instan di memori lokal tanpa menunggu respon jaringan.'
                      : 'Nonaktif: Transaksi kasir otomatis langsung dikirim ke Cloud Supabase saat dibuat.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isManualOffline;
                    setManualOffline(next);
                    if (next) {
                      setSyncFeedback('Mode Offline Manual diaktifkan. Transaksi kasir disimpan di antrean lokal.');
                    } else {
                      setSyncFeedback('Mode Offline dinonaktifkan. Mengembalikan sistem ke sinkronisasi otomatis.');
                      setTimeout(() => checkSupabaseHealth(), 500);
                    }
                    setTimeout(() => setSyncFeedback(null), 4000);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                    isManualOffline
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {isManualOffline ? 'Nonaktifkan' : 'Paksa Offline'}
                </button>
              </div>

              {/* Last Sync Info */}
              <div className="flex items-center justify-between text-xs px-1 text-stone-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  Terakhir Berhasil Sinkron:
                </span>
                <span className="font-semibold text-stone-700">{formatTime(lastSyncTime)}</span>
              </div>

              {/* Feedback Alert */}
              {syncFeedback && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{syncFeedback}</span>
                </div>
              )}

              {/* Error Detail Alert if Supabase is offline */}
              {isSupabaseOffline && supabaseMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block">Pesan Status Supabase:</span>
                    <span className="text-[11px] text-rose-700 leading-relaxed block mt-0.5">{supabaseMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={checkSupabaseHealth}
                    disabled={isPingingSupabase}
                    className="px-2 py-1 bg-white border border-rose-300 text-rose-800 rounded text-[11px] font-bold hover:bg-rose-100 transition-colors shrink-0"
                  >
                    Tes Ulang
                  </button>
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
                      className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium cursor-pointer"
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
                          className="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
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
            <div className="p-4 border-t border-stone-100 bg-stone-50/80 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                {onOpenSupabaseModal ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpenModal(false);
                      onOpenSupabaseModal();
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Buka pengaturan Supabase (URL, Key & Schema)"
                  >
                    <Settings className="w-3.5 h-3.5 text-stone-500" />
                    <span>Pengaturan Supabase</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-stone-500">
                    {isManualOffline
                      ? 'Mode Offline aktif'
                      : isOnline
                      ? 'Otomatis sync saat online'
                      : 'Menunggu koneksi internet...'}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200/70 rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={isSyncing || (!isOnline && !isManualOffline)}
                  onClick={handleManualSync}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || isPingingSupabase ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncing
                      ? 'Menyinkronkan...'
                      : queue.length > 0
                      ? `Sinkronkan (${queue.length})`
                      : 'Cek & Sinkron Data'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
