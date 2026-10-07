import React, { useState, useMemo } from 'react';
import { PurchaseOrder, Supplier, Store, Product } from '../types';
import { formatRupiah } from '../utils/formatters';
import { 
  Printer, 
  X, 
  Download, 
  Building2, 
  Calendar, 
  Filter, 
  FileText, 
  Users, 
  Package, 
  Clock, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

export type PurchaseReportType = 
  | 'invoices_summary' 
  | 'supplier_summary' 
  | 'items_detail' 
  | 'payables_tempo' 
  | 'invoice_complete';

interface PurchaseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchases: PurchaseOrder[];
  suppliers: Supplier[];
  stores: Store[];
  products: Product[];
  currentStore?: Store;
}

export const PurchaseReportModal: React.FC<PurchaseReportModalProps> = ({
  isOpen,
  onClose,
  purchases = [],
  suppliers = [],
  stores = [],
  products = [],
  currentStore,
}) => {
  // Report Configuration States
  const [reportType, setReportType] = useState<PurchaseReportType>('invoices_summary');
  
  // Date Period Filter
  const [datePreset, setDatePreset] = useState<'today' | '7days' | 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Filter criteria
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [invoiceQuery, setInvoiceQuery] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');

  if (!isOpen) return null;

  // Active Store for Letterhead Kop Surat
  const storeInfo = currentStore || stores[0] || {
    id: 'store_1',
    name: 'KUICKMART STORE',
    address: 'Jl. Raya Utama No. 88, Sentra Niaga',
    phone: '0812-3456-7890',
    city: 'Jakarta',
  };

  // Preset Date handler
  const handleDatePresetChange = (preset: typeof datePreset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      const today = now.toISOString().slice(0, 10);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setStartDate(sevenDaysAgo);
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate(now.toISOString().slice(0, 10));
    }
  };

  // Filtered Purchases list
  const filteredPurchases = useMemo(() => {
    return purchases.filter(po => {
      // 1. Date Filter
      const poDateStr = (po.receivedDate || po.orderDate || po.createdAt || '').slice(0, 10);
      if (startDate && poDateStr < startDate) return false;
      if (endDate && poDateStr > endDate) return false;

      // 2. Supplier Filter
      if (selectedSupplierId !== 'all' && po.supplierId !== selectedSupplierId) {
        return false;
      }

      // 3. Invoice Number / PO Number Search Query
      if (invoiceQuery.trim()) {
        const q = invoiceQuery.toLowerCase().trim();
        const matchPoNum = po.purchaseNumber?.toLowerCase().includes(q);
        const matchInvNum = po.invoiceNumber?.toLowerCase().includes(q);
        const matchSupName = po.supplierName?.toLowerCase().includes(q);
        const matchItem = (po.items || []).some(it => it.productName?.toLowerCase().includes(q) || it.barcode?.toLowerCase().includes(q));
        if (!matchPoNum && !matchInvNum && !matchSupName && !matchItem) {
          return false;
        }
      }

      // 4. Payment Status Filter
      if (paymentStatusFilter !== 'all' && po.paymentStatus !== paymentStatusFilter) {
        return false;
      }

      // 5. Stock Status Filter
      if (stockStatusFilter !== 'all' && po.status !== stockStatusFilter) {
        return false;
      }

      // 6. Store Filter
      if (selectedStoreId !== 'all' && po.storeId !== selectedStoreId) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.receivedDate || a.orderDate || a.createdAt).getTime();
      const dateB = new Date(b.receivedDate || b.orderDate || b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [
    purchases, 
    startDate, 
    endDate, 
    selectedSupplierId, 
    invoiceQuery, 
    paymentStatusFilter, 
    stockStatusFilter, 
    selectedStoreId
  ]);

  // Executive Metrics
  const metrics = useMemo(() => {
    let totalSpend = 0;
    let totalQty = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    filteredPurchases.forEach(po => {
      totalSpend += po.totalAmount || 0;
      totalQty += po.totalQuantity || (po.items || []).reduce((sum, it) => sum + it.quantity, 0);
      totalTax += po.taxAmount || 0;
      totalDiscount += po.discountAmount || 0;

      if (po.paymentStatus === 'paid') {
        totalPaid += po.totalAmount || 0;
      } else {
        totalUnpaid += po.totalAmount || 0;
      }
    });

    return {
      count: filteredPurchases.length,
      totalSpend,
      totalQty,
      totalPaid,
      totalUnpaid,
      totalTax,
      totalDiscount,
    };
  }, [filteredPurchases]);

  // Grouped by Supplier stats
  const supplierGrouping = useMemo(() => {
    const map = new Map<string, {
      supplierId: string;
      supplierName: string;
      contactPerson?: string;
      phone?: string;
      poCount: number;
      totalAmount: number;
      totalPaid: number;
      totalUnpaid: number;
      totalItemsQty: number;
    }>();

    filteredPurchases.forEach(po => {
      const sId = po.supplierId || 'sup_general';
      const sName = po.supplierName || 'Pemasok Umum';
      const foundSup = suppliers.find(s => s.id === sId);

      if (!map.has(sId)) {
        map.set(sId, {
          supplierId: sId,
          supplierName: sName,
          contactPerson: foundSup?.contactPerson,
          phone: foundSup?.phone,
          poCount: 1,
          totalAmount: po.totalAmount || 0,
          totalPaid: po.paymentStatus === 'paid' ? (po.totalAmount || 0) : 0,
          totalUnpaid: po.paymentStatus !== 'paid' ? (po.totalAmount || 0) : 0,
          totalItemsQty: po.totalQuantity || (po.items || []).reduce((sum, it) => sum + it.quantity, 0),
        });
      } else {
        const item = map.get(sId)!;
        item.poCount += 1;
        item.totalAmount += po.totalAmount || 0;
        if (po.paymentStatus === 'paid') {
          item.totalPaid += po.totalAmount || 0;
        } else {
          item.totalUnpaid += po.totalAmount || 0;
        }
        item.totalItemsQty += po.totalQuantity || (po.items || []).reduce((sum, it) => sum + it.quantity, 0);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredPurchases, suppliers]);

  // Flattened Items detail
  const flattenedItems = useMemo(() => {
    const rows: Array<{
      purchaseNumber: string;
      invoiceNumber?: string;
      date: string;
      supplierName: string;
      productName: string;
      barcode?: string;
      unit: string;
      quantity: number;
      conversionMultiplier: number;
      baseQuantity: number;
      baseUnit: string;
      costPrice: number;
      subtotal: number;
    }> = [];

    filteredPurchases.forEach(po => {
      (po.items || []).forEach(it => {
        rows.push({
          purchaseNumber: po.purchaseNumber,
          invoiceNumber: po.invoiceNumber,
          date: po.receivedDate || po.orderDate || po.createdAt.slice(0, 10),
          supplierName: po.supplierName || 'Pemasok Umum',
          productName: it.productName || 'Item',
          barcode: it.barcode,
          unit: it.unit || 'Pcs',
          quantity: it.quantity || 0,
          conversionMultiplier: it.conversionMultiplier || 1,
          baseQuantity: it.baseQuantity || (it.quantity * (it.conversionMultiplier || 1)),
          baseUnit: it.baseUnit || 'Pcs',
          costPrice: it.costPrice || 0,
          subtotal: it.subtotal || (it.quantity * it.costPrice),
        });
      });
    });

    return rows;
  }, [filteredPurchases]);

  // Payables & Tempo List
  const payablesList = useMemo(() => {
    const now = new Date();
    return filteredPurchases
      .filter(po => po.paymentStatus !== 'paid')
      .map(po => {
        let isOverdue = false;
        let daysDiff = 0;
        if (po.dueDate) {
          const due = new Date(po.dueDate);
          daysDiff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          isOverdue = daysDiff < 0;
        }
        return {
          ...po,
          isOverdue,
          daysDiff,
        };
      })
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [filteredPurchases]);

  // Format Dynamic Report Title
  const reportTitle = useMemo(() => {
    let base = 'LAPORAN REKAP PEMBELIAN';
    if (reportType === 'supplier_summary') base = 'LAPORAN PEMBELIAN PER PEMASOK (SUPPLIER)';
    else if (reportType === 'items_detail') base = 'LAPORAN RINCIAN ITEM BARANG DIBELI';
    else if (reportType === 'payables_tempo') base = 'LAPORAN HUTANG DAGANG & JATUH TEMPO';
    else if (reportType === 'invoice_complete') base = 'LAPORAN DETAIL LENGKAP FAKTUR PEMBELIAN';

    if (selectedSupplierId !== 'all') {
      const sup = suppliers.find(s => s.id === selectedSupplierId);
      if (sup) base += ` - ${sup.name.toUpperCase()}`;
    }

    if (invoiceQuery.trim()) {
      base += ` (PENCARIAN: ${invoiceQuery.toUpperCase()})`;
    }

    return base;
  }, [reportType, selectedSupplierId, invoiceQuery, suppliers]);

  // Handle Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Export to Excel XML
  const handleExportExcel = () => {
    let rowsHtml = '';
    const cleanStoreName = storeInfo.name || 'Kuickmart Store';

    if (reportType === 'supplier_summary') {
      rowsHtml = supplierGrouping.map((s, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${s.supplierName}</td>
          <td>${s.contactPerson || '-'}</td>
          <td>${s.phone || '-'}</td>
          <td align="center">${s.poCount}</td>
          <td align="right">${s.totalItemsQty}</td>
          <td align="right">Rp ${s.totalAmount.toLocaleString('id-ID')}</td>
          <td align="right">Rp ${s.totalPaid.toLocaleString('id-ID')}</td>
          <td align="right">Rp ${s.totalUnpaid.toLocaleString('id-ID')}</td>
        </tr>
      `).join('');
    } else if (reportType === 'items_detail') {
      rowsHtml = flattenedItems.map((it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${it.purchaseNumber}</td>
          <td>${it.invoiceNumber || '-'}</td>
          <td>${it.date}</td>
          <td>${it.supplierName}</td>
          <td>${it.barcode || '-'}</td>
          <td>${it.productName}</td>
          <td align="right">${it.quantity}</td>
          <td>${it.unit}</td>
          <td align="right">Rp ${it.costPrice.toLocaleString('id-ID')}</td>
          <td align="right">Rp ${it.subtotal.toLocaleString('id-ID')}</td>
        </tr>
      `).join('');
    } else {
      // Invoices summary default
      rowsHtml = filteredPurchases.map((po, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${po.purchaseNumber}</td>
          <td>${po.invoiceNumber || '-'}</td>
          <td>${po.orderDate}</td>
          <td>${po.supplierName}</td>
          <td>${po.paymentMethod === 'tempo' ? 'Tempo' : 'Tunai'}</td>
          <td>${po.dueDate || '-'}</td>
          <td>${po.paymentStatus === 'paid' ? 'LUNAS' : 'BELUM LUNAS'}</td>
          <td>${po.status === 'received' ? 'Diterima' : 'Dipesan'}</td>
          <td align="right">${po.totalQuantity || 0}</td>
          <td align="right">Rp ${(po.totalAmount || 0).toLocaleString('id-ID')}</td>
        </tr>
      `).join('');
    }

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          body { font-family: Calibri, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #065F46; color: #ffffff; border: 1px solid #000; padding: 6px; font-weight: bold; }
          td { border: 1px solid #ccc; padding: 5px; }
          .header-title { font-size: 16pt; font-weight: bold; color: #065F46; }
          .header-sub { font-size: 10pt; color: #555; }
        </style>
      </head>
      <body>
        <div class="header-title">${cleanStoreName.toUpperCase()}</div>
        <div class="header-sub">${storeInfo.address || ''} | Telp: ${storeInfo.phone || ''}</div>
        <div class="header-sub"><strong>${reportTitle}</strong></div>
        <div class="header-sub">Periode: ${startDate} s/d ${endDate} | Tanggal Ekspor: ${new Date().toLocaleString('id-ID')}</div>
        <br/>
        <table>
          <thead>
            ${reportType === 'supplier_summary' ? `
              <tr>
                <th>No</th><th>Nama Pemasok</th><th>Kontak Person</th><th>Telepon</th><th>Jml Faktur</th><th>Total Qty</th><th>Total Belanja</th><th>Sudah Bayar</th><th>Sisa Hutang</th>
              </tr>
            ` : reportType === 'items_detail' ? `
              <tr>
                <th>No</th><th>No PO</th><th>Faktur Supplier</th><th>Tanggal</th><th>Pemasok</th><th>Barcode</th><th>Nama Barang</th><th>Qty</th><th>Satuan</th><th>Harga Beli</th><th>Subtotal</th>
              </tr>
            ` : `
              <tr>
                <th>No</th><th>No PO</th><th>Faktur Supplier</th><th>Tanggal</th><th>Pemasok</th><th>Metode</th><th>Jatuh Tempo</th><th>Status Bayar</th><th>Status Barang</th><th>Total Qty</th><th>Total Nilai</th>
              </tr>
            `}
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background-color: #f3f4f6;">
              <td colspan="${reportType === 'supplier_summary' ? 6 : reportType === 'items_detail' ? 9 : 9}" align="right">GRAND TOTAL:</td>
              <td align="right">Rp ${metrics.totalSpend.toLocaleString('id-ID')}</td>
              ${reportType === 'supplier_summary' ? `
                <td align="right">Rp ${metrics.totalPaid.toLocaleString('id-ID')}</td>
                <td align="right">Rp ${metrics.totalUnpaid.toLocaleString('id-ID')}</td>
              ` : ''}
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Pembelian_${startDate}_sd_${endDate}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-80 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl border border-stone-200 space-y-5 my-4 max-h-[96vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0 print:my-0">
        
        {/* NON-PRINT CONTROLS TOOLBAR */}
        <div className="print:hidden space-y-4 border-b border-stone-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-stone-900 text-lg">Laporan & Cetak Pembelian (Purchase Orders)</h3>
                <p className="text-xs text-stone-500">Filter fleksibel per pemasok, per faktur, per periode tanggal, dan cetak laporan resmi rapi</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Ekspor Excel (.xls)</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Laporan / PDF</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* TIPE LAPORAN TABS */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-stone-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setReportType('invoices_summary')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                reportType === 'invoices_summary' 
                  ? 'bg-white text-emerald-800 shadow-xs' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Rekap Faktur</span>
            </button>

            <button
              onClick={() => setReportType('supplier_summary')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                reportType === 'supplier_summary' 
                  ? 'bg-white text-emerald-800 shadow-xs' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Per Pemasok</span>
            </button>

            <button
              onClick={() => setReportType('items_detail')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                reportType === 'items_detail' 
                  ? 'bg-white text-emerald-800 shadow-xs' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Rincian Item</span>
            </button>

            <button
              onClick={() => setReportType('payables_tempo')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                reportType === 'payables_tempo' 
                  ? 'bg-white text-emerald-800 shadow-xs' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Hutang & Tempo</span>
            </button>

            <button
              onClick={() => setReportType('invoice_complete')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all col-span-2 sm:col-span-1 ${
                reportType === 'invoice_complete' 
                  ? 'bg-white text-emerald-800 shadow-xs' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Detail Lengkap</span>
            </button>
          </div>

          {/* FILTER CRITERIA CONTROLS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
            {/* Periode Preset & Tanggal */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-600" />
                <span>Periode Tanggal:</span>
              </label>
              <div className="flex gap-1.5">
                <select
                  value={datePreset}
                  onChange={(e) => handleDatePresetChange(e.target.value as any)}
                  className="w-full text-xs bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="today">Hari Ini</option>
                  <option value="7days">7 Hari Terakhir</option>
                  <option value="this_month">Bulan Ini</option>
                  <option value="last_month">Bulan Lalu</option>
                  <option value="this_year">Tahun Ini</option>
                  <option value="all">Semua Waktu</option>
                  <option value="custom">Kustom Tanggal</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-1/2 text-[11px] bg-white border border-stone-200 rounded-lg px-2 py-1 text-stone-700"
                />
                <span className="text-stone-400 text-xs">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-1/2 text-[11px] bg-white border border-stone-200 rounded-lg px-2 py-1 text-stone-700"
                />
              </div>
            </div>

            {/* Filter Pemasok */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-600" />
                <span>Pemasok / Supplier:</span>
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full text-xs bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">-- Semua Pemasok ({suppliers.length}) --</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Cari No Faktur / PO..."
                  value={invoiceQuery}
                  onChange={(e) => setInvoiceQuery(e.target.value)}
                  className="w-full text-xs bg-white border border-stone-200 rounded-xl pl-8 pr-2.5 py-1.5 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Filter Status Bayar & Barang */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                <Filter className="w-3 h-3 text-emerald-600" />
                <span>Status Pembayaran:</span>
              </label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full text-xs bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Semua Status Bayar</option>
                <option value="paid">Lunas (Paid)</option>
                <option value="unpaid">Belum Lunas / Tempo (Unpaid)</option>
              </select>

              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="w-full text-xs bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Semua Status Fisik Barang</option>
                <option value="received">Sudah Diterima (Received)</option>
                <option value="ordered">Masih Dipesan (Ordered)</option>
              </select>
            </div>

            {/* Filter Toko / Cabang & Reset */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-emerald-600" />
                <span>Cabang / Toko:</span>
              </label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full text-xs bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Semua Toko / Gudang</option>
                {stores.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>

              <button
                onClick={() => {
                  setDatePreset('this_month');
                  handleDatePresetChange('this_month');
                  setSelectedSupplierId('all');
                  setInvoiceQuery('');
                  setPaymentStatusFilter('all');
                  setStockStatusFilter('all');
                  setSelectedStoreId('all');
                }}
                className="w-full text-[11px] font-bold py-1.5 px-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl transition-colors"
              >
                Reset Semua Filter
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PRINTABLE REPORT DOCUMENT (FORMAT A4 RESMI, RAPI & BERSIH) */}
        {/* ======================================================== */}
        <div id="printable-purchase-report" className="print-area-wrapper bg-white text-stone-900 space-y-5 p-1 sm:p-2">
          
          {/* KOP SURAT RESMI TOKO */}
          <div className="border-b-2 border-stone-900 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-stone-900">
                  {storeInfo.name}
                </h1>
                <p className="text-xs text-stone-600 mt-1 max-w-md leading-relaxed">
                  {storeInfo.address || 'Pusat Distribusi & Retail'}
                </p>
                <p className="text-xs text-stone-600">
                  Telepon / WhatsApp: <strong>{storeInfo.phone || '-'}</strong> | Wilayah: {storeInfo.city || 'Indonesia'}
                </p>
              </div>

              <div className="text-right">
                <div className="inline-block bg-stone-900 text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-sm uppercase">
                  DOKUMEN RESMI TOKO
                </div>
                <div className="text-[11px] text-stone-500 mt-2">
                  Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <div className="text-[11px] text-stone-500">
                  Waktu: {new Date().toLocaleTimeString('id-ID')} WIB
                </div>
              </div>
            </div>

            {/* JUDUL LAPORAN & BARIS PARAMETER FILTER */}
            <div className="mt-4 pt-3 border-t border-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide text-stone-900">
                  {reportTitle}
                </h2>
                <div className="text-xs text-stone-600 flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
                  <span>Periode: <strong>{startDate} s/d {endDate}</strong></span>
                  {selectedSupplierId !== 'all' && (
                    <span>Pemasok: <strong>{suppliers.find(s => s.id === selectedSupplierId)?.name}</strong></span>
                  )}
                  {paymentStatusFilter !== 'all' && (
                    <span>Status: <strong>{paymentStatusFilter === 'paid' ? 'Lunas' : 'Belum Lunas (Tempo)'}</strong></span>
                  )}
                </div>
              </div>

              <div className="text-xs text-stone-500 font-mono">
                Total Faktur Ditemukan: <strong className="text-stone-900">{filteredPurchases.length} Dokumen</strong>
              </div>
            </div>
          </div>

          {/* RINGKASAN EKSEKUTIF / KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
              <div className="text-[11px] text-stone-500 font-medium">Total Nilai Pembelian</div>
              <div className="text-base font-black text-stone-900 mt-0.5">{formatRupiah(metrics.totalSpend)}</div>
              <div className="text-[10px] text-stone-500">{filteredPurchases.length} transaksi PO</div>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
              <div className="text-[11px] text-stone-500 font-medium">Total Qty Barang</div>
              <div className="text-base font-black text-stone-900 mt-0.5">{metrics.totalQty.toLocaleString('id-ID')} Pcs/Dus</div>
              <div className="text-[10px] text-stone-500">Kuantitas fisik faktur</div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="text-[11px] text-emerald-800 font-medium">Sudah Dibayar (Lunas)</div>
              <div className="text-base font-black text-emerald-700 mt-0.5">{formatRupiah(metrics.totalPaid)}</div>
              <div className="text-[10px] text-emerald-600">Tunai / Transfer lunas</div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-[11px] text-amber-800 font-medium">Sisa Hutang / Tempo</div>
              <div className="text-base font-black text-amber-700 mt-0.5">{formatRupiah(metrics.totalUnpaid)}</div>
              <div className="text-[10px] text-amber-600">Jatuh tempo berjalan</div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TABEL DATA SESUAI TIPE LAPORAN YANG DIPILIH                */}
          {/* ========================================================= */}

          {/* 1. TIPE: REKAP FAKTUR PEMBELIAN (INVOICES SUMMARY) */}
          {reportType === 'invoices_summary' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-stone-300">
                <thead>
                  <tr className="bg-stone-100 text-stone-800 border-b border-stone-300 font-bold">
                    <th className="p-2 border-r border-stone-300 text-center w-10">No</th>
                    <th className="p-2 border-r border-stone-300">No PO</th>
                    <th className="p-2 border-r border-stone-300">No Faktur Supplier</th>
                    <th className="p-2 border-r border-stone-300 text-center">Tanggal</th>
                    <th className="p-2 border-r border-stone-300">Pemasok / Supplier</th>
                    <th className="p-2 border-r border-stone-300 text-center">Metode</th>
                    <th className="p-2 border-r border-stone-300 text-center">Jatuh Tempo</th>
                    <th className="p-2 border-r border-stone-300 text-center">Status Bayar</th>
                    <th className="p-2 border-r border-stone-300 text-right">Qty</th>
                    <th className="p-2 text-right">Total Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-stone-500 italic">
                        Tidak ada transaksi pembelian yang cocok dengan filter kriteria yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((po, idx) => (
                      <tr key={po.id} className="border-b border-stone-200 hover:bg-stone-50">
                        <td className="p-2 border-r border-stone-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border-r border-stone-300 font-mono font-bold text-stone-900">{po.purchaseNumber}</td>
                        <td className="p-2 border-r border-stone-300 font-mono text-stone-600">{po.invoiceNumber || '-'}</td>
                        <td className="p-2 border-r border-stone-300 text-center text-stone-700">{po.orderDate}</td>
                        <td className="p-2 border-r border-stone-300 font-medium text-stone-900">{po.supplierName}</td>
                        <td className="p-2 border-r border-stone-300 text-center capitalize">{po.paymentMethod === 'tempo' ? 'Tempo' : 'Tunai'}</td>
                        <td className="p-2 border-r border-stone-300 text-center text-stone-600">{po.dueDate || '-'}</td>
                        <td className="p-2 border-r border-stone-300 text-center">
                          {po.paymentStatus === 'paid' ? (
                            <span className="font-bold text-emerald-700">LUNAS</span>
                          ) : (
                            <span className="font-bold text-amber-700">TEMPO</span>
                          )}
                        </td>
                        <td className="p-2 border-r border-stone-300 text-right font-mono">{po.totalQuantity || 0}</td>
                        <td className="p-2 text-right font-mono font-bold text-stone-900">{formatRupiah(po.totalAmount || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-100 font-black text-stone-900 border-t-2 border-stone-900">
                    <td colSpan={8} className="p-2.5 text-right border-r border-stone-300 uppercase tracking-wider">
                      GRAND TOTAL PEMBELIAN:
                    </td>
                    <td className="p-2.5 text-right border-r border-stone-300 font-mono">
                      {metrics.totalQty.toLocaleString('id-ID')}
                    </td>
                    <td className="p-2.5 text-right font-mono text-sm text-emerald-800">
                      {formatRupiah(metrics.totalSpend)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* 2. TIPE: REKAP PER PEMASOK (SUPPLIER SUMMARY) */}
          {reportType === 'supplier_summary' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-stone-300">
                <thead>
                  <tr className="bg-stone-100 text-stone-800 border-b border-stone-300 font-bold">
                    <th className="p-2 border-r border-stone-300 text-center w-10">No</th>
                    <th className="p-2 border-r border-stone-300">Nama Pemasok (Supplier)</th>
                    <th className="p-2 border-r border-stone-300">Kontak Person</th>
                    <th className="p-2 border-r border-stone-300">Telepon / HP</th>
                    <th className="p-2 border-r border-stone-300 text-center">Jumlah PO</th>
                    <th className="p-2 border-r border-stone-300 text-right">Total Item Qty</th>
                    <th className="p-2 border-r border-stone-300 text-right">Total Belanja</th>
                    <th className="p-2 border-r border-stone-300 text-right">Sudah Dibayar</th>
                    <th className="p-2 text-right">Sisa Hutang (Tempo)</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierGrouping.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-stone-500 italic">
                        Tidak ada data pemasok yang cocok dengan periode ini.
                      </td>
                    </tr>
                  ) : (
                    supplierGrouping.map((sup, idx) => (
                      <tr key={sup.supplierId} className="border-b border-stone-200 hover:bg-stone-50">
                        <td className="p-2 border-r border-stone-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border-r border-stone-300 font-bold text-stone-900">{sup.supplierName}</td>
                        <td className="p-2 border-r border-stone-300 text-stone-700">{sup.contactPerson || '-'}</td>
                        <td className="p-2 border-r border-stone-300 text-stone-700">{sup.phone || '-'}</td>
                        <td className="p-2 border-r border-stone-300 text-center font-mono font-bold">{sup.poCount}</td>
                        <td className="p-2 border-r border-stone-300 text-right font-mono">{sup.totalItemsQty.toLocaleString('id-ID')}</td>
                        <td className="p-2 border-r border-stone-300 text-right font-mono font-bold text-stone-900">{formatRupiah(sup.totalAmount)}</td>
                        <td className="p-2 border-r border-stone-300 text-right font-mono text-emerald-700 font-semibold">{formatRupiah(sup.totalPaid)}</td>
                        <td className="p-2 text-right font-mono text-amber-700 font-bold">{formatRupiah(sup.totalUnpaid)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-100 font-black text-stone-900 border-t-2 border-stone-900">
                    <td colSpan={4} className="p-2.5 text-right border-r border-stone-300 uppercase tracking-wider">
                      TOTAL KESELURUHAN:
                    </td>
                    <td className="p-2.5 text-center border-r border-stone-300 font-mono">
                      {filteredPurchases.length}
                    </td>
                    <td className="p-2.5 text-right border-r border-stone-300 font-mono">
                      {metrics.totalQty.toLocaleString('id-ID')}
                    </td>
                    <td className="p-2.5 text-right border-r border-stone-300 font-mono text-emerald-800">
                      {formatRupiah(metrics.totalSpend)}
                    </td>
                    <td className="p-2.5 text-right border-r border-stone-300 font-mono text-emerald-700">
                      {formatRupiah(metrics.totalPaid)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-amber-800">
                      {formatRupiah(metrics.totalUnpaid)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* 3. TIPE: RINCIAN ITEM / BARANG (ITEMIZED DETAIL) */}
          {reportType === 'items_detail' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-stone-300">
                <thead>
                  <tr className="bg-stone-100 text-stone-800 border-b border-stone-300 font-bold">
                    <th className="p-2 border-r border-stone-300 text-center w-10">No</th>
                    <th className="p-2 border-r border-stone-300">No PO</th>
                    <th className="p-2 border-r border-stone-300 text-center">Tanggal</th>
                    <th className="p-2 border-r border-stone-300">Pemasok</th>
                    <th className="p-2 border-r border-stone-300">Barcode</th>
                    <th className="p-2 border-r border-stone-300">Nama Barang / Produk</th>
                    <th className="p-2 border-r border-stone-300 text-right">Qty</th>
                    <th className="p-2 border-r border-stone-300 text-center">Satuan</th>
                    <th className="p-2 border-r border-stone-300 text-right">Harga Beli (HPP)</th>
                    <th className="p-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {flattenedItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-stone-500 italic">
                        Tidak ada item barang dalam periode ini.
                      </td>
                    </tr>
                  ) : (
                    flattenedItems.map((it, idx) => (
                      <tr key={idx} className="border-b border-stone-200 hover:bg-stone-50">
                        <td className="p-2 border-r border-stone-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border-r border-stone-300 font-mono text-stone-700">{it.purchaseNumber}</td>
                        <td className="p-2 border-r border-stone-300 text-center text-stone-600">{it.date}</td>
                        <td className="p-2 border-r border-stone-300 text-stone-800">{it.supplierName}</td>
                        <td className="p-2 border-r border-stone-300 font-mono text-[11px] text-stone-500">{it.barcode || '-'}</td>
                        <td className="p-2 border-r border-stone-300 font-bold text-stone-900">{it.productName}</td>
                        <td className="p-2 border-r border-stone-300 text-right font-mono font-bold">{it.quantity}</td>
                        <td className="p-2 border-r border-stone-300 text-center text-stone-700">{it.unit}</td>
                        <td className="p-2 border-r border-stone-300 text-right font-mono">{formatRupiah(it.costPrice)}</td>
                        <td className="p-2 text-right font-mono font-bold text-stone-900">{formatRupiah(it.subtotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-100 font-black text-stone-900 border-t-2 border-stone-900">
                    <td colSpan={6} className="p-2.5 text-right border-r border-stone-300 uppercase tracking-wider">
                      TOTAL RINCIAN ITEM:
                    </td>
                    <td className="p-2.5 text-right border-r border-stone-300 font-mono">
                      {flattenedItems.reduce((s, it) => s + it.quantity, 0).toLocaleString('id-ID')}
                    </td>
                    <td colSpan={2} className="p-2.5 border-r border-stone-300"></td>
                    <td className="p-2.5 text-right font-mono text-emerald-800 text-sm">
                      {formatRupiah(flattenedItems.reduce((s, it) => s + it.subtotal, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* 4. TIPE: LAPORAN HUTANG & JATUH TEMPO (PAYABLES & DUE DATES) */}
          {reportType === 'payables_tempo' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-stone-300">
                <thead>
                  <tr className="bg-stone-100 text-stone-800 border-b border-stone-300 font-bold">
                    <th className="p-2 border-r border-stone-300 text-center w-10">No</th>
                    <th className="p-2 border-r border-stone-300">No PO</th>
                    <th className="p-2 border-r border-stone-300">Faktur Supplier</th>
                    <th className="p-2 border-r border-stone-300 text-center">Tanggal Faktur</th>
                    <th className="p-2 border-r border-stone-300">Pemasok</th>
                    <th className="p-2 border-r border-stone-300 text-center">Jatuh Tempo</th>
                    <th className="p-2 border-r border-stone-300 text-center">Status Tempo</th>
                    <th className="p-2 border-r border-stone-300 text-right">Kuantitas</th>
                    <th className="p-2 text-right">Nominal Hutang</th>
                  </tr>
                </thead>
                <tbody>
                  {payablesList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-emerald-700 italic">
                        Alhamdulillah, semua faktur dalam filter ini sudah lunas atau tidak ada tagihan tempo!
                      </td>
                    </tr>
                  ) : (
                    payablesList.map((po, idx) => (
                      <tr key={po.id} className="border-b border-stone-200 hover:bg-stone-50">
                        <td className="p-2 border-r border-stone-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border-r border-stone-300 font-mono font-bold text-stone-900">{po.purchaseNumber}</td>
                        <td className="p-2 border-r border-stone-300 font-mono text-stone-600">{po.invoiceNumber || '-'}</td>
                        <td className="p-2 border-r border-stone-300 text-center text-stone-700">{po.orderDate}</td>
                        <td className="p-2 border-r border-stone-300 font-medium text-stone-900">{po.supplierName}</td>
                        <td className="p-2 border-r border-stone-300 text-center font-mono font-bold text-stone-800">{po.dueDate || '-'}</td>
                        <td className="p-2 border-r border-stone-300 text-center">
                          {po.isOverdue ? (
                            <span className="font-bold text-red-600">LEWAT TEMPO ({Math.abs(po.daysDiff)} Hari)</span>
                          ) : (
                            <span className="font-medium text-amber-700">{po.daysDiff} Hari Lagi</span>
                          )}
                        </td>
                        <td className="p-2 border-r border-stone-300 text-right font-mono">{po.totalQuantity || 0}</td>
                        <td className="p-2 text-right font-mono font-bold text-amber-800">{formatRupiah(po.totalAmount || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-100 font-black text-stone-900 border-t-2 border-stone-900">
                    <td colSpan={7} className="p-2.5 text-right border-r border-stone-300 uppercase tracking-wider">
                      TOTAL SISA HUTANG TEMPO:
                    </td>
                    <td className="p-2.5 text-right border-r border-stone-300 font-mono">
                      {payablesList.reduce((s, p) => s + (p.totalQuantity || 0), 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-2.5 text-right font-mono text-red-700 text-sm">
                      {formatRupiah(payablesList.reduce((s, p) => s + (p.totalAmount || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* 5. TIPE: DETAIL LENGKAP PER FAKTUR (INVOICE COMPLETE) */}
          {reportType === 'invoice_complete' && (
            <div className="space-y-6">
              {filteredPurchases.length === 0 ? (
                <div className="p-8 text-center text-stone-500 border border-stone-200 rounded-2xl italic">
                  Tidak ada faktur pembelian yang cocok dengan filter kriteria.
                </div>
              ) : (
                filteredPurchases.map((po, idx) => (
                  <div key={po.id} className="border border-stone-300 rounded-xl p-3.5 space-y-3 break-inside-avoid">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-2 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-500 font-mono">#{idx + 1}</span>
                          <span className="font-black text-stone-900 font-mono text-sm">{po.purchaseNumber}</span>
                          {po.invoiceNumber && (
                            <span className="text-stone-500 font-mono">(Faktur: {po.invoiceNumber})</span>
                          )}
                        </div>
                        <div className="text-stone-600 mt-0.5">
                          Pemasok: <strong className="text-stone-900">{po.supplierName}</strong> | Tanggal: <strong>{po.orderDate}</strong>
                        </div>
                      </div>

                      <div className="text-right mt-1 sm:mt-0">
                        <div className="font-black text-emerald-800 text-sm font-mono">
                          {formatRupiah(po.totalAmount || 0)}
                        </div>
                        <div className="text-[11px] text-stone-600">
                          Status: <strong className={po.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}>
                            {po.paymentStatus === 'paid' ? 'LUNAS' : `TEMPO (${po.dueDate || 'Belum diatur'})`}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Sub Table Items */}
                    <table className="w-full text-xs text-left border-collapse border border-stone-200">
                      <thead>
                        <tr className="bg-stone-50 text-stone-700 border-b border-stone-200 text-[11px]">
                          <th className="p-1.5 border-r border-stone-200 text-center w-8">No</th>
                          <th className="p-1.5 border-r border-stone-200">Nama Barang</th>
                          <th className="p-1.5 border-r border-stone-200 text-center">Barcode</th>
                          <th className="p-1.5 border-r border-stone-200 text-right">Qty</th>
                          <th className="p-1.5 border-r border-stone-200 text-center">Satuan</th>
                          <th className="p-1.5 border-r border-stone-200 text-right">Harga Beli</th>
                          <th className="p-1.5 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(po.items || []).map((it, itIdx) => (
                          <tr key={itIdx} className="border-b border-stone-100">
                            <td className="p-1.5 border-r border-stone-200 text-center text-stone-500">{itIdx + 1}</td>
                            <td className="p-1.5 border-r border-stone-200 font-medium text-stone-900">{it.productName}</td>
                            <td className="p-1.5 border-r border-stone-200 text-center font-mono text-[10px] text-stone-500">{it.barcode || '-'}</td>
                            <td className="p-1.5 border-r border-stone-200 text-right font-mono font-bold">{it.quantity}</td>
                            <td className="p-1.5 border-r border-stone-200 text-center text-stone-600">{it.unit}</td>
                            <td className="p-1.5 border-r border-stone-200 text-right font-mono">{formatRupiah(it.costPrice)}</td>
                            <td className="p-1.5 text-right font-mono font-bold text-stone-900">{formatRupiah(it.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {po.notes && (
                      <div className="text-[11px] text-stone-500 italic bg-stone-50 p-2 rounded-lg">
                        Catatan: {po.notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* KOLOM 3 TANDA TANGAN RESMI CETAK (PRINT SIGNATURES)       */}
          {/* ========================================================= */}
          <div className="pt-8 border-t border-stone-300 mt-6 break-inside-avoid">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <p className="font-bold text-stone-600 uppercase tracking-wider text-[11px]">Dibuat Oleh:</p>
                <div className="h-16"></div>
                <div className="border-b border-stone-400 w-36 mx-auto"></div>
                <p className="font-bold text-stone-900 mt-1">Bagian Pembelian</p>
                <p className="text-[10px] text-stone-500">Purchasing / Admin</p>
              </div>

              <div>
                <p className="font-bold text-stone-600 uppercase tracking-wider text-[11px]">Diperiksa Oleh:</p>
                <div className="h-16"></div>
                <div className="border-b border-stone-400 w-36 mx-auto"></div>
                <p className="font-bold text-stone-900 mt-1">Petugas Gudang / Finansial</p>
                <p className="text-[10px] text-stone-500">Penerimaan & Validasi</p>
              </div>

              <div>
                <p className="font-bold text-stone-600 uppercase tracking-wider text-[11px]">Disetujui Oleh:</p>
                <div className="h-16"></div>
                <div className="border-b border-stone-400 w-36 mx-auto"></div>
                <p className="font-bold text-stone-900 mt-1">Pimpinan / Store Manager</p>
                <p className="text-[10px] text-stone-500">Penanggung Jawab Usaha</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
