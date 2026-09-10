import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Product, 
  Store, 
  StockOpnameItem, 
  StockOpnameRecord 
} from '../types';
import { formatRupiah } from '../utils/formatters';
import { 
  ClipboardCheck, 
  Search, 
  ScanBarcode, 
  RotateCcw, 
  Save, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  History, 
  Plus, 
  Minus, 
  X, 
  Building2, 
  UserCheck, 
  Calendar, 
  HelpCircle,
  Eye,
  Check
} from 'lucide-react';

interface StockOpnameManagerProps {
  products: Product[];
  stores: Store[];
  currentStore: Store;
  onUpdateProducts: (products: Product[]) => void;
  stockOpnames?: StockOpnameRecord[];
  onUpdateStockOpnames?: (records: StockOpnameRecord[]) => void;
  onClose?: () => void;
}

// Audio beep for barcode scan
function playBeep(freq = 1200) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // Ignore audio restrictions
  }
}

export const StockOpnameManager: React.FC<StockOpnameManagerProps> = ({
  products,
  stores,
  currentStore,
  onUpdateProducts,
  stockOpnames: propOpnames,
  onUpdateStockOpnames,
  onClose,
}) => {
  // Navigation sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'history'>('form');

  // Active Store
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    currentStore?.id || stores[0]?.id || 'store_1'
  );
  const activeStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId) || currentStore || stores[0];
  }, [stores, selectedStoreId, currentStore]);

  // Session metadata
  const [auditorName, setAuditorName] = useState('Staff Gudang (Auditor)');
  const [opnameDate, setOpnameDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [opnameNotes, setOpnameNotes] = useState('');

  // History state
  const [historyRecords, setHistoryRecords] = useState<StockOpnameRecord[]>(() => {
    try {
      const saved = localStorage.getItem('kuickmart_stock_opnames');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return propOpnames && propOpnames.length > 0 ? propOpnames : [];
  });

  // Sync prop opnames
  useEffect(() => {
    if (propOpnames && propOpnames.length > 0) {
      setHistoryRecords(propOpnames);
    }
  }, [propOpnames]);

  const saveHistory = (newRecords: StockOpnameRecord[]) => {
    setHistoryRecords(newRecords);
    if (onUpdateStockOpnames) onUpdateStockOpnames(newRecords);
    try {
      localStorage.setItem('kuickmart_stock_opnames', JSON.stringify(newRecords));
    } catch (e) {
      console.error(e);
    }
  };

  // Generate Document Number
  const currentDocNumber = useMemo(() => {
    const yearMonth = opnameDate.replace(/-/g, '').slice(0, 6);
    const count = historyRecords.length + 1;
    return `OPN-${yearMonth}-${String(count).padStart(3, '0')}`;
  }, [opnameDate, historyRecords.length]);

  // Physical Counts Map: productId -> { physicalStock, notes }
  const [physicalCounts, setPhysicalCounts] = useState<
    Record<string, { physicalStock: number; notes: string }>
  >(() => {
    const map: Record<string, { physicalStock: number; notes: string }> = {};
    products.forEach((p) => {
      map[p.id] = {
        physicalStock: p.stock ?? 0,
        notes: 'Sesuai fisik',
      };
    });
    return map;
  });

  // Sync if products change and not yet in map
  useEffect(() => {
    setPhysicalCounts((prev) => {
      const updated = { ...prev };
      let changed = false;
      products.forEach((p) => {
        if (!(p.id in updated)) {
          updated[p.id] = {
            physicalStock: p.stock ?? 0,
            notes: 'Sesuai fisik',
          };
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [products]);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDiscrepancyOnly, setShowDiscrepancyOnly] = useState(false);

  // Barcode Gun Quick Scanner
  const [barcodeGunInput, setBarcodeGunInput] = useState('');
  const barcodeGunInputRef = useRef<HTMLInputElement | null>(null);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<string | null>(null);

  // Detail Modal for history view
  const [viewingRecord, setViewingRecord] = useState<StockOpnameRecord | null>(null);

  // Printable Audit Sheet Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printRecordData, setPrintRecordData] = useState<StockOpnameRecord | null>(null);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Computed Item Rows
  const itemsData = useMemo<StockOpnameItem[]>(() => {
    return products.map((prod) => {
      const entry = physicalCounts[prod.id] || {
        physicalStock: prod.stock ?? 0,
        notes: 'Sesuai fisik',
      };
      const sysStock = prod.stock ?? 0;
      const physStock = entry.physicalStock;
      const diff = physStock - sysStock;
      const cost = prod.costPrice || Math.round(prod.price * 0.75);
      const diffAmt = diff * cost;

      return {
        id: `opn_item_${prod.id}`,
        productId: prod.id,
        productName: prod.name,
        barcode: prod.barcode || '',
        category: prod.category || 'Umum',
        unit: prod.unit || 'Pcs',
        systemStock: sysStock,
        physicalStock: physStock,
        differenceQty: diff,
        costPrice: cost,
        differenceAmount: diffAmt,
        notes: entry.notes,
      };
    });
  }, [products, physicalCounts]);

  // Filtered Rows for display
  const filteredItems = useMemo(() => {
    return itemsData.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Discrepancy filter
      if (showDiscrepancyOnly && item.differenceQty === 0) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.productName.toLowerCase().includes(q);
        const matchBarcode = item.barcode.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        if (!matchName && !matchBarcode && !matchCat) return false;
      }
      return true;
    });
  }, [itemsData, selectedCategory, showDiscrepancyOnly, searchQuery]);

  // KPIs
  const stats = useMemo(() => {
    let matched = 0;
    let deficitCount = 0;
    let deficitQty = 0;
    let surplusCount = 0;
    let surplusQty = 0;
    let netVarianceRp = 0;

    itemsData.forEach((item) => {
      if (item.differenceQty === 0) {
        matched++;
      } else if (item.differenceQty < 0) {
        deficitCount++;
        deficitQty += Math.abs(item.differenceQty);
      } else {
        surplusCount++;
        surplusQty += item.differenceQty;
      }
      netVarianceRp += item.differenceAmount;
    });

    return {
      totalItems: itemsData.length,
      matched,
      discrepancies: deficitCount + surplusCount,
      deficitCount,
      deficitQty,
      surplusCount,
      surplusQty,
      netVarianceRp,
    };
  }, [itemsData]);

  // Handlers for physical stock editing
  const handlePhysicalStockChange = (productId: string, val: number) => {
    const cleanVal = isNaN(val) ? 0 : Math.max(0, val);
    setPhysicalCounts((prev) => {
      const existing = prev[productId] || { physicalStock: 0, notes: '' };
      return {
        ...prev,
        [productId]: {
          ...existing,
          physicalStock: cleanVal,
        },
      };
    });
  };

  const handleAdjustStep = (productId: string, delta: number) => {
    setPhysicalCounts((prev) => {
      const existing = prev[productId] || { physicalStock: 0, notes: '' };
      const nextVal = Math.max(0, existing.physicalStock + delta);
      return {
        ...prev,
        [productId]: {
          ...existing,
          physicalStock: nextVal,
        },
      };
    });
  };

  const handleNotesChange = (productId: string, notes: string) => {
    setPhysicalCounts((prev) => {
      const existing = prev[productId] || { physicalStock: 0, notes: '' };
      return {
        ...prev,
        [productId]: {
          ...existing,
          notes,
        },
      };
    });
  };

  // Quick Action: Salin Semua Stok Sistem ke Fisik
  const handleCopySystemToPhysical = () => {
    if (window.confirm('Salin seluruh stok sistem saat ini menjadi nilai hitungan fisik dasar?')) {
      const map: Record<string, { physicalStock: number; notes: string }> = {};
      products.forEach((p) => {
        map[p.id] = {
          physicalStock: p.stock ?? 0,
          notes: 'Sesuai fisik',
        };
      });
      setPhysicalCounts(map);
    }
  };

  // Quick Action: Kosongkan Hitungan (Hitung dari 0)
  const handleResetToZero = () => {
    if (window.confirm('Reset seluruh hitungan fisik ke 0 untuk memulai penghitungan dari awal?')) {
      const map: Record<string, { physicalStock: number; notes: string }> = {};
      products.forEach((p) => {
        map[p.id] = {
          physicalStock: 0,
          notes: 'Belum dihitung',
        };
      });
      setPhysicalCounts(map);
    }
  };

  // Barcode Scanner Gun (+1 count per scan)
  const handleBarcodeGunSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeGunInput.trim().toLowerCase();
    if (!code) return;

    // Search product
    const matched = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === code) ||
        p.id.toLowerCase() === code ||
        p.unitConversions?.some((uc) => uc.barcode && uc.barcode.toLowerCase() === code)
    );

    if (matched) {
      playBeep(1400);
      handleAdjustStep(matched.id, 1);
      const currentPhys = (physicalCounts[matched.id]?.physicalStock ?? (matched.stock || 0)) + 1;
      setLastScannedFeedback(`+1 ${matched.name} (Fisik kini: ${currentPhys} ${matched.unit || 'Pcs'})`);
      setBarcodeGunInput('');
      setTimeout(() => setLastScannedFeedback(null), 3000);
    } else {
      playBeep(400);
      alert(`Barcode "${code}" tidak ditemukan dalam daftar produk.`);
      setBarcodeGunInput('');
    }
  };

  // POSTING & SESUAIKAN STOK KATALOG (Real Adjust)
  const handlePostOpname = () => {
    const discrepancyCount = stats.discrepancies;
    const confirmMessage = 
      `Apakah Anda yakin ingin MEMPOSTING hasil Stock Opname ini?\n\n` +
      `• No. Dokumen: ${currentDocNumber}\n` +
      `• Total Produk Diperiksa: ${itemsData.length}\n` +
      `• Produk Berselisih: ${discrepancyCount} barang\n` +
      `• Nilai Selisih Bersih: ${formatRupiah(stats.netVarianceRp)}\n\n` +
      `⚠️ PERINGATAN: Stok di katalog produk akan diperbarui secara permanen mengikuti hitungan fisik yang Anda masukkan!`;

    if (!window.confirm(confirmMessage)) return;

    // 1. Update stock in products catalog
    const updatedProducts: Product[] = products.map((prod) => {
      const entry = physicalCounts[prod.id];
      if (entry) {
        return {
          ...prod,
          stock: entry.physicalStock,
        };
      }
      return prod;
    });

    onUpdateProducts(updatedProducts);

    // 2. Create StockOpnameRecord
    const newRecord: StockOpnameRecord = {
      id: `opn_rec_${Date.now()}`,
      opnameNumber: currentDocNumber,
      date: opnameDate,
      storeId: activeStore.id,
      storeName: activeStore.name,
      auditorName,
      status: 'posted',
      items: itemsData,
      totalItemsCounted: itemsData.length,
      itemsMatchedCount: stats.matched,
      itemsDiscrepancyCount: stats.discrepancies,
      totalSurplusQty: stats.surplusQty,
      totalDeficitQty: stats.deficitQty,
      netDifferenceAmount: stats.netVarianceRp,
      notes: opnameNotes || 'Audit stok fisik minimarket selesai diposting.',
      createdAt: new Date().toISOString(),
      postedAt: new Date().toISOString(),
    };

    const nextHistory = [newRecord, ...historyRecords];
    saveHistory(nextHistory);

    playBeep(1800);
    alert(`Stock Opname ${currentDocNumber} BERHASIL DIPOSTING!\nStok katalog telah disesuaikan secara real-time.`);

    // Switch to history tab
    setActiveSubTab('history');
  };

  // Open Print Modal
  const handleOpenPrint = (record?: StockOpnameRecord) => {
    if (record) {
      setPrintRecordData(record);
    } else {
      // Build from current state
      const currentRec: StockOpnameRecord = {
        id: `preview_${Date.now()}`,
        opnameNumber: currentDocNumber,
        date: opnameDate,
        storeId: activeStore.id,
        storeName: activeStore.name,
        auditorName,
        status: 'draft',
        items: itemsData,
        totalItemsCounted: itemsData.length,
        itemsMatchedCount: stats.matched,
        itemsDiscrepancyCount: stats.discrepancies,
        totalSurplusQty: stats.surplusQty,
        totalDeficitQty: stats.deficitQty,
        netDifferenceAmount: stats.netVarianceRp,
        notes: opnameNotes,
        createdAt: new Date().toISOString(),
      };
      setPrintRecordData(currentRec);
    }
    setIsPrintModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-stone-100 text-stone-900">
      {/* Top Header */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-stone-900">
                Opname Stok Barang (Stock Opname)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800">
                Audit Fisik
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Pemeriksaan stok fisik, perbandingan stok sistem, penghitungan selisih & penyesuaian katalog
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('form')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'form'
                  ? 'bg-white text-teal-800 shadow-xs font-black'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Form Opname Aktif</span>
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'history'
                  ? 'bg-white text-teal-800 shadow-xs font-black'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat Dokumen ({historyRecords.length})</span>
            </button>
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
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
        {activeSubTab === 'form' ? (
          <>
            {/* 1. Header Information Bar */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Cabang Toko */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>Cabang Toko</span>
                  </label>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* No Dokumen */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    No. Dokumen Opname
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={currentDocNumber}
                    className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-700 cursor-not-allowed"
                  />
                </div>

                {/* Tanggal Audit */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>Tanggal Audit</span>
                  </label>
                  <input
                    type="date"
                    value={opnameDate}
                    onChange={(e) => setOpnameDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Auditor / Petugas */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                    <span>Petugas / Auditor</span>
                  </label>
                  <input
                    type="text"
                    value={auditorName}
                    onChange={(e) => setAuditorName(e.target.value)}
                    placeholder="Nama petugas opname..."
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
                <span className="text-[11px] font-bold text-stone-500 block uppercase">
                  Total Produk
                </span>
                <span className="text-2xl font-mono font-black text-stone-900 mt-1 block">
                  {stats.totalItems}
                </span>
                <span className="text-[10px] text-stone-400">Dalam master katalog</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
                <span className="text-[11px] font-bold text-emerald-800 block uppercase">
                  Fisik Sesuai (0)
                </span>
                <span className="text-2xl font-mono font-black text-emerald-700 mt-1 block">
                  {stats.matched}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">
                  {Math.round((stats.matched / (stats.totalItems || 1)) * 100)}% Cocok sempurna
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-red-200 bg-red-50/30 shadow-xs">
                <span className="text-[11px] font-bold text-red-800 block uppercase">
                  Selisih Kurang (-)
                </span>
                <span className="text-2xl font-mono font-black text-red-700 mt-1 block">
                  {stats.deficitCount}{' '}
                  <span className="text-xs font-normal text-red-500">(-{stats.deficitQty} pcs)</span>
                </span>
                <span className="text-[10px] text-red-600 font-medium">Hilang / rusak / basi</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-xs">
                <span className="text-[11px] font-bold text-blue-800 block uppercase">
                  Selisih Lebih (+)
                </span>
                <span className="text-2xl font-mono font-black text-blue-700 mt-1 block">
                  {stats.surplusCount}{' '}
                  <span className="text-xs font-normal text-blue-500">(+{stats.surplusQty} pcs)</span>
                </span>
                <span className="text-[10px] text-blue-600 font-medium">Surplus / bonus fisik</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs col-span-2 sm:col-span-1">
                <span className="text-[11px] font-bold text-amber-800 block uppercase">
                  Net Selisih Finansial
                </span>
                <span
                  className={`text-xl font-mono font-black mt-1 block truncate ${
                    stats.netVarianceRp < 0
                      ? 'text-red-600'
                      : stats.netVarianceRp > 0
                      ? 'text-blue-600'
                      : 'text-stone-700'
                  }`}
                >
                  {formatRupiah(stats.netVarianceRp)}
                </span>
                <span className="text-[10px] text-stone-500">Berdasarkan HPP Modal</span>
              </div>
            </div>

            {/* 3. Barcode Gun Fast Tally Bar & Tools */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Scan Barcode input gun */}
              <form onSubmit={handleBarcodeGunSubmit} className="relative flex-1 w-full">
                <ScanBarcode className="w-5 h-5 text-teal-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={barcodeGunInputRef}
                  type="text"
                  value={barcodeGunInput}
                  onChange={(e) => setBarcodeGunInput(e.target.value)}
                  placeholder="Scan Barcode Barang untuk +1 Hitungan Fisik (Tekan Enter)..."
                  className="w-full pl-11 pr-24 py-2.5 bg-stone-50 hover:bg-stone-100/70 focus:bg-white border-2 border-teal-300 focus:border-teal-600 rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:ring-3 focus:ring-teal-100 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  +1 Scan
                </button>
              </form>

              {/* Feedback toast */}
              {lastScannedFeedback && (
                <div className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl animate-pulse">
                  {lastScannedFeedback}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleCopySystemToPhysical}
                  className="flex-1 md:flex-none px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 transition-colors flex items-center justify-center gap-1.5"
                  title="Salin semua stok sistem saat ini menjadi baseline hitungan fisik"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                  <span>Salin Stok Buku</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToZero}
                  className="flex-1 md:flex-none px-3 py-2 bg-stone-100 hover:bg-red-50 border border-stone-300 hover:border-red-200 text-stone-700 hover:text-red-700 rounded-xl text-xs font-bold transition-colors"
                  title="Reset hitungan fisik ke 0"
                >
                  Nol-kan Fisik
                </button>
              </div>
            </div>

            {/* 4. Filter & Search Controls */}
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                {/* Search Text */}
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama barang / barcode..."
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Category Dropdown */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">Semua Kategori ({products.length})</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Discrepancy Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700 select-none bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 transition-colors">
                <input
                  type="checkbox"
                  checked={showDiscrepancyOnly}
                  onChange={(e) => setShowDiscrepancyOnly(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-stone-300 focus:ring-teal-500 cursor-pointer"
                />
                <span>Hanya Tampilkan Selisih ({stats.discrepancies} barang)</span>
              </label>
            </div>

            {/* 5. Inventory Table */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100/80 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-3 w-10 text-center">No</th>
                      <th className="px-3 py-3 w-36">Barcode</th>
                      <th className="px-3 py-3 min-w-[220px]">Nama Produk & Kategori</th>
                      <th className="px-3 py-3 w-20 text-center">Satuan</th>
                      <th className="px-3 py-3 w-28 text-right bg-stone-100/50">Stok Sistem</th>
                      <th className="px-3 py-3 w-40 text-center bg-teal-50/40">Hitungan Fisik</th>
                      <th className="px-3 py-3 w-28 text-center">Selisih Fisik</th>
                      <th className="px-3 py-3 w-32 text-right">HPP Modal</th>
                      <th className="px-3 py-3 w-36 text-right">Total Selisih (Rp)</th>
                      <th className="px-3 py-3 min-w-[180px]">Keterangan / Alasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 font-medium">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-stone-400">
                          Tidak ada produk yang sesuai dengan filter pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, idx) => {
                        const isMatched = item.differenceQty === 0;
                        const isDeficit = item.differenceQty < 0;
                        const isSurplus = item.differenceQty > 0;

                        return (
                          <tr
                            key={item.productId}
                            className={`hover:bg-stone-50/80 transition-colors ${
                              isDeficit ? 'bg-red-50/15' : isSurplus ? 'bg-blue-50/15' : ''
                            }`}
                          >
                            {/* 1. No */}
                            <td className="px-3 py-2.5 text-center text-stone-400 font-mono font-bold">
                              {idx + 1}
                            </td>

                            {/* 2. Barcode */}
                            <td className="px-3 py-2.5 font-mono text-stone-600">
                              {item.barcode || '-'}
                            </td>

                            {/* 3. Nama Produk */}
                            <td className="px-3 py-2.5">
                              <span className="font-bold text-stone-900 block">
                                {item.productName}
                              </span>
                              <span className="text-[10px] text-stone-400 font-mono">
                                {item.category}
                              </span>
                            </td>

                            {/* 4. Satuan */}
                            <td className="px-3 py-2.5 text-center font-bold text-stone-600">
                              {item.unit}
                            </td>

                            {/* 5. Stok Sistem */}
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-stone-700 bg-stone-50/40">
                              {item.systemStock}
                            </td>

                            {/* 6. Hitungan Fisik Input */}
                            <td className="px-3 py-2.5 bg-teal-50/20">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleAdjustStep(item.productId, -1)}
                                  className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold transition-colors"
                                  title="Kurang 1"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.physicalStock}
                                  onChange={(e) =>
                                    handlePhysicalStockChange(
                                      item.productId,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-16 px-2 py-1 bg-white border border-stone-300 rounded-lg text-center font-mono font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAdjustStep(item.productId, 1)}
                                  className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold transition-colors"
                                  title="Tambah 1"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            {/* 7. Selisih Fisik Badge */}
                            <td className="px-3 py-2.5 text-center">
                              {isMatched ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3" />
                                  <span>0 (Cocok)</span>
                                </span>
                              ) : isDeficit ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 font-mono">
                                  <span>{item.differenceQty}</span>
                                  <span>{item.unit}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">
                                  <span>+{item.differenceQty}</span>
                                  <span>{item.unit}</span>
                                </span>
                              )}
                            </td>

                            {/* 8. HPP Modal */}
                            <td className="px-3 py-2.5 text-right font-mono text-stone-600">
                              {formatRupiah(item.costPrice)}
                            </td>

                            {/* 9. Total Selisih Rp */}
                            <td className="px-3 py-2.5 text-right font-mono font-bold">
                              <span
                                className={
                                  isDeficit
                                    ? 'text-red-600'
                                    : isSurplus
                                    ? 'text-blue-600'
                                    : 'text-stone-400'
                                }
                              >
                                {formatRupiah(item.differenceAmount)}
                              </span>
                            </td>

                            {/* 10. Keterangan */}
                            <td className="px-3 py-2.5">
                              <input
                                type="text"
                                value={item.notes || ''}
                                onChange={(e) => handleNotesChange(item.productId, e.target.value)}
                                placeholder="Alasan: Rusak, Expired, Hilang..."
                                className="w-full px-2 py-1 bg-stone-50 hover:bg-stone-100/80 focus:bg-white border border-stone-200 rounded-lg text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6. Bottom Posting & Print Footer Bar */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-3 sticky bottom-2 z-10">
              <div>
                <div className="text-xs font-bold text-stone-800 flex items-center gap-2">
                  <span>Ringkasan Opname:</span>
                  <span className="text-emerald-700 font-bold">{stats.matched} Sesuai</span>
                  <span>•</span>
                  <span className="text-red-700 font-bold">{stats.deficitCount} Kurang</span>
                  <span>•</span>
                  <span className="text-blue-700 font-bold">{stats.surplusCount} Lebih</span>
                </div>
                <div className="text-xs text-stone-500">
                  Total Selisih Finansial:{' '}
                  <span className="font-mono font-bold text-stone-900">
                    {formatRupiah(stats.netVarianceRp)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPrint()}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4 text-stone-500" />
                  <span>Cetak Lembar Audit</span>
                </button>

                <button
                  type="button"
                  onClick={handlePostOpname}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Posting & Sesuaikan Stok Katalog</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ============================================================ */
          /* RIWAYAT DOKUMEN STOCK OPNAME (HISTORY)                       */
          /* ============================================================ */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-teal-600" />
                  <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
                    Daftar Arsip & Berita Acara Stock Opname
                  </h3>
                </div>
                <span className="text-xs text-stone-500">
                  Total {historyRecords.length} Dokumen Tersimpan
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">No. Dokumen</th>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Cabang Toko</th>
                      <th className="px-4 py-3">Petugas Auditor</th>
                      <th className="px-4 py-3 text-center">Item Dihitung</th>
                      <th className="px-4 py-3 text-center">Item Selisih</th>
                      <th className="px-4 py-3 text-right">Net Selisih (Rp)</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 font-medium">
                    {historyRecords.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-stone-400">
                          Belum ada riwayat stock opname yang diposting.
                        </td>
                      </tr>
                    ) : (
                      historyRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-stone-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-teal-800">
                            {rec.opnameNumber}
                          </td>
                          <td className="px-4 py-3 text-stone-600">{rec.date}</td>
                          <td className="px-4 py-3 font-bold text-stone-800">{rec.storeName}</td>
                          <td className="px-4 py-3 text-stone-600">{rec.auditorName}</td>
                          <td className="px-4 py-3 text-center font-mono">
                            {rec.totalItemsCounted}
                          </td>
                          <td className="px-4 py-3 text-center font-mono">
                            {rec.itemsDiscrepancyCount > 0 ? (
                              <span className="text-red-600 font-bold">
                                {rec.itemsDiscrepancyCount} barang
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-bold">0 (Cocok)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            <span
                              className={
                                rec.netDifferenceAmount < 0
                                  ? 'text-red-600'
                                  : rec.netDifferenceAmount > 0
                                  ? 'text-blue-600'
                                  : 'text-stone-700'
                              }
                            >
                              {formatRupiah(rec.netDifferenceAmount)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                              Disesuaikan
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewingRecord(rec)}
                                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                title="Lihat Rincian Item"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Detail</span>
                              </button>
                              <button
                                onClick={() => handleOpenPrint(rec)}
                                className="px-2.5 py-1 bg-stone-100 hover:bg-teal-50 text-stone-700 hover:text-teal-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                title="Cetak Berita Acara"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Cetak</span>
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
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL DETAIL RIWAYAT DOKUMEN                                 */}
      {/* ============================================================ */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden border border-stone-200">
            <div className="px-5 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Rincian Dokumen: {viewingRecord.opnameNumber}
                </h3>
                <p className="text-xs text-stone-500">
                  {viewingRecord.storeName} • Tanggal {viewingRecord.date} • Auditor: {viewingRecord.auditorName}
                </p>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
                <div>
                  <span className="text-stone-500 block">Total Item:</span>
                  <span className="font-mono font-bold text-stone-800">
                    {viewingRecord.totalItemsCounted} macam
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">Sesuai:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {viewingRecord.itemsMatchedCount} macam
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">Berselisih:</span>
                  <span className="font-mono font-bold text-red-600">
                    {viewingRecord.itemsDiscrepancyCount} macam
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">Net Selisih:</span>
                  <span className="font-mono font-bold text-stone-900">
                    {formatRupiah(viewingRecord.netDifferenceAmount)}
                  </span>
                </div>
              </div>

              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 text-stone-700 font-bold uppercase">
                    <tr>
                      <th className="px-3 py-2">Barcode</th>
                      <th className="px-3 py-2">Nama Barang</th>
                      <th className="px-3 py-2 text-right">Stok Sistem</th>
                      <th className="px-3 py-2 text-right">Stok Fisik</th>
                      <th className="px-3 py-2 text-center">Selisih</th>
                      <th className="px-3 py-2 text-right">Nilai Selisih</th>
                      <th className="px-3 py-2">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 font-medium">
                    {viewingRecord.items.map((item) => (
                      <tr key={item.id} className="hover:bg-stone-50">
                        <td className="px-3 py-2 font-mono text-stone-600">{item.barcode || '-'}</td>
                        <td className="px-3 py-2 font-bold text-stone-900">{item.productName}</td>
                        <td className="px-3 py-2 text-right font-mono">{item.systemStock}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-teal-800">
                          {item.physicalStock}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {item.differenceQty === 0 ? (
                            <span className="text-emerald-600 font-bold">0</span>
                          ) : item.differenceQty < 0 ? (
                            <span className="text-red-600 font-bold">{item.differenceQty}</span>
                          ) : (
                            <span className="text-blue-600 font-bold">+{item.differenceQty}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold">
                          {formatRupiah(item.differenceAmount)}
                        </td>
                        <td className="px-3 py-2 text-stone-500">{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  handleOpenPrint(viewingRecord);
                  setViewingRecord(null);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Dokumen</span>
              </button>
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL CETAK BERITA ACARA STOCK OPNAME                         */}
      {/* ============================================================ */}
      {isPrintModalOpen && printRecordData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-stone-300">
            <div className="px-5 py-3 bg-stone-100 border-b border-stone-200 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-teal-700" />
                <h3 className="font-bold text-stone-900 text-sm">
                  Pratinjau Berita Acara Stock Opname
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Sekarang</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 rounded-lg text-stone-500 hover:bg-stone-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Paper View */}
            <div className="p-6 overflow-y-auto font-sans text-stone-900 space-y-4">
              {/* Header */}
              <div className="text-center border-b-2 border-stone-800 pb-3">
                <h1 className="text-xl font-black uppercase tracking-wider text-stone-900">
                  BERITA ACARA AUDIT STOCK OPNAME
                </h1>
                <p className="text-xs text-stone-600 font-medium">
                  {printRecordData.storeName} • No: {printRecordData.opnameNumber} • Tanggal: {printRecordData.date}
                </p>
                <p className="text-[11px] text-stone-500">
                  Petugas Auditor: <span className="font-bold text-stone-800">{printRecordData.auditorName}</span>
                </p>
              </div>

              {/* Summary box */}
              <div className="grid grid-cols-4 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-300 text-xs">
                <div>
                  <span className="text-stone-500 block text-[11px]">Total Item:</span>
                  <span className="font-bold">{printRecordData.totalItemsCounted} Produk</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[11px]">Fisik Cocok:</span>
                  <span className="font-bold text-emerald-700">{printRecordData.itemsMatchedCount} Produk</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[11px]">Selisih:</span>
                  <span className="font-bold text-red-700">{printRecordData.itemsDiscrepancyCount} Produk</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[11px]">Net Selisih:</span>
                  <span className="font-mono font-black">{formatRupiah(printRecordData.netDifferenceAmount)}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border border-stone-300">
                <thead className="bg-stone-100 border-b border-stone-300 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2 border-r border-stone-300 w-8 text-center">No</th>
                    <th className="p-2 border-r border-stone-300 w-28">Barcode</th>
                    <th className="p-2 border-r border-stone-300">Nama Barang</th>
                    <th className="p-2 border-r border-stone-300 w-16 text-center">Satuan</th>
                    <th className="p-2 border-r border-stone-300 w-20 text-right">Buku</th>
                    <th className="p-2 border-r border-stone-300 w-20 text-right">Fisik</th>
                    <th className="p-2 border-r border-stone-300 w-20 text-center">Selisih</th>
                    <th className="p-2 text-right w-24">Selisih (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-300 font-medium text-xs">
                  {printRecordData.items.map((it, idx) => (
                    <tr key={it.id}>
                      <td className="p-2 border-r border-stone-300 text-center">{idx + 1}</td>
                      <td className="p-2 border-r border-stone-300 font-mono">{it.barcode}</td>
                      <td className="p-2 border-r border-stone-300 font-bold">{it.productName}</td>
                      <td className="p-2 border-r border-stone-300 text-center">{it.unit}</td>
                      <td className="p-2 border-r border-stone-300 text-right font-mono">{it.systemStock}</td>
                      <td className="p-2 border-r border-stone-300 text-right font-mono font-bold">{it.physicalStock}</td>
                      <td className="p-2 border-r border-stone-300 text-center font-mono font-bold">
                        {it.differenceQty === 0 ? '0' : it.differenceQty}
                      </td>
                      <td className="p-2 text-right font-mono font-bold">
                        {formatRupiah(it.differenceAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <p className="text-stone-500 mb-14">Petugas Auditor / Gudang,</p>
                  <p className="font-bold border-t border-stone-400 pt-1">
                    ( {printRecordData.auditorName} )
                  </p>
                </div>
                <div>
                  <p className="text-stone-500 mb-14">Supervisor Shift Toko,</p>
                  <p className="font-bold border-t border-stone-400 pt-1">( ................................ )</p>
                </div>
                <div>
                  <p className="text-stone-500 mb-14">Store Manager,</p>
                  <p className="font-bold border-t border-stone-400 pt-1">( ................................ )</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
