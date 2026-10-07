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
      const { title = 'Surat Pesanan Pembelian (PO)', landscape = false } = options;

      // Cari atau buat hidden iframe khusus print
      let iframe = document.getElementById('isolated-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'isolated-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        iframe.style.zIndex = '-9999';
        document.body.appendChild(iframe);
      }

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
      margin: 12mm 10mm 15mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background-color: #ffffff;
      padding: 0;
      font-size: 12px;
      line-height: 1.35;
      width: 100%;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .font-black { font-weight: 900; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .uppercase { text-transform: uppercase; }
    .capitalize { text-transform: capitalize; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
      margin-top: 8px;
      margin-bottom: 8px;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 5px 7px;
      font-size: 11px;
    }
    th {
      background-color: #f3f4f6 !important;
      font-weight: bold;
      color: #1f2937;
    }
    .kop-header {
      border-bottom: 2px solid #111827;
      padding-bottom: 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .kop-title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #065f46;
      text-transform: uppercase;
    }
    .doc-badge {
      font-size: 10px;
      font-weight: 900;
      background-color: #065f46;
      color: #ffffff;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .signatures-block {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      page-break-inside: avoid;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      text-align: center;
      gap: 16px;
    }
    .signature-box {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .signature-line {
      width: 140px;
      height: 1px;
      background-color: #4b5563;
      margin: 45px auto 4px auto;
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
