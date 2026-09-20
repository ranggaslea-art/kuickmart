import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  CheckCircle2,
  XCircle,
  Search,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Store,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  QrCode,
  CreditCard,
  Building2,
  Filter,
  Eye,
  SlidersHorizontal,
  X,
  Clock,
  Info
} from 'lucide-react';
import {
  RegisteredSubdomain,
  fetchRegisteredSubdomains,
  toggleSubdomainStatus,
  ROOT_AUTHORITY_DOMAIN,
  canAccessSubdomainModule,
  ALLOWED_SUBDOMAIN_MODULE_DOMAINS,
  SIMULATE_FOREIGN_DOMAIN_KEY,
  SIMULATED_DOMAIN_NAME_KEY,
} from '../utils/tenantHelper';

interface RegisteredSubdomainsManagerProps {
  onOpenStoreSettings?: (storeSlug: string) => void;
  onNavigateToStore?: (storeSlug: string) => void;
}

export const RegisteredSubdomainsManager: React.FC<RegisteredSubdomainsManagerProps> = ({
  onOpenStoreSettings,
  onNavigateToStore,
}) => {
  const [accessPolicy, setAccessPolicy] = useState(() => canAccessSubdomainModule());
  const [subdomains, setSubdomains] = useState<RegisteredSubdomain[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Status toggle state & reason dialog
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);
  const [pendingDisableSubdomain, setPendingDisableSubdomain] = useState<RegisteredSubdomain | null>(null);
  const [disableReasonInput, setDisableReasonInput] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Domain simulation state for testing/demo in preview environment
  const [simulationState, setSimulationState] = useState<{
    isSimulating: boolean;
    domain: string;
  }>(() => {
    if (typeof window === 'undefined') return { isSimulating: false, domain: '' };
    return {
      isSimulating: sessionStorage.getItem(SIMULATE_FOREIGN_DOMAIN_KEY) === 'true',
      domain: sessionStorage.getItem(SIMULATED_DOMAIN_NAME_KEY) || 'toko-eksternal.com',
    };
  });

  const handleToggleSimulation = (domainToSimulate?: string) => {
    if (simulationState.isSimulating && !domainToSimulate) {
      sessionStorage.removeItem(SIMULATE_FOREIGN_DOMAIN_KEY);
      sessionStorage.removeItem(SIMULATED_DOMAIN_NAME_KEY);
      setSimulationState({ isSimulating: false, domain: '' });
      setAccessPolicy(canAccessSubdomainModule());
      loadData();
    } else {
      const target = domainToSimulate || 'toko-eksternal.com';
      sessionStorage.setItem(SIMULATE_FOREIGN_DOMAIN_KEY, 'true');
      sessionStorage.setItem(SIMULATED_DOMAIN_NAME_KEY, target);
      setSimulationState({ isSimulating: true, domain: target });
      setAccessPolicy(canAccessSubdomainModule(target));
      loadData();
    }
  };

  const loadData = async () => {
    const currentPol = canAccessSubdomainModule();
    setAccessPolicy(currentPol);
    if (!currentPol.allowed) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const list = await fetchRegisteredSubdomains();
      setSubdomains(list);
    } catch (e) {
      console.error('Error fetching registered subdomains:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleStatusChanged = () => {
      loadData();
    };

    window.addEventListener('subdomain_status_changed', handleStatusChanged);
    window.addEventListener('store_tenant_updated', handleStatusChanged);
    return () => {
      window.removeEventListener('subdomain_status_changed', handleStatusChanged);
      window.removeEventListener('store_tenant_updated', handleStatusChanged);
    };
  }, []);

  // Filtered subdomains
  const filteredSubdomains = useMemo(() => {
    return subdomains.filter((item) => {
      // Status filter
      if (statusFilter === 'active' && !item.isActive) return false;
      if (statusFilter === 'disabled' && item.isActive) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.storeName.toLowerCase().includes(q) ||
        item.storeSlug.toLowerCase().includes(q) ||
        item.subdomain.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        item.ownerName.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.tagline.toLowerCase().includes(q)
      );
    });
  }, [subdomains, statusFilter, searchQuery]);

  // Statistics
  const totalCount = subdomains.length;
  const activeCount = subdomains.filter((s) => s.isActive).length;
  const disabledCount = subdomains.filter((s) => !s.isActive).length;

  // Handle Checklist Click
  const handleChecklistToggle = async (item: RegisteredSubdomain) => {
    if (item.isRootDomain) {
      setActionNotice({
        type: 'error',
        message: 'Domain utama toko-online.online merupakan induk sistem dan tidak dapat dinonaktifkan.',
      });
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }

    if (item.isActive) {
      // Ingin menonaktifkan -> Buka dialog konfirmasi alasan
      setPendingDisableSubdomain(item);
      setDisableReasonInput('Dinonaktifkan sementara oleh administrator toko-online.online.');
    } else {
      // Ingin mengaktifkan kembali -> Langsung proses checklist ON
      executeToggleStatus(item.storeSlug, true);
    }
  };

  // Eksekusi perubahan status ke backend & local
  const executeToggleStatus = async (slug: string, newIsActive: boolean, reason?: string) => {
    setTogglingSlug(slug);
    try {
      const res = await toggleSubdomainStatus(slug, newIsActive, reason);
      if (res.success) {
        setActionNotice({
          type: 'success',
          message: res.message,
        });

        // Optimistic UI update
        setSubdomains((prev) =>
          prev.map((item) =>
            item.storeSlug === slug
              ? {
                  ...item,
                  isActive: newIsActive,
                  disabledReason: newIsActive ? null : reason || 'Dinonaktifkan oleh administrator',
                  disabledAt: newIsActive ? null : new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : item
          )
        );
      } else {
        setActionNotice({
          type: 'error',
          message: res.message || 'Gagal mengubah status subdomain.',
        });
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Gagal mengubah status subdomain.',
      });
    } finally {
      setTogglingSlug(null);
      setPendingDisableSubdomain(null);
      setTimeout(() => setActionNotice(null), 4500);
    }
  };

  const handleCopyLink = (subdomainUrl: string, slug: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(subdomainUrl);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2500);
    }
  };

  const handleOpenStore = (item: RegisteredSubdomain) => {
    if (onNavigateToStore) {
      onNavigateToStore(item.storeSlug);
      return;
    }
    // Jika di development atau preview, gunakan query parameter ?store=slug
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?store=${item.storeSlug}`
      : item.subdomainUrl;
    window.location.href = url;
  };

  if (!accessPolicy.allowed) {
    return (
      <div className="space-y-6" id="registered-subdomains-locked">
        {/* ACCESS DENIED CARD */}
        <div className="bg-gradient-to-br from-stone-900 via-rose-950 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-rose-800/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center shrink-0 shadow-inner">
                  <ShieldAlert className="w-7 h-7 text-rose-400" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                      Akses Terbatas: Modul Info Subdomain
                    </h3>
                    <span className="bg-rose-500/30 text-rose-200 border border-rose-400/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Ditolak
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-rose-200/90 mt-1">
                    Modul info subdomain hanya bisa diakses oleh domain <strong>kuickmart.ranggaslea.workers.dev</strong> dan domain <strong>toko-online.online</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Current Domain Box vs Allowed Domains */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Status Domain Saat Ini */}
              <div className="bg-stone-900/80 border border-stone-700/80 rounded-2xl p-4 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Domain Akses Anda Saat Ini</span>
                </div>
                <div className="bg-stone-950/90 border border-rose-900/50 rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="font-mono text-xs sm:text-sm font-bold text-rose-300 truncate">
                    {accessPolicy.currentDomain || 'unknown'}
                  </div>
                  <span className="text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded shrink-0">
                    Tidak Berwenang
                  </span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  {accessPolicy.reason || 'Domain ini tidak memiliki wewenang untuk membuka direktori subdomain maupun mengubah checklist aktivasi.'}
                </p>
              </div>

              {/* Box 2: Domain yang Diizinkan */}
              <div className="bg-stone-900/80 border border-emerald-800/40 rounded-2xl p-4 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dua Domain Resmi yang Berwenang</span>
                </div>
                <div className="space-y-2 text-xs">
                  <a
                    href="https://kuickmart.ranggaslea.workers.dev"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-950/70 hover:border-emerald-400/60 transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 font-mono font-bold text-emerald-200 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="truncate">kuickmart.ranggaslea.workers.dev</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition shrink-0 ml-1" />
                  </a>

                  <a
                    href="https://toko-online.online"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-950/70 hover:border-emerald-400/60 transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 font-mono font-bold text-emerald-200 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="truncate">toko-online.online (Domain Utama)</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition shrink-0 ml-1" />
                  </a>
                </div>
              </div>
            </div>

            {/* Test Simulation Controls (for Developers/Admins testing in preview) */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-300 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pengujian Simulasi Domain (Otoritas & Hak Akses)</span>
                </span>
                {simulationState.isSimulating && (
                  <button
                    type="button"
                    onClick={() => handleToggleSimulation()}
                    className="text-[11px] text-amber-300 hover:text-white underline font-bold cursor-pointer"
                  >
                    Reset ke Default
                  </button>
                )}
              </div>
              <p className="text-stone-400 text-[11px]">
                Gunakan tombol di bawah untuk menguji respon sistem saat diakses melalui domain berwenang vs domain luar:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleToggleSimulation('kuickmart.ranggaslea.workers.dev')}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Uji: kuickmart.ranggaslea.workers.dev (Diizinkan)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSimulation('toko-online.online')}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Uji: toko-online.online (Diizinkan)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSimulation('berkah-mart.toko-online.online')}
                  className="px-3 py-1.5 bg-rose-800 hover:bg-rose-700 text-white rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Uji: Subdomain Cabang (Ditolak)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="registered-subdomains-module">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white rounded-2xl p-6 sm:p-7 shadow-md border border-stone-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-600/20 border border-red-500/40 rounded-2xl text-red-400 shrink-0">
              <Globe className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h3 className="text-xl font-black tracking-tight text-white">
                  Info Subdomain Terdaftar
                </h3>
                <span className="bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {ROOT_AUTHORITY_DOMAIN}
                </span>
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Akses Terverifikasi: {accessPolicy.currentDomain}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-2xl">
                Pantau seluruh subdomain toko yang terdaftar di ekosistem resmi <strong>{ROOT_AUTHORITY_DOMAIN}</strong>. 
                Anda dapat mengaktifkan atau menonaktifkan akses subdomain sewaktu-waktu menggunakan tombol checklist status.
                <span className="block text-emerald-300/90 text-xs mt-1 font-medium">
                  ✓ Diotorisasi khusus untuk: <strong>kuickmart.ranggaslea.workers.dev</strong> & <strong>toko-online.online</strong>
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Simulation switcher for admin test */}
            <button
              type="button"
              onClick={() => handleToggleSimulation(simulationState.isSimulating ? undefined : 'toko-luar.com')}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                simulationState.isSimulating
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
              }`}
              title="Uji simulasi akses dari domain luar"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{simulationState.isSimulating ? 'Reset Simulasi' : 'Uji Blokir Domain'}</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
              title="Perbarui data subdomain"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-red-400' : ''}`} />
              <span>Segarkan Data</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-stone-800">
          <div className="bg-stone-800/80 border border-stone-700/80 rounded-xl p-3.5 sm:p-4">
            <div className="text-[11px] font-semibold text-stone-400 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-stone-400" />
              <span>Total Subdomain</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{totalCount}</div>
            <div className="text-[10px] text-stone-400 mt-1">Terdaftar resmi</div>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-3.5 sm:p-4">
            <div className="text-[11px] font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Subdomain Aktif</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-300">{activeCount}</div>
            <div className="text-[10px] text-emerald-400/80 mt-1">Bisa diakses & belanja</div>
          </div>

          <div className="bg-rose-950/30 border border-rose-800/50 rounded-xl p-3.5 sm:p-4">
            <div className="text-[11px] font-semibold text-rose-400 mb-1 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Dinonaktifkan</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-300">{disabledCount}</div>
            <div className="text-[10px] text-rose-400/80 mt-1">Akses toko terkunci</div>
          </div>

          <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3.5 sm:p-4">
            <div className="text-[11px] font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Otoritas Subdomain</span>
            </div>
            <div className="text-sm font-extrabold text-amber-300 truncate mt-1">
              {ROOT_AUTHORITY_DOMAIN}
            </div>
            <div className="text-[10px] text-amber-400/80 mt-1">Otoritas terpusat</div>
          </div>
        </div>
      </div>

      {/* ACTION NOTICE / TOAST */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs transition-all animate-fade-in ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama toko, slug, kota, atau nomor telepon..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Semua ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Aktif ({activeCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('disabled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'disabled'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-700 hover:text-rose-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Dinonaktifkan ({disabledCount})</span>
          </button>
        </div>
      </div>

      {/* SUBDOMAINS LIST */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-2xs">
          <RotateCcw className="w-8 h-8 text-red-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-stone-700">Memuat info subdomain terdaftar...</p>
          <p className="text-xs text-stone-400 mt-1">Mengambil data dari server {ROOT_AUTHORITY_DOMAIN}</p>
        </div>
      ) : filteredSubdomains.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-2xs">
          <Globe className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-stone-800">Tidak ada subdomain yang cocok</p>
          <p className="text-xs text-stone-500 mt-1">
            {searchQuery
              ? `Tidak ditemukan subdomain dengan kata kunci "${searchQuery}".`
              : 'Belum ada data subdomain untuk filter yang dipilih.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition"
            >
              Hapus Pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredSubdomains.map((item) => {
            const isTogglingThis = togglingSlug === item.storeSlug;
            const isRoot = item.isRootDomain;

            return (
              <div
                key={item.storeSlug}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-xs ${
                  !item.isActive
                    ? 'border-rose-200 bg-rose-50/20'
                    : isRoot
                    ? 'border-red-200/90'
                    : 'border-stone-200'
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* LEFT: STORE IDENTITY & SUBDOMAIN */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Logo / Initial */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: item.primaryColor || (isRoot ? '#E51A24' : '#2563eb') }}
                      >
                        {item.logoText || item.storeName.slice(0, 2).toUpperCase()}
                      </div>

                      {/* Store Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="text-base font-extrabold text-stone-900 truncate">
                            {item.storeName}
                          </h4>

                          {isRoot && (
                            <span className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Shield className="w-3 h-3 text-red-600" />
                              Domain Utama (Pusat)
                            </span>
                          )}

                          {item.isActive ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Aktif
                            </span>
                          ) : (
                            <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Dinonaktifkan
                            </span>
                          )}
                        </div>

                        {/* URL Subdomain with quick copy */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <code className="text-xs font-mono font-bold text-stone-800 bg-stone-100 px-2 py-1 rounded-md border border-stone-200 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-stone-500" />
                            <span>{item.subdomain}</span>
                          </code>

                          <button
                            type="button"
                            onClick={() => handleCopyLink(item.subdomainUrl, item.storeSlug)}
                            className="text-stone-500 hover:text-stone-800 p-1 hover:bg-stone-100 rounded-md transition"
                            title="Salin Link Subdomain"
                          >
                            {copiedSlug === item.storeSlug ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Tagline / Alasan Nonaktif */}
                        {!item.isActive ? (
                          <div className="bg-rose-100/70 border border-rose-200 text-rose-900 rounded-xl p-2.5 text-xs mb-2 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Status Subdomain: Nonaktif</p>
                              <p className="text-[11px] text-rose-800 opacity-90">
                                {item.disabledReason || 'Dinonaktifkan oleh administrator toko-online.online.'}
                              </p>
                              {item.disabledAt && (
                                <p className="text-[10px] text-rose-700 mt-0.5">
                                  Waktu dinonaktifkan: {new Date(item.disabledAt).toLocaleString('id-ID')}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          item.tagline && (
                            <p className="text-xs text-stone-500 line-clamp-1 mb-2">
                              {item.tagline}
                            </p>
                          )
                        )}

                        {/* Metadata Pills */}
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-stone-500">
                          {item.ownerName && (
                            <span className="flex items-center gap-1">
                              <Store className="w-3 h-3 text-stone-400" />
                              <span>{item.ownerName}</span>
                            </span>
                          )}
                          {item.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-stone-400" />
                              <span>{item.city}</span>
                            </span>
                          )}
                          {item.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-stone-400" />
                              <span className="font-mono">{item.phone}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-stone-400">
                            <Clock className="w-3 h-3" />
                            <span>Diperbarui: {new Date(item.updatedAt).toLocaleDateString('id-ID')}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: TOMBOL CHECKLIST STATUS & AKSI */}
                    <div className="flex flex-row sm:flex-col lg:flex-row items-center justify-between sm:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-100 shrink-0">
                      {/* TOMBOL CHECKLIST STATUS */}
                      <div className="flex flex-col items-start sm:items-end">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                          Akses Subdomain
                        </span>

                        {isRoot ? (
                          <div
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-100 border border-stone-200 text-stone-500 text-xs font-bold cursor-not-allowed select-none"
                            title="Domain utama tidak dapat dinonaktifkan"
                          >
                            <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                            <span className="text-stone-700">Domain Utama</span>
                            <Lock className="w-3.5 h-3.5 text-stone-400 ml-0.5" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleChecklistToggle(item)}
                            disabled={isTogglingThis}
                            className={`group flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50 ${
                              item.isActive
                                ? 'bg-emerald-50 hover:bg-emerald-100/90 text-emerald-900 border-emerald-300'
                                : 'bg-stone-100 hover:bg-stone-200/90 text-stone-700 border-stone-300'
                            }`}
                            title={
                              item.isActive
                                ? 'Klik untuk menonaktifkan subdomain ini'
                                : 'Klik untuk mengaktifkan kembali subdomain ini'
                            }
                          >
                            {/* Checklist Icon Box */}
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                item.isActive
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white border-2 border-stone-400 text-stone-400 group-hover:border-stone-600'
                              }`}
                            >
                              {isTogglingThis ? (
                                <RotateCcw className="w-3 h-3 animate-spin" />
                              ) : item.isActive ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : null}
                            </div>

                            <div className="flex flex-col text-left">
                              <span className="leading-tight">
                                {item.isActive ? 'Subdomain Aktif' : 'Dinonaktifkan'}
                              </span>
                              <span className="text-[9px] font-medium opacity-70">
                                {item.isActive ? 'Klik nonaktifkan' : 'Klik aktifkan'}
                              </span>
                            </div>
                          </button>
                        )}
                      </div>

                      {/* ACTIONS BUTTONS */}
                      <div className="flex items-center gap-2">
                        {onOpenStoreSettings && (
                          <button
                            type="button"
                            onClick={() => onOpenStoreSettings(item.storeSlug)}
                            className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                            title="Buka Pengaturan Toko & DOKU"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Kelola Toko</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenStore(item)}
                          className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                          title="Buka Halaman Subdomain"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Kunjungi</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DIALOG KONFIRMASI PENONAKTIFAN SUBDOMAIN */}
      {pendingDisableSubdomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 animate-scale-up">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-stone-900">
                  Nonaktifkan Subdomain Toko?
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Subdomain <strong className="text-stone-800 font-bold font-mono">{pendingDisableSubdomain.subdomain}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed mb-4 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
              Ketika dinonaktifkan, pengunjung yang mengakses toko ini akan melihat pemberitahuan bahwa toko sedang dinonaktifkan dan transaksi DOKU tidak dapat diproses. Anda dapat mengaktifkannya kembali kapan saja melalui tombol checklist.
            </p>

            <div className="space-y-1.5 mb-5">
              <label className="block text-xs font-bold text-stone-700">
                Alasan Penonaktifan (Opsional):
              </label>
              <textarea
                value={disableReasonInput}
                onChange={(e) => setDisableReasonInput(e.target.value)}
                rows={2}
                placeholder="Misal: Peninjauan berkas izin usaha, perbaikan berkala, dll."
                className="w-full text-xs p-3 rounded-xl border border-stone-300 focus:border-red-500 outline-none transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingDisableSubdomain(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() =>
                  executeToggleStatus(
                    pendingDisableSubdomain.storeSlug,
                    false,
                    disableReasonInput.trim() || 'Dinonaktifkan oleh administrator toko-online.online'
                  )
                }
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Ya, Nonaktifkan Subdomain</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER INFORMASI ATURAN SUBDOMAIN */}
      <div className="bg-stone-100/80 border border-stone-200 rounded-2xl p-4 text-xs text-stone-600 flex items-start gap-3">
        <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-stone-800">Catatan Otoritas & Keamanan:</span> Seluruh subdomain toko terhubung langsung dengan domain utama <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-stone-300 text-stone-900 font-semibold">{ROOT_AUTHORITY_DOMAIN}</code>. Penambahan subdomain baru hanya dapat dilakukan dari domain utama, sedangkan penonaktifan/pengaktifan dapat dikelola oleh administrator melalui tombol checklist di modul ini secara real-time.
        </div>
      </div>
    </div>
  );
};
