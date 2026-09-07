import React, { useState } from 'react';
import { 
  Receipt, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  CheckCircle2, 
  Printer, 
  Copy, 
  Store as StoreIcon, 
  Phone, 
  MapPin, 
  FileText, 
  Sparkles, 
  AlertCircle, 
  Building2, 
  Headphones, 
  Globe, 
  FileCheck2, 
  QrCode,
  X,
  RotateCcw
} from 'lucide-react';
import { ReceiptInfo, Store } from '../types';
import { formatRupiah } from '../utils/formatters';
import { cleanReceiptText } from '../utils/sanitizeReceipt';

interface ReceiptInfoManagerProps {
  receiptConfigs: ReceiptInfo[];
  stores: Store[];
  onUpdateReceiptConfigs: (configs: ReceiptInfo[]) => void;
  onSelectActiveConfig?: (config: ReceiptInfo) => void;
}

export const ReceiptInfoManager: React.FC<ReceiptInfoManagerProps> = ({
  receiptConfigs,
  stores,
  onUpdateReceiptConfigs,
  onSelectActiveConfig,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string>(() => {
    const def = receiptConfigs.find(r => r.isDefault) || receiptConfigs[0];
    return def ? def.id : '';
  });

  // Form Fields
  const [profileName, setProfileName] = useState('');
  const [storeId, setStoreId] = useState('all');
  const [headerBrand, setHeaderBrand] = useState('NUSA MART EXPRESS');
  const [subHeader, setSubHeader] = useState('');
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [taxIdOrNpwp, setTaxIdOrNpwp] = useState('');
  const [websiteOrSocial, setWebsiteOrSocial] = useState('');
  const [cashierName, setCashierName] = useState('Kasir 01');
  const [footerMessage1, setFooterMessage1] = useState('Struk ini adalah bukti pembayaran sah dari NusaMart Express.');
  const [footerMessage2, setFooterMessage2] = useState('Barang yang sudah dibeli dapat ditukar maks 1x24 jam dengan struk.');
  const [csHotline, setCsHotline] = useState('1500-888');
  const [showBarcode, setShowBarcode] = useState(true);
  const [showStoreLogo, setShowStoreLogo] = useState(true);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  const [isDefault, setIsDefault] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Open Form for Adding New Receipt
  const handleOpenAdd = () => {
    setEditingId(null);
    const activeStore = stores[0];
    setProfileName(`Struk Toko Baru ${receiptConfigs.length + 1}`);
    setStoreId(activeStore ? activeStore.id : 'all');
    setHeaderBrand('NUSA MART EXPRESS');
    setSubHeader('Minimarket & Grosir Kebutuhan Sehari-Hari');
    setStoreName(activeStore ? activeStore.name : 'KuickMart Express - Cabang Baru');
    setAddress(activeStore ? cleanReceiptText(activeStore.address) : 'Jl. Sudirman No. 10');
    setCity(activeStore ? cleanReceiptText(activeStore.city) : '');
    setPhone(activeStore ? activeStore.phone : '021-5551234');
    setTaxIdOrNpwp('NPWP: 01.345.678.9-012.000');
    setWebsiteOrSocial('www.nusamart.id • IG: @nusamartexpress');
    setCashierName('Kasir 01');
    setFooterMessage1('Struk ini adalah bukti pembayaran sah dari NusaMart Express.');
    setFooterMessage2('Terima kasih telah berbelanja! Selamat menikmati kebutuhan hemat.');
    setCsHotline('1500-888');
    setShowBarcode(true);
    setShowStoreLogo(true);
    setPaperWidth('58mm');
    setIsDefault(receiptConfigs.length === 0);
    setIsEditing(true);
  };

  // Open Form for Editing Existing Receipt
  const handleOpenEdit = (item: ReceiptInfo) => {
    setEditingId(item.id);
    setProfileName(item.profileName);
    setStoreId(item.storeId || 'all');
    setHeaderBrand(item.headerBrand);
    setSubHeader(item.subHeader || '');
    setStoreName(item.storeName);
    setAddress(cleanReceiptText(item.address));
    setCity(cleanReceiptText(item.city) || '');
    setPhone(item.phone);
    setTaxIdOrNpwp(item.taxIdOrNpwp || '');
    setWebsiteOrSocial(item.websiteOrSocial || '');
    setCashierName(item.cashierName || 'Kasir 01');
    setFooterMessage1(item.footerMessage1);
    setFooterMessage2(item.footerMessage2 || '');
    setCsHotline(item.csHotline || '1500-888');
    setShowBarcode(item.showBarcode !== false);
    setShowStoreLogo(item.showStoreLogo !== false);
    setPaperWidth(item.paperWidth || '58mm');
    setIsDefault(Boolean(item.isDefault));
    setSelectedPreviewId(item.id);
    setIsEditing(true);
  };

  // Duplicate an existing profile
  const handleDuplicate = (item: ReceiptInfo) => {
    const newProfile: ReceiptInfo = {
      ...item,
      id: `rcp_${Date.now()}`,
      profileName: `${item.profileName} (Salinan)`,
      isDefault: false,
      updatedAt: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    const updated = [...receiptConfigs, newProfile];
    onUpdateReceiptConfigs(updated);
    setSelectedPreviewId(newProfile.id);
    showNotification(`Profil struk "${newProfile.profileName}" berhasil diduplikasi.`);
  };

  // Delete Receipt Profile
  const handleDelete = (id: string, name: string) => {
    if (receiptConfigs.length <= 1) {
      alert('Tidak dapat menghapus struk ini. Sistem harus memiliki minimal 1 profil info struk toko!');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus profil info struk "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    const filtered = receiptConfigs.filter(r => r.id !== id);
    // If the deleted one was default, set the first one as default
    const deletedWasDefault = receiptConfigs.find(r => r.id === id)?.isDefault;
    if (deletedWasDefault && filtered.length > 0) {
      filtered[0].isDefault = true;
    }

    onUpdateReceiptConfigs(filtered);
    if (selectedPreviewId === id && filtered.length > 0) {
      setSelectedPreviewId(filtered[0].id);
    }
    showNotification(`Profil info struk "${name}" berhasil dihapus.`);
  };

  // Set as Default Active Receipt
  const handleSetDefault = (item: ReceiptInfo) => {
    const updated = receiptConfigs.map(r => ({
      ...r,
      isDefault: r.id === item.id,
    }));
    onUpdateReceiptConfigs(updated);
    if (onSelectActiveConfig) {
      onSelectActiveConfig(item);
    }
    setSelectedPreviewId(item.id);
    showNotification(`Profil "${item.profileName}" sekarang aktif sebagai struk utama toko!`);
  };

  // Quick autofill from selected store
  const handleAutofillFromStore = (targetStoreId: string) => {
    const found = stores.find(s => s.id === targetStoreId);
    if (found) {
      setStoreName(found.name);
      setAddress(found.address);
      setCity(found.city);
      setPhone(found.phone);
      showNotification(`Info toko berhasil disinkronkan dari cabang "${found.name}".`);
    }
  };

  // Save (Create or Update)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!headerBrand.trim() || !storeName.trim() || !address.trim()) {
      alert('Judul Brand Struk, Nama Toko/Cabang, dan Alamat wajib diisi!');
      return;
    }

    const nowFormatted = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    if (editingId) {
      // Update existing
      const updated = receiptConfigs.map(r => {
        if (r.id === editingId) {
          return {
            ...r,
            profileName: profileName.trim() || `Struk ${storeName}`,
            storeId,
            headerBrand: headerBrand.trim().toUpperCase(),
            subHeader: subHeader.trim(),
            storeName: storeName.trim(),
            address: address.trim(),
            city: city.trim(),
            phone: phone.trim(),
            taxIdOrNpwp: taxIdOrNpwp.trim(),
            websiteOrSocial: websiteOrSocial.trim(),
            cashierName: cashierName.trim() || 'Kasir 01',
            footerMessage1: footerMessage1.trim(),
            footerMessage2: footerMessage2.trim(),
            csHotline: csHotline.trim(),
            showBarcode,
            showStoreLogo,
            paperWidth,
            isDefault: isDefault || r.isDefault,
            updatedAt: nowFormatted,
          };
        }
        return isDefault ? { ...r, isDefault: false } : r;
      });

      onUpdateReceiptConfigs(updated);
      showNotification(`Info struk "${profileName || storeName}" berhasil diperbarui!`);
      setSelectedPreviewId(editingId);
    } else {
      // Create new
      const newId = `rcp_${Date.now()}`;
      const newReceipt: ReceiptInfo = {
        id: newId,
        profileName: profileName.trim() || `Struk ${storeName}`,
        storeId,
        headerBrand: headerBrand.trim().toUpperCase(),
        subHeader: subHeader.trim(),
        storeName: storeName.trim(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim(),
        taxIdOrNpwp: taxIdOrNpwp.trim(),
        websiteOrSocial: websiteOrSocial.trim(),
        cashierName: cashierName.trim() || 'Kasir 01',
        footerMessage1: footerMessage1.trim(),
        footerMessage2: footerMessage2.trim(),
        csHotline: csHotline.trim(),
        showBarcode,
        showStoreLogo,
        paperWidth,
        isDefault: isDefault || receiptConfigs.length === 0,
        updatedAt: nowFormatted,
      };

      let updated = [...receiptConfigs];
      if (newReceipt.isDefault) {
        updated = updated.map(r => ({ ...r, isDefault: false }));
      }
      updated.push(newReceipt);

      onUpdateReceiptConfigs(updated);
      setSelectedPreviewId(newId);
      showNotification(`Profil struk "${newReceipt.profileName}" berhasil ditambahkan!`);
    }

    setIsEditing(false);
    setEditingId(null);
  };

  // Current active preview item (either being edited in real-time or selected from cards)
  const activePreviewData: ReceiptInfo = isEditing
    ? {
        id: editingId || 'preview_temp',
        profileName: profileName || 'Pratinjau Struk Toko',
        storeId,
        headerBrand: headerBrand || 'NUSA MART EXPRESS',
        subHeader,
        storeName: storeName || 'KuickMart Express - Sudirman Thamrin',
        address: address || 'Jl. Jendral Sudirman No. 18, Menteng',
        city,
        phone: phone || '021-5551234',
        taxIdOrNpwp,
        websiteOrSocial,
        cashierName,
        footerMessage1,
        footerMessage2,
        csHotline,
        showBarcode,
        showStoreLogo,
        paperWidth,
        isDefault,
      }
    : receiptConfigs.find(r => r.id === selectedPreviewId) || receiptConfigs[0] || {
        id: 'fallback',
        profileName: 'Struk Default',
        headerBrand: 'NUSA MART EXPRESS',
        storeName: 'KuickMart Express',
        address: 'Jl. Jendral Sudirman No. 18',
        phone: '021-5551234',
        footerMessage1: 'Struk ini adalah bukti pembayaran sah dari NusaMart Express.',
      };

  const handlePrintSample = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {feedback && (
        <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border border-rose-300 text-rose-900'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Top Banner & Action */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-stone-900 text-white p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-400/30">
              <Receipt className="w-5 h-5" />
            </span>
            <h4 className="font-black text-base sm:text-lg tracking-tight">
              Pengaturan & Informasi Struk Toko
            </h4>
          </div>
          <p className="text-xs text-blue-100 max-w-xl">
            Modul untuk <strong>menambah, mengubah, dan menghapus</strong> data identitas toko pada struk kasir digital & cetak fisik (Nama Brand, Alamat, No. Telp, Slogan, Footer Struk, & CS).
          </p>
        </div>

        {!isEditing && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 text-stone-900" />
            <span>Tambah Info Struk Baru</span>
          </button>
        )}
      </div>

      {/* Main Content Area: Form OR List + Preview */}
      {isEditing ? (
        /* FORM EDIT / TAMBAH DENGAN LIVE PREVIEW BERDAMPINGAN */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Form Left Side */}
          <form 
            onSubmit={handleSave} 
            className="lg:col-span-7 bg-white border border-stone-200 rounded-3xl p-5 shadow-xs space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </span>
                <div>
                  <h5 className="font-extrabold text-sm text-stone-900">
                    {editingId ? 'Ubah Informasi Struk Toko' : 'Tambah Profil Info Struk Baru'}
                  </h5>
                  <p className="text-[11px] text-stone-500">
                    Perubahan langsung terlihat di pratinjau struk di sebelah kanan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bagian 1: Identitas Profil & Cabang Toko */}
            <div className="space-y-3">
              <div className="text-[11px] font-black uppercase text-blue-700 tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>1. Profil Struk & Cabang Toko</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Nama Profil Struk: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    placeholder="Contoh: Struk Utama NusaMart"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50/50 font-semibold text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Hubungkan ke Cabang:
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={storeId}
                      onChange={e => {
                        setStoreId(e.target.value);
                        if (e.target.value !== 'all') {
                          handleAutofillFromStore(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50/50 text-stone-900 font-medium text-xs focus:bg-white focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="all">Semua Cabang (Global)</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {storeId !== 'all' && (
                      <button
                        type="button"
                        onClick={() => handleAutofillFromStore(storeId)}
                        title="Salin ulang nama & alamat cabang ini"
                        className="px-2.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl border border-blue-200 shrink-0 font-bold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 2: Header Struk (Brand & Outlet) */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div className="text-[11px] font-black uppercase text-blue-700 tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                <span>2. Header Struk (Judul, Toko, & Alamat)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Nama Brand Struk (Header Utama): <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={headerBrand}
                    onChange={e => setHeaderBrand(e.target.value)}
                    placeholder="Contoh: NUSA MART EXPRESS"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50/50 font-black text-stone-900 focus:bg-white uppercase focus:ring-2 focus:ring-blue-200"
                  />
                  <span className="text-[10px] text-stone-400">Teks terbesar di paling atas struk</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Nama Toko / Cabang: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    placeholder="Contoh: KuickMart Express - Sudirman Thamrin"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50/50 font-semibold text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">
                    Alamat Lengkap Toko: <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Contoh: Jl. Jendral Sudirman No. 18, Menteng"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50/50 font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Nomor Telepon / WhatsApp: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Contoh: 021-5551234"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50/50 font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Slogan / Subjudul Toko (Opsional):
                  </label>
                  <input
                    type="text"
                    value={subHeader}
                    onChange={e => setSubHeader(e.target.value)}
                    placeholder="Contoh: Pusat Grosir & Retail Kebutuhan Harian"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50/50 font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 3: Info Pajak, Website, & CS */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div className="text-[11px] font-black uppercase text-blue-700 tracking-wider flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>3. Info Pajak (NPWP), Website & Layanan CS</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    NPWP / No Izin Usaha (Opsional):
                  </label>
                  <input
                    type="text"
                    value={taxIdOrNpwp}
                    onChange={e => setTaxIdOrNpwp(e.target.value)}
                    placeholder="Contoh: NPWP: 01.345.678.9-012.000"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50/50 font-mono text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Website / Akun Instagram (Opsional):
                  </label>
                  <input
                    type="text"
                    value={websiteOrSocial}
                    onChange={e => setWebsiteOrSocial(e.target.value)}
                    placeholder="Contoh: www.nusamart.id • IG: @nusamartexpress"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50/50 font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Nomor CS Hotline Toko:
                  </label>
                  <input
                    type="text"
                    value={csHotline}
                    onChange={e => setCsHotline(e.target.value)}
                    placeholder="Contoh: 1500-888"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50/50 font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Label Kasir Default:
                  </label>
                  <input
                    type="text"
                    value={cashierName}
                    onChange={e => setCashierName(e.target.value)}
                    placeholder="Contoh: Kasir 01 / Auto"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50/50 font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 4: Catatan Kaki (Footer Struk) */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div className="text-[11px] font-black uppercase text-blue-700 tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>4. Catatan Kaki (Footer Struk)</span>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Pesan Kaki 1 (Bukti Pembayaran):
                  </label>
                  <input
                    type="text"
                    value={footerMessage1}
                    onChange={e => setFooterMessage1(e.target.value)}
                    placeholder="Struk ini adalah bukti pembayaran sah dari NusaMart Express."
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50/50 font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Pesan Kaki 2 (Kebijakan Retur / Ucapan Terima Kasih):
                  </label>
                  <input
                    type="text"
                    value={footerMessage2}
                    onChange={e => setFooterMessage2(e.target.value)}
                    placeholder="Barang yang sudah dibeli dapat ditukar maks 1x24 jam membawa struk."
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50/50 font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 5: Opsi Tampilan & Format Kertas */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div className="text-[11px] font-black uppercase text-blue-700 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>5. Format Cetak & Fitur Tampilan</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Lebar Kertas Struk Thermal:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaperWidth('58mm')}
                      className={`flex-1 py-2 rounded-xl font-bold border text-xs transition-all ${
                        paperWidth === '58mm'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      58mm (Kecil / Mobile POS)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperWidth('80mm')}
                      className={`flex-1 py-2 rounded-xl font-bold border text-xs transition-all ${
                        paperWidth === '80mm'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      80mm (Standar Kasir Desktop)
                    </button>
                  </div>
                </div>

                <div className="flex flex-col justify-end space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800 select-none">
                    <input
                      type="checkbox"
                      checked={showBarcode}
                      onChange={e => setShowBarcode(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded-sm border-stone-300"
                    />
                    <span>Tampilkan Barcode Transaksi di Bawah</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-blue-900 select-none">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={e => setIsDefault(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm border-stone-300"
                    />
                    <span>Jadikan Struk Aktif Utama Toko</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>{editingId ? 'Simpan Perubahan Info Struk' : 'Simpan & Terbitkan Struk Baru'}</span>
              </button>
            </div>
          </form>

          {/* Real-Time Live Receipt Preview Right Side */}
          <div className="lg:col-span-5 sticky top-4">
            <div className="bg-stone-800 text-white p-3 rounded-2xl flex items-center justify-between mb-3 text-xs">
              <span className="font-bold flex items-center gap-1.5 text-amber-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Live Preview Struk Kasir</span>
              </span>
              <button
                onClick={handlePrintSample}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-bold flex items-center gap-1"
                title="Tes Print Struk"
              >
                <Printer className="w-3 h-3" />
                <span>Tes Cetak</span>
              </button>
            </div>

            <ReceiptVisualCard receipt={activePreviewData} isLivePreview={true} />
          </div>
        </div>
      ) : (
        /* LIST DAFTAR PROFIL STRUK & PREVIEW VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* List Cards Left Side */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-stone-500 pb-1">
              <span>Daftar Profil Info Struk ({receiptConfigs.length})</span>
              <span>Klik kartu untuk melihat pratinjau</span>
            </div>

            {receiptConfigs.map(item => {
              const isSelected = selectedPreviewId === item.id;
              const storeAssigned = stores.find(s => s.id === item.storeId);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedPreviewId(item.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-2xs space-y-3 ${
                    isSelected 
                      ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' 
                      : 'border-stone-200 hover:border-stone-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-stone-900 text-sm">
                          {item.profileName}
                        </span>
                        {item.isDefault && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Struk Aktif Utama</span>
                          </span>
                        )}
                        <span className="bg-stone-100 text-stone-600 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                          {item.paperWidth || '58mm'}
                        </span>
                      </div>

                      {/* Header Brand */}
                      <div className="text-xs font-black text-blue-900 tracking-tight flex items-center gap-1">
                        <span>{item.headerBrand}</span>
                        {item.subHeader && (
                          <span className="text-[11px] font-normal text-stone-500 italic">• {item.subHeader}</span>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-stone-800">
                        {item.storeName}
                      </div>

                      <div className="text-[11px] text-stone-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        <span className="line-clamp-1">
                          {cleanReceiptText(item.address)}
                          {cleanReceiptText(item.city) ? `, ${cleanReceiptText(item.city)}` : ''}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-600 pt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-stone-400" />
                          <span>{item.phone}</span>
                        </span>
                        {item.taxIdOrNpwp && (
                          <span className="font-mono text-stone-500">
                            {item.taxIdOrNpwp}
                          </span>
                        )}
                        {storeAssigned && (
                          <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 font-semibold text-[10px]">
                            Cabang: {storeAssigned.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors border border-blue-200"
                        title="Ubah Info Struk"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ubah</span>
                      </button>

                      <button
                        onClick={() => handleDuplicate(item)}
                        className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl"
                        title="Duplikat Profil Struk"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {!item.isDefault && (
                        <button
                          onClick={() => handleSetDefault(item)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
                          title="Terapkan sebagai struk utama"
                        >
                          Gunakan
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(item.id, item.profileName)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-100 transition-colors"
                        title="Hapus Profil Struk"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Preview Right Side */}
          <div className="lg:col-span-5 sticky top-4 space-y-3">
            <div className="bg-stone-900 text-white p-3.5 rounded-2xl flex items-center justify-between text-xs shadow-xs">
              <div>
                <div className="font-extrabold text-stone-100">
                  Pratinjau Struk: {activePreviewData.profileName}
                </div>
                <div className="text-[10px] text-stone-400">
                  {activePreviewData.isDefault ? '⭐ Profil Struk Aktif Utama' : 'Pilihan profil struk alternatif'}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(activePreviewData)}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Ubah</span>
                </button>
                <button
                  onClick={handlePrintSample}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-stone-200 font-bold text-[11px] flex items-center gap-1 transition-colors"
                >
                  <Printer className="w-3 h-3" />
                  <span>Cetak</span>
                </button>
              </div>
            </div>

            <ReceiptVisualCard receipt={activePreviewData} isLivePreview={false} />
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// SUBCOMPONENT: REALISTIC THERMAL RECEIPT PREVIEW
// ==========================================
interface ReceiptVisualCardProps {
  receipt: ReceiptInfo;
  isLivePreview?: boolean;
}

export const ReceiptVisualCard: React.FC<ReceiptVisualCardProps> = ({ receipt, isLivePreview }) => {
  return (
    <div className={`bg-stone-50 border border-stone-300 rounded-3xl p-6 shadow-md font-sans space-y-4 max-w-md mx-auto transition-all ${
      isLivePreview ? 'ring-2 ring-blue-300' : ''
    }`}>
      {/* Receipt Header */}
      <div className="text-center pb-4 border-b border-dashed border-stone-300 space-y-1">
        {/* Brand Header */}
        <div className="font-black text-xl text-blue-900 tracking-tight">
          {receipt.headerBrand || 'NUSA MART EXPRESS'}
        </div>

        {/* Optional Slogan / Subheader */}
        {receipt.subHeader && (
          <div className="text-[10px] font-medium text-stone-500 italic">
            {receipt.subHeader}
          </div>
        )}

        {/* Store Name */}
        <p className="text-xs text-stone-700 font-bold">
          {receipt.storeName || 'KuickMart Express - Sudirman Thamrin'}
        </p>

        {/* Address and Phone */}
        <p className="text-[10px] text-stone-500 leading-relaxed">
          {cleanReceiptText(receipt.address) || 'Jl. Jendral Sudirman No. 18, Menteng'}
          {cleanReceiptText(receipt.city) ? `, ${cleanReceiptText(receipt.city)}` : ''}
          {receipt.phone ? ` • Telp: ${receipt.phone}` : ''}
        </p>

        {/* Tax NPWP / Website if provided */}
        {(receipt.taxIdOrNpwp || receipt.websiteOrSocial) && (
          <div className="text-[9px] text-stone-400 font-mono pt-0.5">
            {receipt.taxIdOrNpwp} {receipt.taxIdOrNpwp && receipt.websiteOrSocial ? '•' : ''} {receipt.websiteOrSocial}
          </div>
        )}

        {/* Receipt Meta (Number & DateTime) */}
        <div className="mt-2 text-[11px] font-mono text-stone-600 flex items-center justify-center gap-2">
          <span>No: NM-260903-91V0B</span>
          <span>•</span>
          <span>03 Sep 2026, 21.34</span>
        </div>

        {receipt.cashierName && (
          <div className="text-[10px] font-mono text-stone-400">
            {receipt.cashierName}
          </div>
        )}
      </div>

      {/* Sample Items List */}
      <div className="space-y-2 text-xs text-stone-800 pb-3 border-b border-dashed border-stone-300">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-2">
            <div className="font-semibold text-stone-900">Minyakita 2 Liter Pouch</div>
            <div className="text-[10px] text-stone-600">
              1 Dus × Rp 189.000 <span className="text-blue-700 font-bold">(= 6 Pcs)</span>
            </div>
            <div className="text-[9px] text-stone-400 italic">1 Dus = 6 Pcs</div>
          </div>
          <span className="font-bold text-stone-900">Rp 189.000</span>
        </div>

        <div className="flex justify-between items-start">
          <div className="flex-1 pr-2">
            <div className="font-semibold text-stone-900">Beras Rojolele Super 5kg</div>
            <div className="text-[10px] text-stone-600">1 Karung × Rp 74.500</div>
          </div>
          <span className="font-bold text-stone-900">Rp 74.500</span>
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="space-y-1 text-xs text-stone-600 pb-3 border-b border-dashed border-stone-300">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>Rp 263.500</span>
        </div>
        <div className="flex justify-between">
          <span>Biaya Ongkir</span>
          <span>Rp 6.000</span>
        </div>
        <div className="flex justify-between text-emerald-700 font-semibold">
          <span>Diskon Voucher</span>
          <span>-Rp 6.000</span>
        </div>
        <div className="flex justify-between font-black text-sm text-stone-900 pt-1">
          <span>TOTAL BAYAR</span>
          <span className="text-base text-blue-900">Rp 263.500</span>
        </div>
      </div>

      {/* Payment Details */}
      <div className="text-xs text-stone-600 space-y-1 pb-3 border-b border-dashed border-stone-300">
        <div className="flex justify-between">
          <span>Metode Pembayaran:</span>
          <span className="font-bold text-stone-800 uppercase">QRIS</span>
        </div>
        <div className="flex justify-between">
          <span>Poin Diperoleh:</span>
          <span className="font-bold text-amber-700">+2.635 Poin Member</span>
        </div>
        <div className="flex justify-between">
          <span>Layanan:</span>
          <span className="font-semibold text-stone-800">Antar Kurir Instan</span>
        </div>
      </div>

      {/* Barcode & Footer Messages */}
      <div className="text-center pt-2 flex flex-col items-center space-y-1.5">
        {receipt.showBarcode !== false && (
          <div className="flex flex-col items-center">
            <div className="h-9 w-44 bg-stone-900 flex items-center justify-center text-white text-[9px] font-mono tracking-widest rounded select-none">
              ||| | | |||| | ||| |||| |
            </div>
            <span className="text-[10px] font-mono text-stone-500 mt-1">NM-260903-91V0B</span>
          </div>
        )}

        {receipt.footerMessage1 && (
          <p className="text-[10px] text-stone-600 font-medium max-w-xs text-center leading-relaxed">
            {receipt.footerMessage1}
          </p>
        )}

        {receipt.footerMessage2 && (
          <p className="text-[9px] text-stone-400 max-w-xs text-center leading-tight">
            {receipt.footerMessage2}
          </p>
        )}

        {receipt.csHotline && (
          <div className="text-[9px] text-stone-400 font-semibold pt-1">
            Layanan Pelanggan 24 Jam: <strong className="text-stone-700">{receipt.csHotline}</strong>
          </div>
        )}
      </div>
    </div>
  );
};
