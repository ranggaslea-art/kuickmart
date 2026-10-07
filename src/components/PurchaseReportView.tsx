import React, { useState, useMemo } from 'react';
import { PurchaseOrder, Supplier, Store, Product } from '../types';
import { formatRupiah, formatDateTime } from '../utils/formatters';
import { exportPurchaseOrdersToExcel, exportPurchaseItemsDetailToExcel } from '../utils/purchaseExport';
import { PurchaseReportModal } from './PurchaseReportModal';
import { ErrorBoundary } from './ErrorBoundary';
import {
  ShoppingBag,
  Truck,
  Calendar,
  Filter,
  Search,
  Download,
  Printer,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  X,
  CreditCard,
  Building2,
  Package,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

interface PurchaseReportViewProps {
  purchases: PurchaseOrder[];
  suppliers: Supplier[];
  stores: Store[];
  products: Product[];
  activeDateRange: { start: Date; end: Date };
  datePreset: string;
  setDatePreset: (preset: any) => void;
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
}

export const PurchaseReportView: React.FC<PurchaseReportViewProps> = ({
  purchases,
  suppliers,
  stores,
  products,
  activeDateRange,
  datePreset,
  setDatePreset,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
}) => {
  const [purchaseViewMode, setPurchaseViewMode] = useState<'invoices' | 'suppliers' | 'items' | 'payables' | 'daily'>('invoices');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [payStatusFilter, setPayStatusFilter] = useState<string>('all');
  const [recvStatusFilter, setRecvStatusFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPoDetail, setSelectedPoDetail] = useState<PurchaseOrder | null>(null);
  const [isPrintReportModalOpen, setIsPrintReportModalOpen] = useState<boolean>(false);

  // Filtered Purchases by Date & Dimensions
  const filteredPurchases = useMemo(() => {
    return purchases.filter(po => {
      const dateVal = po.receivedDate || po.orderDate || po.createdAt;
      const poDate = new Date(dateVal);
      if (poDate < activeDateRange.start || poDate > activeDateRange.end) {
        return false;
      }
      if (supplierFilter !== 'all' && po.supplierId !== supplierFilter) return false;
      if (payStatusFilter !== 'all' && po.paymentStatus !== payStatusFilter) return false;
      if (recvStatusFilter !== 'all' && po.status !== recvStatusFilter) return false;
      if (storeFilter !== 'all' && po.storeId !== storeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPo = po.purchaseNumber?.toLowerCase().includes(q);
        const matchInv = po.invoiceNumber?.toLowerCase().includes(q);
        const matchSup = po.supplierName?.toLowerCase().includes(q);
        const matchItem = (po.items || []).some(it => it.productName?.toLowerCase().includes(q));
        if (!matchPo && !matchInv && !matchSup && !matchItem) return false;
      }
      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.receivedDate || a.orderDate || a.createdAt).getTime();
      const dateB = new Date(b.receivedDate || b.orderDate || b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [purchases, activeDateRange, supplierFilter, payStatusFilter, recvStatusFilter, storeFilter, searchQuery]);

  // Executive KPI Summary
  const summary = useMemo(() => {
    let totalAmount = 0;
    let totalItemsQty = 0;
    let totalPaid = 0;
    let totalPayable = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let dueSoonCount = 0;

    const now = new Date();

    filteredPurchases.forEach(po => {
      totalAmount += po.totalAmount || 0;
      totalItemsQty += po.totalQuantity || (po.items || []).reduce((s, it) => s + it.quantity, 0);

      if (po.paymentStatus === 'paid') {
        totalPaid += po.totalAmount || 0;
      } else {
        totalPayable += po.totalAmount || 0;

        if (po.dueDate) {
          const due = new Date(po.dueDate);
          const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            overdueCount++;
            overdueAmount += po.totalAmount || 0;
          } else if (diffDays <= 7) {
            dueSoonCount++;
          }
        }
      }
    });

    const poCount = filteredPurchases.length;
    const avgPoValue = poCount > 0 ? Math.round(totalAmount / poCount) : 0;

    return {
      poCount,
      totalAmount,
      totalItemsQty,
      totalPaid,
      totalPayable,
      avgPoValue,
      overdueCount,
      overdueAmount,
      dueSoonCount,
    };
  }, [filteredPurchases]);

  // Breakdown by Supplier
  const supplierStats = useMemo(() => {
    const map = new Map<string, {
      supplierId: string;
      supplierName: string;
      poCount: number;
      totalAmount: number;
      totalPaid: number;
      totalPayable: number;
      itemsQty: number;
      bankInfo?: string;
    }>();

    filteredPurchases.forEach(po => {
      const sId = po.supplierId || 'unknown';
      const sName = po.supplierName || 'Pemasok Umum';

      const foundSup = suppliers.find(s => s.id === sId);
      const bankStr = foundSup?.bankAccount 
        ? `${foundSup.bankAccount.bankName} ${foundSup.bankAccount.accountNumber}` 
        : '-';

      if (!map.has(sId)) {
        map.set(sId, {
          supplierId: sId,
          supplierName: sName,
          poCount: 1,
          totalAmount: po.totalAmount || 0,
          totalPaid: po.paymentStatus === 'paid' ? (po.totalAmount || 0) : 0,
          totalPayable: po.paymentStatus !== 'paid' ? (po.totalAmount || 0) : 0,
          itemsQty: po.totalQuantity || (po.items || []).reduce((s, it) => s + it.quantity, 0),
          bankInfo: bankStr,
        });
      } else {
        const curr = map.get(sId)!;
        curr.poCount++;
        curr.totalAmount += po.totalAmount || 0;
        if (po.paymentStatus === 'paid') {
          curr.totalPaid += po.totalAmount || 0;
        } else {
          curr.totalPayable += po.totalAmount || 0;
        }
        curr.itemsQty += po.totalQuantity || (po.items || []).reduce((s, it) => s + it.quantity, 0);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredPurchases, suppliers]);

  // Breakdown by Items Purchased
  const purchasedItemsStats = useMemo(() => {
    const map = new Map<string, {
      productId: string;
      productName: string;
      barcode?: string;
      unit: string;
      totalQty: number;
      totalAmount: number;
      avgCostPrice: number;
      lastSupplier: string;
      poCount: number;
    }>();

    filteredPurchases.forEach(po => {
      (po.items || []).forEach(it => {
        const pId = it.productId || it.productName;
        const sub = it.subtotal || (it.quantity * it.costPrice);

        if (!map.has(pId)) {
          map.set(pId, {
            productId: pId,
            productName: it.productName,
            barcode: it.barcode,
            unit: it.unit || 'Pcs',
            totalQty: it.quantity,
            totalAmount: sub,
            avgCostPrice: it.costPrice,
            lastSupplier: po.supplierName,
            poCount: 1,
          });
        } else {
          const curr = map.get(pId)!;
          curr.totalQty += it.quantity;
          curr.totalAmount += sub;
          curr.poCount++;
          curr.avgCostPrice = Math.round(curr.totalAmount / curr.totalQty);
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredPurchases]);

  // Accounts Payable (Buku Hutang Tempo)
  const payablesList = useMemo(() => {
    const now = new Date();
    return filteredPurchases
      .filter(po => po.paymentStatus !== 'paid' || po.paymentMethod === 'tempo')
      .map(po => {
        let diffDays = 0;
        let isOverdue = false;
        let isDueSoon = false;

        if (po.dueDate) {
          const due = new Date(po.dueDate);
          diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) isOverdue = true;
          else if (diffDays <= 7) isDueSoon = true;
        }

        const foundSup = suppliers.find(s => s.id === po.supplierId);

        return {
          po,
          diffDays,
          isOverdue,
          isDueSoon,
          bankAccount: foundSup?.bankAccount,
        };
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [filteredPurchases, suppliers]);

  // Daily Trend Breakdown
  const dailyPurchases = useMemo(() => {
    const map = new Map<string, { dateStr: string; date: Date; count: number; totalAmount: number; totalQty: number }>();

    filteredPurchases.forEach(po => {
      const d = new Date(po.receivedDate || po.orderDate || po.createdAt);
      const dateKey = d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

      if (!map.has(dateKey)) {
        map.set(dateKey, {
          dateStr: dateKey,
          date: d,
          count: 1,
          totalAmount: po.totalAmount || 0,
          totalQty: po.totalQuantity || (po.items || []).reduce((s, it) => s + it.quantity, 0),
        });
      } else {
        const curr = map.get(dateKey)!;
        curr.count++;
        curr.totalAmount += po.totalAmount || 0;
        curr.totalQty += po.totalQuantity || (po.items || []).reduce((s, it) => s + it.quantity, 0);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredPurchases]);

  // CSV Export Handlers
  const exportCsv = (filename: string, rows: (string | number)[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportInvoicesCsv = () => {
    const headers = ['No Faktur Beli (PO)', 'No Faktur Supplier', 'Tanggal Pesan', 'Tanggal Terima', 'Supplier', 'Toko/Gudang', 'Status Stok', 'Status Bayar', 'Metode Bayar', 'Jatuh Tempo', 'Total Qty', 'Subtotal (Rp)', 'Diskon (Rp)', 'Total Beli (Rp)'];
    const rows = filteredPurchases.map(po => [
      po.purchaseNumber,
      po.invoiceNumber || '-',
      po.orderDate,
      po.receivedDate || '-',
      po.supplierName,
      po.storeName,
      po.status === 'received' ? 'Diterima' : po.status,
      po.paymentStatus === 'paid' ? 'Lunas' : po.paymentMethod === 'tempo' ? 'Tempo / Hutang' : 'Belum Lunas',
      po.paymentMethod,
      po.dueDate || '-',
      po.totalQuantity,
      po.subtotal,
      po.discountAmount || 0,
      po.totalAmount,
    ]);
    exportCsv(`Laporan_Faktur_Pembelian_${new Date().toISOString().split('T')[0]}.csv`, [headers, ...rows]);
  };

  const handleExportSuppliersCsv = () => {
    const headers = ['Kode Supplier', 'Nama Supplier', 'Frekuensi Kulakan', 'Total Item Masuk', 'Total Belanja Modal (Rp)', 'Total Terbayar (Rp)', 'Sisa Hutang Tempo (Rp)', 'Pangsa Belanja (%)', 'Rekening Bank'];
    const rows = supplierStats.map(s => {
      const share = summary.totalAmount > 0 ? ((s.totalAmount / summary.totalAmount) * 100).toFixed(1) + '%' : '0%';
      return [
        s.supplierId,
        s.supplierName,
        s.poCount,
        s.itemsQty,
        s.totalAmount,
        s.totalPaid,
        s.totalPayable,
        share,
        s.bankInfo || '-',
      ];
    });
    exportCsv(`Laporan_Belanja_Supplier_${new Date().toISOString().split('T')[0]}.csv`, [headers, ...rows]);
  };

  const handleExportItemsCsv = () => {
    const headers = ['Barcode', 'Nama Produk', 'Satuan Beli', 'Total Qty Masuk', 'Rata-rata Harga Beli (Rp)', 'Total Belanja (Rp)', 'Supplier Terkait', 'Jumlah Faktur'];
    const rows = purchasedItemsStats.map(it => [
      it.barcode || '-',
      it.productName,
      it.unit,
      it.totalQty,
      it.avgCostPrice,
      it.totalAmount,
      it.lastSupplier,
      it.poCount,
    ]);
    exportCsv(`Laporan_Barang_Kulakan_Masuk_${new Date().toISOString().split('T')[0]}.csv`, [headers, ...rows]);
  };

  const handleExportPayablesCsv = () => {
    const headers = ['No Faktur Beli', 'No Faktur Supplier', 'Supplier', 'Tanggal Jatuh Tempo', 'Sisa Hari', 'Status Tempo', 'Nominal Hutang (Rp)', 'Rekening Pembayaran'];
    const rows = payablesList.map(item => {
      const statusStr = item.isOverdue ? `Terlambat ${Math.abs(item.diffDays)} hari (OVERDUE)` : `${item.diffDays} hari lagi`;
      const bankStr = item.bankAccount ? `${item.bankAccount.bankName} ${item.bankAccount.accountNumber} a/n ${item.bankAccount.accountHolder}` : '-';
      return [
        item.po.purchaseNumber,
        item.po.invoiceNumber || '-',
        item.po.supplierName,
        item.po.dueDate || '-',
        item.diffDays,
        statusStr,
        item.po.totalAmount,
        bankStr,
      ];
    });
    exportCsv(`Buku_Hutang_Dagang_Tempo_${new Date().toISOString().split('T')[0]}.csv`, [headers, ...rows]);
  };

  return (
    <div className="space-y-6">
      {/* FILTER & DATE PRESET TOOLBAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>Periode Pembelian & Kulakan:</span>
            </div>
            {/* PRESETS BUTTONS */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {[
                { id: 'today', label: 'Hari Ini' },
                { id: 'yesterday', label: 'Kemarin' },
                { id: '7days', label: '7 Hari Terakhir' },
                { id: '30days', label: '30 Hari Terakhir' },
                { id: 'this_month', label: 'Bulan Ini' },
                { id: 'last_month', label: 'Bulan Lalu' },
                { id: 'all', label: 'Semua Waktu' },
                { id: 'custom', label: 'Rentang Kustom' },
              ].map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setDatePreset(preset.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    datePreset === preset.id
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* SECONDARY FILTERS: SUPPLIER, STATUS BAYAR, TOKO */}
          <div className="flex items-center gap-2 flex-wrap">
            <div>
              <label className="block text-2xs font-bold text-stone-500 mb-1">Pemasok / Supplier:</label>
              <select
                value={supplierFilter}
                onChange={e => setSupplierFilter(e.target.value)}
                className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 font-medium text-stone-800 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="all">Semua Supplier ({suppliers.length})</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-2xs font-bold text-stone-500 mb-1">Status Pembayaran:</label>
              <select
                value={payStatusFilter}
                onChange={e => setPayStatusFilter(e.target.value)}
                className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 font-medium text-stone-800 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="all">Semua Pembayaran</option>
                <option value="paid">Lunas (Paid)</option>
                <option value="tempo">Tempo / Hutang Dagang</option>
                <option value="unpaid">Belum Dibayar</option>
              </select>
            </div>

            <div>
              <label className="block text-2xs font-bold text-stone-500 mb-1">Status Barang Masuk:</label>
              <select
                value={recvStatusFilter}
                onChange={e => setRecvStatusFilter(e.target.value)}
                className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 font-medium text-stone-800 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="all">Semua Status Fisik</option>
                <option value="received">Diterima di Gudang</option>
                <option value="ordered">Dipesan (Dalam Perjalanan)</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>
          </div>
        </div>

        {/* CUSTOM DATE PICKER */}
        {datePreset === 'custom' && (
          <div className="p-3.5 bg-teal-50/60 rounded-xl border border-teal-200 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-900">Mulai:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-white border border-teal-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-900">Sampai:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-white border border-teal-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ACTIVE RANGE INFO */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500">
          <div>
            Rentang Pembelian: <strong className="text-stone-900">{activeDateRange.start.toLocaleDateString('id-ID', { dateStyle: 'medium' })}</strong> s/d <strong className="text-stone-900">{activeDateRange.end.toLocaleDateString('id-ID', { dateStyle: 'medium' })}</strong>
          </div>
          <div>
            Faktur Terfilter: <strong className="text-teal-700">{filteredPurchases.length} Faktur Beli (PO)</strong>
          </div>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Total Belanja Kulakan</span>
            <ShoppingBag className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-900 mt-2">
            {formatRupiah(summary.totalAmount)}
          </div>
          <div className="text-2xs text-stone-500 mt-1">
            Dari {summary.poCount} faktur pembelian supplier
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Total Kuantitas Masuk</span>
            <Package className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-900 mt-2">
            {summary.totalItemsQty.toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-500">Unit</span>
          </div>
          <div className="text-2xs text-stone-500 mt-1">
            Rata-rata: {formatRupiah(summary.avgPoValue)} / faktur
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Status Terbayar (Lunas)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {formatRupiah(summary.totalPaid)}
          </div>
          <div className="text-2xs text-emerald-600 font-semibold mt-1">
            {summary.totalAmount > 0 ? ((summary.totalPaid / summary.totalAmount) * 100).toFixed(1) : 0}% telah dilunasi
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Hutang Dagang / Tempo</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">
            {formatRupiah(summary.totalPayable)}
          </div>
          <div className="text-2xs font-semibold mt-1">
            {summary.overdueCount > 0 ? (
              <span className="text-rose-600 font-bold">⚠️ {summary.overdueCount} PO Jatuh Tempo ({formatRupiah(summary.overdueAmount)})</span>
            ) : summary.dueSoonCount > 0 ? (
              <span className="text-amber-600 font-bold">{summary.dueSoonCount} PO jatuh tempo minggu ini</span>
            ) : (
              <span className="text-stone-500">Semua tempo dalam kondisi aman</span>
            )}
          </div>
        </div>
      </div>

      {/* SUB-VIEW SWITCHER & EXPORT BUTTONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-100/80 p-2 rounded-2xl border border-stone-200">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setPurchaseViewMode('invoices')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              purchaseViewMode === 'invoices' ? 'bg-white text-teal-800 shadow-xs border border-stone-200' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Faktur Pembelian ({filteredPurchases.length})
          </button>

          <button
            onClick={() => setPurchaseViewMode('suppliers')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              purchaseViewMode === 'suppliers' ? 'bg-white text-teal-800 shadow-xs border border-stone-200' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Rekap per Supplier ({supplierStats.length})
          </button>

          <button
            onClick={() => setPurchaseViewMode('items')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              purchaseViewMode === 'items' ? 'bg-white text-teal-800 shadow-xs border border-stone-200' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Barang Masuk / Kulakan ({purchasedItemsStats.length})
          </button>

          <button
            onClick={() => setPurchaseViewMode('payables')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              purchaseViewMode === 'payables' ? 'bg-white text-amber-800 shadow-xs border border-stone-200' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Buku Hutang & Tempo</span>
            {payablesList.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-2xs bg-amber-500 text-white font-black">
                {payablesList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setPurchaseViewMode('daily')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              purchaseViewMode === 'daily' ? 'bg-white text-teal-800 shadow-xs border border-stone-200' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Tren Harian ({dailyPurchases.length})
          </button>
        </div>

        {/* EXPORT OPTIONS FOR CURRENT VIEW (EXCEL & CSV) */}
        <div className="shrink-0 flex items-center gap-1.5 flex-wrap">
          {purchaseViewMode === 'invoices' && (
            <>
              <button
                onClick={() => exportPurchaseOrdersToExcel(filteredPurchases)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Unduh Format Resmi Excel (.xls / .xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Unduh Excel (.xls)</span>
              </button>
              <button
                onClick={handleExportInvoicesCsv}
                className="px-2.5 py-1.5 rounded-xl bg-stone-200 text-stone-700 hover:bg-stone-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Unduh Format CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </>
          )}

          {purchaseViewMode === 'suppliers' && (
            <button
              onClick={handleExportSuppliersCsv}
              className="px-3 py-1.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Rekap Supplier</span>
            </button>
          )}

          {purchaseViewMode === 'items' && (
            <>
              <button
                onClick={() => exportPurchaseItemsDetailToExcel(filteredPurchases)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Unduh Rincian Barang Dus & Pcs ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Unduh Excel Barang (.xls)</span>
              </button>
              <button
                onClick={handleExportItemsCsv}
                className="px-2.5 py-1.5 rounded-xl bg-stone-200 text-stone-700 hover:bg-stone-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </>
          )}

          {purchaseViewMode === 'payables' && (
            <button
              onClick={handleExportPayablesCsv}
              className="px-3 py-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Hutang Tempo</span>
            </button>
          )}

          {/* CETAK LAPORAN RESMI (A4 / PDF DENGAN KOP SURAT) */}
          <button
            onClick={() => setIsPrintReportModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-stone-900 text-white hover:bg-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors ml-1"
            title="Buka dialog Cetak Laporan Formal rapi dengan Kop Toko & Tanda Tangan"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cetak Laporan / PDF</span>
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari no faktur beli (PO), no faktur supplier, nama supplier, atau nama barang..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-teal-500 transition-all shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* 1. SUB-VIEW: DAFTAR FAKTUR PEMBELIAN (INVOICES)           */}
      {/* ========================================================= */}
      {purchaseViewMode === 'invoices' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <div className="text-xs font-bold text-stone-700">
              Daftar Faktur Pembelian (PO) Masuk: <span className="text-teal-700 font-black">{filteredPurchases.length} Faktur</span>
            </div>
            <div className="text-2xs text-stone-500">
              Total Nilai: <strong className="text-stone-900">{formatRupiah(summary.totalAmount)}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100/75 text-stone-600 font-bold border-b border-stone-200 uppercase text-2xs tracking-wider">
                  <th className="py-3 px-4">No. PO & Faktur</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Supplier / Pemasok</th>
                  <th className="py-3 px-4 text-center">Qty Item</th>
                  <th className="py-3 px-4 text-center">Status Barang</th>
                  <th className="py-3 px-4 text-center">Status Bayar</th>
                  <th className="py-3 px-4 text-center">Jatuh Tempo</th>
                  <th className="py-3 px-4 text-right">Total Beli</th>
                  <th className="py-3 px-4 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-stone-400">
                      Tidak ada faktur pembelian pada periode yang dipilih.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map(po => {
                    const isReceived = po.status === 'received';
                    const isPaid = po.paymentStatus === 'paid';
                    const isTempo = po.paymentMethod === 'tempo';

                    let dueBadge = null;
                    if (po.dueDate && !isPaid) {
                      const now = new Date();
                      const due = new Date(po.dueDate);
                      const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      if (diff < 0) {
                        dueBadge = (
                          <span className="px-2 py-0.5 rounded-full text-2xs font-black bg-rose-100 text-rose-700 border border-rose-200">
                            Lewat {Math.abs(diff)}h
                          </span>
                        );
                      } else if (diff <= 7) {
                        dueBadge = (
                          <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {diff}h lagi
                          </span>
                        );
                      } else {
                        dueBadge = <span className="text-stone-500">{po.dueDate}</span>;
                      }
                    } else if (isPaid) {
                      dueBadge = <span className="text-emerald-600 font-semibold">Lunas</span>;
                    } else {
                      dueBadge = <span className="text-stone-400">-</span>;
                    }

                    return (
                      <tr key={po.id} className="hover:bg-teal-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-stone-900">{po.purchaseNumber}</div>
                          {po.invoiceNumber && (
                            <div className="text-2xs text-stone-400">Fak: {po.invoiceNumber}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-stone-600">
                          <div>{po.orderDate}</div>
                          {po.receivedDate && (
                            <div className="text-2xs text-teal-600 font-medium">Terima: {po.receivedDate}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-800">{po.supplierName}</div>
                          <div className="text-2xs text-stone-400">{po.storeName}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-stone-700">
                          {po.totalQuantity || (po.items || []).reduce((s, it) => s + it.quantity, 0)} unit
                          <div className="text-2xs font-normal text-stone-400">({(po.items || []).length} SKU)</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                            isReceived ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {isReceived ? 'Diterima' : 'Dipesan'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                            isPaid ? 'bg-emerald-100 text-emerald-800' : isTempo ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-stone-100 text-stone-700'
                          }`}>
                            {isPaid ? 'Lunas' : isTempo ? 'Tempo (Hutang)' : 'Belum Lunas'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {dueBadge}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-stone-900">
                          {formatRupiah(po.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedPoDetail(po)}
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-teal-100 text-stone-600 hover:text-teal-700 transition-colors cursor-pointer"
                            title="Lihat Detail Faktur"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SUB-VIEW: REKAP PER SUPPLIER                           */}
      {/* ========================================================= */}
      {purchaseViewMode === 'suppliers' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <div className="text-xs font-bold text-stone-700">
              Analisis Belanja Berdasarkan Supplier / Vendor: <span className="text-teal-700 font-black">{supplierStats.length} Supplier</span>
            </div>
            <div className="text-2xs text-stone-500">
              Total Pembelian: <strong className="text-stone-900">{formatRupiah(summary.totalAmount)}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100/75 text-stone-600 font-bold border-b border-stone-200 uppercase text-2xs tracking-wider">
                  <th className="py-3 px-4">Nama Supplier</th>
                  <th className="py-3 px-4 text-center">Frekuensi PO</th>
                  <th className="py-3 px-4 text-center">Total Unit Masuk</th>
                  <th className="py-3 px-4 text-right">Total Belanja (Rp)</th>
                  <th className="py-3 px-4 text-right">Sudah Lunas</th>
                  <th className="py-3 px-4 text-right">Sisa Hutang / Tempo</th>
                  <th className="py-3 px-4 text-right">Kontribusi (%)</th>
                  <th className="py-3 px-4">Rekening Pembayaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {supplierStats.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      Tidak ada data supplier.
                    </td>
                  </tr>
                ) : (
                  supplierStats.map(s => {
                    const share = summary.totalAmount > 0 ? (s.totalAmount / summary.totalAmount) * 100 : 0;
                    return (
                      <tr key={s.supplierId} className="hover:bg-teal-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900">{s.supplierName}</div>
                          <div className="text-2xs text-stone-400 font-mono">{s.supplierId}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-stone-700">
                          {s.poCount}x Transaksi
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-stone-600">
                          {s.itemsQty.toLocaleString('id-ID')} unit
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-teal-900">
                          {formatRupiah(s.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatRupiah(s.totalPaid)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                          {formatRupiah(s.totalPayable)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-bold text-stone-800">{share.toFixed(1)}%</div>
                          <div className="w-16 h-1.5 bg-stone-100 rounded-full ml-auto overflow-hidden mt-1">
                            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.min(100, share)}%` }} />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-stone-600 font-mono text-2xs">
                          {s.bankInfo}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SUB-VIEW: REKAP BARANG MASUK / KULAKAN                 */}
      {/* ========================================================= */}
      {purchaseViewMode === 'items' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <div className="text-xs font-bold text-stone-700">
              Rincian Produk & Barang Masuk dari Supplier: <span className="text-teal-700 font-black">{purchasedItemsStats.length} Produk</span>
            </div>
            <div className="text-2xs text-stone-500">
              Total Belanja: <strong className="text-stone-900">{formatRupiah(summary.totalAmount)}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100/75 text-stone-600 font-bold border-b border-stone-200 uppercase text-2xs tracking-wider">
                  <th className="py-3 px-4">Nama Produk & Barcode</th>
                  <th className="py-3 px-4 text-center">Satuan</th>
                  <th className="py-3 px-4 text-center">Total Qty Masuk</th>
                  <th className="py-3 px-4 text-right">Rata-rata Harga Beli</th>
                  <th className="py-3 px-4 text-right">Total Belanja Modal</th>
                  <th className="py-3 px-4">Supplier Terakhir</th>
                  <th className="py-3 px-4 text-center">Frekuensi Beli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {purchasedItemsStats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-400">
                      Tidak ada barang masuk pada periode ini.
                    </td>
                  </tr>
                ) : (
                  purchasedItemsStats.map(it => (
                    <tr key={it.productId} className="hover:bg-teal-50/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">{it.productName}</div>
                        {it.barcode && (
                          <div className="text-2xs text-stone-400 font-mono">Barcode: {it.barcode}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-stone-600 font-medium">
                        {it.unit}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-teal-800">
                        {it.totalQty.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-stone-800">
                        {formatRupiah(it.avgCostPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-stone-900">
                        {formatRupiah(it.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-stone-700">
                        {it.lastSupplier}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-stone-600">
                        {it.poCount}x PO
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. SUB-VIEW: BUKU HUTANG DAGANG & JATUH TEMPO (PAYABLES)  */}
      {/* ========================================================= */}
      {purchaseViewMode === 'payables' && (
        <div className="space-y-4">
          <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-950">Monitoring Buku Hutang Dagang (Tempo Supplier)</h4>
                <p className="text-xs text-amber-800">
                  Daftar faktur pembelian yang belum lunas atau menggunakan termin pembayaran tempo.
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xs font-bold text-amber-700 uppercase">Total Kewajiban Hutang:</div>
              <div className="text-xl font-black text-amber-900">{formatRupiah(summary.totalPayable)}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100/75 text-stone-600 font-bold border-b border-stone-200 uppercase text-2xs tracking-wider">
                    <th className="py-3 px-4">No. PO & Faktur</th>
                    <th className="py-3 px-4">Nama Supplier</th>
                    <th className="py-3 px-4 text-center">Tgl Pesan</th>
                    <th className="py-3 px-4 text-center">Batas Jatuh Tempo</th>
                    <th className="py-3 px-4 text-center">Sisa Waktu</th>
                    <th className="py-3 px-4 text-right">Nominal Hutang</th>
                    <th className="py-3 px-4">Rekening Tujuan Transfer</th>
                    <th className="py-3 px-4 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {payablesList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-emerald-600 font-semibold">
                        🎉 Hebat! Tidak ada hutang dagang atau tempo yang belum lunas pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    payablesList.map(item => {
                      const { po, diffDays, isOverdue, isDueSoon, bankAccount } = item;

                      return (
                        <tr key={po.id} className={`transition-colors ${
                          isOverdue ? 'bg-rose-50/50 hover:bg-rose-50' : isDueSoon ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-stone-50'
                        }`}>
                          <td className="py-3 px-4 font-mono font-bold text-stone-900">
                            <div>{po.purchaseNumber}</div>
                            {po.invoiceNumber && (
                              <div className="text-2xs font-normal text-stone-400">Fak: {po.invoiceNumber}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-stone-800">
                            {po.supplierName}
                          </td>
                          <td className="py-3 px-4 text-center text-stone-600 font-mono">
                            {po.orderDate}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-stone-900">
                            {po.dueDate || '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isOverdue ? (
                              <span className="px-2 py-1 rounded-full text-2xs font-black bg-rose-600 text-white shadow-2xs">
                                ⚠️ Lewat {Math.abs(diffDays)} Hari!
                              </span>
                            ) : isDueSoon ? (
                              <span className="px-2 py-1 rounded-full text-2xs font-bold bg-amber-500 text-white">
                                {diffDays} Hari Lagi
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-2xs font-medium bg-stone-100 text-stone-700">
                                {diffDays} Hari Lagi
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-rose-700 text-sm">
                            {formatRupiah(po.totalAmount)}
                          </td>
                          <td className="py-3 px-4 font-mono text-2xs text-stone-600">
                            {bankAccount ? (
                              <div>
                                <span className="font-bold text-stone-900">{bankAccount.bankName}</span>: {bankAccount.accountNumber}
                                <div className="text-stone-400">a/n {bankAccount.accountHolder}</div>
                              </div>
                            ) : (
                              <span className="text-stone-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedPoDetail(po)}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-teal-100 text-stone-600 hover:text-teal-700 transition-colors cursor-pointer"
                              title="Lihat Detail Faktur"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. SUB-VIEW: TREN HARIAN PEMBELIAN                       */}
      {/* ========================================================= */}
      {purchaseViewMode === 'daily' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <div className="text-xs font-bold text-stone-700">
              Tren Pembelian Harian: <span className="text-teal-700 font-black">{dailyPurchases.length} Hari Aktif Kulakan</span>
            </div>
            <div className="text-2xs text-stone-500">
              Total Pembelian: <strong className="text-stone-900">{formatRupiah(summary.totalAmount)}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100/75 text-stone-600 font-bold border-b border-stone-200 uppercase text-2xs tracking-wider">
                  <th className="py-3 px-4">Tanggal Pembelian</th>
                  <th className="py-3 px-4 text-center">Jumlah Faktur (PO)</th>
                  <th className="py-3 px-4 text-center">Total Unit Masuk</th>
                  <th className="py-3 px-4 text-right">Total Nilai Pembelian (Rp)</th>
                  <th className="py-3 px-4 text-right">Rata-rata Nilai Beli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {dailyPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-stone-400">
                      Tidak ada transaksi pembelian harian.
                    </td>
                  </tr>
                ) : (
                  dailyPurchases.map(d => (
                    <tr key={d.dateStr} className="hover:bg-teal-50/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-stone-900">
                        {d.dateStr}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-stone-700">
                        {d.count} PO
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-stone-600">
                        {d.totalQty.toLocaleString('id-ID')} unit
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-teal-900">
                        {formatRupiah(d.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-stone-600">
                        {formatRupiah(d.count > 0 ? Math.round(d.totalAmount / d.count) : 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DETAIL FAKTUR PEMBELIAN                            */}
      {/* ========================================================= */}
      {selectedPoDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <span className="text-2xs font-bold uppercase text-teal-700 tracking-wider">Faktur Pembelian Supplier</span>
                <h4 className="font-mono font-black text-stone-900 text-lg">
                  {selectedPoDetail.purchaseNumber}
                </h4>
              </div>
              <button
                onClick={() => setSelectedPoDetail(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SUPPLIER & INVOICE METADATA */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 p-3.5 rounded-xl border border-stone-200">
              <div>
                <span className="text-stone-400 block text-2xs">Pemasok / Supplier:</span>
                <strong className="text-stone-900 text-sm">{selectedPoDetail.supplierName}</strong>
                {selectedPoDetail.invoiceNumber && (
                  <div className="text-stone-600 text-2xs mt-0.5">No Faktur Supplier: <span className="font-mono">{selectedPoDetail.invoiceNumber}</span></div>
                )}
              </div>
              <div className="text-right">
                <span className="text-stone-400 block text-2xs">Toko / Gudang Penerima:</span>
                <strong className="text-stone-900">{selectedPoDetail.storeName}</strong>
                <div className="text-stone-600 text-2xs mt-0.5">Tgl Pesan: {selectedPoDetail.orderDate}</div>
              </div>
              <div>
                <span className="text-stone-400 block text-2xs">Status Penerimaan Barang:</span>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-2xs font-bold ${
                  selectedPoDetail.status === 'received' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedPoDetail.status === 'received' ? 'Diterima di Gudang' : selectedPoDetail.status}
                </span>
              </div>
              <div className="text-right">
                <span className="text-stone-400 block text-2xs">Status Pembayaran:</span>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-2xs font-bold ${
                  selectedPoDetail.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedPoDetail.paymentStatus === 'paid' ? 'Lunas' : selectedPoDetail.paymentMethod === 'tempo' ? `Tempo (Jatuh: ${selectedPoDetail.dueDate || '-'})` : 'Belum Lunas'}
                </span>
              </div>
            </div>

            {/* ITEMS LIST TABLE */}
            <div>
              <div className="text-xs font-bold text-stone-700 mb-2">Daftar Barang yang Dibeli:</div>
              <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 text-stone-600 font-bold border-b border-stone-200 text-2xs">
                    <tr>
                      <th className="py-2 px-3">Nama Produk</th>
                      <th className="py-2 px-3 text-center">Satuan</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Harga Beli</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {(selectedPoDetail.items || []).map((it, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-stone-900">{it.productName}</div>
                          {it.barcode && <div className="text-2xs text-stone-400 font-mono">{it.barcode}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-center text-stone-600">{it.unit || 'Pcs'}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-stone-800">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-stone-700">{formatRupiah(it.costPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                          {formatRupiah(it.subtotal || (it.quantity * it.costPrice))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-stone-50 border-t border-stone-200 font-bold">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right text-stone-600">Subtotal Belanja:</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(selectedPoDetail.subtotal)}</td>
                    </tr>
                    {selectedPoDetail.discountAmount ? (
                      <tr>
                        <td colSpan={4} className="py-1 px-3 text-right text-emerald-700">Potongan Diskon Supplier:</td>
                        <td className="py-1 px-3 text-right font-mono text-emerald-700">-{formatRupiah(selectedPoDetail.discountAmount)}</td>
                      </tr>
                    ) : null}
                    <tr className="border-t border-stone-200 text-sm">
                      <td colSpan={4} className="py-2.5 px-3 text-right font-black text-stone-900">Total Akhir Faktur:</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-teal-800">{formatRupiah(selectedPoDetail.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {selectedPoDetail.notes && (
              <div className="text-2xs bg-stone-50 p-2.5 rounded-lg border border-stone-200 text-stone-600">
                <strong>Catatan Penerimaan:</strong> {selectedPoDetail.notes}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                onClick={() => setSelectedPoDetail(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORMAL PRINTABLE REPORT MODAL (BY SUPPLIER, INVOICE, PERIOD, ETC.) */}
      <ErrorBoundary fallbackTitle="Kendala Membuka Laporan Pembelian">
        <PurchaseReportModal
          isOpen={isPrintReportModalOpen}
          onClose={() => setIsPrintReportModalOpen(false)}
          purchases={purchases || []}
          suppliers={suppliers || []}
          stores={stores || []}
          products={products || []}
          currentStore={stores?.[0]}
        />
      </ErrorBoundary>
    </div>
  );
};
