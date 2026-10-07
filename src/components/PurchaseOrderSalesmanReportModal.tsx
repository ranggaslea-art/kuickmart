import React, { useState, useMemo } from 'react';
import { PurchaseOrder, Supplier, Store, Product } from '../types';
import { formatRupiah } from '../utils/formatters';
import { printHtmlDirectly } from '../utils/printDocumentHelper';
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
  Truck
} from 'lucide-react';

export type PoReportType = 
  | 'po_summary' 
  | 'po_outstanding' 
  | 'po_by_supplier' 
  | 'po_items_detail';

interface PurchaseOrderSalesmanReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchases: PurchaseOrder[];
  suppliers: Supplier[];
  stores: Store[];
  products: Product[];
  currentStore?: Store;
}

export const PurchaseOrderSalesmanReportModal: React.FC<PurchaseOrderSalesmanReportModalProps> = ({
  isOpen,
  onClose,
  purchases = [],
  suppliers = [],
  stores = [],
  products = [],
  currentStore,
}) => {
  const [reportType, setReportType] = useState<PoReportType>('po_summary');
  
  // Date Period Filter
  const [datePreset, setDatePreset] = useState<'today' | '7days' | 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Filters
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'received'>('all');

  const storeInfo = currentStore || stores[0] || {
    id: 'store_1',
    name: 'KUICKMART STORE',
    address: 'Jl. Raya Utama No. 88, Sentra Niaga',
    phone: '0812-3456-7890',
    city: 'Jakarta',
  };

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

  // Filtered POs
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(purchases)) return [];
    return purchases.filter(po => {
      if (!po) return false;
      const poDateStr = String(po.orderDate || po.createdAt || '').slice(0, 10);
      if (startDate && poDateStr && poDateStr < startDate) return false;
      if (endDate && poDateStr && poDateStr > endDate) return false;

      if (selectedSupplierId !== 'all' && po.supplierId !== selectedSupplierId) {
        return false;
      }

      // Status filter
      if (statusFilter === 'pending' && (po.status === 'received' || po.stockUpdated)) {
        return false;
      }
      if (statusFilter === 'received' && po.status !== 'received' && !po.stockUpdated) {
        return false;
      }

      if (reportType === 'po_outstanding') {
        if (po.status === 'received' || po.stockUpdated) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchPoNum = po.purchaseNumber?.toLowerCase().includes(q);
        const matchSup = po.supplierName?.toLowerCase().includes(q);
        const matchSales = po.salesmanName?.toLowerCase().includes(q);
        const matchItem = (Array.isArray(po.items) ? po.items : []).some(
          it => it && (it.productName?.toLowerCase().includes(q) || it.barcode?.toLowerCase().includes(q))
        );
        if (!matchPoNum && !matchSup && !matchSales && !matchItem) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.orderDate || a.createdAt || 0).getTime() || 0;
      const dateB = new Date(b.orderDate || b.createdAt || 0).getTime() || 0;
      return dateB - dateA;
    });
  }, [purchases, startDate, endDate, selectedSupplierId, statusFilter, reportType, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    let totalValue = 0;
    let totalQty = 0;
    let pendingCount = 0;
    let pendingValue = 0;
    let receivedCount = 0;
    let receivedValue = 0;

    filteredOrders.forEach(po => {
      const val = po.totalAmount || 0;
      const qty = po.totalQuantity || (po.items || []).reduce((s, it) => s + it.quantity, 0);
      totalValue += val;
      totalQty += qty;

      if (po.status === 'received' || po.stockUpdated) {
        receivedCount++;
        receivedValue += val;
      } else {
        pendingCount++;
        pendingValue += val;
      }
    });

    return {
      totalCount: filteredOrders.length,
      totalValue,
      totalQty,
      pendingCount,
      pendingValue,
      receivedCount,
      receivedValue,
    };
  }, [filteredOrders]);

  // Group by Supplier/Salesman
  const supplierStats = useMemo(() => {
    const map = new Map<string, {
      supplierId: string;
      supplierName: string;
      salesmanName: string;
      phone: string;
      poCount: number;
      pendingCount: number;
      totalValue: number;
      pendingValue: number;
      totalQty: number;
    }>();

    filteredOrders.forEach(po => {
      const sId = po.supplierId || 'sup_general';
      const sName = po.supplierName || 'Pemasok Umum';
      const sales = po.salesmanName || '-';
      const phone = po.salesmanPhone || '-';

      if (!map.has(sId)) {
        map.set(sId, {
          supplierId: sId,
          supplierName: sName,
          salesmanName: sales,
          phone,
          poCount: 1,
          pendingCount: (!po.stockUpdated && po.status !== 'received') ? 1 : 0,
          totalValue: po.totalAmount || 0,
          pendingValue: (!po.stockUpdated && po.status !== 'received') ? (po.totalAmount || 0) : 0,
          totalQty: po.totalQuantity || (po.items || []).reduce((s, it) => s + it.quantity, 0),
        });
      } else {
        const item = map.get(sId)!;
        item.poCount++;
        if (!po.stockUpdated && po.status !== 'received') {
          item.pendingCount++;
          item.pendingValue += (po.totalAmount || 0);
        }
        item.totalValue += (po.totalAmount || 0);
        item.totalQty += po.totalQuantity || (po.items || []).reduce((s, it) => s + it.quantity, 0);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredOrders]);

  // Flattened Items detail
  const flattenedItems = useMemo(() => {
    const rows: Array<{
      purchaseNumber: string;
      date: string;
      targetDelivery?: string;
      supplierName: string;
      salesmanName: string;
      productName: string;
      barcode?: string;
      unit: string;
      quantity: number;
      costPrice: number;
      subtotal: number;
      status: string;
    }> = [];

    filteredOrders.forEach(po => {
      (Array.isArray(po.items) ? po.items : []).forEach(it => {
        if (!it) return;
        rows.push({
          purchaseNumber: po.purchaseNumber,
          date: String(po.orderDate || po.createdAt || '').slice(0, 10),
          targetDelivery: po.targetDeliveryDate || '-',
          supplierName: po.supplierName || 'Pemasok Umum',
          salesmanName: po.salesmanName || '-',
          productName: it.productName || 'Item',
          barcode: it.barcode,
          unit: it.unit || 'Pcs',
          quantity: it.quantity || 0,
          costPrice: it.costPrice || 0,
          subtotal: it.subtotal || (it.quantity * it.costPrice),
          status: po.status === 'received' || po.stockUpdated ? 'Sudah Diterima' : 'Menunggu Kirim',
        });
      });
    });

    return rows;
  }, [filteredOrders]);

  const reportTitle = useMemo(() => {
    let t = 'LAPORAN PEMESANAN BARANG (PURCHASE ORDER KE SALESMAN)';
    if (reportType === 'po_outstanding') t = 'LAPORAN PO OUTSTANDING (BELUM DIKIRIM SALESMAN)';
    else if (reportType === 'po_by_supplier') t = 'LAPORAN PEMESANAN PO PER PEMASOK / SALESMAN';
    else if (reportType === 'po_items_detail') t = 'LAPORAN RINCIAN ITEM BARANG YANG DIPESAN';

    if (selectedSupplierId !== 'all') {
      const sup = suppliers.find(s => s.id === selectedSupplierId);
      if (sup) t += ` - ${sup.name.toUpperCase()}`;
    }
    return t;
  }, [reportType, selectedSupplierId, suppliers]);

  const handlePrint = () => {
    const el = document.getElementById('printable-po-salesman-report');
    if (el) {
      printHtmlDirectly(el.innerHTML, { title: reportTitle });
    } else {
      window.print();
    }
  };

  const handleExportExcel = () => {
    let rowsHtml = '';
    const cleanStoreName = storeInfo.name || 'Kuickmart Store';

    if (reportType === 'po_by_supplier') {
      rowsHtml = supplierStats.map((s, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${s.supplierName}</td>
          <td>${s.salesmanName}</td>
          <td>${s.phone}</td>
          <td align="center">${s.poCount}</td>
          <td align="center">${s.pendingCount}</td>
          <td align="right">${s.totalQty}</td>
          <td align="right">Rp ${s.totalValue.toLocaleString('id-ID')}</td>
          <td align="right">Rp ${s.pendingValue.toLocaleString('id-ID')}</td>
        </tr>
      `).join('');
    } else if (reportType === 'po_items_detail') {
      rowsHtml = flattenedItems.map((it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${it.purchaseNumber}</td>
          <td>${it.date}</td>
          <td>${it.supplierName}</td>
          <td>${it.salesmanName}</td>
          <td>${it.barcode || '-'}</td>
          <td>${it.productName}</td>
          <td align="right">${it.quantity}</td>
          <td>${it.unit}</td>
          <td align="right">Rp ${it.costPrice.toLocaleString('id-ID')}</td>
          <td align="right">Rp ${it.subtotal.toLocaleString('id-ID')}</td>
          <td>${it.status}</td>
        </tr>
      `).join('');
    } else {
      rowsHtml = filteredOrders.map((po, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${po.purchaseNumber}</td>
          <td>${po.orderDate}</td>
          <td>${po.targetDeliveryDate || '-'}</td>
          <td>${po.supplierName}</td>
          <td>${po.salesmanName || '-'}</td>
          <td>${po.status === 'received' || po.stockUpdated ? 'SUDAH DITERIMA' : 'MENUNGGU SALESMAN'}</td>
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
        </style>
      </head>
      <body>
        <div style="font-size: 16pt; font-weight: bold; color: #065F46;">${cleanStoreName.toUpperCase()}</div>
        <div>${storeInfo.address || ''} | Telp: ${storeInfo.phone || ''}</div>
        <div><strong>${reportTitle}</strong> (Catatan: Pesanan PO Belum Menambah Stok Gudang)</div>
        <div>Periode: ${startDate} s/d ${endDate} | Tanggal Ekspor: ${new Date().toLocaleString('id-ID')}</div>
        <br/>
        <table>
          <thead>
            ${reportType === 'po_by_supplier' ? `
              <tr>
                <th>No</th><th>Pemasok</th><th>Salesman</th><th>No Kontak</th><th>Jumlah PO</th><th>PO Pending</th><th>Total Qty</th><th>Total Estimasi Belanja</th><th>Nilai Belum Dikirim</th>
              </tr>
            ` : reportType === 'po_items_detail' ? `
              <tr>
                <th>No</th><th>No PO</th><th>Tanggal Pesan</th><th>Pemasok</th><th>Salesman</th><th>Barcode</th><th>Nama Barang</th><th>Qty</th><th>Satuan</th><th>Harga Modal</th><th>Subtotal</th><th>Status</th>
              </tr>
            ` : `
              <tr>
                <th>No</th><th>No PO</th><th>Tanggal Pesan</th><th>Target Kirim</th><th>Pemasok</th><th>Salesman</th><th>Status Pengiriman</th><th>Total Qty</th><th>Estimasi Nilai</th>
              </tr>
            `}
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background-color: #f3f4f6;">
              <td colspan="${reportType === 'po_by_supplier' ? 7 : reportType === 'po_items_detail' ? 10 : 8}" align="right">TOTAL ESTIMASI:</td>
              <td align="right">Rp ${metrics.totalValue.toLocaleString('id-ID')}</td>
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
    a.download = `Laporan_PO_Salesman_${startDate}_sd_${endDate}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-80 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl border border-stone-200 space-y-5 my-4 max-h-[96vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0 print:my-0">
        
        {/* NON-PRINT CONTROLS TOOLBAR */}
        <div className="print:hidden space-y-4 border-b border-stone-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-2xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-stone-900 text-lg">Laporan Pemesanan Pembelian (PO ke Salesman)</h3>
                <p className="text-xs text-stone-500">
                  Laporan order barang ke vendor/salesman (Pesanan PO belum menambah stok fisik sampai barang tiba)
                </p>
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
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

          {/* TABS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-stone-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setReportType('po_summary')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                reportType === 'po_summary' ? 'bg-white text-amber-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Rekap Pesanan PO</span>
            </button>

            <button
              onClick={() => setReportType('po_outstanding')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                reportType === 'po_outstanding' ? 'bg-white text-amber-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>PO Belum Dikirim ({metrics.pendingCount})</span>
            </button>

            <button
              onClick={() => setReportType('po_by_supplier')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                reportType === 'po_by_supplier' ? 'bg-white text-amber-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Per Pemasok / Sales</span>
            </button>

            <button
              onClick={() => setReportType('po_items_detail')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                reportType === 'po_items_detail' ? 'bg-white text-amber-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Rincian Item Dipesan</span>
            </button>
          </div>

          {/* FILTER CONTROLS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs">
            {/* Periode */}
            <div className="space-y-1">
              <label className="font-bold text-stone-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Periode Pemesanan:</span>
              </label>
              <select
                value={datePreset}
                onChange={(e) => handleDatePresetChange(e.target.value as any)}
                className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 font-medium"
              >
                <option value="today">Hari Ini</option>
                <option value="7days">7 Hari Terakhir</option>
                <option value="this_month">Bulan Ini</option>
                <option value="last_month">Bulan Lalu</option>
                <option value="this_year">Tahun Ini</option>
                <option value="all">Semua Waktu</option>
                <option value="custom">Kustom Tanggal</option>
              </select>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
                  className="w-1/2 bg-white border border-stone-200 rounded-lg px-2 py-1 text-[11px]"
                />
                <span className="text-stone-400">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
                  className="w-1/2 bg-white border border-stone-200 rounded-lg px-2 py-1 text-[11px]"
                />
              </div>
            </div>

            {/* Pemasok */}
            <div className="space-y-1">
              <label className="font-bold text-stone-600 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span>Pemasok / Supplier:</span>
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 font-medium"
              >
                <option value="all">-- Semua Pemasok ({suppliers.length}) --</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
              <div className="relative mt-1">
                <Search className="w-3 h-3 text-stone-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Cari No PO / Salesman / Item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl pl-8 pr-2 py-1 text-xs"
                />
              </div>
            </div>

            {/* Status Realisasi */}
            <div className="space-y-1">
              <label className="font-bold text-stone-600 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-amber-600" />
                <span>Status Realisasi Pengiriman:</span>
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 font-medium"
              >
                <option value="all">Semua Status PO</option>
                <option value="pending">Menunggu Kirim Salesman (Belum Masuk Stok)</option>
                <option value="received">Sudah Diterima (Sudah Masuk Stok)</option>
              </select>

              <button
                onClick={() => {
                  setDatePreset('this_month');
                  handleDatePresetChange('this_month');
                  setSelectedSupplierId('all');
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="w-full mt-2 text-[11px] font-bold py-1.5 px-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl transition-colors"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* PRINTABLE AREA */}
        <div id="printable-po-salesman-report" className="print-area-wrapper bg-white text-stone-900 space-y-4 p-2">
          {/* KOP TOKO */}
          <div className="border-b-2 border-stone-900 pb-3">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-stone-900">{storeInfo.name}</h1>
                <p className="text-xs text-stone-600 mt-0.5">{storeInfo.address} | Telp: {storeInfo.phone}</p>
              </div>
              <div className="text-right">
                <div className="inline-block bg-amber-800 text-white text-[10px] font-black px-2.5 py-0.5 rounded uppercase">
                  DOKUMEN PESANAN PO (NON-STOK)
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-stone-300 flex justify-between items-center text-xs">
              <div>
                <h2 className="font-black text-sm uppercase text-stone-900">{reportTitle}</h2>
                <div className="text-stone-600 text-[11px]">
                  Periode: <strong>{startDate} s/d {endDate}</strong> | Target: Dokumen Pemesanan Salesman
                </div>
              </div>
              <div className="font-mono text-stone-600 text-xs">
                Total PO: <strong>{filteredOrders.length} Pesanan</strong>
              </div>
            </div>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
              <div className="text-stone-500 text-[11px]">Total Estimasi Nilai PO</div>
              <div className="text-base font-black text-stone-900 mt-0.5">{formatRupiah(metrics.totalValue)}</div>
              <div className="text-[10px] text-stone-500">{metrics.totalCount} pesanan diajukan</div>
            </div>

            <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
              <div className="text-stone-500 text-[11px]">Total Item Dipesan</div>
              <div className="text-base font-black text-stone-900 mt-0.5">{metrics.totalQty.toLocaleString('id-ID')} Pcs/Dus</div>
              <div className="text-[10px] text-stone-500">Estimasi fisik barang</div>
            </div>

            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-amber-800 text-[11px]">PO Belum Dikirim (Pending)</div>
              <div className="text-base font-black text-amber-700 mt-0.5">{metrics.pendingCount} PO ({formatRupiah(metrics.pendingValue)})</div>
              <div className="text-[10px] text-amber-600">Menunggu salesman</div>
            </div>

            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="text-emerald-800 text-[11px]">PO Sudah Direalisasikan</div>
              <div className="text-base font-black text-emerald-700 mt-0.5">{metrics.receivedCount} PO ({formatRupiah(metrics.receivedValue)})</div>
              <div className="text-[10px] text-emerald-600">Sudah masuk modul pembelian</div>
            </div>
          </div>

          {/* TABEL DATA */}
          {reportType === 'po_summary' || reportType === 'po_outstanding' ? (
            <table className="w-full text-xs border-collapse border border-stone-300">
              <thead>
                <tr className="bg-stone-100 font-bold border-b border-stone-300">
                  <th className="p-2 text-center border-r border-stone-300 w-10">No</th>
                  <th className="p-2 border-r border-stone-300">No PO</th>
                  <th className="p-2 text-center border-r border-stone-300">Tanggal Pesan</th>
                  <th className="p-2 text-center border-r border-stone-300">Target Kirim</th>
                  <th className="p-2 border-r border-stone-300">Pemasok</th>
                  <th className="p-2 border-r border-stone-300">Salesman</th>
                  <th className="p-2 text-center border-r border-stone-300">Status PO</th>
                  <th className="p-2 text-right border-r border-stone-300">Qty</th>
                  <th className="p-2 text-right">Estimasi Nilai</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-stone-500 italic">
                      Tidak ada data pesanan PO pada filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((po, idx) => (
                    <tr key={po.id} className="border-b border-stone-200">
                      <td className="p-2 text-center border-r border-stone-300 font-mono">{idx + 1}</td>
                      <td className="p-2 border-r border-stone-300 font-mono font-bold">{po.purchaseNumber}</td>
                      <td className="p-2 text-center border-r border-stone-300">{po.orderDate}</td>
                      <td className="p-2 text-center border-r border-stone-300 text-stone-600">{po.targetDeliveryDate || '-'}</td>
                      <td className="p-2 border-r border-stone-300 font-medium">{po.supplierName}</td>
                      <td className="p-2 border-r border-stone-300 text-stone-700">{po.salesmanName || '-'}</td>
                      <td className="p-2 text-center border-r border-stone-300">
                        {po.status === 'received' || po.stockUpdated ? (
                          <span className="font-bold text-emerald-700">DITERIMA</span>
                        ) : (
                          <span className="font-bold text-amber-700">MENUNGGU KIRIM</span>
                        )}
                      </td>
                      <td className="p-2 text-right border-r border-stone-300 font-mono">{po.totalQuantity}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatRupiah(po.totalAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-stone-100 font-black border-t-2 border-stone-900">
                  <td colSpan={7} className="p-2 text-right border-r border-stone-300">GRAND TOTAL:</td>
                  <td className="p-2 text-right border-r border-stone-300 font-mono">{metrics.totalQty}</td>
                  <td className="p-2 text-right font-mono text-emerald-800">{formatRupiah(metrics.totalValue)}</td>
                </tr>
              </tfoot>
            </table>
          ) : reportType === 'po_by_supplier' ? (
            <table className="w-full text-xs border-collapse border border-stone-300">
              <thead>
                <tr className="bg-stone-100 font-bold border-b border-stone-300">
                  <th className="p-2 text-center border-r border-stone-300 w-10">No</th>
                  <th className="p-2 border-r border-stone-300">Pemasok (Supplier)</th>
                  <th className="p-2 border-r border-stone-300">Salesman</th>
                  <th className="p-2 border-r border-stone-300">Kontak Sales</th>
                  <th className="p-2 text-center border-r border-stone-300">Jumlah PO</th>
                  <th className="p-2 text-center border-r border-stone-300">Pending Kirim</th>
                  <th className="p-2 text-right border-r border-stone-300">Total Qty</th>
                  <th className="p-2 text-right border-r border-stone-300">Total Nilai PO</th>
                  <th className="p-2 text-right">Nilai Belum Kirim</th>
                </tr>
              </thead>
              <tbody>
                {supplierStats.map((s, idx) => (
                  <tr key={s.supplierId} className="border-b border-stone-200">
                    <td className="p-2 text-center border-r border-stone-300 font-mono">{idx + 1}</td>
                    <td className="p-2 border-r border-stone-300 font-bold">{s.supplierName}</td>
                    <td className="p-2 border-r border-stone-300">{s.salesmanName}</td>
                    <td className="p-2 border-r border-stone-300">{s.phone}</td>
                    <td className="p-2 text-center border-r border-stone-300 font-bold">{s.poCount}</td>
                    <td className="p-2 text-center border-r border-stone-300 font-bold text-amber-700">{s.pendingCount}</td>
                    <td className="p-2 text-right border-r border-stone-300 font-mono">{s.totalQty}</td>
                    <td className="p-2 text-right border-r border-stone-300 font-mono font-bold">{formatRupiah(s.totalValue)}</td>
                    <td className="p-2 text-right font-mono text-amber-700 font-bold">{formatRupiah(s.pendingValue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-stone-100 font-black border-t-2 border-stone-900">
                  <td colSpan={6} className="p-2 text-right border-r border-stone-300">GRAND TOTAL:</td>
                  <td className="p-2 text-right border-r border-stone-300 font-mono">{metrics.totalQty}</td>
                  <td className="p-2 text-right border-r border-stone-300 font-mono text-emerald-800">{formatRupiah(metrics.totalValue)}</td>
                  <td className="p-2 text-right font-mono text-amber-800">{formatRupiah(metrics.pendingValue)}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <table className="w-full text-xs border-collapse border border-stone-300">
              <thead>
                <tr className="bg-stone-100 font-bold border-b border-stone-300">
                  <th className="p-2 text-center border-r border-stone-300 w-10">No</th>
                  <th className="p-2 border-r border-stone-300">No PO</th>
                  <th className="p-2 text-center border-r border-stone-300">Tanggal</th>
                  <th className="p-2 border-r border-stone-300">Pemasok</th>
                  <th className="p-2 border-r border-stone-300">Barcode</th>
                  <th className="p-2 border-r border-stone-300">Nama Barang Dipesan</th>
                  <th className="p-2 text-right border-r border-stone-300">Qty</th>
                  <th className="p-2 text-center border-r border-stone-300">Satuan</th>
                  <th className="p-2 text-right border-r border-stone-300">Harga Estimasi</th>
                  <th className="p-2 text-right border-r border-stone-300">Subtotal</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {flattenedItems.map((it, idx) => (
                  <tr key={idx} className="border-b border-stone-200">
                    <td className="p-2 text-center border-r border-stone-300 font-mono">{idx + 1}</td>
                    <td className="p-2 border-r border-stone-300 font-mono">{it.purchaseNumber}</td>
                    <td className="p-2 text-center border-r border-stone-300">{it.date}</td>
                    <td className="p-2 border-r border-stone-300">{it.supplierName}</td>
                    <td className="p-2 border-r border-stone-300 font-mono text-[10px]">{it.barcode || '-'}</td>
                    <td className="p-2 border-r border-stone-300 font-bold">{it.productName}</td>
                    <td className="p-2 text-right border-r border-stone-300 font-mono font-bold">{it.quantity}</td>
                    <td className="p-2 text-center border-r border-stone-300">{it.unit}</td>
                    <td className="p-2 text-right border-r border-stone-300 font-mono">{formatRupiah(it.costPrice)}</td>
                    <td className="p-2 text-right border-r border-stone-300 font-mono font-bold">{formatRupiah(it.subtotal)}</td>
                    <td className="p-2 text-center text-[10px] font-semibold">{it.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* SIGNATURES (HORIZONTAL 3 KOLOM SEJAJAR) */}
          <div 
            className="pt-6 border-t border-stone-300 mt-6 break-inside-avoid"
            style={{ pageBreakInside: 'avoid', marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #d1d5db' }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', margin: '0 auto', tableLayout: 'fixed' }}>
              <tbody>
                <tr style={{ border: 'none' }}>
                  <td style={{ width: '33.333%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '8px 12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#4b5563', letterSpacing: '0.5px' }}>DIPESAN OLEH:</div>
                    <div style={{ height: '54px' }}></div>
                    <div style={{ width: '140px', margin: '0 auto', borderBottom: '1.5px solid #111827' }}></div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#111827', marginTop: '5px' }}>Bagian Pembelian</div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>Purchasing Toko</div>
                  </td>

                  <td style={{ width: '33.333%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '8px 12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#4b5563', letterSpacing: '0.5px' }}>DISETUJUI OLEH:</div>
                    <div style={{ height: '54px' }}></div>
                    <div style={{ width: '140px', margin: '0 auto', borderBottom: '1.5px solid #111827' }}></div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#111827', marginTop: '5px' }}>Pimpinan / Store Manager</div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>Otorisasi Anggaran</div>
                  </td>

                  <td style={{ width: '33.333%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '8px 12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#4b5563', letterSpacing: '0.5px' }}>DITERIMA OLEH:</div>
                    <div style={{ height: '54px' }}></div>
                    <div style={{ width: '140px', margin: '0 auto', borderBottom: '1.5px solid #111827' }}></div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#111827', marginTop: '5px' }}>Salesman / Vendor</div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>Penyedia Barang</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
