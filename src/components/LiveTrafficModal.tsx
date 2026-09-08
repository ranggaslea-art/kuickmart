import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Lock, 
  Unlock, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  Activity, 
  MapPin, 
  TrendingUp, 
  Users, 
  Compass, 
  Calendar, 
  Search, 
  RefreshCw, 
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  Radio,
  Play,
  Pause,
  UserPlus,
  CheckCircle2,
  Globe2,
  Smartphone
} from 'lucide-react';
import { StaffUser } from '../types';

export interface VisitorOriginStat {
  city: string;
  region: string;
  count: number;
  percentage: number;
}

export interface RecentVisitorLog {
  id: string;
  city: string;
  region: string;
  timeAgo: string;
  device: string;
  timestamp?: number;
  isCurrent?: boolean;
}

interface LiveTrafficModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffUsers: StaffUser[];
  todayVisitorNumber?: number;
  todayTotalVisitors?: number;
  totalWebVisitors?: number;
  todayDateFormatted?: string;
  detectedLocation?: { city: string; region: string };
  topOrigins?: VisitorOriginStat[];
  recentVisitors?: RecentVisitorLog[];
  onRefreshData?: () => void;
  isLoading?: boolean;
}

const DEFAULT_ACCOUNTS = [
  { username: 'admin', pin: 'admin123', role: 'admin' as const, name: 'Store Manager (Admin)' },
  { username: 'kasir', pin: '1234', role: 'kasir' as const, name: 'Kasir Shift Toko' },
  { username: 'spv', pin: 'spv2026', role: 'supervisor' as const, name: 'Supervisor Toko' },
  { username: 'gudang', pin: 'gudang2026', role: 'gudang' as const, name: 'Staff Gudang & Stok' },
];

export const LiveTrafficModal: React.FC<LiveTrafficModalProps> = ({
  isOpen,
  onClose,
  staffUsers,
  todayVisitorNumber: propTodayVisitorNumber,
  todayTotalVisitors: propTodayTotalVisitors,
  totalWebVisitors: propTotalWebVisitors,
  todayDateFormatted: propTodayDateFormatted,
  detectedLocation: propDetectedLocation,
  topOrigins: propTopOrigins,
  recentVisitors: propRecentVisitors,
  onRefreshData,
  isLoading: propIsLoading = false,
}) => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<StaffUser | { name: string; username: string; role: string } | null>(() => {
    try {
      const saved = localStorage.getItem('kuickmart_traffic_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [usernameInput, setUsernameInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [searchCity, setSearchCity] = useState('');
  const [isFetchingStats, setIsFetchingStats] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Baru saja');
  const [simulationToast, setSimulationToast] = useState<string | null>(null);

  // Live Stats State
  const [stats, setStats] = useState({
    todayVisitorNumber: propTodayVisitorNumber || 48,
    todayTotalVisitors: propTodayTotalVisitors || 48,
    totalWebVisitors: propTotalWebVisitors || 1385,
    onlineNow: 6,
    todayDateFormatted: propTodayDateFormatted || 'Hari ini',
    detectedLocation: propDetectedLocation || { city: 'Pangandaran', region: 'Jawa Barat' },
    topOrigins: propTopOrigins && propTopOrigins.length > 0 ? propTopOrigins : [
      { city: 'Pangandaran', region: 'Jawa Barat', count: 485, percentage: 35 },
      { city: 'Bandung', region: 'Jawa Barat', count: 320, percentage: 23 },
      { city: 'Jakarta', region: 'DKI Jakarta', count: 260, percentage: 19 },
      { city: 'Surabaya', region: 'Jawa Timur', count: 180, percentage: 13 },
      { city: 'Yogyakarta', region: 'DI Yogyakarta', count: 85, percentage: 6 },
      { city: 'Denpasar', region: 'Bali', count: 55, percentage: 4 },
    ],
    recentVisitors: propRecentVisitors && propRecentVisitors.length > 0 ? propRecentVisitors : [
      { id: '1', city: 'Pangandaran', region: 'Jawa Barat', timeAgo: 'Baru saja', device: 'Web Browser', isCurrent: true },
      { id: '2', city: 'Bandung', region: 'Jawa Barat', timeAgo: '2 mnt lalu', device: 'Mobile Android' },
      { id: '3', city: 'Jakarta', region: 'DKI Jakarta', timeAgo: '5 mnt lalu', device: 'Chrome Desktop' },
    ],
  });

  const fetchLiveStats = async (isBackground = false) => {
    if (!isBackground) setIsFetchingStats(true);
    try {
      const res = await fetch('/api/visitors/stats');
      if (res.ok) {
        const data = await res.json();
        let city = 'Pangandaran';
        let region = 'Jawa Barat';
        try {
          const cachedCity = localStorage.getItem('kuickmart_user_city');
          const cachedRegion = localStorage.getItem('kuickmart_user_region');
          if (cachedCity) city = cachedCity;
          if (cachedRegion) region = cachedRegion;
        } catch {}

        setStats({
          todayVisitorNumber: data.todayVisitorNumber,
          todayTotalVisitors: data.todayTotalVisitors,
          totalWebVisitors: data.totalVisitors,
          onlineNow: data.onlineNow || 6,
          todayDateFormatted: data.todayDateFormatted || 'Hari ini',
          detectedLocation: data.detectedLocation || { city, region },
          topOrigins: data.topOrigins && data.topOrigins.length > 0 ? data.topOrigins : stats.topOrigins,
          recentVisitors: data.recentVisitors && data.recentVisitors.length > 0 ? data.recentVisitors : stats.recentVisitors,
        });

        const now = new Date();
        setLastUpdatedTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} WIB`);

        // Broadcast to main widget
        window.dispatchEvent(new CustomEvent('kuickmart:visitor_updated', {
          detail: {
            todayVisitorNumber: data.todayVisitorNumber,
            todayTotalVisitors: data.todayTotalVisitors,
            totalVisitors: data.totalVisitors,
            detectedLocation: data.detectedLocation || { city, region },
          }
        }));
      }
    } catch (e) {
      console.warn('Traffic modal fetch stats error:', e);
    } finally {
      if (!isBackground) setIsFetchingStats(false);
      if (onRefreshData) onRefreshData();
    }
  };

  // Real-time polling when modal is open and autoRefresh is ON
  useEffect(() => {
    if (!isOpen) return;

    setLoginError(null);
    try {
      const saved = localStorage.getItem('kuickmart_traffic_auth');
      if (saved) setCurrentUser(JSON.parse(saved));
    } catch {}

    fetchLiveStats();

    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      fetchLiveStats(true);
    }, 4000);

    return () => clearInterval(intervalId);
  }, [isOpen, autoRefresh]);

  // Handle Inject Simulated Visitor
  const handleSimulateVisitor = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/visitors/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(prev => ({
          ...prev,
          todayTotalVisitors: data.todayTotalVisitors,
          totalWebVisitors: data.totalVisitors,
          onlineNow: data.onlineNow || prev.onlineNow + 1,
          topOrigins: data.topOrigins || prev.topOrigins,
          recentVisitors: data.recentVisitors || prev.recentVisitors,
        }));

        const now = new Date();
        setLastUpdatedTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} WIB`);

        setSimulationToast(`🟢 Pengunjung baru dari ${data.newVisitor.city} (${data.newVisitor.region}) berhasil masuk!`);
        setTimeout(() => setSimulationToast(null), 4000);

        window.dispatchEvent(new CustomEvent('kuickmart:visitor_updated', {
          detail: {
            todayTotalVisitors: data.todayTotalVisitors,
            totalVisitors: data.totalVisitors,
          }
        }));
      }
    } catch (e) {
      console.error('Failed to simulate visitor:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!isOpen) return null;

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);

    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPin = pinInput.trim();

    if (!cleanUser || !cleanPin) {
      setLoginError('Harap masukkan ID Pengguna dan Password/PIN.');
      return;
    }

    // 1. Cek apakah pengguna ada di daftar staffUsers
    const staffMatch = (staffUsers || []).find(
      u => (u?.username || '').toLowerCase() === cleanUser
    );

    if (staffMatch) {
      if (String(staffMatch.pin).trim() !== cleanPin) {
        setLoginError('Password / PIN yang Anda masukkan salah. Silakan coba kembali.');
        return;
      }
      if (!staffMatch.isActive) {
        setLoginError('Akun ini sedang dinonaktifkan oleh Administrator Toko.');
        return;
      }
      setCurrentUser(staffMatch);
      try {
        localStorage.setItem('kuickmart_traffic_auth', JSON.stringify(staffMatch));
        window.dispatchEvent(new Event('storage'));
      } catch {}
      setUsernameInput('');
      setPinInput('');
      setLoginError(null);
      fetchLiveStats();
      return;
    }

    // 2. Fallback hanya jika username belum terdaftar sama sekali di staffUsers
    const defaultMatch = DEFAULT_ACCOUNTS.find(
      u => (u?.username || '').toLowerCase() === cleanUser && String(u.pin).trim() === cleanPin
    );

    if (defaultMatch) {
      const userObj = {
        id: `usr_${defaultMatch.username}`,
        username: defaultMatch.username,
        name: defaultMatch.name,
        role: defaultMatch.role,
        pin: defaultMatch.pin,
        isActive: true,
        createdAt: '01 Jan 2026',
      };
      setCurrentUser(userObj);
      try {
        localStorage.setItem('kuickmart_traffic_auth', JSON.stringify(userObj));
        window.dispatchEvent(new Event('storage'));
      } catch {}
      setUsernameInput('');
      setPinInput('');
      setLoginError(null);
      fetchLiveStats();
      return;
    }

    setLoginError('ID Pengguna atau Password/PIN salah. Silakan coba kembali.');
  };

  const handleQuickLogin = (user: string, defaultPin: string) => {
    const matchedStaff = (staffUsers || []).find(u => (u?.username || '').toLowerCase() === user.toLowerCase());
    const effectivePin = matchedStaff ? matchedStaff.pin : defaultPin;

    setUsernameInput(user);
    setPinInput(effectivePin);
    setLoginError(null);
    setTimeout(() => {
      if (matchedStaff) {
        if (!matchedStaff.isActive) {
          setLoginError('Akun ini sedang dinonaktifkan oleh Administrator Toko.');
          return;
        }
        setCurrentUser(matchedStaff);
        try {
          localStorage.setItem('kuickmart_traffic_auth', JSON.stringify(matchedStaff));
          window.dispatchEvent(new Event('storage'));
        } catch {}
        setUsernameInput('');
        setPinInput('');
        setLoginError(null);
        fetchLiveStats();
        return;
      }

      const defaultMatch = DEFAULT_ACCOUNTS.find(
        u => (u?.username || '').toLowerCase() === user.toLowerCase() && String(u.pin).trim() === effectivePin
      );
      if (defaultMatch) {
        const userObj = {
          id: `usr_${defaultMatch.username}`,
          username: defaultMatch.username,
          name: defaultMatch.name,
          role: defaultMatch.role,
          pin: defaultMatch.pin,
          isActive: true,
          createdAt: '01 Jan 2026',
        };
        setCurrentUser(userObj);
        try {
          localStorage.setItem('kuickmart_traffic_auth', JSON.stringify(userObj));
          window.dispatchEvent(new Event('storage'));
        } catch {}
        setUsernameInput('');
        setPinInput('');
        setLoginError(null);
        fetchLiveStats();
      }
    }, 50);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('kuickmart_traffic_auth');
      window.dispatchEvent(new Event('storage'));
    } catch {}
  };

  // Filtered Origins by search
  const filteredOrigins = stats.topOrigins.filter(o => 
    o.city.toLowerCase().includes(searchCity.toLowerCase()) || 
    o.region.toLowerCase().includes(searchCity.toLowerCase())
  );

  const activeLoading = isFetchingStats || propIsLoading;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[92vh]">
        
        {/* Top Modal Navigation Bar */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400 border border-white/10">
              <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white tracking-tight">
                  Halaman Live Traffic Analytics
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  REAL-TIME LIVE
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                Statistik Pengunjung & Analitik Asal Wilayah KuickMart Express
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                onClick={handleLogout}
                title="Keluar / Kunci Akses"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-red-500/20 text-red-200 hover:text-red-100 text-xs font-bold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: If Not Authenticated -> Show Login Screen */}
        {!currentUser ? (
          <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center overflow-y-auto">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-inner border border-blue-100 mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>

            <h4 className="text-xl font-black text-stone-900 tracking-tight">
              Akses Halaman Live Traffic Terkunci
            </h4>
            <p className="text-sm text-stone-600 max-w-md mt-1 mb-6">
              Untuk melihat halaman Live Traffic Analytics dan data asal wilayah pengunjung web secara lengkap, Anda wajib melakukan login terlebih dahulu.
            </p>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="w-full max-w-md space-y-4 text-left">
              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ID Pengguna (Username):
                </label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  placeholder="Contoh: admin / kasir / spv"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-stone-50/50 font-medium text-stone-900 text-sm focus:bg-white focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Password / PIN:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value)}
                    placeholder="Masukkan Password / PIN"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-stone-50/50 font-medium text-stone-900 text-sm focus:bg-white focus:ring-2 focus:ring-blue-200 transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-98 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk & Buka Halaman Live Traffic</span>
              </button>

              {/* Quick Login Test Credentials */}
              <div className="pt-4 border-t border-stone-200">
                <p className="text-[11px] font-bold text-stone-500 mb-2">
                  Pilih Akun Cepat untuk Masuk:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin', 'admin123')}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-amber-100 border border-stone-200 hover:border-amber-300 text-stone-800 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    👑 Admin (admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('kasir', '1234')}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-blue-100 border border-stone-200 hover:border-blue-300 text-stone-800 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    🛒 Kasir (kasir)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('spv', 'spv2026')}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-purple-100 border border-stone-200 hover:border-purple-300 text-stone-800 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    👔 SPV (spv)
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* Modal Body: If Authenticated -> Full Live Traffic Analytics Dashboard */
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
            
            {/* Simulation Toast Notification */}
            {simulationToast && (
              <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>{simulationToast}</span>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Real-time</span>
              </div>
            )}

            {/* Authenticated User Status & Live Streaming Control Banner */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-950">
                      Sesi: <strong>{currentUser.name}</strong>
                    </span>
                    <span className="px-2 py-0.2 rounded bg-emerald-200 text-emerald-900 text-[10px] font-extrabold uppercase tracking-wide">
                      {currentUser.role}
                    </span>
                    <span className="text-[10px] text-stone-500 hidden sm:inline">
                      • Terakhir diperbarui: <strong className="text-stone-700">{lastUpdatedTime}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                      <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-stone-400'}`} />
                      {autoRefresh ? 'Live Streaming Aktif (Update tiap 4 dtk)' : 'Live Streaming Dijeda'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Toggle Auto-Refresh, Simulate Visitor, Manual Refresh */}
              <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                <button
                  type="button"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                    autoRefresh
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                      : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                  }`}
                  title={autoRefresh ? 'Jeda pembaruan otomatis' : 'Aktifkan pembaruan otomatis setiap 4 detik'}
                >
                  {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{autoRefresh ? 'Jeda Live' : 'Mulai Live'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateVisitor}
                  disabled={isSimulating}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  title="Simulasikan pengunjung baru dari berbagai kota di Indonesia"
                >
                  <UserPlus className={`w-3.5 h-3.5 ${isSimulating ? 'animate-bounce' : ''}`} />
                  <span>+ Simulasi Pengunjung</span>
                </button>

                <button
                  type="button"
                  onClick={() => fetchLiveStats(false)}
                  disabled={activeLoading}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-xs font-bold text-stone-700 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  title="Perbarui data sekarang"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${activeLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Core Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                  <span>Urutan Anda Hari Ini</span>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-black text-amber-600">
                    #{stats.todayVisitorNumber}
                  </div>
                  <span className="text-[11px] text-stone-500">Kunjungan sesi Anda</span>
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                  <span>Pengunjung Hari Ini</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                    {stats.todayTotalVisitors}
                  </div>
                  <span className="text-[11px] text-stone-500">{stats.todayDateFormatted}</span>
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                  <span>Total Pengunjung Web</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-black text-blue-700">
                    {stats.totalWebVisitors.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[11px] text-stone-500">Kunjungan tercatat di server</span>
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                  <span>Sedang Online Sekarang</span>
                  <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>{stats.onlineNow}</span>
                    <span className="text-xs font-medium text-stone-500">aktif</span>
                  </div>
                  <span className="text-[11px] text-stone-500 truncate block">
                    📍 Lokasi Anda: {stats.detectedLocation.city}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: Sebaran Wilayah Asal Pengunjung Web */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-blue-700" />
                    <h4 className="font-extrabold text-sm sm:text-base text-stone-900">
                      Sebaran Wilayah Asal Pengunjung Web (Darimana Pengunjung Berasal)
                    </h4>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Distribusi geografis pengunjung web KuickMart Express berdasarkan kota & provinsi di Indonesia.
                  </p>
                </div>

                {/* City Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchCity}
                    onChange={e => setSearchCity(e.target.value)}
                    placeholder="Cari kota / wilayah..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Geographic Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredOrigins.map((origin) => {
                  const isCurrentCity = origin.city.toLowerCase() === stats.detectedLocation.city.toLowerCase();
                  return (
                    <div
                      key={origin.city}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrentCity
                          ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-300/40 shadow-xs'
                          : 'bg-stone-50 border-stone-200 hover:bg-stone-100/70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                          <MapPin className={`w-3.5 h-3.5 ${isCurrentCity ? 'text-blue-600' : 'text-stone-500'}`} />
                          <span>{origin.city}</span>
                          {isCurrentCity && (
                            <span className="text-[9px] bg-blue-600 text-white font-black px-1.5 py-0.2 rounded-full">
                              Lokasi Anda
                            </span>
                          )}
                        </span>
                        <span className="text-xs font-black text-stone-800">
                          {origin.count} ({origin.percentage}%)
                        </span>
                      </div>

                      {/* Bar indicator */}
                      <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isCurrentCity ? 'bg-blue-600' : 'bg-stone-600'}`}
                          style={{ width: `${Math.max(origin.percentage, 5)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-stone-500 mt-1 block">
                        {origin.region}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Real-time Live Visitors Feed */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-extrabold text-sm sm:text-base text-stone-900">
                    Aktivitas Kunjungan Terkini (Live Feed Real-Time)
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[11px] text-stone-500 font-medium">
                    Diperbarui otomatis tiap 4 detik
                  </span>
                </div>
              </div>

              <div className="divide-y divide-stone-100">
                {stats.recentVisitors.map((v) => (
                  <div
                    key={v.id}
                    className="py-2.5 flex items-center justify-between text-xs hover:bg-stone-50/80 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${v.isCurrent ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                      <div>
                        <span className="font-bold text-stone-900">{v.city}</span>
                        <span className="text-stone-500 text-[11px]"> ({v.region})</span>
                        {v.isCurrent && (
                          <span className="ml-2 text-[9px] font-black bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
                            Sesi Anda
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-stone-500 text-[11px]">
                      <span className="inline-flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded text-[10px] text-stone-700">
                        <Smartphone className="w-3 h-3 text-stone-500" />
                        {v.device}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{v.timeAgo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
