import { PurchaseOrder, Store, Supplier, Product } from '../types';
import { formatRupiah } from './formatters';

/**
 * Triggers a file download in the browser.
 */
export function downloadFile(content: BlobPart, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports Purchase Orders list to Excel-compatible HTML/XML Spreadsheet (.xls).
 * Opens natively in Microsoft Excel, Google Sheets, LibreOffice, and WPS Office
 * with styled table headers, formatted numbers, borders, and sum totals.
 */
export function exportPurchaseOrdersToExcel(
  purchases: PurchaseOrder[],
  title: string = 'Laporan Rekap Pesanan Pembelian (Purchase Orders)'
): void {
  const nowStr = new Date().toLocaleString('id-ID');
  const totalAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalQty = purchases.reduce((sum, p) => sum + (p.totalQuantity || 0), 0);
  const totalPaid = purchases.filter(p => p.paymentStatus === 'paid').reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalUnpaid = purchases.filter(p => p.paymentStatus !== 'paid').reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  const rowsHtml = purchases.map((p, idx) => {
    const itemsSummary = (p.items || [])
      .map(it => `${it.productName} (${it.quantity} ${it.unit || 'Pcs'})`)
      .join('; ');
    const unitsSummary = Array.from(new Set((p.items || []).map(it => it.unit || 'Pcs'))).join(', ');
    const totalPhysical = (p.items || []).reduce(
      (sum, it) => sum + (it.baseQuantity || (it.quantity * (it.conversionMultiplier || 1))),
      0
    );

    const statusBg = p.status === 'received' ? '#dcfce7' : '#fef3c7';
    const statusColor = p.status === 'received' ? '#15803d' : '#854d0e';
    const payBg = p.paymentStatus === 'paid' ? '#dcfce7' : '#fee2e2';
    const payColor = p.paymentStatus === 'paid' ? '#15803d' : '#991b1b';

    return `
      <tr>
        <td style="text-align: center; border: 1px solid #d1d5db; padding: 6px;">${idx + 1}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; font-weight: bold; mso-number-format:'\\@';">${p.purchaseNumber}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; mso-number-format:'\\@';">${p.invoiceNumber || '-'}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${p.orderDate || '-'}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${p.receivedDate || '-'}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; font-weight: bold;">${p.supplierName}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px;">${p.storeName || '-'}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px;">${itemsSummary}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${unitsSummary}</td>
        <td style="text-align: center; border: 1px solid #d1d5db; padding: 6px; font-weight: bold; mso-number-format:'#,##0';">${p.totalQuantity}</td>
        <td style="text-align: center; border: 1px solid #d1d5db; padding: 6px; color: #047857; mso-number-format:'#,##0';">${totalPhysical}</td>
        <td style="text-align: right; border: 1px solid #d1d5db; padding: 6px; font-weight: bold; mso-number-format:'#,##0';">${p.totalAmount}</td>
        <td style="text-align: center; border: 1px solid #d1d5db; padding: 6px; background-color: ${statusBg}; color: ${statusColor}; font-weight: bold;">
          ${p.status === 'received' ? 'Diterima' : p.status === 'ordered' ? 'Dipesan' : p.status}
        </td>
        <td style="text-align: center; border: 1px solid #d1d5db; padding: 6px; background-color: ${payBg}; color: ${payColor}; font-weight: bold;">
          ${p.paymentStatus === 'paid' ? 'Lunas' : 'Belum Lunas'}
        </td>
        <td style="text-align: center; border: 1px solid #d1d5db; padding: 6px; text-transform: uppercase;">${p.paymentMethod || '-'}</td>
        <td style="text-align: center; border: 1px solid #d1d5db; padding: 6px;">${p.dueDate || '-'}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px;">${p.notes || '-'}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Pesanan Pembelian</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #059669; color: #ffffff; font-weight: bold; border: 1px solid #047857; padding: 8px; font-size: 10pt; text-align: center; }
        td { font-size: 9.5pt; }
        .title { font-size: 16pt; font-weight: bold; color: #065f46; margin-bottom: 4px; }
        .meta { font-size: 10pt; color: #4b5563; margin-bottom: 12px; }
        .summary-box { margin-bottom: 15px; border-collapse: collapse; }
        .summary-box td { padding: 6px 14px; border: 1px solid #9ca3af; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="title">${title}</div>
      <div class="meta">Diekspor pada: ${nowStr} | Total ${purchases.length} Faktur PO</div>

      <table class="summary-box">
        <tr>
          <td style="background-color: #e5e7eb;">Total Nilai Pembelian:</td>
          <td style="color: #065f46; background-color: #ffffff; mso-number-format:'Rp #,##0';">Rp ${totalAmount.toLocaleString('id-ID')}</td>
          <td style="width: 20px; border: none;"></td>
          <td style="background-color: #e5e7eb;">Sudah Lunas:</td>
          <td style="color: #15803d; background-color: #ffffff; mso-number-format:'Rp #,##0';">Rp ${totalPaid.toLocaleString('id-ID')}</td>
          <td style="width: 20px; border: none;"></td>
          <td style="background-color: #e5e7eb;">Hutang / Tempo:</td>
          <td style="color: #b91c1c; background-color: #ffffff; mso-number-format:'Rp #,##0';">Rp ${totalUnpaid.toLocaleString('id-ID')}</td>
        </tr>
      </table>

      <table>
        <thead>
          <tr>
            <th style="width: 40px;">No</th>
            <th style="width: 140px;">No PO</th>
            <th style="width: 140px;">No Faktur Vendor</th>
            <th style="width: 90px;">Tgl Pesan</th>
            <th style="width: 90px;">Tgl Masuk</th>
            <th style="width: 180px;">Nama Supplier</th>
            <th style="width: 130px;">Toko Tujuan</th>
            <th style="width: 260px;">Rincian Barang</th>
            <th style="width: 100px;">Satuan</th>
            <th style="width: 80px;">Qty PO</th>
            <th style="width: 100px;">Fisik Masuk</th>
            <th style="width: 130px;">Total Beli (Rp)</th>
            <th style="width: 100px;">Status Barang</th>
            <th style="width: 100px;">Status Bayar</th>
            <th style="width: 90px;">Metode</th>
            <th style="width: 90px;">Jatuh Tempo</th>
            <th style="width: 160px;">Catatan</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="background-color: #d1fae5; font-weight: bold; border-top: 2px solid #059669;">
            <td colspan="9" style="text-align: right; padding: 8px; border: 1px solid #a7f3d0;">TOTAL KESELURUHAN:</td>
            <td style="text-align: center; padding: 8px; border: 1px solid #a7f3d0; mso-number-format:'#,##0';">${totalQty}</td>
            <td style="text-align: center; padding: 8px; border: 1px solid #a7f3d0;">-</td>
            <td style="text-align: right; padding: 8px; border: 1px solid #a7f3d0; font-size: 11pt; color: #065f46; mso-number-format:'#,##0';">${totalAmount}</td>
            <td colspan="5" style="border: 1px solid #a7f3d0;"></td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `.trim();

  const fileName = `Laporan_Pembelian_${new Date().toISOString().slice(0, 10)}.xls`;
  downloadFile(htmlContent, fileName, 'application/vnd.ms-excel;charset=utf-8;');
}

/**
 * Exports Detailed Purchase Items (Rincian Barang per Faktur PO) to Excel (.xls).
 * Ideal for warehouse receipt reconciliation, barcode audit, and HPP analysis.
 */
export function exportPurchaseItemsDetailToExcel(
  purchases: PurchaseOrder[],
  title: string = 'Laporan Rincian Barang Masuk & Pembelian'
): void {
  const nowStr = new Date().toLocaleString('id-ID');
  let itemCounter = 0;
  let grandTotalAmount = 0;
  let grandTotalQty = 0;
  let grandTotalBaseQty = 0;

  const rowsHtml = purchases.flatMap(po => {
    return (po.items || []).map(it => {
      itemCounter++;
      grandTotalAmount += it.subtotal || 0;
      grandTotalQty += it.quantity || 0;
      const baseQty = it.baseQuantity || (it.quantity * (it.conversionMultiplier || 1));
      grandTotalBaseQty += baseQty;

      return `
        <tr>
          <td style="text-align: center; border: 1px solid #d1d5db; padding: 5px;">${itemCounter}</td>
          <td style="border: 1px solid #d1d5db; padding: 5px; font-weight: bold; mso-number-format:'\\@';">${po.purchaseNumber}</td>
          <td style="border: 1px solid #d1d5db; padding: 5px; text-align: center;">${po.orderDate}</td>
          <td style="border: 1px solid #d1d5db; padding: 5px;">${po.supplierName}</td>
          <td style="border: 1px solid #d1d5db; padding: 5px; font-family: monospace; mso-number-format:'\\@';">${it.barcode || '-'}</td>
          <td style="border: 1px solid #d1d5db; padding: 5px; font-weight: bold;">${it.productName}</td>
          <td style="border: 1px solid #d1d5db; padding: 5px; text-align: center; font-weight: bold; color: #4338ca;">${it.unit || 'Pcs'}</td>
          <td style="text-align: center; border: 1px solid #d1d5db; padding: 5px; font-weight: bold; mso-number-format:'#,##0';">${it.quantity}</td>
          <td style="text-align: center; border: 1px solid #d1d5db; padding: 5px;">1 ${it.unit} = ${it.conversionMultiplier || 1} ${it.baseUnit || 'Pcs'}</td>
          <td style="text-align: center; border: 1px solid #d1d5db; padding: 5px; font-weight: bold; color: #047857; mso-number-format:'#,##0';">${baseQty} ${it.baseUnit || 'Pcs'}</td>
          <td style="text-align: right; border: 1px solid #d1d5db; padding: 5px; mso-number-format:'#,##0';">${it.costPrice}</td>
          <td style="text-align: right; border: 1px solid #d1d5db; padding: 5px; font-weight: bold; color: #065f46; mso-number-format:'#,##0';">${it.subtotal}</td>
          <td style="text-align: center; border: 1px solid #d1d5db; padding: 5px;">${po.status === 'received' ? 'Diterima' : 'Dipesan'}</td>
          <td style="text-align: center; border: 1px solid #d1d5db; padding: 5px;">${po.paymentStatus === 'paid' ? 'Lunas' : 'Tempo'}</td>
        </tr>
      `;
    });
  }).join('');

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #047857; color: #ffffff; font-weight: bold; border: 1px solid #065f46; padding: 7px; text-align: center; }
        td { font-size: 9.5pt; }
      </style>
    </head>
    <body>
      <h2 style="color: #065f46; margin-bottom: 4px;">${title}</h2>
      <p style="color: #6b7280; font-size: 9pt; margin-bottom: 12px;">Diekspor pada: ${nowStr} | Total ${itemCounter} Baris Barang</p>

      <table>
        <thead>
          <tr>
            <th style="width: 40px;">No</th>
            <th style="width: 130px;">No PO</th>
            <th style="width: 90px;">Tgl Pesan</th>
            <th style="width: 170px;">Supplier</th>
            <th style="width: 130px;">Barcode</th>
            <th style="width: 240px;">Nama Produk</th>
            <th style="width: 90px;">Satuan PO</th>
            <th style="width: 70px;">Qty PO</th>
            <th style="width: 130px;">Konversi Satuan</th>
            <th style="width: 100px;">Stok Fisik (+Fisik)</th>
            <th style="width: 120px;">Harga Modal (Rp)</th>
            <th style="width: 130px;">Subtotal (Rp)</th>
            <th style="width: 90px;">Status Barang</th>
            <th style="width: 90px;">Status Bayar</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="background-color: #d1fae5; font-weight: bold; border-top: 2px solid #047857;">
            <td colspan="7" style="text-align: right; padding: 8px; border: 1px solid #a7f3d0;">TOTAL RINCIAN:</td>
            <td style="text-align: center; padding: 8px; border: 1px solid #a7f3d0; mso-number-format:'#,##0';">${grandTotalQty}</td>
            <td style="border: 1px solid #a7f3d0;"></td>
            <td style="text-align: center; padding: 8px; border: 1px solid #a7f3d0; color: #047857; mso-number-format:'#,##0';">${grandTotalBaseQty}</td>
            <td style="border: 1px solid #a7f3d0;"></td>
            <td style="text-align: right; padding: 8px; border: 1px solid #a7f3d0; font-size: 11pt; color: #065f46; mso-number-format:'#,##0';">${grandTotalAmount}</td>
            <td colspan="2" style="border: 1px solid #a7f3d0;"></td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `.trim();

  const fileName = `Rincian_Barang_Pembelian_${new Date().toISOString().slice(0, 10)}.xls`;
  downloadFile(htmlContent, fileName, 'application/vnd.ms-excel;charset=utf-8;');
}

/**
 * Generates ready-to-send WhatsApp message string for a Purchase Order.
 */
export function formatPurchaseOrderForWhatsApp(
  po: PurchaseOrder,
  store?: Store,
  supplier?: Supplier
): string {
  const storeName = store?.name || po.storeName || 'Toko Online';
  const storeAddress = store?.address ? `\n📍 *Alamat Pengiriman:* ${store.address}` : '';
  const dateStr = po.orderDate || new Date().toISOString().slice(0, 10);

  const itemsList = (po.items || []).map((it, idx) => {
    const unitStr = it.unit || 'Pcs';
    const convStr = it.conversionMultiplier && it.conversionMultiplier > 1
      ? ` (isi ${it.conversionMultiplier} ${it.baseUnit || 'Pcs'})`
      : '';
    const priceStr = it.costPrice > 0 ? ` @ ${formatRupiah(it.costPrice)}` : '';
    const subStr = it.subtotal > 0 ? ` = *${formatRupiah(it.subtotal)}*` : '';
    return `${idx + 1}. *${it.productName}* [${it.barcode || '-'}] \n   👉 *${it.quantity} ${unitStr}*${convStr}${priceStr}${subStr}`;
  }).join('\n\n');

  const notesStr = po.notes ? `\n\n📝 *Catatan Khusus:* ${po.notes}` : '';
  const dueStr = po.dueDate ? `\n⏱️ *Jatuh Tempo:* ${po.dueDate}` : '';

  return `📦 *PESANAN PEMBELIAN BARANG (PURCHASE ORDER)*
=================================
*No PO:* ${po.purchaseNumber}
${po.invoiceNumber ? `*No Faktur Vendor:* ${po.invoiceNumber}\n` : ''}*Tanggal:* ${dateStr}
*Kepada:* ${po.supplierName}
*Toko / Pemesan:* ${storeName}${storeAddress}
=================================

*DAFTAR BARANG YANG DIPESAN:*

${itemsList}

=================================
*Total Macam Barang:* ${po.items.length} Item
*Total Estimasi Nilai:* *${formatRupiah(po.totalAmount)}*
*Metode Pembayaran:* ${po.paymentMethod.toUpperCase()}${dueStr}${notesStr}

Mohon konfirmasi ketersediaan barang dan jadwal pengiriman. Terima kasih! 🙏`;
}

/**
 * Creates a WhatsApp Web/App direct link with URL-encoded message.
 */
export function createWhatsAppUrl(phone?: string, text?: string): string {
  let cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  }
  const encodedText = encodeURIComponent(text || '');
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Exports Purchase Orders to standard CSV file (with UTF-8 BOM for Microsoft Excel).
 */
export function exportPurchaseOrdersToCsv(purchases: PurchaseOrder[], filename?: string): void {
  const headers = [
    'No PO',
    'No Faktur Vendor',
    'Tanggal Pesan',
    'Tanggal Masuk',
    'Supplier',
    'Cabang Toko',
    'Daftar Barang',
    'Satuan',
    'Total Qty PO',
    'Subtotal (Rp)',
    'Total (Rp)',
    'Status Barang',
    'Status Bayar',
    'Metode Bayar',
    'Jatuh Tempo',
    'Stok Sudah Masuk',
    'Catatan',
  ];

  const rows = purchases.map(p => [
    `"${p.purchaseNumber}"`,
    `"${p.invoiceNumber || '-'}"`,
    `"${p.orderDate}"`,
    `"${p.receivedDate || '-'}"`,
    `"${(p.supplierName || '').replace(/"/g, '""')}"`,
    `"${(p.storeName || '').replace(/"/g, '""')}"`,
    `"${(p.items || []).map(it => `${it.productName} (${it.quantity} ${it.unit})`).join('; ').replace(/"/g, '""')}"`,
    `"${Array.from(new Set((p.items || []).map(it => it.unit))).join(', ')}"`,
    p.totalQuantity,
    p.subtotal,
    p.totalAmount,
    p.status,
    p.paymentStatus,
    p.paymentMethod,
    `"${p.dueDate || '-'}"`,
    p.stockUpdated ? 'Ya' : 'Belum',
    `"${(p.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const targetName = filename || `Laporan_Pembelian_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csvContent, targetName, 'text/csv;charset=utf-8;');
}

/**
 * Exports Purchase Orders to structured JSON file.
 */
export function exportPurchaseOrdersToJson(purchases: PurchaseOrder[], filename?: string): void {
  const jsonStr = JSON.stringify(purchases, null, 2);
  const targetName = filename || `Backup_Purchase_Orders_${new Date().toISOString().slice(0, 10)}.json`;
  downloadFile(jsonStr, targetName, 'application/json;charset=utf-8;');
}
