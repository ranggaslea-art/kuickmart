import React, { useState, useMemo } from 'react';
import { 
  Product, 
  Store, 
  StockMutation, 
  StockMutationItem 
} from '../types';
import { formatRupiah } from '../utils/formatters';
import { 
  ArrowLeftRight, 
  Plus, 
  Search, 
  Printer, 
  Eye, 
  CheckCircle2, 
  X, 
  Trash2, 
  Building2, 
  Truck, 
  UserCheck, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  Check, 
  Layers 
} from 'lucide-react';
import { INITIAL_STOCK_MUTATIONS } from '../data/mockOperations';

interface StockMutationManagerProps {
  products: Product[];
  stores: Store[];
  currentStore: Store;
  onUpdateProducts: (products: Product[]) => void;
  stockMutations?: StockMutation[];
  onUpdateStockMutations?: (mutations: StockMutation[]) => void;
  onClose?: () => void;
}

export const StockMutationManager: React.FC<StockMutationManagerProps> = ({
  products,
  stores,
  currentStore,
  onUpdateProducts,
  stockMutations: propMutations,
  onUpdateStockMutations,
  onClose,
}) => {
  // Active Store
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    currentStore?.id || stores[0]?.id || 'store_1'
  );

  // Persistent Mutations State
  const [mutations, setMutations] = useState<StockMutation[]>(() => {
    try {
      const saved = localStorage.getItem('kuickmart_stock_mutations');
      if (saved) return JSON.parse(saved);
    } catch {}
    return propMutations && propMutations.length > 0
      ? propMutations
      : INITIAL_STOCK_MUTATIONS;
  });

  const saveMutations = (newMutations: StockMutation[]) => {
    setMutations(newMutations);
    if (onUpdateStockMutations) onUpdateStockMutations(newMutations);
    try {
      localStorage.setItem('kuickmart_stock_mutations', JSON.stringify(newMutations));
    } catch (e) {
      console.error(e);
    }
  };

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_transit' | 'completed' | 'draft'>('all');

  // ==========================================
  // CREATE MUTATION MODAL STATE
  // ==========================================
  const [isNewMutationModalOpen, setIsNewMutationModalOpen] = useState(false);
  const [sourceStoreId, setSourceStoreId] = useState<string>(selectedStoreId);
  const [destStoreId, setDestStoreId] = useState<string>(() => {
    const other = stores.find((s) => s.id !== selectedStoreId);
    return other ? other.id : stores[0]?.id || '';
  });
  const [transferredBy, setTransferredBy] = useState('Staff Logistik (Rian)');
  const [shippingNotes, setShippingNotes] = useState('Armada motor operasional toko');
  const [initialStatus, setInitialStatus] = useState<'in_transit' | 'completed'>('in_transit');

  // Mutation Items in Form
  const [formItems, setFormItems] = useState<
    Array<{
      productId: string;
      productName: string;
      barcode: string;
      unit: string;
      quantity: number;
      availableStock: number;
      notes: string;
    }>
  >([]);

  // Add Item to Mutation
  const handleAddItemToForm = () => {
    const firstProd = products[0];
    if (!firstProd) return;
    setFormItems((prev) => [
      ...prev,
      {
        productId: firstProd.id,
        productName: firstProd.name,
        barcode: firstProd.barcode || '',
        unit: firstProd.unit || 'Pcs',
        quantity: 1,
        availableStock: firstProd.stock || 0,
        notes: 'Penyeimbangan stok rak',
      },
    ]);
  };

  // Submit New Mutation
  const handleSubmitMutation = (e: React.FormEvent) => {
    e.preventDefault();

    if (sourceStoreId === destStoreId) {
      alert('Toko Asal dan Toko Tujuan mutasi tidak boleh sama!');
      return;
    }

    if (formItems.length === 0) {
      alert('Pilih minimal 1 barang untuk dimutasikan!');
      return;
    }

    // Validate quantities against stock
    for (const item of formItems) {
      if (item.quantity <= 0) {
        alert(`Jumlah transfer untuk "${item.productName}" harus lebih dari 0!`);
        return;
      }
      if (item.quantity > item.availableStock) {
        alert(
          `Jumlah transfer untuk "${item.productName}" (${item.quantity} ${item.unit}) melebihi stok yang tersedia di toko asal (${item.availableStock} ${item.unit})!`
        );
        return;
      }
    }

    const sourceStore = stores.find((s) => s.id === sourceStoreId);
    const destStore = stores.find((s) => s.id === destStoreId);

    const docNo = `MUT-${new Date().toISOString().replace(/-/g, '').slice(0, 6)}-${String(
      mutations.length + 1
    ).padStart(3, '0')}`;

    const totalQty = formItems.reduce((sum, it) => sum + it.quantity, 0);

    const newMutation: StockMutation = {
      id: `mut_${Date.now()}`,
      mutationNumber: docNo,
      date: new Date().toISOString().split('T')[0],
      sourceStoreId: sourceStoreId,
      sourceStoreName: sourceStore?.name || 'Toko Asal',
      destStoreId: destStoreId,
      destStoreName: destStore?.name || 'Toko Tujuan',
      items: formItems.map((it, idx) => ({
        id: `m_item_${Date.now()}_${idx}`,
        productId: it.productId,
        productName: it.productName,
        barcode: it.barcode,
        unit: it.unit,
        quantity: it.quantity,
        conversionMultiplier: 1,
        baseUnit: it.unit,
        baseQuantity: it.quantity,
        availableStockOrigin: it.availableStock,
        notes: it.notes,
      })),
      totalQuantity: totalQty,
      status: initialStatus,
      transferredBy,
      shippingNotes,
      createdAt: new Date().toISOString(),
      completedAt: initialStatus === 'completed' ? new Date().toISOString() : undefined,
    };

    // Update catalog stock (reduce stock from origin)
    const updatedProducts = products.map((p) => {
      const mutItem = formItems.find((it) => it.productId === p.id);
      if (mutItem) {
        return {
          ...p,
          stock: Math.max(0, (p.stock || 0) - mutItem.quantity),
        };
      }
      return p;
    });

    onUpdateProducts(updatedProducts);
    saveMutations([newMutation, ...mutations]);

    alert(`Mutasi Barang ${docNo} berhasil dibuat!\nStok barang telah dipotong dari cabang pengirim.`);
    setIsNewMutationModalOpen(false);
    setFormItems([]);
  };

  // Complete In-Transit Mutation
  const handleMarkCompleted = (mutId: string) => {
    const receiver = prompt('Masukkan nama petugas penerima di cabang tujuan:', 'Staff Penerima');
    if (!receiver) return;

    const nextMutations = mutations.map((m) => {
      if (m.id === mutId) {
        return {
          ...m,
          status: 'completed' as const,
          receivedBy: receiver,
          completedAt: new Date().toISOString(),
        };
      }
      return m;
    });

    saveMutations(nextMutations);
    alert('Mutasi barang berhasil dikonfirmasi selesai diterima di cabang tujuan!');
  };

  // View Detail & Print Modal
  const [viewingMutation, setViewingMutation] = useState<StockMutation | null>(null);
  const [printData, setPrintData] = useState<StockMutation | null>(null);

  // Filtered Mutations
  const filteredMutations = useMemo(() => {
    return mutations.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = m.mutationNumber.toLowerCase().includes(q);
        const matchSrc = m.sourceStoreName.toLowerCase().includes(q);
        const matchDst = m.destStoreName.toLowerCase().includes(q);
        if (!matchNo && !matchSrc && !matchDst) return false;
      }
      return true;
    });
  }, [mutations, statusFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-stone-100 text-stone-900">
      {/* Top Header */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-stone-900">
                Mutasi Barang Antar Cabang
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                Inter-Store Transfer
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Transfer pemindahan stok barang antar toko cabang & gudang pusat dengan surat jalan pengiriman
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600"
            title="Tutup Modul"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-stone-500 uppercase">
              Total Mutasi Terbit
            </span>
            <span className="text-2xl font-mono font-black text-stone-900 mt-1 block">
              {mutations.length} Pengiriman
            </span>
            <span className="text-[10px] text-stone-400">Seluruh cabang toko</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
            <span className="text-[11px] font-bold text-amber-800 uppercase">
              Dalam Perjalanan (In Transit)
            </span>
            <span className="text-2xl font-mono font-black text-amber-700 mt-1 block">
              {mutations.filter((m) => m.status === 'in_transit').length} Dokumen
            </span>
            <span className="text-[10px] text-amber-600">Menunggu konfirmasi penerimaan toko tujuan</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-800 uppercase">
              Selesai Diterima (Completed)
            </span>
            <span className="text-2xl font-mono font-black text-emerald-700 mt-1 block">
              {mutations.filter((m) => m.status === 'completed').length} Dokumen
            </span>
            <span className="text-[10px] text-emerald-600">Transfer barang selesai tervalidasi</span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari no mutasi (MUT-...), toko asal, atau cabang tujuan..."
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Semua Status Mutasi</option>
              <option value="in_transit">Sedang Dalam Pengiriman</option>
              <option value="completed">Selesai Diterima</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormItems([]);
              setIsNewMutationModalOpen(true);
            }}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat Mutasi Barang Baru</span>
          </button>
        </div>

        {/* Table of Stock Mutations */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">No. Dokumen</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Cabang Pengirim (Asal)</th>
                  <th className="px-4 py-3">Cabang Penerima (Tujuan)</th>
                  <th className="px-4 py-3 text-center">Total Qty</th>
                  <th className="px-4 py-3">Pengirim / Kurir</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 font-medium">
                {filteredMutations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-stone-400">
                      Tidak ada data mutasi barang yang sesuai kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredMutations.map((mut) => (
                    <tr key={mut.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-purple-700">
                        {mut.mutationNumber}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{mut.date}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-stone-900 block">{mut.sourceStoreName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-purple-900 block">{mut.destStoreName}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold">
                        {mut.totalQuantity} Item
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        <span>{mut.transferredBy}</span>
                        {mut.shippingNotes && (
                          <span className="block text-[10px] text-stone-400">{mut.shippingNotes}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {mut.status === 'in_transit' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3" />
                            <span>In Transit</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3" />
                            <span>Selesai</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {mut.status === 'in_transit' && (
                            <button
                              onClick={() => handleMarkCompleted(mut.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                              title="Konfirmasi barang telah sampai dan diterima"
                            >
                              Terima
                            </button>
                          )}
                          <button
                            onClick={() => setViewingMutation(mut)}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                            title="Lihat rincian barang"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                          <button
                            onClick={() => setPrintData(mut)}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-purple-50 text-stone-700 hover:text-purple-800 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                            title="Cetak Surat Jalan Mutasi"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Surat Jalan</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: FORM MUTASI BARU                                      */}
      {/* ============================================================ */}
      {isNewMutationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-stone-200">
            <div className="px-5 py-4 bg-purple-50 border-b border-purple-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-purple-700" />
                <h3 className="text-base font-bold text-stone-900">
                  Formulir Mutasi Stok Antar Cabang
                </h3>
              </div>
              <button
                onClick={() => setIsNewMutationModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMutation} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Branch Routing Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>Cabang Asal (Pengirim)</span>
                  </label>
                  <select
                    value={sourceStoreId}
                    onChange={(e) => setSourceStoreId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-purple-500" />
                    <span>Cabang Tujuan (Penerima)</span>
                  </label>
                  <select
                    value={destStoreId}
                    onChange={(e) => setDestStoreId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-bold text-purple-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id} disabled={s.id === sourceStoreId}>
                        {s.name} ({s.city}) {s.id === sourceStoreId ? '(Asal)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                    <span>Petugas Pengirim</span>
                  </label>
                  <input
                    type="text"
                    value={transferredBy}
                    onChange={(e) => setTransferredBy(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-stone-400" />
                    <span>Catatan Ekspedisi / Kendaraan</span>
                  </label>
                  <input
                    type="text"
                    value={shippingNotes}
                    onChange={(e) => setShippingNotes(e.target.value)}
                    placeholder="Plat nopol kendaraan, kurir toko..."
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">
                    Daftar Barang yang Dimutasi ({formItems.length} item)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemToForm}
                    className="px-2.5 py-1 bg-white hover:bg-stone-200 border border-stone-300 text-stone-700 rounded-lg text-xs font-bold transition-colors"
                  >
                    + Tambah Produk
                  </button>
                </div>

                <div className="p-3 space-y-3">
                  {formItems.length === 0 ? (
                    <p className="text-center py-4 text-xs text-stone-400">
                      Belum ada barang dipilih. Klik tombol "+ Tambah Produk" di atas.
                    </p>
                  ) : (
                    formItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs space-y-2"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                              Produk
                            </label>
                            <select
                              value={item.productId}
                              onChange={(e) => {
                                const p = products.find((prod) => prod.id === e.target.value);
                                if (p) {
                                  const upd = [...formItems];
                                  upd[idx] = {
                                    ...upd[idx],
                                    productId: p.id,
                                    productName: p.name,
                                    barcode: p.barcode || '',
                                    unit: p.unit || 'Pcs',
                                    availableStock: p.stock || 0,
                                  };
                                  setFormItems(upd);
                                }
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg font-semibold"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (Stok asal: {p.stock || 0} {p.unit || 'Pcs'})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                              Stok Asal
                            </label>
                            <div className="px-2 py-1.5 bg-stone-200 border border-stone-300 rounded-lg font-mono font-bold text-stone-700 text-center">
                              {item.availableStock} {item.unit}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                              Qty Dimutasikan
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={item.availableStock}
                              value={item.quantity}
                              onChange={(e) => {
                                const q = parseInt(e.target.value) || 1;
                                const upd = [...formItems];
                                upd[idx] = { ...upd[idx], quantity: q };
                                setFormItems(upd);
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg font-bold text-center text-purple-900"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-200">
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                              Keterangan
                            </label>
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => {
                                const upd = [...formItems];
                                upd[idx] = { ...upd[idx], notes: e.target.value };
                                setFormItems(upd);
                              }}
                              placeholder="Kebutuhan restock, promosi..."
                              className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => setFormItems(formItems.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 p-1 self-end mb-0.5"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="text-xs font-bold text-stone-700">
                  Total Fisik Transfer:{' '}
                  <span className="font-mono text-purple-700 font-black">
                    {formItems.reduce((sum, it) => sum + it.quantity, 0)} Item
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewMutationModalOpen(false)}
                    className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Terbitkan Mutasi & Kirim Barang</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DETAIL MUTASI BARANG                                  */}
      {/* ============================================================ */}
      {viewingMutation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden border border-stone-200">
            <div className="px-5 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Rincian Mutasi Barang: {viewingMutation.mutationNumber}
                </h3>
                <p className="text-xs text-stone-500">
                  {viewingMutation.sourceStoreName} ➔ {viewingMutation.destStoreName}
                </p>
              </div>
              <button
                onClick={() => setViewingMutation(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Tanggal:</span>
                  <span className="font-bold">{viewingMutation.date}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Status:</span>
                  <span className="font-bold text-purple-700">
                    {viewingMutation.status === 'in_transit' ? 'Dalam Pengiriman' : 'Selesai'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Petugas Pengirim:</span>
                  <span>{viewingMutation.transferredBy}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Ekspedisi:</span>
                  <span>{viewingMutation.shippingNotes || '-'}</span>
                </div>
              </div>

              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Nama Produk</th>
                      <th className="p-2.5 text-center">Qty Mutasi</th>
                      <th className="p-2.5">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 font-medium">
                    {viewingMutation.items.map((it) => (
                      <tr key={it.id}>
                        <td className="p-2.5 font-bold">{it.productName}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-purple-700">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="p-2.5 text-stone-500">{it.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setPrintData(viewingMutation);
                  setViewingMutation(null);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Surat Jalan</span>
              </button>
              <button
                onClick={() => setViewingMutation(null)}
                className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CETAK SURAT JALAN MUTASI                              */}
      {/* ============================================================ */}
      {printData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-stone-300">
            <div className="px-5 py-3 bg-stone-100 border-b border-stone-200 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-stone-900 text-sm">
                  Pratinjau Surat Jalan Transfer Mutasi
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Surat Jalan</span>
                </button>
                <button
                  onClick={() => setPrintData(null)}
                  className="p-1 rounded-lg text-stone-500 hover:bg-stone-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto font-sans text-stone-900 space-y-4">
              <div className="text-center border-b-2 border-stone-800 pb-3">
                <h1 className="text-xl font-black uppercase tracking-wider text-stone-900">
                  SURAT JALAN MUTASI BARANG
                </h1>
                <p className="text-xs text-stone-600 font-medium">
                  Nomor: {printData.mutationNumber} • Tanggal: {printData.date}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-stone-50 p-3 rounded-xl border border-stone-300">
                <div>
                  <span className="text-stone-500 block font-bold">CABANG ASAL (PENGIRIM):</span>
                  <p className="font-black text-stone-900">{printData.sourceStoreName}</p>
                  <p className="text-stone-500">Petugas: {printData.transferredBy}</p>
                </div>
                <div>
                  <span className="text-stone-500 block font-bold">CABANG TUJUAN (PENERIMA):</span>
                  <p className="font-black text-purple-900">{printData.destStoreName}</p>
                  <p className="text-stone-500">Pengiriman: {printData.shippingNotes || '-'}</p>
                </div>
              </div>

              <table className="w-full text-left text-xs border border-stone-300">
                <thead className="bg-stone-100 border-b border-stone-300 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2 border-r border-stone-300 w-8 text-center">No</th>
                    <th className="p-2 border-r border-stone-300 w-28">Barcode</th>
                    <th className="p-2 border-r border-stone-300">Nama Barang</th>
                    <th className="p-2 border-r border-stone-300 w-20 text-center">Satuan</th>
                    <th className="p-2 border-r border-stone-300 w-20 text-center">Qty Mutasi</th>
                    <th className="p-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-300 font-medium text-xs">
                  {printData.items.map((it, idx) => (
                    <tr key={it.id}>
                      <td className="p-2 border-r border-stone-300 text-center">{idx + 1}</td>
                      <td className="p-2 border-r border-stone-300 font-mono">{it.barcode || '-'}</td>
                      <td className="p-2 border-r border-stone-300 font-bold">{it.productName}</td>
                      <td className="p-2 border-r border-stone-300 text-center">{it.unit}</td>
                      <td className="p-2 border-r border-stone-300 text-center font-mono font-bold text-purple-900">
                        {it.quantity}
                      </td>
                      <td className="p-2 text-stone-500">{it.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <p className="text-stone-500 mb-14">Yang Menyerahkan (Asal),</p>
                  <p className="font-bold border-t border-stone-400 pt-1">
                    ( {printData.transferredBy} )
                  </p>
                </div>
                <div>
                  <p className="text-stone-500 mb-14">Pengemudi / Kurir,</p>
                  <p className="font-bold border-t border-stone-400 pt-1">( ................................ )</p>
                </div>
                <div>
                  <p className="text-stone-500 mb-14">Yang Menerima (Tujuan),</p>
                  <p className="font-bold border-t border-stone-400 pt-1">
                    ( {printData.receivedBy || '................................'} )
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
