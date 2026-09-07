import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  TrendingUp, 
  Globe2, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  Activity,
  Compass,
  Calendar,
  Lock,
  Unlock,
  LogIn,
  LogOut,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff
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

interface VisitorCounterWidgetProps {
  visitorId: string;
  staffUsers: StaffUser[];
  onOpenLiveTrafficModal: () => void;
}

const DEFAULT_ACCOUNTS = [
  { username: 'admin', pin: 'admin123', role: 'admin' as const, name: 'Store Manager (Admin)' },
  { username: 'kasir', pin: '1234', role: 'kasir' as const, name: 'Kasir Shift Toko' },
  { username: 'spv', pin: 'spv2026', role: 'supervisor' as const, name: 'Supervisor Toko' },
  { username: 'gudang', pin: 'gudang2026', role: 'gudang' as const, name: 'Staff Gudang & Stok' },
];

export const VisitorCounterWidget: React.FC<VisitorCounterWidgetProps> = ({ 
  visitorId,
  staffUsers,
  onOpenLiveTrafficModal
}) => {
  const [todayVisitorNumber, setTodayVisitorNumber] = useState<number>(() => {
    try {
      const savedNum = localStorage.getItem('kuickmart_today_visitor_num');
      const savedDate = localStorage.getItem('kuickmart_today_date');
      const todayStr = new Date().toISOString().split('T')[0];
      if (savedDate === todayStr && savedNum) {
        return parseInt(savedNum, 10);
      }
    } catch {}
    return 1;
  });

  const [todayTotalVisitors, setTodayTotalVisitors] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('kuickmart_today_total');
      return saved ? parseInt(saved, 10) : 48;
    } catch {
      return 48;
    }
  });

  const [totalWebVisitors, setTotalWebVisitors] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('kuickmart_total_visitors');
      return saved ? parseInt(saved, 10) : 1385;
    } catch {
      return 1385;
    }
  });

  const [todayDateFormatted, setTodayDateFormatted] = useState<string>('Hari ini');
  const [detectedLocation, setDetectedLocation] = useState<{ city: string; region: string }>({
    city: 'Pangandaran',
    region: 'Jawa Barat',
  });

  const [topOrigins, setTopOrigins] = useState<VisitorOriginStat[]>([
    { city: 'Pangandaran', region: 'Jawa Barat', count: 485, percentage: 35 },
    { city: 'Bandung', region: 'Jawa Barat', count: 320, percentage: 23 },
    { city: 'Jakarta', region: 'DKI Jakarta', count: 260, percentage: 19 },
    { city: 'Surabaya', region: 'Jawa Timur', count: 180, percentage: 13 },
    { city: 'Yogyakarta', region: 'DI Yogyakarta', count: 85, percentage: 6 },
    { city: 'Denpasar', region: 'Bali', count: 55, percentage: 4 },
  ]);

  const [recentVisitors, setRecentVisitors] = useState<RecentVisitorLog[]>([
    { id: '1', city: 'Pangandaran', region: 'Jawa Barat', timeAgo: 'Baru saja', device: 'Web Browser', isCurrent: true },
    { id: '2', city: 'Bandung', region: 'Jawa Barat', timeAgo: '2 mnt lalu', device: 'Mobile Android' },
    { id: '3', city: 'Jakarta', region: 'DKI Jakarta', timeAgo: '5 mnt lalu', device: 'Chrome Desktop' },
  ]);

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Authentication State for Traffic Analytics
  const [currentUser, setCurrentUser] = useState<StaffUser | { name: string; username: string; role: string } | null>(() => {
    try {
      const saved = localStorage.getItem('kuickmart_traffic_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Inline Login Form States
  const [showInlineLogin, setShowInlineLogin] = useState(false);
  const [inlineUsername, setInlineUsername] = useState('');
  const [inlinePin, setInlinePin] = useState('');
  const [inlineShowPassword, setInlineShowPassword] = useState(false);
  const [inlineLoginError, setInlineLoginError] = useState<string | null>(null);

  // Synchronize authentication from localStorage periodically or on storage event
  useEffect(() => {
    const syncAuth = () => {
      try {
        const saved = localStorage.getItem('kuickmart_traffic_auth');
        setCurrentUser(saved ? JSON.parse(saved) : null);
      } catch {}
    };

    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, []);

  const handleInlineLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInlineLoginError(null);

    const cleanUser = inlineUsername.trim().toLowerCase();
    const cleanPin = inlinePin.trim();

    if (!cleanUser || !cleanPin) {
      setInlineLoginError('Harap masukkan ID Pengguna dan Password/PIN.');
      return;
    }

    const staffMatch = staffUsers.find(
      u => u.username.toLowerCase() === cleanUser && String(u.pin).trim() === cleanPin
    );

    const defaultMatch = !staffMatch ? DEFAULT_ACCOUNTS.find(
      u => u.username.toLowerCase() === cleanUser && String(u.pin).trim() === cleanPin
    ) : null;

    if (staffMatch) {
      if (!staffMatch.isActive) {
        setInlineLoginError('Akun ini sedang dinonaktifkan oleh Administrator Toko.');
        return;
      }
      setCurrentUser(staffMatch);
      try {
        localStorage.setItem('kuickmart_traffic_auth', JSON.stringify(staffMatch));
      } catch {}
      setShowInlineLogin(false);
      setInlineUsername('');
      setInlinePin('');
      setIsExpanded(true);
      return;
    }

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
      } catch {}
      setShowInlineLogin(false);
      setInlineUsername('');
      setInlinePin('');
      setIsExpanded(true);
      return;
    }

    setInlineLoginError('ID Pengguna atau Password/PIN salah.');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('kuickmart_traffic_auth');
    } catch {}
    setIsExpanded(false);
  };

  const handleToggleExpand = () => {
    if (!currentUser) {
      // Wajib login untuk melihat halaman / detail Live Traffic Analytics
      onOpenLiveTrafficModal();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  // Initialize and register visit with server
  const registerVisit = async () => {
    setIsLoading(true);
    try {
      let clientCity = 'Pangandaran';
      let clientRegion = 'Jawa Barat';

      try {
        const cachedCity = localStorage.getItem('kuickmart_user_city');
        const cachedRegion = localStorage.getItem('kuickmart_user_region');
        if (cachedCity && cachedRegion) {
          clientCity = cachedCity;
          clientRegion = cachedRegion;
        } else {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const res = await fetch('https://ipapi.co/json/', { signal: controller.signal }).catch(() => null);
          clearTimeout(timeoutId);
          if (res && res.ok) {
            const data = await res.json();
            if (data.city) {
              clientCity = data.city;
              clientRegion = data.region || 'Indonesia';
              localStorage.setItem('kuickmart_user_city', clientCity);
              localStorage.setItem('kuickmart_user_region', clientRegion);
            }
          }
        }
      } catch (e) {
        // Graceful fallback
      }

      setDetectedLocation({ city: clientCity, region: clientRegion });

      const res = await fetch('/api/visitors/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          clientCity,
          clientRegion,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTodayVisitorNumber(data.todayVisitorNumber);
        setTodayTotalVisitors(data.todayTotalVisitors);
        setTotalWebVisitors(data.totalVisitors);
        if (data.todayDateFormatted) setTodayDateFormatted(data.todayDateFormatted);
        if (data.topOrigins && data.topOrigins.length > 0) setTopOrigins(data.topOrigins);
        if (data.recentVisitors && data.recentVisitors.length > 0) setRecentVisitors(data.recentVisitors);
        if (data.detectedLocation) setDetectedLocation(data.detectedLocation);

        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem('kuickmart_today_date', todayStr);
        localStorage.setItem('kuickmart_today_visitor_num', String(data.todayVisitorNumber));
        localStorage.setItem('kuickmart_today_total', String(data.todayTotalVisitors));
        localStorage.setItem('kuickmart_total_visitors', String(data.totalVisitors));
      }
    } catch (err) {
      console.warn('Visitor API fallback to local:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    registerVisit();
  }, [visitorId]);

  return (
    <section className="w-full min-w-full px-3 sm:px-6 lg:px-8 py-2">
      <div className="bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-blue-800/40 relative overflow-hidden">
        {/* Ambient Background Accents */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Traffic Analytics
              </span>

              {currentUser ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                  <ShieldCheck className="w-3 h-3 text-blue-400" />
                  <span>Login: {currentUser.name} ({currentUser.role})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Wajib Login untuk Melihat Detail</span>
                </span>
              )}

              <span className="text-xs text-blue-200/70 flex items-center gap-1 hidden sm:inline-flex">
                <Calendar className="w-3 h-3" />
                {todayDateFormatted}
              </span>
            </div>

            {/* Core Prominent Counter Statement */}
            <div className="flex items-baseline gap-2 pt-1 flex-wrap">
              <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>👋 Anda adalah pengunjung ke</span>
                <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-xl bg-amber-400 text-stone-950 font-black text-xl sm:text-2xl shadow-sm border border-amber-300 transform scale-105">
                  #{todayVisitorNumber}
                </span>
                <span>hari ini</span>
              </h2>
            </div>
            <p className="text-xs text-blue-200/80">
              Sistem KuickMart Express menghitung setiap kunjungan secara unik dan real-time per hari ini.
            </p>
          </div>

          {/* Action & Toggle Origin Info */}
          <div className="flex items-center gap-2 shrink-0 self-start md:self-center flex-wrap">
            {/* Button to Open Dedicated Live Traffic Modal */}
            <button
              onClick={onOpenLiveTrafficModal}
              title="Buka Halaman Live Traffic Analytics (Wajib Login)"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border border-blue-400/30"
            >
              {currentUser ? <Unlock className="w-3.5 h-3.5 text-emerald-300" /> : <Lock className="w-3.5 h-3.5 text-amber-300" />}
              <span>{currentUser ? 'Buka Halaman Analytics' : 'Login Live Traffic'}</span>
            </button>

            {/* Toggle Asal Pengunjung Web */}
            <button
              onClick={handleToggleExpand}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-white flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer shadow-xs"
            >
              <Globe2 className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {!currentUser 
                  ? '🔒 Lihat Asal Pengunjung (Login)' 
                  : (isExpanded ? 'Tutup Asal Pengunjung' : 'Lihat Asal Pengunjung Web')}
              </span>
              {currentUser && (isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
            </button>

            {currentUser && (
              <button
                onClick={handleLogout}
                title="Keluar / Kunci Akses Analytics"
                className="px-2 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold flex items-center gap-1 transition-all border border-red-500/30 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}

            <button
              onClick={registerVisit}
              disabled={isLoading}
              title="Perbarui Statistik Kunjungan"
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white transition-all border border-white/10 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4 relative z-10">
          {/* Card 1: Urutan Pengunjung Hari Ini */}
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-blue-200 font-medium">
              <span>Urutan Kunjungan Anda</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-1.5">
              <span className="text-xl sm:text-2xl font-black text-amber-300">
                #{todayVisitorNumber}
              </span>
              <span className="text-[10px] text-blue-200/70 block">dari {todayTotalVisitors} pengunjung hari ini</span>
            </div>
          </div>

          {/* Card 2: Pengunjung Hari Ini */}
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-blue-200 font-medium">
              <span>Pengunjung Hari Ini</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-300">
                {todayTotalVisitors}
              </span>
              <span className="text-[10px] text-emerald-200/70 block">orang telah berkunjung</span>
            </div>
          </div>

          {/* Card 3: Total Seluruh Pengunjung Web */}
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-blue-200 font-medium">
              <span>Total Pengunjung Web</span>
              <Users className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="mt-1.5">
              <span className="text-xl sm:text-2xl font-black text-cyan-300">
                {totalWebVisitors.toLocaleString('id-ID')}
              </span>
              <span className="text-[10px] text-cyan-200/70 block">kunjungan tercatat</span>
            </div>
          </div>

          {/* Card 4: Lokasi Pengunjung Terdeteksi */}
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10 flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-[11px] text-blue-200 font-medium">
              <span>Lokasi Anda Terdeteksi</span>
              <MapPin className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="mt-1.5">
              <span className="text-sm sm:text-base font-black text-white truncate block">
                📍 {detectedLocation.city}
              </span>
              <span className="text-[10px] text-blue-200/70 block truncate">
                {detectedLocation.region} • Indonesia
              </span>
            </div>
          </div>
        </div>

        {/* Section if Logged In: Detailed Origins & Live Stream */}
        {currentUser && isExpanded && (
          <div className="mt-4 pt-4 border-t border-white/15 relative z-10 animate-fadeIn space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-extrabold text-white">
                  Sebaran Wilayah Asal Pengunjung Web ({topOrigins.length} Kota Teratas)
                </h3>
              </div>
              <span className="text-[11px] text-blue-200/70">
                Total Kunjungan Keseluruhan: <strong className="text-white">{totalWebVisitors.toLocaleString('id-ID')}</strong>
              </span>
            </div>

            {/* Geographical Distribution Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {topOrigins.map((origin) => {
                const isUserCity = origin.city.toLowerCase() === detectedLocation.city.toLowerCase();
                return (
                  <div
                    key={origin.city}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isUserCity 
                        ? 'bg-blue-600/30 border-amber-400/60 ring-1 ring-amber-400/40' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <MapPin className={`w-3 h-3 ${isUserCity ? 'text-amber-400' : 'text-blue-300'}`} />
                        <span>{origin.city}</span>
                        {isUserCity && (
                          <span className="text-[9px] bg-amber-400 text-stone-950 font-black px-1.5 py-0.2 rounded-full">
                            Anda
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-blue-200 text-[11px]">
                        {origin.count} ({origin.percentage}%)
                      </span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isUserCity ? 'bg-amber-400' : 'bg-blue-400'
                        }`}
                        style={{ width: `${Math.max(origin.percentage, 5)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-blue-300/60 mt-1 block">
                      {origin.region}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Live Recent Visitors Stream */}
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-200">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pengunjung Terkini yang Mengakses Toko:</span>
                </div>
                <button
                  onClick={onOpenLiveTrafficModal}
                  className="text-[11px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
                >
                  Lihat Tampilan Penuh Halaman Analytics &rarr;
                </button>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {recentVisitors.map((v) => (
                  <div
                    key={v.id}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1.5 border ${
                      v.isCurrent
                        ? 'bg-amber-400/20 text-amber-200 border-amber-400/40'
                        : 'bg-white/5 text-stone-300 border-white/10'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span><strong>{v.city}</strong></span>
                    <span className="text-white/40">•</span>
                    <span className="text-white/70">{v.timeAgo}</span>
                    {v.isCurrent && (
                      <span className="text-[8px] bg-amber-400 text-stone-900 font-extrabold px-1 rounded">
                        Sesi Anda
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
