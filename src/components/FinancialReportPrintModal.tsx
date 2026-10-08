import React, { useState, useMemo, useEffect } from 'react';
import { 
  Order, 
  Product, 
  Store, 
  PurchaseOrder, 
  Supplier, 
  Category 
} from '../types';
import { formatRupiah } from '../utils/formatters';
import { printHtmlDirectly } from '../utils/printDocumentHelper';
import { 
  Printer, 
  X, 
  Download, 
  Calendar, 
  Store as StoreIcon, 
  Receipt, 
  Package, 
  ShoppingBag, 
  ArrowUpDown, 
  TrendingUp, 
  FileText, 
  Check, 
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

export type FinancialReportType = 
  | 'sales' 
  | 'profit_loss' 
  | 'inventory' 
  | 'trade_flow' 
  | 'purchases';

interface OperationalExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
}

interface FinancialReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReportType?: FinancialReportType;
  products: Product[];
  orders: Order[];
  stores: Store[];
  purchases?: PurchaseOrder[];
  suppliers?: Supplier[];
  categories?: Category[];
  operationalExpenses?: OperationalExpense[];
  activeDateRange: { start: Date; end: Date };
  currentStore?: Store;
}

export const FinancialReportPrintModal: React.FC<FinancialReportPrintModalProps> = ({
  isOpen,
  onClose,
  initialReportType = 'sales',
  products = [],
  orders = [],
  stores = [],
  purchases = [],
  suppliers = [],
  operationalExpenses = [],
  activeDateRange,
  currentStore,
}) => {
  const [reportType, setReportType] = useState<FinancialReportType>(initialReportType);
  const [paperOrientation, setPaperOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [showKpiCards, setShowKpiCards] = useState<boolean>(true);
  const [printedDate] = useState<string>(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  // Sync initial tab when opened
  useEffect(() => {
    if (initialReportType) {
      setReportType(initialReportType);
      if (initialReportType === 'inventory' || initialReportType === 'trade_flow') {
        setPaperOrientation('landscape');
      } else {
        setPaperOrientation('portrait');
      }
    }
  }, [initialReportType, isOpen]);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Manage body class for native print isolation
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('financial-report-open');
    } else {
      document.body.classList.remove('financial-report-open');
    }
    return () => {
      document.body.classList.remove('financial-report-open');
    };
  }, [isOpen]);

  // Active Store Information for KOP
  const activeStore = useMemo(() => {
    if (selectedStoreId !== 'all') {
      const found = stores.find(s => s.id === selectedStoreId);
      if (found) return found;
    }
    return currentStore || (stores.length > 0 ? stores[0] : null);
  }, [selectedStoreId, stores, currentStore]);

  // Helper HPP
  const getProductHpp = (prod?: Product): number => {
    if (!prod) return 0;
    if (prod.costPrice && prod.costPrice > 0) return prod.costPrice;
    return Math.round(prod.price * 0.75);
  };

  // 1. FILTERED ORDERS (PENJUALAN)
  const filteredOrders = useMemo(() => {
    const startTime = new Date(activeDateRange.start).getTime();
    const endTime = new Date(activeDateRange.end).getTime();

    return orders.filter(ord => {
      const d = new Date(ord.createdAt);
      const time = d.getTime();
      if (!isNaN(time) && (time < startTime || time > endTime)) return false;
      if (selectedStoreId !== 'all' && ord.store?.id !== selectedStoreId) return false;
      if (ord.status === 'cancelled') return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, activeDateRange, selectedStoreId]);

  // Sales Summary
  const salesSummary = useMemo(() => {
    let grossSubtotal = 0;
    let totalDiscount = 0;
    let totalDeliveryFee = 0;
    let netRevenue = 0;
    let totalItemsSold = 0;
    let totalHppCost = 0;

    filteredOrders.forEach(ord => {
      grossSubtotal += ord.subtotal || 0;
      totalDiscount += ord.discountAmount || 0;
      totalDeliveryFee += ord.deliveryFee || 0;
      netRevenue += ord.total || (ord.subtotal + (ord.deliveryFee || 0) - (ord.discountAmount || 0));

      (ord.items || []).forEach(item => {
        totalItemsSold += item.quantity;
        totalHppCost += getProductHpp(item.product) * item.quantity;
      });
    });

    const orderCount = filteredOrders.length;
    const grossProfit = Math.max(0, netRevenue - totalHppCost);
    const grossMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
    const avgBasket = orderCount > 0 ? Math.round(netRevenue / orderCount) : 0;

    return {
      grossSubtotal,
      totalDiscount,
      totalDeliveryFee,
      netRevenue,
      totalItemsSold,
      totalHppCost,
      orderCount,
      grossProfit,
      grossMarginPercent,
      avgBasket
    };
  }, [filteredOrders]);

  // 2. FILTERED PURCHASES (PEMBELIAN)
  const filteredPurchases = useMemo(() => {
    const startTime = new Date(activeDateRange.start).getTime();
    const endTime = new Date(activeDateRange.end).getTime();

    return purchases.filter(po => {
      const dateVal = po.receivedDate || po.orderDate || po.createdAt;
      const d = new Date(dateVal);
      const time = d.getTime();
      if (!isNaN(time) && (time < startTime || time > endTime)) return false;
      if (selectedStoreId !== 'all' && po.storeId !== selectedStoreId) return false;
      if (po.status === 'cancelled') return false;
      return true;
    }).sort((a, b) => {
      const da = new Date(a.receivedDate || a.orderDate || a.createdAt).getTime();
      const db = new Date(b.receivedDate || b.orderDate || b.createdAt).getTime();
      return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
    });
  }, [purchases, activeDateRange, selectedStoreId]);

  const purchasesSummary = useMemo(() => {
    let totalBeli = 0;
    let totalQty = 0;
    let paidAmount = 0;
    let tempoAmount = 0;

    filteredPurchases.forEach(po => {
      totalBeli += po.totalAmount || 0;
      totalQty += po.totalQuantity || 0;
      if (po.paymentStatus === 'paid') {
        paidAmount += po.totalAmount || 0;
      } else {
        tempoAmount += po.totalAmount || 0;
      }
    });

    return {
      totalBeli,
      totalQty,
      paidAmount,
      tempoAmount,
      docCount: filteredPurchases.length,
    };
  }, [filteredPurchases]);

  // 3. INVENTORY VALUATION (INFO BARANG & STOK)
  const inventoryStats = useMemo(() => {
    let totalStockUnits = 0;
    let totalCostAsset = 0;
    let totalSellingPotential = 0;

    products.forEach(p => {
      const hpp = getProductHpp(p);
      totalStockUnits += p.stock;
      totalCostAsset += p.stock * hpp;
      totalSellingPotential += p.stock * p.price;
    });

    const potentialGrossProfit = Math.max(0, totalSellingPotential - totalCostAsset);
    const avgMargin = totalSellingPotential > 0 ? (potentialGrossProfit / totalSellingPotential) * 100 : 0;

    return {
      totalSku: products.length,
      totalStockUnits,
      totalCostAsset,
      totalSellingPotential,
      potentialGrossProfit,
      avgMargin
    };
  }, [products]);

  // 4. PROFIT & LOSS (LABA RUGI KOMPREHENSIF)
  const totalBebanOperasional = useMemo(() => {
    return operationalExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }, [operationalExpenses]);

  const netOperatingProfit = useMemo(() => {
    return salesSummary.grossProfit - totalBebanOperasional;
  }, [salesSummary.grossProfit, totalBebanOperasional]);

  const netOperatingMargin = useMemo(() => {
    if (salesSummary.netRevenue <= 0) return 0;
    return (netOperatingProfit / salesSummary.netRevenue) * 100;
  }, [netOperatingProfit, salesSummary.netRevenue]);

  // 5. TRADE CASH FLOW (ARUS DAGANG & KAS)
  const netCashFlow = useMemo(() => {
    return salesSummary.netRevenue - purchasesSummary.totalBeli;
  }, [salesSummary.netRevenue, purchasesSummary.totalBeli]);

  // Format Date Range String
  const periodString = useMemo(() => {
    const s = activeDateRange.start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const e = activeDateRange.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${s} s/d ${e}`;
  }, [activeDateRange]);

  // Report Title Display
  const reportTitles: Record<FinancialReportType, { title: string; subtitle: string; badge: string }> = {
    sales: {
      title: 'LAPORAN REKAPITULASI PENJUALAN KASIR (POS)',
      subtitle: 'Rekapitulasi Omzet Penjualan, Potongan Diskon, dan Rincian Transaksi Konsumen',
      badge: 'MODUL PENJUALAN & OMZET',
    },
    profit_loss: {
      title: 'LAPORAN LABA RUGI KOMPREHENSIF (PROFIT & LOSS)',
      subtitle: 'Pernyataan Resmi Laba Kotor, HPP Modal Barang, Biaya Beban Operasional & Laba Bersih',
      badge: 'STANDAR AKUNTANSI KEUANGAN RETAIL',
    },
    inventory: {
      title: 'LAPORAN MASTER BARANG & VALUASI ASET STOK',
      subtitle: 'Inventarisasi Fisik Stok Barang, Harga Pokok Beli (HPP), dan Total Nilai Valuasi Modal Aset',
      badge: 'AUDIT INVENTORI & ASET MODAL',
    },
    trade_flow: {
      title: 'LAPORAN ARUS DAGANG & PERPUTARAN KAS (JUAL VS BELI)',
      subtitle: 'Komparasi Arus Kas Masuk Penjualan Konsumen vs Pengeluaran Pembelian Faktur Pemasok',
      badge: 'CASH FLOW & TRADING LIQUIDITY',
    },
    purchases: {
      title: 'LAPORAN PEMBELIAN BARANG & REKAP FAKTUR SUPPLIER',
      subtitle: 'Daftar Faktur Pembelian Barang Masuk, Status Pembayaran Lunas/Tempo, dan Vendor Suplier',
      badge: 'PENGADAAN & HUTANG TEMPO',
    },
  };

  // Handle Export Current Report as CSV
  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    const dateTag = `${activeDateRange.start.toISOString().split('T')[0]}_sd_${activeDateRange.end.toISOString().split('T')[0]}`;
    let filename = `Laporan_${reportType}_${dateTag}.csv`;

    if (reportType === 'sales') {
      filename = `Laporan_Penjualan_POS_${dateTag}.csv`;
      headers = ['No', 'Waktu', 'No Order', 'Pelanggan', 'Metode Bayar', 'Qty', 'Subtotal', 'Diskon', 'Total'];
      rows = filteredOrders.map((ord, idx) => {
        const totalQty = (ord.items || []).reduce((s, it) => s + it.quantity, 0);
        return [
          idx + 1,
          new Date(ord.createdAt).toLocaleString('id-ID'),
          ord.id,
          ord.customerName || 'Pelanggan Umum',
          ord.paymentMethod || 'TUNAI',
          totalQty,
          ord.subtotal || 0,
          ord.discountAmount || 0,
          ord.total || 0
        ];
      });
    } else if (reportType === 'profit_loss') {
      filename = `Laporan_Laba_Rugi_${dateTag}.csv`;
      headers = ['Deskripsi Akuntansi', 'Nominal (Rp)'];
      rows = [
        ['1. PENDAPATAN USAHA (REVENUE)', ''],
        ['Penjualan Kotor Barang (Gross Sales)', salesSummary.grossSubtotal],
        ['Potongan Diskon & Promo Voucher', -salesSummary.totalDiscount],
        ['Pendapatan Ongkir & Layanan', salesSummary.totalDeliveryFee],
        ['TOTAL PENDAPATAN BERSIH (NET REVENUE)', salesSummary.netRevenue],
        ['2. HARGA POKOK PENJUALAN (HPP / COGS)', ''],
        ['Total Modal Pokok Barang Terjual', -salesSummary.totalHppCost],
        ['3. LABA KOTOR USAHA (GROSS PROFIT)', salesSummary.grossProfit],
        ['Margin Kotor (%)', `${salesSummary.grossMarginPercent.toFixed(1)}%`],
        ['4. BEBAN BIAYA OPERASIONAL TOKO', ''],
        ...operationalExpenses.map(e => [`Beban: ${e.name} (${e.category})`, -e.amount]),
        ['TOTAL BEBAN OPERASIONAL', -totalBebanOperasional],
        ['5. HASIL LABA BERSIH USAHA (NET PROFIT)', netOperatingProfit],
        ['Margin Bersih (%)', `${netOperatingMargin.toFixed(1)}%`]
      ];
    } else if (reportType === 'inventory') {
      filename = `Laporan_Valuasi_Stok_${dateTag}.csv`;
      headers = ['No', 'Barcode', 'Nama Produk', 'Kategori', 'Satuan', 'Stok Fisik', 'HPP Modal', 'Harga Jual', 'Total Aset HPP'];
      rows = products.map((p, idx) => {
        const hpp = getProductHpp(p);
        return [
          idx + 1,
          p.barcode || '-',
          p.name,
          p.category || '-',
          p.unit || 'Pcs',
          p.stock,
          hpp,
          p.price,
          p.stock * hpp
        ];
      });
    } else if (reportType === 'trade_flow') {
      filename = `Laporan_Arus_Dagang_${dateTag}.csv`;
      headers = ['Kategori Arus Kas', 'Total (Rp)', 'Keterangan'];
      rows = [
        ['Penerimaan Penjualan Konsumen', salesSummary.netRevenue, `${salesSummary.orderCount} pesanan`],
        ['Pengeluaran Pembelian Pemasok', -purchasesSummary.totalBeli, `${purchasesSummary.docCount} faktur PO`],
        ['Pembelian Lunas Kas', -purchasesSummary.paidAmount, 'Kas terpotong'],
        ['Hutang Pembelian Tempo', -purchasesSummary.tempoAmount, 'Kewajiban berjalan'],
        ['Beban Biaya Operasional', -totalBebanOperasional, 'Biaya rutin'],
        ['Selisih Arus Kas Bersih', netCashFlow, netCashFlow >= 0 ? 'SURPLUS LIKUIDITAS' : 'DEFISIT KAS']
      ];
    } else if (reportType === 'purchases') {
      filename = `Laporan_Pembelian_Faktur_${dateTag}.csv`;
      headers = ['No', 'Tanggal', 'No Faktur PO', 'Pemasok', 'Status Bayar', 'Qty Fisik', 'Total Belanja'];
      rows = filteredPurchases.map((po, idx) => [
        idx + 1,
        po.orderDate,
        po.purchaseNumber,
        po.supplierName || 'Pemasok Umum',
        po.paymentStatus === 'paid' ? 'LUNAS' : 'TEMPO',
        po.totalQuantity,
        po.totalAmount
      ]);
    }

    const csvContent = '\uFEFF' + [
      headers.map(h => `"${h}"`).join(';'),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle Direct Isolated Print via hidden iframe
  const handleExecutePrint = () => {
    const printableElement = document.getElementById('printable-financial-report-content');
    if (!printableElement) return;

    printHtmlDirectly(printableElement.innerHTML, {
      title: `${reportTitles[reportType].title}_${periodString.replace(/\s+/g, '_')}`,
      landscape: paperOrientation === 'landscape',
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-stone-100 rounded-3xl max-w-6xl w-full max-h-[96vh] flex flex-col overflow-hidden shadow-2xl border border-stone-300 animate-in zoom-in-95 duration-150"
      >
        {/* ============================================================ */}
        {/* 1. TOP TOOLBAR: CONTROL PANEL (PILIHAN DOKUMEN & TOMBOL CETAK) */}
        {/* ============================================================ */}
        <header className="p-3 sm:p-4 bg-stone-900 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Pusat Cetak Dokumen Laporan & Keuangan
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[10px] font-mono font-bold">
                  Format Resmi A4 Terisolasi
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Dokumen dicetak 100% bersih ke printer / PDF tanpa background gelap panel admin atau tombol UI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Orientasi Kertas */}
            <div className="flex items-center bg-stone-800 rounded-xl p-1 border border-stone-700 text-xs">
              <button
                type="button"
                onClick={() => setPaperOrientation('portrait')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  paperOrientation === 'portrait' ? 'bg-blue-600 text-white shadow-2xs' : 'text-stone-300 hover:text-white'
                }`}
                title="Kertas A4 Tegak (Portrait)"
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => setPaperOrientation('landscape')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  paperOrientation === 'landscape' ? 'bg-blue-600 text-white shadow-2xs' : 'text-stone-300 hover:text-white'
                }`}
                title="Kertas A4 Mendatar (Landscape)"
              >
                Landscape
              </button>
            </div>

            {/* Tombol Ekspor CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 hover:text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all border border-stone-700"
              title="Unduh data tabel laporan saat ini dalam format CSV / Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Ekspor CSV</span>
            </button>

            {/* Tombol Utama Cetak */}
            <button
              type="button"
              onClick={handleExecutePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition-all border border-emerald-400/30"
              title="Cetak langsung ke Printer fisik atau simpan sebagai file PDF bersih"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Cetak ke Printer / PDF</span>
            </button>

            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              title="Tutup Pratinjau Cetak [Esc]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ============================================================ */}
        {/* 2. SUB-BAR: TABS PILIHAN LAPORAN & CHECKBOX PARAMETER         */}
        {/* ============================================================ */}
        <div className="bg-white border-b border-stone-200 px-3 sm:px-5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shrink-0">
          {/* Pilihan 5 Jenis Laporan */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'sales' as const, label: '1. Penjualan', icon: <Receipt className="w-3.5 h-3.5" /> },
              { id: 'profit_loss' as const, label: '2. Laba Rugi', icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { id: 'inventory' as const, label: '3. Info Barang & Stok', icon: <Package className="w-3.5 h-3.5" /> },
              { id: 'trade_flow' as const, label: '4. Arus Dagang & Kas', icon: <ArrowUpDown className="w-3.5 h-3.5" /> },
              { id: 'purchases' as const, label: '5. Pembelian Supplier', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
            ].map(tab => {
              const isActive = reportType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setReportType(tab.id);
                    if (tab.id === 'inventory' || tab.id === 'trade_flow') {
                      setPaperOrientation('landscape');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Opsi Tanda Tangan & Cabang */}
          <div className="flex items-center gap-3 text-xs shrink-0 flex-wrap">
            <label className="flex items-center gap-1.5 text-stone-700 font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={e => setShowSignatures(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Kolom Tanda Tangan</span>
            </label>

            <label className="flex items-center gap-1.5 text-stone-700 font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showKpiCards}
                onChange={e => setShowKpiCards(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Ringkasan Metrik</span>
            </label>

            {stores.length > 1 && (
              <select
                value={selectedStoreId}
                onChange={e => setSelectedStoreId(e.target.value)}
                className="px-2.5 py-1 bg-stone-100 border border-stone-300 rounded-lg text-xs font-semibold text-stone-800"
              >
                <option value="all">Semua Cabang Toko</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. PRATINJAU DOKUMEN CETAK A4 (REAL LIVE A4 SHEET PREVIEW)     */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex justify-center bg-stone-200/70">
          <div 
            id="printable-financial-report-content"
            className={`bg-white rounded-xl shadow-xl border border-stone-300 p-6 sm:p-10 transition-all ${
              paperOrientation === 'landscape' ? 'w-full max-w-[1100px]' : 'w-full max-w-[850px]'
            }`}
            style={{
              minHeight: '1000px',
              color: '#111827',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            {/* ---------------------------------------------------- */}
            {/* KOP SURAT RESMI BISNIS                               */}
            {/* ---------------------------------------------------- */}
            <div className="report-kop-header border-b-2 border-stone-900 pb-3.5 mb-4 flex items-start justify-between gap-4">
              <div>
                <h1 className="report-kop-title text-xl sm:text-2xl font-black tracking-tight text-emerald-800 uppercase">
                  {activeStore?.name || 'TOKO-ONLINE.ONLINE'}
                </h1>
                <p className="report-kop-meta text-xs text-stone-600 mt-0.5">
                  {activeStore?.address || 'Kawasan Wisata Bahari Pantai Pangandaran'}
                </p>
                <p className="report-kop-meta text-xs text-stone-500">
                  Telp / WhatsApp: <strong>{activeStore?.phone || '0812-3456-7890'}</strong> • Kota: <strong>{activeStore?.city || 'Pangandaran'}</strong>
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="report-badge inline-block px-2.5 py-1 rounded bg-stone-900 text-white text-[10px] font-black uppercase tracking-wider mb-1">
                  {reportTitles[reportType].badge}
                </span>
                <div className="text-xs text-stone-500">
                  Periode: <strong className="text-stone-900 font-mono">{periodString}</strong>
                </div>
                <div className="text-[11px] text-stone-400">
                  Tanggal Cetak: {printedDate}
                </div>
              </div>
            </div>

            {/* JUDUL DOKUMEN */}
            <div className="report-title-section text-center my-3.5">
              <h2 className="report-main-title text-base sm:text-lg font-black tracking-tight text-stone-900 uppercase">
                {reportTitles[reportType].title}
              </h2>
              <p className="report-subtitle text-xs text-stone-500 max-w-xl mx-auto">
                {reportTitles[reportType].subtitle}
              </p>
            </div>

            {/* ---------------------------------------------------- */}
            {/* 1. KONTEN: LAPORAN PENJUALAN KASIR (SALES)           */}
            {/* ---------------------------------------------------- */}
            {reportType === 'sales' && (
              <div className="space-y-4">
                {/* KPI Cards Ringkasan Penjualan */}
                {showKpiCards && (
                  <div className="report-kpi-grid grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 text-xs">
                    <div className="report-kpi-card p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="report-kpi-label text-[10px] font-bold text-stone-500 uppercase">Total Omzet Bersih</div>
                      <div className="report-kpi-value text-base font-black text-emerald-700 font-mono mt-0.5">
                        {formatRupiah(salesSummary.netRevenue)}
                      </div>
                      <div className="report-kpi-sub text-[10px] text-stone-400 mt-0.5">{salesSummary.orderCount} Transaksi Selesai</div>
                    </div>
                    <div className="report-kpi-card p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="report-kpi-label text-[10px] font-bold text-stone-500 uppercase">Total HPP Modal</div>
                      <div className="report-kpi-value text-base font-black text-stone-700 font-mono mt-0.5">
                        {formatRupiah(salesSummary.totalHppCost)}
                      </div>
                      <div className="report-kpi-sub text-[10px] text-stone-400 mt-0.5">Modal Barang Terjual</div>
                    </div>
                    <div className="report-kpi-card p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="report-kpi-label text-[10px] font-bold text-stone-500 uppercase">Estimasi Laba Kotor</div>
                      <div className="report-kpi-value text-base font-black text-blue-700 font-mono mt-0.5">
                        {formatRupiah(salesSummary.grossProfit)}
                      </div>
                      <div className="report-kpi-sub text-[10px] text-blue-600 font-bold mt-0.5">Margin: {salesSummary.grossMarginPercent.toFixed(1)}%</div>
                    </div>
                    <div className="report-kpi-card p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="report-kpi-label text-[10px] font-bold text-stone-500 uppercase">Fisik Terjual</div>
                      <div className="report-kpi-value text-base font-black text-amber-700 font-mono mt-0.5">
                        {salesSummary.totalItemsSold} Unit
                      </div>
                      <div className="report-kpi-sub text-[10px] text-stone-400 mt-0.5">Rata-rata: {formatRupiah(salesSummary.avgBasket)} / trx</div>
                    </div>
                  </div>
                )}

                {/* Tabel Rincian Transaksi */}
                <table 
                  className="report-table w-full border-collapse border border-stone-300 text-xs"
                  style={{ tableLayout: 'fixed', width: '100%' }}
                >
                  <thead>
                    <tr className="bg-stone-100 text-stone-800">
                      <th style={{ width: '4%' }} className="border border-stone-300 p-2 text-center font-bold">No</th>
                      <th style={{ width: '12%' }} className="border border-stone-300 p-2 text-center font-bold">Waktu</th>
                      <th style={{ width: '12%' }} className="border border-stone-300 p-2 text-center font-bold">No. Order</th>
                      <th style={{ width: '18%' }} className="border border-stone-300 p-2 text-left font-bold">Pelanggan / Kasir</th>
                      <th style={{ width: '10%' }} className="border border-stone-300 p-2 text-center font-bold">Metode</th>
                      <th style={{ width: '6%' }} className="border border-stone-300 p-2 text-center font-bold">Qty</th>
                      <th style={{ width: '12%' }} className="border border-stone-300 p-2 text-right font-bold">Subtotal</th>
                      <th style={{ width: '10%' }} className="border border-stone-300 p-2 text-right font-bold">Diskon</th>
                      <th style={{ width: '16%' }} className="border border-stone-300 p-2 text-right font-bold">Total (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="border border-stone-300 p-4 text-center text-stone-400 italic">
                          Tidak ada transaksi penjualan pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord, idx) => {
                        const totalQty = (ord.items || []).reduce((s, it) => s + it.quantity, 0);
                        const ordDate = new Date(ord.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                        });
                        return (
                          <tr key={ord.id} className={idx % 2 === 1 ? 'bg-stone-50/60' : 'bg-white'}>
                            <td className="border border-stone-300 p-1.5 text-center font-mono">{idx + 1}</td>
                            <td className="border border-stone-300 p-1.5 text-center text-[10px] font-mono">{ordDate}</td>
                            <td className="border border-stone-300 p-1.5 text-center font-mono font-bold text-blue-700 text-[10px]">{ord.id}</td>
                            <td className="border border-stone-300 p-1.5 font-medium truncate">{ord.customerName || 'Pelanggan Umum'}</td>
                            <td className="border border-stone-300 p-1.5 text-center uppercase font-semibold text-[10px]">{ord.paymentMethod || 'TUNAI'}</td>
                            <td className="border border-stone-300 p-1.5 text-center font-mono">{totalQty}</td>
                            <td className="border border-stone-300 p-1.5 text-right font-mono">{formatRupiah(ord.subtotal)}</td>
                            <td className="border border-stone-300 p-1.5 text-right font-mono text-rose-600">
                              {ord.discountAmount ? `-${formatRupiah(ord.discountAmount)}` : '-'}
                            </td>
                            <td className="border border-stone-300 p-1.5 text-right font-mono font-bold text-stone-900">{formatRupiah(ord.total)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-stone-100 font-bold border-t-2 border-stone-800 text-stone-900">
                      <td colSpan={5} className="border border-stone-300 p-2 text-right uppercase">
                        TOTAL AKUMULASI PENJUALAN:
                      </td>
                      <td className="border border-stone-300 p-2 text-center font-mono">{salesSummary.totalItemsSold}</td>
                      <td className="border border-stone-300 p-2 text-right font-mono">{formatRupiah(salesSummary.grossSubtotal)}</td>
                      <td className="border border-stone-300 p-2 text-right font-mono text-rose-600">
                        {salesSummary.totalDiscount ? `-${formatRupiah(salesSummary.totalDiscount)}` : '-'}
                      </td>
                      <td className="border border-stone-300 p-2 text-right font-mono text-emerald-800 text-xs font-black">
                        {formatRupiah(salesSummary.netRevenue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* 2. KONTEN: LAPORAN LABA RUGI KOMPREHENSIF (P&L)      */}
            {/* ---------------------------------------------------- */}
            {reportType === 'profit_loss' && (
              <div className="space-y-4 max-w-2xl mx-auto my-2 text-xs">
                <div className="border border-stone-300 rounded-xl overflow-hidden shadow-2xs">
                  <table 
                    className="pl-table w-full border-collapse"
                    style={{ tableLayout: 'fixed', width: '100%' }}
                  >
                    <thead>
                      <tr className="bg-stone-900 text-white">
                        <th style={{ width: '70%' }} className="p-2.5 text-left font-bold">DESKRIPSI AKUNTANSI KEUANGAN</th>
                        <th style={{ width: '30%' }} className="p-2.5 text-right font-bold">NOMINAL (RP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 1. PENDAPATAN */}
                      <tr className="pl-header bg-stone-100/90 font-bold text-stone-900">
                        <td className="p-2 border-t border-stone-300" colSpan={2}>
                          1. PENDAPATAN USAHA (REVENUE)
                        </td>
                      </tr>
                      <tr>
                        <td className="pl-indent-1 p-2 border-t border-stone-200">Penjualan Kotor Barang (Gross Sales)</td>
                        <td className="p-2 text-right font-mono border-t border-stone-200">{formatRupiah(salesSummary.grossSubtotal)}</td>
                      </tr>
                      <tr>
                        <td className="pl-indent-1 p-2 border-t border-stone-200 text-rose-700">Potongan Diskon & Promo Voucher</td>
                        <td className="p-2 text-right font-mono text-rose-700 border-t border-stone-200">
                          {salesSummary.totalDiscount ? `-${formatRupiah(salesSummary.totalDiscount)}` : 'Rp 0'}
                        </td>
                      </tr>
                      <tr>
                        <td className="pl-indent-1 p-2 border-t border-stone-200">Pendapatan Ongkos Kirim & Layanan</td>
                        <td className="p-2 text-right font-mono border-t border-stone-200">{formatRupiah(salesSummary.totalDeliveryFee)}</td>
                      </tr>
                      <tr className="pl-subtotal bg-emerald-50 font-bold text-emerald-900 border-t-2 border-stone-300">
                        <td className="p-2 pl-4">TOTAL PENDAPATAN BERSIH (NET REVENUE)</td>
                        <td className="p-2 text-right font-mono text-xs font-black">{formatRupiah(salesSummary.netRevenue)}</td>
                      </tr>

                      {/* 2. HPP */}
                      <tr className="pl-header bg-stone-100/90 font-bold text-stone-900 border-t-2 border-stone-300">
                        <td className="p-2" colSpan={2}>
                          2. HARGA POKOK PENJUALAN (HPP / COGS)
                        </td>
                      </tr>
                      <tr>
                        <td className="pl-indent-1 p-2 border-t border-stone-200 text-stone-700">Total Modal Pokok Barang Terjual (Cost of Goods)</td>
                        <td className="p-2 text-right font-mono text-stone-700 border-t border-stone-200">-{formatRupiah(salesSummary.totalHppCost)}</td>
                      </tr>

                      {/* 3. LABA KOTOR */}
                      <tr className="pl-gross-profit bg-blue-50 font-bold text-blue-900 border-t-2 border-blue-200">
                        <td className="p-2 pl-4">
                          3. LABA KOTOR USAHA (GROSS PROFIT)
                          <span className="text-[10px] text-blue-700 font-normal ml-2">
                            (Margin: {salesSummary.grossMarginPercent.toFixed(1)}%)
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono text-xs font-black">{formatRupiah(salesSummary.grossProfit)}</td>
                      </tr>

                      {/* 4. BEBAN OPERASIONAL */}
                      <tr className="pl-header bg-stone-100/90 font-bold text-stone-900 border-t-2 border-stone-300">
                        <td className="p-2" colSpan={2}>
                          4. BEBAN BIAYA OPERASIONAL TOKO (EXPENSES)
                        </td>
                      </tr>
                      {operationalExpenses.length === 0 ? (
                        <tr>
                          <td className="pl-indent-1 p-2 border-t border-stone-200 text-stone-400 italic">
                            • Belum ada catatan beban operasional pada periode ini
                          </td>
                          <td className="p-2 text-right font-mono text-stone-400 border-t border-stone-200">Rp 0</td>
                        </tr>
                      ) : (
                        operationalExpenses.map(exp => (
                          <tr key={exp.id}>
                            <td className="pl-indent-1 p-2 border-t border-stone-200 text-stone-600">
                              • {exp.name} <span className="text-[10px] text-stone-400">({exp.category})</span>
                            </td>
                            <td className="p-2 text-right font-mono text-rose-700 border-t border-stone-200">
                              -{formatRupiah(exp.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="bg-rose-50 font-bold text-rose-900 border-t border-stone-300">
                        <td className="p-2 pl-4">TOTAL BEBAN OPERASIONAL</td>
                        <td className="p-2 text-right font-mono">-{formatRupiah(totalBebanOperasional)}</td>
                      </tr>

                      {/* 5. LABA BERSIH */}
                      <tr className={`${netOperatingProfit >= 0 ? 'pl-netprofit bg-emerald-100 text-emerald-950 border-emerald-500' : 'pl-netloss bg-rose-100 text-rose-950 border-rose-500'} font-black text-sm`}>
                        <td className="p-3 pl-4">
                          5. HASIL LABA BERSIH USAHA (NET PROFIT / LOSS)
                          <div className="text-[10px] font-semibold mt-0.5">
                            Status: {netOperatingProfit >= 0 ? 'SURPLUS KEUNTUNGAN BERSIH' : 'DEFISIT KERUGIAN USAHA'} (Margin Bersih: {netOperatingMargin.toFixed(1)}%)
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono text-base font-black">
                          {formatRupiah(netOperatingProfit)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* 3. KONTEN: LAPORAN MASTER BARANG & NILAI ASET STOK    */}
            {/* ---------------------------------------------------- */}
            {reportType === 'inventory' && (
              <div className="space-y-4">
                {showKpiCards && (
                  <div className="report-kpi-grid grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 text-xs">
                    <div className="report-kpi-card p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="report-kpi-label text-[10px] font-bold text-stone-500 uppercase">Total SKU Barang</div>
                      <div className="report-kpi-value text-base font-black text-blue-700 font-mono mt-0.5">{inventoryStats.totalSku} Produk</div>
                      <div className="report-kpi-sub text-[10px] text-stone-400 mt-0.5">Katalog Terdaftar</div>
                    </div>
                    <div className="report-kpi-card p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="report-kpi-label text-[10px] font-bold text-stone-500 uppercase">Total Fisik Unit</div>
                      <div className="report-kpi-value text-base font-black text-stone-700 font-mono mt-0.5">{inventoryStats.totalStockUnits} Pcs</div>
                      <div className="report-kpi-sub text-[10px] text-stone-400 mt-0.5">Stok Rak & Gudang</div>
                    </div>
                    <div className="report-kpi-card p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="report-kpi-label text-[10px] font-bold text-stone-500 uppercase">Valuasi Modal (HPP)</div>
                      <div className="report-kpi-value text-base font-black text-emerald-700 font-mono mt-0.5">
                        {formatRupiah(inventoryStats.totalCostAsset)}
                      </div>
                      <div className="report-kpi-sub text-[10px] text-emerald-600 font-bold mt-0.5">Aset Bersih Tertanam</div>
                    </div>
                    <div className="report-kpi-card p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="report-kpi-label text-[10px] font-bold text-stone-500 uppercase">Estimasi Nilai Jual</div>
                      <div className="report-kpi-value text-base font-black text-purple-700 font-mono mt-0.5">
                        {formatRupiah(inventoryStats.totalSellingPotential)}
                      </div>
                      <div className="report-kpi-sub text-[10px] text-stone-500 mt-0.5">Potensi Margin: {inventoryStats.avgMargin.toFixed(1)}%</div>
                    </div>
                  </div>
                )}

                <table 
                  className="report-table w-full border-collapse border border-stone-300 text-xs"
                  style={{ tableLayout: 'fixed', width: '100%' }}
                >
                  <thead>
                    <tr className="bg-stone-100 text-stone-800">
                      <th style={{ width: '4%' }} className="border border-stone-300 p-2 text-center font-bold">No</th>
                      <th style={{ width: '13%' }} className="border border-stone-300 p-2 text-center font-bold">Barcode</th>
                      <th style={{ width: '23%' }} className="border border-stone-300 p-2 text-left font-bold">Nama Produk</th>
                      <th style={{ width: '12%' }} className="border border-stone-300 p-2 text-left font-bold">Kategori</th>
                      <th style={{ width: '6%' }} className="border border-stone-300 p-2 text-center font-bold">Satuan</th>
                      <th style={{ width: '6%' }} className="border border-stone-300 p-2 text-center font-bold">Stok</th>
                      <th style={{ width: '11%' }} className="border border-stone-300 p-2 text-right font-bold">HPP (Modal)</th>
                      <th style={{ width: '11%' }} className="border border-stone-300 p-2 text-right font-bold">Harga Jual</th>
                      <th style={{ width: '14%' }} className="border border-stone-300 p-2 text-right font-bold">Total Aset (HPP)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="border border-stone-300 p-4 text-center text-stone-400 italic">
                          Belum ada master produk terdaftar.
                        </td>
                      </tr>
                    ) : (
                      products.map((p, idx) => {
                        const hpp = getProductHpp(p);
                        const asset = p.stock * hpp;
                        return (
                          <tr key={p.id} className={idx % 2 === 1 ? 'bg-stone-50/60' : 'bg-white'}>
                            <td className="border border-stone-300 p-1.5 text-center font-mono">{idx + 1}</td>
                            <td className="border border-stone-300 p-1.5 text-center font-mono text-[10px]">{p.barcode || '-'}</td>
                            <td className="border border-stone-300 p-1.5 font-bold text-stone-900 truncate">{p.name}</td>
                            <td className="border border-stone-300 p-1.5 text-stone-600 capitalize truncate">{p.category || '-'}</td>
                            <td className="border border-stone-300 p-1.5 text-center">{p.unit || 'Pcs'}</td>
                            <td className="border border-stone-300 p-1.5 text-center font-mono font-bold">{p.stock}</td>
                            <td className="border border-stone-300 p-1.5 text-right font-mono">{formatRupiah(hpp)}</td>
                            <td className="border border-stone-300 p-1.5 text-right font-mono text-blue-700 font-bold">{formatRupiah(p.price)}</td>
                            <td className="border border-stone-300 p-1.5 text-right font-mono font-bold text-emerald-800">{formatRupiah(asset)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-stone-100 font-bold border-t-2 border-stone-800 text-stone-900">
                      <td colSpan={5} className="border border-stone-300 p-2 text-right uppercase">
                        TOTAL AKUMULASI ASET INVENTORI:
                      </td>
                      <td className="border border-stone-300 p-2 text-center font-mono font-bold">{inventoryStats.totalStockUnits}</td>
                      <td colSpan={2} className="border border-stone-300 p-2 text-center">-</td>
                      <td className="border border-stone-300 p-2 text-right font-mono text-emerald-900 text-xs font-black">
                        {formatRupiah(inventoryStats.totalCostAsset)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* 4. KONTEN: LAPORAN ARUS DAGANG & KAS (TRADE FLOW)    */}
            {/* ---------------------------------------------------- */}
            {reportType === 'trade_flow' && (
              <div className="space-y-4">
                {showKpiCards && (
                  <div className="report-kpi-grid-3 grid grid-cols-3 gap-3 my-3 text-xs">
                    <div className="report-kpi-card p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="report-kpi-label text-[10px] font-bold text-emerald-800 uppercase">Total Kas Masuk (Penjualan)</div>
                      <div className="report-kpi-value text-base font-black text-emerald-700 font-mono mt-1">
                        +{formatRupiah(salesSummary.netRevenue)}
                      </div>
                      <div className="report-kpi-sub text-[10px] text-emerald-600 mt-0.5">{salesSummary.orderCount} Transaksi Pelanggan</div>
                    </div>
                    <div className="report-kpi-card p-3.5 bg-rose-50 rounded-xl border border-rose-200">
                      <div className="report-kpi-label text-[10px] font-bold text-rose-800 uppercase">Total Kas Keluar (Pembelian PO)</div>
                      <div className="report-kpi-value text-base font-black text-rose-700 font-mono mt-1">
                        -{formatRupiah(purchasesSummary.totalBeli)}
                      </div>
                      <div className="report-kpi-sub text-[10px] text-rose-600 mt-0.5">{purchasesSummary.docCount} Faktur Pembelian Supplier</div>
                    </div>
                    <div className={`report-kpi-card p-3.5 rounded-xl border ${netCashFlow >= 0 ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                      <div className="report-kpi-label text-[10px] font-bold uppercase">Selisih Arus Kas Bersih (Net Flow)</div>
                      <div className="report-kpi-value text-base font-black font-mono mt-1">
                        {netCashFlow >= 0 ? `+${formatRupiah(netCashFlow)}` : formatRupiah(netCashFlow)}
                      </div>
                      <div className="report-kpi-sub text-[10px] font-bold mt-0.5">
                        Status: {netCashFlow >= 0 ? 'SURPLUS LIKUIDITAS KAS' : 'DEFISIT PENGELUARAN'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="report-cashflow-grid grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Sisi Kiri: Rekap Arus Masuk */}
                  <div className="border border-stone-300 rounded-xl p-3 bg-stone-50/50">
                    <h4 className="font-black text-stone-900 text-xs uppercase mb-2 text-emerald-800">
                      • REKAP KAS MASUK (PENJUALAN KASIR)
                    </h4>
                    <table className="w-full border-collapse border border-stone-200 bg-white">
                      <tbody>
                        <tr>
                          <td className="p-2 border border-stone-200">Total Penjualan Konsumen</td>
                          <td className="p-2 text-right font-mono font-bold">{formatRupiah(salesSummary.grossSubtotal)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-stone-200 text-rose-700">Potongan Diskon Penjualan</td>
                          <td className="p-2 text-right font-mono text-rose-700">-{formatRupiah(salesSummary.totalDiscount)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-stone-200">Ongkir & Biaya Tambahan</td>
                          <td className="p-2 text-right font-mono font-bold">+{formatRupiah(salesSummary.totalDeliveryFee)}</td>
                        </tr>
                        <tr className="bg-emerald-100 font-black">
                          <td className="p-2 border border-stone-300">TOTAL PENERIMAAN KAS</td>
                          <td className="p-2 text-right font-mono text-emerald-900">{formatRupiah(salesSummary.netRevenue)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Sisi Kanan: Rekap Arus Keluar */}
                  <div className="border border-stone-300 rounded-xl p-3 bg-stone-50/50">
                    <h4 className="font-black text-stone-900 text-xs uppercase mb-2 text-rose-800">
                      • REKAP KAS KELUAR (PEMBELIAN FAKTUR)
                    </h4>
                    <table className="w-full border-collapse border border-stone-200 bg-white">
                      <tbody>
                        <tr>
                          <td className="p-2 border border-stone-200">Pembelian Lunas Langsung (Tunai/TF)</td>
                          <td className="p-2 text-right font-mono font-bold">{formatRupiah(purchasesSummary.paidAmount)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-stone-200 text-amber-700">Pembelian Tempo / Hutang Dagang</td>
                          <td className="p-2 text-right font-mono text-amber-700">{formatRupiah(purchasesSummary.tempoAmount)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-stone-200 text-stone-500">Estimasi Beban Operasional</td>
                          <td className="p-2 text-right font-mono">{formatRupiah(totalBebanOperasional)}</td>
                        </tr>
                        <tr className="bg-rose-100 font-black">
                          <td className="p-2 border border-stone-300">TOTAL BELANJA PEMASOK</td>
                          <td className="p-2 text-right font-mono text-rose-900">{formatRupiah(purchasesSummary.totalBeli)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* 5. KONTEN: LAPORAN PEMBELIAN BARANG & SUPPLIER       */}
            {/* ---------------------------------------------------- */}
            {reportType === 'purchases' && (
              <div className="space-y-4">
                {showKpiCards && (
                  <div className="report-kpi-grid grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 text-xs">
                    <div className="report-kpi-card p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="report-kpi-label text-[10px] font-bold text-stone-500 uppercase">Total Pembelian</div>
                      <div className="report-kpi-value text-base font-black text-rose-700 font-mono mt-0.5">
                        {formatRupiah(purchasesSummary.totalBeli)}
                      </div>
                      <div className="report-kpi-sub text-[10px] text-stone-400 mt-0.5">{purchasesSummary.docCount} Faktur Masuk</div>
                    </div>
                    <div className="report-kpi-card p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="report-kpi-label text-[10px] font-bold text-stone-500 uppercase">Pembelian Lunas</div>
                      <div className="report-kpi-value text-base font-black text-emerald-700 font-mono mt-0.5">
                        {formatRupiah(purchasesSummary.paidAmount)}
                      </div>
                      <div className="report-kpi-sub text-[10px] text-emerald-600 font-bold mt-0.5">Kas Sudah Terpotong</div>
                    </div>
                    <div className="report-kpi-card p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="report-kpi-label text-[10px] font-bold text-stone-500 uppercase">Hutang Tempo</div>
                      <div className="report-kpi-value text-base font-black text-amber-700 font-mono mt-0.5">
                        {formatRupiah(purchasesSummary.tempoAmount)}
                      </div>
                      <div className="report-kpi-sub text-[10px] text-amber-600 font-bold mt-0.5">Jatuh Tempo Supplier</div>
                    </div>
                    <div className="report-kpi-card p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="report-kpi-label text-[10px] font-bold text-stone-500 uppercase">Total Fisik Unit</div>
                      <div className="report-kpi-value text-base font-black text-stone-700 font-mono mt-0.5">
                        {purchasesSummary.totalQty} Pcs
                      </div>
                      <div className="report-kpi-sub text-[10px] text-stone-400 mt-0.5">Stok Masuk Gudang</div>
                    </div>
                  </div>
                )}

                <table 
                  className="report-table w-full border-collapse border border-stone-300 text-xs"
                  style={{ tableLayout: 'fixed', width: '100%' }}
                >
                  <thead>
                    <tr className="bg-stone-100 text-stone-800">
                      <th style={{ width: '4%' }} className="border border-stone-300 p-2 text-center font-bold">No</th>
                      <th style={{ width: '12%' }} className="border border-stone-300 p-2 text-center font-bold">Tanggal</th>
                      <th style={{ width: '14%' }} className="border border-stone-300 p-2 text-center font-bold">No. Faktur PO</th>
                      <th style={{ width: '24%' }} className="border border-stone-300 p-2 text-left font-bold">Pemasok / Supplier</th>
                      <th style={{ width: '12%' }} className="border border-stone-300 p-2 text-center font-bold">Status</th>
                      <th style={{ width: '8%' }} className="border border-stone-300 p-2 text-center font-bold">Qty</th>
                      <th style={{ width: '26%' }} className="border border-stone-300 p-2 text-right font-bold">Total Nilai Beli</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="border border-stone-300 p-4 text-center text-stone-400 italic">
                          Tidak ada data faktur pembelian pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      filteredPurchases.map((po, idx) => (
                        <tr key={po.id} className={idx % 2 === 1 ? 'bg-stone-50/60' : 'bg-white'}>
                          <td className="border border-stone-300 p-1.5 text-center font-mono">{idx + 1}</td>
                          <td className="border border-stone-300 p-1.5 text-center text-[10px] font-mono">{po.orderDate}</td>
                          <td className="border border-stone-300 p-1.5 text-center font-mono font-bold text-blue-700 text-[10px]">{po.purchaseNumber}</td>
                          <td className="border border-stone-300 p-1.5 font-bold text-stone-900 truncate">{po.supplierName || 'Pemasok Umum'}</td>
                          <td className="border border-stone-300 p-1.5 text-center uppercase font-bold text-[10px]">
                            <span className={po.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}>
                              {po.paymentStatus === 'paid' ? 'LUNAS' : 'TEMPO'}
                            </span>
                          </td>
                          <td className="border border-stone-300 p-1.5 text-center font-mono font-bold">{po.totalQuantity}</td>
                          <td className="border border-stone-300 p-1.5 text-right font-mono font-bold text-stone-900">{formatRupiah(po.totalAmount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-stone-100 font-bold border-t-2 border-stone-800 text-stone-900">
                      <td colSpan={5} className="border border-stone-300 p-2 text-right uppercase">
                        TOTAL AKUMULASI PEMBELIAN:
                      </td>
                      <td className="border border-stone-300 p-2 text-center font-mono font-bold">{purchasesSummary.totalQty}</td>
                      <td className="border border-stone-300 p-2 text-right font-mono text-rose-800 text-xs font-black">
                        {formatRupiah(purchasesSummary.totalBeli)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* KOLOM TANDA TANGAN RESMI (HORIZONTAL 3 PIHAK)         */}
            {/* ---------------------------------------------------- */}
            {showSignatures && (
              <div 
                className="report-signatures mt-8 pt-4 border-t border-stone-300 text-xs"
                style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
              >
                <div className="sig-box">
                  <div className="sig-role">Dibuat Oleh:</div>
                  <div className="sig-title">Kasir / Staf Keuangan</div>
                  <div className="sig-line" />
                  <div className="sig-name">( ........................................ )</div>
                </div>

                <div className="sig-box">
                  <div className="sig-role">Diperiksa Oleh:</div>
                  <div className="sig-title">Supervisor Operasional</div>
                  <div className="sig-line" />
                  <div className="sig-name">( ........................................ )</div>
                </div>

                <div className="sig-box">
                  <div className="sig-role">Disetujui Oleh:</div>
                  <div className="sig-title">Store Manager / Pemilik</div>
                  <div className="sig-line" />
                  <div className="sig-name">( ........................................ )</div>
                </div>

                <div className="sig-note">
                  Dokumen ini sah dicetak otomatis melalui Modul Laporan & Akuntansi Retail toko-online.online.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
