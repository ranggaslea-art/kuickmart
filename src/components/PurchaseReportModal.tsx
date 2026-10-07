import React, { useState, useMemo } from 'react';
import { PurchaseOrder, Supplier, Store, Product } from '../types';
import { formatRupiah } from '../utils/formatters';
import { 
  printHtmlDirectly, 
  generateSinglePurchaseOrderHtml, 
  generateSinglePurchaseInvoiceHtml 
} from '../utils/printDocumentHelper';
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
  FileSpreadsheet,
  ShoppingBag,
  ClipboardList
} from 'lucide-react';

export type PurchaseReportType = 
  | 'single_document'
  | 'invoices_summary' 
  | 'supplier_summary' 
  | 'items_detail' 
  | 'payables_tempo';

interface PurchaseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchases: PurchaseOrder[];
  suppliers: Supplier[];
  stores: Store[];
  products: Product[];
  currentStore?: Store;
  mode?: 'po_order' | 'purchase_invoice' | 'all';
  initialReportType?: PurchaseReportType;
  initialPoId?: string;
}

export const PurchaseReportModal: React.FC<PurchaseReportModalProps> = ({
  isOpen,
  onClose,
  purchases = [],
  suppliers = [],
  stores = [],
  products = [],
  currentStore,
  mode = 'all',
  initialReportType = 'invoices_summary',
  initialPoId = '',
}) => {
  // Active Sub-Mode: 'po_order' (Pemesanan ke salesman) or 'purchase_invoice' (Pembelian masuk gudang)
  const [activeMode, setActiveMode] = useState<'po_order' | 'purchase_invoice' | 'all'>(mode);

  // Sync mode if changed from props
  React.useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  // Report Configuration States
  const [reportType, setReportType] = useState<PurchaseReportType>(initialReportType);
  
  React.useEffect(() => {
    if (initialReportType) {
      setReportType(initialReportType);
    }
  }, [initialReportType, isOpen]);

  // Single document selector for 'single_document' tab
  const [selectedSinglePoId, setSelectedSinglePoId] = useState<string>(initialPoId);

  React.useEffect(() => {
    if (initialPoId) {
      setSelectedSinglePoId(initialPoId);
    }
  }, [initialPoId, isOpen]);

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

  // Active Store for Kop Surat
  const storeInfo: Store = currentStore || stores[0] || ({
    id: 'store_1',
    name: 'KUICKMART STORE',
    code: 'KM-01',
    address: 'Jl. Raya Utama No. 88, Sentra Niaga',
    phone: '0812-3456-7890',
    city: 'Jakarta',
    distanceKm: 0,
    is24Hours: true,
    isOpen: true,
    rating: 5,
    reviewsCount: 100,
    features: ['POS', 'Gudang'],
  } as unknown as Store);

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

  // Filtered Purchases list based on mode & criteria
  const filteredPurchases = useMemo(() => {
    if (!Array.isArray(purchases)) return [];
    return purchases.filter(po => {
      if (!po) return false;

      // 0. Filter Mode (PO Pemesanan vs Pembelian Riil)
      if (activeMode === 'po_order') {
        const isPo = po.type === 'po_order' || (!po.stockUpdated && po.status !== 'received');
        if (!isPo) return false;
      } else if (activeMode === 'purchase_invoice') {
        const isInvoice = po.type === 'purchase_invoice' || po.stockUpdated || po.status === 'received';
        if (!isInvoice) return false;
      }

      // 1. Date Filter
      const poDateStr = String(po.receivedDate || po.orderDate || po.createdAt || '').slice(0, 10);
      if (startDate && poDateStr && poDateStr < startDate) return false;
      if (endDate && poDateStr && poDateStr > endDate) return false;

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
        const matchSalesman = po.salesmanName?.toLowerCase().includes(q);
        const matchItem = (Array.isArray(po.items) ? po.items : []).some(
          it => it && (it.productName?.toLowerCase().includes(q) || it.barcode?.toLowerCase().includes(q))
        );
        if (!matchPoNum && !matchInvNum && !matchSupName && !matchSalesman && !matchItem) {
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
      const dateA = new Date(a.receivedDate || a.orderDate || a.createdAt || 0).getTime() || 0;
      const dateB = new Date(b.receivedDate || b.orderDate || b.createdAt || 0).getTime() || 0;
      return dateB - dateA;
    });
  }, [
    purchases, 
    activeMode,
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

    filteredPurchases.forEach(po => {
      totalSpend += po.totalAmount || 0;
      totalQty += po.totalQuantity || (po.items || []).reduce((sum, it) => sum + (it?.quantity || 0), 0);

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
          totalItemsQty: po.totalQuantity || (po.items || []).reduce((sum, it) => sum + (it?.quantity || 0), 0),
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
        item.totalItemsQty += po.totalQuantity || (po.items || []).reduce((sum, it) => sum + (it?.quantity || 0), 0);
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
      costPrice: number;
      subtotal: number;
    }> = [];

    filteredPurchases.forEach(po => {
      (Array.isArray(po.items) ? po.items : []).forEach(it => {
        if (!it) return;
        rows.push({
          purchaseNumber: po.purchaseNumber,
          invoiceNumber: po.invoiceNumber,
          date: po.receivedDate || po.orderDate || (po.createdAt ? String(po.createdAt).slice(0, 10) : '') || new Date().toISOString().slice(0, 10),
          supplierName: po.supplierName || 'Pemasok Umum',
          productName: it.productName || 'Item',
          barcode: it.barcode,
          unit: it.unit || 'Pcs',
          quantity: it.quantity || 0,
          costPrice: it.costPrice || 0,
          subtotal: it.subtotal || ((it.quantity || 0) * (it.costPrice || 0)),
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
          if (!isNaN(due.getTime())) {
            daysDiff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            isOverdue = daysDiff < 0;
          }
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

  // Selected single document
  const selectedSingleDoc = useMemo(() => {
    if (selectedSinglePoId) {
      return filteredPurchases.find(p => p.id === selectedSinglePoId) || filteredPurchases[0] || null;
    }
    return filteredPurchases[0] || null;
  }, [filteredPurchases, selectedSinglePoId]);

  // Format Dynamic Report Title
  const reportTitle = useMemo(() => {
    let base = activeMode === 'po_order' 
      ? 'LAPORAN PEMESANAN BARANG (PURCHASE ORDERS KE SALESMAN)' 
      : activeMode === 'purchase_invoice' 
      ? 'LAPORAN PEMBELIAN & PENERIMAAN BARANG GUDANG'
      : 'LAPORAN REKAP PEMBELIAN & PO';

    if (reportType === 'supplier_summary') base += ' - PER PEMASOK';
    else if (reportType === 'items_detail') base += ' - RINCIAN ITEM';
    else if (reportType === 'payables_tempo') base += ' - HUTANG TEMPO';

    if (selectedSupplierId !== 'all') {
      const sup = suppliers.find(s => s.id === selectedSupplierId);
      if (sup?.name) base += ` - ${sup.name.toUpperCase()}`;
    }

    if (invoiceQuery.trim()) {
      base += ` (PENCARIAN: ${invoiceQuery.toUpperCase()})`;
    }

    return base;
  }, [activeMode, reportType, selectedSupplierId, invoiceQuery, suppliers]);

  // Handle Browser Print via isolated iframe
  const handlePrint = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (reportType === 'single_document' && selectedSingleDoc) {
      // CETAK 1 LEMBAR DOKUMEN SATUAN
      const isInvoice = selectedSingleDoc.type === 'purchase_invoice' || selectedSingleDoc.stockUpdated || selectedSingleDoc.status === 'received';
      const targetStore = stores.find(s => s.id === selectedSingleDoc.storeId) || storeInfo;
      const targetSup = suppliers.find(s => s.id === selectedSingleDoc.supplierId);
      
      const html = isInvoice
        ? generateSinglePurchaseInvoiceHtml(selectedSingleDoc, targetStore, targetSup)
        : generateSinglePurchaseOrderHtml(selectedSingleDoc, targetStore, targetSup);

      printHtmlDirectly(html, {
        title: isInvoice ? `Faktur_Beli_${selectedSingleDoc.purchaseNumber}` : `Surat_PO_${selectedSingleDoc.purchaseNumber}`
      });
    } else {
      // CETAK REKAP LAPORAN LENGKAP
      const el = document.getElementById('printable-purchase-report');
      if (el) {
        printHtmlDirectly(el.innerHTML, { title: reportTitle });
      }
    }
  };

  // Export to Excel XML
  const handleExportExcel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
      rowsHtml = filteredPurchases.map((po, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${po.purchaseNumber}</td>
          <td>${po.invoiceNumber || '-'}</td>
          <td>${po.orderDate}</td>
          <td>${po.supplierName}</td>
          <td>${po.paymentMethod === 'tempo' ? 'Tempo' : 'Tunai'}</td>
          <td>${po.dueDate || '-'}</td>
          <td>${po.paymentStatus === 'paid' ? 'LUNAS' : 'TEMPO'}</td>
          <td>${po.stockUpdated ? 'Stok Masuk Gudang' : 'Belum Tambah Stok'}</td>
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
          table { border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 11px; }
          th { background-color: #065f46; color: #ffffff; font-weight: bold; border: 1px solid #cccccc; padding: 6px; }
          td { border: 1px solid #e5e7eb; padding: 5px; }
          .title { font-size: 16px; font-weight: bold; color: #065f46; }
        </style>
      </head>
      <body>
        <div class="title">${(cleanStoreName || 'TOKO').toUpperCase()}</div>
        <div style="font-size: 13px; font-weight: bold; margin-bottom: 6px;">${reportTitle}</div>
        <div style="font-size: 10px; color: #666; margin-bottom: 12px;">Periode: ${startDate} s/d ${endDate} | Diekspor: ${new Date().toLocaleString('id-ID')}</div>
        <table>
          <thead>
            ${reportType === 'supplier_summary' ? `
              <tr>
                <th>No</th><th>Pemasok</th><th>Kontak</th><th>No HP</th><th>Jumlah Transaksi</th><th>Total Qty</th><th>Total Belanja</th><th>Sudah Dibayar</th><th>Sisa Hutang</th>
              </tr>
            ` : reportType === 'items_detail' ? `
              <tr>
                <th>No</th><th>No PO / Dokumen</th><th>Faktur Supplier</th><th>Tanggal</th><th>Pemasok</th><th>Barcode</th><th>Nama Barang</th><th>Qty</th><th>Satuan</th><th>Harga Beli</th><th>Subtotal</th>
              </tr>
            ` : `
              <tr>
                <th>No</th><th>No PO / Faktur</th><th>Ref Faktur Vendor</th><th>Tanggal</th><th>Pemasok</th><th>Metode</th><th>Jatuh Tempo</th><th>Status Bayar</th><th>Status Stok</th><th>Total Qty</th><th>Total Nilai</th>
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
    a.download = `Laporan_${activeMode === 'po_order' ? 'Pemesanan_PO' : 'Pembelian'}_${startDate}_sd_${endDate}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl border border-stone-200 space-y-4 my-4 max-h-[96vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0 print:my-0"
      >
        
        {/* NON-PRINT CONTROLS TOOLBAR */}
        <div className="print:hidden space-y-3.5 border-b border-stone-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2.5 rounded-2xl ${activeMode === 'po_order' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {activeMode === 'po_order' ? <ClipboardList className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-extrabold text-stone-900 text-lg">
                  {activeMode === 'po_order' 
                    ? 'Laporan Pemesanan Pembelian (PO ke Salesman)' 
                    : activeMode === 'purchase_invoice'
                    ? 'Laporan Pembelian Barang Masuk Gudang'
                    : 'Laporan Pembelian & Pemesanan Barang'}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                    activeMode === 'po_order' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {activeMode === 'po_order' ? 'Dokumen Pemesanan • Tidak Menambah Stok' : 'Faktur Beli • Otomatis Tambah Stok Gudang'}
                  </span>
                  <span className="text-xs text-stone-500">Filter fleksibel periode, vendor, & cetak rapi resmi</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Ekspor Excel (.xls)</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-colors cursor-pointer ${
                  reportType === 'single_document'
                    ? (activeMode === 'po_order' ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-300' : 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300')
                    : 'bg-stone-800 hover:bg-stone-900'
                }`}
                title={reportType === 'single_document' ? 'Cetak 1 Lembar Dokumen Ini Sahaja' : 'Cetak Rekapitulasi Tabel Laporan'}
              >
                <Printer className="w-4 h-4" />
                <span>
                  {reportType === 'single_document' 
                    ? `Cetak 1 ${activeMode === 'po_order' ? 'Surat PO' : 'Faktur'} (${selectedSingleDoc?.purchaseNumber || 'Satuan'})` 
                    : `Cetak Rekap Laporan (${filteredPurchases.length} Dokumen)`}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* PILIHAN MODE LAPORAN (PO vs PEMBELIAN MASUK) */}
          <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveMode('po_order')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'po_order' ? 'bg-white text-blue-800 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Modul Pemesanan (PO Salesman)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('purchase_invoice')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'purchase_invoice' ? 'bg-white text-emerald-800 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
              <span>2. Modul Pembelian (Stok Masuk)</span>
            </button>
          </div>

          {/* TIPE LAPORAN TABS */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-stone-100 p-1.5 rounded-2xl">
            {/* TAB 1: CETAK 1 DOKUMEN SATUAN */}
            <button
              type="button"
              onClick={() => setReportType('single_document')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === 'single_document' 
                  ? (activeMode === 'po_order' ? 'bg-blue-600 text-white shadow-xs font-extrabold' : 'bg-emerald-600 text-white shadow-xs font-extrabold')
                  : 'text-stone-600 hover:text-stone-900 bg-white/60'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>1. Cetak 1 Dokumen Satuan</span>
            </button>

            {/* TAB 2: REKAP SEMUA FAKTUR */}
            <button
              type="button"
              onClick={() => setReportType('invoices_summary')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === 'invoices_summary' 
                  ? 'bg-white text-stone-900 shadow-xs font-extrabold' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>{activeMode === 'po_order' ? '2. Rekap Pesanan PO' : '2. Rekap Faktur Beli'}</span>
            </button>

            {/* TAB 3: PER PEMASOK */}
            <button
              type="button"
              onClick={() => setReportType('supplier_summary')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === 'supplier_summary' 
                  ? 'bg-white text-stone-900 shadow-xs font-extrabold' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>3. Per Pemasok</span>
            </button>

            {/* TAB 4: RINCIAN BARANG */}
            <button
              type="button"
              onClick={() => setReportType('items_detail')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === 'items_detail' 
                  ? 'bg-white text-stone-900 shadow-xs font-extrabold' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-blue-600" />
              <span>4. Rincian Barang</span>
            </button>

            {/* TAB 5: HUTANG & TEMPO */}
            {activeMode === 'purchase_invoice' ? (
              <button
                type="button"
                onClick={() => setReportType('payables_tempo')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  reportType === 'payables_tempo' 
                    ? 'bg-white text-stone-900 shadow-xs font-extrabold' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>5. Hutang & Tempo</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setReportType('single_document')}
                className="hidden sm:flex items-center justify-center opacity-0 pointer-events-none"
              >
                <span>-</span>
              </button>
            )}
          </div>

          {/* FILTER CONTROLS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-stone-50 p-3 rounded-2xl border border-stone-200">
            {/* Periode Preset & Tanggal */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-600" />
                <span>Periode Tanggal:</span>
              </label>
              <select
                value={datePreset}
                onChange={(e) => handleDatePresetChange(e.target.value as any)}
                className="w-full text-xs bg-white border border-stone-200 rounded-xl px-2 py-1.5 font-medium text-stone-800 focus:outline-none"
              >
                <option value="today">Hari Ini</option>
                <option value="7days">7 Hari Terakhir</option>
                <option value="this_month">Bulan Ini</option>
                <option value="last_month">Bulan Lalu</option>
                <option value="this_year">Tahun Ini</option>
                <option value="all">Semua Waktu</option>
                <option value="custom">Kustom Tanggal</option>
              </select>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-1/2 text-[10px] bg-white border border-stone-200 rounded-lg px-1.5 py-1 text-stone-700"
                />
                <span className="text-stone-400 text-xs">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-1/2 text-[10px] bg-white border border-stone-200 rounded-lg px-1.5 py-1 text-stone-700"
                />
              </div>
            </div>

            {/* Filter Pemasok */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-600" />
                <span>Pemasok / Vendor:</span>
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full text-xs bg-white border border-stone-200 rounded-xl px-2 py-1.5 font-medium text-stone-800 focus:outline-none"
              >
                <option value="all">-- Semua Pemasok ({suppliers.length}) --</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-3 h-3 text-stone-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Cari No Dokumen / Barang..."
                  value={invoiceQuery}
                  onChange={(e) => setInvoiceQuery(e.target.value)}
                  className="w-full text-xs bg-white border border-stone-200 rounded-xl pl-7 pr-2 py-1 text-stone-800 focus:outline-none"
                />
              </div>
            </div>

            {/* Filter Status Bayar & Barang */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                <Filter className="w-3 h-3 text-emerald-600" />
                <span>Status & Pembayaran:</span>
              </label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full text-xs bg-white border border-stone-200 rounded-xl px-2 py-1.5 font-medium text-stone-800 focus:outline-none"
              >
                <option value="all">Semua Status Bayar</option>
                <option value="paid">Lunas (Paid)</option>
                <option value="unpaid">Tempo / Hutang (Unpaid)</option>
              </select>

              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="w-full text-xs bg-white border border-stone-200 rounded-xl px-2 py-1.5 font-medium text-stone-800 focus:outline-none"
              >
                <option value="all">Semua Status Fisik</option>
                <option value="received">Sudah Diterima (Received)</option>
                <option value="ordered">Masih Dipesan (Ordered)</option>
              </select>
            </div>

            {/* Cabang & Reset */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-emerald-600" />
                <span>Lokasi Toko / Cabang:</span>
              </label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full text-xs bg-white border border-stone-200 rounded-xl px-2 py-1.5 font-medium text-stone-800 focus:outline-none"
              >
                <option value="all">Semua Cabang Toko</option>
                {stores.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setDatePreset('this_month');
                  handleDatePresetChange('this_month');
                  setSelectedSupplierId('all');
                  setInvoiceQuery('');
                  setPaymentStatusFilter('all');
                  setStockStatusFilter('all');
                  setSelectedStoreId('all');
                }}
                className="w-full text-[11px] font-bold py-1 px-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl transition-colors cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* VIEW 1: PILIHAN CETAK 1 LEMBAR DOKUMEN SATUAN             */}
        {/* ======================================================== */}
        {reportType === 'single_document' ? (
          <div className="space-y-4 print:hidden">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-stone-900 text-sm">
                  Pilih Dokumen yang Akan Dicetak (1 Faktur / PO Saja)
                </h4>
                <p className="text-xs text-stone-600">
                  Hanya mencetak 1 dokumen terpilih resmi dengan kop toko & tanda tangan (bukan rekap seluruh faktur).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedSingleDoc?.id || ''}
                  onChange={(e) => setSelectedSinglePoId(e.target.value)}
                  className="bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none min-w-[220px]"
                >
                  {filteredPurchases.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.purchaseNumber} - {p.supplierName} ({formatRupiah(p.totalAmount)})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!selectedSingleDoc}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen Ini</span>
                </button>
              </div>
            </div>

            {selectedSingleDoc ? (
              <div className="border border-stone-200 rounded-2xl p-5 bg-white space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-stone-100 rounded-md">
                      {selectedSingleDoc.type === 'purchase_invoice' || selectedSingleDoc.stockUpdated ? 'FAKTUR PEMBELIAN GUDANG' : 'SURAT PESANAN PEMBELIAN (PO)'}
                    </span>
                    <div className="text-lg font-black font-mono text-stone-900 mt-1">
                      {selectedSingleDoc.purchaseNumber}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-emerald-800 font-mono">
                      {formatRupiah(selectedSingleDoc.totalAmount)}
                    </div>
                    <div className="text-xs text-stone-500">
                      Tgl: {selectedSingleDoc.receivedDate || selectedSingleDoc.orderDate}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-stone-50 rounded-xl">
                    <div className="font-bold text-stone-500 text-[10px] uppercase">Vendor / Pemasok:</div>
                    <div className="font-bold text-sm text-stone-900">{selectedSingleDoc.supplierName}</div>
                    {selectedSingleDoc.salesmanName && (
                      <div className="text-stone-600 mt-0.5">Salesman: {selectedSingleDoc.salesmanName}</div>
                    )}
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl">
                    <div className="font-bold text-stone-500 text-[10px] uppercase">Status Stok & Bayar:</div>
                    <div className="font-bold text-stone-900">
                      {selectedSingleDoc.stockUpdated ? '✓ Stok Sudah Masuk Gudang' : 'Pesanan PO (Belum Tambah Stok)'}
                    </div>
                    <div className="text-stone-600 mt-0.5">
                      Pembayaran: <span className="font-bold uppercase">{selectedSingleDoc.paymentMethod}</span> ({selectedSingleDoc.paymentStatus === 'paid' ? 'LUNAS' : 'TEMPO'})
                    </div>
                  </div>
                </div>

                <table className="w-full text-xs border border-stone-200 rounded-xl overflow-hidden">
                  <thead className="bg-stone-100 text-stone-700 font-bold">
                    <tr>
                      <th className="p-2 text-center w-10">No</th>
                      <th className="p-2">Nama Barang</th>
                      <th className="p-2 text-center">Satuan</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Harga Modal</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSingleDoc.items || []).map((it, idx) => (
                      <tr key={idx} className="border-t border-stone-200">
                        <td className="p-2 text-center">{idx + 1}</td>
                        <td className="p-2 font-bold text-stone-900">{it.productName}</td>
                        <td className="p-2 text-center text-stone-600">{it.unit || 'Pcs'}</td>
                        <td className="p-2 text-center font-bold">{it.quantity}</td>
                        <td className="p-2 text-right">{formatRupiah(it.costPrice)}</td>
                        <td className="p-2 text-right font-bold text-stone-900">{formatRupiah(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-stone-400 border border-stone-200 rounded-2xl italic">
                Tidak ada dokumen yang cocok dengan filter tanggal & vendor saat ini.
              </div>
            )}
          </div>
        ) : (
          /* ======================================================== */
          /* VIEW 2: DOKUMEN REKAP LAPORAN LENGKAP                     */
          /* ======================================================== */
          <div id="printable-purchase-report" className="print-area-wrapper bg-white text-stone-900 space-y-4 p-1 sm:p-2">
            
            {/* KOP SURAT RESMI TOKO */}
            <div className="border-b-2 border-stone-900 pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-stone-900">
                    {storeInfo.name}
                  </h1>
                  <p className="text-xs text-stone-600 mt-0.5 max-w-md">
                    {storeInfo.address || 'Pusat Distribusi & Retail'}
                  </p>
                  <p className="text-xs text-stone-600">
                    Telepon / WhatsApp: <strong>{storeInfo.phone || '-'}</strong> | Kota: {storeInfo.city || 'Indonesia'}
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-stone-900 text-white text-[10px] font-black tracking-widest px-2.5 py-1 rounded-sm uppercase">
                    DOKUMEN RESMI TOKO
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1.5">
                    Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Waktu: {new Date().toLocaleTimeString('id-ID')} WIB
                  </div>
                </div>
              </div>

              {/* JUDUL LAPORAN */}
              <div className="mt-3 pt-2.5 border-t border-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wide text-stone-900">
                    {reportTitle}
                  </h2>
                  <div className="text-xs text-stone-600 flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                    <span>Periode: <strong>{startDate} s/d {endDate}</strong></span>
                    {selectedSupplierId !== 'all' && (
                      <span>Pemasok: <strong>{suppliers.find(s => s.id === selectedSupplierId)?.name}</strong></span>
                    )}
                    {paymentStatusFilter !== 'all' && (
                      <span>Status: <strong>{paymentStatusFilter === 'paid' ? 'Lunas' : 'Tempo'}</strong></span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-stone-500 font-mono">
                  Total Ditemukan: <strong className="text-stone-900">{filteredPurchases.length} Dokumen</strong>
                </div>
              </div>
            </div>

            {/* RINGKASAN KPI CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                <div className="text-[10px] text-stone-500 font-medium">Total Nilai Transaksi</div>
                <div className="text-sm font-black text-stone-900 mt-0.5">{formatRupiah(metrics.totalSpend)}</div>
                <div className="text-[9px] text-stone-500">{filteredPurchases.length} dokumen</div>
              </div>

              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                <div className="text-[10px] text-stone-500 font-medium">Total Kuantitas Fisik</div>
                <div className="text-sm font-black text-stone-900 mt-0.5">{metrics.totalQty.toLocaleString('id-ID')} Pcs/Dus</div>
                <div className="text-[9px] text-stone-500">Kuantitas terinput</div>
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="text-[10px] text-emerald-800 font-medium">Sudah Dibayar (Lunas)</div>
                <div className="text-sm font-black text-emerald-700 mt-0.5">{formatRupiah(metrics.totalPaid)}</div>
                <div className="text-[9px] text-emerald-600">Tunai / Transfer lunas</div>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="text-[10px] text-amber-800 font-medium">Sisa Hutang Tempo</div>
                <div className="text-sm font-black text-amber-700 mt-0.5">{formatRupiah(metrics.totalUnpaid)}</div>
                <div className="text-[9px] text-amber-600">Tagihan berjalan</div>
              </div>
            </div>

            {/* 1. TIPE: REKAP FAKTUR / DOKUMEN */}
            {reportType === 'invoices_summary' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-stone-300">
                  <thead>
                    <tr className="bg-stone-100 text-stone-800 border-b border-stone-300 font-bold">
                      <th className="p-2 border-r border-stone-300 text-center w-10">No</th>
                      <th className="p-2 border-r border-stone-300">No PO / Faktur</th>
                      <th className="p-2 border-r border-stone-300">Ref Faktur Supplier</th>
                      <th className="p-2 border-r border-stone-300 text-center">Tanggal</th>
                      <th className="p-2 border-r border-stone-300">Pemasok / Vendor</th>
                      <th className="p-2 border-r border-stone-300 text-center">Metode</th>
                      <th className="p-2 border-r border-stone-300 text-center">Jatuh Tempo</th>
                      <th className="p-2 border-r border-stone-300 text-center">Status Bayar</th>
                      <th className="p-2 border-r border-stone-300 text-center">Status Stok</th>
                      <th className="p-2 border-r border-stone-300 text-right">Qty</th>
                      <th className="p-2 text-right">Total Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-6 text-center text-stone-500 italic">
                          Tidak ada transaksi yang cocok dengan kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      filteredPurchases.map((po, idx) => (
                        <tr key={po.id} className="border-b border-stone-200 hover:bg-stone-50">
                          <td className="p-2 border-r border-stone-300 text-center font-mono">{idx + 1}</td>
                          <td className="p-2 border-r border-stone-300 font-mono font-bold text-stone-900">{po.purchaseNumber}</td>
                          <td className="p-2 border-r border-stone-300 font-mono text-stone-600">{po.invoiceNumber || '-'}</td>
                          <td className="p-2 border-r border-stone-300 text-center text-stone-700">{po.receivedDate || po.orderDate}</td>
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
                          <td className="p-2 border-r border-stone-300 text-center text-[10px]">
                            {po.stockUpdated ? (
                              <span className="font-bold text-emerald-700">✓ Masuk Gudang</span>
                            ) : (
                              <span className="font-medium text-blue-700">Order Salesman</span>
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
                      <td colSpan={9} className="p-2.5 text-right border-r border-stone-300 uppercase tracking-wider">
                        GRAND TOTAL:
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

            {/* 2. TIPE: REKAP PER PEMASOK */}
            {reportType === 'supplier_summary' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-stone-300">
                  <thead>
                    <tr className="bg-stone-100 text-stone-800 border-b border-stone-300 font-bold">
                      <th className="p-2 border-r border-stone-300 text-center w-10">No</th>
                      <th className="p-2 border-r border-stone-300">Nama Pemasok (Supplier)</th>
                      <th className="p-2 border-r border-stone-300">Kontak Person</th>
                      <th className="p-2 border-r border-stone-300">Telepon / HP</th>
                      <th className="p-2 border-r border-stone-300 text-center">Jumlah Transaksi</th>
                      <th className="p-2 border-r border-stone-300 text-right">Total Item Fisik</th>
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

            {/* 3. TIPE: RINCIAN ITEM / BARANG */}
            {reportType === 'items_detail' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-stone-300">
                  <thead>
                    <tr className="bg-stone-100 text-stone-800 border-b border-stone-300 font-bold">
                      <th className="p-2 border-r border-stone-300 text-center w-10">No</th>
                      <th className="p-2 border-r border-stone-300">No PO / Faktur</th>
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
                          Tidak ada rincian item dalam periode filter ini.
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
                        {flattenedItems.reduce((s, it) => s + (it.quantity || 0), 0).toLocaleString('id-ID')}
                      </td>
                      <td colSpan={2} className="p-2.5 border-r border-stone-300"></td>
                      <td className="p-2.5 text-right font-mono text-emerald-800 text-sm">
                        {formatRupiah(flattenedItems.reduce((s, it) => s + (it.subtotal || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* 4. TIPE: LAPORAN HUTANG TEMPO */}
            {reportType === 'payables_tempo' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-stone-300">
                  <thead>
                    <tr className="bg-stone-100 text-stone-800 border-b border-stone-300 font-bold">
                      <th className="p-2 border-r border-stone-300 text-center w-10">No</th>
                      <th className="p-2 border-r border-stone-300">No Faktur</th>
                      <th className="p-2 border-r border-stone-300">Faktur Supplier</th>
                      <th className="p-2 border-r border-stone-300 text-center">Tanggal</th>
                      <th className="p-2 border-r border-stone-300">Pemasok</th>
                      <th className="p-2 border-r border-stone-300 text-center">Jatuh Tempo</th>
                      <th className="p-2 border-r border-stone-300 text-center">Status Tempo</th>
                      <th className="p-2 border-r border-stone-300 text-right">Qty</th>
                      <th className="p-2 text-right">Nominal Tagihan</th>
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
                          <td className="p-2 border-r border-stone-300 text-center text-stone-700">{po.receivedDate || po.orderDate}</td>
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

            {/* KOLOM 3 TANDA TANGAN RESMI CETAK (HORIZONTAL 3 KOLOM SEJAJAR) */}
            <div 
              className="pt-6 border-t border-stone-300 mt-6 break-inside-avoid" 
              style={{ pageBreakInside: 'avoid', marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #d1d5db' }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', margin: '0 auto', tableLayout: 'fixed' }}>
                <tbody>
                  <tr style={{ border: 'none' }}>
                    <td style={{ width: '33.333%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '8px 12px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#4b5563', letterSpacing: '0.5px' }}>DIBUAT OLEH:</div>
                      <div style={{ height: '54px' }}></div>
                      <div style={{ width: '140px', margin: '0 auto', borderBottom: '1.5px solid #111827' }}></div>
                      <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#111827', marginTop: '5px' }}>Bagian Pembelian</div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>Purchasing / Admin</div>
                    </td>

                    <td style={{ width: '33.333%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '8px 12px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#4b5563', letterSpacing: '0.5px' }}>DIPERIKSA OLEH:</div>
                      <div style={{ height: '54px' }}></div>
                      <div style={{ width: '140px', margin: '0 auto', borderBottom: '1.5px solid #111827' }}></div>
                      <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#111827', marginTop: '5px' }}>Petugas Gudang / Finansial</div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>Penerimaan & Validasi</div>
                    </td>

                    <td style={{ width: '33.333%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '8px 12px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#4b5563', letterSpacing: '0.5px' }}>DISETUJUI OLEH:</div>
                      <div style={{ height: '54px' }}></div>
                      <div style={{ width: '140px', margin: '0 auto', borderBottom: '1.5px solid #111827' }}></div>
                      <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#111827', marginTop: '5px' }}>Pimpinan / Store Manager</div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>Penanggung Jawab Usaha</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
