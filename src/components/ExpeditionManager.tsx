import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  RotateCcw,
  Sparkles,
  Check,
  AlertCircle,
  Clock,
  Tag,
  DollarSign,
  Package,
  Layers,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { ExpeditionServiceOption } from '../types';
import { INITIAL_EXPEDITION_SERVICES } from '../data/mockData';
import { formatRupiah } from '../utils/formatters';

interface ExpeditionManagerProps {
  expeditionServices: ExpeditionServiceOption[];
  onUpdateExpeditionServices: (services: ExpeditionServiceOption[]) => void;
}

const PRESET_COURIERS = [
  { code: 'jne', name: 'JNE Express', color: 'bg-blue-600', textColor: 'text-blue-600', defaultServices: ['REG (Reguler)', 'YES (Yakin Esok Sampai)', 'OKE (Ekonomis)'] },
  { code: 'jnt', name: 'J&T Express', color: 'bg-red-600', textColor: 'text-red-600', defaultServices: ['EZ (Cepat Reguler)', 'SUPER (Prioritas Kilat)', 'ECO (Ekonomi)'] },
  { code: 'sicepat', name: 'SiCepat Ekspres', color: 'bg-rose-700', textColor: 'text-rose-700', defaultServices: ['REG (Regular)', 'BEST (Besok Sampai)', 'HALU (Ekonomis)'] },
  { code: 'pos', name: 'Pos Indonesia', color: 'bg-orange-600', textColor: 'text-orange-600', defaultServices: ['Kilat Khusus', 'Pos Express Next Day', 'Jumbo Ekonomi'] },
  { code: 'anteraja', name: 'Anteraja', color: 'bg-fuchsia-600', textColor: 'text-fuchsia-600', defaultServices: ['Regular', 'Next Day', 'Economy'] },
  { code: 'lion', name: 'Lion Parcel', color: 'bg-red-700', textColor: 'text-red-700', defaultServices: ['ONEPACK (Besok Sampai)', 'REGPACK (Reguler)', 'JAGOPACK (Murah)'] },
  { code: 'ninja', name: 'Ninja Xpress', color: 'bg-red-800', textColor: 'text-red-800', defaultServices: ['Standard', 'Next Day'] },
  { code: 'idexpress', name: 'ID Express', color: 'bg-red-500', textColor: 'text-red-500', defaultServices: ['Reguler', 'Same Day', 'Cargo'] },
  { code: 'wahana', name: 'Wahana Express', color: 'bg-yellow-500', textColor: 'text-yellow-600', defaultServices: ['Ekspres', 'Kargo'] },
  { code: 'tiki', name: 'TIKI', color: 'bg-blue-700', textColor: 'text-blue-700', defaultServices: ['REG (Reguler)', 'ONS (Over Night Services)', 'ECO (Economy)'] },
  { code: 'custom', name: 'Ekspedisi Kustom', color: 'bg-stone-700', textColor: 'text-stone-700', defaultServices: ['Layanan Standar'] },
];

export const ExpeditionManager: React.FC<ExpeditionManagerProps> = ({
  expeditionServices,
  onUpdateExpeditionServices,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourier, setFilterCourier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ExpeditionServiceOption>>({
    courierCode: 'jne',
    courierName: 'JNE Express',
    serviceCode: 'REG',
    serviceName: '',
    etd: '2 - 3 Hari',
    cost: 11000,
    badge: '',
    color: 'bg-blue-600',
    description: '',
    isActive: true,
  });

  // Delete Confirmation State
  const [deletingItem, setDeletingItem] = useState<ExpeditionServiceOption | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered List
  const filteredList = expeditionServices.filter((item) => {
    const matchesSearch =
      item.courierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCourier = filterCourier === 'all' || item.courierCode === filterCourier;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && item.isActive !== false) ||
      (filterStatus === 'inactive' && item.isActive === false);

    return matchesSearch && matchesCourier && matchesStatus;
  });

  // Unique couriers for filter tabs
  const courierCodesInUse = Array.from(new Set(expeditionServices.map((s) => s.courierCode || (s.courierName ? s.courierName.toLowerCase().replace(/\s+/g, '') : 'custom')).filter(Boolean)));

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      courierCode: 'jne',
      courierName: 'JNE Express',
      serviceCode: 'REG',
      serviceName: 'JNE Reguler Baru',
      etd: '2 - 3 Hari',
      cost: 12000,
      badge: 'Baru',
      color: 'bg-blue-600',
      description: 'Layanan pengiriman cepat dan aman ke seluruh wilayah Indonesia.',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ExpeditionServiceOption) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handlePresetSelect = (code: string) => {
    const found = PRESET_COURIERS.find((p) => p.code === code);
    if (!found) return;

    setFormData((prev) => ({
      ...prev,
      courierCode: found.code,
      courierName: found.name,
      color: found.color,
      serviceName: prev.serviceName || found.defaultServices[0] || 'Reguler',
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.courierName?.trim()) {
      alert('Nama ekspedisi wajib diisi.');
      return;
    }
    if (!formData.serviceName?.trim()) {
      alert('Nama layanan pengiriman wajib diisi.');
      return;
    }
    if (!formData.cost || formData.cost < 0) {
      alert('Tarif ongkos kirim wajib berupa angka positif.');
      return;
    }
    if (!formData.etd?.trim()) {
      alert('Estimasi berapa lama sampai wajib diisi (misal: 2 - 3 Hari).');
      return;
    }

    if (editingId) {
      // Update
      const updated = expeditionServices.map((item) => {
        if (item.id === editingId) {
          return {
            ...item,
            ...formData,
            cost: Number(formData.cost),
          } as ExpeditionServiceOption;
        }
        return item;
      });
      onUpdateExpeditionServices(updated);
      showToast(`Layanan ekspedisi "${formData.courierName} - ${formData.serviceName}" berhasil diperbarui!`);
    } else {
      // Add new
      const newItem: ExpeditionServiceOption = {
        id: 'exp_' + Math.random().toString(36).substring(2, 9),
        courierCode: formData.courierCode || 'custom',
        courierName: formData.courierName.trim(),
        serviceCode: formData.serviceCode?.trim() || 'REG',
        serviceName: formData.serviceName.trim(),
        etd: formData.etd.trim(),
        cost: Number(formData.cost),
        badge: formData.badge?.trim() || undefined,
        color: formData.color || 'bg-stone-700',
        description: formData.description?.trim() || 'Layanan ekspedisi terpercaya.',
        isActive: formData.isActive !== false,
      };
      onUpdateExpeditionServices([newItem, ...expeditionServices]);
      showToast(`Layanan ekspedisi baru "${newItem.courierName} - ${newItem.serviceName}" berhasil ditambahkan!`);
    }

    setIsModalOpen(false);
  };

  const handleToggleActive = (id: string) => {
    const updated = expeditionServices.map((item) => {
      if (item.id === id) {
        const nextState = item.isActive === false ? true : false;
        showToast(`Status "${item.courierName} - ${item.serviceName}" diubah menjadi: ${nextState ? 'Aktif' : 'Nonaktif'}`);
        return { ...item, isActive: nextState };
      }
      return item;
    });
    onUpdateExpeditionServices(updated);
  };

  const handleDelete = () => {
    if (!deletingItem) return;
    const updated = expeditionServices.filter((s) => s.id !== deletingItem.id);
    onUpdateExpeditionServices(updated);
    showToast(`Layanan ekspedisi "${deletingItem.courierName} - ${deletingItem.serviceName}" berhasil dihapus.`);
    setDeletingItem(null);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Kembalikan macam pengiriman ekspedisi ke pengaturan standar (11 layanan JNE, J&T, SiCepat, Pos, Anteraja)? Data kustom akan direset.')) {
      onUpdateExpeditionServices([...INITIAL_EXPEDITION_SERVICES]);
      showToast('Daftar ekspedisi berhasil direset ke standar 11 layanan nasional.');
    }
  };

  const activeCount = expeditionServices.filter((s) => s.isActive !== false).length;
  const costs = expeditionServices.map((s) => s.cost).filter((c) => c > 0);
  const minCost = costs.length > 0 ? Math.min(...costs) : 0;
  const maxCost = costs.length > 0 ? Math.max(...costs) : 0;

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-stone-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-stone-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Truck className="w-3 h-3 text-blue-300" />
                Editor Pengiriman Ekspedisi
              </span>
              <span className="text-xs font-bold text-amber-300">
                {activeCount} dari {expeditionServices.length} Layanan Aktif
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight">
              Macam Pengiriman Ekspedisi &amp; Tarif Ongkir
            </h3>
            <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
              Atur macam-macam jasa ekspedisi (JNE, J&amp;T, SiCepat, Pos, dll.), tarif ongkos kirim ke pembeli,
              dan estimasi waktu tiba (berapa lama sampai) yang otomatis muncul di halaman Checkout &amp; Pembayaran.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-stone-200 border border-white/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Kembalikan ke 11 layanan ekspedisi default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Standar</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Ekspedisi Baru</span>
            </button>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-stone-400 text-[10px] block uppercase font-bold">Total Ekspedisi</span>
            <span className="text-base font-black text-white">{expeditionServices.length} Layanan</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-stone-400 text-[10px] block uppercase font-bold">Status Aktif Checkout</span>
            <span className="text-base font-black text-emerald-400">{activeCount} Layanan</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-stone-400 text-[10px] block uppercase font-bold">Tarif Terendah</span>
            <span className="text-base font-black text-amber-300">{formatRupiah(minCost)}</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-stone-400 text-[10px] block uppercase font-bold">Tarif Tertinggi</span>
            <span className="text-base font-black text-blue-300">{formatRupiah(maxCost)}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama ekspedisi, layanan (REG, YES, EZ...), atau deskripsi..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-stone-500 hidden sm:inline">Status:</span>
            <div className="flex rounded-xl bg-stone-100 p-0.5 border border-stone-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'all' ? 'bg-white font-bold text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'active' ? 'bg-white font-bold text-emerald-700 shadow-2xs' : 'text-stone-600 hover:text-emerald-700'
                }`}
              >
                Aktif ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('inactive')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'inactive' ? 'bg-white font-bold text-stone-500 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Nonaktif
              </button>
            </div>
          </div>
        </div>

        {/* Courier Tabs Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={() => setFilterCourier('all')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
              filterCourier === 'all'
                ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
            }`}
          >
            Semua Kurir ({expeditionServices.length})
          </button>
          {courierCodesInUse.map((code) => {
            const count = expeditionServices.filter((s) => s.courierCode === code).length;
            const courierName = expeditionServices.find((s) => (s.courierCode || 'custom') === code)?.courierName || (code ? String(code).toUpperCase() : 'EKSPEDISI');
            return (
              <button
                key={code}
                type="button"
                onClick={() => setFilterCourier(code)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
                  filterCourier === code
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {courierName} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Expedition Cards */}
      {filteredList.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <Truck className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-stone-800">Tidak Ada Layanan Ekspedisi Ditemukan</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Tidak ada ekspedisi yang cocok dengan kriteria pencarian atau filter yang dipilih.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterCourier('all');
              setFilterStatus('all');
            }}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredList.map((item) => {
            const isActive = item.isActive !== false;
            return (
              <div
                key={item.id}
                className={`bg-white border rounded-2xl p-4 transition-all space-y-3 relative flex flex-col justify-between ${
                  isActive
                    ? 'border-stone-200 hover:border-blue-300 hover:shadow-md'
                    : 'border-stone-200 bg-stone-50/70 opacity-70'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top Bar: Courier Brand & Status Switch */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl ${item.color || 'bg-blue-600'} text-white flex items-center justify-center font-black text-xs shadow-2xs shrink-0 uppercase tracking-wider`}>
                        {item.courierCode?.substring(0, 3) || 'EXP'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-black text-stone-900 leading-tight">
                            {item.courierName}
                          </h4>
                          {item.badge && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md border border-amber-200">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-blue-700 mt-0.5">
                          {item.serviceName}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Active Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isActive ? 'bg-emerald-600' : 'bg-stone-300'
                      }`}
                      title={isActive ? 'Klik untuk nonaktifkan dari checkout' : 'Klik untuk aktifkan di checkout'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Tarif & Estimasi Info */}
                  <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-bold">Tarif Ongkir</span>
                      <span className="text-sm font-black text-blue-900">{formatRupiah(item.cost)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block uppercase font-bold flex items-center gap-1 justify-end">
                        <Clock className="w-2.5 h-2.5 text-stone-400" /> Estimasi Sampai
                      </span>
                      <span className="text-xs font-black text-stone-800 font-mono">{item.etd}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                    {item.description || 'Layanan ekspedisi terpercaya.'}
                  </p>
                </div>

                {/* Bottom Actions */}
                <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2 mt-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-200 text-stone-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                    {isActive ? 'Aktif di Checkout' : 'Nonaktif'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-blue-50 hover:text-blue-700 text-stone-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Edit Nama Ekspedisi, Tarif & Estimasi"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingItem(item)}
                      className="p-1.5 rounded-lg bg-stone-100 hover:bg-red-50 hover:text-red-700 text-stone-400 transition-colors cursor-pointer"
                      title="Hapus Layanan Ekspedisi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL FORM TAMBAH / EDIT EKSPEDISI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="p-5 border-b border-stone-100 bg-gradient-to-r from-stone-900 to-blue-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    {editingId ? 'Edit Macam Pengiriman Ekspedisi' : 'Tambah Layanan Ekspedisi Baru'}
                  </h3>
                  <p className="text-xs text-stone-300">
                    Atur nama ekspedisi, tarif ongkir, dan estimasi waktu sampai.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Preset Quick Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  Pilih Brand / Preset Ekspedisi:
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {PRESET_COURIERS.map((preset) => (
                    <button
                      key={preset.code}
                      type="button"
                      onClick={() => handlePresetSelect(preset.code)}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
                        formData.courierCode === preset.code
                          ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. Nama Ekspedisi & Kode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">
                    Nama Ekspedisi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.courierName || ''}
                    onChange={(e) => setFormData({ ...formData, courierName: e.target.value })}
                    placeholder="Contoh: JNE Express, J&T Express"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">
                    Nama Layanan / Paket <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.serviceName || ''}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    placeholder="Contoh: REG (Reguler), YES, EZ, BEST"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* 2. Tarif Pengiriman & Berapa Lama Estimasi Sampai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">
                    Tarif Pengiriman Ekspedisi (Rp) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">Rp</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={500}
                      value={formData.cost ?? 10000}
                      onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                      placeholder="11000"
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-stone-500">
                    Format: {formatRupiah(formData.cost || 0)}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">
                    Estimasi Sampai (Berapa Lama) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.etd || ''}
                    onChange={(e) => setFormData({ ...formData, etd: e.target.value })}
                    placeholder="Contoh: 1 - 2 Hari, Besok Sampai, 2 - 3 Hari"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                  />
                  <span className="text-[10px] text-stone-500">
                    Akan ditampilkan di opsi checkout pelanggan
                  </span>
                </div>
              </div>

              {/* 3. Badge Promo / Keunggulan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">
                    Badge / Tagline Singkat (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.badge || ''}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="Contoh: Rekomendasi, Kilat, Super Hemat"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">
                    Warna Badge Logo
                  </label>
                  <select
                    value={formData.color || 'bg-blue-600'}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="bg-blue-600">Biru JNE / TIKI</option>
                    <option value="bg-red-600">Merah J&amp;T</option>
                    <option value="bg-rose-700">Merah Maroon SiCepat</option>
                    <option value="bg-orange-600">Oranye Pos Indonesia</option>
                    <option value="bg-fuchsia-600">Ungu Magenta Anteraja</option>
                    <option value="bg-stone-800">Hitam Elegan / Netral</option>
                    <option value="bg-emerald-600">Hijau Segar</option>
                  </select>
                </div>
              </div>

              {/* 4. Deskripsi Layanan */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">
                  Deskripsi &amp; Keunggulan Layanan:
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Contoh: Pengiriman reguler cepat dengan jangkauan area terluas se-Nusantara tanpa libur."
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* 5. Status Aktif Checkbox */}
              <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-800 block">Aktifkan Layanan di Checkout</span>
                  <p className="text-[10px] text-stone-500">
                    Pelanggan dapat memilih opsi pengiriman ekspedisi ini saat melakukan pembayaran.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isActive !== false}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* Live Preview Card */}
              <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                  Simulasi Tampilan di Checkout Pelanggan:
                </span>
                <div className="bg-white border-2 border-blue-600 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl ${formData.color || 'bg-blue-600'} text-white flex items-center justify-center font-black text-xs uppercase shrink-0`}>
                      {formData.courierCode?.substring(0, 3) || 'EXP'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-stone-900">{formData.courierName || 'Nama Ekspedisi'}</span>
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                          {formData.serviceName || 'REG'}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        {formData.serviceName || 'Reguler'} • Estimasi {formData.etd || '2-3 Hari'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-blue-900 block">{formatRupiah(formData.cost || 0)}</span>
                    <span className="text-[9px] text-stone-400">Ongkir Ekspedisi</span>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Simpan Perubahan' : 'Tambahkan Ekspedisi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-stone-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-stone-900">Hapus Layanan Ekspedisi?</h4>
              <p className="text-xs text-stone-600">
                Apakah Anda yakin ingin menghapus layanan <strong>"{deletingItem.courierName} - {deletingItem.serviceName}"</strong> (Tarif: {formatRupiah(deletingItem.cost)})?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
