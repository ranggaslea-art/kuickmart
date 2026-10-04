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
  Settings,
  Activity,
  Layers
} from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { fetchMySqlStatus, MySqlStatusResponse } from '../lib/mysqlClientApi';
import { setLastSyncTime } from '../lib/offlineSync';

export interface OfflineSyncBadgeProps {
  variant?: 'header' | 'pos' | 'admin';
  className?: string;
  isDatabaseConnected?: boolean;
  onOpenDatabaseManager?: () => void;
}

export const OfflineSyncBadge: React.FC<OfflineSyncBadgeProps> = ({
  variant = 'header',
  className = '',
  isDatabaseConnected: propIsDatabaseConnected,
  onOpenDatabaseManager,
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

  // Live MySQL Health State
  const [mysqlStatus, setMysqlStatus] = useState<MySqlStatusResponse | null>(null);
  const [isPingingMysql, setIsPingingMysql] = useState(false);

  // Function to ping and check live MySQL connection
  const checkDatabaseHealth = useCallback(async () => {
    setIsPingingMysql(true);
    try {
      const res = await fetchMySqlStatus();
      setMysqlStatus(res);
    } catch {
      setMysqlStatus({
        connected: false,
        message: 'Gagal menghubungi server database lokal / backend',
      });
    } finally {
      setIsPingingMysql(false);
    }
  }, []);

  // Check connection on modal open or once on mount
  useEffect(() => {
    checkDatabaseHealth();
  }, [checkDatabaseHealth]);

  useEffect(() => {
    if (isOpenModal) {
      checkDatabaseHealth();
    }
  }, [isOpenModal, checkDatabaseHealth]);

  const isDbConnected = propIsDatabaseConnected ?? (mysqlStatus?.connected ?? true);

  const handleManualSync = async () => {
    setSyncFeedback('Sedang memproses sinkronisasi data ke Database MySQL...');

    if (queue.length === 0) {
      await checkDatabaseHealth();
      setSyncFeedback('Semua data lokal telah sinkron dengan Database MySQL.');
      setTimeout(() => setSyncFeedback(null), 3000);
      return;
    }

    try {
      const result = await triggerSyncNow();
      if (result.failed === 0) {
        setSyncFeedback(`Sinkronisasi berhasil! ${result.succeeded} data tersinkron.`);
        setLastSyncTime(new Date().toISOString());
      } else {
        setSyncFeedback(`Sinkronisasi selesai sebagian: ${result.succeeded} berhasil, ${result.failed} gagal.`);
      }
    } catch (err: any) {
      setSyncFeedback(`Gagal sinkronisasi: ${err?.message || 'Kesalahan jaringan'}`);
    } finally {
      await checkDatabaseHealth();
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const formatTime = (ts: string | number | null | undefined) => {
    if (!ts) return 'Belum pernah';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return 'Belum pernah';
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <>
      {/* COMPACT BADGE TOGGLE BUTTON */}
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
            : !isDbConnected
            ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            : variant === 'pos'
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900/90'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
        } ${className}`}
        title={
          isManualOffline
            ? 'Mode Offline Manual Kasir Aktif'
            : !isOnline
            ? 'Koneksi Offline: Transaksi tersimpan lokal dan akan disinkronkan otomatis saat online'
            : isSyncing
            ? 'Sedang menyinkronkan data ke Database MySQL...'
            : pendingCount > 0
            ? `${pendingCount} data dalam antrean sinkronisasi`
            : !isDbConnected
            ? 'Server Database MySQL Terputus'
            : 'Sistem Online & Database MySQL Terhubung Aktif'
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
        ) : !isDbConnected ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span className="font-medium whitespace-nowrap">
              DB Offline
            </span>
          </>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium whitespace-nowrap">
              MySQL Online
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
                    : !isDbConnected
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {isManualOffline || !isOnline ? (
                    <WifiOff className="w-5 h-5" />
                  ) : !isDbConnected ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Database className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
                    <span>Status Database & Koneksi MySQL</span>
                    {mysqlStatus?.version && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {mysqlStatus.version}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Sistem toko-online.online terintegrasi MySQL / MariaDB Server
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
                  : !isDbConnected
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : pendingCount > 0
                  ? 'bg-sky-50 border-sky-200 text-sky-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                {isManualOffline ? (
                  <WifiOff className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                ) : !isOnline ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : !isDbConnected ? (
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
                      : !isDbConnected
                      ? 'Database MySQL Sedang Offline / Tidak Merespon'
                      : pendingCount > 0
                      ? `Ada ${pendingCount} Transaksi Menunggu Sinkronisasi`
                      : 'Database MySQL Server Terhubung Normal & Siap Digunakan'}
                  </div>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">
                    {isManualOffline
                      ? 'Sistem dipaksa beroperasi tanpa koneksi internet. Semua pemindaian barcode, cetak struk, dan transaksi kasir disimpan instan di memori lokal perangkat ini tanpa lag jaringan.'
                      : !isOnline
                      ? 'Kasir dan toko tetap dapat bertransaksi, memindai barcode, mencetak struk, dan memotong stok. Transaksi otomatis dicatat di memori lokal dan akan terkirim ke MySQL saat sinyal kembali.'
                      : !isDbConnected
                      ? `Koneksi ke MySQL Server terputus (${mysqlStatus?.message || 'Port 3306 tidak merespons'}). Buka menu Database MySQL di Panel Admin untuk memeriksa konfigurasi host/user/password.`
                      : pendingCount > 0
                      ? 'Data tersimpan dengan aman di antrean lokal perangkat ini dan sedang/akan otomatis diunggah ke database MySQL secara bertahap.'
                      : 'Seluruh transaksi, stok, katalog produk, dan kategori tersimpan aman dan terintegrasi langsung di Database MySQL.'}
                  </p>
                </div>
              </div>

              {/* Status Grid (Koneksi Perangkat & Database MySQL) */}
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

                {/* 2. Database MySQL */}
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500 font-medium">Database MySQL / MariaDB</span>
                    <button
                      type="button"
                      onClick={checkDatabaseHealth}
                      disabled={isPingingMysql}
                      className="p-1 rounded hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                      title="Periksa ulang koneksi ke MySQL"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isPingingMysql ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Database className={`w-3.5 h-3.5 ${
                      isDbConnected
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`} />
                    <span className={`font-bold text-xs sm:text-sm truncate ${
                      isDbConnected
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}>
                      {isDbConnected ? 'MySQL Terhubung' : 'Terputus'}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400 block mt-1 truncate">
                    {mysqlStatus?.config ? `${mysqlStatus.config.host}:${mysqlStatus.config.port} (${mysqlStatus.config.database})` : '127.0.0.1:3306 (kuickmart_db)'}
                  </span>
                </div>
              </div>

              {/* Tabel Statistik Data di MySQL */}
              {mysqlStatus?.tableCounts && (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="text-xs font-bold text-stone-700 mb-2 flex items-center justify-between">
                    <span>Statistik Tabel MySQL:</span>
                    <span className="text-[10px] text-stone-400 font-mono">kuickmart_db</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white p-2 rounded-lg border border-stone-200">
                      <span className="text-[10px] text-stone-400 block">Produk</span>
                      <strong className="text-stone-900 font-bold">{mysqlStatus.tableCounts.products ?? 0}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-stone-200">
                      <span className="text-[10px] text-stone-400 block">Kategori</span>
                      <strong className="text-stone-900 font-bold">{mysqlStatus.tableCounts.categories ?? 0}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-stone-200">
                      <span className="text-[10px] text-stone-400 block">Pesanan</span>
                      <strong className="text-stone-900 font-bold">{mysqlStatus.tableCounts.orders ?? 0}</strong>
                    </div>
                  </div>
                </div>
              )}

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
                      : 'Nonaktif: Transaksi kasir otomatis langsung dikirim ke Database MySQL saat dibuat.'}
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
                      setTimeout(() => checkDatabaseHealth(), 500);
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
                {onOpenDatabaseManager && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpenModal(false);
                      onOpenDatabaseManager();
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Buka panel Database Manager MySQL"
                  >
                    <Settings className="w-3.5 h-3.5 text-stone-500" />
                    <span>Kelola Database MySQL</span>
                  </button>
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
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || isPingingMysql ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncing
                      ? 'Menyinkronkan...'
                      : queue.length > 0
                      ? `Sinkronkan (${queue.length})`
                      : 'Cek Status MySQL'}
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
