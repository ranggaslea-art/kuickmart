import React, { useState } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  UploadCloud, 
  Code, 
  Sparkles, 
  RefreshCw, 
  Layers, 
  KeyRound, 
  Globe,
  ExternalLink
} from 'lucide-react';
import { 
  getStoredSupabaseConfig, 
  saveStoredSupabaseConfig, 
  testSupabaseConnection, 
  seedDataToSupabase 
} from '../lib/supabase';
import { SUPABASE_SQL_SCHEMA, SUPABASE_RLS_FIX_SQL } from '../lib/supabaseSchema';
import { Product, Store, Category, Voucher } from '../types';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSupabaseConnected: boolean;
  onConnectionChange: (status: boolean) => void;
  onRefreshData: () => void;
  currentData?: {
    products?: Product[];
    stores?: Store[];
    categories?: Category[];
    vouchers?: Voucher[];
  };
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  isSupabaseConnected,
  onConnectionChange,
  onRefreshData,
  currentData,
}) => {
  if (!isOpen) return null;

  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [activeTab, setActiveTab] = useState<'config' | 'sql' | 'guide'>('config');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedRlsFix, setCopiedRlsFix] = useState(false);

  const handleSaveAndTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    saveStoredSupabaseConfig(url, anonKey);

    const res = await testSupabaseConnection(url, anonKey);
    setIsTesting(false);
    setTestResult(res);
    onConnectionChange(res.success);
    if (res.success) {
      onRefreshData();
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    const res = await seedDataToSupabase(currentData);
    setIsSeeding(false);
    setSeedResult(res);
    if (res.success) {
      onRefreshData();
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyRlsFix = () => {
    navigator.clipboard.writeText(SUPABASE_RLS_FIX_SQL);
    setCopiedRlsFix(true);
    setTimeout(() => setCopiedRlsFix(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <span>Integrasi Database Supabase</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  isSupabaseConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                }`}>
                  {isSupabaseConnected ? 'Terhubung' : 'Lokal / Belum Konek'}
                </span>
              </h3>
              <p className="text-[11px] text-stone-500">
                Hubungkan database cloud Supabase untuk sinkronisasi pesanan, stok produk, & loyalty member
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-stone-200 text-stone-600 border border-stone-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 px-4 bg-stone-50/50">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Koneksi Supabase</span>
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Script SQL Schema DDL</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Struktur Database</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-2xl text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Aplikasi Otomatis Siap Digunakan!</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Aplikasi ini sudah dilengkapi dengan sistem data reaktif minimarket instan. Anda dapat menghubungkan proyek Supabase Anda sendiri untuk persistensi cloud multi-perangkat real-time.
                </p>
              </div>

              {/* Supabase URL */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-stone-500" />
                  <span>Project URL Supabase (HTTPS):</span>
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:border-emerald-500 bg-white"
                />
              </div>

              {/* Supabase Anon Key */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-stone-500" />
                  <span>Anon Public Key (API Key):</span>
                </label>
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:border-emerald-500 bg-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={handleSaveAndTest}
                  disabled={isTesting}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-2xs transition-transform active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Menguji Koneksi...' : 'Simpan & Tes Koneksi'}</span>
                </button>

                <button
                  onClick={handleSeedData}
                  disabled={isSeeding || (!url && !anonKey)}
                  className="bg-stone-900 hover:bg-black disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-2xs transition-transform active:scale-95"
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${isSeeding ? 'animate-bounce' : ''}`} />
                  <span>{isSeeding ? 'Menyinkronkan...' : 'Sinkronkan Master Data ke Supabase'}</span>
                </button>
              </div>

              {/* Status alerts */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {seedResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                    seedResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {seedResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 font-semibold leading-relaxed">{seedResult.message}</div>
                  </div>

                  {!seedResult.success && seedResult.message.includes('row-level security') && (
                    <div className="pt-2 border-t border-red-200 mt-2">
                      <p className="text-[11px] text-red-700 mb-2">
                        <strong>Penyebab:</strong> Row Level Security (RLS) di Supabase memblokir insert anonim. Silakan jalankan script perbaikan RLS berikut di menu <strong>SQL Editor</strong> Supabase:
                      </p>
                      <button
                        onClick={handleCopyRlsFix}
                        className="bg-stone-900 hover:bg-black text-white text-xs font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                      >
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                        <span>{copiedRlsFix ? 'Berhasil Disalin ke Clipboard!' : 'Salin Script Perbaikan RLS'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-900 block">
                    1. Script Lengkap DDL Schema & RLS Policy:
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Eksekusi script ini sekali di menu SQL Editor dashboard Supabase
                  </span>
                </div>
                <button
                  onClick={handleCopySql}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1 shadow-2xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSql ? 'Berhasil Disalin!' : 'Salin Semua DDL'}</span>
                </button>
              </div>

              <div className="bg-stone-900 text-stone-100 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-[300px] border border-stone-800 leading-relaxed">
                <pre>{SUPABASE_SQL_SCHEMA}</pre>
              </div>

              {/* RLS Quick Fix Box */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>2. Script Cepat Perbaikan Error RLS (Jika tabel sudah ada):</span>
                  </div>
                  <button
                    onClick={handleCopyRlsFix}
                    className="bg-stone-900 hover:bg-black text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1 shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{copiedRlsFix ? 'Berhasil Disalin!' : 'Salin Script RLS Fix'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Jika tabel sudah dibuat namun muncul error <code>violates row-level security policy</code> saat klik tombol sinkron, cukup salin dan jalankan script RLS Fix di Supabase SQL Editor.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-3 text-xs text-stone-700">
              <h4 className="font-bold text-stone-900 text-sm">Skema Database NusaMart (Klik Indomaret/Alfagift Style):</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl">
                  <div className="font-bold text-blue-900">1. public.products</div>
                  <p className="text-[11px] text-stone-500 mt-0.5">Katalog barang minimarket, harga, diskon JSM, stok, unit, barcode.</p>
                </div>
                <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl">
                  <div className="font-bold text-blue-900">2. public.orders & order_items</div>
                  <p className="text-[11px] text-stone-500 mt-0.5">Transaksi pemesanan, status timeline, metode pembayaran, live driver.</p>
                </div>
                <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl">
                  <div className="font-bold text-blue-900">3. public.members</div>
                  <p className="text-[11px] text-stone-500 mt-0.5">Poin loyalty, koleksi stamp, tier member, barcode fisik kartu.</p>
                </div>
                <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl">
                  <div className="font-bold text-blue-900">4. public.stores & vouchers</div>
                  <p className="text-[11px] text-stone-500 mt-0.5">Daftar cabang minimarket, radius jarak, kupon diskon & gratis ongkir.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
          >
            <span>Buka Supabase Dashboard</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-black"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
