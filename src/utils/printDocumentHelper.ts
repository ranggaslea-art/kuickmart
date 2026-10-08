/**
 * Helper cetak dokumen terisolasi (A4 / Resmi) via hidden iframe.
 * Menjamin 100% hanya dokumen target yang tercetak ke printer / PDF,
 * tanpa tercampur tampilan background panel admin, rekap tabel lain, atau navbar.
 */

import { PurchaseOrder, Store, Supplier } from '../types';
import { formatRupiah } from './formatters';

export interface PrintDocumentOptions {
  title?: string;
  landscape?: boolean;
}

export function generateSinglePurchaseOrderHtml(
  po: PurchaseOrder,
  store?: Store,
  supplier?: Supplier
): string {
  const storeName = store?.name || po.storeName || 'KUICK HEBAT';
  const storeAddress = store?.address || 'Jl. Pasar Wisata Pangandaran';
  const storePhone = store?.phone || '0812-3456-7890';
  const storeCity = store?.city || 'Pangandaran';

  const supName = po.supplierName || 'Pemasok Umum';
  const supAddress = supplier?.address || '-';
  const supPhone = supplier?.phone ? `${supplier.phone} (${supplier.contactPerson || 'Sales'})` : '-';

  const itemsRows = (po.items || []).map((it, idx) => {
    const subtotal = it.subtotal || (it.quantity * it.costPrice);
    const baseQty = it.baseQuantity || (it.quantity * (it.conversionMultiplier || 1));
    const baseUnit = it.baseUnit || 'Pcs';
    return `
      <tr>
        <td class="text-center font-mono">${idx + 1}</td>
        <td class="font-mono text-center">${it.barcode || '-'}</td>
        <td class="font-bold">${it.productName}</td>
        <td class="text-center font-bold" style="color: #4338ca;">${it.unit || 'Pcs'}</td>
        <td class="text-center font-bold font-mono">${it.quantity}</td>
        <td class="text-center" style="color: #047857; font-size: 10px;">+${baseQty} ${baseUnit}</td>
        <td class="text-right font-mono">${formatRupiah(it.costPrice)}</td>
        <td class="text-right font-mono font-bold">${formatRupiah(subtotal)}</td>
      </tr>
    `;
  }).join('');

  const totalPhysical = po.items?.reduce((s, it) => s + (it.baseQuantity || (it.quantity * (it.conversionMultiplier || 1))), 0) || po.totalQuantity;

  return `
    <div style="padding: 10px;">
      <!-- KOP SURAT -->
      <div class="kop-header">
        <div>
          <div class="kop-title">${storeName}</div>
          <div style="font-size: 11px; color: #4b5563; margin-top: 3px;">${storeAddress}</div>
          <div style="font-size: 11px; color: #4b5563;">Telp/WhatsApp: <strong>${storePhone}</strong> | Kota: ${storeCity}</div>
        </div>
        <div style="text-align: right;">
          <div class="doc-badge">SURAT PESANAN PEMBELIAN</div>
          <div style="font-size: 16px; font-weight: 900; font-family: monospace; color: #111827; margin-top: 6px;">
            ${po.purchaseNumber}
          </div>
          ${po.invoiceNumber ? `<div style="font-size: 11px; color: #6b7280; font-family: monospace;">Ref Faktur Supplier: ${po.invoiceNumber}</div>` : ''}
          <div style="font-size: 11px; color: #4b5563; margin-top: 2px;">Tanggal: <strong>${po.orderDate}</strong></div>
        </div>
      </div>

      <!-- KOTAK INFORMASI 2 KOLOM -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; font-size: 11px;">
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px;">
          <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 3px;">
            KEPADA PEMASOK / SUPPLIER:
          </div>
          <div style="font-size: 13px; font-weight: 900; color: #111827;">${supName}</div>
          <div style="color: #4b5563; margin-top: 3px;">Alamat: ${supAddress}</div>
          <div style="color: #4b5563;">Kontak: ${supPhone}</div>
        </div>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px;">
          <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 3px;">
            LOKASI KIRIM & PENERIMAAN:
          </div>
          <div style="font-size: 13px; font-weight: 900; color: #111827;">${po.storeName || storeName}</div>
          <div style="color: #4b5563; margin-top: 3px;">
            Status Fisik: <strong style="color: ${po.status === 'received' ? '#047857' : '#b45309'}; font-weight: bold;">
              ${po.status === 'received' ? 'Sudah Diterima' : 'Menunggu Pengiriman'}
            </strong>
          </div>
          <div style="color: #4b5563;">
            Metode Bayar: <strong style="text-transform: uppercase;">${po.paymentMethod}</strong>
            ${po.dueDate ? ` (Jatuh Tempo: ${po.dueDate})` : ''}
          </div>
        </div>
      </div>

      <!-- TABEL DAFTAR BARANG -->
      <table>
        <thead>
          <tr>
            <th style="width: 35px;" class="text-center">NO</th>
            <th style="width: 110px;" class="text-center">BARCODE</th>
            <th>NAMA BARANG / PRODUK</th>
            <th style="width: 85px;" class="text-center">SATUAN PO</th>
            <th style="width: 50px;" class="text-center">QTY</th>
            <th style="width: 90px;" class="text-center">KONVERSI FISIK</th>
            <th style="width: 90px;" class="text-right">HARGA MODAL</th>
            <th style="width: 100px;" class="text-right">SUBTOTAL (RP)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
        <tfoot>
          <tr style="background-color: #f9fafb; font-weight: bold;">
            <td colspan="4" class="text-right uppercase" style="font-size: 10px; padding: 6px 8px;">
              TOTAL PESANAN (${po.items?.length || 0} MACAM BARANG):
            </td>
            <td class="text-center font-mono font-bold" style="font-size: 13px;">
              ${po.totalQuantity}
            </td>
            <td class="text-center" style="color: #047857; font-size: 11px;">
              +${totalPhysical} fisik
            </td>
            <td></td>
            <td class="text-right font-mono font-black" style="font-size: 13px; color: #065f46;">
              ${formatRupiah(po.totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- CATATAN -->
      ${po.notes ? `
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px; font-size: 11px; margin-top: 8px;">
          <strong style="color: #374151;">Catatan Pesanan:</strong> <span style="color: #4b5563;">${po.notes}</span>
        </div>
      ` : ''}

      <!-- KOLOM TANDA TANGAN -->
      <div class="signatures-block">
        <div class="signature-box">
          <div style="font-weight: 600; color: #4b5563; font-size: 11px;">Dipesan Oleh:</div>
          <div class="signature-line"></div>
          <div style="font-weight: bold; color: #111827; text-decoration: underline; font-size: 11px;">( Bagian Pembelian / Purchasing )</div>
          <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">Petugas Toko</div>
        </div>

        <div class="signature-box">
          <div style="font-weight: 600; color: #4b5563; font-size: 11px;">Disetujui Oleh:</div>
          <div class="signature-line"></div>
          <div style="font-weight: bold; color: #111827; text-decoration: underline; font-size: 11px;">( Manajer Toko / Pemilik )</div>
          <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">Otorisasi Finansial</div>
        </div>

        <div class="signature-box">
          <div style="font-weight: 600; color: #4b5563; font-size: 11px;">Diterima & Disanggupi Oleh:</div>
          <div class="signature-line"></div>
          <div style="font-weight: bold; color: #111827; text-decoration: underline; font-size: 11px;">( ${supName} )</div>
          <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">Sales / Ekspedisi Vendor</div>
        </div>
      </div>
    </div>
  `;
}

export function generateSinglePurchaseInvoiceHtml(
  po: PurchaseOrder,
  store?: Store,
  supplier?: Supplier
): string {
  const storeName = store?.name || po.storeName || 'KUICK HEBAT';
  const storeAddress = store?.address || 'Jl. Pasar Wisata Pangandaran';
  const storePhone = store?.phone || '0812-3456-7890';
  const storeCity = store?.city || 'Pangandaran';

  const supName = po.supplierName || 'Pemasok Umum';
  const supAddress = supplier?.address || '-';
  const supPhone = supplier?.phone ? `${supplier.phone} (${supplier.contactPerson || 'Sales'})` : '-';

  const itemsRows = (po.items || []).map((it, idx) => {
    const subtotal = it.subtotal || (it.quantity * it.costPrice);
    const baseQty = it.baseQuantity || (it.quantity * (it.conversionMultiplier || 1));
    const baseUnit = it.baseUnit || 'Pcs';
    return `
      <tr>
        <td class="text-center font-mono">${idx + 1}</td>
        <td class="font-mono text-center">${it.barcode || '-'}</td>
        <td class="font-bold">${it.productName}</td>
        <td class="text-center font-bold" style="color: #047857;">${it.unit || 'Pcs'}</td>
        <td class="text-center font-bold font-mono">${it.quantity}</td>
        <td class="text-center" style="color: #047857; font-size: 10px;">+${baseQty} ${baseUnit}</td>
        <td class="text-right font-mono">${formatRupiah(it.costPrice)}</td>
        <td class="text-right font-mono font-bold">${formatRupiah(subtotal)}</td>
      </tr>
    `;
  }).join('');

  const totalPhysical = po.items?.reduce((s, it) => s + (it.baseQuantity || (it.quantity * (it.conversionMultiplier || 1))), 0) || po.totalQuantity;

  return `
    <div style="padding: 10px;">
      <!-- KOP SURAT -->
      <div class="kop-header">
        <div>
          <div class="kop-title">${storeName}</div>
          <div style="font-size: 11px; color: #4b5563; margin-top: 3px;">${storeAddress}</div>
          <div style="font-size: 11px; color: #4b5563;">Telp/WhatsApp: <strong>${storePhone}</strong> | Kota: ${storeCity}</div>
        </div>
        <div style="text-align: right;">
          <div class="doc-badge" style="background-color: #047857;">BUKTI PENERIMAAN BARANG & FAKTUR BELI</div>
          <div style="font-size: 16px; font-weight: 900; font-family: monospace; color: #111827; margin-top: 6px;">
            ${po.purchaseNumber}
          </div>
          ${po.invoiceNumber ? `<div style="font-size: 11px; color: #047857; font-weight: bold; font-family: monospace;">Ref Faktur Supplier: ${po.invoiceNumber}</div>` : ''}
          ${po.referencePoNumber ? `<div style="font-size: 10px; color: #6b7280; font-family: monospace;">Realisasi PO: ${po.referencePoNumber}</div>` : ''}
          <div style="font-size: 11px; color: #4b5563; margin-top: 2px;">Tgl Terima: <strong>${po.receivedDate || po.orderDate}</strong></div>
        </div>
      </div>

      <!-- KOTAK INFORMASI 2 KOLOM -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; font-size: 11px;">
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px;">
          <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 3px;">
            DITERIMA DARI PEMASOK:
          </div>
          <div style="font-size: 13px; font-weight: 900; color: #111827;">${supName}</div>
          <div style="color: #4b5563; margin-top: 3px;">Alamat: ${supAddress}</div>
          <div style="color: #4b5563;">Kontak: ${supPhone}</div>
        </div>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px;">
          <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 3px;">
            LOKASI GUDANG PENERIMA:
          </div>
          <div style="font-size: 13px; font-weight: 900; color: #111827;">${po.storeName || storeName}</div>
          <div style="color: #4b5563; margin-top: 3px;">
            Status Stok: <strong style="color: #047857; font-weight: bold;">
              ✓ STOK GUDANG BERTAMBAH (+${totalPhysical} Unit Fisik)
            </strong>
          </div>
          <div style="color: #4b5563;">
            Status Bayar: <strong style="color: ${po.paymentStatus === 'paid' ? '#047857' : '#b45309'}; text-transform: uppercase;">
              ${po.paymentStatus === 'paid' ? 'LUNAS' : `TEMPO (${po.paymentMethod.toUpperCase()})`}
            </strong>
            ${po.dueDate ? ` - Jatuh Tempo: <strong>${po.dueDate}</strong>` : ''}
          </div>
        </div>
      </div>

      <!-- TABEL DAFTAR BARANG MASUK -->
      <table>
        <thead>
          <tr>
            <th style="width: 35px;" class="text-center">NO</th>
            <th style="width: 110px;" class="text-center">BARCODE</th>
            <th>NAMA BARANG / PRODUK</th>
            <th style="width: 85px;" class="text-center">SATUAN BELI</th>
            <th style="width: 50px;" class="text-center">QTY</th>
            <th style="width: 90px;" class="text-center">MASUK GUDANG</th>
            <th style="width: 90px;" class="text-right">HARGA MODAL (HPP)</th>
            <th style="width: 100px;" class="text-right">SUBTOTAL (RP)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
        <tfoot>
          <tr style="background-color: #f9fafb; font-weight: bold;">
            <td colspan="4" class="text-right uppercase" style="font-size: 10px; padding: 6px 8px;">
              TOTAL PEMBELIAN (${po.items?.length || 0} MACAM BARANG):
            </td>
            <td class="text-center font-mono font-bold" style="font-size: 13px;">
              ${po.totalQuantity}
            </td>
            <td class="text-center" style="color: #047857; font-size: 11px;">
              +${totalPhysical} fisik
            </td>
            <td></td>
            <td class="text-right font-mono font-black" style="font-size: 13px; color: #047857;">
              ${formatRupiah(po.totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- CATATAN -->
      ${po.notes ? `
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px; font-size: 11px; margin-top: 8px;">
          <strong style="color: #374151;">Catatan Penerimaan:</strong> <span style="color: #4b5563;">${po.notes}</span>
        </div>
      ` : ''}

      <!-- KOLOM TANDA TANGAN -->
      <div class="signatures-block">
        <div class="signature-box">
          <div style="font-weight: 600; color: #4b5563; font-size: 11px;">Diterima Oleh:</div>
          <div class="signature-line"></div>
          <div style="font-weight: bold; color: #111827; text-decoration: underline; font-size: 11px;">( ${po.receivedBy || 'Petugas Gudang'} )</div>
          <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">Penerima Barang Fisik</div>
        </div>

        <div class="signature-box">
          <div style="font-weight: 600; color: #4b5563; font-size: 11px;">Disetujui Oleh:</div>
          <div class="signature-line"></div>
          <div style="font-weight: bold; color: #111827; text-decoration: underline; font-size: 11px;">( Kepala Gudang / Toko )</div>
          <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">Validasi Pembelian</div>
        </div>

        <div class="signature-box">
          <div style="font-weight: 600; color: #4b5563; font-size: 11px;">Diserahkan Oleh:</div>
          <div class="signature-line"></div>
          <div style="font-weight: bold; color: #111827; text-decoration: underline; font-size: 11px;">( ${supName} )</div>
          <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">Pengirim / Salesman Vendor</div>
        </div>
      </div>
    </div>
  `;
}

export function printHtmlDirectly(htmlContent: string, options: PrintDocumentOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const { title = 'Dokumen Laporan & Keuangan', landscape = false } = options;

      // Cari atau buat hidden iframe khusus print
      let iframe = document.getElementById('isolated-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'isolated-print-iframe';
        document.body.appendChild(iframe);
      }

      // Pastikan iframe memiliki dimensi nyata untuk kalkulasi layout printer
      iframe.style.position = 'fixed';
      iframe.style.left = '0';
      iframe.style.top = '0';
      iframe.style.width = landscape ? '297mm' : '210mm';
      iframe.style.height = landscape ? '210mm' : '297mm';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-9999';

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) {
        // Fallback jika iframe diblokir
        window.print();
        resolve(false);
        return;
      }

      const fullHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page {
      size: ${landscape ? 'A4 landscape' : 'A4 portrait'};
      margin: ${landscape ? '10mm 12mm 12mm 12mm' : '12mm 10mm 14mm 10mm'};
    }
    * {
      box-sizing: border-box !important;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      color: #111827 !important;
      background-color: #ffffff !important;
      font-size: 11px !important;
      line-height: 1.35 !important;
      width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    /* KOP SURAT RESMI BISNIS */
    .kop-header, .report-kop-header {
      border-bottom: 2.5px solid #111827 !important;
      padding-bottom: 10px !important;
      margin-bottom: 12px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-start !important;
      width: 100% !important;
    }
    .kop-title, .report-kop-title {
      font-size: 18px !important;
      font-weight: 900 !important;
      letter-spacing: -0.3px !important;
      color: #065f46 !important;
      text-transform: uppercase !important;
      line-height: 1.15 !important;
    }
    .kop-meta, .report-kop-meta {
      font-size: 10.5px !important;
      color: #4b5563 !important;
      margin-top: 3px !important;
      line-height: 1.3 !important;
    }
    .doc-badge, .report-badge {
      display: inline-block !important;
      font-size: 9.5px !important;
      font-weight: 900 !important;
      background-color: #111827 !important;
      color: #ffffff !important;
      padding: 2.5px 8px !important;
      border-radius: 4px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.8px !important;
      margin-bottom: 4px !important;
    }

    /* JUDUL DOKUMEN */
    .report-title-section {
      text-align: center !important;
      margin: 8px 0 12px 0 !important;
    }
    .report-main-title {
      font-size: 14px !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
      color: #111827 !important;
      letter-spacing: 0.5px !important;
    }
    .report-subtitle {
      font-size: 10px !important;
      color: #6b7280 !important;
      margin-top: 2px !important;
    }

    /* RINGKASAN METRIK / KPI BOX */
    .report-kpi-grid, [class*="grid-cols-4"], [class*="sm:grid-cols-4"] {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 8px !important;
      margin: 8px 0 12px 0 !important;
      width: 100% !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .report-kpi-grid-3, [class*="grid-cols-3"] {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 10px !important;
      margin: 8px 0 12px 0 !important;
      width: 100% !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .report-kpi-card {
      background-color: #f9fafb !important;
      border: 1px solid #d1d5db !important;
      border-radius: 6px !important;
      padding: 6px 8px !important;
    }
    .report-kpi-label {
      font-size: 8.5px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      color: #6b7280 !important;
      letter-spacing: 0.3px !important;
    }
    .report-kpi-value {
      font-size: 12.5px !important;
      font-weight: 900 !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
      margin-top: 2px !important;
      color: #111827 !important;
    }
    .report-kpi-sub {
      font-size: 8.5px !important;
      color: #9ca3af !important;
      margin-top: 1px !important;
    }

    /* TABEL DATA FORMAL RESMI */
    table, .report-table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      margin: 6px 0 !important;
      page-break-inside: auto !important;
    }
    thead {
      display: table-header-group !important;
    }
    tfoot {
      display: table-footer-group !important;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    th {
      background-color: #f3f4f6 !important;
      color: #111827 !important;
      font-weight: 700 !important;
      border: 1px solid #9ca3af !important;
      padding: 5px 6px !important;
      font-size: 9.5px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.3px !important;
      line-height: 1.2 !important;
      vertical-align: middle !important;
    }
    td {
      border: 1px solid #d1d5db !important;
      padding: 4px 6px !important;
      font-size: 9.5px !important;
      vertical-align: middle !important;
      line-height: 1.25 !important;
      word-break: break-word !important;
    }
    tbody tr:nth-child(even) {
      background-color: #fafaf9 !important;
    }
    tfoot tr {
      background-color: #f3f4f6 !important;
      font-weight: 700 !important;
      border-top: 2px solid #111827 !important;
    }
    tfoot td {
      font-weight: 700 !important;
      border: 1px solid #9ca3af !important;
      padding: 6px 6px !important;
    }

    /* FORMAT LAPORAN LABA RUGI (FINANCIAL STATEMENT) */
    .pl-table {
      width: 100% !important;
      max-width: 680px !important;
      margin: 0 auto !important;
      border-collapse: collapse !important;
      border: 1px solid #9ca3af !important;
    }
    .pl-indent-1 {
      padding-left: 20px !important;
    }
    .pl-indent-2 {
      padding-left: 32px !important;
    }
    .pl-header {
      background-color: #f3f4f6 !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      font-size: 10px !important;
      letter-spacing: 0.3px !important;
      color: #111827 !important;
      border-top: 1.5px solid #6b7280 !important;
    }
    .pl-subtotal {
      background-color: #ecfdf5 !important;
      font-weight: 700 !important;
      color: #064e3b !important;
      border-top: 1px solid #9ca3af !important;
    }
    .pl-gross-profit {
      background-color: #eff6ff !important;
      font-weight: 800 !important;
      color: #1e40af !important;
      border-top: 1.5px solid #3b82f6 !important;
    }
    .pl-netprofit {
      background-color: #f0fdf4 !important;
      border-top: 2px solid #16a34a !important;
      border-bottom: 3px double #16a34a !important;
      font-weight: 900 !important;
      font-size: 11.5px !important;
      color: #052e16 !important;
    }
    .pl-netloss {
      background-color: #fff1f2 !important;
      border-top: 2px solid #e11d48 !important;
      border-bottom: 3px double #e11d48 !important;
      font-weight: 900 !important;
      font-size: 11.5px !important;
      color: #4c0519 !important;
    }

    /* FORMAT KOMPARASI ARUS DAGANG (CASH FLOW) */
    .report-cashflow-grid, [class*="md:grid-cols-2"] {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 12px !important;
      margin-top: 8px !important;
      width: 100% !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* BLOK TANDA TANGAN 3 PIHAK */
    .report-signatures, .signatures-block {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 16px !important;
      text-align: center !important;
      margin-top: 22px !important;
      padding-top: 14px !important;
      border-top: 1px solid #d1d5db !important;
      width: 100% !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .signature-box, .sig-box {
      text-align: center !important;
      padding: 4px 6px !important;
    }
    .sig-role {
      font-size: 9.5px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      color: #6b7280 !important;
    }
    .sig-title {
      font-size: 10px !important;
      font-weight: 700 !important;
      color: #111827 !important;
      margin-top: 2px !important;
    }
    .signature-line, .sig-line {
      width: 130px !important;
      height: 1px !important;
      border-bottom: 1.5px solid #111827 !important;
      margin: 45px auto 4px auto !important;
    }
    .sig-name {
      font-size: 9.5px !important;
      color: #4b5563 !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
    }
    .sig-note {
      text-align: center !important;
      font-size: 8.5px !important;
      color: #9ca3af !important;
      font-style: italic !important;
      margin-top: 12px !important;
      width: 100% !important;
    }

    /* UTILITY CLASSES FALLBACK */
    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .text-left { text-align: left !important; }
    .font-bold { font-weight: 700 !important; }
    .font-semibold { font-weight: 600 !important; }
    .font-medium { font-weight: 500 !important; }
    .font-black { font-weight: 900 !important; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }
    .uppercase { text-transform: uppercase !important; }
    .capitalize { text-transform: capitalize !important; }
    .italic { font-style: italic !important; }
    .w-full { width: 100% !important; }
    .mx-auto { margin-left: auto !important; margin-right: auto !important; }
    .flex { display: flex !important; }
    .items-center { align-items: center !important; }
    .items-start { align-items: flex-start !important; }
    .justify-between { justify-content: space-between !important; }
    .justify-end { justify-content: flex-end !important; }
    .shrink-0 { flex-shrink: 0 !important; }
    .gap-1 { gap: 4px !important; }
    .gap-2 { gap: 8px !important; }
    .gap-3 { gap: 12px !important; }
    .gap-4 { gap: 16px !important; }
    .space-y-4 > * + * { margin-top: 12px !important; }
    .space-y-3 > * + * { margin-top: 8px !important; }
    .space-y-2 > * + * { margin-top: 6px !important; }
    .p-1 { padding: 4px !important; }
    .p-1\\.5, .p-1\.5 { padding: 6px !important; }
    .p-2 { padding: 8px !important; }
    .p-2\\.5, .p-2\.5 { padding: 10px !important; }
    .p-3 { padding: 12px !important; }
    .p-3\\.5, .p-3\.5 { padding: 14px !important; }
    .p-4 { padding: 16px !important; }
    .pl-4 { padding-left: 16px !important; }
    .pl-6 { padding-left: 24px !important; }
    .my-2 { margin-top: 6px !important; margin-bottom: 6px !important; }
    .my-3 { margin-top: 10px !important; margin-bottom: 10px !important; }
    .my-3\\.5, .my-3\.5 { margin-top: 12px !important; margin-bottom: 12px !important; }
    .border { border: 1px solid #d1d5db !important; }
    .border-b { border-bottom: 1px solid #d1d5db !important; }
    .border-b-2 { border-bottom: 2px solid #111827 !important; }
    .border-t { border-top: 1px solid #d1d5db !important; }
    .border-t-2 { border-top: 2px solid #111827 !important; }
    .border-t-4 { border-top: 4px solid #111827 !important; }
    .border-double { border-style: double !important; }
    .rounded-lg { border-radius: 6px !important; }
    .rounded-xl { border-radius: 8px !important; }
    .rounded { border-radius: 4px !important; }

    /* WARNA TEKS */
    .text-emerald-700 { color: #047857 !important; }
    .text-emerald-800 { color: #065f46 !important; }
    .text-emerald-900 { color: #064e3b !important; }
    .text-emerald-950 { color: #022c22 !important; }
    .text-blue-600 { color: #2563eb !important; }
    .text-blue-700 { color: #1d4ed8 !important; }
    .text-blue-800 { color: #1e40af !important; }
    .text-rose-600 { color: #e11d48 !important; }
    .text-rose-700 { color: #be123c !important; }
    .text-rose-800 { color: #9f1239 !important; }
    .text-amber-700 { color: #b45309 !important; }
    .text-stone-400 { color: #a8a29e !important; }
    .text-stone-500 { color: #78716c !important; }
    .text-stone-600 { color: #57534e !important; }
    .text-stone-700 { color: #44403c !important; }
    .text-stone-800 { color: #292524 !important; }
    .text-stone-900 { color: #1c1917 !important; }
    .text-white { color: #ffffff !important; }

    /* BACKGROUND TEKS / BARIS */
    .bg-white { background-color: #ffffff !important; }
    .bg-stone-50 { background-color: #fafaf9 !important; }
    .bg-stone-100 { background-color: #f5f5f4 !important; }
    .bg-emerald-50 { background-color: #ecfdf5 !important; }
    .bg-emerald-100 { background-color: #d1fae5 !important; }
    .bg-blue-50 { background-color: #eff6ff !important; }
    .bg-rose-50 { background-color: #fff1f2 !important; }
    .bg-rose-100 { background-color: #ffe4e6 !important; }
    .bg-amber-50 { background-color: #fffbeb !important; }

    .break-inside-avoid, [class*="break-inside-avoid"] {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
      `;

      doc.open();
      doc.write(fullHtml);
      doc.close();

      const runPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (err) {
          console.error('Error saat print iframe:', err);
          window.print();
          resolve(false);
        }
      };

      const docObj = iframe.contentDocument;
      if (docObj && 'fonts' in docObj) {
        docObj.fonts.ready
          .then(() => setTimeout(runPrint, 120))
          .catch(() => setTimeout(runPrint, 250));
      } else {
        setTimeout(runPrint, 250);
      }
    } catch (err) {
      console.error('Exception di printHtmlDirectly:', err);
      window.print();
      resolve(false);
    }
  });
}
