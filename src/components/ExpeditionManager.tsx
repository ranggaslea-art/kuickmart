import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  X, 
  ExternalLink, 
  RotateCcw, 
  Check, 
  AlertTriangle, 
  Calculator, 
  DollarSign, 
  Package, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  Layers, 
  Sparkles, 
  ArrowRight,
  Info,
  Scale
} from 'lucide-react';
import { Expedition, ExpeditionServiceRate } from '../types';
import { INITIAL_EXPEDITIONS, calculateExpeditionRate } from '../data/mockExpeditions';
import { formatRupiah } from '../utils/formatters';
import { compressImageFile } from '../utils/imageHelper';

interface ExpeditionManagerProps {
  expeditions: Expedition[];
  onUpdateExpeditions: (expeditions: Expedition[]) => void;
  currentSlug?: string;
}

const PRESET_LOGOS = [
  { name: 'JNE', code: 'JNE', color: '#003399', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=120&auto=format&fit=crop&q=60' },
  { name: 'J&T', code: 'JNT', color: '#e60012', url: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=120&auto=format&fit=crop&q=60' },
  { name: 'SiCepat', code: 'SICEPAT', color: '#d90429', url: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=120&auto=format&fit=crop&q=60' },
  { name: 'POS Indonesia', code: 'POS', color: '#ff6600', url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=120&auto=format&fit=crop&q=60' },
  { name: 'TIKI', code: 'TIKI', color: '#0055a5', url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=120&auto=format&fit=crop&q=60' },
  { name: 'Anteraja', code: 'ANTERAJA', color: '#e02874', url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=120&auto=format&fit=crop&q=60' },
  { name: 'Ninja Xpress', code: 'NINJA', color: '#be1e2d', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=120&auto=format&fit=crop&q=60' },
  { name: 'Wahana', code: 'WAHANA', color: '#ffcc00', url: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=120&auto=format&fit=crop&q=60' },
];

export const ExpeditionManager: React.FC<ExpeditionManagerProps> = ({
  expeditions,
  onUpdateExpeditions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedExpeditions, setExpandedExpeditions] = useState<Record<string, boolean>>({
    exp_jne: true,
    exp_jnt: true,
    exp_sicepat: true,
  });

  // Modal State: Expedition Form
  const [isExpeditionModalOpen, setIsExpeditionModalOpen] = useState(false);
  const [editingExpedition, setEditingExpedition] = useState<Partial<Expedition> | null>(null);

  // Modal State: Service / Rate Form
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [targetExpeditionId, setTargetExpeditionId] = useState<string>('');
  const [editingService, setEditingService] = useState<Partial<ExpeditionServiceRate> | null>(null);

  // Modal State: Simulator / Calculator
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simWeightKg, setSimWeightKg] = useState<number>(1.5);

  // Delete Confirm
  const [deletingItem, setDeletingItem] = useState<{ type: 'expedition' | 'service'; expeditionId: string; serviceId?: string; name: string } | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Aggregates
  const stats = useMemo(() => {
    const totalExpeditions = expeditions.length;
    const activeExpeditions = expeditions.filter((e) => e.isActive).length;
    let totalServices = 0;
    let activeServices = 0;
    let minRate = Infinity;
    let maxRate = 0;

    expeditions.forEach((e) => {
      (e.services || []).forEach((s) => {
        totalServices++;
        if (s.isActive && e.isActive) {
          activeServices++;
          if (s.baseRate < minRate) minRate = s.baseRate;
          if (s.baseRate > maxRate) maxRate = s.baseRate;
        }
      });
    });

    return {
      totalExpeditions,
      activeExpeditions,
      totalServices,
      activeServices,
      minRate: minRate === Infinity ? 0 : minRate,
      maxRate,
    };
  }, [expeditions]);

  const filteredExpeditions = useMemo(() => {
    return expeditions.filter((e) => {
      const matchesSearch = 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.services || []).some((s) => s.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) || s.serviceCode.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && e.isActive) || 
        (statusFilter === 'inactive' && !e.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [expeditions, searchTerm, statusFilter]);

  const toggleExpand = (id: string) => {
    setExpandedExpeditions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Toggle Expedition Active
  const handleToggleExpeditionActive = (expeditionId: string) => {
    const updated = expeditions.map((e) => 
      e.id === expeditionId ? { ...e, isActive: !e.isActive, updatedAt: new Date().toISOString() } : e
    );
    onUpdateExpeditions(updated);
    showToast('Status ekspedisi berhasil diperbarui.');
  };

  // Toggle Service Active
  const handleToggleServiceActive = (expeditionId: string, serviceId: string) => {
    const updated = expeditions.map((e) => {
      if (e.id !== expeditionId) return e;
      return {
        ...e,
        services: e.services.map((s) => 
          s.id === serviceId ? { ...s, isActive: !s.isActive } : s
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    onUpdateExpeditions(updated);
    showToast('Status tarif layanan berhasil diperbarui.');
  };

  // Open Add Expedition
  const handleOpenAddExpedition = () => {
    setEditingExpedition({
      name: '',
      code: '',
      color: '#003399',
      isActive: true,
      logo: PRESET_LOGOS[0].url,
      trackingUrlPattern: 'https://cekresi.com/?noresi={resi}',
      phone: '',
      notes: '',
      services: [],
    });
    setIsExpeditionModalOpen(true);
  };

  // Open Edit Expedition
  const handleOpenEditExpedition = (expedition: Expedition) => {
    setEditingExpedition({ ...expedition });
    setIsExpeditionModalOpen(true);
  };

  // Save Expedition
  const handleSaveExpedition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpedition || !editingExpedition.name?.trim() || !editingExpedition.code?.trim()) {
      alert('Nama dan kode ekspedisi wajib diisi.');
      return;
    }

    const cleanCode = editingExpedition.code.trim().toUpperCase();
    const isNew = !editingExpedition.id;
    const now = new Date().toISOString();

    if (isNew) {
      const newExp: Expedition = {
        id: 'exp_' + Math.random().toString(36).substring(2, 9),
        name: editingExpedition.name.trim(),
        code: cleanCode,
        logo: editingExpedition.logo || PRESET_LOGOS[0].url,
        color: editingExpedition.color || '#2563eb',
        isActive: editingExpedition.isActive ?? true,
        trackingUrlPattern: editingExpedition.trackingUrlPattern?.trim() || 'https://cekresi.com/?noresi={resi}',
        phone: editingExpedition.phone?.trim() || '',
        notes: editingExpedition.notes?.trim() || '',
        services: [
          {
            id: 'srv_' + Math.random().toString(36).substring(2, 9),
            serviceCode: 'REG',
            serviceName: 'Layanan Reguler',
            etd: '1-2 Hari',
            rateType: 'per_kg',
            baseRate: 12000,
            ratePerKg: 10000,
            minWeightKg: 1,
            description: 'Layanan kirim standar terpercaya.',
            isActive: true,
          }
        ],
        createdAt: now,
        updatedAt: now,
      };
      onUpdateExpeditions([...expeditions, newExp]);
      setExpandedExpeditions((prev) => ({ ...prev, [newExp.id]: true }));
      showToast(`Ekspedisi ${newExp.name} berhasil ditambahkan.`);
    } else {
      const updated = expeditions.map((exp) => 
        exp.id === editingExpedition.id
          ? {
              ...exp,
              name: editingExpedition.name!.trim(),
              code: cleanCode,
              logo: editingExpedition.logo || exp.logo,
              color: editingExpedition.color || exp.color,
              isActive: editingExpedition.isActive ?? exp.isActive,
              trackingUrlPattern: editingExpedition.trackingUrlPattern?.trim() || exp.trackingUrlPattern,
              phone: editingExpedition.phone?.trim() || '',
              notes: editingExpedition.notes?.trim() || '',
              updatedAt: now,
            }
          : exp
      );
      onUpdateExpeditions(updated);
      showToast(`Perubahan ekspedisi ${editingExpedition.name} berhasil disimpan.`);
    }

    setIsExpeditionModalOpen(false);
    setEditingExpedition(null);
  };

  // Open Add Service
  const handleOpenAddService = (expeditionId: string) => {
    setTargetExpeditionId(expeditionId);
    setEditingService({
      serviceCode: 'REG',
      serviceName: 'Reguler',
      etd: '1-2 Hari',
      rateType: 'per_kg',
      baseRate: 12000,
      ratePerKg: 10000,
      minWeightKg: 1,
      description: 'Pengiriman reguler standar.',
      isActive: true,
    });
    setIsServiceModalOpen(true);
  };

  // Open Edit Service
  const handleOpenEditService = (expeditionId: string, service: ExpeditionServiceRate) => {
    setTargetExpeditionId(expeditionId);
    setEditingService({ ...service });
    setIsServiceModalOpen(true);
  };

  // Save Service
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService || !editingService.serviceName?.trim() || !editingService.serviceCode?.trim()) {
      alert('Nama dan kode layanan tarif wajib diisi.');
      return;
    }

    const baseRateNum = Math.max(0, Number(editingService.baseRate) || 0);
    const ratePerKgNum = Math.max(0, Number(editingService.ratePerKg) || 0);
    const minWeightNum = Math.max(1, Number(editingService.minWeightKg) || 1);
    const isNew = !editingService.id;

    const updated = expeditions.map((exp) => {
      if (exp.id !== targetExpeditionId) return exp;
      let newServices = [...(exp.services || [])];

      if (isNew) {
        const newSrv: ExpeditionServiceRate = {
          id: 'srv_' + Math.random().toString(36).substring(2, 9),
          serviceCode: editingService.serviceCode!.trim().toUpperCase(),
          serviceName: editingService.serviceName!.trim(),
          etd: editingService.etd?.trim() || '1-2 Hari',
          rateType: editingService.rateType || 'per_kg',
          baseRate: baseRateNum,
          ratePerKg: ratePerKgNum,
          minWeightKg: minWeightNum,
          description: editingService.description?.trim() || '',
          isActive: editingService.isActive ?? true,
        };
        newServices.push(newSrv);
      } else {
        newServices = newServices.map((s) => 
          s.id === editingService.id
            ? {
                ...s,
                serviceCode: editingService.serviceCode!.trim().toUpperCase(),
                serviceName: editingService.serviceName!.trim(),
                etd: editingService.etd?.trim() || s.etd,
                rateType: editingService.rateType || s.rateType,
                baseRate: baseRateNum,
                ratePerKg: ratePerKgNum,
                minWeightKg: minWeightNum,
                description: editingService.description?.trim() || '',
                isActive: editingService.isActive ?? s.isActive,
              }
            : s
        );
      }

      return {
        ...exp,
        services: newServices,
        updatedAt: new Date().toISOString(),
      };
    });

    onUpdateExpeditions(updated);
    showToast(`Layanan tarif ${editingService.serviceName} berhasil disimpan.`);
    setIsServiceModalOpen(false);
    setEditingService(null);
  };

  // Confirm Delete
  const handleExecuteDelete = () => {
    if (!deletingItem) return;

    if (deletingItem.type === 'expedition') {
      const updated = expeditions.filter((e) => e.id !== deletingItem.expeditionId);
      onUpdateExpeditions(updated);
      showToast(`Ekspedisi ${deletingItem.name} berhasil dihapus.`);
    } else if (deletingItem.type === 'service' && deletingItem.serviceId) {
      const updated = expeditions.map((e) => {
        if (e.id !== deletingItem.expeditionId) return e;
        return {
          ...e,
          services: (e.services || []).filter((s) => s.id !== deletingItem.serviceId),
          updatedAt: new Date().toISOString(),
        };
      });
      onUpdateExpeditions(updated);
      showToast(`Layanan tarif ${deletingItem.name} berhasil dihapus.`);
    }

    setDeletingItem(null);
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (confirm('Kembalikan konfigurasi ekspedisi ke daftar standar Indonesia (JNE, J&T, SiCepat, POS, TIKI, Anteraja)?')) {
      onUpdateExpeditions(INITIAL_EXPEDITIONS);
      showToast('Konfigurasi ekspedisi berhasil direset ke standar populer.');
    }
  };

  // Image Upload handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingExpedition) {
      try {
        const compressed = await compressImageFile(file, 200, 0.85);
        setEditingExpedition({ ...editingExpedition, logo: compressed });
      } catch (err) {
        alert('Gagal mengupload logo ekspedisi.');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[100] bg-stone-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & KPI Summary */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Truck className="w-5 h-5 text-white" />
            </span>
            <h2 className="text-lg font-bold">Modul Expedisi Editor & Tarif Pengiriman</h2>
            <span className="bg-amber-400/30 text-amber-100 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-300/40">
              JNE, J&T, SiCepat, dll
            </span>
          </div>
          <p className="text-xs text-amber-100 max-w-2xl leading-relaxed">
            Kelola macam-macam jenis ekspedisi kurir logistik dan tentukan tarif pengiriman (flat / per kg) yang akan muncul langsung di <strong>Keranjang Belanja</strong> dan <strong>Checkout Pelanggan</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsSimulatorOpen(true)}
            className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-colors border border-white/30 cursor-pointer shadow-xs"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-200" />
            <span>Simulasi Ongkir</span>
          </button>
          <button
            type="button"
            onClick={handleResetToDefault}
            className="bg-white/10 hover:bg-white/20 text-white font-medium text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 transition-colors border border-white/20 cursor-pointer"
            title="Reset ke ekspedisi standar nasional"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Standar</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddExpedition}
            className="bg-white text-orange-700 hover:bg-orange-50 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Ekspedisi</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-stone-500 font-medium">Total Ekspedisi</div>
            <div className="text-lg font-black text-stone-900">
              {stats.activeExpeditions} <span className="text-xs font-normal text-stone-400">/ {stats.totalExpeditions}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-stone-500 font-medium">Total Layanan / Tarif</div>
            <div className="text-lg font-black text-stone-900">
              {stats.activeServices} <span className="text-xs font-normal text-stone-400">/ {stats.totalServices}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-stone-500 font-medium">Tarif Termurah</div>
            <div className="text-lg font-black text-emerald-700">{formatRupiah(stats.minRate)}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-stone-500 font-medium">Tarif Tertinggi</div>
            <div className="text-lg font-black text-purple-700">{formatRupiah(stats.maxRate)}</div>
          </div>
        </div>
      </div>

      {/* Toolbar Search & Status Filter */}
      <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama ekspedisi (JNE, J&T) atau nama layanan..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs text-stone-500 font-medium hidden sm:inline">Status:</span>
          {(['all', 'active', 'inactive'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-orange-600 text-white font-bold shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {st === 'all' ? 'Semua' : st === 'active' ? 'Aktif' : 'Non-aktif'}
            </button>
          ))}
        </div>
      </div>

      {/* Ekspedisi List */}
      <div className="space-y-3">
        {filteredExpeditions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center">
            <Truck className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-stone-700">Tidak ada ekspedisi ditemukan</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
              Coba sesuaikan kata kunci pencarian atau klik tombol di bawah untuk menambah ekspedisi baru.
            </p>
            <button
              type="button"
              onClick={handleOpenAddExpedition}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-2 px-4 rounded-xl"
            >
              + Tambah Ekspedisi Pertama
            </button>
          </div>
        ) : (
          filteredExpeditions.map((exp) => {
            const isExpanded = expandedExpeditions[exp.id] ?? true;
            const activeServicesCount = (exp.services || []).filter((s) => s.isActive).length;

            return (
              <div 
                key={exp.id} 
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  exp.isActive ? 'border-stone-200 shadow-2xs' : 'border-stone-200/60 opacity-75 bg-stone-50/50'
                }`}
              >
                {/* Ekspedisi Header Banner */}
                <div className="p-3.5 sm:p-4 border-b border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Logo / Badge */}
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-base shadow-xs shrink-0 overflow-hidden"
                      style={{ backgroundColor: exp.color || '#ea580c' }}
                    >
                      {exp.logo ? (
                        <img 
                          src={exp.logo} 
                          alt={exp.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        exp.code.substring(0, 3)
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-stone-900">{exp.name}</h3>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                          {exp.code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          exp.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                        }`}>
                          {exp.isActive ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-1 flex-wrap">
                        <span>{exp.services?.length || 0} Layanan Tarif ({activeServicesCount} Aktif)</span>
                        {exp.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-stone-400" /> {exp.phone}
                          </span>
                        )}
                        {exp.trackingUrlPattern && (
                          <span className="text-stone-400 text-[10px] truncate max-w-xs" title={exp.trackingUrlPattern}>
                            Cek Resi: {exp.trackingUrlPattern}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Header */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                    {/* Switch status */}
                    <button
                      type="button"
                      onClick={() => handleToggleExpeditionActive(exp.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                        exp.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                      title={exp.isActive ? 'Nonaktifkan Ekspedisi' : 'Aktifkan Ekspedisi'}
                    >
                      {exp.isActive ? 'Aktif' : 'Non-aktif'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAddService(exp.id)}
                      className="bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                      title="Tambah Tarif Baru untuk Ekspedisi ini"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Tarif Baru</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditExpedition(exp)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Ekspedisi"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingItem({ type: 'expedition', expeditionId: exp.id, name: exp.name })}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Ekspedisi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(exp.id)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer ml-1"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Services Table List */}
                {isExpanded && (
                  <div className="bg-stone-50/50 p-3 sm:p-4">
                    {(!exp.services || exp.services.length === 0) ? (
                      <div className="text-center py-4 bg-white rounded-xl border border-dashed border-stone-200">
                        <Package className="w-6 h-6 text-stone-300 mx-auto mb-1" />
                        <p className="text-xs text-stone-500 font-medium">Belum ada jenis layanan / tarif pengiriman.</p>
                        <button
                          type="button"
                          onClick={() => handleOpenAddService(exp.id)}
                          className="mt-2 text-xs text-orange-600 font-bold hover:underline"
                        >
                          + Tambah Tarif Sekarang
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
                              <th className="py-2 px-2">Layanan</th>
                              <th className="py-2 px-2">Estimasi (ETD)</th>
                              <th className="py-2 px-2">Tipe Tarif</th>
                              <th className="py-2 px-2">Tarif Dasar</th>
                              <th className="py-2 px-2">Tambahan / Kg</th>
                              <th className="py-2 px-2">Keterangan</th>
                              <th className="py-2 px-2 text-center">Status</th>
                              <th className="py-2 px-2 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {exp.services.map((srv) => (
                              <tr 
                                key={srv.id} 
                                className={`hover:bg-white transition-colors ${
                                  !srv.isActive ? 'opacity-50' : ''
                                }`}
                              >
                                <td className="py-2.5 px-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-200/70 text-stone-800">
                                      {srv.serviceCode}
                                    </span>
                                    <span className="font-bold text-stone-900">{srv.serviceName}</span>
                                  </div>
                                </td>

                                <td className="py-2.5 px-2 text-stone-600">
                                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded text-[11px] font-medium">
                                    <Clock className="w-3 h-3 text-amber-600" /> {srv.etd}
                                  </span>
                                </td>

                                <td className="py-2.5 px-2">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    srv.rateType === 'per_kg'
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {srv.rateType === 'per_kg' ? 'Per Kilogram' : 'Flat Per Pesanan'}
                                  </span>
                                </td>

                                <td className="py-2.5 px-2 font-bold text-stone-900">
                                  {formatRupiah(srv.baseRate)}
                                  {srv.minWeightKg && srv.minWeightKg > 1 && (
                                    <span className="text-[10px] text-stone-400 font-normal block">
                                      (Min {srv.minWeightKg} kg)
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-2 text-stone-600">
                                  {srv.rateType === 'per_kg' && srv.ratePerKg ? (
                                    <span>+{formatRupiah(srv.ratePerKg)}/kg</span>
                                  ) : (
                                    <span className="text-stone-400">-</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-2 text-stone-500 max-w-xs truncate" title={srv.description}>
                                  {srv.description || '-'}
                                </td>

                                <td className="py-2.5 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleServiceActive(exp.id, srv.id)}
                                    className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                      srv.isActive
                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                        : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                                    }`}
                                  >
                                    {srv.isActive ? 'Aktif' : 'Off'}
                                  </button>
                                </td>

                                <td className="py-2.5 px-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditService(exp.id, srv)}
                                      className="p-1 text-stone-400 hover:text-stone-700 rounded hover:bg-stone-100"
                                      title="Edit Tarif"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingItem({ type: 'service', expeditionId: exp.id, serviceId: srv.id, name: srv.serviceName })}
                                      className="p-1 text-stone-400 hover:text-red-600 rounded hover:bg-red-50"
                                      title="Hapus Tarif"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH / EDIT EKSPEDISI */}
      {/* ========================================================================= */}
      {isExpeditionModalOpen && editingExpedition && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 text-orange-700 rounded-xl">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">
                    {editingExpedition.id ? 'Edit Ekspedisi' : 'Tambah Ekspedisi Baru'}
                  </h3>
                  <p className="text-[11px] text-stone-500">Isi data identitas dan pengaturan ekspedisi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpeditionModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpedition} className="p-5 space-y-4">
              {/* Preset Quick Select */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1.5">
                  Pilih Preset Logo & Brand Populer:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {PRESET_LOGOS.map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => {
                        setEditingExpedition({
                          ...editingExpedition,
                          name: p.name + ' Express',
                          code: p.code,
                          color: p.color,
                          logo: p.url,
                          trackingUrlPattern: `https://cekresi.com/?noresi={resi}`,
                        });
                      }}
                      className="p-1.5 rounded-xl border border-stone-200 hover:border-orange-500 text-center text-[10px] font-bold text-stone-700 hover:bg-orange-50/50 transition-all cursor-pointer"
                    >
                      <div 
                        className="w-full h-6 rounded-md mb-1 flex items-center justify-center text-white text-[9px] font-black"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.code}
                      </div>
                      <span className="truncate block">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-stone-700 block mb-1">Nama Ekspedisi *</label>
                  <input
                    type="text"
                    required
                    value={editingExpedition.name || ''}
                    onChange={(e) => setEditingExpedition({ ...editingExpedition, name: e.target.value })}
                    placeholder="Contoh: JNE Express"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Kode / Alias *</label>
                  <input
                    type="text"
                    required
                    value={editingExpedition.code || ''}
                    onChange={(e) => setEditingExpedition({ ...editingExpedition, code: e.target.value.toUpperCase() })}
                    placeholder="JNE"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 font-mono font-bold uppercase"
                  />
                </div>
              </div>

              {/* Color & Logo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Warna Brand</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingExpedition.color || '#ea580c'}
                      onChange={(e) => setEditingExpedition({ ...editingExpedition, color: e.target.value })}
                      className="w-10 h-8 rounded-lg border border-stone-200 p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingExpedition.color || '#ea580c'}
                      onChange={(e) => setEditingExpedition({ ...editingExpedition, color: e.target.value })}
                      className="flex-1 text-xs px-2.5 py-1.5 rounded-xl border border-stone-200 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Upload Logo Gambar</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="text-[11px] text-stone-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
                  />
                </div>
              </div>

              {/* Tracking Pattern */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Format Link Cek Resi Online:
                </label>
                <input
                  type="text"
                  value={editingExpedition.trackingUrlPattern || ''}
                  onChange={(e) => setEditingExpedition({ ...editingExpedition, trackingUrlPattern: e.target.value })}
                  placeholder="https://cekresi.com/?noresi={resi}"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 font-mono text-[11px]"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">
                  Gunakan variabel <code>{'{resi}'}</code> agar sistem otomatis mengisi nomor resi saat pelanggan klik tracking.
                </span>
              </div>

              {/* Phone & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">No. CS / Call Center</label>
                  <input
                    type="text"
                    value={editingExpedition.phone || ''}
                    onChange={(e) => setEditingExpedition({ ...editingExpedition, phone: e.target.value })}
                    placeholder="021-29278888"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Status Ekspedisi</label>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={editingExpedition.isActive ?? true}
                      onChange={(e) => setEditingExpedition({ ...editingExpedition, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    <span className="ml-2 text-xs font-semibold text-stone-700">
                      {editingExpedition.isActive ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Catatan / Kebijakan Pengiriman</label>
                <textarea
                  rows={2}
                  value={editingExpedition.notes || ''}
                  onChange={(e) => setEditingExpedition({ ...editingExpedition, notes: e.target.value })}
                  placeholder="Contoh: Jadwal pickup harian pukul 16:00 WIB, hari Minggu tetap melayani kiriman."
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 resize-none"
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsExpeditionModalOpen(false)}
                  className="text-xs font-bold text-stone-600 px-4 py-2.5 rounded-xl hover:bg-stone-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Simpan Ekspedisi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TAMBAH / EDIT LAYANAN & TARIF */}
      {/* ========================================================================= */}
      {isServiceModalOpen && editingService && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">
                    {editingService.id ? 'Edit Tarif Layanan' : 'Tambah Layanan & Tarif Baru'}
                  </h3>
                  <p className="text-[11px] text-stone-500">Tentukan nama layanan, estimasi hari, dan ongkos kirim</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-5 space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-stone-700 block mb-1">Nama Layanan *</label>
                  <input
                    type="text"
                    required
                    value={editingService.serviceName || ''}
                    onChange={(e) => setEditingService({ ...editingService, serviceName: e.target.value })}
                    placeholder="Contoh: Reguler / Yakin Esok Sampai"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Kode *</label>
                  <input
                    type="text"
                    required
                    value={editingService.serviceCode || ''}
                    onChange={(e) => setEditingService({ ...editingService, serviceCode: e.target.value.toUpperCase() })}
                    placeholder="REG"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-blue-500 font-mono font-bold uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Estimasi Sampai (ETD) *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={editingService.etd || ''}
                    onChange={(e) => setEditingService({ ...editingService, etd: e.target.value })}
                    placeholder="Contoh: 1-2 Hari / Besok Sampai"
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingService({ ...editingService, etd: '1-2 Hari' })}
                    className="text-[10px] bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded-lg text-stone-700 font-medium"
                  >
                    1-2 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingService({ ...editingService, etd: 'Besok Sampai (1 Hari)' })}
                    className="text-[10px] bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded-lg text-stone-700 font-medium"
                  >
                    Next Day
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Tipe Perhitungan Tarif:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingService({ ...editingService, rateType: 'per_kg' })}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      editingService.rateType === 'per_kg'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Scale className="w-3.5 h-3.5 text-blue-600" />
                      <span>Per Kilogram (Kg)</span>
                    </div>
                    <p className="text-[10px] text-stone-500 font-normal">
                      Tarif dikalikan berat total item belanjaan.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingService({ ...editingService, rateType: 'flat' })}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      editingService.rateType === 'flat'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Flat Per Pesanan</span>
                    </div>
                    <p className="text-[10px] text-stone-500 font-normal">
                      Tarif tetap berapapun berat belanjaan.
                    </p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Tarif Dasar (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={editingService.baseRate || ''}
                    onChange={(e) => setEditingService({ ...editingService, baseRate: Number(e.target.value) })}
                    placeholder="12000"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-blue-500 font-mono font-bold"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    {formatRupiah(editingService.baseRate || 0)}
                  </span>
                </div>

                {editingService.rateType === 'per_kg' ? (
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">Tarif Tambahan / Kg (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={editingService.ratePerKg || ''}
                      onChange={(e) => setEditingService({ ...editingService, ratePerKg: Number(e.target.value) })}
                      placeholder="10000"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-blue-500 font-mono font-bold"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">
                      +{formatRupiah(editingService.ratePerKg || 0)} per kg berikutnya
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">Minimal Berat (Kg)</label>
                    <input
                      type="number"
                      min="1"
                      value={editingService.minWeightKg || 1}
                      onChange={(e) => setEditingService({ ...editingService, minWeightKg: Number(e.target.value) })}
                      placeholder="1"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-blue-500 font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Keterangan Layanan (Opsional)</label>
                <input
                  type="text"
                  value={editingService.description || ''}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  placeholder="Contoh: Garansi kirim aman, gratis jemput paket"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={editingService.isActive ?? true}
                    onChange={(e) => setEditingService({ ...editingService, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-2 text-xs font-semibold text-stone-700">
                    Status Layanan {editingService.isActive ? 'Aktif' : 'Non-aktif'}
                  </span>
                </label>
              </div>

              {/* Footer */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="text-xs font-bold text-stone-600 px-4 py-2.5 rounded-xl hover:bg-stone-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Simpan Tarif
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SIMULASI / KALKULATOR ONGKIR */}
      {/* ========================================================================= */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Simulasi / Kalkulator Ongkir Ekspedisi</h3>
                  <p className="text-[11px] text-stone-500">Uji coba bagaimana tarif muncul di layar Keranjang Belanja pembeli</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSimulatorOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-700" />
                  <div>
                    <label className="text-xs font-bold text-amber-950 block">Bobot Belanjaan Simulasi</label>
                    <p className="text-[10px] text-amber-800">Ubah berat untuk melihat pembulatan & tarif</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={simWeightKg}
                    onChange={(e) => setSimWeightKg(Math.max(0.1, Number(e.target.value)))}
                    className="w-20 text-xs px-2.5 py-1.5 rounded-xl border border-amber-300 bg-white font-mono font-bold text-right"
                  />
                  <span className="text-xs font-bold text-amber-900">Kg</span>
                </div>
              </div>

              {/* Quick weight chips */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-stone-500 font-semibold">Coba cepat:</span>
                {[0.5, 1, 2, 3, 5, 10].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setSimWeightKg(w)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg font-bold transition-colors ${
                      simWeightKg === w
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    {w} kg
                  </button>
                ))}
              </div>

              {/* Simulation Result List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {expeditions.filter((e) => e.isActive).map((exp) => (
                  <div key={exp.id} className="border border-stone-200 rounded-xl p-3 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-6 h-6 rounded-md text-[9px] font-black text-white flex items-center justify-center shrink-0"
                          style={{ backgroundColor: exp.color || '#ea580c' }}
                        >
                          {exp.code.substring(0, 3)}
                        </span>
                        <span className="text-xs font-bold text-stone-900">{exp.name}</span>
                      </div>
                      <span className="text-[10px] text-stone-400">Kode: {exp.code}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-stone-100">
                      {(exp.services || []).filter((s) => s.isActive).map((srv) => {
                        const calculated = calculateExpeditionRate(srv, simWeightKg);
                        return (
                          <div 
                            key={srv.id}
                            className="p-2 rounded-lg bg-stone-50 border border-stone-200/80 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-stone-800 text-[11px]">{srv.serviceName}</div>
                              <div className="text-[10px] text-stone-500 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-stone-400" /> {srv.etd}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-black text-xs text-orange-700 block">
                                {formatRupiah(calculated)}
                              </span>
                              <span className="text-[9px] text-stone-400">
                                {srv.rateType === 'per_kg' ? `${Math.ceil(simWeightKg)} kg` : 'flat'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(false)}
                  className="bg-stone-900 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl"
                >
                  Tutup Simulasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIRM DELETE */}
      {/* ========================================================================= */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-sm text-stone-900">
                Hapus {deletingItem.type === 'expedition' ? 'Ekspedisi' : 'Layanan Tarif'}?
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Apakah Anda yakin ingin menghapus <strong>"{deletingItem.name}"</strong>? 
                {deletingItem.type === 'expedition' && ' Seluruh layanan dan tarif di bawah ekspedisi ini juga akan terhapus.'}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer"
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
