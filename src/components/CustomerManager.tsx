import React, { useState, useMemo } from 'react';
import { 
  MemberProfile, 
  Order 
} from '../types';
import { formatRupiah } from '../utils/formatters';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Award, 
  Sparkles, 
  CreditCard, 
  Download, 
  CheckCircle2, 
  ExternalLink,
  Receipt,
  QrCode,
  Calendar,
  Clock,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface CustomerManagerProps {
  customers: MemberProfile[];
  orders?: Order[];
  onUpdateCustomers: (customers: MemberProfile[]) => void;
  onSelectCustomerForPointsAdjustment?: (customer: MemberProfile) => void;
  canEdit?: boolean;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  customers,
  orders = [],
  onUpdateCustomers,
  onSelectCustomerForPointsAdjustment,
  canEdit = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<MemberProfile | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<MemberProfile | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [memberNumber, setMemberNumber] = useState('');
  const [tier, setTier] = useState<MemberProfile['tier']>('Bronze');
  const [points, setPoints] = useState<number>(0);
  const [stamps, setStamps] = useState<number>(0);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        c.memberNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchTier = selectedTierFilter === 'all' || c.tier === selectedTierFilter;
      const matchStatus = selectedStatusFilter === 'all' || (c.status || 'active') === selectedStatusFilter;

      return matchSearch && matchTier && matchStatus;
    });
  }, [customers, searchQuery, selectedTierFilter, selectedStatusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = customers.length;
    const totalPoints = customers.reduce((sum, c) => sum + (c.points || 0), 0);
    const totalSpent = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const platinumCount = customers.filter(c => c.tier === 'Platinum' || c.tier === 'Gold').length;

    return { total, totalPoints, totalSpent, platinumCount };
  }, [customers]);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    const nextNum = customers.length + 1;
    setName('');
    setPhone('');
    setEmail('');
    setMemberNumber(`KM-2024-${String(nextNum).padStart(3, '0')}`);
    setTier('Bronze');
    setPoints(500); // Welcome bonus default
    setStamps(0);
    setAddress('');
    setCity('');
    setNotes('');
    setStatus('active');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (cust: MemberProfile) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone);
    setEmail(cust.email || '');
    setMemberNumber(cust.memberNumber);
    setTier(cust.tier);
    setPoints(cust.points);
    setStamps(cust.stamps || 0);
    setAddress(cust.address || '');
    setCity(cust.city || '');
    setNotes(cust.notes || '');
    setStatus(cust.status || 'active');
    setIsFormModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Nama dan No. HP wajib diisi');
      return;
    }

    const cleanMemberNum = memberNumber.trim() || `KM-2024-${Date.now().toString().slice(-4)}`;
    const custData: MemberProfile = {
      id: editingCustomer ? editingCustomer.id : `usr_${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      memberNumber: cleanMemberNum,
      barcode: cleanMemberNum.replace(/[^0-9]/g, '') || String(Date.now()).slice(-12),
      tier,
      points,
      stamps,
      joinedDate: editingCustomer ? editingCustomer.joinedDate : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      totalSpent: editingCustomer ? editingCustomer.totalSpent : 0,
      ordersCount: editingCustomer ? editingCustomer.ordersCount : 0,
      lastOrderDate: editingCustomer ? editingCustomer.lastOrderDate : undefined,
    };

    let updated: MemberProfile[];
    if (editingCustomer) {
      updated = customers.map(c => c.id === editingCustomer.id ? custData : c);
    } else {
      updated = [custData, ...customers];
    }

    onUpdateCustomers(updated);
    setIsFormModalOpen(false);
  };

  const handleDeleteCustomer = (id: string) => {
    const updated = customers.filter(c => c.id !== id);
    onUpdateCustomers(updated);
    setDeleteConfirmId(null);
    if (selectedCustomerDetail?.id === id) {
      setSelectedCustomerDetail(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['No Member', 'Nama Lengkap', 'No HP', 'Email', 'Tier', 'Poin Aktif', 'Stamps', 'Total Belanja (Rp)', 'Jumlah Order', 'Kota', 'Alamat', 'Tgl Gabung', 'Status'];
    const rows = filteredCustomers.map(c => [
      `"${c.memberNumber}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.email || '-'}"`,
      c.tier,
      c.points,
      c.stamps || 0,
      c.totalSpent || 0,
      c.ordersCount || 0,
      `"${c.city || '-'}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${c.joinedDate}"`,
      c.status || 'active',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Master_Pelanggan_Member_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTierBadgeColor = (t: MemberProfile['tier']) => {
    switch (t) {
      case 'Platinum': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Gold': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Silver': return 'bg-slate-200 text-slate-800 border-slate-300';
      default: return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Metric Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-50 text-sky-700 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-stone-900">Master Data Pelanggan & Member</h2>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Kelola data pembeli, kartu membership digital, level tier loyalitas, dan akumulasi poin belanja.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span>Ekspor CSV</span>
          </button>

          {canEdit && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pelanggan Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Total Member Terdaftar</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{metrics.total}</div>
          <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{customers.filter(c => (c.status || 'active') === 'active').length} Member Aktif</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Member VIP (Gold & Platinum)</div>
          <div className="text-2xl font-black text-purple-700 mt-1">{metrics.platinumCount}</div>
          <div className="text-xs text-stone-500 mt-1">Pelanggan prioritas toko</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Akumulasi Belanja Member</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{formatRupiah(metrics.totalSpent)}</div>
          <div className="text-xs text-stone-500 mt-1">Nilai perputaran transaksi</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Poin Belanja Beredar</div>
          <div className="text-2xl font-black text-amber-500 mt-1">{metrics.totalPoints.toLocaleString('id-ID')} pts</div>
          <div className="text-xs text-stone-500 mt-1">Dapat ditukar voucher / diskon</div>
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
            placeholder="Cari nama pelanggan, nomor HP, nomor kartu member, atau email..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTierFilter}
            onChange={(e) => setSelectedTierFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl text-stone-700"
          >
            <option value="all">Semua Tier Level</option>
            <option value="Platinum">Platinum</option>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
            <option value="Bronze">Bronze</option>
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl text-stone-700"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Customers Table / Grid */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Member & ID</th>
                <th className="px-4 py-3">Kontak & Alamat</th>
                <th className="px-4 py-3 text-center">Tier Level</th>
                <th className="px-4 py-3 text-right">Saldo Poin</th>
                <th className="px-4 py-3 text-right">Total Belanja (LTV)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredCustomers.map((cust) => (
                <tr key={cust.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-stone-900 text-sm">{cust.name}</div>
                    <div className="text-[11px] font-mono text-stone-500 mt-0.5">{cust.memberNumber}</div>
                    <div className="text-[10px] text-stone-400">Bergabung: {cust.joinedDate}</div>
                  </td>

                  <td className="px-4 py-3 text-stone-600">
                    <div className="flex items-center gap-1.5 font-medium text-stone-900">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      <a href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="hover:text-sky-600 hover:underline">
                        {cust.phone}
                      </a>
                    </div>
                    {cust.email && (
                      <div className="text-[11px] text-stone-500 mt-0.5 truncate max-w-xs">{cust.email}</div>
                    )}
                    {cust.city && (
                      <div className="text-[10px] text-stone-400 mt-0.5">{cust.city}</div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${getTierBadgeColor(cust.tier)}`}>
                      <Award className="w-3 h-3" />
                      {cust.tier}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="font-black text-amber-600 text-sm">
                      {cust.points.toLocaleString('id-ID')} pts
                    </div>
                    <div className="text-[10px] text-stone-400">
                      {cust.stamps || 0} stempel
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="font-bold text-stone-900">
                      {formatRupiah(cust.totalSpent || 0)}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      {cust.ordersCount || 0} transaksi
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      (cust.status || 'active') === 'active' 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-stone-100 text-stone-500'
                    }`}>
                      {(cust.status || 'active') === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {onSelectCustomerForPointsAdjustment && (
                        <button
                          onClick={() => onSelectCustomerForPointsAdjustment(cust)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[11px] font-bold flex items-center gap-1"
                          title="Sesuaikan Poin Belanja"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Poin</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedCustomerDetail(cust)}
                        className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700"
                        title="Kartu Member & Detail"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                      </button>

                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(cust)}
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700"
                            title="Edit Member"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(cust.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                            title="Hapus Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-700">Tidak ada pelanggan ditemukan</h3>
            <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian atau tambah pelanggan baru.
            </p>
          </div>
        )}
      </div>

      {/* FORM MODAL (ADD / EDIT) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 text-sky-700 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    {editingCustomer ? 'Edit Data Pelanggan' : 'Pendaftaran Pelanggan / Member Baru'}
                  </h3>
                  <p className="text-xs text-stone-500">Isi data lengkap profil member KuickMart</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nama Lengkap Pelanggan *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Siti Nurhaliza"
                  required
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">No. WhatsApp / HP *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890"
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Contoh: member@email.com"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">No. Kartu Member</label>
                  <input
                    type="text"
                    value={memberNumber}
                    onChange={(e) => setMemberNumber(e.target.value)}
                    placeholder="KM-2024-XXX"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Level Tier Member</label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value as any)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white font-bold"
                  >
                    <option value="Bronze">Bronze (Perunggu)</option>
                    <option value="Silver">Silver (Perak)</option>
                    <option value="Gold">Gold (Emas)</option>
                    <option value="Platinum">Platinum (VIP)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                <div>
                  <label className="block font-semibold text-amber-900 mb-1">Saldo Poin Belanja</label>
                  <input
                    type="number"
                    min="0"
                    value={points}
                    onChange={(e) => setPoints(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 border border-amber-300 rounded-xl bg-white font-bold text-amber-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-amber-900 mb-1">Jumlah Stempel (Stamps)</label>
                  <input
                    type="number"
                    min="0"
                    value={stamps}
                    onChange={(e) => setStamps(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 border border-amber-300 rounded-xl bg-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Kota Domisili</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Contoh: Jakarta Selatan"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Status Keanggotaan</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Alamat Tempat Tinggal</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat rumah atau pengantaran..."
                  rows={2}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Catatan Khusus Pelanggan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Langganan beras, minta dikirim pagi..."
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                />
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
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL & KARTU MEMBER DIGITAL */}
      {selectedCustomerDetail && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-base">Kartu Member Digital</h3>
              <button
                onClick={() => setSelectedCustomerDetail(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Virtual Membership Card */}
            <div className={`p-5 rounded-3xl text-white shadow-xl relative overflow-hidden ${
              selectedCustomerDetail.tier === 'Platinum' ? 'bg-gradient-to-br from-slate-900 via-purple-950 to-purple-900' :
              selectedCustomerDetail.tier === 'Gold' ? 'bg-gradient-to-br from-amber-700 via-amber-600 to-yellow-600' :
              selectedCustomerDetail.tier === 'Silver' ? 'bg-gradient-to-br from-slate-700 via-slate-600 to-zinc-500' :
              'bg-gradient-to-br from-orange-800 via-amber-800 to-stone-800'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] tracking-widest uppercase opacity-80">KUICKMART REWARDS</span>
                  <div className="text-xl font-black">{selectedCustomerDetail.name}</div>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold uppercase tracking-wider">
                  {selectedCustomerDetail.tier}
                </div>
              </div>

              <div className="my-6">
                <div className="text-[10px] opacity-75">Nomor Kartu Member:</div>
                <div className="font-mono text-lg font-bold tracking-widest">
                  {selectedCustomerDetail.memberNumber}
                </div>
              </div>

              <div className="flex items-end justify-between border-t border-white/20 pt-3 text-xs">
                <div>
                  <div className="text-[10px] opacity-75">Saldo Poin:</div>
                  <div className="text-base font-black text-yellow-300">
                    {selectedCustomerDetail.points.toLocaleString('id-ID')} PTS
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] opacity-75">Stempel Belanja:</div>
                  <div className="font-bold">{selectedCustomerDetail.stamps || 0} Stamps</div>
                </div>
              </div>
            </div>

            {/* Statistics & info */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 p-3 rounded-2xl">
              <div>
                <span className="text-stone-400">Total Akumulasi Belanja:</span>
                <div className="font-bold text-stone-900 mt-0.5">
                  {formatRupiah(selectedCustomerDetail.totalSpent || 0)}
                </div>
              </div>
              <div>
                <span className="text-stone-400">Frekuensi Belanja:</span>
                <div className="font-bold text-stone-900 mt-0.5">
                  {selectedCustomerDetail.ordersCount || 0} Kali Pesanan
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={`https://wa.me/${selectedCustomerDetail.phone.replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(selectedCustomerDetail.name)},%20terima%20kasih%20telah%20menjadi%20member%20setia%20KuickMart!`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Kirim WhatsApp</span>
              </a>

              <button
                onClick={() => setSelectedCustomerDetail(null)}
                className="px-5 py-2 bg-stone-900 text-white rounded-xl font-bold text-xs hover:bg-black"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Hapus Data Pelanggan?</h3>
              <p className="text-xs text-stone-500 mt-1">
                Data member ini akan dihapus dari daftar pelanggan.
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
                onClick={() => handleDeleteCustomer(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700"
              >
                Hapus Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
