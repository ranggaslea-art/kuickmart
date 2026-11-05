import React, { useState } from 'react';
import { 
  X, 
  User, 
  Lock, 
  Phone, 
  Mail, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  Gift, 
  CheckCircle2, 
  AlertCircle,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  ShoppingBag,
  Sliders
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MemberProfile, CustomerAuthPromoConfig } from '../types';
import { loadCustomerAuthPromoConfig, DEFAULT_CUSTOMER_AUTH_PROMO } from '../utils/customerAuthPromoHelper';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (member: MemberProfile) => void;
  initialMode?: 'signin' | 'signup';
  storeName?: string;
  currentSlug?: string;
  onOpenPromoEditor?: () => void;
  promoConfig?: CustomerAuthPromoConfig;
}

const LOCAL_STORAGE_ACCOUNTS_KEY = 'lapakoke_customer_accounts';
const LOCAL_STORAGE_SESSION_KEY = 'lapakoke_customer_session';

const COLOR_THEMES = {
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-950', subtext: 'text-amber-800', btn: 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950', icon: 'text-amber-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-950', subtext: 'text-emerald-800', btn: 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white', icon: 'text-emerald-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-950', subtext: 'text-blue-800', btn: 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white', icon: 'text-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-950', subtext: 'text-purple-800', btn: 'from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white', icon: 'text-purple-600' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-950', subtext: 'text-rose-800', btn: 'from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white', icon: 'text-rose-600' }
};

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin',
  storeName = 'LapakOke',
  currentSlug,
  onOpenPromoEditor,
  promoConfig: propPromoConfig
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Active Promo Config
  const [promoConfig, setPromoConfig] = useState<CustomerAuthPromoConfig>(() => 
    propPromoConfig || loadCustomerAuthPromoConfig(currentSlug)
  );

  React.useEffect(() => {
    if (isOpen) {
      setPromoConfig(propPromoConfig || loadCustomerAuthPromoConfig(currentSlug));
    }
  }, [isOpen, currentSlug, propPromoConfig]);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');

  if (!isOpen) return null;

  // Helper normalize phone number to standard key (e.g. 08123456789 -> 08123456789)
  const normalizePhone = (p: string) => {
    let clean = p.replace(/\D/g, '');
    if (clean.startsWith('62')) clean = '0' + clean.slice(2);
    return clean;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanIdentifier = phone.trim();
    const cleanPass = password.trim();

    if (!cleanIdentifier) {
      setErrorMessage('Silakan masukkan nomor WhatsApp / HP atau email Anda.');
      return;
    }
    if (!cleanPass) {
      setErrorMessage('Silakan masukkan Password / PIN Anda.');
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = normalizePhone(cleanIdentifier);
      const customerDocId = `cust_${cleanPhone || cleanIdentifier.replace(/[^a-zA-Z0-9]/g, '_')}`;

      let matchedMember: MemberProfile | null = null;

      // 1. Try to fetch from Firebase Firestore
      try {
        const docRef = doc(db, 'customer_accounts', customerDocId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as MemberProfile;
          if (data.pin === cleanPass || data.password === cleanPass) {
            matchedMember = data;
            // Update lastLogin
            try {
              await updateDoc(docRef, {
                lastLogin: new Date().toISOString()
              });
            } catch {
              // Non-critical
            }
          } else {
            setErrorMessage('Password atau PIN yang Anda masukkan salah. Silakan coba lagi.');
            setLoading(false);
            return;
          }
        }
      } catch (firestoreErr) {
        console.warn('Firestore signin lookup fallback to localStorage', firestoreErr);
      }

      // 2. Fallback to LocalStorage registered accounts
      if (!matchedMember) {
        try {
          const localAccountsRaw = localStorage.getItem(LOCAL_STORAGE_ACCOUNTS_KEY);
          if (localAccountsRaw) {
            const localAccounts: MemberProfile[] = JSON.parse(localAccountsRaw);
            const found = localAccounts.find(
              acc => (normalizePhone(acc.phone) === cleanPhone || acc.email?.toLowerCase() === cleanIdentifier.toLowerCase())
            );
            if (found) {
              if (found.pin === cleanPass || found.password === cleanPass) {
                matchedMember = found;
              } else {
                setErrorMessage('Password atau PIN yang Anda masukkan salah. Silakan periksa kembali.');
                setLoading(false);
                return;
              }
            }
          }
        } catch (localErr) {
          console.warn('LocalStorage accounts read error', localErr);
        }
      }

      if (!matchedMember) {
        setErrorMessage('Akun dengan nomor HP atau email tersebut belum terdaftar. Silakan pilih tab "Daftar Akun Baru" di atas.');
        setLoading(false);
        return;
      }

      // Success
      matchedMember.isRegistered = true;
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(matchedMember));
      setSuccessMessage(`Selamat datang kembali, ${matchedMember.name}!`);

      setTimeout(() => {
        onSuccess(matchedMember!);
        onClose();
      }, 700);

    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat masuk. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanName = name.trim();
    const cleanPhone = normalizePhone(phone);
    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const cleanAddress = address.trim();

    if (!cleanName) {
      setErrorMessage('Silakan isi Nama Lengkap Anda.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMessage('Silakan masukkan nomor WhatsApp / HP yang valid (minimal 10 digit).');
      return;
    }
    if (!cleanPass || cleanPass.length < 4) {
      setErrorMessage('Buat Password atau PIN minimal 4 karakter / angka.');
      return;
    }

    setLoading(true);

    try {
      const customerDocId = `cust_${cleanPhone}`;
      const memberCode = `LK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const barcodeValue = `${cleanPhone.slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;

      const newMember: MemberProfile = {
        id: customerDocId,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail || `${cleanPhone}@pelanggan.lapakoke.com`,
        memberNumber: memberCode,
        barcode: barcodeValue,
        points: promoConfig.bonusPoints ?? 500, // Starter bonus poin fleksibel dari Editor Iklan!
        stamps: promoConfig.bonusStamps ?? 1, // Starter stamp fleksibel dari Editor Iklan!
        tier: 'Bronze',
        joinedDate: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        address: cleanAddress,
        isRegistered: true,
        pin: cleanPass,
        password: cleanPass,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      // 1. Save to Firebase Firestore
      try {
        const docRef = doc(db, 'customer_accounts', customerDocId);
        await setDoc(docRef, newMember);
      } catch (firestoreErr) {
        console.warn('Firestore write warning (offline fallback active):', firestoreErr);
      }

      // 2. Save to LocalStorage accounts list
      try {
        const localAccountsRaw = localStorage.getItem(LOCAL_STORAGE_ACCOUNTS_KEY);
        let localAccounts: MemberProfile[] = [];
        if (localAccountsRaw) {
          try {
            localAccounts = JSON.parse(localAccountsRaw);
          } catch {}
        }
        // Update or add
        const filtered = localAccounts.filter(acc => acc.id !== customerDocId);
        filtered.push(newMember);
        localStorage.setItem(LOCAL_STORAGE_ACCOUNTS_KEY, JSON.stringify(filtered));
      } catch (localErr) {
        console.warn('LocalStorage accounts write error', localErr);
      }

      // 3. Save Active Session
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(newMember));

      const pointsFormatted = (promoConfig.bonusPoints ?? 500).toLocaleString('id-ID');
      setSuccessMessage(`Pendaftaran berhasil! Selamat datang, ${newMember.name}. Bonus ${pointsFormatted} Poin telah ditambahkan ke akun Anda!`);

      setTimeout(() => {
        onSuccess(newMember);
        onClose();
      }, 1000);

    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mendaftar akun. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  const activeTheme = COLOR_THEMES[promoConfig.accentColor || 'amber'] || COLOR_THEMES.amber;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 to-stone-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-md">
              <ShoppingBag className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Akun Pelanggan</h3>
              <p className="text-xs text-stone-300">Belanja & Layanan Chat di {storeName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenPromoEditor && (
              <button
                type="button"
                onClick={onOpenPromoEditor}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-400/20"
                title="Buka Editor Iklan & Bonus Poin Pendaftaran (Wajib Login Admin)"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Editor Iklan (Admin)</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-stone-100 border-b border-stone-200">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-stone-950 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <LogIn className="w-4 h-4 text-amber-600" />
            <span>Masuk Akun</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-stone-950 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>Daftar Akun Baru</span>
          </button>
        </div>

        {/* Notification Alerts */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <div>{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="font-semibold">{successMessage}</div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 max-h-[72vh] overflow-y-auto space-y-4">
          
          {mode === 'signup' ? (
            /* ================= SIGN UP FORM ================= */
            <form onSubmit={handleSignUp} className="space-y-3.5">
              
              {/* Member Perks Highlight */}
              {promoConfig.showPromoBanner && (
                <div className={`p-3 rounded-2xl border ${activeTheme.bg} ${activeTheme.border} flex items-start justify-between gap-2.5 relative group animate-in fade-in`}>
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Gift className={`w-5 h-5 ${activeTheme.icon} shrink-0 mt-0.5`} />
                    <div className="text-xs leading-relaxed">
                      <span className={`font-black ${activeTheme.text}`}>
                        {promoConfig.bannerTitle || 'Bonus Pendaftaran Gratis:'}{' '}
                      </span>
                      <span className={activeTheme.subtext}>
                        {promoConfig.bannerDescription || `Dapatkan langsung ${(promoConfig.bonusPoints ?? 500).toLocaleString('id-ID')} Poin Loyalitas + ${promoConfig.bonusStamps ?? 1} Stamp Belanja untuk diskon pesanan Anda!`}
                      </span>
                    </div>
                  </div>
                  {onOpenPromoEditor && (
                    <button
                      type="button"
                      onClick={onOpenPromoEditor}
                      className="opacity-0 group-hover:opacity-100 px-2 py-1 text-stone-700 hover:text-stone-950 bg-white/90 hover:bg-white border border-stone-200 rounded-lg transition-all shrink-0 cursor-pointer shadow-2xs flex items-center gap-1 text-[11px] font-bold"
                      title="Edit Kata-Kata Iklan & Nominal Poin (Wajib Login Admin)"
                    >
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>Edit (Admin)</span>
                    </button>
                  )}
                </div>
              )}

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nama Lengkap Anda <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Siti Rahmawati"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Nomor WhatsApp / HP */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nomor WhatsApp / HP Aktif <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 08123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  Digunakan untuk konfirmasi pesanan kurir & login member
                </p>
              </div>

              {/* Email (Opsional) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Email <span className="text-stone-400 font-normal">(Opsional)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="Contoh: siti@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Password / PIN */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Buat Password / PIN Masuk <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimal 4 karakter atau 6 digit angka"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Alamat Lengkap (Opsional) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Alamat Pengiriman <span className="text-stone-400 font-normal">(Opsional)</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Contoh: Jl. Anggrek No. 15, RT 02 / RW 04"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-2 py-3 rounded-xl bg-gradient-to-r ${activeTheme.btn} font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{promoConfig.submitButtonText || `Daftar Sekarang & Klaim ${(promoConfig.bonusPoints ?? 500).toLocaleString('id-ID')} Poin`}</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ================= SIGN IN FORM ================= */
            <form onSubmit={handleSignIn} className="space-y-3.5">
              
              {/* Info Banner */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-stone-700 shrink-0" />
                <p className="text-xs text-stone-600">
                  {promoConfig.signInNote || (
                    <>
                      Masuk untuk menyinkronkan <strong>poin belanja</strong>, <strong>riwayat pesanan</strong>, dan <strong>pesan chat</strong> Anda.
                    </>
                  )}
                </p>
              </div>

              {/* Nomor WhatsApp / HP atau Email */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nomor WhatsApp / HP atau Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 08123456789 atau email"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Password / PIN */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700">
                    Password / PIN Masuk <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan Password atau PIN"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-stone-900 hover:bg-black text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-amber-400" />
                    <span>Masuk ke Akun Saya</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Guest Checkout Alternative */}
          <div className="pt-2 border-t border-stone-100 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
            >
              Lanjut sebagai Tamu (Belanja Cepat tanpa Akun) →
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
