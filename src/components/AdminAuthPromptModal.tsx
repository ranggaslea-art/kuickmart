import React, { useState } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  User, 
  Eye, 
  EyeOff, 
  X, 
  AlertCircle, 
  Megaphone,
  Store
} from 'lucide-react';
import { StaffUser } from '../types';
import { INITIAL_STAFF_USERS } from '../data/mockData';
import { getTenantStorageKey } from '../utils/tenantHelper';

interface AdminAuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (authenticatedUser: StaffUser) => void;
  storeName?: string;
  currentSlug?: string;
  staffUsers?: StaffUser[];
  title?: string;
  subtitle?: string;
  requiredModule?: string;
}

export const AdminAuthPromptModal: React.FC<AdminAuthPromptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  storeName = 'LapakOke',
  currentSlug = 'default',
  staffUsers: propStaffUsers,
  title = 'Login Hak Akses Admin',
  subtitle = 'Masukkan ID Pengguna & Password/PIN Admin untuk mengedit iklan dan bonus poin pendaftaran.',
  requiredModule = 'Iklan Member & Promo'
}) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanUser || !cleanPin) {
      setErrorMessage('Harap masukkan ID Pengguna dan Password/PIN.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Ambil daftar staffUsers aktif (dari props atau LocalStorage multi-tenant)
      let availableStaff: StaffUser[] = [];
      if (propStaffUsers && propStaffUsers.length > 0) {
        availableStaff = propStaffUsers;
      } else {
        try {
          const key = getTenantStorageKey('toko_online_staff_users', currentSlug);
          const saved = localStorage.getItem(key);
          availableStaff = saved ? JSON.parse(saved) : INITIAL_STAFF_USERS;
        } catch {
          availableStaff = INITIAL_STAFF_USERS;
        }
      }

      // Pastikan akun default jika belum ada di list
      INITIAL_STAFF_USERS.forEach(def => {
        if (!availableStaff.some(u => (u?.username || '').toLowerCase() === def.username.toLowerCase())) {
          availableStaff.push(def);
        }
      });

      // 2. Cari akun berdasarkan username
      const matchedUser = availableStaff.find(
        u => (u?.username || '').toLowerCase() === cleanUser
      );

      if (!matchedUser) {
        setErrorMessage('ID Pengguna tidak terdaftar dalam sistem.');
        setIsSubmitting(false);
        return;
      }

      // 3. Verifikasi Password / PIN
      if (String(matchedUser.pin).trim() !== cleanPin) {
        setErrorMessage('Password / PIN yang Anda masukkan salah. Silakan periksa kembali.');
        setIsSubmitting(false);
        return;
      }

      // 4. Periksa apakah akun aktif
      if (matchedUser.isActive === false) {
        setErrorMessage('Akun ini sedang dinonaktifkan oleh Administrator.');
        setIsSubmitting(false);
        return;
      }

      // 5. Verifikasi Otoritas: Wajib memiliki peran Admin atau Supervisor
      const isAllowedRole = 
        matchedUser.role === 'admin' || 
        matchedUser.role === 'supervisor' ||
        Boolean(matchedUser.permissions?.promos?.canEdit) ||
        Boolean(matchedUser.permissions?.users?.canEdit);

      if (!isAllowedRole) {
        setErrorMessage(
          `Akses Ditolak: Akun dengan peran "${matchedUser.role.toUpperCase()}" tidak memiliki wewenang untuk mengubah pengaturan ${requiredModule}. Harap gunakan akun Admin atau Supervisor.`
        );
        setIsSubmitting(false);
        return;
      }

      // Simpan session admin aktif
      try {
        sessionStorage.setItem('toko_online_admin_active_user', JSON.stringify(matchedUser));
        sessionStorage.setItem('lapakoke_admin_session', JSON.stringify(matchedUser));
      } catch {}

      // Reset form
      setUsername('');
      setPin('');
      setErrorMessage(null);
      setIsSubmitting(false);

      // Panggil callback berhasil
      onSuccess(matchedUser);
    } catch (err: any) {
      setErrorMessage('Terjadi kendala saat verifikasi autentikasi. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    setPin('');
    setErrorMessage(null);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200"
      >
        {/* Header Modal */}
        <div className="p-6 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 text-white relative">
          <button
            type="button"
            onClick={handleClose}
            title="Tutup Modal"
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Megaphone className="w-5 h-5 text-stone-950" />
            </div>
            <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-400/30 uppercase tracking-wider">
              Khusus Admin Toko
            </span>
          </div>

          <h3 className="font-extrabold text-lg text-white">
            {title}
          </h3>
          <p className="text-xs text-stone-300 mt-1 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Form Login Admin */}
        <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
          
          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Info Hak Akses */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center gap-2 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-[11px] leading-tight">
              Modul ini diproteksi. Hanya akun <strong>Admin</strong> atau <strong>Supervisor</strong> {storeName} yang berhak mengubah promosi ini.
            </span>
          </div>

          {/* Field: Username */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-stone-500" />
              <span>ID Pengguna / Username Admin:</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: admin atau spv..."
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 focus:border-amber-500 focus:bg-white rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
            />
          </div>

          {/* Field: Password / PIN */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-stone-500" />
              <span>Password / PIN Admin:</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan password atau PIN..."
                className="w-full pl-3.5 pr-10 py-2.5 bg-stone-50 border border-stone-300 focus:border-amber-500 focus:bg-white rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Tombol Submit Login */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer mt-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4 text-stone-950" />
            <span>{isSubmitting ? 'Memverifikasi...' : 'Verifikasi & Buka Editor Iklan'}</span>
          </button>

          {/* Tombol Batal & Tutup */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>Batal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
