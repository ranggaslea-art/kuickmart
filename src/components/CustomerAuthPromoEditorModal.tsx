import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Gift, 
  Save, 
  RotateCcw, 
  Eye, 
  Sliders, 
  CheckCircle2, 
  HelpCircle,
  Megaphone,
  Palette,
  ExternalLink,
  Coins,
  Stamp,
  Type,
  FileText
} from 'lucide-react';
import { CustomerAuthPromoConfig } from '../types';
import { 
  DEFAULT_CUSTOMER_AUTH_PROMO, 
  loadCustomerAuthPromoConfig, 
  saveCustomerAuthPromoConfig 
} from '../utils/customerAuthPromoHelper';

interface CustomerAuthPromoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSlug?: string;
  storeName?: string;
  onSaved?: (newConfig: CustomerAuthPromoConfig) => void;
  onOpenCustomerAuthModal?: () => void;
}

const COLOR_THEMES = [
  { id: 'amber', name: 'Amber Gold', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-950', subtext: 'text-amber-800', btn: 'from-amber-500 to-amber-600', icon: 'text-amber-600' },
  { id: 'emerald', name: 'Emerald Fresh', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-950', subtext: 'text-emerald-800', btn: 'from-emerald-500 to-emerald-600', icon: 'text-emerald-600' },
  { id: 'blue', name: 'Royal Blue', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-950', subtext: 'text-blue-800', btn: 'from-blue-600 to-indigo-600', icon: 'text-blue-600' },
  { id: 'purple', name: 'Violet Loyalty', bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-950', subtext: 'text-purple-800', btn: 'from-purple-600 to-indigo-600', icon: 'text-purple-600' },
  { id: 'rose', name: 'Ruby Promo', bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-950', subtext: 'text-rose-800', btn: 'from-rose-500 to-red-600', icon: 'text-rose-600' }
] as const;

export const CustomerAuthPromoEditorModal: React.FC<CustomerAuthPromoEditorModalProps> = ({
  isOpen,
  onClose,
  currentSlug,
  storeName = 'LapakOke',
  onSaved,
  onOpenCustomerAuthModal
}) => {
  const [config, setConfig] = useState<CustomerAuthPromoConfig>(() => loadCustomerAuthPromoConfig(currentSlug));
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [previewAuthTab, setPreviewAuthTab] = useState<'signup' | 'signin'>('signup');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(loadCustomerAuthPromoConfig(currentSlug));
      setSaveSuccess(false);
    }
  }, [isOpen, currentSlug]);

  if (!isOpen) return null;

  const currentTheme = COLOR_THEMES.find(t => t.id === config.accentColor) || COLOR_THEMES[0];

  // Helper quick sync point number in text
  const handleAutoSyncTextsWithPoints = (newPoints: number, newStamps: number) => {
    const formattedPoints = newPoints.toLocaleString('id-ID');
    const newDesc = `Dapatkan langsung ${formattedPoints} Poin Loyalitas + ${newStamps} Stamp Belanja untuk diskon pesanan Anda!`;
    const newBtn = `Daftar Sekarang & Klaim ${formattedPoints} Poin`;
    setConfig(prev => ({
      ...prev,
      bonusPoints: newPoints,
      bonusStamps: newStamps,
      bannerDescription: newDesc,
      submitButtonText: newBtn
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveCustomerAuthPromoConfig(config, currentSlug);
      if (onSaved) onSaved(config);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset semua pengaturan iklan dan poin ke format bawaan (500 Poin)?')) {
      setConfig(DEFAULT_CUSTOMER_AUTH_PROMO);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:px-6 sm:py-5 border-b border-stone-100 flex items-center justify-between gap-3 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-inner">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                  Editor Iklan Sign In / Sign Up
                </h3>
                <span className="text-[10px] bg-amber-400 text-stone-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  Tools Marketing
                </span>
              </div>
              <p className="text-xs text-stone-300 truncate mt-0.5">
                Kustomisasi nominal poin gratis, teks banner promo, dan kata-kata tombol pendaftaran pelanggan {storeName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Switcher on Mobile/Desktop */}
            <div className="hidden sm:flex items-center bg-stone-800 rounded-xl p-1 border border-stone-700">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'editor' ? 'bg-amber-400 text-stone-950 shadow-xs' : 'text-stone-300 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Form Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'preview' ? 'bg-amber-400 text-stone-950 shadow-xs' : 'text-stone-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Tutup Editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MOBILE VIEW SELECTOR */}
        <div className="sm:hidden flex border-b border-stone-200 bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'editor' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
            }`}
          >
            Form Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'preview' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
            }`}
          >
            Live Preview
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-50">
          
          {saveSuccess && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in duration-200 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Pengaturan iklan dan poin pendaftaran berhasil disimpan dan langsung aktif!</span>
              </div>
              {onOpenCustomerAuthModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCustomerAuthModal();
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Tes Buka Modal</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {activeTab === 'editor' ? (
            /* ================= TAB 1: FORMULIR EDITOR ================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Core Fields */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* 1. Pengaturan Poin & Stamp Baru */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-500" />
                      <h4 className="font-extrabold text-sm text-stone-900">
                        1. Nominal Poin & Stamp Pendaftar Baru
                      </h4>
                    </div>
                    <span className="text-[10px] text-stone-400 font-medium">Bisa diganti kapan saja</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Bonus Poin Pelanggan Baru <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={config.bonusPoints}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setConfig(prev => ({ ...prev, bonusPoints: val }));
                          }}
                          className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-black text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                        />
                        <span className="absolute right-3.5 top-2.5 text-xs font-bold text-stone-400 pointer-events-none">
                          Poin
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Bonus Stamp Belanja Awal
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={config.bonusStamps}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setConfig(prev => ({ ...prev, bonusStamps: val }));
                          }}
                          className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-black text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                        />
                        <span className="absolute right-3.5 top-2.5 text-xs font-bold text-stone-400 pointer-events-none">
                          Stamp
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Preset Chips */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1.5">
                      Pilihan Cepat Nominal Poin:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[100, 250, 500, 1000, 2000, 5000].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => handleAutoSyncTextsWithPoints(pts, config.bonusStamps)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            config.bonusPoints === pts
                              ? 'bg-amber-500 text-stone-950 font-black shadow-xs ring-2 ring-amber-400/40'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          }`}
                        >
                          {pts.toLocaleString('id-ID')} Poin
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto Sync Helper Button */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between gap-2">
                    <div className="text-[11px] text-amber-900 leading-snug">
                      Sesuaikan kata-kata judul, deskripsi, dan tombol dengan nominal <strong>{config.bonusPoints.toLocaleString('id-ID')} Poin</strong>?
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAutoSyncTextsWithPoints(config.bonusPoints, config.bonusStamps)}
                      className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                      title="Otomatis menyelaraskan angka di teks iklan"
                    >
                      ⚡ Sinkronkan Teks
                    </button>
                  </div>
                </div>

                {/* 2. Pengaturan Kata-Kata Iklan & Tombol */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-blue-500" />
                    <h4 className="font-extrabold text-sm text-stone-900">
                      2. Kata-Kata Iklan & Tombol Pendaftaran
                    </h4>
                  </div>

                  {/* Saklar Tampilkan Banner */}
                  <div className="flex items-center justify-between p-3 bg-stone-50 border border-stone-200 rounded-2xl">
                    <div>
                      <div className="text-xs font-bold text-stone-900">Tampilkan Banner Promo di Form Pendaftaran</div>
                      <div className="text-[10px] text-stone-500">Jika dinonaktifkan, kotak promo di atas form tidak akan ditampilkan.</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showPromoBanner}
                        onChange={(e) => setConfig(prev => ({ ...prev, showPromoBanner: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                    </label>
                  </div>

                  {/* Judul Banner */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Judul Banner Promo
                    </label>
                    <input
                      type="text"
                      value={config.bannerTitle}
                      onChange={(e) => setConfig(prev => ({ ...prev, bannerTitle: e.target.value }))}
                      placeholder="Contoh: Bonus Pendaftaran Gratis:"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Deskripsi Banner */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Teks Deskripsi Promo Pendaftaran
                    </label>
                    <textarea
                      rows={2}
                      value={config.bannerDescription}
                      onChange={(e) => setConfig(prev => ({ ...prev, bannerDescription: e.target.value }))}
                      placeholder="Contoh: Dapatkan langsung 500 Poin Loyalitas + 1 Stamp Belanja untuk diskon pesanan Anda!"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Tombol Daftar */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Kata-Kata Tombol Pendaftaran <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Sparkles className="w-4 h-4 text-amber-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={config.submitButtonText}
                        onChange={(e) => setConfig(prev => ({ ...prev, submitButtonText: e.target.value }))}
                        placeholder="Contoh: Daftar Sekarang & Klaim 500 Poin"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-extrabold text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">
                      Teks ini tampil di tombol utama bagian bawah form pendaftaran akun baru.
                    </p>
                  </div>

                  {/* Catatan Tab Masuk */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Pesan Edukasi di Tab Masuk (Sign In)
                    </label>
                    <input
                      type="text"
                      value={config.signInNote || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, signInNote: e.target.value }))}
                      placeholder="Contoh: Masuk untuk menggunakan saldo poin dan stamp Anda"
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* 3. Pilihan Tema Warna Banner & Tombol */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-500" />
                    <h4 className="font-extrabold text-sm text-stone-900">
                      3. Tema Warna Promo & Tombol
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {COLOR_THEMES.map((theme) => {
                      const isSelected = (config.accentColor || 'amber') === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, accentColor: theme.id as any }))}
                          className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                              : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-tr ${theme.btn} shrink-0 shadow-2xs`} />
                          <div className="text-xs font-bold truncate">{theme.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Right Column: Live Mockup Preview */}
              <div className="lg:col-span-5 space-y-4">
                <div className="sticky top-2 bg-white rounded-3xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-extrabold text-sm text-stone-900">Pratinjau Hasil Nyata</h4>
                    </div>
                    
                    {/* Toggle mode preview */}
                    <div className="flex bg-stone-100 p-0.5 rounded-xl border border-stone-200">
                      <button
                        type="button"
                        onClick={() => setPreviewAuthTab('signup')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          previewAuthTab === 'signup' ? 'bg-white text-stone-950 shadow-2xs' : 'text-stone-500'
                        }`}
                      >
                        Tab Daftar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewAuthTab('signin')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          previewAuthTab === 'signin' ? 'bg-white text-stone-950 shadow-2xs' : 'text-stone-500'
                        }`}
                      >
                        Tab Masuk
                      </button>
                    </div>
                  </div>

                  {/* Mockup Modal Container */}
                  <div className="border border-stone-200/80 rounded-2xl p-4 bg-stone-50/70 shadow-inner space-y-3.5">
                    
                    {/* Header Mockup */}
                    <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-xs">
                          🛍️
                        </div>
                        <div>
                          <div className="text-[11px] font-extrabold text-stone-900">Akun Pelanggan</div>
                          <div className="text-[9px] text-stone-500">{storeName}</div>
                        </div>
                      </div>
                      <div className="w-5 h-5 rounded-full bg-stone-200 text-stone-400 flex items-center justify-center text-[10px]">
                        ✕
                      </div>
                    </div>

                    {/* Tab Bar Mockup */}
                    <div className="grid grid-cols-2 gap-1 bg-stone-200/70 p-1 rounded-xl">
                      <div className={`py-1.5 text-center text-[11px] font-bold rounded-lg ${
                        previewAuthTab === 'signin' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                      }`}>
                        Masuk Akun
                      </div>
                      <div className={`py-1.5 text-center text-[11px] font-bold rounded-lg ${
                        previewAuthTab === 'signup' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                      }`}>
                        Daftar Akun Baru
                      </div>
                    </div>

                    {previewAuthTab === 'signup' ? (
                      /* Preview Sign Up */
                      <div className="space-y-3">
                        {/* Live Banner */}
                        {config.showPromoBanner && (
                          <div className={`p-3 rounded-2xl border ${currentTheme.bg} ${currentTheme.border} flex items-start gap-2.5 animate-in fade-in`}>
                            <Gift className={`w-4 h-4 ${currentTheme.icon} shrink-0 mt-0.5`} />
                            <div className="text-[11px] leading-relaxed">
                              <span className={`font-black ${currentTheme.text}`}>
                                {config.bannerTitle || 'Bonus Pendaftaran:'}{' '}
                              </span>
                              <span className={currentTheme.subtext}>
                                {config.bannerDescription || `Dapatkan ${config.bonusPoints} poin!`}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Dummy Input Fields */}
                        <div className="space-y-2 opacity-60">
                          <div>
                            <div className="text-[10px] font-bold text-stone-600 mb-0.5">Nama Lengkap Anda *</div>
                            <div className="h-7 bg-white rounded-lg border border-stone-200 px-2 text-[10px] text-stone-400 flex items-center">
                              Contoh: Siti Rahmawati
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-stone-600 mb-0.5">Nomor WhatsApp / HP Aktif *</div>
                            <div className="h-7 bg-white rounded-lg border border-stone-200 px-2 text-[10px] text-stone-400 flex items-center">
                              Contoh: 08123456789
                            </div>
                          </div>
                        </div>

                        {/* Live Submit Button */}
                        <div className={`w-full py-2.5 rounded-xl bg-gradient-to-r ${currentTheme.btn} text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-md`}>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{config.submitButtonText || 'Daftar Sekarang'}</span>
                        </div>
                      </div>
                    ) : (
                      /* Preview Sign In */
                      <div className="space-y-3">
                        {config.signInNote && (
                          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-snug">
                            ℹ️ {config.signInNote}
                          </div>
                        )}
                        <div className="space-y-2 opacity-60">
                          <div>
                            <div className="text-[10px] font-bold text-stone-600 mb-0.5">Nomor WhatsApp / HP atau Email *</div>
                            <div className="h-7 bg-white rounded-lg border border-stone-200 px-2 text-[10px] text-stone-400 flex items-center">
                              08123456789
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-stone-600 mb-0.5">Password / PIN *</div>
                            <div className="h-7 bg-white rounded-lg border border-stone-200 px-2 text-[10px] text-stone-400 flex items-center">
                              ••••••••
                            </div>
                          </div>
                        </div>
                        <div className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5">
                          Masuk ke Akun
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary of active values */}
                  <div className="p-3 bg-stone-100 rounded-2xl text-[11px] text-stone-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Poin pendaftar baru:</span>
                      <strong className="text-stone-900">{config.bonusPoints.toLocaleString('id-ID')} Poin</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Stamp pendaftar baru:</span>
                      <strong className="text-stone-900">{config.bonusStamps} Stamp</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Status banner:</span>
                      <strong className={config.showPromoBanner ? 'text-emerald-700' : 'text-stone-500'}>
                        {config.showPromoBanner ? 'Aktif Tampil' : 'Disembunyikan'}
                      </strong>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          ) : (
            /* ================= TAB 2: FULL PREVIEW ================= */
            <div className="max-w-md mx-auto bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden p-6 space-y-4">
              <div className="text-center pb-2 border-b border-stone-100">
                <span className="text-xs font-black uppercase text-amber-600 tracking-wider">Preview Modal Akun Pelanggan</span>
                <h4 className="text-base font-extrabold text-stone-900 mt-0.5">Pratinjau Nyata untuk Pengunjung</h4>
              </div>

              {/* Live Banner */}
              {config.showPromoBanner && (
                <div className={`p-3.5 rounded-2xl border ${currentTheme.bg} ${currentTheme.border} flex items-start gap-3`}>
                  <Gift className={`w-5 h-5 ${currentTheme.icon} shrink-0 mt-0.5`} />
                  <div className="text-xs leading-relaxed">
                    <span className={`font-black ${currentTheme.text}`}>
                      {config.bannerTitle}{' '}
                    </span>
                    <span className={currentTheme.subtext}>
                      {config.bannerDescription}
                    </span>
                  </div>
                </div>
              )}

              {/* Dummy Form */}
              <div className="space-y-3 opacity-60">
                <div className="h-10 bg-stone-50 border border-stone-200 rounded-xl px-3 flex items-center text-xs text-stone-400">
                  Nama Lengkap Anda
                </div>
                <div className="h-10 bg-stone-50 border border-stone-200 rounded-xl px-3 flex items-center text-xs text-stone-400">
                  Nomor WhatsApp / HP Aktif
                </div>
                <div className="h-10 bg-stone-50 border border-stone-200 rounded-xl px-3 flex items-center text-xs text-stone-400">
                  Buat Password / PIN Masuk
                </div>
              </div>

              {/* Submit Button */}
              <div className={`w-full py-3 rounded-xl bg-gradient-to-r ${currentTheme.btn} text-white font-black text-xs flex items-center justify-center gap-2 shadow-md`}>
                <Sparkles className="w-4 h-4 text-white" />
                <span>{config.submitButtonText}</span>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="p-4 sm:px-6 sm:py-4 border-t border-stone-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
            <span>Reset ke Bawaan (500 Poin)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-bold text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-black text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Simpan Pengaturan Iklan</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
