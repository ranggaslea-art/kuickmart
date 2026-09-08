import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Check,
  CheckCircle2,
  Lock,
  Unlock,
  Eye,
  Edit,
  Package,
  Receipt,
  Store as StoreIcon,
  Printer,
  Megaphone,
  Palette,
  Bike,
  Ticket,
  Users,
  FileSpreadsheet,
  BellRing,
  BarChart3,
  Sparkles,
  RotateCcw,
  Search,
  UserCheck,
  Info,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { StaffUser, SystemModuleKey, UserPermissions } from '../types';
import {
  SYSTEM_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_PRESETS,
  getEffectivePermissions,
  countUserPermissions,
  getRoleDisplayName,
} from '../utils/permissions';
import { INITIAL_STAFF_USERS } from '../data/mockData';

interface UserAccessManagerProps {
  staffUsers?: StaffUser[];
  currentUser?: StaffUser | { username: string; role: any; name: string; permissions?: any; id?: string };
  onUpdateStaffUsers: (updated: StaffUser[]) => void;
  onSwitchUser?: (user: StaffUser) => void;
  onOpenAddUser?: () => void;
}

export const UserAccessManager: React.FC<UserAccessManagerProps> = ({
  staffUsers = [],
  currentUser,
  onUpdateStaffUsers,
  onSwitchUser,
  onOpenAddUser,
}) => {
  const safeStaffUsers = useMemo(() => {
    return Array.isArray(staffUsers) && staffUsers.length > 0
      ? staffUsers.filter(Boolean)
      : INITIAL_STAFF_USERS;
  }, [staffUsers]);

  // Staff yang sedang dipilih untuk dikonfigurasi izinnya
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    // Default pilih user kasir jika ada agar langsung terlihat contoh kasir produk & promo
    const kasirUser = safeStaffUsers.find(u => (u?.username || '').toLowerCase() === 'kasir');
    return kasirUser ? kasirUser.id : (safeStaffUsers[0]?.id || 'usr_admin');
  });

  // Salinan izin yang sedang diedit di form matriks
  const activeStaff = useMemo(() => {
    return safeStaffUsers.find(u => u.id === selectedUserId) || safeStaffUsers[0] || INITIAL_STAFF_USERS[0];
  }, [safeStaffUsers, selectedUserId]);

  const [localPermissions, setLocalPermissions] = useState<UserPermissions>(() => {
    if (!activeStaff) return DEFAULT_ROLE_PERMISSIONS.kasir;
    return getEffectivePermissions(activeStaff.role, activeStaff.permissions);
  });

  // Sinkronkan local permissions saat user yang dipilih berganti via useEffect
  useEffect(() => {
    if (activeStaff) {
      setLocalPermissions(getEffectivePermissions(activeStaff.role, activeStaff.permissions));
      setHasUnsavedChanges(false);
    }
  }, [activeStaff?.id]);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Toggle permission per module
  const handleToggleModule = (key: SystemModuleKey, type: 'canView' | 'canEdit') => {
    setLocalPermissions((prev) => {
      const current = prev[key] || { canView: false, canEdit: false };
      let newView = current.canView;
      let newEdit = current.canEdit;

      if (type === 'canView') {
        newView = !newView;
        // Jika canView dimatikan, maka canEdit otomatis mati
        if (!newView) {
          newEdit = false;
        }
      } else if (type === 'canEdit') {
        newEdit = !newEdit;
        // Jika canEdit dihidupkan, maka canView otomatis hidup
        if (newEdit) {
          newView = true;
        }
      }

      setHasUnsavedChanges(true);
      return {
        ...prev,
        [key]: { canView: newView, canEdit: newEdit },
      };
    });
  };

  // Toggle all modules for a column
  const handleToggleSelectAll = (field: 'canView' | 'canEdit') => {
    const allActive = SYSTEM_MODULES.every((m) => localPermissions[m.key]?.[field]);
    setLocalPermissions((prev) => {
      const updated: UserPermissions = { ...prev };
      SYSTEM_MODULES.forEach((m) => {
        if (field === 'canView') {
          const nextView = !allActive;
          updated[m.key] = {
            canView: nextView,
            canEdit: nextView ? prev[m.key]?.canEdit : false,
          };
        } else {
          const nextEdit = !allActive;
          updated[m.key] = {
            canView: nextEdit ? true : prev[m.key]?.canView,
            canEdit: nextEdit,
          };
        }
      });
      setHasUnsavedChanges(true);
      return updated;
    });
  };

  // Terapkan Preset
  const handleApplyPreset = (presetId: string) => {
    const preset = PERMISSION_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setLocalPermissions(preset.getPermissions());
      setHasUnsavedChanges(true);
      setFeedbackMessage(`Preset "${preset.name}" diterapkan. Klik "Simpan Hak Akses" untuk mempermanenkan.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // Simpan perubahan ke staffUsers
  const handleSavePermissions = () => {
    if (!activeStaff) return;

    const updatedUsers = staffUsers.map((u) => {
      if (u.id === activeStaff.id) {
        return {
          ...u,
          permissions: localPermissions,
        };
      }
      return u;
    });

    onUpdateStaffUsers(updatedUsers);
    setHasUnsavedChanges(false);
    setFeedbackMessage(`Hak akses untuk ${activeStaff.name} (@${activeStaff.username}) berhasil disimpan secara permanen!`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Helper render ikon modul
  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Package': return <Package className="w-4 h-4 text-blue-600" />;
      case 'Receipt': return <Receipt className="w-4 h-4 text-emerald-600" />;
      case 'Store': return <StoreIcon className="w-4 h-4 text-purple-600" />;
      case 'Printer': return <Printer className="w-4 h-4 text-cyan-600" />;
      case 'Megaphone': return <Megaphone className="w-4 h-4 text-orange-600" />;
      case 'Palette': return <Palette className="w-4 h-4 text-amber-600" />;
      case 'Bike': return <Bike className="w-4 h-4 text-indigo-600" />;
      case 'Ticket': return <Ticket className="w-4 h-4 text-rose-600" />;
      case 'Users': return <Users className="w-4 h-4 text-emerald-700" />;
      case 'FileSpreadsheet': return <FileSpreadsheet className="w-4 h-4 text-teal-600" />;
      case 'BellRing': return <BellRing className="w-4 h-4 text-rose-500" />;
      case 'BarChart3': return <BarChart3 className="w-4 h-4 text-indigo-600" />;
      default: return <SlidersHorizontal className="w-4 h-4 text-stone-600" />;
    }
  };

  // Filter modul
  const filteredModules = SYSTEM_MODULES.filter((m) => {
    const matchesCat = filterCategory === 'all' || m.category === filterCategory;
    const matchesSearch =
      m.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      m.description.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeStats = countUserPermissions(localPermissions);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* 1. Header & Konsep RBAC */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-blue-950 text-white p-5 rounded-3xl shadow-md border border-stone-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-lg">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-white">
              Modul Manajemen Hak Akses User
            </h3>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
              Role-Based Access Control (RBAC)
            </span>
          </div>
          <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
            Atur batas hak akses per modul sistem untuk setiap peran atau akun staff.
            Contoh: <strong>Akun Admin</strong> memiliki akses ke semua modul, sedangkan <strong>Akun Kasir</strong> hanya dibatasi untuk melihat Katalog Produk dan Promo Toko.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Staf Terdaftar</div>
            <div className="text-sm font-black text-emerald-400">{staffUsers.length} Akun Aktif</div>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedbackMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            &times;
          </button>
        </div>
      )}

      {/* 2. Pemilih Akun Staff (User Selector) */}
      <div className="bg-stone-50 border border-stone-200 rounded-3xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Pilih Akun Staff untuk Dikonfigurasi Hak Aksesnya:</span>
            </h4>
            <p className="text-[11px] text-stone-500">
              Klik salah satu akun di bawah untuk melihat dan mengatur modul apa saja yang boleh diakses.
            </p>
          </div>

          {hasUnsavedChanges && (
            <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full animate-pulse">
              Ada perubahan belum disimpan
            </span>
          )}
        </div>

        {/* User Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {staffUsers.map((user) => {
            const isSelected = user.id === selectedUserId;
            const userPerms = getEffectivePermissions(user.role, user.permissions);
            const userStats = countUserPermissions(userPerms);

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  if (hasUnsavedChanges && activeStaff && activeStaff.id !== user.id) {
                    if (!window.confirm(`Perubahan hak akses untuk ${activeStaff.name} belum disimpan. Lanjutkan beralih akun?`)) {
                      return;
                    }
                  }
                  setSelectedUserId(user.id);
                  setHasUnsavedChanges(false);
                }}
                className={`p-3 rounded-2xl border text-left transition-all relative cursor-pointer ${
                  isSelected
                    ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-white/70 hover:bg-white border-stone-200 hover:border-stone-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      user.role === 'admin'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : user.role === 'supervisor'
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : user.role === 'kasir'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-orange-100 text-orange-900 border border-orange-300'
                    }`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-stone-900 truncate">
                        {user.name}
                      </div>
                      <div className="text-[10px] font-mono text-stone-500">
                        @{user.username}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                    user.role === 'admin' ? 'bg-amber-100 text-amber-900' :
                    user.role === 'supervisor' ? 'bg-blue-100 text-blue-900' :
                    user.role === 'kasir' ? 'bg-emerald-100 text-emerald-900' :
                    'bg-orange-100 text-orange-900'
                  }`}>
                    {user.role}
                  </span>
                </div>

                <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px]">
                  <span className="text-stone-500 font-medium">Izin Aktif:</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded ${
                    userStats.isFullAdmin 
                      ? 'bg-amber-100 text-amber-900' 
                      : userStats.viewCount <= 2 
                      ? 'bg-emerald-100 text-emerald-900' 
                      : 'bg-blue-100 text-blue-900'
                  }`}>
                    {userStats.isFullAdmin ? '👑 Semua Modul' : `${userStats.viewCount}/11 Modul`}
                  </span>
                </div>

                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Panel Konfigurasi Hak Akses User Terpilih */}
      {activeStaff && (
        <div className="bg-white border border-stone-200 rounded-3xl shadow-sm overflow-hidden">
          
          {/* Sub Header User Info & Status */}
          <div className="p-4 sm:p-5 bg-stone-50/80 border-b border-stone-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm ${
                activeStaff.role === 'admin'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : activeStaff.role === 'supervisor'
                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                  : activeStaff.role === 'kasir'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-orange-100 text-orange-900 border border-orange-300'
              }`}>
                {activeStaff.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-base text-stone-900">
                    {activeStaff?.name || 'Staff'}
                  </h4>
                  <span className="text-xs font-mono text-stone-500">
                    (@{activeStaff?.username || 'user'})
                  </span>
                  <span className="text-[10px] bg-stone-200 text-stone-800 font-bold px-2 py-0.5 rounded-full">
                    {getRoleDisplayName(activeStaff?.role || 'kasir')}
                  </span>
                  {Boolean(currentUser && activeStaff && (
                    (currentUser.id && activeStaff.id === currentUser.id) ||
                    (currentUser.username && activeStaff.username && currentUser.username.toLowerCase() === activeStaff.username.toLowerCase())
                  )) && (
                    <span className="text-[9px] bg-blue-100 text-blue-700 font-extrabold px-2 py-0.5 rounded-full">
                      Akun Login Anda
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-stone-600 flex-wrap">
                  <span>Cabang: <strong>{activeStaff?.storeName || 'Semua Cabang'}</strong></span>
                  <span>•</span>
                  <span>PIN Akses: <strong className="font-mono">{activeStaff?.pin || '-'}</strong></span>
                  <span>•</span>
                  <span>Ringkasan: <strong className="text-blue-700">{activeStats.viewCount} Boleh Dilihat</strong>, <strong className="text-emerald-700">{activeStats.editCount} Boleh Diedit</strong></span>
                </div>
              </div>
            </div>

            {/* Tombol Simpan & Uji Coba */}
            <div className="flex items-center gap-2 flex-wrap">
              {Boolean(onSwitchUser && activeStaff && (!currentUser || (
                (currentUser.id && activeStaff.id !== currentUser.id) ||
                (currentUser.username && activeStaff.username && currentUser.username.toLowerCase() !== activeStaff.username.toLowerCase())
              ))) && (
                <button
                  type="button"
                  onClick={() => onSwitchUser(activeStaff)}
                  className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors flex items-center gap-1.5"
                  title="Masuk sebagai akun ini untuk langsung menguji tampilan modul"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Uji Coba Tampilan Akun Ini</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSavePermissions}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Simpan Hak Akses</span>
              </button>
            </div>
          </div>

          {/* 4. Preset Akses Cepat Toolbar */}
          <div className="p-4 sm:p-5 bg-stone-50/50 border-b border-stone-200 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Terapkan Preset Hak Akses Cepat untuk {activeStaff.name}:</span>
              </span>
              <span className="text-[11px] text-stone-500">
                Pilih salah satu template di bawah untuk mengisi izin otomatis
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 pt-1">
              {PERMISSION_PRESETS.map((preset) => {
                const isHighlight = preset.id === 'kasir_produk_promo';
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.01] flex flex-col justify-between ${
                      isHighlight
                        ? 'bg-emerald-50/90 border-emerald-400 ring-1 ring-emerald-400/30'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-stone-900 truncate">
                          {preset.name}
                        </span>
                        <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 shrink-0">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                    {isHighlight && (
                      <div className="mt-1.5 pt-1 border-t border-emerald-200 flex items-center gap-1 text-[9px] font-bold text-emerald-800">
                        <Check className="w-2.5 h-2.5" />
                        <span>Contoh Permintaan Anda</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Filter & Pencarian Modul */}
          <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row gap-2 justify-between items-center bg-white">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Cari modul sistem..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-stone-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'all', label: 'Semua Modul (11)' },
                { id: 'Katalog & Penjualan', label: 'Katalog & Promo' },
                { id: 'Operasional', label: 'Operasional Kasir' },
                { id: 'Pengaturan Toko', label: 'Pengaturan Toko' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    filterCategory === cat.id
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Matriks Hak Akses Modul Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                  <th className="p-3.5">Nama Modul Sistem & Keterangan</th>
                  <th className="p-3.5 text-center w-36">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll('canView')}
                      className="inline-flex items-center gap-1 text-blue-700 hover:underline font-extrabold cursor-pointer"
                      title="Klik untuk centang / lepas semua izin lihat"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Bisa Dilihat</span>
                    </button>
                  </th>
                  <th className="p-3.5 text-center w-36">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll('canEdit')}
                      className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-extrabold cursor-pointer"
                      title="Klik untuk centang / lepas semua izin edit"
                    >
                      <Edit className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Bisa Diedit</span>
                    </button>
                  </th>
                  <th className="p-3.5 text-center w-36">Status Akses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredModules.map((mod) => {
                  const perm = localPermissions[mod.key] || { canView: false, canEdit: false };
                  const isFull = perm.canView && perm.canEdit;
                  const isViewOnly = perm.canView && !perm.canEdit;
                  const isLocked = !perm.canView && !perm.canEdit;

                  return (
                    <tr
                      key={mod.key}
                      className={`hover:bg-stone-50/80 transition-colors ${
                        isLocked ? 'bg-stone-50/30' : ''
                      }`}
                    >
                      {/* Nama Modul */}
                      <td className="p-3.5">
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                            isLocked 
                              ? 'bg-stone-100 border-stone-200 opacity-60' 
                              : 'bg-white border-stone-200 shadow-2xs'
                          }`}>
                            {getModuleIcon(mod.iconName)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold ${isLocked ? 'text-stone-400' : 'text-stone-900'}`}>
                                {mod.name}
                              </span>
                              <span className="text-[9px] font-semibold bg-stone-100 text-stone-600 px-2 py-0.2 rounded-full">
                                {mod.category}
                              </span>
                              {/* Highlight jika modul Produk atau Promo saat kasir */}
                              {activeStaff?.role === 'kasir' && (mod.key === 'products' || mod.key === 'promos') && (
                                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded">
                                  Modul Kasir
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                              {mod.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Checkbox Bisa Dilihat (View) */}
                      <td className="p-3.5 text-center">
                        <label className="inline-flex items-center justify-center p-2 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={perm.canView}
                            onChange={() => handleToggleModule(mod.key, 'canView')}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-stone-300 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Checkbox Bisa Diedit (Edit) */}
                      <td className="p-3.5 text-center">
                        <label className="inline-flex items-center justify-center p-2 rounded-xl hover:bg-emerald-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={perm.canEdit}
                            onChange={() => handleToggleModule(mod.key, 'canEdit')}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5 text-center">
                        {isFull ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Akses Penuh</span>
                          </span>
                        ) : isViewOnly ? (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
                            <Eye className="w-3 h-3 text-blue-600" />
                            <span>Hanya Lihat</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-500 border border-stone-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                            <Lock className="w-3 h-3 text-stone-400" />
                            <span>Terkunci</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 7. Pratinjau Tampilan Staff (Live Preview Simulator) */}
          <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>Pratinjau Navigasi Saat {activeStaff.name} (@{activeStaff.username}) Login:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SYSTEM_MODULES.map((m) => {
                  const perm = localPermissions[m.key];
                  if (!perm?.canView) {
                    return (
                      <span
                        key={m.key}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-stone-200/60 text-stone-400 line-through flex items-center gap-1"
                        title="Modul ini terkunci dan tidak dapat diakses"
                      >
                        <Lock className="w-2.5 h-2.5" />
                        <span>{m.name.split('&')[0].trim()}</span>
                      </span>
                    );
                  }
                  return (
                    <span
                      key={m.key}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border ${
                        perm.canEdit
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-blue-100 text-blue-900 border-blue-300'
                      }`}
                    >
                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                      <span>{m.name.split('&')[0].trim()}</span>
                      {!perm.canEdit && <span className="text-[9px] opacity-75 font-normal">(Lihat)</span>}
                    </span>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSavePermissions}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Simpan Hak Akses Pengguna</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
