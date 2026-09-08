import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  TrendingUp, 
  Sparkles, 
  RefreshCw,
  Activity,
  Lock,
  Unlock,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { StaffUser } from '../types';

interface VisitorCounterWidgetProps {
  visitorId: string;
  staffUsers: StaffUser[];
  onOpenLiveTrafficModal: () => void;
}

export const VisitorCounterWidget: React.FC<VisitorCounterWidgetProps> = ({ 
  visitorId,
  staffUsers: _staffUsers,
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

  const [detectedLocation, setDetectedLocation] = useState<{ city: string; region: string }>({
    city: 'Pangandaran',
    region: 'Jawa Barat',
  });

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

  // Synchronize authentication from localStorage periodically or on storage event
  useEffect(() => {
    const syncAuth = () => {
      try {
        const saved = localStorage.getItem('kuickmart_traffic_auth');
        setCurrentUser(saved ? JSON.parse(saved) : null);
      } catch {}
    };

    const handleVisitorUpdate = (e: any) => {
      if (e.detail) {
        if (e.detail.todayVisitorNumber !== undefined) setTodayVisitorNumber(e.detail.todayVisitorNumber);
        if (e.detail.todayTotalVisitors !== undefined) setTodayTotalVisitors(e.detail.todayTotalVisitors);
        if (e.detail.totalVisitors !== undefined) setTotalWebVisitors(e.detail.totalVisitors);
        if (e.detail.detectedLocation) setDetectedLocation(e.detail.detectedLocation);
      }
    };

    window.addEventListener('storage', syncAuth);
    window.addEventListener('kuickmart:visitor_updated', handleVisitorUpdate);
    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('kuickmart:visitor_updated', handleVisitorUpdate);
    };
  }, []);

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
    // Poll visitor stats every 15 seconds to keep counters fresh
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/visitors/stats?visitorId=${encodeURIComponent(visitorId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.todayTotalVisitors !== undefined) setTodayTotalVisitors(data.todayTotalVisitors);
          if (data.totalVisitors !== undefined) setTotalWebVisitors(data.totalVisitors);
          if (data.todayVisitorNumber !== undefined) setTodayVisitorNumber(data.todayVisitorNumber);
        }
      } catch {}
    }, 15000);

    return () => clearInterval(interval);
  }, [visitorId]);

  return (
    <section className="w-full min-w-full px-3 sm:px-6 lg:px-8 mt-6 mb-2">
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-2.5 sm:px-4 sm:py-2.5 shadow-sm border border-blue-800/40 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        
        {/* Left Side: Badge + Prominent Order Counter + Compact Inline Metrics */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Live Indicator Pill */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE TRAFFIC</span>
          </div>

          {/* Visitor Number Pill */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <span className="text-blue-200/90 hidden sm:inline">Pengunjung ke</span>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-amber-400 text-stone-950 font-black text-xs shadow-2xs border border-amber-300">
              #{todayVisitorNumber}
            </span>
            <span className="text-blue-200/90">hari ini</span>
          </div>

          {/* Divider */}
          <span className="text-blue-400/40 hidden md:inline">•</span>

          {/* Compact Inline Stats */}
          <div className="flex items-center gap-2.5 text-[11px] text-blue-200/80 flex-wrap">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span><strong>{todayTotalVisitors}</strong> hari ini</span>
            </span>

            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400" />
              <span><strong>{totalWebVisitors.toLocaleString('id-ID')}</strong> total</span>
            </span>

            <span className="flex items-center gap-1 hidden lg:inline-flex">
              <MapPin className="w-3 h-3 text-red-400" />
              <span className="truncate max-w-[130px]">{detectedLocation.city}</span>
            </span>
          </div>
        </div>

        {/* Right Side: Auth status + Action Button to Full Live Traffic Analytics */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {currentUser ? (
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>{currentUser.name}</span>
            </span>
          ) : null}

          {/* Button to Open Dedicated Live Traffic Modal */}
          <button
            onClick={onOpenLiveTrafficModal}
            title={currentUser ? "Lihat Analitik Geografis & Log Pengunjung" : "Login untuk Melihat Detail Wilayah & Live Feed"}
            className="px-2.5 py-1 rounded-xl bg-blue-600/90 hover:bg-blue-600 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer border border-blue-400/30"
          >
            {currentUser ? (
              <Unlock className="w-3 h-3 text-emerald-300" />
            ) : (
              <Lock className="w-3 h-3 text-amber-300" />
            )}
            <span>{currentUser ? 'Buka Analytics' : 'Lihat Detail (Login)'}</span>
            <ChevronRight className="w-3 h-3 text-blue-200" />
          </button>

          {/* Quick Refresh */}
          <button
            onClick={registerVisit}
            disabled={isLoading}
            title="Perbarui data kunjungan"
            className="p-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white transition-all border border-white/10 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>
    </section>
  );
};
