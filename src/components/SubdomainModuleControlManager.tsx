import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  CheckCircle2,
  XCircle,
  Search,
  Sliders,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Store,
  Layers,
  ScanBarcode,
  Receipt,
  Undo2,
  BarChart3,
  Package,
  Tag,
  Users,
  Truck,
  FileSpreadsheet,
  ClipboardCheck,
  ArrowLeftRight,
  ClipboardList,
  ShoppingBag,
  Megaphone,
  Ticket,
  Coins,
  BellRing,
  Store as StoreIcon,
  CreditCard,
  Bike,
  Palette,
  Database,
  Rocket,
  Info,
  Check,
  X,
  Lock,
  Unlock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Filter,
  Sparkles
} from 'lucide-react';
import {
  CONTROLLABLE_SUBDOMAIN_MODULES,
  SubdomainControllableModule,
  SubdomainModuleCategory,
  getGlobalSubdomainModulePolicy,
  saveGlobalSubdomainModulePolicy,
  getSubdomainModuleOverrides,
  saveSubdomainModuleOverride,
  removeSubdomainModuleOverride,
  bulkSetSubdomainModules,
  resetSubdomainToGlobal,
  getSubdomainEffectiveModuleStatus,
  SUBDOMAIN_MODULE_POLICY_EVENT
} from '../utils/subdomainModuleControl';
import {
  canAccessSubdomainModule,
  fetchRegisteredSubdomains,
  RegisteredSubdomain,
  ROOT_AUTHORITY_DOMAIN
} from '../utils/tenantHelper';

export const SubdomainModuleControlManager: React.FC = () => {
  const [accessPolicy, setAccessPolicy] = useState(() => canAccessSubdomainModule());
  const [subdomains, setSubdomains] = useState<RegisteredSubdomain[]>([]);
  const [isLoadingSubdomains, setIsLoadingSubdomains] = useState<boolean>(true);

  // Tab mode: 'global' | 'subdomain_specific'
  const [viewMode, setViewMode] = useState<'global' | 'subdomain_specific'>('global');

  // Global policy state
  const [globalPolicy, setGlobalPolicy] = useState<Record<string, boolean>>(() => getGlobalSubdomainModulePolicy());

  // Subdomain specific state
  const [selectedSubdomainSlug, setSelectedSubdomainSlug] = useState<string>('');
  const [subdomainOverrides, setSubdomainOverrides] = useState<Record<string, Record<string, boolean>>>(() => getSubdomainModuleOverrides());

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Load registered subdomains
  useEffect(() => {
    const checkAndLoad = async () => {
      const pol = canAccessSubdomainModule();
      setAccessPolicy(pol);
      if (!pol.allowed) {
        setIsLoadingSubdomains(false);
        return;
      }

      setIsLoadingSubdomains(true);
      try {
        const list = await fetchRegisteredSubdomains();
        setSubdomains(list);
        if (list.length > 0 && !selectedSubdomainSlug) {
          // Pilih subdomain pertama yang bukan root jika ada
          const firstSub = list.find(s => s.storeSlug !== 'default' && s.storeSlug !== 'toko-online' && s.storeSlug !== 'toko-online.online') || list[0];
          if (firstSub) {
            setSelectedSubdomainSlug(firstSub.storeSlug);
          }
        }
      } catch (err) {
        console.error('Gagal memuat list subdomain:', err);
      } finally {
        setIsLoadingSubdomains(false);
      }
    };

    checkAndLoad();

    const handlePolicyChange = () => {
      setGlobalPolicy(getGlobalSubdomainModulePolicy());
      setSubdomainOverrides(getSubdomainModuleOverrides());
    };

    window.addEventListener(SUBDOMAIN_MODULE_POLICY_EVENT, handlePolicyChange);
    window.addEventListener('storage', handlePolicyChange);
    return () => {
      window.removeEventListener(SUBDOMAIN_MODULE_POLICY_EVENT, handlePolicyChange);
      window.removeEventListener('storage', handlePolicyChange);
    };
  }, []);

  // Filter modules
  const filteredModules = useMemo(() => {
    return CONTROLLABLE_SUBDOMAIN_MODULES.filter(m => {
      const matchSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [searchQuery, selectedCategory]);

  // Selected subdomain object
  const currentSubdomain = useMemo(() => {
    return subdomains.find(s => s.storeSlug === selectedSubdomainSlug);
  }, [subdomains, selectedSubdomainSlug]);

  // Effective status for selected subdomain
  const currentSubdomainStatus = useMemo(() => {
    if (!selectedSubdomainSlug) return {};
    return getSubdomainEffectiveModuleStatus(selectedSubdomainSlug);
  }, [selectedSubdomainSlug, globalPolicy, subdomainOverrides]);

  // Global toggle handler
  const handleToggleGlobalModule = (moduleId: string) => {
    const currentVal = globalPolicy[moduleId] !== false;
    const newVal = !currentVal;
    const updated = { ...globalPolicy, [moduleId]: newVal };
    setGlobalPolicy(updated);
    saveGlobalSubdomainModulePolicy(updated);
    const mod = CONTROLLABLE_SUBDOMAIN_MODULES.find(m => m.id === moduleId);
    showNotification(`Modul "${mod?.name || moduleId}" kini ${newVal ? 'diaktifkan' : 'dinonaktifkan'} secara global untuk semua subdomain.`);
  };

  // Bulk global handler
  const handleBulkGlobal = (enable: boolean) => {
    const updated: Record<string, boolean> = {};
    CONTROLLABLE_SUBDOMAIN_MODULES.forEach(m => {
      updated[m.id] = enable;
    });
    setGlobalPolicy(updated);
    saveGlobalSubdomainModulePolicy(updated);
    showNotification(`Semua ${CONTROLLABLE_SUBDOMAIN_MODULES.length} modul berhasil ${enable ? 'diaktifkan' : 'dinonaktifkan'} untuk seluruh subdomain.`);
  };

  // Subdomain specific toggle handler
  const handleToggleSubdomainModule = (moduleId: string) => {
    if (!selectedSubdomainSlug) return;
    const status = currentSubdomainStatus[moduleId];
    const isCurrentlyEnabled = status ? status.enabled : true;
    const newVal = !isCurrentlyEnabled;

    saveSubdomainModuleOverride(selectedSubdomainSlug, moduleId, newVal);
    setSubdomainOverrides(getSubdomainModuleOverrides());
    const mod = CONTROLLABLE_SUBDOMAIN_MODULES.find(m => m.id === moduleId);
    showNotification(`Modul "${mod?.name || moduleId}" di subdomain "${currentSubdomain?.storeName || selectedSubdomainSlug}" diubah menjadi ${newVal ? 'AKTIF' : 'NONAKTIF'}.`);
  };

  // Reset module override to global
  const handleResetModuleToGlobal = (moduleId: string) => {
    if (!selectedSubdomainSlug) return;
    removeSubdomainModuleOverride(selectedSubdomainSlug, moduleId);
    setSubdomainOverrides(getSubdomainModuleOverrides());
    const mod = CONTROLLABLE_SUBDOMAIN_MODULES.find(m => m.id === moduleId);
    showNotification(`Modul "${mod?.name || moduleId}" dikembalikan mengikuti kebijakan global.`);
  };

  // Reset entire subdomain to global
  const handleResetSubdomainAllToGlobal = () => {
    if (!selectedSubdomainSlug) return;
    resetSubdomainToGlobal(selectedSubdomainSlug);
    setSubdomainOverrides(getSubdomainModuleOverrides());
    showNotification(`Seluruh modul di subdomain "${currentSubdomain?.storeName || selectedSubdomainSlug}" dikembalikan ke kebijakan global.`);
  };

  // Bulk set for specific subdomain
  const handleBulkSubdomain = (enable: boolean) => {
    if (!selectedSubdomainSlug) return;
    bulkSetSubdomainModules(selectedSubdomainSlug, enable);
    setSubdomainOverrides(getSubdomainModuleOverrides());
    showNotification(`Seluruh modul di subdomain "${currentSubdomain?.storeName || selectedSubdomainSlug}" berhasil ${enable ? 'diaktifkan' : 'dinonaktifkan'}.`);
  };

  // Icon renderer helper
  const renderModuleIcon = (iconName: string) => {
    switch (iconName) {
      case 'ScanBarcode': return <ScanBarcode className="w-5 h-5 text-emerald-600" />;
      case 'Receipt': return <Receipt className="w-5 h-5 text-stone-700" />;
      case 'Undo2': return <Undo2 className="w-5 h-5 text-rose-600" />;
      case 'BarChart3': return <BarChart3 className="w-5 h-5 text-emerald-600" />;
      case 'Package': return <Package className="w-5 h-5 text-blue-600" />;
      case 'Tag': return <Tag className="w-5 h-5 text-pink-600" />;
      case 'Users': return <Users className="w-5 h-5 text-sky-600" />;
      case 'Truck': return <Truck className="w-5 h-5 text-indigo-600" />;
      case 'FileSpreadsheet': return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'Layers': return <Layers className="w-5 h-5 text-blue-600" />;
      case 'ClipboardCheck': return <ClipboardCheck className="w-5 h-5 text-emerald-600" />;
      case 'ArrowLeftRight': return <ArrowLeftRight className="w-5 h-5 text-purple-600" />;
      case 'ClipboardList': return <ClipboardList className="w-5 h-5 text-blue-600" />;
      case 'ShoppingBag': return <ShoppingBag className="w-5 h-5 text-emerald-600" />;
      case 'Megaphone': return <Megaphone className="w-5 h-5 text-orange-600" />;
      case 'Ticket': return <Ticket className="w-5 h-5 text-amber-600" />;
      case 'Coins': return <Coins className="w-5 h-5 text-amber-500" />;
      case 'BellRing': return <BellRing className="w-5 h-5 text-rose-500" />;
      case 'Store': return <StoreIcon className="w-5 h-5 text-purple-600" />;
      case 'CreditCard': return <CreditCard className="w-5 h-5 text-red-500" />;
      case 'Bike': return <Bike className="w-5 h-5 text-blue-600" />;
      case 'Palette': return <Palette className="w-5 h-5 text-amber-500" />;
      case 'Database': return <Database className="w-5 h-5 text-emerald-600" />;
      case 'Rocket': return <Rocket className="w-5 h-5 text-indigo-600" />;
      case 'Search': return <Search className="w-5 h-5 text-sky-600" />;
      default: return <Shield className="w-5 h-5 text-blue-600" />;
    }
  };

  // If accessed outside root domain, render access restriction
  if (!accessPolicy.allowed) {
    return (
      <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-8 max-w-2xl mx-auto text-center space-y-4 shadow-sm animate-in fade-in">
        <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert className="w-9 h-9" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-rose-950">Akses Ditolak: Otoritas Khusus Domain Utama</h2>
          <p className="text-xs text-rose-700 leading-relaxed font-medium">
            Modul <strong>Kontrol Modul Subdomain</strong> ini hanya tersedia dan dapat dikelola secara eksklusif melalui domain utama <strong>{ROOT_AUTHORITY_DOMAIN}</strong>.
          </p>
        </div>
        <div className="bg-white/80 p-3.5 rounded-2xl border border-rose-200 text-left text-xs space-y-1.5 font-mono">
          <div className="text-rose-900 font-bold">Detail Kebijakan Keamanan Platform:</div>
          <div className="text-stone-600">Domain Saat Ini: <span className="font-bold text-rose-700">{accessPolicy.currentDomain}</span></div>
          <div className="text-stone-600">Domain Berwenang: <span className="font-bold text-emerald-700">{ROOT_AUTHORITY_DOMAIN}</span></div>
          <div className="text-stone-500 text-[11px] font-sans pt-1">
            Subdomain toko cabang tidak diizinkan mengubah status modul platform.
          </div>
        </div>
      </div>
    );
  }

  // Stats calculation
  const totalModulesCount = CONTROLLABLE_SUBDOMAIN_MODULES.length;
  const globalEnabledCount = Object.values(globalPolicy).filter(Boolean).length;
  const globalDisabledCount = totalModulesCount - globalEnabledCount;

  const currentSubdomainOverridesCount = selectedSubdomainSlug && subdomainOverrides[selectedSubdomainSlug]
    ? Object.keys(subdomainOverrides[selectedSubdomainSlug]).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedback && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-md ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
            : 'bg-rose-50 border border-rose-300 text-rose-900'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-cyan-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden border border-stone-700">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5" />
                <span>Otoritas Platform Domain Utama</span>
              </span>
              <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-[10px] font-bold">
                Eksklusif {ROOT_AUTHORITY_DOMAIN}
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Pusat Kontrol Modul Subdomain</span>
            </h1>
            
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Atur hak ketersediaan modul untuk seluruh subdomain cabang toko (<code className="text-cyan-300 bg-white/10 px-1.5 py-0.5 rounded text-[11px]">*.toko-online.online</code>).
              Modul yang dinonaktifkan di sini otomatis terkunci dan tidak dapat diakses di subdomain terkait.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center min-w-[110px]">
              <div className="text-2xl font-black text-cyan-300">{globalEnabledCount} / {totalModulesCount}</div>
              <div className="text-[10px] font-semibold text-stone-300 uppercase tracking-wider mt-0.5">Modul Global Aktif</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center min-w-[110px]">
              <div className="text-2xl font-black text-amber-300">{subdomains.length}</div>
              <div className="text-[10px] font-semibold text-stone-300 uppercase tracking-wider mt-0.5">Subdomain Terdaftar</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation: Kebijakan Global vs Per-Subdomain */}
      <div className="bg-white border border-stone-200 rounded-3xl p-2 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto p-1 bg-stone-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setViewMode('global')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              viewMode === 'global'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-600" />
            <span>1. Kebijakan Global Subdomain</span>
            <span className="bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full text-[10px]">
              {globalEnabledCount} Aktif
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('subdomain_specific')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              viewMode === 'subdomain_specific'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <Store className="w-4 h-4 text-purple-600" />
            <span>2. Kustomisasi Spesifik Per-Subdomain</span>
            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {subdomains.length} Cabang
            </span>
          </button>
        </div>

        {/* Global Bulk Action Buttons */}
        {viewMode === 'global' ? (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end px-2">
            <button
              type="button"
              onClick={() => handleBulkGlobal(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Aktifkan Semua</span>
            </button>
            <button
              type="button"
              onClick={() => handleBulkGlobal(false)}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-rose-600" />
              <span>Nonaktifkan Semua</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end px-2">
            {currentSubdomainOverridesCount > 0 && (
              <button
                type="button"
                onClick={handleResetSubdomainAllToGlobal}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Hapus semua override dan kembalikan ke kebijakan default global"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>Reset ke Kebijakan Global</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleBulkSubdomain(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Aktifkan Semua Cabang Ini</span>
            </button>
            <button
              type="button"
              onClick={() => handleBulkSubdomain(false)}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-rose-600" />
              <span>Kunci Semua Cabang Ini</span>
            </button>
          </div>
        )}
      </div>

      {/* Subdomain Selector Bar (When in subdomain_specific mode) */}
      {viewMode === 'subdomain_specific' && (
        <div className="bg-purple-50/70 border border-purple-200 rounded-3xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-purple-600" />
                <span>Pilih Subdomain Toko Cabang yang Ingin Dikelola:</span>
              </div>
              <p className="text-[11px] text-purple-700 mt-0.5">
                Kustomisasi status modul per toko. Pengaturan di sini akan meng-override (menggantikan) kebijakan global khusus untuk toko ini.
              </p>
            </div>

            {currentSubdomain && (
              <a
                href={typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?store=${currentSubdomain.storeSlug}` : '#'}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs shrink-0"
              >
                <span>Uji Buka Toko</span>
                <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
              </a>
            )}
          </div>

          {/* Subdomain Badges / Selector List */}
          <div className="flex flex-wrap items-center gap-2 max-h-36 overflow-y-auto pr-1">
            {subdomains.map(sub => {
              const isSelected = sub.storeSlug === selectedSubdomainSlug;
              const hasOverrides = subdomainOverrides[sub.storeSlug] && Object.keys(subdomainOverrides[sub.storeSlug]).length > 0;
              return (
                <button
                  key={sub.storeSlug}
                  type="button"
                  onClick={() => setSelectedSubdomainSlug(sub.storeSlug)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-purple-700 text-white border-purple-800 shadow-md ring-2 ring-purple-300'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                >
                  <Globe className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-200' : 'text-purple-500'}`} />
                  <span className="font-extrabold">{sub.storeName || sub.storeSlug}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-purple-900 text-purple-100' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {sub.storeSlug}
                  </span>
                  {hasOverrides && (
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-purple-600'}`} title="Ada kustomisasi modul khusus" />
                  )}
                </button>
              );
            })}
          </div>

          {currentSubdomain && (
            <div className="bg-white p-3.5 rounded-2xl border border-purple-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-stone-900">
                  Mengelola: <span className="text-purple-700 font-extrabold">{currentSubdomain.storeName}</span> ({currentSubdomain.storeSlug}.toko-online.online)
                </div>
                <div className="text-[11px] text-stone-500 flex items-center gap-2">
                  <span>Pemilik: {currentSubdomain.ownerName || '-'}</span>
                  <span>•</span>
                  <span>Kota: {currentSubdomain.city || '-'}</span>
                  <span>•</span>
                  <span>Kustomisasi Khusus: <strong className="text-purple-700">{currentSubdomainOverridesCount} modul</strong></span>
                </div>
              </div>

              {currentSubdomainOverridesCount > 0 ? (
                <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-xl text-[11px] font-bold border border-amber-300 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-amber-700" />
                  <span>Ada {currentSubdomainOverridesCount} Modul Di-Override</span>
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-xl text-[11px] font-bold border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>100% Mengikuti Kebijakan Global</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter Category & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'Semua Kategori' },
            { id: 'pos', label: 'Kasir & POS' },
            { id: 'master', label: 'Master Data' },
            { id: 'inventory', label: 'Inventori' },
            { id: 'marketing', label: 'Marketing' },
            { id: 'settings', label: 'Settings' },
            { id: 'system', label: 'Sistem & Server' },
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari modul (cth: POS, Voucher)..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid of Controllable Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModules.map((module) => {
          // Status depending on view mode
          let isEnabled = true;
          let isOverride = false;

          if (viewMode === 'global') {
            isEnabled = globalPolicy[module.id] !== false;
          } else {
            const status = currentSubdomainStatus[module.id];
            isEnabled = status ? status.enabled : true;
            isOverride = status ? status.isOverride : false;
          }

          return (
            <div
              key={module.id}
              className={`p-4 rounded-3xl border transition-all bg-white shadow-2xs flex flex-col justify-between gap-3 ${
                isEnabled
                  ? 'border-stone-200 hover:border-cyan-300 hover:shadow-xs'
                  : 'border-rose-200 bg-rose-50/20'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isEnabled ? 'bg-stone-100' : 'bg-rose-100 text-rose-600'
                    }`}>
                      {renderModuleIcon(module.iconName)}
                    </div>
                    <div>
                      <div className="font-extrabold text-stone-900 text-sm leading-tight">
                        {module.name}
                      </div>
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                        {module.categoryLabel}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  {viewMode === 'global' ? (
                    <button
                      type="button"
                      onClick={() => handleToggleGlobalModule(module.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-emerald-600' : 'bg-stone-300'
                      }`}
                      title={isEnabled ? 'Klik untuk nonaktifkan di semua subdomain' : 'Klik untuk aktifkan di semua subdomain'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleSubdomainModule(module.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-purple-600' : 'bg-stone-300'
                      }`}
                      title={isEnabled ? 'Klik untuk nonaktifkan di subdomain ini' : 'Klik untuk aktifkan di subdomain ini'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-stone-500 leading-relaxed line-clamp-2">
                  {module.description}
                </p>
              </div>

              {/* Status Badge & Actions */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                {viewMode === 'global' ? (
                  isEnabled ? (
                    <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Aktif di Semua Subdomain</span>
                    </span>
                  ) : (
                    <span className="text-rose-700 font-bold text-[11px] flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Dinonaktifkan Global</span>
                    </span>
                  )
                ) : (
                  <div className="flex items-center justify-between w-full">
                    {isOverride ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isEnabled ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isEnabled ? 'Khusus Aktif' : 'Khusus Nonaktif'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleResetModuleToGlobal(module.id)}
                          className="text-[10px] text-stone-400 hover:text-stone-700 underline"
                          title="Kembalikan modul ini mengikuti status global"
                        >
                          Reset
                        </button>
                      </div>
                    ) : (
                      <span className="text-stone-500 text-[11px] font-medium flex items-center gap-1">
                        <span>Ikuti Global ({isEnabled ? 'Aktif' : 'Nonaktif'})</span>
                      </span>
                    )}

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {isEnabled ? 'Tersedia' : 'Terkunci'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredModules.length === 0 && (
        <div className="bg-stone-50 border border-stone-200 rounded-3xl p-8 text-center space-y-2">
          <Search className="w-8 h-8 text-stone-400 mx-auto" />
          <div className="font-bold text-stone-800 text-sm">Tidak Ada Modul Ditemukan</div>
          <p className="text-xs text-stone-500">
            Tidak ada modul yang cocok dengan kata kunci "{searchQuery}" pada kategori yang dipilih.
          </p>
        </div>
      )}

      {/* Info Card: Cara Kerja Pembatasan Modul Subdomain */}
      <div className="bg-stone-100 border border-stone-200 rounded-3xl p-5 text-xs text-stone-600 space-y-2">
        <div className="font-bold text-stone-800 flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-600" />
          <span>Informasi Mekanisme Pembatasan Modul Subdomain:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-stone-600 pl-1">
          <li><strong>Domain Utama ({ROOT_AUTHORITY_DOMAIN})</strong> selalu memiliki akses 100% penuh tanpa pembatasan ke seluruh modul sistem.</li>
          <li><strong>Kebijakan Global</strong> berlaku untuk semua subdomain yang baru terdaftar atau belum memiliki kustomisasi spesifik.</li>
          <li><strong>Kustomisasi Spesifik Per-Subdomain</strong> memungkinkan Anda memberikan izin modul khusus (misal: Subdomain A boleh akses POS & Laporan, tetapi Subdomain B hanya boleh akses Katalog).</li>
          <li>Ketika modul dinonaktifkan di subdomain, menu modul tersebut di Panel Admin subdomain otomatis terkunci dengan notifikasi keamanan resmi platform.</li>
        </ul>
      </div>
    </div>
  );
};
