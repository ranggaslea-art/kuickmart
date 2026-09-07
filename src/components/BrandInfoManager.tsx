import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  RotateCcw, 
  Eye, 
  Check, 
  X, 
  Upload, 
  Layout, 
  ShieldCheck, 
  Truck, 
  Clock, 
  CreditCard, 
  Store as StoreIcon, 
  Headphones, 
  BadgePercent, 
  MapPin, 
  CheckCircle2, 
  Heart, 
  Star, 
  Copy, 
  ExternalLink,
  ChevronRight,
  Layers,
  HelpCircle,
  Link as LinkIcon
} from 'lucide-react';
import { BrandHeaderFooterConfig, FooterSection, FooterFeatureItem, FooterQuickLink, FooterIconType } from '../types';
import { INITIAL_BRAND_CONFIG } from '../data/mockData';
import { compressImageFile } from '../utils/imageHelper';

interface BrandInfoManagerProps {
  brandConfig: BrandHeaderFooterConfig;
  onUpdateBrandConfig: (config: BrandHeaderFooterConfig) => void;
}

export const BrandInfoManager: React.FC<BrandInfoManagerProps> = ({
  brandConfig,
  onUpdateBrandConfig,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'header' | 'footer_profile' | 'sections' | 'links' | 'preview'>('header');
  const onUpdateRef = useRef(onUpdateBrandConfig);
  useEffect(() => {
    onUpdateRef.current = onUpdateBrandConfig;
  }, [onUpdateBrandConfig]);

  const [formData, _setFormData] = useState<BrandHeaderFooterConfig>(() => JSON.parse(JSON.stringify(brandConfig)));

  // Sync internal form data if external brandConfig prop updates
  useEffect(() => {
    if (brandConfig) {
      _setFormData(JSON.parse(JSON.stringify(brandConfig)));
    }
  }, [brandConfig]);

  // Robust setFormData that automatically updates local state, parent App state, localStorage, and broadcasts
  const setFormData = (updater: BrandHeaderFooterConfig | ((prev: BrandHeaderFooterConfig) => BrandHeaderFooterConfig)) => {
    _setFormData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (onUpdateRef.current) {
        onUpdateRef.current(next);
      }
      try {
        localStorage.setItem('kuickmart_brand_config', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('brand_config_updated', { detail: next }));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // States for adding / editing a feature item in a section
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ sectionId: string; item: FooterFeatureItem } | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [newItemSubtext, setNewItemSubtext] = useState('');
  const [newItemIcon, setNewItemIcon] = useState<FooterIconType>('truck');

  // States for adding a brand new section
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionType, setNewSectionType] = useState<FooterSection['type']>('features_list');
  const [newSectionContent, setNewSectionContent] = useState('');

  // States for adding a footer link
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('#');

  // Logo gradient options
  const LOGO_GRADIENT_PRESETS = [
    { label: 'Blue to Amber (Default)', value: 'from-blue-700 via-blue-600 to-amber-500' },
    { label: 'Navy Indigo to Red (Indomaret Style)', value: 'from-blue-800 via-blue-600 to-red-600' },
    { label: 'Red Rose to Amber (Alfagift Style)', value: 'from-red-600 via-rose-500 to-amber-500' },
    { label: 'Emerald Teal to Cyan (Fresh Eco)', value: 'from-emerald-600 via-teal-600 to-cyan-500' },
    { label: 'Purple Violet to Pink (Modern)', value: 'from-purple-700 via-violet-600 to-pink-500' },
    { label: 'Dark Slate Charcoal (Luxury)', value: 'from-stone-900 via-stone-800 to-stone-700' },
  ];

  // Badge color presets
  const BADGE_COLOR_PRESETS = [
    { label: 'Merah Express', value: 'bg-red-600' },
    { label: 'Biru Primary', value: 'bg-blue-600' },
    { label: 'Hijau Segar', value: 'bg-emerald-600' },
    { label: 'Oranye / Amber', value: 'bg-amber-500' },
    { label: 'Ungu Premium', value: 'bg-purple-600' },
  ];

  // Icon options dictionary
  const ICON_MAP: Record<FooterIconType, { icon: React.ReactNode; label: string }> = {
    'truck': { icon: <Truck className="w-4 h-4 text-blue-600" />, label: 'Pengiriman / Truk' },
    'shield-check': { icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />, label: 'Keamanan / Original' },
    'sparkles': { icon: <Sparkles className="w-4 h-4 text-amber-500" />, label: 'Poin & Hadiah' },
    'clock': { icon: <Clock className="w-4 h-4 text-sky-600" />, label: 'Jam Operasional / Waktu' },
    'credit-card': { icon: <CreditCard className="w-4 h-4 text-indigo-600" />, label: 'Metode Pembayaran' },
    'store': { icon: <StoreIcon className="w-4 h-4 text-rose-600" />, label: 'Outlet Toko' },
    'headphones': { icon: <Headphones className="w-4 h-4 text-teal-600" />, label: 'Bantuan & Customer Service' },
    'badge-percent': { icon: <BadgePercent className="w-4 h-4 text-orange-600" />, label: 'Diskon & Promo' },
    'map-pin': { icon: <MapPin className="w-4 h-4 text-red-600" />, label: 'Lokasi & Alamat' },
    'check-circle': { icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, label: 'Centang / Terverifikasi' },
    'heart': { icon: <Heart className="w-4 h-4 text-pink-600" />, label: 'Favorit / Kepuasan' },
    'star': { icon: <Star className="w-4 h-4 text-yellow-500" />, label: 'Bintang & Kualitas' },
  };

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setFeedbackNotice({ type, message });
    setTimeout(() => {
      setFeedbackNotice(null);
    }, 4000);
  };

  const handleSaveAll = () => {
    const updated = {
      ...formData,
      updatedAt: new Date().toISOString(),
    };
    setFormData(updated);
    showNotification('Konfigurasi identitas Brand, Header, dan Footer berhasil disimpan dan langsung aktif di halaman toko!');
  };

  const handleResetToDefault = () => {
    if (confirm('Apakah Anda yakin ingin mengembalikan semua informasi Brand, Header, dan Footer ke konfigurasi bawaan pabrik?')) {
      const resetData = JSON.parse(JSON.stringify(INITIAL_BRAND_CONFIG));
      setFormData(resetData);
      showNotification('Informasi berhasil di-reset ke nilai default pabrik.', 'info');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingLogo(true);
      const compressedDataUrl = await compressImageFile(file, 400, 0.85);
      setFormData(prev => ({
        ...prev,
        brandLogoImageUrl: compressedDataUrl,
      }));
      showNotification('Logo gambar berhasil diunggah!');
    } catch (err) {
      console.error(err);
      alert('Gagal memproses gambar logo. Pastikan file adalah format JPG atau PNG.');
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  // --- ITEM MANAGEMENT IN SECTIONS ---
  const handleOpenAddItem = (sectionId: string) => {
    setTargetSectionId(sectionId);
    setEditingItem(null);
    setNewItemText('');
    setNewItemSubtext('');
    setNewItemIcon('truck');
  };

  const handleOpenEditItem = (sectionId: string, item: FooterFeatureItem) => {
    setTargetSectionId(sectionId);
    setEditingItem({ sectionId, item });
    setNewItemText(item.text);
    setNewItemSubtext(item.subtext || '');
    setNewItemIcon(item.icon);
  };

  const handleSaveItem = () => {
    if (!targetSectionId || !newItemText.trim()) return;

    setFormData(prev => {
      const nextSections = prev.sections.map(sec => {
        if (sec.id !== targetSectionId) return sec;
        const currentItems = sec.items || [];

        if (editingItem) {
          // Edit existing item
          const updatedItems = currentItems.map(it => {
            if (it.id === editingItem.item.id) {
              return {
                ...it,
                text: newItemText.trim(),
                subtext: newItemSubtext.trim() || undefined,
                icon: newItemIcon,
              };
            }
            return it;
          });
          return { ...sec, items: updatedItems };
        } else {
          // Add new item
          const newItem: FooterFeatureItem = {
            id: `feat_${Date.now()}`,
            text: newItemText.trim(),
            subtext: newItemSubtext.trim() || undefined,
            icon: newItemIcon,
          };
          return { ...sec, items: [...currentItems, newItem] };
        }
      });

      return { ...prev, sections: nextSections };
    });

    setTargetSectionId(null);
    setEditingItem(null);
    setNewItemText('');
    setNewItemSubtext('');
    showNotification(editingItem ? 'Poin informasi berhasil diperbarui!' : 'Poin informasi baru berhasil ditambahkan!');
  };

  const handleDeleteItem = (sectionId: string, itemId: string) => {
    if (confirm('Hapus poin informasi ini dari seksi footer?')) {
      setFormData(prev => ({
        ...prev,
        sections: prev.sections.map(sec => {
          if (sec.id !== sectionId) return sec;
          return {
            ...sec,
            items: (sec.items || []).filter(it => it.id !== itemId),
          };
        }),
      }));
      showNotification('Poin informasi berhasil dihapus.');
    }
  };

  // --- SECTION MANAGEMENT ---
  const handleAddNewSection = () => {
    if (!newSectionTitle.trim()) return;

    const newSec: FooterSection = {
      id: `sec_${Date.now()}`,
      title: newSectionTitle.trim(),
      type: newSectionType,
      orderSeq: formData.sections.length + 1,
      isVisible: true,
      content: newSectionType !== 'features_list' ? (newSectionContent.trim() || undefined) : undefined,
      items: newSectionType === 'features_list' ? [] : undefined,
    };

    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, newSec],
    }));

    setIsAddingSection(false);
    setNewSectionTitle('');
    setNewSectionContent('');
    showNotification(`Seksi kolom footer "${newSec.title}" berhasil ditambahkan!`);
  };

  const handleDeleteSection = (sectionId: string) => {
    const sec = formData.sections.find(s => s.id === sectionId);
    if (confirm(`Apakah Anda yakin ingin menghapus seksi kolom "${sec?.title || 'ini'}"?`)) {
      setFormData(prev => ({
        ...prev,
        sections: prev.sections.filter(s => s.id !== sectionId),
      }));
      showNotification('Seksi kolom berhasil dihapus.');
    }
  };

  const handleToggleSectionVisibility = (sectionId: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === sectionId ? { ...s, isVisible: !s.isVisible } : s),
    }));
  };

  // --- QUICK LINKS MANAGEMENT ---
  const handleAddNewLink = () => {
    if (!newLinkLabel.trim()) return;
    const newLink: FooterQuickLink = {
      id: `link_${Date.now()}`,
      label: newLinkLabel.trim(),
      url: newLinkUrl.trim() || '#',
    };
    setFormData(prev => ({
      ...prev,
      bottomLinks: [...prev.bottomLinks, newLink],
    }));
    setIsAddingLink(false);
    setNewLinkLabel('');
    setNewLinkUrl('#');
    showNotification(`Link kaki "${newLink.label}" berhasil ditambahkan!`);
  };

  const handleDeleteLink = (linkId: string) => {
    setFormData(prev => ({
      ...prev,
      bottomLinks: prev.bottomLinks.filter(l => l.id !== linkId),
    }));
    showNotification('Link kaki berhasil dihapus.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header Manager Title */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white p-5 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-700/60 rounded-xl">
              <Layout className="w-5 h-5 text-amber-300" />
            </div>
            <h3 className="text-base font-extrabold tracking-tight">
              Kelola Info Brand, Header & Footer
            </h3>
            <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
              Modul Kustomisasi
            </span>
          </div>
          <p className="text-xs text-blue-200 mt-1 max-w-2xl">
            Tambah, ubah, atau hapus teks logo, slogan, nama brand, informasi keunggulan layanan, metode pembayaran, jam operasional, dan link navigasi kaki toko.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetToDefault}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Kembalikan ke konfigurasi default pabrik"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Bawaan</span>
          </button>
          <button
            onClick={handleSaveAll}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-stone-950 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {feedbackNotice && (
        <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-all animate-in fade-in duration-200 ${
          feedbackNotice.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-blue-50 text-blue-900 border border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackNotice.message}</span>
          </div>
          <button onClick={() => setFeedbackNotice(null)} className="text-stone-400 hover:text-stone-700 text-sm font-bold">×</button>
        </div>
      )}

      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('header')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === 'header'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <span>1. Header & Identitas Logo</span>
        </button>

        <button
          onClick={() => setActiveSubTab('footer_profile')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === 'footer_profile'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <span>2. Profil & Deskripsi Footer</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sections')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === 'sections'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <span>3. Kolom & Poin Layanan ({formData.sections.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('links')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === 'links'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <span>4. Hak Cipta & Link Kaki</span>
        </button>

        <button
          onClick={() => setActiveSubTab('preview')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === 'preview'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Pratinjau Langsung (Preview)</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* SUBTAB 1: HEADER & LOGO BRAND */}
      {/* ========================================================= */}
      {activeSubTab === 'header' && (
        <div className="space-y-6">
          {/* Live Preview Box of Header Brand */}
          <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Pratinjau Langsung Header Toko</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 flex items-center justify-between flex-wrap gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                {/* Logo Box */}
                {formData.brandLogoImageUrl ? (
                  <img
                    src={formData.brandLogoImageUrl}
                    alt="Logo Toko"
                    className="w-10 h-10 rounded-xl object-cover border border-stone-200 shadow-2xs"
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${formData.brandLogoBgGradient} flex items-center justify-center text-white font-black text-xl tracking-wider shadow-2xs`}>
                    {formData.brandLogoText || 'KM'}
                  </div>
                )}

                {/* Brand Text & Badge */}
                <div>
                  <div className="flex items-center gap-1 leading-none">
                    <span className="font-extrabold text-lg text-blue-900 tracking-tight">
                      {formData.brandNamePart1 || 'KUICK'}
                    </span>
                    <span className="font-black text-lg text-amber-500 tracking-tight">
                      {formData.brandNamePart2 || 'MART'}
                    </span>
                    {formData.showBrandBadge && formData.brandBadgeText && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${formData.brandBadgeColor} text-white px-1.5 py-0.5 rounded ml-1`}>
                        {formData.brandBadgeText}
                      </span>
                    )}
                  </div>
                  {formData.showTagline && formData.tagline && (
                    <p className="text-[10px] font-medium text-stone-500 mt-0.5">
                      {formData.tagline}
                    </p>
                  )}
                </div>
              </div>

              {/* Operating status badge */}
              {formData.showOperatingHoursBadge && formData.operatingHoursBadgeText && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{formData.operatingHoursBadgeText}</span>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Box 1: Logo & Inisial */}
            <div className="bg-white border border-stone-200 p-4 rounded-2xl space-y-4">
              <h4 className="font-extrabold text-xs text-stone-900 flex items-center gap-1.5">
                <StoreIcon className="w-4 h-4 text-blue-600" />
                <span>Simbol & Logo Toko</span>
              </h4>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Inisial Logo (Teks Singkat)
                </label>
                <input
                  type="text"
                  value={formData.brandLogoText}
                  onChange={e => setFormData({ ...formData, brandLogoText: e.target.value })}
                  maxLength={5}
                  placeholder="KM"
                  className="w-full text-xs font-bold px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-stone-400 mt-1">Muncul jika tidak menggunakan gambar logo custom (maks 5 huruf).</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Warna Gradasi Kotak Logo
                </label>
                <select
                  value={formData.brandLogoBgGradient}
                  onChange={e => setFormData({ ...formData, brandLogoBgGradient: e.target.value })}
                  className="w-full text-xs font-semibold px-3 py-2 border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                >
                  {LOGO_GRADIENT_PRESETS.map((p, idx) => (
                    <option key={idx} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Atau Unggah Gambar Logo Kustom (PNG/JPG)
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingLogo ? 'Mengunggah...' : 'Pilih File Logo'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className="hidden"
                    />
                  </label>
                  {formData.brandLogoImageUrl && (
                    <button
                      onClick={() => setFormData({ ...formData, brandLogoImageUrl: '' })}
                      className="px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200"
                      title="Hapus gambar logo dan gunakan inisial teks"
                    >
                      Hapus Logo Gambar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Box 2: Nama Brand & Tagline */}
            <div className="bg-white border border-stone-200 p-4 rounded-2xl space-y-4">
              <h4 className="font-extrabold text-xs text-stone-900 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Nama Brand & Slogan Toko</span>
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nama Bagian 1 (Biru)
                  </label>
                  <input
                    type="text"
                    value={formData.brandNamePart1}
                    onChange={e => setFormData({ ...formData, brandNamePart1: e.target.value })}
                    placeholder="KUICK"
                    className="w-full text-xs font-bold px-3 py-2 border border-stone-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nama Bagian 2 (Oranye)
                  </label>
                  <input
                    type="text"
                    value={formData.brandNamePart2}
                    onChange={e => setFormData({ ...formData, brandNamePart2: e.target.value })}
                    placeholder="MART"
                    className="w-full text-xs font-bold px-3 py-2 border border-stone-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Badge */}
              <div className="pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-stone-700">Badge Tambahan (Label Kecil)</label>
                  <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showBrandBadge}
                      onChange={e => setFormData({ ...formData, showBrandBadge: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Tampilkan</span>
                  </label>
                </div>
                {formData.showBrandBadge && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={formData.brandBadgeText}
                      onChange={e => setFormData({ ...formData, brandBadgeText: e.target.value })}
                      placeholder="EXPRESS"
                      className="text-xs font-bold px-3 py-2 border border-stone-300 rounded-xl"
                    />
                    <select
                      value={formData.brandBadgeColor}
                      onChange={e => setFormData({ ...formData, brandBadgeColor: e.target.value })}
                      className="text-xs font-bold px-3 py-2 border border-stone-300 rounded-xl bg-white"
                    >
                      {BADGE_COLOR_PRESETS.map((b, idx) => (
                        <option key={idx} value={b.value}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Tagline / Slogan */}
              <div className="pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-700">Slogan / Tagline Toko</label>
                  <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showTagline}
                      onChange={e => setFormData({ ...formData, showTagline: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Tampilkan</span>
                  </label>
                </div>
                {formData.showTagline && (
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="Minimarket Digital Super Cepat"
                    className="w-full text-xs font-medium px-3 py-2 border border-stone-300 rounded-xl"
                  />
                )}
              </div>

              {/* Operating status badge */}
              <div className="pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-700">Badge Status Operasional Toko</label>
                  <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showOperatingHoursBadge}
                      onChange={e => setFormData({ ...formData, showOperatingHoursBadge: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Tampilkan</span>
                  </label>
                </div>
                {formData.showOperatingHoursBadge && (
                  <input
                    type="text"
                    value={formData.operatingHoursBadgeText}
                    onChange={e => setFormData({ ...formData, operatingHoursBadgeText: e.target.value })}
                    placeholder="24 Jam Nonstop"
                    className="w-full text-xs font-medium px-3 py-2 border border-stone-300 rounded-xl"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 2: FOOTER PROFILE & DESCRIPTION */}
      {/* ========================================================= */}
      {activeSubTab === 'footer_profile' && (
        <div className="space-y-5">
          <div className="bg-white border border-stone-200 p-5 rounded-2xl space-y-4">
            <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <StoreIcon className="w-4 h-4 text-blue-600" />
              <span>Profil & Paragraf Penjelasan Perusahaan di Footer</span>
            </h4>
            <p className="text-xs text-stone-500">
              Bagian ini ditampilkan di kolom paling kiri pada footer website (di bawah logo footer).
            </p>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Nama Lengkap Brand di Footer
              </label>
              <input
                type="text"
                value={formData.footerBrandName}
                onChange={e => setFormData({ ...formData, footerBrandName: e.target.value })}
                placeholder="KUICK MART EXPRESS"
                className="w-full text-xs font-bold px-3.5 py-2.5 border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Teks Paragraf Deskripsi / Tentang Toko
              </label>
              <textarea
                rows={4}
                value={formData.footerDescription}
                onChange={e => setFormData({ ...formData, footerDescription: e.target.value })}
                placeholder="Platform belanja minimarket online modern..."
                className="w-full text-xs font-normal px-3.5 py-2.5 border border-stone-300 rounded-xl leading-relaxed"
              />
              <p className="text-[10px] text-stone-400 mt-1">
                Jelaskan keunggulan dan kemudahan berbelanja di minimarket Anda untuk meningkatkan kepercayaan pelanggan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 3: KOLOM & SEKSI FOOTER (TAMBAH, UBAH, HAPUS) */}
      {/* ========================================================= */}
      {activeSubTab === 'sections' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-extrabold text-sm text-stone-900">
                Daftar Kolom & Informasi Footer ({formData.sections.length} Seksi)
              </h4>
              <p className="text-xs text-stone-500">
                Anda dapat menambah kolom baru, mengubah judul/isi, menambah poin keunggulan berikon, atau menghapus info yang tidak diperlukan.
              </p>
            </div>

            <button
              onClick={() => setIsAddingSection(true)}
              className="px-3.5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kolom Footer Baru</span>
            </button>
          </div>

          {/* Modal / Form for adding a new section */}
          {isAddingSection && (
            <div className="p-4 bg-blue-50/70 border-2 border-blue-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-blue-950 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-700" />
                  <span>Tambah Kolom Informasi Footer Baru</span>
                </span>
                <button
                  onClick={() => setIsAddingSection(false)}
                  className="text-stone-400 hover:text-stone-700 text-xs font-bold"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Judul Kolom</label>
                  <input
                    type="text"
                    value={newSectionTitle}
                    onChange={e => setNewSectionTitle(e.target.value)}
                    placeholder="Contoh: Info Kemitraan / Jaminan Mutu"
                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-stone-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Tipe Konten Kolom</label>
                  <select
                    value={newSectionType}
                    onChange={e => setNewSectionType(e.target.value as any)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-stone-300 rounded-xl"
                  >
                    <option value="features_list">Daftar Poin Berikon (Contoh: Keunggulan Layanan)</option>
                    <option value="text_block">Paragraf Teks Deskripsi (Contoh: Metode Pembayaran)</option>
                    <option value="contact_hours">Jam Operasional & Hotline CS</option>
                  </select>
                </div>
              </div>

              {newSectionType !== 'features_list' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Teks Isi Paragraf</label>
                  <textarea
                    rows={2}
                    value={newSectionContent}
                    onChange={e => setNewSectionContent(e.target.value)}
                    placeholder="Tuliskan isi keterangan di sini..."
                    className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-xl"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsAddingSection(false)}
                  className="px-3 py-1.5 text-stone-600 hover:bg-stone-200 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddNewSection}
                  disabled={!newSectionTitle.trim()}
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-xs"
                >
                  Simpan Kolom Baru
                </button>
              </div>
            </div>
          )}

          {/* Form for adding/editing a feature item in a section */}
          {targetSectionId && (
            <div className="p-4 bg-amber-50/80 border-2 border-amber-300 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-amber-700" />
                  <span>{editingItem ? 'Ubah Poin Keunggulan' : 'Tambah Poin Keunggulan / Fitur Baru'}</span>
                </span>
                <button
                  onClick={() => {
                    setTargetSectionId(null);
                    setEditingItem(null);
                  }}
                  className="text-stone-400 hover:text-stone-700 text-xs font-bold"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Judul Poin (Wajib)
                  </label>
                  <input
                    type="text"
                    value={newItemText}
                    onChange={e => setNewItemText(e.target.value)}
                    placeholder="Contoh: Pengiriman Kilat 30 Menit"
                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-stone-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Pilih Simbol Ikon
                  </label>
                  <select
                    value={newItemIcon}
                    onChange={e => setNewItemIcon(e.target.value as FooterIconType)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-stone-300 rounded-xl"
                  >
                    {Object.entries(ICON_MAP).map(([key, item]) => (
                      <option key={key} value={key}>{item.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Keterangan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={newItemSubtext}
                  onChange={e => setNewItemSubtext(e.target.value)}
                  placeholder="Contoh: Kurir motor siap mengantar cepat ke depan pintu rumah"
                  className="w-full text-xs font-normal px-3 py-2 bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setTargetSectionId(null);
                    setEditingItem(null);
                  }}
                  className="px-3 py-1.5 text-stone-600 hover:bg-stone-200 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={!newItemText.trim()}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 rounded-xl text-xs font-extrabold shadow-xs"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Tambahkan Poin'}
                </button>
              </div>
            </div>
          )}

          {/* Cards of sections */}
          <div className="space-y-4">
            {formData.sections.map((sec, secIdx) => (
              <div
                key={sec.id}
                className={`bg-white border rounded-2xl p-4 transition-all shadow-2xs ${
                  sec.isVisible ? 'border-stone-200' : 'border-stone-200 opacity-60 bg-stone-50'
                }`}
              >
                {/* Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-900 font-extrabold text-xs flex items-center justify-center">
                      {secIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={sec.title}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          sections: prev.sections.map(s => s.id === sec.id ? { ...s, title: val } : s),
                        }));
                      }}
                      className="font-extrabold text-xs sm:text-sm text-stone-900 border-b border-transparent hover:border-stone-300 focus:border-blue-500 focus:outline-hidden px-1 py-0.5 rounded"
                      placeholder="Judul Seksi"
                    />
                    <span className="text-[10px] font-semibold text-stone-400 uppercase bg-stone-100 px-2 py-0.5 rounded">
                      {sec.type === 'features_list' ? 'Daftar Poin' : sec.type === 'payment_methods' ? 'Metode Pembayaran' : 'Teks Kontak / Jam'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleSectionVisibility(sec.id)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                        sec.isVisible ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-500 border-stone-200'
                      }`}
                    >
                      {sec.isVisible ? 'Tampil' : 'Tersembunyi'}
                    </button>

                    <button
                      onClick={() => handleDeleteSection(sec.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus seksi ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Section Body */}
                <div className="pt-3">
                  {/* TYPE: FEATURES LIST */}
                  {sec.type === 'features_list' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-600">
                          Daftar Poin Keunggulan Layanan ({sec.items?.length || 0} Item)
                        </span>
                        <button
                          onClick={() => handleOpenAddItem(sec.id)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-blue-700" />
                          <span>Tambah Poin</span>
                        </button>
                      </div>

                      {sec.items && sec.items.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {sec.items.map(item => (
                            <div
                              key={item.id}
                              className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl flex items-start justify-between gap-2 hover:bg-blue-50/30 transition-colors"
                            >
                              <div className="flex items-start gap-2 min-w-0">
                                <div className="p-1.5 bg-white rounded-lg border border-stone-200 shrink-0 mt-0.5">
                                  {ICON_MAP[item.icon]?.icon || <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-stone-800 leading-snug break-words">
                                    {item.text}
                                  </p>
                                  {item.subtext && (
                                    <p className="text-[10px] text-stone-500 line-clamp-2 mt-0.5">
                                      {item.subtext}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleOpenEditItem(sec.id, item)}
                                  className="p-1 text-stone-500 hover:text-blue-700 hover:bg-white rounded"
                                  title="Ubah poin ini"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(sec.id, item.id)}
                                  className="p-1 text-stone-400 hover:text-red-600 hover:bg-white rounded"
                                  title="Hapus poin ini"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center bg-stone-50 border border-dashed border-stone-300 rounded-xl">
                          <p className="text-xs text-stone-500">Belum ada poin keunggulan dalam kolom ini.</p>
                          <button
                            onClick={() => handleOpenAddItem(sec.id)}
                            className="mt-2 text-xs font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Tambah Poin Sekarang
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TYPE: PAYMENT METHODS OR TEXT BLOCK */}
                  {(sec.type === 'payment_methods' || sec.type === 'text_block') && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Teks Deskripsi / Keterangan
                        </label>
                        <textarea
                          rows={2}
                          value={sec.content || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              sections: prev.sections.map(s => s.id === sec.id ? { ...s, content: val } : s),
                            }));
                          }}
                          placeholder="Menerima QRIS, Bank Transfer, COD..."
                          className="w-full text-xs px-3 py-2 border border-stone-300 rounded-xl"
                        />
                      </div>

                      {sec.type === 'payment_methods' && (
                        <div>
                          <label className="block text-[11px] font-bold text-stone-600 mb-1.5">
                            Tag / Badge Metode yang Diterima
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {(sec.paymentTags || []).map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="bg-stone-100 text-stone-800 text-[11px] font-medium px-2 py-0.5 rounded-lg border border-stone-200 flex items-center gap-1"
                              >
                                <span>{tag}</span>
                                <button
                                  onClick={() => {
                                    const nextTags = (sec.paymentTags || []).filter((_, i) => i !== tIdx);
                                    setFormData(prev => ({
                                      ...prev,
                                      sections: prev.sections.map(s => s.id === sec.id ? { ...s, paymentTags: nextTags } : s),
                                    }));
                                  }}
                                  className="text-stone-400 hover:text-red-600 font-bold ml-0.5"
                                >
                                  ×
                                </button>
                              </span>
                            ))}

                            <button
                              onClick={() => {
                                const newTag = prompt('Masukkan nama metode pembayaran baru (contoh: ShopeePay, Dana, Debit BCA):');
                                if (newTag && newTag.trim()) {
                                  const nextTags = [...(sec.paymentTags || []), newTag.trim()];
                                  setFormData(prev => ({
                                    ...prev,
                                    sections: prev.sections.map(s => s.id === sec.id ? { ...s, paymentTags: nextTags } : s),
                                  }));
                                }
                              }}
                              className="text-[11px] font-bold text-blue-700 hover:bg-blue-50 px-2 py-0.5 rounded-lg border border-dashed border-blue-300"
                            >
                              + Tambah Tag
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TYPE: CONTACT HOURS */}
                  {sec.type === 'contact_hours' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Jam Operasional & Keterangan Pengiriman
                        </label>
                        <input
                          type="text"
                          value={sec.content || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              sections: prev.sections.map(s => s.id === sec.id ? { ...s, content: val } : s),
                            }));
                          }}
                          placeholder="Buka setiap hari pk 07:00 - 22:00 WIB..."
                          className="w-full text-xs px-3 py-2 border border-stone-300 rounded-xl font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Keterangan Hotline Bantuan Customer Care
                        </label>
                        <input
                          type="text"
                          value={sec.subContent || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              sections: prev.sections.map(s => s.id === sec.id ? { ...s, subContent: val } : s),
                            }));
                          }}
                          placeholder="Hubungi Customer Care 24/7..."
                          className="w-full text-xs px-3 py-2 border border-stone-300 rounded-xl"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 4: HAK CIPTA & LINK KAKI (TAMBAH, UBAH, HAPUS) */}
      {/* ========================================================= */}
      {activeSubTab === 'links' && (
        <div className="space-y-5">
          {/* Copyright text */}
          <div className="bg-white border border-stone-200 p-4 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-xs text-stone-900">
              Teks Hak Cipta (Copyright)
            </h4>
            <input
              type="text"
              value={formData.copyrightText}
              onChange={e => setFormData({ ...formData, copyrightText: e.target.value })}
              placeholder="© 2026 KuickMart Express. All rights reserved."
              className="w-full text-xs font-medium px-3.5 py-2.5 border border-stone-300 rounded-xl"
            />
          </div>

          {/* Quick links */}
          <div className="bg-white border border-stone-200 p-4 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-xs text-stone-900">
                  Daftar Link Bantuan / Kebijakan di Kaki Halaman ({formData.bottomLinks.length})
                </h4>
                <p className="text-[11px] text-stone-500">
                  Link kecil yang berada di pojok kanan bawah footer.
                </p>
              </div>

              <button
                onClick={() => setIsAddingLink(true)}
                className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Link Baru</span>
              </button>
            </div>

            {/* Add new link form */}
            {isAddingLink && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">Nama / Label Link</label>
                    <input
                      type="text"
                      value={newLinkLabel}
                      onChange={e => setNewLinkLabel(e.target.value)}
                      placeholder="Contoh: Pusat Bantuan 24/7"
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">Target URL</label>
                    <input
                      type="text"
                      value={newLinkUrl}
                      onChange={e => setNewLinkUrl(e.target.value)}
                      placeholder="#"
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setIsAddingLink(false)}
                    className="px-2.5 py-1 text-xs text-stone-600 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleAddNewLink}
                    disabled={!newLinkLabel.trim()}
                    className="px-3 py-1 bg-blue-900 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                  >
                    Tambahkan Link
                  </button>
                </div>
              </div>
            )}

            {/* Links list */}
            <div className="space-y-2">
              {formData.bottomLinks.map((link, lIdx) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between gap-3 p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <LinkIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <input
                      type="text"
                      value={link.label}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          bottomLinks: prev.bottomLinks.map(l => l.id === link.id ? { ...l, label: val } : l),
                        }));
                      }}
                      className="text-xs font-bold text-stone-800 bg-white border border-stone-200 px-2 py-1 rounded"
                    />
                    <span className="text-[10px] text-stone-400 font-mono truncate max-w-[150px]">
                      {link.url}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="p-1.5 text-stone-400 hover:text-red-600 rounded"
                    title="Hapus link ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 5: PRATINJAU LANGSUNG (LIVE FULL PREVIEW) */}
      {/* ========================================================= */}
      {activeSubTab === 'preview' && (
        <div className="space-y-6">
          <div className="bg-stone-100 p-4 rounded-3xl border border-stone-300 space-y-6">
            <div className="text-xs font-extrabold text-stone-700 flex items-center justify-between">
              <span>Pratinjau Tampilan Header & Footer Berdasarkan Data Anda:</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Real-Time Preview
              </span>
            </div>

            {/* PREVIEW HEADER */}
            <div className="bg-white p-4 rounded-2xl shadow-xs border border-stone-200">
              <div className="text-[10px] uppercase font-bold text-stone-400 mb-2">Simulasi Header:</div>
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  {formData.brandLogoImageUrl ? (
                    <img
                      src={formData.brandLogoImageUrl}
                      alt="Logo"
                      className="w-10 h-10 rounded-xl object-cover border border-stone-200"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${formData.brandLogoBgGradient} flex items-center justify-center text-white font-black text-xl tracking-wider shadow-2xs`}>
                      {formData.brandLogoText}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-extrabold text-lg text-blue-900 tracking-tight">
                        {formData.brandNamePart1}
                      </span>
                      <span className="font-black text-lg text-amber-500 tracking-tight">
                        {formData.brandNamePart2}
                      </span>
                      {formData.showBrandBadge && formData.brandBadgeText && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${formData.brandBadgeColor} text-white px-1.5 py-0.5 rounded ml-1`}>
                          {formData.brandBadgeText}
                        </span>
                      )}
                    </div>
                    {formData.showTagline && formData.tagline && (
                      <p className="text-[10px] font-medium text-stone-500">
                        {formData.tagline}
                      </p>
                    )}
                  </div>
                </div>

                {formData.showOperatingHoursBadge && formData.operatingHoursBadgeText && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                    <Clock className="w-3 h-3" />
                    {formData.operatingHoursBadgeText}
                  </span>
                )}
              </div>
            </div>

            {/* PREVIEW FOOTER */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-stone-200">
              <div className="text-[10px] uppercase font-bold text-stone-400 mb-4">Simulasi Footer:</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs text-stone-600">
                {/* Column 1: Brand Info */}
                <div>
                  <div className="flex items-center gap-2 mb-2 font-black text-blue-900 text-base">
                    <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${formData.brandLogoBgGradient} text-white flex items-center justify-center text-xs font-black`}>
                      {formData.brandLogoText}
                    </div>
                    <span>{formData.footerBrandName}</span>
                  </div>
                  <p className="text-stone-500 leading-relaxed">
                    {formData.footerDescription}
                  </p>
                </div>

                {/* Other columns */}
                {formData.sections.filter(s => s.isVisible).map(sec => (
                  <div key={sec.id}>
                    <h4 className="font-bold text-stone-900 mb-2">{sec.title}</h4>
                    {sec.type === 'features_list' && (
                      <ul className="space-y-1.5 text-stone-500">
                        {(sec.items || []).map(item => (
                          <li key={item.id} className="flex items-center gap-1.5">
                            {ICON_MAP[item.icon]?.icon || <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                            <span>{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {sec.type === 'payment_methods' && (
                      <div>
                        <p className="text-stone-500 leading-relaxed mb-2">
                          {sec.content}
                        </p>
                        {sec.paymentTags && sec.paymentTags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {sec.paymentTags.map((t, idx) => (
                              <span key={idx} className="bg-stone-100 text-[9px] font-medium px-1.5 py-0.5 rounded text-stone-600">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {(sec.type === 'contact_hours' || sec.type === 'text_block') && (
                      <div>
                        <p className="text-stone-500 leading-relaxed mb-1.5">
                          {sec.content}
                        </p>
                        {sec.subContent && (
                          <p className="text-stone-400 text-[11px]">
                            {sec.subContent}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom Copyright & Links */}
              <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-400 gap-2">
                <div>{formData.copyrightText}</div>
                <div className="flex items-center gap-4 flex-wrap">
                  {formData.bottomLinks.map(link => (
                    <span key={link.id} className="hover:text-stone-600 cursor-pointer">
                      {link.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Save Action Bar */}
      <div className="flex items-center justify-between border-t border-stone-200 pt-4">
        <button
          onClick={handleResetToDefault}
          className="px-3.5 py-2 text-stone-600 hover:text-stone-900 text-xs font-bold flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Kembalikan Default</span>
        </button>

        <button
          onClick={handleSaveAll}
          className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Save className="w-4 h-4 text-amber-400" />
          <span>Simpan Seluruh Perubahan Info</span>
        </button>
      </div>
    </div>
  );
};
