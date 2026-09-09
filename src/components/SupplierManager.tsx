import React, { useState, useMemo } from 'react';
import { 
  Supplier, 
  Store 
} from '../types';
import { formatRupiah } from '../utils/formatters';
import { 
  Truck, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Download,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Clock
} from 'lucide-react';

interface SupplierManagerProps {
  suppliers: Supplier[];
  onUpdateSuppliers: (suppliers: Supplier[]) => void;
  onSelectSupplierForPurchase?: (supplierId: string) => void;
  canEdit?: boolean;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({
  suppliers,
  onUpdateSuppliers,
  onSelectSupplierForPurchase,
  canEdit = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTerms, setSelectedTerms] = useState<string>('all');
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState<Supplier | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('Sembako & Makanan');
  const [bankName, setBankName] = useState('BCA');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<Supplier['paymentTerms']>('tempo_14');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    suppliers.forEach(s => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats);
  }, [suppliers]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(sup => {
      const matchSearch = 
        sup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sup.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sup.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sup.phone.includes(searchQuery) ||
        (sup.category && sup.category.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchCategory = selectedCategory === 'all' || sup.category === selectedCategory;
      const matchTerms = selectedTerms === 'all' || sup.paymentTerms === selectedTerms;

      return matchSearch && matchCategory && matchTerms;
    });
  }, [suppliers, searchQuery, selectedCategory, selectedTerms]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter(s => s.isActive).length;
    const totalPurchases = suppliers.reduce((sum, s) => sum + (s.totalPurchases || 0), 0);
    const tempoCount = suppliers.filter(s => s.paymentTerms.startsWith('tempo')).length;

    return { total, active, totalPurchases, tempoCount };
  }, [suppliers]);

  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    const nextNum = suppliers.length + 1;
    setCode(`SUP-${String(nextNum).padStart(3, '0')}`);
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCity('');
    setCategory('Sembako & Makanan');
    setBankName('BCA');
    setAccountNumber('');
    setAccountHolder('');
    setPaymentTerms('tempo_14');
    setIsActive(true);
    setNotes('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setCode(sup.code);
    setName(sup.name);
    setContactPerson(sup.contactPerson);
    setPhone(sup.phone);
    setEmail(sup.email || '');
    setAddress(sup.address);
    setCity(sup.city || '');
    setCategory(sup.category || 'Sembako & Makanan');
    setBankName(sup.bankAccount?.bankName || 'BCA');
    setAccountNumber(sup.bankAccount?.accountNumber || '');
    setAccountHolder(sup.bankAccount?.accountHolder || '');
    setPaymentTerms(sup.paymentTerms);
    setIsActive(sup.isActive);
    setNotes(sup.notes || '');
    setIsFormModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contactPerson.trim() || !phone.trim()) {
      alert('Mohon lengkapi Nama Supplier, PIC Kontak, dan No. Telepon');
      return;
    }

    const supplierData: Supplier = {
      id: editingSupplier ? editingSupplier.id : `sup_${Date.now()}`,
      code: code.trim() || `SUP-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      city: city.trim() || undefined,
      category: category.trim(),
      bankAccount: accountNumber ? {
        bankName,
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim() || name.trim(),
      } : undefined,
      paymentTerms,
      isActive,
      notes: notes.trim() || undefined,
      totalPurchases: editingSupplier ? editingSupplier.totalPurchases : 0,
      lastPurchaseDate: editingSupplier ? editingSupplier.lastPurchaseDate : undefined,
    };

    let updated: Supplier[];
    if (editingSupplier) {
      updated = suppliers.map(s => s.id === editingSupplier.id ? supplierData : s);
    } else {
      updated = [supplierData, ...suppliers];
    }

    onUpdateSuppliers(updated);
    setIsFormModalOpen(false);
  };

  const handleDeleteSupplier = (id: string) => {
    const updated = suppliers.filter(s => s.id !== id);
    onUpdateSuppliers(updated);
    setDeleteConfirmId(null);
    if (selectedSupplierDetail?.id === id) {
      setSelectedSupplierDetail(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Kode Supplier', 'Nama Supplier', 'PIC / Kontak', 'No Telepon', 'Email', 'Kategori', 'Termin Bayar', 'Bank', 'No Rekening', 'Atas Nama', 'Alamat', 'Kota', 'Total Beli (Rp)', 'Status'];
    const rows = filteredSuppliers.map(s => [
      `"${s.code}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.contactPerson.replace(/"/g, '""')}"`,
      `"${s.phone}"`,
      `"${s.email || '-'}"`,
      `"${s.category || '-'}"`,
      `"${s.paymentTerms}"`,
      `"${s.bankAccount?.bankName || '-'}"`,
      `"${s.bankAccount?.accountNumber || '-'}"`,
      `"${s.bankAccount?.accountHolder || '-'}"`,
      `"${(s.address || '').replace(/"/g, '""')}"`,
      `"${s.city || '-'}"`,
      s.totalPurchases || 0,
      s.isActive ? 'Aktif' : 'Nonaktif',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Master_Supplier_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTermsLabel = (term: Supplier['paymentTerms']) => {
    switch (term) {
      case 'cash': return 'Cash / Tunai';
      case 'tempo_7': return 'Tempo 7 Hari';
      case 'tempo_14': return 'Tempo 14 Hari';
      case 'tempo_30': return 'Tempo 30 Hari';
      case 'tempo_60': return 'Tempo 60 Hari';
      default: return term;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-stone-900">Master Data Supplier (Pemasok)</h2>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Kelola vendor distributor, kontak PIC, termin pembayaran, dan riwayat pasokan barang ke toko.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold"
            title="Ekspor CSV Data Supplier"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span>Ekspor CSV</span>
          </button>

          {canEdit && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Supplier Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Total Supplier Terdaftar</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{metrics.total}</div>
          <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{metrics.active} Mitra Aktif</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Mitra Pembayaran Tempo</div>
          <div className="text-2xl font-black text-indigo-700 mt-1">{metrics.tempoCount}</div>
          <div className="text-xs text-stone-500 mt-1">Kredit 7 - 30 Hari</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Akumulasi Nilai Pembelian</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{formatRupiah(metrics.totalPurchases)}</div>
          <div className="text-xs text-stone-500 mt-1">Total belanja ke seluruh vendor</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Kategori Pasokan</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{categories.length || 1}</div>
          <div className="text-xs text-stone-500 mt-1">Sembako, Minuman, Care, dll</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama supplier, kode, PIC, no HP, atau kategori..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl text-stone-700"
          >
            <option value="all">Semua Kategori</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedTerms}
            onChange={(e) => setSelectedTerms(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl text-stone-700"
          >
            <option value="all">Semua Termin</option>
            <option value="cash">Cash / Tunai</option>
            <option value="tempo_7">Tempo 7 Hari</option>
            <option value="tempo_14">Tempo 14 Hari</option>
            <option value="tempo_30">Tempo 30 Hari</option>
            <option value="tempo_60">Tempo 60 Hari</option>
          </select>
        </div>
      </div>

      {/* Supplier Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((sup) => (
          <div 
            key={sup.id}
            className={`bg-white rounded-2xl border transition-all duration-200 p-5 shadow-xs flex flex-col justify-between ${
              sup.isActive ? 'border-stone-200 hover:border-indigo-300' : 'border-stone-200 opacity-60'
            }`}
          >
            <div>
              {/* Header card */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                      {sup.code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      sup.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {sup.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <h3 className="font-bold text-stone-900 text-base mt-1.5 line-clamp-1">{sup.name}</h3>
                </div>

                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>

              {/* Tag Category & Terms */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-indigo-50/70 text-indigo-700">
                  {sup.category || 'Umum'}
                </span>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  {getTermsLabel(sup.paymentTerms)}
                </span>
              </div>

              {/* Details & Contacts */}
              <div className="mt-4 space-y-2 text-xs text-stone-600 border-t border-stone-100 pt-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-700 min-w-16">PIC Kontak:</span>
                  <span className="text-stone-900 font-medium">{sup.contactPerson}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <a href={`https://wa.me/${sup.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                    {sup.phone}
                  </a>
                </div>
                {sup.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{sup.email}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 text-stone-500">{sup.address} {sup.city ? `(${sup.city})` : ''}</span>
                </div>

                {sup.bankAccount && (
                  <div className="flex items-center gap-2 bg-stone-50 p-2 rounded-xl">
                    <CreditCard className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="font-medium text-stone-700">
                      {sup.bankAccount.bankName} - {sup.bankAccount.accountNumber} ({sup.bankAccount.accountHolder})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Total purchase & action buttons */}
            <div className="mt-5 border-t border-stone-100 pt-3">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-stone-500">Total Pasokan:</span>
                <span className="font-bold text-stone-900">{formatRupiah(sup.totalPurchases || 0)}</span>
              </div>

              <div className="flex items-center gap-2">
                {onSelectSupplierForPurchase && (
                  <button
                    onClick={() => onSelectSupplierForPurchase(sup.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Buat PO Beli</span>
                  </button>
                )}

                {canEdit && (
                  <>
                    <button
                      onClick={() => handleOpenEditModal(sup)}
                      className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                      title="Edit Supplier"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(sup.id)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                      title="Hapus Supplier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-200">
          <Truck className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-700">Tidak ada supplier ditemukan</h3>
          <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
            Coba sesuaikan kata kunci pencarian atau tambah supplier baru.
          </p>
        </div>
      )}

      {/* MODAL FORM SUPPLIER (ADD / EDIT) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    {editingSupplier ? 'Edit Data Supplier' : 'Tambah Supplier Baru'}
                  </h3>
                  <p className="text-xs text-stone-500">Lengkapi data profil vendor pemasok barang</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Kode Supplier *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Contoh: SUP-001"
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Kategori Pasokan</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Contoh: Sembako, Minuman, Susu"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nama Perusahaan / Supplier *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: PT Indofood Sukses Makmur Tbk"
                  required
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Nama Kontak PIC *</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Contoh: Bambang Sutrisno"
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">No. WhatsApp / Telepon *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890"
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Email Resmi (Opsional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Contoh: order@supplier.co.id"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Kota Asal Supplier</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Contoh: Jakarta / Bekasi / Surabaya"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Alamat Lengkap Gudang / Kantor</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat kantor atau gudang supplier..."
                  rows={2}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                />
              </div>

              {/* Bank & Payment terms */}
              <div className="bg-stone-50 p-3.5 rounded-2xl space-y-3 border border-stone-200">
                <div className="font-bold text-stone-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>Informasi Pembayaran & Rekening Bank</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">Nama Bank</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-stone-200 rounded-xl bg-white"
                    >
                      <option value="BCA">BCA</option>
                      <option value="Mandiri">Bank Mandiri</option>
                      <option value="BRI">BRI</option>
                      <option value="BNI">BNI</option>
                      <option value="BSI">BSI</option>
                      <option value="CIMB">CIMB Niaga</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">No. Rekening</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Nomor Rekening"
                      className="w-full px-2.5 py-1.5 border border-stone-200 rounded-xl bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">Atas Nama Rekening</label>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="Nama Pemilik"
                      className="w-full px-2.5 py-1.5 border border-stone-200 rounded-xl bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Termin Pembayaran</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value as any)}
                    className="w-full px-2.5 py-2 border border-stone-200 rounded-xl bg-white"
                  >
                    <option value="cash">Cash / Tunai Saat Barang Diterima</option>
                    <option value="tempo_7">Tempo Kredit 7 Hari</option>
                    <option value="tempo_14">Tempo Kredit 14 Hari (2 Minggu)</option>
                    <option value="tempo_30">Tempo Kredit 30 Hari (1 Bulan)</option>
                    <option value="tempo_60">Tempo Kredit 60 Hari</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Jadwal pengiriman setiap hari Selasa dan Kamis..."
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sup-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded-md border-stone-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <label htmlFor="sup-active" className="text-xs font-semibold text-stone-700 cursor-pointer">
                  Supplier Aktif (Dapat dipilih saat membuat pesanan pembelian / stok masuk)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs"
                >
                  Simpan Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRM DELETE */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Hapus Supplier?</h3>
              <p className="text-xs text-stone-500 mt-1">
                Data supplier ini akan dihapus dari daftar master pemasok toko.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteSupplier(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
