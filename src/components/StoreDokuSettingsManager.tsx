import React, { useState, useEffect } from 'react';
import {
  Store as StoreIcon,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Upload,
  Globe,
  Check,
  ShieldCheck,
  Building,
  Phone,
  MapPin,
  Palette,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { StoreTenantIdentity, BrandHeaderFooterConfig } from '../types';
import {
  loadStoreTenantConfig,
  saveStoreTenantConfig,
  syncBrandConfigFromTenant,
  getStoreSlugFromUrl,
  formatSlugToStoreName,
  DEFAULT_DOKU_SETTINGS,
} from '../utils/tenantHelper';
import { compressImageFile } from '../utils/imageHelper';

interface StoreDokuSettingsManagerProps {
  brandConfig: BrandHeaderFooterConfig;
  onUpdateBrandConfig: (newConfig: BrandHeaderFooterConfig) => void;
  onUpdateTenantConfig?: (tenant: StoreTenantIdentity) => void;
}

const COLOR_PRESETS = [
  { name: 'Merah Minimarket', hex: '#E51A24', bgClass: 'bg-[#E51A24]' },
  { name: 'Biru Ritel', hex: '#1D4ED8', bgClass: 'bg-blue-700' },
  { name: 'Hijau Swalayan', hex: '#16A34A', bgClass: 'bg-green-600' },
  { name: 'Amber Mart', hex: '#D97706', bgClass: 'bg-amber-600' },
  { name: 'Ungu Grosir', hex: '#7C3AED', bgClass: 'bg-purple-600' },
  { name: 'Hitam Modern', hex: '#1E293B', bgClass: 'bg-slate-800' },
];

export const StoreDokuSettingsManager: React.FC<StoreDokuSettingsManagerProps> = ({
  brandConfig,
  onUpdateBrandConfig,
  onUpdateTenantConfig,
}) => {
  const currentUrlSlug = getStoreSlugFromUrl();
  const [activeSlug, setActiveSlug] = useState<string>(currentUrlSlug);
  const [tenantData, setTenantData] = useState<StoreTenantIdentity>(() => loadStoreTenantConfig(currentUrlSlug));
  
  const [activeTab, setActiveTab] = useState<'store_identity' | 'doku_gateway' | 'test_simulation' | 'guide'>('store_identity');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  
  // Test simulation state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    qrisUrl?: string;
    qrisContent?: string;
    details?: any;
  } | null>(null);

  // Sync state when activeSlug changes
  useEffect(() => {
    const loaded = loadStoreTenantConfig(activeSlug);
    setTenantData(loaded);
    setTestResult(null);
  }, [activeSlug]);

  // Handle Copy text to clipboard
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Upload Logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImageFile(file, 400, 0.85);
      setTenantData((prev) => ({
        ...prev,
        logoUrl: compressedBase64,
      }));
    } catch (err) {
      console.error('Failed uploading logo:', err);
    }
  };

  // Simpan pengaturan
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // 1. Simpan tenant config
      await saveStoreTenantConfig(tenantData);

      // 2. Callback jika ada
      if (onUpdateTenantConfig) {
        onUpdateTenantConfig(tenantData);
      }

      // 3. Sinkronisasikan brandConfig aplikasi utama
      const updatedBrand = syncBrandConfigFromTenant(tenantData, brandConfig);
      onUpdateBrandConfig(updatedBrand);

      setSaveSuccessNotice(`Pengaturan nama toko "${tenantData.storeName}" dan DOKU berhasil disimpan!`);
      setTimeout(() => setSaveSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Uji koneksi dan generate QRIS
  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // 1. Test kredensial
      const credRes = await fetch('/api/doku/test-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: tenantData.dokuSettings.clientId,
          secretKey: tenantData.dokuSettings.secretKey,
          environment: tenantData.dokuSettings.environment,
          merchantName: tenantData.dokuSettings.merchantName || tenantData.storeName,
        }),
      });
      const credData = await credRes.json();

      if (!credData.success) {
        setTestResult({
          success: false,
          message: credData.error || 'Validasi kredensial gagal',
        });
        setIsTesting(false);
        return;
      }

      // 2. Generate QRIS uji coba
      const qrisRes = await fetch('/api/doku/qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: `TEST-${Date.now().toString().slice(-6)}`,
          amount: 15000,
          storeSlug: tenantData.storeSlug,
          merchantName: tenantData.dokuSettings.merchantName || tenantData.storeName,
          customClientId: tenantData.dokuSettings.clientId,
        }),
      });
      const qrisData = await qrisRes.json();

      setTestResult({
        success: true,
        message: 'Koneksi DOKU berhasil! QRIS dinamis berhasil digenerate dengan identitas toko Anda.',
        qrisUrl: qrisData.qrImageUrl,
        qrisContent: qrisData.qrContent,
        details: {
          clientId: qrisData.clientId,
          merchantName: qrisData.merchantName,
          amount: qrisData.amount,
          invoiceNumber: qrisData.invoiceNumber,
          expiredDate: qrisData.expiredDate,
        },
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Gagal menghubungi gateway DOKU: ' + (err.message || 'Network error'),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const notificationWebhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/doku/notification` 
    : 'https://domainanda.com/api/doku/notification';

  return (
    <div className="space-y-6">
      {/* Header Info & Toko Selector */}
      <div className="bg-gradient-to-r from-slate-900 via-stone-900 to-slate-800 text-white p-5 sm:p-6 rounded-2xl shadow-sm border border-stone-700/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-red-500/20 text-red-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-red-500/30 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                White-Label & Multi-Store Ready
              </span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                tenantData.dokuSettings.environment === 'production' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                DOKU {tenantData.dokuSettings.environment === 'production' ? 'LIVE Production' : 'Sandbox Testing'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <StoreIcon className="w-6 h-6 text-red-400" />
              Identitas Toko Bebas & Payment Gateway DOKU
            </h2>
            <p className="text-stone-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Projek ini mendukung penamaan toko bebas tanpa batasan merk. Atur nama toko, logo, warna tema, serta sambungkan akun DOKU untuk pembayaran QRIS & Virtual Account.
            </p>
          </div>

          {/* Quick Slug Switcher */}
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10 flex flex-col gap-1.5 shrink-0 min-w-[240px]">
            <span className="text-[11px] text-stone-300 font-medium flex items-center gap-1">
              <Globe className="w-3 h-3 text-red-400" />
              Toko Aktif (Subdomain):
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={activeSlug}
                onChange={(e) => setActiveSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                placeholder="nama-toko"
                className="bg-black/40 text-white text-xs px-2.5 py-1.5 rounded-lg border border-white/20 focus:outline-none focus:border-red-400 font-mono w-full"
              />
              <button
                type="button"
                onClick={() => {
                  const newName = formatSlugToStoreName(activeSlug);
                  setTenantData((prev) => ({
                    ...prev,
                    storeSlug: activeSlug,
                    storeName: newName,
                    dokuSettings: {
                      ...prev.dokuSettings,
                      merchantName: newName,
                    },
                  }));
                }}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer transition shrink-0"
                title="Terapkan slug"
              >
                Ganti
              </button>
            </div>
            <span className="text-[10px] text-stone-400">
              Contoh: <code className="text-amber-300">berkah-mart</code> atau <code className="text-amber-300">sembako-jaya</code>
            </span>
          </div>
        </div>
      </div>

      {/* Save Success Notice */}
      {saveSuccessNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{saveSuccessNotice}</span>
          </div>
          <button
            onClick={() => setSaveSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('store_identity')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'store_identity'
              ? 'border-red-600 text-red-600 font-semibold bg-red-50/40 rounded-t-lg'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-t-lg'
          }`}
        >
          <StoreIcon className="w-4 h-4" />
          <span>1. Identitas & Nama Toko Bebas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('doku_gateway')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'doku_gateway'
              ? 'border-red-600 text-red-600 font-semibold bg-red-50/40 rounded-t-lg'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-t-lg'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>2. Pengaturan Kunci DOKU</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('test_simulation')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'test_simulation'
              ? 'border-red-600 text-red-600 font-semibold bg-red-50/40 rounded-t-lg'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-t-lg'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>3. Uji Coba & Simulasi QRIS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'guide'
              ? 'border-red-600 text-red-600 font-semibold bg-red-50/40 rounded-t-lg'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-t-lg'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>4. Panduan Cloudflare & DOKU</span>
        </button>
      </div>

      {/* TAB 1: IDENTITAS & BRANDING TOKO BEBAS */}
      {activeTab === 'store_identity' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom Form Input */}
          <div className="lg:col-span-2 space-y-5 bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-red-600" />
                Informasi & Profil Toko
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Nama ini akan muncul di seluruh header aplikasi, kartu produk, nota kasir, dan pembayaran pelanggan.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama Toko Bebas */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Nama Toko (Bebas diisi apa saja) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tenantData.storeName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const words = newName.split(' ').filter(Boolean);
                    const newLogoText = words.length >= 2 
                      ? (words[0][0] + words[1][0]).toUpperCase() 
                      : newName.slice(0, 2).toUpperCase();

                    setTenantData((prev) => ({
                      ...prev,
                      storeName: newName,
                      logoText: prev.logoText || newLogoText,
                      dokuSettings: {
                        ...prev.dokuSettings,
                        merchantName: newName,
                      },
                    }));
                  }}
                  placeholder="Contoh: Toko Berkah Mandiri, Warung Pintar 99, Swalayan Sejahtera..."
                  className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Anda bisa menamainya apapun, bukan hanya KuickMart.
                </span>
              </div>

              {/* Subdomain / Slug Toko */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Slug Subdomain (URL) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="bg-stone-100 text-stone-500 text-xs px-3 py-2.5 rounded-l-xl border border-r-0 border-stone-300 font-mono">
                    https://
                  </span>
                  <input
                    type="text"
                    value={tenantData.storeSlug}
                    onChange={(e) => {
                      const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '');
                      setTenantData((prev) => ({ ...prev, storeSlug: slug }));
                    }}
                    placeholder="nama-toko"
                    className="w-full text-sm font-mono px-3 py-2.5 rounded-r-xl border border-stone-300 focus:border-red-500 outline-none transition"
                  />
                </div>
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Akan diakses via <code className="text-red-600 font-semibold">{tenantData.storeSlug || 'toko'}.domainanda.com</code>
                </span>
              </div>

              {/* Slogan / Tagline */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Slogan / Tagline Toko
                </label>
                <input
                  type="text"
                  value={tenantData.tagline}
                  onChange={(e) => setTenantData((prev) => ({ ...prev, tagline: e.target.value }))}
                  placeholder="Pilihan Belanja Hemat Setiap Hari"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-red-500 outline-none transition"
                />
              </div>

              {/* Pemilik / Pengelola */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Nama Pemilik / Manager Toko
                </label>
                <input
                  type="text"
                  value={tenantData.ownerName}
                  onChange={(e) => setTenantData((prev) => ({ ...prev, ownerName: e.target.value }))}
                  placeholder="H. Ahmad Santoso"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-red-500 outline-none transition"
                />
              </div>

              {/* WhatsApp Kasir */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Nomor WhatsApp Kasir & CS
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={tenantData.whatsapp}
                    onChange={(e) => setTenantData((prev) => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="081234567890"
                    className="w-full text-sm pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-red-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Kota & Alamat */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Kota Toko
                </label>
                <input
                  type="text"
                  value={tenantData.city}
                  onChange={(e) => setTenantData((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="Jakarta / Surabaya / Bandung"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-red-500 outline-none transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Alamat Lengkap Toko
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={tenantData.address}
                    onChange={(e) => setTenantData((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Jl. Raya Utama No. 123, Kel. Suka Maju"
                    className="w-full text-sm pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-red-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Pilihan Warna Tema Toko */}
              <div className="sm:col-span-2 pt-2 border-t border-stone-100">
                <label className="block text-xs font-semibold text-stone-700 mb-2 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-red-600" />
                  Warna Tema Toko (Brand Primary Color)
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setTenantData((prev) => ({ ...prev, primaryColor: preset.hex }))}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                        tenantData.primaryColor === preset.hex
                          ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${preset.bgClass} shrink-0`} />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={tenantData.primaryColor || '#E51A24'}
                    onChange={(e) => setTenantData((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-10 h-10 rounded-xl border border-stone-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={tenantData.primaryColor || '#E51A24'}
                    onChange={(e) => setTenantData((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    className="text-xs font-mono px-3 py-2 rounded-xl border border-stone-300 w-32 uppercase"
                  />
                  <span className="text-xs text-stone-500">
                    Warna ini menjadi aksen utama tombol, badge promo, dan kartu member.
                  </span>
                </div>
              </div>

              {/* Logo Upload & Text */}
              <div className="sm:col-span-2 pt-2 border-t border-stone-100">
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Logo Toko (Gambar atau Inisial)
                </label>
                <div className="flex items-center gap-4">
                  {tenantData.logoUrl ? (
                    <img
                      src={tenantData.logoUrl}
                      alt={tenantData.storeName}
                      className="w-14 h-14 rounded-2xl object-cover border border-stone-200 shadow-2xs"
                    />
                  ) : (
                    <div
                      style={{ backgroundColor: tenantData.primaryColor || '#E51A24' }}
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-2xs"
                    >
                      {tenantData.logoText || tenantData.storeName.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <label className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl border border-stone-300 cursor-pointer transition inline-flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload File Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      {tenantData.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setTenantData((prev) => ({ ...prev, logoUrl: '' }))}
                          className="text-red-600 hover:text-red-700 text-xs font-semibold px-2 py-1 cursor-pointer"
                        >
                          Hapus Gambar
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500">Inisial Teks:</span>
                      <input
                        type="text"
                        maxLength={4}
                        value={tenantData.logoText || ''}
                        onChange={(e) => setTenantData((prev) => ({ ...prev, logoText: e.target.value.toUpperCase() }))}
                        placeholder="BM"
                        className="text-xs font-bold px-2 py-1 border border-stone-300 rounded-lg w-16 text-center uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Visual Preview */}
          <div className="space-y-4">
            <div className="bg-stone-50 border border-stone-200 p-5 rounded-2xl">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-stone-500" />
                Live Preview Tampilan Toko
              </h4>

              {/* Mock Header Card */}
              <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  {tenantData.logoUrl ? (
                    <img
                      src={tenantData.logoUrl}
                      alt={tenantData.storeName}
                      className="w-10 h-10 rounded-xl object-cover border border-stone-200 shadow-2xs"
                    />
                  ) : (
                    <div
                      style={{ backgroundColor: tenantData.primaryColor || '#E51A24' }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-2xs"
                    >
                      {tenantData.logoText || tenantData.storeName.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="overflow-hidden">
                    <h5 className="font-extrabold text-sm text-stone-900 truncate leading-tight">
                      {tenantData.storeName || 'Nama Toko Anda'}
                    </h5>
                    <p className="text-[11px] text-stone-500 truncate">
                      {tenantData.tagline || 'Tagline Toko'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-stone-400" />
                    {tenantData.city || 'Kota Toko'}
                  </span>
                  <span
                    style={{ backgroundColor: tenantData.primaryColor || '#E51A24' }}
                    className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                  >
                    BUKA 24 JAM
                  </span>
                </div>

                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100 text-[11px] text-stone-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Subdomain:</span>
                    <span className="font-mono text-stone-800 font-semibold">{tenantData.storeSlug}.domain.id</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gateway DOKU:</span>
                    <span className={tenantData.dokuSettings.isEnabled ? 'text-emerald-600 font-semibold' : 'text-stone-400'}>
                      {tenantData.dokuSettings.isEnabled ? 'Aktif (QRIS & VA)' : 'Nonaktif'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tombol Simpan Tab 1 */}
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Identitas Toko Ini'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: PENGATURAN KUNCI DOKU PAYMENT GATEWAY */}
      {activeTab === 'doku_gateway' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5 bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-red-600" />
                  Kredensial DOKU Jokul Payment Gateway
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Setiap toko dapat menggunakan akun DOKU tersendiri atau akun induk platform. Dana pembayaran pelanggan akan langsung masuk ke rekening merchant DOKU ini.
                </p>
              </div>

              {/* Toggle Aktif / Nonaktif DOKU */}
              <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
                <span className="text-xs font-semibold text-stone-700">Status DOKU:</span>
                <button
                  type="button"
                  onClick={() =>
                    setTenantData((prev) => ({
                      ...prev,
                      dokuSettings: {
                        ...prev.dokuSettings,
                        isEnabled: !prev.dokuSettings.isEnabled,
                      },
                    }))
                  }
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
                    tenantData.dokuSettings.isEnabled ? 'bg-emerald-600' : 'bg-stone-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                      tenantData.dokuSettings.isEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Mode Sandbox vs Production */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-stone-900 block">Mode Lingkungan (Environment):</span>
                <span className="text-xs text-stone-500">
                  Gunakan Sandbox untuk uji coba gratis tanpa uang sungguhan, atau Production jika akun DOKU sudah live.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setTenantData((prev) => ({
                      ...prev,
                      dokuSettings: {
                        ...prev.dokuSettings,
                        environment: 'sandbox',
                      },
                    }))
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                    tenantData.dokuSettings.environment === 'sandbox'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Sandbox (Testing)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTenantData((prev) => ({
                      ...prev,
                      dokuSettings: {
                        ...prev.dokuSettings,
                        environment: 'production',
                      },
                    }))
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                    tenantData.dokuSettings.environment === 'production'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Production (Live)
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Client ID / Mall ID */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center justify-between">
                  <span>Client ID / Mall ID DOKU <span className="text-red-500">*</span></span>
                  <a
                    href="https://dashboard.doku.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-normal"
                  >
                    <span>Buka Dashboard DOKU</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <input
                  type="text"
                  value={tenantData.dokuSettings.clientId}
                  onChange={(e) =>
                    setTenantData((prev) => ({
                      ...prev,
                      dokuSettings: {
                        ...prev.dokuSettings,
                        clientId: e.target.value.trim(),
                      },
                    }))
                  }
                  placeholder="Contoh: BRN-0241-1788726490929 atau Mall ID Anda"
                  className="w-full text-sm font-mono px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-red-500 outline-none transition"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Ditemukan di menu <em>Settings</em> ➔ <em>API & Credentials</em> di dashboard DOKU Jokul.
                </span>
              </div>

              {/* Secret Key / Shared Key */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center justify-between">
                  <span>Secret Key / Shared Key (HMAC-SHA256) <span className="text-red-500">*</span></span>
                  <span className="text-[11px] text-stone-400 font-normal">Tersimpan aman di sisi backend</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecretKey ? 'text' : 'password'}
                    value={tenantData.dokuSettings.secretKey}
                    onChange={(e) =>
                      setTenantData((prev) => ({
                        ...prev,
                        dokuSettings: {
                          ...prev.dokuSettings,
                          secretKey: e.target.value.trim(),
                        },
                      }))
                    }
                    placeholder="Masukkan Secret Key DOKU..."
                    className="w-full text-sm font-mono px-3.5 py-2.5 pr-10 rounded-xl border border-stone-300 focus:border-red-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Secret Key digunakan backend untuk enkripsi <code>Signature HMAC-SHA256</code> secara otomatis.
                </span>
              </div>

              {/* Nama Merchant di Tagihan DOKU */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Nama Merchant di Tagihan DOKU QRIS & Virtual Account
                </label>
                <input
                  type="text"
                  value={tenantData.dokuSettings.merchantName}
                  onChange={(e) =>
                    setTenantData((prev) => ({
                      ...prev,
                      dokuSettings: {
                        ...prev.dokuSettings,
                        merchantName: e.target.value,
                      },
                    }))
                  }
                  placeholder={tenantData.storeName}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-red-500 outline-none transition"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Nama ini yang akan tercetak pada struk pembayaran pelanggan saat scan QRIS atau bayar Virtual Account.
                </span>
              </div>

              {/* Webhook Callback Notification URL */}
              <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    URL Notifikasi / Webhook DOKU (Notification URL)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(notificationWebhookUrl, 'webhook')}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-blue-300 shadow-2xs"
                  >
                    {copiedField === 'webhook' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin URL</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-white px-3 py-2 rounded-lg border border-blue-200 text-xs font-mono text-blue-800 break-all select-all">
                  {notificationWebhookUrl}
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Salin URL ini dan tempel di dashboard DOKU Jokul menu <em>Settings</em> ➔ <em>Notification URL</em>. Setiap kali pembeli membayar via QRIS atau VA, pesanan di kasir Anda otomatis lunas detik itu juga.
                </p>
              </div>

              {/* Pilihan Metode Pembayaran Aktif */}
              <div className="pt-3 border-t border-stone-100">
                <label className="block text-xs font-semibold text-stone-700 mb-2.5">
                  Metode Pembayaran DOKU yang Diaktifkan:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { key: 'enableQris', label: 'QRIS Dinamis (Semua E-Wallet)' },
                    { key: 'enableBcaVa', label: 'BCA Virtual Account' },
                    { key: 'enableMandiriVa', label: 'Mandiri Virtual Account' },
                    { key: 'enableBriVa', label: 'BRI Virtual Account' },
                    { key: 'enableBniVa', label: 'BNI Virtual Account' },
                    { key: 'enablePermataVa', label: 'Permata Virtual Account' },
                  ].map((method) => {
                    const isChecked = (tenantData.dokuSettings as any)[method.key] ?? true;
                    return (
                      <label
                        key={method.key}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                          isChecked
                            ? 'bg-red-50/50 border-red-300 text-stone-900 font-semibold'
                            : 'bg-white border-stone-200 text-stone-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setTenantData((prev) => ({
                              ...prev,
                              dokuSettings: {
                                ...prev.dokuSettings,
                                [method.key]: e.target.checked,
                              },
                            }))
                          }
                          className="rounded text-red-600 focus:ring-red-500"
                        />
                        <span>{method.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Aksi & Simpan */}
          <div className="space-y-4">
            <div className="bg-stone-50 border border-stone-200 p-5 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Status Integrasi Gateway
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-200">
                  <span className="text-stone-500">Toko:</span>
                  <span className="font-semibold text-stone-900">{tenantData.storeName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200">
                  <span className="text-stone-500">Client ID:</span>
                  <span className="font-mono text-stone-800 truncate max-w-[140px]">
                    {tenantData.dokuSettings.clientId || '-'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200">
                  <span className="text-stone-500">Secret Key:</span>
                  <span className="font-mono text-stone-800">
                    {tenantData.dokuSettings.secretKey ? '•••• Tersedia' : 'Belum diisi'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-500">Lingkungan:</span>
                  <span className={`font-semibold ${
                    tenantData.dokuSettings.environment === 'production' ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {tenantData.dokuSettings.environment === 'production' ? 'Production' : 'Sandbox (Testing)'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Jika Secret Key dikosongkan, sistem secara otomatis menggunakan Sandbox Gateway simulator bawaan sehingga Anda tetap dapat menguji coba kasir tanpa kendala.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Kredensial DOKU'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: UJI COBA & SIMULASI QRIS LANGSUNG */}
      {activeTab === 'test_simulation' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6">
          <div className="max-w-2xl">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-red-600" />
              Uji Coba Koneksi & Generator QRIS DOKU Live
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Verifikasi apakah Client ID dan Secret Key yang Anda masukkan dapat menghasilkan kode QRIS resmi dengan nama toko Anda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunTest}
              disabled={isTesting}
              className="bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <QrCode className="w-4 h-4 text-red-400" />
              <span>{isTesting ? 'Sedang Menghubungi DOKU...' : 'Generate QRIS Uji Coba'}</span>
            </button>

            <span className="text-xs text-stone-500">
              Merchant: <strong className="text-stone-800">{tenantData.dokuSettings.merchantName || tenantData.storeName}</strong>
            </span>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div className={`p-5 rounded-2xl border transition-all ${
              testResult.success ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 flex-1">
                  <h4 className={`text-sm font-bold ${testResult.success ? 'text-emerald-900' : 'text-rose-900'}`}>
                    {testResult.success ? 'Koneksi DOKU Berhasil!' : 'Validasi Gagal'}
                  </h4>
                  <p className={`text-xs ${testResult.success ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {testResult.message}
                  </p>
                </div>
              </div>

              {testResult.success && testResult.qrisUrl && (
                <div className="mt-5 pt-4 border-t border-emerald-200/60 flex flex-col sm:flex-row items-center gap-6">
                  <div className="bg-white p-3 rounded-2xl border border-emerald-200 shadow-md flex flex-col items-center">
                    <img
                      src={testResult.qrisUrl}
                      alt="QRIS DOKU"
                      className="w-44 h-44 rounded-lg object-contain"
                    />
                    <div className="mt-2 text-center">
                      <span className="text-[11px] font-black text-stone-900 block uppercase tracking-wide">
                        {testResult.details?.merchantName}
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        NMID: {testResult.details?.clientId}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-emerald-900 flex-1">
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-200 space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-stone-500 font-sans">No. Tagihan:</span>
                        <span className="font-bold">{testResult.details?.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500 font-sans">Nominal Uji Coba:</span>
                        <span className="font-bold text-emerald-700">Rp 15.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500 font-sans">Masa Berlaku:</span>
                        <span>1 Jam</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500 font-sans">E-Wallet Didukung:</span>
                        <span className="font-sans font-medium text-stone-700">GoPay, OVO, Dana, ShopeePay, BCA, Mandiri</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      ✅ Pelanggan di toko <strong>{tenantData.storeName}</strong> kini dapat langsung membayar via QRIS ini di kasir maupun di keranjang belanja.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PANDUAN PENGATURAN CLOUDFLARE & DOKU */}
      {activeTab === 'guide' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-red-600" />
              Panduan 3 Langkah Menambahkan Nama Toko Bebas
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Ikuti panduan berikut agar toko baru bisa otomatis aktif tanpa perlu daftar satu per satu di Cloudflare.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Langkah 1 */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="w-7 h-7 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center">
                1
              </div>
              <h4 className="text-xs font-bold text-stone-900">Setting Wildcard Cloudflare (1x Saja)</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Di DNS Cloudflare domain Anda, buat 1 record CNAME:
                <br />
                <code className="text-red-600 font-bold font-mono">Name: *</code>
                <br />
                <code className="text-stone-700 font-mono">Target: domain-hosting-anda.com</code>
                <br />
                Dengan 1 baris ini, semua nama toko (misal: <code>berkah.domain.com</code>) otomatis aktif selamanya!
              </p>
            </div>

            {/* Langkah 2 */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="w-7 h-7 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center">
                2
              </div>
              <h4 className="text-xs font-bold text-stone-900">Ambil Kunci API di DOKU Jokul</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Buka <a href="https://dashboard.doku.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">dashboard.doku.com</a>, masuk ke menu <strong>Settings ➔ API & Credentials</strong>.
                Salin <strong>Client ID</strong> dan <strong>Secret Key</strong>, lalu tempel di tab <em>Pengaturan Kunci DOKU</em>.
              </p>
            </div>

            {/* Langkah 3 */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="w-7 h-7 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center">
                3
              </div>
              <h4 className="text-xs font-bold text-stone-900">Pasang Webhook URL di DOKU</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Salin URL Webhook:
                <br />
                <code className="text-blue-700 font-mono text-[10px] break-all">{notificationWebhookUrl}</code>
                <br />
                Tempel ke menu <strong>Notification URL</strong> di dashboard DOKU agar status pesanan kasir otomatis lunas real-time.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
