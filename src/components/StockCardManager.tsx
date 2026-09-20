import React, { useState, useMemo } from 'react';
import {
  Product,
  Order,
  PurchaseOrder,
  StockOpnameRecord,
  SalesReturn,
  PurchaseReturn,
  StockMutation,
  Store,
  StockMovementEntry,
  StockAdjustmentRecord,
  StockSummaryReportItem,
} from '../types';
import {
  formatRupiah,
  formatNumber,
  formatDateTime,
} from '../utils/formatters';
import { getTenantStorageKey } from '../utils/tenantHelper';
import {
  INITIAL_STOCK_OPNAMES,
  INITIAL_SALES_RETURNS,
  INITIAL_PURCHASE_RETURNS,
  INITIAL_STOCK_MUTATIONS,
} from '../data/mockOperations';
import {
  collectAllStockMovements,
  calculateProductStockLedger,
  calculateStockSummaryReport,
  getStoredStockAdjustments,
  saveStoredStockAdjustments,
  exportStockCardToCSV,
  exportStockSummaryToCSV,
  formatStockMovementTypeLabel,
} from '../utils/stockCardHelper';
import {
  Package,
  Layers,
  Search,
  Filter,
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  Printer,
  Download,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Building2,
  Barcode,
  X,
  Plus,
  Clock,
  User,
  Info,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface StockCardManagerProps {
  products: Product[];
  orders: Order[];
  purchases?: PurchaseOrder[];
  stockOpnames?: StockOpnameRecord[];
  salesReturns?: SalesReturn[];
  purchaseReturns?: PurchaseReturn[];
  stockMutations?: StockMutation[];
  stores: Store[];
  currentStore?: Store;
  onUpdateProducts?: (products: Product[]) => void;
  canEdit?: boolean;
  preSelectedProductId?: string;
  storeSlug?: string;
}

export const StockCardManager: React.FC<StockCardManagerProps> = ({
  products,
  orders,
  purchases = [],
  stockOpnames = [],
  salesReturns = [],
  purchaseReturns = [],
  stockMutations = [],
  stores,
  currentStore,
  onUpdateProducts,
  canEdit = true,
  preSelectedProductId,
  storeSlug,
}) => {
  // Mode Navigasi Utama:
  // 1. 'individual': Kartu Stok Per Item Barang
  // 2. 'summary_report': Laporan Rekapitulasi Mutasi Seluruh Barang
  // 3. 'turnover_analysis': Analisis Barang Fast & Slow Moving
  const [activeTab, setActiveTab] = useState<'individual' | 'summary_report' | 'turnover_analysis'>('individual');

  // State Penyesuaian Manual (Adjustments)
  const [adjustments, setAdjustments] = useState<StockAdjustmentRecord[]>(() =>
    getStoredStockAdjustments(storeSlug)
  );

  // State Pemilihan Produk untuk Kartu Stok Individual
  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    if (preSelectedProductId && products.some((p) => p.id === preSelectedProductId)) {
      return preSelectedProductId;
    }
    return products[0]?.id || '';
  });

  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  // State Filter Periode Tanggal
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const [datePreset, setDatePreset] = useState<'today' | '7days' | 'month' | '30days' | 'custom'>('30days');
  const [startDate, setStartDate] = useState<string>(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // State Filter Cabang & Tipe Transaksi
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all'); // 'all', 'in_only', 'out_only', or specific type

  // Filter untuk Laporan Rekapitulasi
  const [summaryCategoryFilter, setSummaryCategoryFilter] = useState<string>('all');
  const [summarySearchTerm, setSummarySearchTerm] = useState<string>('');
  const [summaryStatusFilter, setSummaryStatusFilter] = useState<'all' | 'safe' | 'low' | 'out_of_stock' | 'negative'>('all');

  // Modal State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<'individual' | 'summary'>('individual');

  // Handler Ganti Preset Tanggal
  const handleDatePresetChange = (preset: 'today' | '7days' | 'month' | '30days' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    let start = end;

    if (preset === 'today') {
      start = end;
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().slice(0, 10);
    } else if (preset === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      start = d.toISOString().slice(0, 10);
    } else if (preset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().slice(0, 10);
    }

    setStartDate(start);
    setEndDate(end);
  };

  // Muat data histori opname, retur, dan mutasi dari storage tenant jika prop kosong
  const effectiveStockOpnames = useMemo(() => {
    if (stockOpnames && stockOpnames.length > 0) return stockOpnames;
    try {
      const key = getTenantStorageKey('toko_online_stock_opnames', storeSlug);
      const saved = localStorage.getItem(key) || localStorage.getItem(getTenantStorageKey('kuickmart_stock_opnames', storeSlug));
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_STOCK_OPNAMES;
  }, [stockOpnames, storeSlug]);

  const effectiveSalesReturns = useMemo(() => {
    if (salesReturns && salesReturns.length > 0) return salesReturns;
    try {
      const key = getTenantStorageKey('toko_online_sales_returns', storeSlug);
      const saved = localStorage.getItem(key) || localStorage.getItem(getTenantStorageKey('kuickmart_sales_returns', storeSlug));
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SALES_RETURNS;
  }, [salesReturns, storeSlug]);

  const effectivePurchaseReturns = useMemo(() => {
    if (purchaseReturns && purchaseReturns.length > 0) return purchaseReturns;
    try {
      const key = getTenantStorageKey('toko_online_purchase_returns', storeSlug);
      const saved = localStorage.getItem(key) || localStorage.getItem(getTenantStorageKey('kuickmart_purchase_returns', storeSlug));
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_PURCHASE_RETURNS;
  }, [purchaseReturns, storeSlug]);

  const effectiveStockMutations = useMemo(() => {
    if (stockMutations && stockMutations.length > 0) return stockMutations;
    try {
      const key = getTenantStorageKey('toko_online_stock_mutations', storeSlug);
      const saved = localStorage.getItem(key) || localStorage.getItem(getTenantStorageKey('kuickmart_stock_mutations', storeSlug));
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_STOCK_MUTATIONS;
  }, [stockMutations, storeSlug]);

  // Kumpulkan semua transaksi mutasi keluar-masuk
  const allMovements = useMemo(() => {
    return collectAllStockMovements(
      {
        products,
        orders,
        purchases,
        stockOpnames: effectiveStockOpnames,
        salesReturns: effectiveSalesReturns,
        purchaseReturns: effectivePurchaseReturns,
        stockMutations: effectiveStockMutations,
        stockAdjustments: adjustments,
      },
      selectedStoreFilter
    );
  }, [
    products,
    orders,
    purchases,
    effectiveStockOpnames,
    effectiveSalesReturns,
    effectivePurchaseReturns,
    effectiveStockMutations,
    adjustments,
    selectedStoreFilter,
  ]);

  // Selected Product
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0] || null;
  }, [products, selectedProductId]);

  // Hitung Kartu Stok untuk Produk Terpilih
  const currentLedger = useMemo(() => {
    if (!selectedProduct) return null;
    return calculateProductStockLedger(selectedProduct, allMovements, {
      startDate,
      endDate,
    });
  }, [selectedProduct, allMovements, startDate, endDate]);

  // Filter data tabel mutasi individual jika user memfilter arah (in/out)
  const filteredLedgerEntries = useMemo(() => {
    if (!currentLedger) return [];
    let entries = currentLedger.entries;

    if (movementTypeFilter === 'in_only') {
      entries = entries.filter((e) => e.direction === 'in');
    } else if (movementTypeFilter === 'out_only') {
      entries = entries.filter((e) => e.direction === 'out');
    } else if (movementTypeFilter !== 'all') {
      entries = entries.filter((e) => e.type === movementTypeFilter);
    }

    return entries;
  }, [currentLedger, movementTypeFilter]);

  // Laporan Rekapitulasi Seluruh Barang
  const stockSummaryItems = useMemo(() => {
    return calculateStockSummaryReport(products, allMovements, {
      startDate,
      endDate,
    });
  }, [products, allMovements, startDate, endDate]);

  // Filter Rekapitulasi
  const filteredSummaryItems = useMemo(() => {
    return stockSummaryItems.filter((item) => {
      if (summaryCategoryFilter !== 'all' && item.category !== summaryCategoryFilter) {
        return false;
      }
      if (summaryStatusFilter !== 'all' && item.status !== summaryStatusFilter) {
        return false;
      }
      if (summarySearchTerm.trim()) {
        const q = summarySearchTerm.toLowerCase();
        return (
          item.productName.toLowerCase().includes(q) ||
          item.barcode.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stockSummaryItems, summaryCategoryFilter, summaryStatusFilter, summarySearchTerm]);

  // Ringkasan Akumulasi Toko untuk Rekapitulasi
  const summaryAggregates = useMemo(() => {
    return stockSummaryItems.reduce(
      (acc, item) => {
        acc.totalInitial += item.initialStock;
        acc.totalIn += item.totalIn;
        acc.totalOut += item.totalOut;
        acc.totalFinal += item.finalStock;
        acc.totalValuation += item.finalValuation;
        if (item.status === 'low') acc.lowCount++;
        if (item.status === 'out_of_stock') acc.outCount++;
        return acc;
      },
      {
        totalInitial: 0,
        totalIn: 0,
        totalOut: 0,
        totalFinal: 0,
        totalValuation: 0,
        lowCount: 0,
        outCount: 0,
      }
    );
  }, [stockSummaryItems]);

  // Daftar Kategori Unik
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Analisis Fast Moving (Keluar Terbanyak) dan Slow Moving
  const turnoverAnalysis = useMemo(() => {
    const sorted = [...stockSummaryItems].sort((a, b) => b.totalOut - a.totalOut);
    const fastMoving = sorted.filter((s) => s.totalOut > 0).slice(0, 10);
    const slowMoving = [...stockSummaryItems]
      .filter((s) => s.finalStock > 0 && s.totalOut <= 2)
      .sort((a, b) => a.totalOut - b.totalOut)
      .slice(0, 10);

    return { fastMoving, slowMoving };
  }, [stockSummaryItems]);

  // FORM PENYESUAIAN STOK MANUAL
  const [adjProductId, setAdjProductId] = useState<string>(selectedProductId);
  const [adjType, setAdjType] = useState<'in' | 'out'>('out');
  const [adjQty, setAdjQty] = useState<number>(1);
  const [adjReason, setAdjReason] = useState<StockAdjustmentRecord['reason']>('damaged');
  const [adjNotes, setAdjNotes] = useState<string>('');
  const [adjHandledBy, setAdjHandledBy] = useState<string>('Staff Gudang');

  const reasonLabels: Record<StockAdjustmentRecord['reason'], string> = {
    damaged: 'Kemasan Sobek / Rusak Fisik',
    expired: 'Kadaluarsa / Expired',
    sample: 'Tester / Sampel Promosi',
    bonus: 'Bonus Tambahan Distributor (Tanpa PO)',
    lost: 'Kehilangan / Selisih Fisik',
    correction: 'Koreksi Saldo Sistem',
    other: 'Lainnya',
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === adjProductId);
    if (!prod || adjQty <= 0) {
      alert('Pilih produk dan masukkan jumlah mutasi yang valid.');
      return;
    }

    const adjNumber = `ADJ-${new Date().toISOString().slice(2, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`;
    const cost = prod.costPrice || Math.round(prod.price * 0.75);

    const newRecord: StockAdjustmentRecord = {
      id: `adj_${Date.now()}`,
      adjustmentNumber: adjNumber,
      date: new Date().toISOString().slice(0, 10),
      productId: prod.id,
      productName: prod.name,
      barcode: prod.barcode || '-',
      unit: prod.unit || 'Pcs',
      storeId: currentStore?.id || 'store_1',
      storeName: currentStore?.name || 'Cabang Utama',
      type: adjType,
      quantity: adjQty,
      costPrice: cost,
      reason: adjReason,
      reasonLabel: reasonLabels[adjReason] || 'Penyesuaian Manual',
      notes: adjNotes.trim() || reasonLabels[adjReason],
      handledBy: adjHandledBy.trim() || 'Admin / Gudang',
      createdAt: new Date().toISOString(),
    };

    const updatedAdjustments = [newRecord, ...adjustments];
    setAdjustments(updatedAdjustments);
    saveStoredStockAdjustments(updatedAdjustments, storeSlug);

    // Update stok di katalog produk
    if (onUpdateProducts) {
      const delta = adjType === 'in' ? adjQty : -adjQty;
      const updatedProducts = products.map((p) => {
        if (p.id === prod.id) {
          return {
            ...p,
            stock: Math.max(0, p.stock + delta),
          };
        }
        return p;
      });
      onUpdateProducts(updatedProducts);
    }

    setIsAdjustmentModalOpen(false);
    setAdjQty(1);
    setAdjNotes('');
    alert(`Penyesuaian stok ${adjNumber} berhasil disimpan. Stok ${prod.name} telah diperbarui.`);
  };

  return (
    <div className="space-y-4">
      {/* HEADER UTAMA MODUL KARTU STOK */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900">
                  Kartu Stok & Histori Keluar Masuk Barang
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                  Otomatis
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Audit alur mutasi saldo berjalan persediaan (pembelian, kasir POS, opname, retur, transfer cabang)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Top */}
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setAdjProductId(selectedProductId || products[0]?.id || '');
                setIsAdjustmentModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Penyesuaian Manual</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setPrintDocType(activeTab === 'individual' ? 'individual' : 'summary');
              setIsPrintModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all border border-stone-200 cursor-pointer"
            title="Cetak Dokumen Kartu Stok / Laporan"
          >
            <Printer className="w-3.5 h-3.5 text-stone-600" />
            <span>Cetak Dokumen</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeTab === 'individual' && currentLedger) {
                exportStockCardToCSV(currentLedger, currentStore?.name || 'toko-online.online');
              } else {
                exportStockSummaryToCSV(
                  filteredSummaryItems,
                  { startDate, endDate },
                  currentStore?.name || 'toko-online.online'
                );
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all border border-stone-200 cursor-pointer"
            title="Download Format Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* TAB NAVIGATION: INDIVIDUAL vs SUMMARY vs TURNOVER */}
      <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('individual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'individual'
              ? 'bg-white text-blue-600 shadow-xs ring-1 ring-stone-200'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Kartu Stok Per Barang (Individual)</span>
          {selectedProduct && (
            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200 truncate max-w-[120px]">
              {selectedProduct.name}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('summary_report')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'summary_report'
              ? 'bg-white text-blue-600 shadow-xs ring-1 ring-stone-200'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Laporan Rekapitulasi Mutasi Stok</span>
          <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded font-mono">
            {products.length} Item
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('turnover_analysis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'turnover_analysis'
              ? 'bg-white text-blue-600 shadow-xs ring-1 ring-stone-200'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Analisis Fast & Slow Moving</span>
        </button>
      </div>

      {/* FILTER PERIODE WAKTU & CABANG (GLOBAL UNTUK SEMUA TAB) */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          {/* Preset Periode */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-stone-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>Periode:</span>
            </span>
            {(
              [
                { id: 'today', label: 'Hari Ini' },
                { id: '7days', label: '7 Hari' },
                { id: 'month', label: 'Bulan Ini' },
                { id: '30days', label: '30 Hari' },
                { id: 'custom', label: 'Kustom' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleDatePresetChange(p.id)}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input Tanggal Mulai - Selesai & Filter Toko */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-xl">
              <span className="text-stone-400 text-[11px]">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent text-stone-800 text-xs font-medium focus:outline-hidden"
              />
              <span className="text-stone-400 text-[11px]">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent text-stone-800 text-xs font-medium focus:outline-hidden"
              />
            </div>

            {/* Filter Cabang Toko */}
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-xl">
              <Building2 className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={selectedStoreFilter}
                onChange={(e) => setSelectedStoreFilter(e.target.value)}
                className="bg-transparent text-stone-800 text-xs font-medium focus:outline-hidden cursor-pointer"
              >
                <option value="all">Semua Cabang / Gudang</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KONTEN TAB 1: KARTU STOK INDIVIDUAL PER BARANG */}
      {/* ========================================================================= */}
      {activeTab === 'individual' && (
        <div className="space-y-4">
          {/* SEARCH & SELECTOR PRODUK */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 relative">
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Pilih Produk / Scan Barcode:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ketik nama barang atau nomor barcode (cth: Indomie, Bimoli, 899...)..."
                      value={productSearchTerm}
                      onChange={(e) => {
                        setProductSearchTerm(e.target.value);
                        setIsProductDropdownOpen(true);
                      }}
                      onFocus={() => setIsProductDropdownOpen(true)}
                      className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                    {productSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearchTerm('');
                          setIsProductDropdownOpen(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      setIsProductDropdownOpen(false);
                    }}
                    className="py-2 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:bg-white focus:border-blue-500 max-w-[200px] truncate"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stok: {p.stock} {p.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Autocomplete Dropdown Hasil Pencarian */}
                {isProductDropdownOpen && productSearchTerm.trim().length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-60 overflow-y-auto p-1">
                    {products
                      .filter((p) => {
                        const q = productSearchTerm.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(q) ||
                          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
                          (p.category && p.category.toLowerCase().includes(q))
                        );
                      })
                      .slice(0, 10)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedProductId(p.id);
                            setProductSearchTerm(p.name);
                            setIsProductDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                            p.id === selectedProductId
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'hover:bg-stone-50 text-stone-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-7 h-7 rounded object-cover border border-stone-200 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="truncate">
                              <p className="font-semibold truncate">{p.name}</p>
                              <p className="text-[10px] text-stone-400 font-mono">
                                Barcode: {p.barcode || '-'} • {p.category}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 pl-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                p.stock <= 0
                                  ? 'bg-red-100 text-red-700'
                                  : p.stock <= 5
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              Stok: {p.stock} {p.unit}
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Filter Jenis Alur / Transaksi Masuk-Keluar */}
              <div className="w-full md:w-auto">
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Filter Tipe Mutasi:
                </label>
                <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 p-1 rounded-xl">
                  <Filter className="w-3.5 h-3.5 text-stone-400 ml-1.5" />
                  <select
                    value={movementTypeFilter}
                    onChange={(e) => setMovementTypeFilter(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-stone-800 focus:outline-hidden pr-2 cursor-pointer"
                  >
                    <option value="all">Semua Mutasi (Masuk & Keluar)</option>
                    <option value="in_only">Barang Masuk Saja (+)</option>
                    <option value="out_only">Barang Keluar Saja (-)</option>
                    <option value="purchase_in">Pembelian Supplier Saja</option>
                    <option value="sale_out">Penjualan Kasir POS Saja</option>
                    <option value="opname_in">Opname Fisik Lebih</option>
                    <option value="opname_out">Opname Fisik Kurang</option>
                    <option value="sales_return_in">Retur Jual Konsumen</option>
                    <option value="purchase_return_out">Retur Beli Supplier</option>
                    <option value="mutation_in">Mutasi Masuk Cabang</option>
                    <option value="mutation_out">Mutasi Keluar Cabang</option>
                    <option value="adjustment_in">Penyesuaian Masuk Manual</option>
                    <option value="adjustment_out">Penyesuaian Keluar Manual</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* KARTU PROFIL PRODUK & RINGKASAN KPI KARTU STOK */}
          {selectedProduct && currentLedger && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Box Info Produk Terpilih */}
              <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs flex flex-col justify-between">
                <div className="flex items-start gap-3">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0 shadow-2xs"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                      {selectedProduct.category}
                    </span>
                    <h3 className="font-bold text-stone-900 text-sm mt-1 leading-snug truncate">
                      {selectedProduct.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-1 font-mono">
                      <Barcode className="w-3.5 h-3.5 text-stone-400" />
                      <span>{selectedProduct.barcode || 'NO-BARCODE'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-stone-400 text-[10px] block">Harga Jual:</span>
                    <span className="font-bold text-stone-800">{formatRupiah(selectedProduct.price)}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">HPP Modal:</span>
                    <span className="font-bold text-stone-800">
                      {formatRupiah(selectedProduct.costPrice || Math.round(selectedProduct.price * 0.75))}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 KPI KARTU STOK */}
              <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Saldo Awal */}
                <div className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-2xs">
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">1. Saldo Awal</span>
                    <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-stone-800">
                    {formatNumber(currentLedger.initialStock)}
                    <span className="text-xs font-semibold text-stone-400 ml-1">
                      {selectedProduct.unit}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">Sebelum {currentLedger.startDate}</p>
                </div>

                {/* 2. Total Masuk (+) */}
                <div className="bg-emerald-50/70 rounded-2xl p-3.5 border border-emerald-100 shadow-2xs">
                  <div className="flex items-center justify-between text-emerald-800 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">2. Total Masuk (+)</span>
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700">
                    +{formatNumber(currentLedger.totalIn)}
                    <span className="text-xs font-semibold text-emerald-600 ml-1">
                      {selectedProduct.unit}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-700 mt-1 font-medium">
                    Nilai: {formatRupiah(currentLedger.totalValueIn)}
                  </p>
                </div>

                {/* 3. Total Keluar (-) */}
                <div className="bg-rose-50/70 rounded-2xl p-3.5 border border-rose-100 shadow-2xs">
                  <div className="flex items-center justify-between text-rose-800 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">3. Total Keluar (-)</span>
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-rose-700">
                    -{formatNumber(currentLedger.totalOut)}
                    <span className="text-xs font-semibold text-rose-600 ml-1">
                      {selectedProduct.unit}
                    </span>
                  </div>
                  <p className="text-[10px] text-rose-700 mt-1 font-medium">
                    Nilai: {formatRupiah(currentLedger.totalValueOut)}
                  </p>
                </div>

                {/* 4. Saldo Akhir Berjalan (=) */}
                <div className="bg-blue-50/70 rounded-2xl p-3.5 border border-blue-100 shadow-2xs">
                  <div className="flex items-center justify-between text-blue-800 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">4. Saldo Akhir (=)</span>
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-blue-700">
                    {formatNumber(currentLedger.finalStock)}
                    <span className="text-xs font-semibold text-blue-600 ml-1">
                      {selectedProduct.unit}
                    </span>
                  </div>
                  <p className="text-[10px] text-blue-700 mt-1 font-medium">
                    Valuasi: {formatRupiah(currentLedger.finalValuation)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TABEL BUKU KARTU STOK KRONOLOGIS */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 sm:p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Buku Mutasi Kronologis Persediaan</span>
                </h4>
                <p className="text-[11px] text-stone-500">
                  Semua transaksi alur mutasi barang diurutkan otomatis dengan running balance saldo
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-500 text-[11px]">
                  Menampilkan <b>{filteredLedgerEntries.length}</b> transaksi
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Waktu / Tanggal</th>
                    <th className="py-2.5 px-3 min-w-[130px]">No. Dokumen / Ref</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Jenis Transaksi</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Pihak Terkait / Rekanan</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700 bg-emerald-50/50 min-w-[90px]">
                      Masuk (+)
                    </th>
                    <th className="py-2.5 px-3 text-right text-rose-700 bg-rose-50/50 min-w-[90px]">
                      Keluar (-)
                    </th>
                    <th className="py-2.5 px-3 text-right text-blue-800 bg-blue-50/60 min-w-[110px]">
                      Saldo Berjalan
                    </th>
                    <th className="py-2.5 px-3 text-right min-w-[110px]">Total Nilai (Rp)</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Petugas / PIC</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {/* BARIS SALDO AWAL */}
                  {currentLedger && (
                    <tr className="bg-stone-50/90 font-semibold text-stone-700">
                      <td className="py-2.5 px-3 text-center text-stone-400">0</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500">
                        {currentLedger.startDate} 00:00
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 font-bold">
                          SALDO-AWAL
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[11px] font-bold text-stone-700">Saldo Awal Buku</span>
                      </td>
                      <td className="py-2.5 px-3 text-stone-500 text-[11px]">Sistem Persediaan</td>
                      <td className="py-2.5 px-3 text-right bg-emerald-50/30 text-stone-400">-</td>
                      <td className="py-2.5 px-3 text-right bg-rose-50/30 text-stone-400">-</td>
                      <td className="py-2.5 px-3 text-right bg-blue-50/50 font-bold text-blue-900">
                        {formatNumber(currentLedger.initialStock)} {selectedProduct?.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                        {formatRupiah(
                          currentLedger.initialStock *
                            (selectedProduct?.costPrice || Math.round((selectedProduct?.price || 0) * 0.75))
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-stone-400 text-[11px]">Sistem</td>
                      <td className="py-2.5 px-3 text-stone-500 text-[11px] italic">
                        Posisi saldo persediaan sebelum {currentLedger.startDate}
                      </td>
                    </tr>
                  )}

                  {/* BARIS TRANSAKSI KELUAR MASUK */}
                  {filteredLedgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-stone-400 text-xs">
                        <Package className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                        <span>Tidak ada histori mutasi keluar-masuk pada periode atau filter ini.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredLedgerEntries.map((entry, idx) => {
                      const typeMeta = formatStockMovementTypeLabel(entry.type);
                      return (
                        <tr
                          key={entry.id}
                          className={`hover:bg-blue-50/30 transition-colors ${
                            idx % 2 === 1 ? 'bg-stone-50/30' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-stone-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-stone-600 whitespace-nowrap">
                            <div>{entry.date}</div>
                            <div className="text-[10px] text-stone-400">{entry.time}</div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded border bg-stone-50 text-stone-800 border-stone-200">
                              {entry.referenceNumber}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block ${typeMeta.badgeClass}`}
                            >
                              {typeMeta.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-stone-700 text-xs">
                            <div className="font-medium truncate max-w-[180px]" title={entry.partnerName}>
                              {entry.partnerName || '-'}
                            </div>
                            {entry.storeName && (
                              <span className="text-[10px] text-stone-400 block truncate">
                                {entry.storeName}
                              </span>
                            )}
                          </td>
                          {/* Qty Masuk */}
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600 bg-emerald-50/30 font-mono">
                            {entry.qtyIn > 0 ? `+${formatNumber(entry.qtyIn)}` : '-'}
                          </td>
                          {/* Qty Keluar */}
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600 bg-rose-50/30 font-mono">
                            {entry.qtyOut > 0 ? `-${formatNumber(entry.qtyOut)}` : '-'}
                          </td>
                          {/* Saldo Berjalan */}
                          <td className="py-2.5 px-3 text-right font-black text-blue-900 bg-blue-50/40 font-mono">
                            {formatNumber(entry.runningBalance)}{' '}
                            <span className="text-[10px] font-normal text-blue-600">{entry.unit}</span>
                          </td>
                          {/* Total Nilai Mutasi */}
                          <td className="py-2.5 px-3 text-right font-mono text-stone-700 text-[11px]">
                            {formatRupiah(entry.totalAmount)}
                          </td>
                          {/* Petugas */}
                          <td className="py-2.5 px-3 text-stone-600 text-[11px] whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-stone-400 shrink-0" />
                              <span className="truncate max-w-[110px]">{entry.operatorName || '-'}</span>
                            </div>
                          </td>
                          {/* Keterangan */}
                          <td className="py-2.5 px-3 text-stone-600 text-xs">
                            <p className="truncate max-w-[200px]" title={entry.notes}>
                              {entry.notes || '-'}
                            </p>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Summary Info */}
            {currentLedger && (
              <div className="p-3 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
                <div className="flex items-center gap-4 flex-wrap font-mono">
                  <span>
                    Saldo Awal: <b>{currentLedger.initialStock}</b>
                  </span>
                  <span className="text-emerald-700 font-bold">
                    Total Masuk: +{currentLedger.totalIn}
                  </span>
                  <span className="text-rose-700 font-bold">
                    Total Keluar: -{currentLedger.totalOut}
                  </span>
                  <span className="text-blue-700 font-extrabold">
                    Saldo Akhir: = {currentLedger.finalStock} {selectedProduct?.unit}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-400">Status Persediaan:</span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                      currentLedger.finalStock <= 0
                        ? 'bg-red-100 text-red-800'
                        : currentLedger.finalStock <= 5
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {currentLedger.finalStock <= 0
                      ? 'Habis (0)'
                      : currentLedger.finalStock <= 5
                      ? 'Menipis'
                      : 'Stok Aman'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KONTEN TAB 2: LAPORAN REKAPITULASI MUTASI STOK SELURUH BARANG */}
      {/* ========================================================================= */}
      {activeTab === 'summary_report' && (
        <div className="space-y-4">
          {/* HEADER SUMMARY METRICS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-2xs">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                Total Item Produk
              </span>
              <div className="text-xl sm:text-2xl font-black text-stone-900 mt-1">
                {products.length}
                <span className="text-xs font-normal text-stone-500 ml-1">Barang</span>
              </div>
              <p className="text-[10px] text-stone-400 mt-1">Katalog toko aktif</p>
            </div>

            <div className="bg-emerald-50/70 rounded-2xl p-3.5 border border-emerald-100 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Total Masuk (+)
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                +{formatNumber(summaryAggregates.totalIn)}
                <span className="text-xs font-normal text-emerald-600 ml-1">Pcs/Unit</span>
              </div>
              <p className="text-[10px] text-emerald-600 mt-1">Semua pembelian & retur</p>
            </div>

            <div className="bg-rose-50/70 rounded-2xl p-3.5 border border-rose-100 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                Total Keluar (-)
              </span>
              <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
                -{formatNumber(summaryAggregates.totalOut)}
                <span className="text-xs font-normal text-rose-600 ml-1">Pcs/Unit</span>
              </div>
              <p className="text-[10px] text-rose-600 mt-1">Semua penjualan kasir</p>
            </div>

            <div className="bg-blue-50/70 rounded-2xl p-3.5 border border-blue-100 shadow-2xs">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                Total Valuasi Akhir
              </span>
              <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
                {formatRupiah(summaryAggregates.totalValuation)}
              </div>
              <p className="text-[10px] text-blue-600 mt-1">Estimasi aset persediaan (HPP)</p>
            </div>
          </div>

          {/* FILTER BAR REKAPITULASI */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama barang, barcode, atau merk..."
                  value={summarySearchTerm}
                  onChange={(e) => setSummarySearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* Filter Kategori */}
              <select
                value={summaryCategoryFilter}
                onChange={(e) => setSummaryCategoryFilter(e.target.value)}
                className="py-2 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:bg-white cursor-pointer"
              >
                <option value="all">Semua Kategori</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status Stok */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-stone-400 text-[11px] font-bold">Status:</span>
              {[
                { id: 'all', label: 'Semua' },
                { id: 'safe', label: 'Aman' },
                { id: 'low', label: `Menipis (${summaryAggregates.lowCount})` },
                { id: 'out_of_stock', label: `Habis (${summaryAggregates.outCount})` },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSummaryStatusFilter(s.id as any)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    summaryStatusFilter === s.id
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* TABEL REKAPITULASI STOK */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Barcode</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Nama Produk</th>
                    <th className="py-2.5 px-3 min-w-[110px]">Kategori</th>
                    <th className="py-2.5 px-3 text-right min-w-[90px]">HPP (Modal)</th>
                    <th className="py-2.5 px-3 text-right min-w-[80px]">Saldo Awal</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700 bg-emerald-50/50 min-w-[80px]">
                      Masuk (+)
                    </th>
                    <th className="py-2.5 px-3 text-right text-rose-700 bg-rose-50/50 min-w-[80px]">
                      Keluar (-)
                    </th>
                    <th className="py-2.5 px-3 text-right text-blue-900 bg-blue-50/60 min-w-[90px]">
                      Saldo Akhir
                    </th>
                    <th className="py-2.5 px-3 text-right min-w-[110px]">Valuasi Akhir (Rp)</th>
                    <th className="py-2.5 px-3 text-center min-w-[90px]">Status</th>
                    <th className="py-2.5 px-3 text-center min-w-[100px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredSummaryItems.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-stone-400 text-xs">
                        Tidak ada barang yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSummaryItems.map((item, idx) => (
                      <tr
                        key={item.productId}
                        className={`hover:bg-blue-50/30 transition-colors ${
                          idx % 2 === 1 ? 'bg-stone-50/30' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-stone-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-stone-600 text-[11px] whitespace-nowrap">
                          {item.barcode}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-stone-800">
                          {item.productName}
                          <span className="text-[10px] text-stone-400 font-normal block">
                            Merk: {item.brand} • Satuan: {item.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-stone-600 whitespace-nowrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold border border-stone-200">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                          {formatRupiah(item.costPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-stone-700 font-medium">
                          {formatNumber(item.initialStock)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 bg-emerald-50/20">
                          {item.totalIn > 0 ? `+${formatNumber(item.totalIn)}` : '0'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 bg-rose-50/20">
                          {item.totalOut > 0 ? `-${formatNumber(item.totalOut)}` : '0'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-blue-900 bg-blue-50/30">
                          {formatNumber(item.finalStock)} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-800">
                          {formatRupiah(item.finalValuation)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              item.status === 'out_of_stock'
                                ? 'bg-red-100 text-red-800'
                                : item.status === 'low'
                                ? 'bg-amber-100 text-amber-800'
                                : item.status === 'negative'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.status === 'out_of_stock'
                              ? 'Habis'
                              : item.status === 'low'
                              ? 'Menipis'
                              : item.status === 'negative'
                              ? 'Minus'
                              : 'Aman'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductId(item.productId);
                              setActiveTab('individual');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition-colors cursor-pointer border border-blue-200"
                            title="Buka Kartu Stok Detail Barang Ini"
                          >
                            <span>Kartu Stok</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KONTEN TAB 3: ANALISIS FAST & SLOW MOVING */}
      {/* ========================================================================= */}
      {activeTab === 'turnover_analysis' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Box Fast Moving */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">Top 10 Barang Cepat Habis (Fast Moving)</h4>
                  <p className="text-[10px] text-stone-500">Jumlah keluar tertinggi dalam periode ini</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Prioritas Restock
              </span>
            </div>

            <div className="divide-y divide-stone-100 text-xs">
              {turnoverAnalysis.fastMoving.length === 0 ? (
                <p className="py-4 text-center text-stone-400 text-xs">Belum ada data penjualan pada periode ini.</p>
              ) : (
                turnoverAnalysis.fastMoving.map((item, idx) => (
                  <div key={item.productId} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-stone-800 truncate">{item.productName}</p>
                        <p className="text-[10px] text-stone-400 font-mono">
                          Barcode: {item.barcode} • Sisa Stok: {item.finalStock} {item.unit}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-rose-600 font-mono text-xs">
                        -{formatNumber(item.totalOut)} {item.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductId(item.productId);
                          setActiveTab('individual');
                        }}
                        className="text-[10px] text-blue-600 hover:underline block font-semibold"
                      >
                        Buka Kartu
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Box Slow Moving */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">Barang Mengendap (Slow Moving)</h4>
                  <p className="text-[10px] text-stone-500">Stok ada namun perputaran keluar sangat rendah</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                Saran Promo
              </span>
            </div>

            <div className="divide-y divide-stone-100 text-xs">
              {turnoverAnalysis.slowMoving.length === 0 ? (
                <p className="py-4 text-center text-stone-400 text-xs">Tidak ada barang mengendap.</p>
              ) : (
                turnoverAnalysis.slowMoving.map((item, idx) => (
                  <div key={item.productId} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-600 font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-stone-800 truncate">{item.productName}</p>
                        <p className="text-[10px] text-stone-400 font-mono">
                          Stok Mengendap: {item.finalStock} {item.unit} • Valuasi: {formatRupiah(item.finalValuation)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-stone-500 font-mono text-xs">
                        Keluar: {item.totalOut} {item.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductId(item.productId);
                          setActiveTab('individual');
                        }}
                        className="text-[10px] text-blue-600 hover:underline block font-semibold"
                      >
                        Buka Kartu
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PENYESUAIAN STOK MANUAL (ADJUSTMENT MODAL) */}
      {/* ========================================================================= */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-stone-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Catat Penyesuaian Manual Stok</h3>
                  <p className="text-[11px] text-stone-500">
                    Mencatat barang rusak, expired, tester, bonus vendor, atau selisih fisik
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3 text-xs">
              {/* Pilih Produk */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Pilih Produk:</label>
                <select
                  value={adjProductId}
                  onChange={(e) => setAdjProductId(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:bg-white"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stok Saat Ini: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipe Penyesuaian: Masuk (+) atau Keluar (-) */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Arah Mutasi Stok:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjType('out');
                      setAdjReason('damaged');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      adjType === 'out'
                        ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-200'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                    <span>Barang Keluar (-)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjType('in');
                      setAdjReason('bonus');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      adjType === 'in'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                    <span>Barang Masuk (+)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Jumlah Qty */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Jumlah (Qty):</label>
                  <input
                    type="number"
                    min="1"
                    value={adjQty}
                    onChange={(e) => setAdjQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
                    required
                  />
                </div>

                {/* Alasan */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Alasan Penyesuaian:</label>
                  <select
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value as any)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800"
                  >
                    {adjType === 'out' ? (
                      <>
                        <option value="damaged">Kemasan Sobek / Rusak Fisik</option>
                        <option value="expired">Kadaluarsa / Expired</option>
                        <option value="sample">Tester / Sampel Pelanggan</option>
                        <option value="lost">Kehilangan / Susut</option>
                        <option value="correction">Koreksi Hitungan Fisik</option>
                        <option value="other">Lainnya</option>
                      </>
                    ) : (
                      <>
                        <option value="bonus">Bonus Tambahan Distributor</option>
                        <option value="correction">Koreksi Hitungan (Fisik Lebih)</option>
                        <option value="other">Temuan Barang / Lainnya</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Keterangan Tambahan / Kronologi:
                </label>
                <textarea
                  rows={2}
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  placeholder="Contoh: Karton terjatuh dari rak susun saat pembersihan display..."
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 resize-none"
                />
              </div>

              {/* Petugas PIC */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Petugas / PIC:</label>
                <input
                  type="text"
                  value={adjHandledBy}
                  onChange={(e) => setAdjHandledBy(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                >
                  Simpan & Update Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PRINT PREVIEW DOKUMEN CETAK RESMI */}
      {/* ========================================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal Print Preview */}
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">
                  Pratinjau Dokumen Cetak -{' '}
                  {printDocType === 'individual'
                    ? `Kartu Stok (${selectedProduct?.name})`
                    : 'Laporan Rekapitulasi Persediaan'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Print Body (Formatted for Standard A4 Paper) */}
            <div className="p-6 overflow-y-auto space-y-6 text-stone-900 font-sans text-xs bg-white print:p-0">
              {/* Header Dokumen Resmi */}
              <div className="border-b-2 border-stone-800 pb-3 flex justify-between items-start">
                <div>
                  <h1 className="text-lg font-black tracking-tight text-stone-900 uppercase">
                    {currentStore?.name || 'toko-online.online'}
                  </h1>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    {currentStore?.address || 'Pusat Distribusi & Operasional Retail'} • Telp: {currentStore?.phone || '-'}
                  </p>
                  <p className="text-[11px] font-bold text-blue-700 mt-0.5 uppercase tracking-wider">
                    {printDocType === 'individual'
                      ? 'KARTU STOK PERSSEDIAN BARANG (STOCK LEDGER CARD)'
                      : 'LAPORAN REKAPITULASI MUTASI PERSSEDIAAN TOKO'}
                  </p>
                </div>
                <div className="text-right text-[11px] text-stone-500 font-mono">
                  <p>Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</p>
                  <p>Jam: {new Date().toLocaleTimeString('id-ID')}</p>
                  <p>Periode: {startDate} s/d {endDate}</p>
                </div>
              </div>

              {printDocType === 'individual' && currentLedger && selectedProduct ? (
                <>
                  {/* Metadata Barang */}
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-stone-500 text-[10px] block font-bold">NAMA BARANG:</span>
                      <span className="font-bold text-stone-900">{selectedProduct.name}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 text-[10px] block font-bold">BARCODE / KODE:</span>
                      <span className="font-mono font-bold text-stone-800">{selectedProduct.barcode || '-'}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 text-[10px] block font-bold">KATEGORI & MERK:</span>
                      <span>
                        {selectedProduct.category} • {selectedProduct.brand || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 text-[10px] block font-bold">SATUAN & HPP:</span>
                      <span className="font-bold">
                        {selectedProduct.unit} @ {formatRupiah(selectedProduct.costPrice || Math.round(selectedProduct.price * 0.75))}
                      </span>
                    </div>
                  </div>

                  {/* Summary Metric Box Print */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs border border-stone-200 rounded-xl p-2.5 bg-stone-50/50">
                    <div>
                      <span className="text-[10px] text-stone-500 block">SALDO AWAL</span>
                      <span className="font-bold text-stone-800">{currentLedger.initialStock} {selectedProduct.unit}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-700 block font-bold">TOTAL MASUK (+)</span>
                      <span className="font-bold text-emerald-700">+{currentLedger.totalIn} {selectedProduct.unit}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-rose-700 block font-bold">TOTAL KELUAR (-)</span>
                      <span className="font-bold text-rose-700">-{currentLedger.totalOut} {selectedProduct.unit}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-800 block font-bold">SALDO AKHIR (=)</span>
                      <span className="font-black text-blue-900">{currentLedger.finalStock} {selectedProduct.unit}</span>
                    </div>
                  </div>

                  {/* Tabel Print */}
                  <table className="w-full text-left border-collapse border border-stone-300 text-[11px]">
                    <thead>
                      <tr className="bg-stone-100 text-stone-800 font-bold border-b border-stone-300">
                        <th className="p-1.5 border border-stone-300 w-8 text-center">No</th>
                        <th className="p-1.5 border border-stone-300">Tanggal & Jam</th>
                        <th className="p-1.5 border border-stone-300">No. Dokumen</th>
                        <th className="p-1.5 border border-stone-300">Jenis Mutasi</th>
                        <th className="p-1.5 border border-stone-300">Rekanan / Keterangan</th>
                        <th className="p-1.5 border border-stone-300 text-right">Masuk</th>
                        <th className="p-1.5 border border-stone-300 text-right">Keluar</th>
                        <th className="p-1.5 border border-stone-300 text-right">Saldo</th>
                        <th className="p-1.5 border border-stone-300">PIC</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-stone-50 font-semibold">
                        <td className="p-1.5 border border-stone-300 text-center text-stone-400">0</td>
                        <td className="p-1.5 border border-stone-300 font-mono">{currentLedger.startDate}</td>
                        <td className="p-1.5 border border-stone-300 font-mono">SALDO-AWAL</td>
                        <td className="p-1.5 border border-stone-300">Saldo Awal Buku</td>
                        <td className="p-1.5 border border-stone-300 italic text-stone-500">Saldo sebelum periode</td>
                        <td className="p-1.5 border border-stone-300 text-right text-stone-400">-</td>
                        <td className="p-1.5 border border-stone-300 text-right text-stone-400">-</td>
                        <td className="p-1.5 border border-stone-300 text-right font-bold">
                          {currentLedger.initialStock}
                        </td>
                        <td className="p-1.5 border border-stone-300 text-stone-400">Sistem</td>
                      </tr>
                      {filteredLedgerEntries.map((e, idx) => (
                        <tr key={e.id}>
                          <td className="p-1.5 border border-stone-300 text-center font-mono">{idx + 1}</td>
                          <td className="p-1.5 border border-stone-300 font-mono whitespace-nowrap">
                            {e.date} {e.time}
                          </td>
                          <td className="p-1.5 border border-stone-300 font-mono font-bold whitespace-nowrap">
                            {e.referenceNumber}
                          </td>
                          <td className="p-1.5 border border-stone-300">{e.typeLabel}</td>
                          <td className="p-1.5 border border-stone-300">{e.partnerName || e.notes || '-'}</td>
                          <td className="p-1.5 border border-stone-300 text-right font-mono font-bold text-emerald-700">
                            {e.qtyIn > 0 ? `+${e.qtyIn}` : '-'}
                          </td>
                          <td className="p-1.5 border border-stone-300 text-right font-mono font-bold text-rose-700">
                            {e.qtyOut > 0 ? `-${e.qtyOut}` : '-'}
                          </td>
                          <td className="p-1.5 border border-stone-300 text-right font-mono font-bold text-blue-900">
                            {e.runningBalance}
                          </td>
                          <td className="p-1.5 border border-stone-300">{e.operatorName || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                /* Print Laporan Rekapitulasi */
                <table className="w-full text-left border-collapse border border-stone-300 text-[11px]">
                  <thead>
                    <tr className="bg-stone-100 text-stone-800 font-bold border-b border-stone-300">
                      <th className="p-1.5 border border-stone-300 w-8 text-center">No</th>
                      <th className="p-1.5 border border-stone-300">Barcode</th>
                      <th className="p-1.5 border border-stone-300">Nama Barang</th>
                      <th className="p-1.5 border border-stone-300">Satuan</th>
                      <th className="p-1.5 border border-stone-300 text-right">Saldo Awal</th>
                      <th className="p-1.5 border border-stone-300 text-right">Masuk (+)</th>
                      <th className="p-1.5 border border-stone-300 text-right">Keluar (-)</th>
                      <th className="p-1.5 border border-stone-300 text-right">Saldo Akhir</th>
                      <th className="p-1.5 border border-stone-300 text-right">Valuasi (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSummaryItems.map((item, idx) => (
                      <tr key={item.productId}>
                        <td className="p-1.5 border border-stone-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-1.5 border border-stone-300 font-mono">{item.barcode}</td>
                        <td className="p-1.5 border border-stone-300 font-bold">{item.productName}</td>
                        <td className="p-1.5 border border-stone-300">{item.unit}</td>
                        <td className="p-1.5 border border-stone-300 text-right font-mono">{item.initialStock}</td>
                        <td className="p-1.5 border border-stone-300 text-right font-mono text-emerald-700 font-bold">
                          +{item.totalIn}
                        </td>
                        <td className="p-1.5 border border-stone-300 text-right font-mono text-rose-700 font-bold">
                          -{item.totalOut}
                        </td>
                        <td className="p-1.5 border border-stone-300 text-right font-mono text-blue-900 font-bold">
                          {item.finalStock}
                        </td>
                        <td className="p-1.5 border border-stone-300 text-right font-mono">
                          {formatRupiah(item.finalValuation)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Tanda Tangan Pertanggungjawaban Gudang & Supervisor */}
              <div className="pt-6 grid grid-cols-2 text-center text-xs">
                <div>
                  <p className="text-stone-500 mb-12">Petugas Gudang / PIC,</p>
                  <p className="font-bold border-b border-stone-400 inline-block px-8 pb-1">
                    ( ........................................ )
                  </p>
                </div>
                <div>
                  <p className="text-stone-500 mb-12">Penanggung Jawab / Store Manager,</p>
                  <p className="font-bold border-b border-stone-400 inline-block px-8 pb-1">
                    ( ........................................ )
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
