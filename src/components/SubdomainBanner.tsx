import React, { useState } from 'react';
import { Globe, Store, MapPin, CheckCircle2, XCircle, ArrowLeft, Copy, Check, ExternalLink, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { StoreTenantIdentity } from '../types';

interface SubdomainBannerProps {
  currentSlug: string;
  tenantConfig?: StoreTenantIdentity | null;
  onOpenSubdomainsModal?: () => void;
  onOpenAdminPanel?: () => void;
  onBackToMainStore?: () => void;
}

export const SubdomainBanner: React.FC<SubdomainBannerProps> = ({
  currentSlug,
  tenantConfig,
  onOpenSubdomainsModal,
  onOpenAdminPanel,
  onBackToMainStore,
}) => {
  const [copied, setCopied] = useState(false);

  const isMain = currentSlug === 'default' || currentSlug === 'toko-online' || currentSlug === 'toko-online.online';
  if (isMain) return null;

  const storeName = tenantConfig?.storeName || currentSlug;
  const subdomainHost = `${currentSlug}.toko-online.online`;
  const fullSubdomainUrl = `https://${subdomainHost}`;
  const isActive = tenantConfig?.isActive !== false;
  const logoText = tenantConfig?.logoText || storeName.slice(0, 2).toUpperCase();
  const primaryColor = tenantConfig?.primaryColor || '#2563eb';

  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullSubdomainUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  return (
    <section className="w-full min-w-full px-3 sm:px-6 lg:px-8 pt-3 pb-1">
      <div 
        className={`w-full rounded-2xl border p-3.5 sm:p-4 transition-all shadow-xs ${
          isActive 
            ? 'bg-gradient-to-r from-blue-900 via-indigo-900 to-stone-900 border-blue-700/60 text-white' 
            : 'bg-rose-950 border-rose-800 text-rose-100'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          {/* Identity & Subdomain URL */}
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            {/* Store Avatar */}
            <div 
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-md border border-white/20"
              style={{ backgroundColor: primaryColor }}
            >
              {logoText}
            </div>

            {/* Info details */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 bg-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Store className="w-3 h-3 text-blue-300" />
                  Subdomain Resmi
                </span>

                {isActive ? (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Subdomain Aktif
                  </span>
                ) : (
                  <span className="bg-rose-500/30 text-rose-200 border border-rose-400/40 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-rose-400" />
                    Dinonaktifkan
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-black text-white truncate tracking-tight">
                {storeName}
              </h2>

              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-blue-100/90 font-mono">
                <span className="bg-black/30 border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold">
                  <Globe className="w-3 h-3 text-cyan-300" />
                  <span>{subdomainHost}</span>
                </span>

                <button
                  type="button"
                  onClick={handleCopyUrl}
                  title="Salin tautan subdomain resmi"
                  className="bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-sans font-bold transition active:scale-95 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Tersalin' : 'Salin URL'}</span>
                </button>

                {tenantConfig?.city && (
                  <span className="hidden sm:flex items-center gap-1 text-[11px] font-sans text-stone-300">
                    <MapPin className="w-3 h-3 text-rose-400" />
                    <span>{tenantConfig.city}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Row - Responsif Konsisten untuk HP dan Tablet */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-white/10 shrink-0">
            {onOpenSubdomainsModal && (
              <button
                type="button"
                onClick={onOpenSubdomainsModal}
                className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-white/20 whitespace-nowrap shadow-xs"
                title="Buka Info & Checklist Status Subdomain"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                <span>Info Subdomain</span>
              </button>
            )}

            {onOpenAdminPanel && (
              <button
                type="button"
                onClick={onOpenAdminPanel}
                className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
                title="Buka Pengaturan Toko & DOKU"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                <span>Kelola Toko</span>
              </button>
            )}

            {onBackToMainStore && (
              <button
                type="button"
                onClick={onBackToMainStore}
                className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-stone-800/90 hover:bg-stone-800 text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-white/10 whitespace-nowrap"
                title="Kembali ke Domain Induk toko-online.online"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span>Domain Utama</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
