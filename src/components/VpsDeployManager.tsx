import React, { useState, useEffect, useRef } from 'react';
import { 
  Server, 
  Rocket, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Cpu, 
  Clock, 
  GitBranch, 
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

interface DeployStatusResponse {
  isDeploying: boolean;
  status: 'idle' | 'running' | 'success' | 'failed';
  lastDeployTime: string | null;
  lastDeployStatus: 'success' | 'failed' | null;
  logs: string[];
  serverInfo: {
    platform: string;
    nodeVersion: string;
    uptimeSeconds: number;
    workingDir: string;
    isProduction: boolean;
    gitBranch?: string;
  };
}

export const VpsDeployManager: React.FC = () => {
  const [statusData, setStatusData] = useState<DeployStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [copiedManual, setCopiedManual] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'webhook' | 'manual'>('console');
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalLogsRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/system/deploy-status');
      if (res.ok) {
        const data: DeployStatusResponse = await res.json();
        setStatusData(data);
      }
    } catch (err) {
      console.error('Gagal mengambil status server:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 1.5s when deploying, or 6s when idle
    const interval = setInterval(() => {
      fetchStatus();
    }, statusData?.isDeploying ? 1500 : 6000);

    return () => clearInterval(interval);
  }, [statusData?.isDeploying]);

  // Auto-scroll terminal log
  useEffect(() => {
    if (autoScroll && terminalLogsRef.current) {
      terminalLogsRef.current.scrollTop = terminalLogsRef.current.scrollHeight;
    }
  }, [statusData?.logs, autoScroll]);

  const handleTriggerDeploy = async () => {
    if (statusData?.isDeploying) return;

    setIsTriggering(true);
    try {
      const res = await fetch('/api/system/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-request': 'true',
        },
        body: JSON.stringify({ source: 'admin_button' }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.message || 'Gagal memulai deployment');
      } else {
        // Immediately refresh status
        await fetchStatus();
      }
    } catch (err: any) {
      alert('Terjadi kesalahan jaringan saat memicu deploy: ' + err.message);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleRestartPm2 = async () => {
    if (!confirm('Apakah Anda yakin ingin me-restart service PM2 di server?')) return;
    try {
      const res = await fetch('/api/system/restart-pm2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-request': 'true',
        },
      });
      const json = await res.json();
      alert(json.message || 'PM2 restart telah dipicu');
      fetchStatus();
    } catch (err: any) {
      alert('Gagal me-restart PM2: ' + err.message);
    }
  };

  const manualCommand = `cd /var/www/kuickmart && git pull && npm run build && pm2 restart kuickmart`;
  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/system/deploy?token=kuickmart_deploy_token_2026`
    : `https://www.toko-online.online/api/system/deploy?token=kuickmart_deploy_token_2026`;

  const copyToClipboard = (text: string, type: 'manual' | 'webhook') => {
    navigator.clipboard.writeText(text);
    if (type === 'manual') {
      setCopiedManual(true);
      setTimeout(() => setCopiedManual(false), 2000);
    } else {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0 menit';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs} jam ${mins} menit`;
    return `${mins} menit`;
  };

  const isDeploying = statusData?.isDeploying || false;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Quick Server Status */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white p-6 shadow-lg border border-indigo-700/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
              <Server className="w-3.5 h-3.5" />
              <span>Otomatisasi Deployment Server VPS</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Pusat Deploy & Update Toko</span>
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h2>
            <p className="text-sm text-blue-200/90 max-w-2xl leading-relaxed">
              Terapkan file pembaruan, fitur baru, dan perubahan kode ke server VPS dalam <strong>1 kali klik</strong> tanpa perlu membuka noVNC atau terminal manual lagi.
            </p>
          </div>

          {/* Quick Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={handleTriggerDeploy}
              disabled={isDeploying || isTriggering}
              className={`px-6 py-3.5 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2.5 transition-all transform active:scale-95 cursor-pointer ${
                isDeploying || isTriggering
                  ? 'bg-amber-500 text-slate-950 opacity-90 cursor-wait animate-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:shadow-emerald-500/25 ring-2 ring-emerald-400/40 font-black'
              }`}
            >
              {isDeploying || isTriggering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Sedang Menerapkan Update...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 text-slate-950" />
                  <span>🚀 Deploy / Update Server Sekarang</span>
                </>
              )}
            </button>

            <button
              onClick={handleRestartPm2}
              disabled={isDeploying}
              title="Restart proses PM2 saja jika hanya ada update konfigurasi"
              className="px-4 py-3.5 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart PM2</span>
            </button>
          </div>
        </div>

        {/* Server Vital Stats Grid */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Status Port & SSL</div>
              <div className="text-white font-semibold flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Port 3000 / HTTPS 443</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Server Uptime</div>
              <div className="text-white font-semibold mt-0.5">
                {statusData?.serverInfo ? formatUptime(statusData.serverInfo.uptimeSeconds) : 'Aktif'}
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Git Branch</div>
              <div className="text-white font-semibold mt-0.5">
                {statusData?.serverInfo?.gitBranch || 'main / master'}
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Runtime Node.js</div>
              <div className="text-white font-semibold mt-0.5">
                {statusData?.serverInfo?.nodeVersion || 'v20.x'} (Debian)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Subtabs Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('console')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'console'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Live Deployment Console {isDeploying && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}</span>
        </button>

        <button
          onClick={() => setActiveTab('webhook')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'webhook'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Rocket className="w-4 h-4" />
          <span>Auto-Deploy (GitHub Webhook)</span>
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'manual'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Copy className="w-4 h-4" />
          <span>Perintah Manual Cadangan</span>
        </button>
      </div>

      {/* 3. Subtab Content */}
      {activeTab === 'console' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-700">Terminal Log Server:</span>
              {statusData?.status === 'running' && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  Mengeksekusi...
                </span>
              )}
              {statusData?.status === 'success' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                  Selesai Sukses
                </span>
              )}
              {statusData?.status === 'failed' && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300 flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                  Gagal
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 text-stone-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Auto-scroll</span>
              </label>

              <button
                onClick={fetchStatus}
                className="text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer"
                title="Perbarui log"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Log</span>
              </button>
            </div>
          </div>

          {/* Terminal Box */}
          <div className="rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden font-mono text-xs">
            {/* Terminal Window Header */}
            <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-2 text-slate-400 text-[11px]">deploy-runner@toko-online-vps:~</span>
              </div>
              <div className="text-slate-500 text-[10px]">
                {statusData?.lastDeployTime ? `Deploy Terakhir: ${new Date(statusData.lastDeployTime).toLocaleTimeString('id-ID')}` : 'Siap Menjalankan Tugas'}
              </div>
            </div>

            {/* Terminal Logs Content */}
            <div
              ref={terminalLogsRef}
              className="p-4 max-h-80 min-h-[160px] overflow-y-auto space-y-1 text-slate-300 select-text leading-relaxed"
            >
              {statusData?.logs && statusData.logs.length > 0 ? (
                statusData.logs.map((log, index) => {
                  let colorClass = 'text-slate-300';
                  if (log.includes('✅') || log.includes('berhasil') || log.includes('100%')) {
                    colorClass = 'text-emerald-400 font-semibold';
                  } else if (log.includes('❌') || log.includes('gagal') || log.includes('error')) {
                    colorClass = 'text-rose-400 font-semibold';
                  } else if (log.includes('⚠️') || log.includes('Sedang')) {
                    colorClass = 'text-amber-400';
                  } else if (log.includes('🚀') || log.includes('⬇️') || log.includes('📦')) {
                    colorClass = 'text-sky-300 font-bold';
                  }
                  return (
                    <div key={index} className={`break-words ${colorClass}`}>
                      {log}
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 italic py-6 text-center">
                  Belum ada log deployment. Klik tombol <strong className="text-slate-400">"🚀 Deploy / Update Server Sekarang"</strong> di atas untuk memulai.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Webhook Tab */}
      {activeTab === 'webhook' && (
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <Rocket className="w-4 h-4 text-indigo-600" />
              <span>Otomatisasi Penuh via GitHub Webhook</span>
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Anda bahkan tidak perlu membuka halaman admin untuk deploy! Setiap kali Anda atau tim melakukan <code>git push</code> ke GitHub, server VPS Anda akan otomatis mendeteksi dan langsung men-deploy versi terbaru sendiri.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700">Webhook Payload URL:</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="w-full text-xs font-mono bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-800 focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {copiedWebhook ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedWebhook ? 'Tersalin!' : 'Salin URL'}</span>
              </button>
            </div>
          </div>

          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 text-xs text-stone-700 space-y-2">
            <div className="font-bold text-stone-900 flex items-center gap-1.5">
              <span>Cara Memasang di GitHub:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
              <li>Buka repositori Anda di GitHub.</li>
              <li>Masuk ke menu <strong>Settings</strong> ➡️ <strong>Webhooks</strong> ➡️ Klik <strong>Add webhook</strong>.</li>
              <li>Paste URL di atas ke kolom <strong>Payload URL</strong>.</li>
              <li>Pilih <strong>Content type</strong>: <code>application/json</code>.</li>
              <li>Pilih <strong>Just the push event</strong> lalu klik tombol hijau <strong>Add webhook</strong>. Selesai!</li>
            </ol>
          </div>
        </div>
      )}

      {/* Manual Fallback Tab */}
      {activeTab === 'manual' && (
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-600" />
              <span>Perintah Manual Terminal (Jika Darurat)</span>
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Jika sewaktu-waktu server tidak dapat diakses lewat web dan Anda harus login lewat noVNC / SSH Rumahweb, jalankan 1 baris perintah ini:
            </p>
          </div>

          <div className="relative">
            <div className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs break-all pr-24 border border-slate-800">
              {manualCommand}
            </div>
            <button
              onClick={() => copyToClipboard(manualCommand, 'manual')}
              className="absolute right-2.5 top-2.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedManual ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedManual ? 'Tersalin!' : 'Salin'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs text-stone-600">
            <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
              <strong>1. cd:</strong> Masuk ke direktori web di VPS
            </div>
            <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
              <strong>2. git pull:</strong> Menarik file pembaruan terbaru
            </div>
            <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
              <strong>3. npm run build:</strong> Mengompilasi kode production
            </div>
            <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
              <strong>4. pm2 restart:</strong> Me-reload server tanpa downtime
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
