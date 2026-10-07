import React from 'react';
import { PurchaseOrder, Store, Supplier } from '../types';
import { formatRupiah } from '../utils/formatters';
import { exportPurchaseOrdersToExcel } from '../utils/purchaseExport';
import { printHtmlDirectly, generateSinglePurchaseOrderHtml } from '../utils/printDocumentHelper';
import { Printer, X, Download, Building2, CheckCircle2 } from 'lucide-react';

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

  const targetStore = stores.find(s => s.id === po.storeId) || stores[0];
  const targetSupplier = suppliers.find(s => s.id === po.supplierId);

  const handlePrint = () => {
    const html = generateSinglePurchaseOrderHtml(po, targetStore, targetSupplier);
    printHtmlDirectly(html, { title: `Surat Pesanan Pembelian - ${po.purchaseNumber}` });
  };

  const handleExportExcel = () => {
    exportPurchaseOrdersToExcel([po], `Faktur_${po.purchaseNumber}`);
  };

  return (
    <div className="fixed inset-0 z-80 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 my-6 max-h-[94vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0 print:my-0">
        {/* NON-PRINT ACTION TOOLBAR */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3.5 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-base">Cetak Surat Pesanan Pembelian Resmi (PO)</h3>
              <p className="text-xs text-stone-500">Format resmi dengan Kop Toko, rincian satuan Dus & Pcs, dan kolom tanda tangan</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE PURCHASE ORDER DOCUMENT */}
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
              <span className="text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                SURAT PESANAN PEMBELIAN
              </span>
              <div className="font-mono text-lg font-black text-stone-900 mt-2">
                {po.purchaseNumber}
              </div>
              {po.invoiceNumber && (
                <div className="text-xs text-stone-500 font-mono">
                  Ref Faktur Supplier: {po.invoiceNumber}
                </div>
              )}
              <div className="text-xs text-stone-600 mt-1">
                Tanggal: <strong>{po.orderDate}</strong>
              </div>
            </div>
          </div>

          {/* DUA KOLOM: PEMESAN & TUJUAN SUPPLIER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <div className="font-bold text-stone-500 uppercase text-[10px] tracking-wider mb-1">
                Kepada Pemasok / Supplier:
              </div>
              <div className="font-black text-sm text-stone-900">{po.supplierName}</div>
              {targetSupplier?.address && (
                <div className="text-stone-600 mt-0.5">{targetSupplier.address}</div>
              )}
              {targetSupplier?.phone && (
                <div className="text-stone-600 mt-0.5">Kontak: {targetSupplier.phone} ({targetSupplier.contactPerson || 'Sales'})</div>
              )}
            </div>

            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <div className="font-bold text-stone-500 uppercase text-[10px] tracking-wider mb-1">
                Lokasi Kirim & Penerimaan:
              </div>
              <div className="font-black text-sm text-stone-900">{po.storeName}</div>
              <div className="text-stone-600 mt-0.5">Status Fisik: <strong className={po.status === 'received' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>{po.status === 'received' ? 'Sudah Diterima' : 'Menunggu Pengiriman'}</strong></div>
              <div className="text-stone-600 mt-0.5">Metode Bayar: <strong className="uppercase">{po.paymentMethod}</strong> {po.dueDate ? `(Jatuh Tempo: ${po.dueDate})` : ''}</div>
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

          {/* KOLOM TANDA TANGAN */}
          <div className="pt-6 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-12">
              <div className="font-semibold text-stone-600">Dipesan Oleh:</div>
              <div>
                <div className="font-bold text-stone-900 underline underline-offset-4">
                  ( Bagian Pembelian / Purchasing )
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">Petugas Toko</div>
              </div>
            </div>

            <div className="space-y-12">
              <div className="font-semibold text-stone-600">Disetujui Oleh:</div>
              <div>
                <div className="font-bold text-stone-900 underline underline-offset-4">
                  ( Manajer Toko / Pemilik )
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">Otorisasi Finansial</div>
              </div>
            </div>

            <div className="space-y-12">
              <div className="font-semibold text-stone-600">Diterima & Disanggupi Oleh:</div>
              <div>
                <div className="font-bold text-stone-900 underline underline-offset-4">
                  ( {po.supplierName} )
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">Sales / Ekspedisi Vendor</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
