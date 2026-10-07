import React from 'react';
import { PurchaseOrder, Store, Supplier } from '../types';
import { formatRupiah } from '../utils/formatters';
import { exportPurchaseOrdersToExcel } from '../utils/purchaseExport';
import { 
  printHtmlDirectly, 
  generateSinglePurchaseOrderHtml, 
  generateSinglePurchaseInvoiceHtml 
} from '../utils/printDocumentHelper';
import { Printer, X, Download, Building2, CheckCircle2, ShoppingBag } from 'lucide-react';

interface PurchaseOrderPrintModalProps {
  po: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
  stores?: Store[];
  suppliers?: Supplier[];
}

export const PurchaseOrderPrintModal: React.FC<PurchaseOrderPrintModalProps> = ({
  po,
  isOpen,
  onClose,
  stores = [],
  suppliers = [],
}) => {
  if (!isOpen || !po) return null;

  const isInvoice = po.type === 'purchase_invoice' || po.stockUpdated || po.status === 'received';
  const targetStore = stores.find(s => s.id === po.storeId) || stores[0];
  const targetSupplier = suppliers.find(s => s.id === po.supplierId);

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const html = isInvoice
      ? generateSinglePurchaseInvoiceHtml(po, targetStore, targetSupplier)
      : generateSinglePurchaseOrderHtml(po, targetStore, targetSupplier);
    printHtmlDirectly(html, { 
      title: isInvoice ? `Faktur Penerimaan Barang - ${po.purchaseNumber}` : `Surat Pesanan Pembelian - ${po.purchaseNumber}` 
    });
  };

  const handleExportExcel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    exportPurchaseOrdersToExcel([po], isInvoice ? `Faktur_Beli_${po.purchaseNumber}` : `Surat_PO_${po.purchaseNumber}`);
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 my-6 max-h-[94vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0 print:my-0"
      >
        {/* NON-PRINT ACTION TOOLBAR */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3.5 print:hidden">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${isInvoice ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
              {isInvoice ? <ShoppingBag className="w-5 h-5" /> : <Printer className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-base">
                {isInvoice ? 'Cetak Bukti Pembelian & Penerimaan Barang (Faktur Beli)' : 'Cetak Surat Pesanan Pembelian Resmi (PO ke Salesman)'}
              </h3>
              <p className="text-xs text-stone-500">
                {isInvoice 
                  ? 'Format resmi penerimaan barang gudang dengan rincian stok bertambah & tanda tangan'
                  : 'Format resmi surat pesanan untuk diserahkan ke salesman supplier sebelum kirim'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-colors cursor-pointer ${
                isInvoice ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen Satuan / PDF</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE PURCHASE ORDER / INVOICE DOCUMENT */}
        <div className="print-area-wrapper p-4 sm:p-6 border border-stone-200 rounded-2xl print:border-none print:p-0 space-y-6 text-stone-900 bg-white">
          {/* HEADER DOKUMEN & KOP SURAT */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-stone-900 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-emerald-800 uppercase">
                  {targetStore?.name || po.storeName || 'KUICKMART STORE'}
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-1 max-w-sm">
                {targetStore?.address || 'Jl. Raya Utama No. 88, Pusat Niaga Ritel'}
              </p>
              <p className="text-xs text-stone-600">
                Telp/WhatsApp: {targetStore?.phone || '0812-3456-7890'} | Kota: {targetStore?.city || 'Indonesia'}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                isInvoice 
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                  : 'text-blue-700 bg-blue-50 border-blue-200'
              }`}>
                {isInvoice ? 'FAKTUR PEMBELIAN & PENERIMAAN' : 'SURAT PESANAN PEMBELIAN'}
              </span>
              <div className="font-mono text-lg font-black text-stone-900 mt-2">
                {po.purchaseNumber}
              </div>
              {po.invoiceNumber && (
                <div className="text-xs text-stone-600 font-mono font-bold">
                  Ref Faktur Supplier: {po.invoiceNumber}
                </div>
              )}
              {po.referencePoNumber && (
                <div className="text-xs text-stone-500 font-mono">
                  Realisasi dari: {po.referencePoNumber}
                </div>
              )}
              <div className="text-xs text-stone-600 mt-1">
                Tanggal: <strong>{isInvoice ? (po.receivedDate || po.orderDate) : po.orderDate}</strong>
              </div>
            </div>
          </div>

          {/* DUA KOLOM: PEMESAN & TUJUAN SUPPLIER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <div className="font-bold text-stone-500 uppercase text-[10px] tracking-wider mb-1">
                {isInvoice ? 'Diterima Dari Supplier / Pemasok:' : 'Kepada Pemasok / Salesman:'}
              </div>
              <div className="font-black text-sm text-stone-900">{po.supplierName}</div>
              {po.salesmanName && (
                <div className="text-stone-700 font-medium mt-0.5">Salesman: {po.salesmanName} {po.salesmanPhone ? `(${po.salesmanPhone})` : ''}</div>
              )}
              {targetSupplier?.address && (
                <div className="text-stone-600 mt-0.5">{targetSupplier.address}</div>
              )}
              {targetSupplier?.phone && (
                <div className="text-stone-600 mt-0.5">Kontak: {targetSupplier.phone} ({targetSupplier.contactPerson || 'Sales'})</div>
              )}
            </div>

            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <div className="font-bold text-stone-500 uppercase text-[10px] tracking-wider mb-1">
                {isInvoice ? 'Gudang Penerima & Pembayaran:' : 'Lokasi Kirim & Ketentuan:'}
              </div>
              <div className="font-black text-sm text-stone-900">{po.storeName}</div>
              <div className="text-stone-600 mt-0.5">
                Status Fisik: <strong className={isInvoice ? 'text-emerald-700 font-bold' : (po.status === 'received' ? 'text-emerald-700 font-bold' : 'text-blue-700 font-bold')}>
                  {isInvoice ? '✓ Stok Sudah Masuk Gudang' : (po.status === 'received' ? 'Sudah Diterima' : 'Menunggu Kiriman Salesman (Belum Masuk Stok)')}
                </strong>
              </div>
              <div className="text-stone-600 mt-0.5">
                Metode Bayar: <strong className="uppercase">{po.paymentMethod}</strong> {po.dueDate ? `(Jatuh Tempo: ${po.dueDate})` : ''}
              </div>
            </div>
          </div>

          {/* TABEL RINCIAN BARANG */}
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 border-b border-stone-200 text-stone-800 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5 text-center w-10">No</th>
                  <th className="px-3 py-2.5 w-32">Barcode</th>
                  <th className="px-3 py-2.5">Nama Barang / Produk</th>
                  <th className="px-3 py-2.5 text-center w-28">Satuan PO</th>
                  <th className="px-3 py-2.5 text-center w-20">Qty</th>
                  <th className="px-3 py-2.5 text-center w-28">Konversi Fisik</th>
                  <th className="px-3 py-2.5 text-right w-28">Harga Modal</th>
                  <th className="px-3 py-2.5 text-right w-32">Subtotal (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {(po.items || []).map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td className="px-3 py-2 text-center text-stone-500">{idx + 1}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-stone-600">{it.barcode || '-'}</td>
                    <td className="px-3 py-2 font-bold text-stone-900">{it.productName}</td>
                    <td className="px-3 py-2 text-center font-bold text-indigo-700">{it.unit || 'Pcs'}</td>
                    <td className="px-3 py-2 text-center font-bold text-stone-900">{it.quantity}</td>
                    <td className="px-3 py-2 text-center text-emerald-700 text-[11px]">
                      +{it.baseQuantity || (it.quantity * (it.conversionMultiplier || 1))} {it.baseUnit || 'Pcs'}
                    </td>
                    <td className="px-3 py-2 text-right">{formatRupiah(it.costPrice)}</td>
                    <td className="px-3 py-2 text-right font-bold text-stone-900">{formatRupiah(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-stone-50 border-t-2 border-stone-300 font-bold text-stone-900">
                <tr>
                  <td colSpan={4} className="px-3 py-2.5 text-right uppercase text-[11px]">
                    Total Pesanan ({po.items?.length || 0} Macam Barang):
                  </td>
                  <td className="px-3 py-2.5 text-center text-stone-900 text-sm">
                    {po.totalQuantity}
                  </td>
                  <td className="px-3 py-2.5 text-center text-emerald-700 text-xs">
                    +{po.items?.reduce((s, it) => s + (it.baseQuantity || (it.quantity * (it.conversionMultiplier || 1))), 0)} fisik
                  </td>
                  <td></td>
                  <td className="px-3 py-2.5 text-right font-black text-sm text-emerald-800">
                    {formatRupiah(po.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* CATATAN & KETENTUAN */}
          {po.notes && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <span className="font-bold text-stone-700">Catatan Pesanan: </span>
              <span className="text-stone-600">{po.notes}</span>
            </div>
          )}

          {/* KOLOM TANDA TANGAN (HORIZONTAL 3 KOLOM SEJAJAR) */}
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
                    <div style={{ width: '150px', margin: '0 auto', borderBottom: '1.5px solid #111827' }}></div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#111827', marginTop: '5px' }}>( Bagian Pembelian )</div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>Petugas Purchasing Toko</div>
                  </td>

                  <td style={{ width: '33.333%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '8px 12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#4b5563', letterSpacing: '0.5px' }}>DISETUJUI OLEH:</div>
                    <div style={{ height: '54px' }}></div>
                    <div style={{ width: '150px', margin: '0 auto', borderBottom: '1.5px solid #111827' }}></div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#111827', marginTop: '5px' }}>( Manajer / Pimpinan )</div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>Otorisasi Finansial</div>
                  </td>

                  <td style={{ width: '33.333%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '8px 12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#4b5563', letterSpacing: '0.5px' }}>DITERIMA OLEH:</div>
                    <div style={{ height: '54px' }}></div>
                    <div style={{ width: '150px', margin: '0 auto', borderBottom: '1.5px solid #111827' }}></div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#111827', marginTop: '5px' }}>( {po.supplierName} )</div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>Sales / Ekspedisi Vendor</div>
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
