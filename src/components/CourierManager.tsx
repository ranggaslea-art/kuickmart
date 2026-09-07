import React, { useState } from 'react';
import { 
  Bike, 
  Car, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  X, 
  Phone, 
  MessageSquare, 
  Upload, 
  Star, 
  ShieldCheck, 
  MapPin, 
  Sparkles,
  RotateCcw,
  Check,
  AlertTriangle,
  ExternalLink,
  Zap,
  Clock
} from 'lucide-react';
import { CourierInfo, Store } from '../types';
import { INITIAL_COURIERS } from '../data/mockData';
import { compressImageFile } from '../utils/imageHelper';
import { cleanPhoneNumber, openWhatsAppDirect, generateOrderWhatsAppMessage } from '../utils/whatsappHelper';

interface CourierManagerProps {
  couriers: CourierInfo[];
  stores: Store[];
  onUpdateCouriers: (couriers: CourierInfo[]) => void;
  onSelectCourierForOrder?: (courier: CourierInfo) => void;
}

const PRESET_COURIER_AVATARS = [
  { label: 'Rian (Pria)', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=60' },
  { label: 'Dimas (Pria)', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=60' },
  { label: 'Budi (Pria Dewasa)', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=60' },
  { label: 'Siti (Wanita)', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=60' },
  { label: 'Ahmad (Pria)', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=60' },
  { label: 'Rina (Wanita)', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=60' },
];

export const CourierManager: React.FC<CourierManagerProps> = ({
  couriers,
  stores,
  onUpdateCouriers,
}) => {
  const [searchTerm, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'delivering' | 'off'>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  
  // Modal Edit / Add
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCourier, setFormCourier] = useState<Partial<CourierInfo>>({
    name: '',
    phone: '',
    whatsapp: '',
    vehicleType: 'motor',
    vehiclePlate: '',
    photo: PRESET_COURIER_AVATARS[0].url,
    isVerified: true,
    status: 'available',
    rating: 4.9,
    totalDeliveries: 100,
    storeId: 'all',
    notes: '',
  });

  // Delete confirmation
  const [deletingCourier, setDeletingCourier] = useState<CourierInfo | null>(null);
  
  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredCouriers = couriers.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesStore = storeFilter === 'all' || c.storeId === storeFilter || c.storeId === 'all';
    return matchesSearch && matchesStatus && matchesStore;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormCourier({
      name: '',
      phone: '0812-',
      whatsapp: '',
      vehicleType: 'motor',
      vehiclePlate: 'B ',
      photo: PRESET_COURIER_AVATARS[Math.floor(Math.random() * PRESET_COURIER_AVATARS.length)].url,
      isVerified: true,
      status: 'available',
      rating: 4.9,
      totalDeliveries: 50,
      storeId: 'all',
      notes: '',
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (courier: CourierInfo) => {
    setEditingId(courier.id);
    setFormCourier({ ...courier });
    setIsEditing(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCourier.name?.trim()) {
      alert('Nama kurir wajib diisi.');
      return;
    }
    if (!formCourier.phone?.trim()) {
      alert('Nomor telepon / WhatsApp wajib diisi.');
      return;
    }
    if (!formCourier.vehiclePlate?.trim()) {
      alert('Plat nomor kendaraan wajib diisi.');
      return;
    }

    const cleanPhone = cleanPhoneNumber(formCourier.phone);

    if (editingId) {
      // Update existing
      const updated = couriers.map((c) => {
        if (c.id === editingId) {
          return {
            ...c,
            ...formCourier,
            whatsapp: formCourier.whatsapp ? cleanPhoneNumber(formCourier.whatsapp) : cleanPhone,
            updatedAt: new Date().toISOString(),
          } as CourierInfo;
        }
        return c;
      });
      onUpdateCouriers(updated);
      showToast(`Data kurir "${formCourier.name}" berhasil diperbarui!`);
    } else {
      // Create new
      const newCourier: CourierInfo = {
        id: `cour_${Date.now()}`,
        name: formCourier.name.trim(),
        phone: formCourier.phone.trim(),
        whatsapp: formCourier.whatsapp ? cleanPhoneNumber(formCourier.whatsapp) : cleanPhone,
        vehicleType: formCourier.vehicleType || 'motor',
        vehiclePlate: formCourier.vehiclePlate.trim().toUpperCase(),
        photo: formCourier.photo || PRESET_COURIER_AVATARS[0].url,
        isVerified: formCourier.isVerified ?? true,
        status: formCourier.status || 'available',
        rating: Number(formCourier.rating) || 4.9,
        totalDeliveries: Number(formCourier.totalDeliveries) || 0,
        storeId: formCourier.storeId || 'all',
        notes: formCourier.notes?.trim() || '',
        createdAt: new Date().toISOString().split('T')[0],
      };
      onUpdateCouriers([newCourier, ...couriers]);
      showToast(`Kurir baru "${newCourier.name}" berhasil ditambahkan!`);
    }

    setIsEditing(false);
  };

  const handleDeleteConfirm = () => {
    if (!deletingCourier) return;
    const remaining = couriers.filter((c) => c.id !== deletingCourier.id);
    onUpdateCouriers(remaining);
    showToast(`Kurir "${deletingCourier.name}" telah dihapus.`);
    setDeletingCourier(null);
  };

  const handleToggleStatus = (id: string) => {
    const statusCycle: ('available' | 'delivering' | 'off')[] = ['available', 'delivering', 'off'];
    const updated = couriers.map((c) => {
      if (c.id === id) {
        const nextIdx = (statusCycle.indexOf(c.status) + 1) % statusCycle.length;
        return { ...c, status: statusCycle[nextIdx] };
      }
      return c;
    });
    onUpdateCouriers(updated);
  };

  const handleResetDefault = () => {
    if (confirm('Kembalikan daftar kurir ke data bawaan awal?')) {
      onUpdateCouriers(INITIAL_COURIERS);
      showToast('Data kurir berhasil di-reset ke data bawaan.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageFile(file, 400, 0.8);
      setFormCourier((prev) => ({ ...prev, photo: base64 }));
      showToast('Foto kurir berhasil diunggah!');
    } catch {
      alert('Gagal memproses gambar foto.');
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'mobil':
        return <Car className="w-3.5 h-3.5" />;
      case 'sepeda_listrik':
        return <Zap className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Bike className="w-3.5 h-3.5" />;
    }
  };

  const getVehicleLabel = (type: string) => {
    switch (type) {
      case 'mobil':
        return 'Mobil Box Chiller';
      case 'sepeda_listrik':
        return 'Sepeda Listrik Eco';
      default:
        return 'Motor Express';
    }
  };

  const getStatusBadge = (status: CourierInfo['status']) => {
    switch (status) {
      case 'available':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Siap Antar (Standby)
          </span>
        );
      case 'delivering':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
            <Bike className="w-3 h-3 text-blue-600 animate-bounce" />
            Sedang Mengantar
          </span>
        );
      case 'off':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-stone-400" />
            Istirahat / Off
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-stone-900">Manajemen Kurir & Armada Pengiriman</h3>
              <p className="text-[11px] text-stone-500">
                Kelola data pengemudi, kontak WhatsApp, nomor telepon, armada kendaraan, dan status penugasan.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefault}
            className="px-3 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl border border-stone-200 flex items-center gap-1.5 transition-colors"
            title="Reset ke data awal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kurir Baru</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs flex flex-wrap gap-2.5 items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, plat nomor (B 4120 SMT), atau HP..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:outline-hidden focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Tabs */}
          <div className="flex bg-stone-100 p-0.5 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'}`}
            >
              Semua ({couriers.length})
            </button>
            <button
              onClick={() => setStatusFilter('available')}
              className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'available' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-stone-500'}`}
            >
              Standby ({couriers.filter(c => c.status === 'available').length})
            </button>
            <button
              onClick={() => setStatusFilter('delivering')}
              className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'delivering' ? 'bg-white text-blue-700 shadow-2xs' : 'text-stone-500'}`}
            >
              Antar ({couriers.filter(c => c.status === 'delivering').length})
            </button>
            <button
              onClick={() => setStatusFilter('off')}
              className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'off' ? 'bg-white text-stone-700 shadow-2xs' : 'text-stone-500'}`}
            >
              Off ({couriers.filter(c => c.status === 'off').length})
            </button>
          </div>

          {/* Store select filter */}
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-stone-700 font-medium"
          >
            <option value="all">Semua Cabang Toko</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Courier Grid Cards */}
      {filteredCouriers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
            <Bike className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-stone-800">Tidak ada kurir ditemukan</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Tidak ada kurir yang cocok dengan filter atau kata kunci pencarian Anda.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); setStoreFilter('all'); }}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredCouriers.map((courier) => {
            const assignedStore = stores.find((s) => s.id === courier.storeId);
            const waNumber = cleanPhoneNumber(courier.whatsapp || courier.phone);

            return (
              <div
                key={courier.id}
                className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs hover:border-blue-300 transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  {/* Top Header Card */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={courier.photo}
                          alt={courier.name}
                          className="w-13 h-13 rounded-2xl object-cover border-2 border-stone-200 shadow-2xs"
                        />
                        {courier.isVerified && (
                          <div
                            title="Driver Terverifikasi & Vaksin"
                            className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-2xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-black text-stone-900">{courier.name}</h4>
                          <div className="flex items-center text-amber-500 text-[11px] font-black">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{courier.rating.toFixed(1)}</span>
                          </div>
                        </div>

                        <div className="text-[11px] font-mono text-stone-600 flex items-center gap-1.5 mt-0.5">
                          <span className="flex items-center gap-1 bg-stone-100 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {getVehicleIcon(courier.vehicleType)}
                            {courier.vehiclePlate}
                          </span>
                          <span className="text-stone-400">•</span>
                          <span>{getVehicleLabel(courier.vehicleType)}</span>
                        </div>

                        {courier.isVerified && (
                          <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Driver Terverifikasi & Vaksin
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Pill with Toggle action */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(courier.id)}
                      title="Klik untuk ubah status ketersediaan"
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {getStatusBadge(courier.status)}
                    </button>
                  </div>

                  {/* Details row */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Kontak WhatsApp/HP:</span>
                      <span className="font-mono font-bold text-stone-800">{courier.phone}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Toko Penugasan:</span>
                      <span className="font-medium text-stone-800 truncate block">
                        {assignedStore ? assignedStore.name : 'Semua Cabang Toko'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Total Pengantaran:</span>
                      <span className="font-bold text-blue-700">{courier.totalDeliveries} Order Selesai</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Catatan / Perlengkapan:</span>
                      <span className="text-stone-600 text-[10px] truncate block" title={courier.notes || 'Siap antar'}>
                        {courier.notes || 'Standby tas pendingin'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Test Chat WhatsApp */}
                    <button
                      type="button"
                      onClick={() => {
                        const msg = `Halo Kak ${courier.name}, ini tes komunikasi WhatsApp dari Sistem POS NusaMart Express.`;
                        openWhatsAppDirect(waNumber, msg);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Uji kirim WhatsApp ke kurir"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WA Chat</span>
                    </button>

                    {/* Test Phone */}
                    <a
                      href={`tel:${courier.phone}`}
                      className="px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Panggilan telepon seluler"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span>Telepon</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(courier)}
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                      title="Ubah data kurir"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingCourier(courier)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus kurir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Courier */}
      {isEditing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Bike className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-stone-900">
                  {editingId ? 'Ubah Data Kurir Pengiriman' : 'Tambah Kurir Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-7 h-7 rounded-full bg-white hover:bg-stone-100 border border-stone-200 text-stone-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Profile Image & Avatar Selection */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1.5">Foto Profil Kurir</label>
                <div className="flex items-center gap-3">
                  <img
                    src={formCourier.photo || PRESET_COURIER_AVATARS[0].url}
                    alt="Preview"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-2xs"
                  />
                  <div className="flex-1 space-y-1.5">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl border border-stone-300">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Foto</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    <input
                      type="text"
                      value={formCourier.photo || ''}
                      onChange={(e) => setFormCourier({ ...formCourier, photo: e.target.value })}
                      placeholder="Atau tempel URL gambar..."
                      className="w-full text-xs px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                </div>

                {/* Preset Avatars */}
                <div className="mt-2">
                  <span className="text-[10px] text-stone-400 block mb-1">Preset Avatar Cepat:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COURIER_AVATARS.map((avatar, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormCourier({ ...formCourier, photo: avatar.url })}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                          formCourier.photo === avatar.url
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {avatar.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Courier Name */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Nama Lengkap Kurir <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formCourier.name || ''}
                  onChange={(e) => setFormCourier({ ...formCourier, name: e.target.value })}
                  placeholder="Contoh: Rian Hidayat"
                  className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Phone & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    No. Telepon / HP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCourier.phone || ''}
                    onChange={(e) => setFormCourier({ ...formCourier, phone: e.target.value })}
                    placeholder="Contoh: 0813-8899-7721"
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-stone-400">Digunakan untuk panggilan telpon & WA default</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    No. WhatsApp Khusus (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formCourier.whatsapp || ''}
                    onChange={(e) => setFormCourier({ ...formCourier, whatsapp: e.target.value })}
                    placeholder="Contoh: 081388997721"
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-stone-400">Kosongkan jika sama dengan no. telepon</span>
                </div>
              </div>

              {/* Vehicle Type & Plate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Jenis Armada</label>
                  <select
                    value={formCourier.vehicleType || 'motor'}
                    onChange={(e) => setFormCourier({ ...formCourier, vehicleType: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium"
                  >
                    <option value="motor">🛵 Motor Express (Vario/NMAX/Beat)</option>
                    <option value="mobil">🚗 Mobil Box / Chiller (Grosir)</option>
                    <option value="sepeda_listrik">⚡ Sepeda Listrik Eco</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Plat Nomor Kendaraan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCourier.vehiclePlate || ''}
                    onChange={(e) => setFormCourier({ ...formCourier, vehiclePlate: e.target.value.toUpperCase() })}
                    placeholder="Contoh: B 4120 SMT"
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Store assignment & Initial Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Cabang Toko Standby</label>
                  <select
                    value={formCourier.storeId || 'all'}
                    onChange={(e) => setFormCourier({ ...formCourier, storeId: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="all">Semua Cabang Toko</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Status Awal</label>
                  <select
                    value={formCourier.status || 'available'}
                    onChange={(e) => setFormCourier({ ...formCourier, status: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="available">🟢 Siap Antar (Standby)</option>
                    <option value="delivering">🔵 Sedang Mengantar Pesanan</option>
                    <option value="off">⚪ Istirahat / Sedang Libur</option>
                  </select>
                </div>
              </div>

              {/* Rating & Total Deliveries */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Rating Driver</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={formCourier.rating ?? 4.9}
                    onChange={(e) => setFormCourier({ ...formCourier, rating: parseFloat(e.target.value) })}
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Total Pengantaran</label>
                  <input
                    type="number"
                    min="0"
                    value={formCourier.totalDeliveries ?? 0}
                    onChange={(e) => setFormCourier({ ...formCourier, totalDeliveries: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Verification Badge Checkbox */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-xs font-bold text-emerald-950">Driver Terverifikasi & Vaksin</div>
                    <div className="text-[10px] text-emerald-700">Tampilkan centang hijau verifikasi resmi di aplikasi pelanggan</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formCourier.isVerified ?? true}
                  onChange={(e) => setFormCourier({ ...formCourier, isVerified: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Catatan / Area Spesialisasi</label>
                <textarea
                  rows={2}
                  value={formCourier.notes || ''}
                  onChange={(e) => setFormCourier({ ...formCourier, notes: e.target.value })}
                  placeholder="Contoh: Menguasai jalan tikus Menteng, tas pendingin es krim & daging ready."
                  className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Simpan Perubahan' : 'Tambah Kurir'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCourier && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 text-center space-y-4 shadow-2xl border border-stone-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-stone-900">Hapus Kurir Pengiriman?</h3>
              <p className="text-xs text-stone-500 mt-1">
                Apakah Anda yakin ingin menghapus <strong>{deletingCourier.name}</strong> ({deletingCourier.vehiclePlate}) dari sistem?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingCourier(null)}
                className="flex-1 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs"
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
