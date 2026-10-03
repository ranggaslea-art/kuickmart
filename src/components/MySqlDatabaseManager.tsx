import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  ExternalLink,
  Copy,
  Check,
  Table,
  UploadCloud,
  ShieldCheck,
  Terminal,
  Zap,
  HardDrive,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { Product, Category, BrandItem, Store, MemberProfile, StaffUser, Order } from '../types';
import { 
  fetchMySqlStatus, 
  triggerMySqlTest, 
  triggerMySqlInitSchema, 
  migrateAllDataToMySql, 
  MySqlStatusResponse 
} from '../lib/mysqlClientApi';

interface MySqlDatabaseManagerProps {
  products: Product[];
  categories?: Category[];
  brands?: BrandItem[];
  stores?: Store[];
  customers?: MemberProfile[];
  staffUsers?: StaffUser[];
  orders?: Order[];
  tenantSlug?: string;
  onRefreshAll?: () => void;
}

export const MySqlDatabaseManager: React.FC<MySqlDatabaseManagerProps> = ({
  products,
  categories = [],
  brands = [],
  stores = [],
  customers = [],
  staffUsers = [],
  orders = [],
  tenantSlug = 'default',
  onRefreshAll,
}) => {
  const [status, setStatus] = useState<MySqlStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationFeedback, setMigrationFeedback] = useState<string | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'install' | 'tables'>('status');

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetchMySqlStatus();
      setStatus(res);
    } catch (_) {
      setStatus({ connected: false, message: 'Tidak dapat menghubungi server backend' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const res = await triggerMySqlTest();
      setStatus(res);
    } catch (_) {
      setStatus({ connected: false, message: 'Gagal menguji koneksi' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitSchema = async () => {
    setIsLoading(true);
    try {
      const res = await triggerMySqlInitSchema();
      if (res.success) {
        setMigrationFeedback('Tabel-tabel MySQL berhasil dibuat/disinkronkan!');
        await checkStatus();
      } else {
        setMigrationError(res.message);
      }
    } catch (err: any) {
      setMigrationError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartMigration = async () => {
    if (!confirm(`Apakah Anda yakin ingin memigrasikan ${products.length} produk dan seluruh data toko ke database MySQL?`)) {
      return;
    }

    setIsMigrating(true);
    setMigrationFeedback(null);
    setMigrationError(null);

    try {
      const res = await migrateAllDataToMySql({
        tenantSlug,
        products,
        categories,
        brands,
        stores,
        customers,
        staffUsers,
        orders,
      });

      if (res.success) {
        setMigrationFeedback(res.message);
        await checkStatus();
        if (onRefreshAll) onRefreshAll();
      } else {
        setMigrationError(res.message);
      }
    } catch (err: any) {
      setMigrationError(err.message || 'Terjadi kendala saat migrasi data.');
    } finally {
      setIsMigrating(false);
    }
  };

  // Skrip Bash otomatis 1 baris untuk instalasi di VPS Debian / Ubuntu
  const vpsInstallScript = `bash /var/www/kuickmart/scripts/install-mysql.sh || bash -c "apt-get update -y && DEBIAN_FRONTEND=noninteractive apt-get install -y mariadb-server php-fpm php-mysql phpmyadmin && mysql -e \\"CREATE DATABASE IF NOT EXISTS kuickmart_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'kuickmart_user'@'localhost' IDENTIFIED BY 'Kuickmart2026Secure'; GRANT ALL PRIVILEGES ON kuickmart_db.* TO 'kuickmart_user'@'localhost'; FLUSH PRIVILEGES;\\" && ln -sfn /usr/share/phpmyadmin /var/www/kuickmart/dist/phpmyadmin || true && systemctl enable mariadb && systemctl restart mariadb && systemctl restart nginx"`;

  const copyInstallScript = () => {
    navigator.clipboard.writeText(vpsInstallScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const phpMyAdminUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/phpmyadmin`
    : 'https://www.toko-online.online/phpmyadmin';

  return (
    <div className="space-y-6">
      {/* 1. Header Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-950 text-white p-6 shadow-xl border border-emerald-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
              <Database className="w-3.5 h-3.5" />
              <span>Database Server Mandiri (On-Premise)</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Pusat Database MySQL & phpMyAdmin</span>
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
            </h2>
            <p className="text-sm text-emerald-200/90 max-w-2xl leading-relaxed">
              Kedaulatan data 100% di server VPS Anda sendiri. Tidak ada limit kuota pihak ketiga, tidak ada risiko "database paused", dan dapat dipantau langsung lewat antarmuka grafis phpMyAdmin.
            </p>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={handleTestConnection}
              disabled={isLoading}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Uji Koneksi</span>
            </button>

            <a
              href={phpMyAdminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka phpMyAdmin</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Status Badge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status Koneksi */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            status?.connected ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
          }`}>
            {status?.connected ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-stone-500 block">Status MariaDB</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${status?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className={`text-sm font-black truncate ${status?.connected ? 'text-emerald-700' : 'text-rose-700'}`}>
                {status?.connected ? 'Terhubung (Online)' : 'Belum Terhubung'}
              </span>
            </div>
            <span className="text-[11px] text-stone-400 block truncate mt-0.5">
              {status?.version || 'Port 3306 (Localhost)'}
            </span>
          </div>
        </div>

        {/* Database & Host */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Server className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-stone-500 block">Database Target</span>
            <span className="text-sm font-black text-stone-800 block truncate mt-0.5">kuickmart_db</span>
            <span className="text-[11px] text-stone-400 block truncate">127.0.0.1:3306 (Internal)</span>
          </div>
        </div>

        {/* Total Produk di MySQL */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Table className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-stone-500 block">Produk di MySQL</span>
            <span className="text-sm font-black text-stone-800 block truncate mt-0.5">
              {status?.tableCounts?.products !== undefined ? `${status.tableCounts.products} Produk` : '0 Produk'}
            </span>
            <span className="text-[11px] text-stone-400 block truncate">Tersimpan di tabel products</span>
          </div>
        </div>

        {/* Total Transaksi di MySQL */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-stone-500 block">Pesanan di MySQL</span>
            <span className="text-sm font-black text-stone-800 block truncate mt-0.5">
              {status?.tableCounts?.orders !== undefined ? `${status.tableCounts.orders} Struk` : '0 Struk'}
            </span>
            <span className="text-[11px] text-stone-400 block truncate">Tersimpan di tabel orders</span>
          </div>
        </div>
      </div>

      {/* 3. Feedback Alert */}
      {migrationFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold leading-relaxed">{migrationFeedback}</span>
          </div>
          <button onClick={() => setMigrationFeedback(null)} className="text-emerald-500 hover:text-emerald-700 text-xs font-bold">
            Tutup
          </button>
        </div>
      )}

      {migrationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-800 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-xs font-bold leading-relaxed">{migrationError}</span>
          </div>
          <button onClick={() => setMigrationError(null)} className="text-rose-500 hover:text-rose-700 text-xs font-bold">
            Tutup
          </button>
        </div>
      )}

      {/* 4. Tab Navigation */}
      <div className="flex border-b border-stone-200 gap-2">
        <button
          onClick={() => setActiveTab('status')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'status'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          1. Sinkronisasi & Migrasi Data
        </button>
        <button
          onClick={() => setActiveTab('install')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'install'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          2. Panduan Instalasi MariaDB di VPS
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'tables'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          3. Daftar Tabel & Skema SQL
        </button>
      </div>

      {/* 5. Tab Content: Status & Migrasi */}
      {activeTab === 'status' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Action: 1-Click Migration */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-base font-black text-stone-800">1-Klik Migrasikan Seluruh Data ke MySQL</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Salin seluruh data dari memori browser/Supabase ke database MariaDB lokal di VPS.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                {products.length} Produk Siap Dipindahkan
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-lg font-black text-stone-800 block">{products.length}</span>
                <span className="text-[11px] text-stone-500 font-semibold">Master Produk</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-lg font-black text-stone-800 block">{categories.length}</span>
                <span className="text-[11px] text-stone-500 font-semibold">Kategori</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-lg font-black text-stone-800 block">{brands.length}</span>
                <span className="text-[11px] text-stone-500 font-semibold">Merek</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-lg font-black text-stone-800 block">{orders.length}</span>
                <span className="text-[11px] text-stone-500 font-semibold">Riwayat Pesanan</span>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Keamanan Data & Sistem Multi-Kemasan:</span>
              </div>
              <p className="leading-relaxed">
                Proses migrasi menggunakan teknik <em>Upsert (ON DUPLICATE KEY UPDATE)</em> sehingga tidak akan menghapus data yang sudah ada. Seluruh 49 kolom Excel (termasuk multi-satuan dus, renteng, dan barcode) akan tersimpan rapi ke kolom JSON relasional.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={handleStartMigration}
                disabled={isMigrating || !status?.connected}
                className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                  isMigrating || !status?.connected
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-600/25 cursor-pointer'
                }`}
              >
                {isMigrating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sedang Menyimpan Data ke MySQL...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Mulai Migrasi ke MySQL Sekarang</span>
                  </>
                )}
              </button>

              <button
                onClick={handleInitSchema}
                disabled={isLoading || !status?.connected}
                className="w-full sm:w-auto px-4 py-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs border border-stone-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Buat Ulang Skema Tabel</span>
              </button>
            </div>
          </div>

          {/* Side Card: phpMyAdmin Access & Config */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-stone-800 flex items-center gap-2">
              <span>Informasi Kredensial MySQL</span>
              <Info className="w-4 h-4 text-stone-400" />
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <span className="text-[11px] text-stone-400 font-semibold block">Host & Port</span>
                <span className="font-mono font-bold text-stone-800">127.0.0.1 : 3306</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <span className="text-[11px] text-stone-400 font-semibold block">Nama Database</span>
                <span className="font-mono font-bold text-stone-800">kuickmart_db</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <span className="text-[11px] text-stone-400 font-semibold block">Username</span>
                <span className="font-mono font-bold text-stone-800">kuickmart_user</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <span className="text-[11px] text-stone-400 font-semibold block">Password Default</span>
                <span className="font-mono font-bold text-stone-800">Kuickmart2026Secure</span>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={phpMyAdminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 text-center"
              >
                <span>Buka Dashboard phpMyAdmin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 6. Tab Content: Panduan Instalasi MariaDB di VPS */}
      {activeTab === 'install' && (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-black text-stone-800">Perintah Instalasi MariaDB + phpMyAdmin 1 Baris di VPS</h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Jalankan perintah ini di terminal VPS (tab Rumahweb Clientzone noVNC). Perintah ini otomatis menginstal MariaDB, PHP-FPM, phpMyAdmin, membuat database <code>kuickmart_db</code>, serta mengonfigurasi user akses.
            </p>
          </div>

          <div className="relative">
            <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto leading-relaxed border border-slate-800">
              {vpsInstallScript}
            </pre>
            <button
              onClick={copyInstallScript}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedScript ? 'Tersalin!' : 'Salin Perintah'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-stone-800">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">1</span>
                <span>Buka Terminal VPS</span>
              </div>
              <p className="text-stone-600 leading-relaxed">
                Buka tab <strong>Clientzone Rumahweb</strong> Anda lalu klik menu Terminal / Web Console VPS.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-stone-800">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">2</span>
                <span>Tempel & Tekan Enter</span>
              </div>
              <p className="text-stone-600 leading-relaxed">
                Tempelkan perintah di atas dan tekan <strong>Enter</strong>. Tunggu sekitar 1-2 menit hingga proses paket selesai.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-stone-800">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">3</span>
                <span>Klik Uji Koneksi</span>
              </div>
              <p className="text-stone-600 leading-relaxed">
                Kembali ke tab ini dan klik tombol <strong>"Uji Koneksi"</strong>. Status akan langsung berubah menjadi hijau (Online).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 7. Tab Content: Skema Tabel */}
      {activeTab === 'tables' && (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-stone-800">Struktur Tabel Resmi MariaDB (10 Tabel)</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Struktur tabel relasional yang dirancang khusus untuk operasional toko ritel, kasir POS, dan multi-cabang.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-bold">
              UTF8MB4 Unicode CI
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5">
              <span className="font-bold text-stone-900 block font-mono">1. products (Master Data Produk)</span>
              <p className="text-stone-600 leading-relaxed">
                Menampung 49 kolom Excel: ID, Barcode, HPP Modal, Harga Jual, Stok Fisik, Multi-Satuan (Dus/Renteng/Pack), Rak, Supplier, dan Pajak.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5">
              <span className="font-bold text-stone-900 block font-mono">2. orders (Transaksi & Penjualan)</span>
              <p className="text-stone-600 leading-relaxed">
                Menyimpan seluruh struk belanja, kasir pelaksana, status pembayaran (CASH/QRIS/DOKU), rincian item, dan total diskon.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5">
              <span className="font-bold text-stone-900 block font-mono">3. categories (Kategori Produk)</span>
              <p className="text-stone-600 leading-relaxed">
                Pengelompokan barang untuk etalase katalog online (misal: Sembako, Minuman, Makanan Ringan).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5">
              <span className="font-bold text-stone-900 block font-mono">4. brands (Merek Pabrikan)</span>
              <p className="text-stone-600 leading-relaxed">
                Master data merek/brand distributor resmi (Indofood, Wings, Unilever, dll.).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5">
              <span className="font-bold text-stone-900 block font-mono">5. customers (Data Pelanggan)</span>
              <p className="text-stone-600 leading-relaxed">
                Buku data pembeli, poin loyalitas member, tier membership, nomor telepon, dan riwayat belanja.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5">
              <span className="font-bold text-stone-900 block font-mono">6. staff_users (Staf & Hak Akses)</span>
              <p className="text-stone-600 leading-relaxed">
                Manajemen akun kasir, supervisor, kepala gudang, dan hak akses izin masing-masing modul.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
