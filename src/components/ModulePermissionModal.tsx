import React, { useState } from 'react';
import { 
  X, 
  Shield, 
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
  Sparkles, 
  RotateCcw, 
  Info,
  SlidersHorizontal,
  Search
} from 'lucide-react';
import { StaffUser, SystemModuleKey, UserPermissions, ModulePermission } from '../types';
import { 
  SYSTEM_MODULES, 
  DEFAULT_ROLE_PERMISSIONS, 
  getEffectivePermissions, 
  countUserPermissions, 
  getRoleDisplayName 
} from '../utils/permissions';

interface ModulePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: StaffUser;
  onSavePermissions: (userId: string, newPermissions: UserPermissions) => void;
  isCurrentUserAdmin: boolean;
}

export const ModulePermissionModal: React.FC<ModulePermissionModalProps> = ({
  isOpen,
  onClose,
  user,
  onSavePermissions,
  isCurrentUserAdmin,
}) => {
  const [permissions, setPermissions] = useState<UserPermissions>(() => {
    return getEffectivePermissions(user.role, user.permissions);
  });

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleToggle = (key: SystemModuleKey, type: 'canView' | 'canEdit') => {
    setPermissions((prev) => {
      const current = prev[key] || { canView: false, canEdit: false };
      let newView = current.canView;
      let newEdit = current.canEdit;

      if (type === 'canView') {
        newView = !newView;
        // Jika canView dimatikan, maka canEdit otomatis harus mati
        if (!newView) {
          newEdit = false;
        }
      } else if (type === 'canEdit') {
        newEdit = !newEdit;
        // Jika canEdit diaktifkan, maka canView otomatis harus aktif
        if (newEdit) {
          newView = true;
        }
      }

      return {
        ...prev,
        [key]: { canView: newView, canEdit: newEdit },
      };
    });
  };

  const handleApplyPreset = (presetType: 'admin' | 'supervisor' | 'kasir' | 'gudang' | 'view_only' | 'lock_all') => {
    if (presetType === 'admin') {
      const full: UserPermissions = {} as UserPermissions;
      SYSTEM_MODULES.forEach((m) => {
        full[m.key] = { canView: true, canEdit: true };
      });
      setPermissions(full);
    } else if (presetType === 'view_only') {
      const viewOnly: UserPermissions = {} as UserPermissions;
      SYSTEM_MODULES.forEach((m) => {
        viewOnly[m.key] = { canView: true, canEdit: false };
      });
      setPermissions(viewOnly);
    } else if (presetType === 'lock_all') {
      const locked: UserPermissions = {} as UserPermissions;
      SYSTEM_MODULES.forEach((m) => {
        locked[m.key] = { canView: false, canEdit: false };
      });
      setPermissions(locked);
    } else {
      setPermissions({ ...DEFAULT_ROLE_PERMISSIONS[presetType] });
    }
  };

  const handleToggleSelectAll = (field: 'canView' | 'canEdit') => {
    const allActive = SYSTEM_MODULES.every((m) => permissions[m.key]?.[field]);
    setPermissions((prev) => {
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
      return updated;
    });
  };

  const handleSave = () => {
    onSavePermissions(user.id, permissions);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 700);
  };

  const stats = countUserPermissions(permissions);

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
      default: return <SlidersHorizontal className="w-4 h-4 text-stone-600" />;
    }
  };

  const filteredModules = SYSTEM_MODULES.filter((m) => {
    const matchesCat = filterCategory === 'all' || m.category === filterCategory;
    const matchesSearch = 
      m.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      m.description.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-stone-800 to-blue-950 text-white flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base text-white">
                  Hak Akses Modul Staff
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  {getRoleDisplayName(user.role)}
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                Pengaturan hak akses untuk <strong>{user.name}</strong> (@{user.username})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ringkasan & Tombol Preset */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-stone-700">Ringkasan Hak Akses:</span>
              <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                <Eye className="w-3 h-3 text-blue-600" />
                <span>{stats.viewCount} Modul Dapat Dilihat</span>
              </span>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                <Edit className="w-3 h-3 text-emerald-600" />
                <span>{stats.editCount} Modul Dapat Diedit</span>
              </span>
              {stats.isFullAdmin && (
                <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full text-[10px]">
                  👑 Akses Penuh (Super Admin)
                </span>
              )}
            </div>

            <span className="text-[11px] text-stone-500 italic">
              *Hak edit otomatis mengaktifkan izin lihat
            </span>
          </div>

          {/* Quick Presets Buttons */}
          <div>
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Gunakan Preset Hak Akses Cepat:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPreset('admin')}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
              >
                <span>👑 Akses Penuh (Admin)</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('supervisor')}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
              >
                <span>👔 Standar Supervisor</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('kasir')}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
              >
                <span>💳 Standar Kasir Toko</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('gudang')}
                className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
              >
                <span>📦 Standar Gudang & Stok</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('view_only')}
                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <span>👁️ Hanya Lihat Saja</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('lock_all')}
                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <span>🚫 Kunci Semua</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Cari modul sistem..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-stone-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {[
                { id: 'all', label: 'Semua Kategori' },
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
                      : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabel Modul Permissions Matrix */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200 sticky top-0 z-10">
                  <th className="p-3">Nama Modul & Deskripsi</th>
                  <th className="p-3 text-center w-28">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll('canView')}
                      className="inline-flex items-center gap-1 hover:text-blue-700 font-extrabold cursor-pointer"
                      title="Klik untuk centang/lepas semua izin lihat"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Bisa Dilihat</span>
                    </button>
                  </th>
                  <th className="p-3 text-center w-28">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll('canEdit')}
                      className="inline-flex items-center gap-1 hover:text-emerald-700 font-extrabold cursor-pointer"
                      title="Klik untuk centang/lepas semua izin edit"
                    >
                      <Edit className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Bisa Diedit</span>
                    </button>
                  </th>
                  <th className="p-3 text-center w-32">Status Izin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredModules.map((mod) => {
                  const perm = permissions[mod.key] || { canView: false, canEdit: false };
                  const isFull = perm.canView && perm.canEdit;
                  const isViewOnly = perm.canView && !perm.canEdit;
                  const isLocked = !perm.canView && !perm.canEdit;

                  return (
                    <tr 
                      key={mod.key} 
                      className={`hover:bg-stone-50 transition-colors ${
                        isLocked ? 'bg-stone-50/40 text-stone-400' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div className="flex items-start gap-2.5">
                          <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                            isLocked 
                              ? 'bg-stone-100 border-stone-200 opacity-60' 
                              : 'bg-stone-50 border-stone-200'
                          }`}>
                            {getModuleIcon(mod.iconName)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold ${isLocked ? 'text-stone-500' : 'text-stone-900'}`}>
                                {mod.name}
                              </span>
                              <span className="text-[9px] font-semibold bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded">
                                {mod.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                              {mod.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Checkbox Bisa Dilihat */}
                      <td className="p-3 text-center">
                        <label className="inline-flex items-center justify-center p-2 cursor-pointer rounded-xl hover:bg-blue-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={perm.canView}
                            onChange={() => handleToggle(mod.key, 'canView')}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-stone-300 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Checkbox Bisa Diedit */}
                      <td className="p-3 text-center">
                        <label className="inline-flex items-center justify-center p-2 cursor-pointer rounded-xl hover:bg-emerald-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={perm.canEdit}
                            onChange={() => handleToggle(mod.key, 'canEdit')}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3 text-center">
                        {isFull ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Akses Penuh</span>
                          </span>
                        ) : isViewOnly ? (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <Eye className="w-3 h-3 text-blue-600" />
                            <span>Hanya Lihat</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-500 border border-stone-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
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
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset(user.role)}
              className="px-3 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-300 rounded-xl hover:bg-stone-100 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Standar {getRoleDisplayName(user.role)}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Simpan Hak Akses Modul</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
