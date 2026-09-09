import React, { useState, useMemo } from 'react';
import { 
  PointsConfig, 
  RewardItem, 
  PointsLedgerEntry, 
  MemberProfile 
} from '../types';
import { formatRupiah } from '../utils/formatters';
import { 
  Sparkles, 
  Settings, 
  Gift, 
  History, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Sliders, 
  Coins, 
  Award, 
  Save, 
  HelpCircle,
  Download,
  Percent,
  PlusCircle,
  MinusCircle
} from 'lucide-react';

interface PointsLoyaltyManagerProps {
  pointsConfig: PointsConfig;
  rewardItems: RewardItem[];
  pointsLedger: PointsLedgerEntry[];
  customers: MemberProfile[];
  onUpdatePointsConfig: (config: PointsConfig) => void;
  onUpdateRewardItems: (items: RewardItem[]) => void;
  onUpdatePointsLedger: (ledger: PointsLedgerEntry[]) => void;
  onUpdateCustomers: (customers: MemberProfile[]) => void;
  canEdit?: boolean;
}

export const PointsLoyaltyManager: React.FC<PointsLoyaltyManagerProps> = ({
  pointsConfig,
  rewardItems,
  pointsLedger,
  customers,
  onUpdatePointsConfig,
  onUpdateRewardItems,
  onUpdatePointsLedger,
  onUpdateCustomers,
  canEdit = true,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'rewards' | 'ledger'>('rules');

  // Config form state
  const [spendPerPoint, setSpendPerPoint] = useState<number>(pointsConfig.spendPerPoint);
  const [pointRedemptionValue, setPointRedemptionValue] = useState<number>(pointsConfig.pointRedemptionValue);
  const [minRedemptionPoints, setMinRedemptionPoints] = useState<number>(pointsConfig.minRedemptionPoints);
  const [newMemberBonusPoints, setNewMemberBonusPoints] = useState<number>(pointsConfig.newMemberBonusPoints);
  const [tierBronze, setTierBronze] = useState<number>(pointsConfig.tierMultipliers.Bronze);
  const [tierSilver, setTierSilver] = useState<number>(pointsConfig.tierMultipliers.Silver);
  const [tierGold, setTierGold] = useState<number>(pointsConfig.tierMultipliers.Gold);
  const [tierPlatinum, setTierPlatinum] = useState<number>(pointsConfig.tierMultipliers.Platinum);
  const [enablePointRedemption, setEnablePointRedemption] = useState<boolean>(pointsConfig.enablePointRedemption);
  const [configSuccessMsg, setConfigSuccessMsg] = useState(false);

  // Rewards Modal & State
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [rewardName, setRewardName] = useState('');
  const [rewardCategory, setRewardCategory] = useState<'voucher' | 'product' | 'merchandise'>('voucher');
  const [rewardPointsRequired, setRewardPointsRequired] = useState<number>(1000);
  const [rewardStock, setRewardStock] = useState<number>(50);
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardVoucherValue, setRewardVoucherValue] = useState<number>(10000);
  const [rewardIsActive, setRewardIsActive] = useState<boolean>(true);

  // Manual Adjustment Modal & State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentCustomerId, setAdjustmentCustomerId] = useState<string>(customers[0]?.id || '');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(100);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  // Ledger Filter State
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('all');

  // Filtered Ledger
  const filteredLedger = useMemo(() => {
    return pointsLedger.filter(entry => {
      const matchSearch = 
        entry.customerName.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        entry.memberNumber.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        entry.description.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        (entry.referenceNo && entry.referenceNo.toLowerCase().includes(ledgerSearch.toLowerCase()));

      const matchType = ledgerTypeFilter === 'all' || entry.type === ledgerTypeFilter;

      return matchSearch && matchType;
    });
  }, [pointsLedger, ledgerSearch, ledgerTypeFilter]);

  // Handle Save Configuration
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: PointsConfig = {
      spendPerPoint: Math.max(100, spendPerPoint),
      pointRedemptionValue: Math.max(0.1, pointRedemptionValue),
      minRedemptionPoints: Math.max(0, minRedemptionPoints),
      newMemberBonusPoints: Math.max(0, newMemberBonusPoints),
      tierMultipliers: {
        Bronze: tierBronze,
        Silver: tierSilver,
        Gold: tierGold,
        Platinum: tierPlatinum,
      },
      enablePointRedemption,
    };

    onUpdatePointsConfig(newConfig);
    setConfigSuccessMsg(true);
    setTimeout(() => setConfigSuccessMsg(false), 3000);
  };

  // Open Add/Edit Reward Modal
  const handleOpenAddReward = () => {
    setEditingReward(null);
    setRewardName('');
    setRewardCategory('voucher');
    setRewardPointsRequired(1000);
    setRewardStock(50);
    setRewardDescription('');
    setRewardVoucherValue(10000);
    setRewardIsActive(true);
    setIsRewardModalOpen(true);
  };

  const handleOpenEditReward = (item: RewardItem) => {
    setEditingReward(item);
    setRewardName(item.name);
    setRewardCategory(item.category);
    setRewardPointsRequired(item.pointsRequired);
    setRewardStock(item.stock);
    setRewardDescription(item.description);
    setRewardVoucherValue(item.voucherValue || 0);
    setRewardIsActive(item.isActive);
    setIsRewardModalOpen(true);
  };

  const handleSaveReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardName.trim()) {
      alert('Nama hadiah wajib diisi');
      return;
    }

    const rewardData: RewardItem = {
      id: editingReward ? editingReward.id : `rew_${Date.now()}`,
      name: rewardName.trim(),
      category: rewardCategory,
      pointsRequired: Math.max(1, rewardPointsRequired),
      stock: Math.max(0, rewardStock),
      description: rewardDescription.trim(),
      voucherValue: rewardCategory === 'voucher' ? rewardVoucherValue : undefined,
      isActive: rewardIsActive,
    };

    let updated: RewardItem[];
    if (editingReward) {
      updated = rewardItems.map(r => r.id === editingReward.id ? rewardData : r);
    } else {
      updated = [rewardData, ...rewardItems];
    }

    onUpdateRewardItems(updated);
    setIsRewardModalOpen(false);
  };

  const handleDeleteReward = (id: string) => {
    onUpdateRewardItems(rewardItems.filter(r => r.id !== id));
  };

  // Handle Manual Adjustment
  const handleExecuteAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === adjustmentCustomerId);
    if (!cust) return;
    if (adjustmentAmount <= 0) {
      alert('Nominal poin penyesuaian harus lebih dari 0');
      return;
    }

    const delta = adjustmentType === 'add' ? adjustmentAmount : -adjustmentAmount;
    const newBalance = Math.max(0, (cust.points || 0) + delta);

    // Update Customer
    const updatedCustomers = customers.map(c => {
      if (c.id === cust.id) {
        return {
          ...c,
          points: newBalance,
        };
      }
      return c;
    });
    onUpdateCustomers(updatedCustomers);

    // Add to Ledger
    const newLedgerEntry: PointsLedgerEntry = {
      id: `led_${Date.now()}`,
      customerId: cust.id,
      customerName: cust.name,
      memberNumber: cust.memberNumber,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: 'adjustment',
      points: delta,
      balanceAfter: newBalance,
      description: `Penyesuaian Manual (${adjustmentType === 'add' ? 'Penambahan' : 'Pengurangan'}): ${adjustmentReason || 'Penyesuaian Admin'}`,
      referenceNo: `ADJ-${Date.now().toString().slice(-5)}`,
    };
    onUpdatePointsLedger([newLedgerEntry, ...pointsLedger]);

    setIsAdjustmentModalOpen(false);
    setAdjustmentAmount(100);
    setAdjustmentReason('');
  };

  // Export Ledger to CSV
  const handleExportLedgerCSV = () => {
    const headers = ['ID Mutasi', 'Tanggal', 'Nama Member', 'No Member', 'Jenis Mutasi', 'Perubahan Poin', 'Saldo Akhir', 'Keterangan', 'No Referensi'];
    const rows = filteredLedger.map(l => [
      l.id,
      l.date,
      `"${l.customerName.replace(/"/g, '""')}"`,
      `"${l.memberNumber}"`,
      l.type,
      l.points,
      l.balanceAfter,
      `"${l.description.replace(/"/g, '""')}"`,
      `"${l.referenceNo || '-'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Mutasi_Poin_Belanja_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-stone-900">Modul Poin Belanja & Loyalitas Member</h2>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Konfigurasi rasio perolehan poin dari transaksi kasir, katalog reward penukaran hadiah, dan mutasi saldo poin pelanggan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Coins className="w-4 h-4" />
              <span>+ Penyesuaian Poin Manual</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'rules'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Aturan & Rasio Poin</span>
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'rewards'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Katalog Hadiah & Voucher ({rewardItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'ledger'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat Mutasi Poin ({pointsLedger.length})</span>
        </button>
      </div>

      {/* TAB 1: ATURAN & RASIO POIN */}
      {activeTab === 'rules' && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dasar Perolehan & Nilai Tukar */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                <Coins className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-stone-900 text-sm">Nilai Dasar Perolehan Poin</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nominal Belanja per 1 Poin (Rupiah)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">Rp</span>
                  <input
                    type="number"
                    step="100"
                    min="100"
                    value={spendPerPoint}
                    onChange={(e) => setSpendPerPoint(parseInt(e.target.value) || 1000)}
                    disabled={!canEdit}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-stone-200 rounded-xl font-bold text-stone-800"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Setiap pelanggan belanja kelipatan nominal ini, sistem otomatis memberikan 1 poin belanja.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nilai Tukar 1 Poin ke Rupiah Diskon
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">Rp</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={pointRedemptionValue}
                    onChange={(e) => setPointRedemptionValue(parseInt(e.target.value) || 1)}
                    disabled={!canEdit}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-stone-200 rounded-xl font-bold text-emerald-700"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Contoh: Jika diisi 1, maka 1.000 poin bernilai diskon Rp 1.000 saat ditukar di kasir/checkout.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Minimal Poin Ditukar
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={minRedemptionPoints}
                    onChange={(e) => setMinRedemptionPoints(parseInt(e.target.value) || 0)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl font-bold text-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Bonus Member Baru
                  </label>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={newMemberBonusPoints}
                    onChange={(e) => setNewMemberBonusPoints(parseInt(e.target.value) || 0)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl font-bold text-amber-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                <input
                  type="checkbox"
                  id="enable-redeem"
                  checked={enablePointRedemption}
                  onChange={(e) => setEnablePointRedemption(e.target.checked)}
                  disabled={!canEdit}
                  className="rounded-md border-stone-300 text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="enable-redeem" className="text-xs font-semibold text-stone-700 cursor-pointer">
                  Aktifkan fitur penukaran poin langsung di kasir / checkout belanja
                </label>
              </div>
            </div>

            {/* Pengali Poin Berdasarkan Tier Level */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-stone-900 text-sm">Pengali Poin Berdasarkan Tier (Multiplier)</h3>
              </div>
              <p className="text-xs text-stone-500">
                Apresiasi member setia dengan perolehan poin lebih banyak saat berbelanja sesuai level keanggotaannya.
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-200">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                    <span className="text-xs font-bold text-orange-950">Bronze (Member Standar)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={tierBronze}
                      onChange={(e) => setTierBronze(parseFloat(e.target.value) || 1)}
                      disabled={!canEdit}
                      className="w-20 px-2 py-1 text-xs border border-orange-300 rounded-lg bg-white font-bold text-right"
                    />
                    <span className="text-xs font-bold text-orange-900">x</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 border border-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-500"></span>
                    <span className="text-xs font-bold text-slate-900">Silver (Perak)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={tierSilver}
                      onChange={(e) => setTierSilver(parseFloat(e.target.value) || 1.2)}
                      disabled={!canEdit}
                      className="w-20 px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold text-right"
                    />
                    <span className="text-xs font-bold text-slate-900">x</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-300">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span className="text-xs font-bold text-amber-950">Gold (Emas)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={tierGold}
                      onChange={(e) => setTierGold(parseFloat(e.target.value) || 1.5)}
                      disabled={!canEdit}
                      className="w-20 px-2 py-1 text-xs border border-amber-300 rounded-lg bg-white font-bold text-right"
                    />
                    <span className="text-xs font-bold text-amber-950">x</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-600"></span>
                    <span className="text-xs font-bold text-purple-950">Platinum (VIP Prioritas)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={tierPlatinum}
                      onChange={(e) => setTierPlatinum(parseFloat(e.target.value) || 2.0)}
                      disabled={!canEdit}
                      className="w-20 px-2 py-1 text-xs border border-purple-300 rounded-lg bg-white font-bold text-right"
                    />
                    <span className="text-xs font-bold text-purple-950">x</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-xs text-stone-500">
                {configSuccessMsg ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Pengaturan Poin Berhasil Disimpan!
                  </span>
                ) : (
                  <span>Perubahan aturan poin langsung berlaku untuk setiap transaksi kasir berikutnya.</span>
                )}
              </div>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Aturan Poin</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 2: KATALOG HADIAH & VOUCHER */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Daftar Hadiah Penukaran Poin (Reward Items)</h3>
              <p className="text-xs text-stone-500">Member dapat menukarkan poin mereka dengan voucher belanja atau barang fisik di minimarket.</p>
            </div>

            {canEdit && (
              <button
                onClick={handleOpenAddReward}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Hadiah Baru</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewardItems.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between ${
                  item.isActive ? 'border-stone-200' : 'border-stone-200 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                      item.category === 'voucher' ? 'bg-indigo-50 text-indigo-700' :
                      item.category === 'product' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-purple-50 text-purple-700'
                    }`}>
                      {item.category === 'voucher' ? 'Voucher Belanja' : item.category === 'product' ? 'Produk Minimarket' : 'Merchandise'}
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {item.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  <h4 className="font-bold text-stone-900 text-base mt-2">{item.name}</h4>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2">{item.description}</p>

                  <div className="mt-4 bg-amber-50/70 p-3 rounded-xl border border-amber-200/60 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-amber-800 uppercase font-semibold">Poin Diperlukan:</div>
                      <div className="text-lg font-black text-amber-600">{item.pointsRequired.toLocaleString('id-ID')} pts</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-stone-500 font-semibold">Sisa Stok:</div>
                      <div className="text-sm font-bold text-stone-800">{item.stock} pcs</div>
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-stone-100">
                    <button
                      onClick={() => handleOpenEditReward(item)}
                      className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs"
                      title="Edit Hadiah"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteReward(item.id)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs"
                      title="Hapus Hadiah"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: RIWAYAT MUTASI POIN (LEDGER) */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="Cari mutasi poin berdasarkan nama member, no kartu, atau no faktur..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl text-stone-700"
              >
                <option value="all">Semua Jenis Mutasi</option>
                <option value="earned">Diterima Belanja (Earned)</option>
                <option value="redeemed">Ditukar Diskon (Redeemed)</option>
                <option value="bonus">Bonus Pendaftaran</option>
                <option value="adjustment">Penyesuaian Manual</option>
              </select>

              <button
                onClick={handleExportLedgerCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold whitespace-nowrap"
              >
                <Download className="w-4 h-4 text-stone-500" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Waktu Transaksi</th>
                    <th className="px-4 py-3">Pelanggan / Member</th>
                    <th className="px-4 py-3">Aktivitas / Keterangan</th>
                    <th className="px-4 py-3 text-center">Jenis</th>
                    <th className="px-4 py-3 text-right">Poin</th>
                    <th className="px-4 py-3 text-right">Saldo Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredLedger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-4 py-3 text-stone-500 whitespace-nowrap font-mono text-[11px]">
                        {entry.date}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-bold text-stone-900">{entry.customerName}</div>
                        <div className="text-[10px] font-mono text-stone-400">{entry.memberNumber}</div>
                      </td>

                      <td className="px-4 py-3 text-stone-700">
                        <div>{entry.description}</div>
                        {entry.referenceNo && (
                          <span className="text-[10px] font-mono bg-stone-100 px-1.5 py-0.5 rounded-md text-stone-500">
                            Ref: {entry.referenceNo}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          entry.type === 'earned' ? 'bg-emerald-100 text-emerald-800' :
                          entry.type === 'redeemed' ? 'bg-rose-100 text-rose-800' :
                          entry.type === 'bonus' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {entry.type === 'earned' ? '+ Belanja' : entry.type === 'redeemed' ? '- Ditukar' : entry.type === 'bonus' ? '+ Bonus' : 'Penyesuaian'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-black">
                        <span className={entry.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {entry.points > 0 ? `+${entry.points.toLocaleString('id-ID')}` : entry.points.toLocaleString('id-ID')} pts
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-stone-900">
                        {entry.balanceAfter.toLocaleString('id-ID')} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredLedger.length === 0 && (
              <div className="text-center py-10 text-stone-400 text-xs">
                Tidak ada riwayat mutasi poin sesuai filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL REWARD FORM (ADD / EDIT) */}
      {isRewardModalOpen && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-base">
                {editingReward ? 'Edit Hadiah Penukaran' : 'Tambah Hadiah Baru'}
              </h3>
              <button
                onClick={() => setIsRewardModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReward} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nama Hadiah *</label>
                <input
                  type="text"
                  value={rewardName}
                  onChange={(e) => setRewardName(e.target.value)}
                  placeholder="Contoh: Voucher Belanja Rp 25.000 / Minyak Goreng 1L"
                  required
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Kategori Hadiah</label>
                  <select
                    value={rewardCategory}
                    onChange={(e) => setRewardCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white"
                  >
                    <option value="voucher">Voucher Belanja</option>
                    <option value="product">Produk Minimarket</option>
                    <option value="merchandise">Merchandise / Souvenir</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Poin Diperlukan *</label>
                  <input
                    type="number"
                    min="1"
                    step="50"
                    value={rewardPointsRequired}
                    onChange={(e) => setRewardPointsRequired(parseInt(e.target.value) || 100)}
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl font-bold text-amber-600"
                  />
                </div>
              </div>

              {rewardCategory === 'voucher' && (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Nilai Potongan Voucher (Rp)</label>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    value={rewardVoucherValue}
                    onChange={(e) => setRewardVoucherValue(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl font-bold text-emerald-700"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Sisa Stok Hadiah Fisik</label>
                <input
                  type="number"
                  min="0"
                  value={rewardStock}
                  onChange={(e) => setRewardStock(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Deskripsi / Syarat Penukaran</label>
                <textarea
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value)}
                  placeholder="Keterangan penukaran reward..."
                  rows={2}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reward-active"
                  checked={rewardIsActive}
                  onChange={(e) => setRewardIsActive(e.target.checked)}
                  className="rounded-md border-stone-300 text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="reward-active" className="text-xs font-semibold text-stone-700 cursor-pointer">
                  Hadiah aktif & dapat ditukarkan oleh pelanggan
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsRewardModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
                >
                  Simpan Hadiah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MANUAL ADJUSTMENT */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Coins className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-stone-900 text-base">Penyesuaian Poin Manual</h3>
              </div>
              <button
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Pilih Member Pelanggan *</label>
                <select
                  value={adjustmentCustomerId}
                  onChange={(e) => setAdjustmentCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white font-medium"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.memberNumber}) - Saldo: {c.points.toLocaleString('id-ID')} pts
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Jenis Penyesuaian *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('add')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-colors ${
                      adjustmentType === 'add'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-600" />
                    <span>+ Tambah Poin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustmentType('subtract')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-colors ${
                      adjustmentType === 'subtract'
                        ? 'bg-rose-50 border-rose-400 text-rose-800'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4 text-rose-600" />
                    <span>- Kurangi Poin</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nominal Jumlah Poin *</label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl font-black text-amber-600 text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Alasan Penyesuaian / Catatan *</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Contoh: Kompensasi keterlambatan kurir / Hadiah giveaway"
                  required
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
                >
                  Terapkan Penyesuaian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
