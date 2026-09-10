import { Order, ReceiptInfo } from '../types';
import { formatRupiah } from './formatters';
import { cleanReceiptText } from './sanitizeReceipt';

/**
 * Helper untuk format teks rata tengah berdasarkan lebar kolom dot matrix (misal 40 kolom)
 */
export function centerText(text: string, width: number = 40): string {
  const clean = text.trim();
  if (clean.length >= width) return clean.slice(0, width);
  const leftPadding = Math.floor((width - clean.length) / 2);
  const rightPadding = width - clean.length - leftPadding;
  return ' '.repeat(leftPadding) + clean + ' '.repeat(rightPadding);
}

/**
 * Helper untuk format teks rata kiri & kanan (contoh: "Subtotal              Rp 50.000")
 */
export function padBetween(left: string, right: string, width: number = 40): string {
  const l = left.trim();
  const r = right.trim();
  const spaceNeeded = width - l.length - r.length;
  if (spaceNeeded <= 0) {
    // Jika terlalu panjang, potong bagian kiri
    const maxL = Math.max(5, width - r.length - 1);
    return l.slice(0, maxL) + ' ' + r;
  }
  return l + ' '.repeat(spaceNeeded) + r;
}

/**
 * Menghasilkan teks struk format RAW ASCII Monospace 40 kolom
 * Cocok langsung untuk printer Dot Matrix Epson TM-U220 (Font A 9x9 / 40 kolom per baris)
 */
export function generateRawPosReceiptText(
  order: Order,
  config: ReceiptInfo,
  cashierName?: string,
  paymentDetails?: { cashReceived?: number; changeAmount?: number }
): string {
  const cols = config.charactersPerLine || 40;
  const divChar = config.dividerChar || '=';
  const divider = divChar.repeat(cols);
  const thinDivider = '-'.repeat(cols);
  const lines: string[] = [];

  // 1. Header Brand & Toko
  const brand = (config.headerBrand || 'NUSA MART EXPRESS').toUpperCase();
  lines.push(centerText(brand, cols));

  if (config.subHeader) {
    lines.push(centerText(config.subHeader.toUpperCase(), cols));
  }

  const storeName = config.storeName || order.pickupStoreName || order.store?.name || 'KuickMart Express';
  lines.push(centerText(storeName, cols));

  const address = cleanReceiptText(config.address || '');
  if (address) {
    // Bungkus jika alamat panjang
    const words = address.split(' ');
    let currentLine = '';
    for (const w of words) {
      if ((currentLine + ' ' + w).trim().length <= cols) {
        currentLine = (currentLine + ' ' + w).trim();
      } else {
        lines.push(centerText(currentLine, cols));
        currentLine = w;
      }
    }
    if (currentLine) {
      lines.push(centerText(currentLine, cols));
    }
  }

  if (config.phone) {
    lines.push(centerText(`TELP: ${config.phone}`, cols));
  }
  if (config.taxIdOrNpwp) {
    lines.push(centerText(config.taxIdOrNpwp, cols));
  }
  if (config.headerCustomNote) {
    lines.push(centerText(config.headerCustomNote, cols));
  }

  // 2. Garis Pemisah
  lines.push(divider);

  // 3. Metadata Transaksi
  lines.push(padBetween(`NO : ${order.orderNumber}`, new Date(order.createdAt).toLocaleDateString('id-ID'), cols));
  const timeStr = new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const cashierDisplay = cashierName || config.cashierName || 'KASIR 01';
  
  if (config.showCashierName !== false) {
    lines.push(padBetween(`KASIR: ${cashierDisplay}`, `JAM: ${timeStr}`, cols));
  } else {
    lines.push(padBetween(`WAKTU: ${timeStr}`, '', cols));
  }

  if (config.showCustomerName !== false && order.customerName) {
    lines.push(padBetween(`PLG: ${order.customerName.slice(0, 20)}`, order.customerPhone ? order.customerPhone.slice(-8) : '', cols));
  }

  lines.push(thinDivider);

  // 4. Daftar Item Belanja
  const itemStyle = config.itemRowStyle || 'two_rows';

  order.items.forEach((it, idx) => {
    const pName = it.product.name.toUpperCase();
    const qty = it.quantity;
    const unit = (it.selectedUnit || 'PCS').toUpperCase();
    const price = it.unitPrice || it.product.price;
    const itemSubtotal = price * qty;
    const numIdx = String(idx + 1).padStart(2, '0');

    if (itemStyle === 'two_rows') {
      // Baris 1: Nomor dan Nama Barang
      lines.push(`${numIdx}. ${pName.slice(0, cols - 4)}`);
      // Baris 2: Qty x Harga Satuan         Subtotal
      const qtyPricePart = config.showItemUnit !== false 
        ? `    ${qty} ${unit} x ${formatRupiah(price).replace('Rp ', '')}`
        : `    ${qty} x ${formatRupiah(price).replace('Rp ', '')}`;
      const subtotalPart = formatRupiah(itemSubtotal).replace('Rp ', '');
      lines.push(padBetween(qtyPricePart, subtotalPart, cols));
    } else {
      // Baris 1 Ringkas: 1x Nama (pendek) ... Subtotal
      const shortName = pName.slice(0, cols - 16);
      const subtotalPart = formatRupiah(itemSubtotal).replace('Rp ', '');
      lines.push(padBetween(`${qty}x ${shortName}`, subtotalPart, cols));
    }
  });

  lines.push(thinDivider);

  // 5. Rincian Biaya & Total
  lines.push(padBetween('TOTAL ITEM / QTY', `${order.items.length} ITEM / ${order.items.reduce((acc, i) => acc + i.quantity, 0)} PCS`, cols));
  lines.push(padBetween('SUBTOTAL', formatRupiah(order.subtotal), cols));

  if (order.discountAmount > 0) {
    lines.push(padBetween('DISKON PROMO', `-${formatRupiah(order.discountAmount)}`, cols));
  }

  if (config.showTaxSummary && (config.taxRatePercent || 0) > 0) {
    const rate = config.taxRatePercent || 11;
    const taxAmount = Math.round(order.subtotal * (rate / 100));
    lines.push(padBetween(`PPN (${rate}%)`, formatRupiah(taxAmount), cols));
  }

  lines.push(divider);
  lines.push(padBetween('TOTAL AKHIR', formatRupiah(order.total), cols));
  lines.push(divider);

  // 6. Pembayaran
  const payMethod = (order.paymentMethod || 'TUNAI').toUpperCase().replace('_', ' ');
  lines.push(padBetween('CARA BAYAR', payMethod, cols));

  if (config.showPaymentDetail !== false && paymentDetails) {
    if (paymentDetails.cashReceived !== undefined && paymentDetails.cashReceived > 0) {
      lines.push(padBetween('TUNAI DITERIMA', formatRupiah(paymentDetails.cashReceived), cols));
    }
    if (paymentDetails.changeAmount !== undefined) {
      lines.push(padBetween('KEMBALIAN', formatRupiah(paymentDetails.changeAmount), cols));
    }
  }

  // 7. Poin Loyalty
  if (config.showMemberPoints !== false && order.pointsEarned > 0) {
    lines.push(thinDivider);
    lines.push(centerText(`POIN DIPEROLEH: +${order.pointsEarned} POIN`, cols));
  }

  // 8. Footer Pesan & Kebijakan
  lines.push(divider);
  if (config.footerMessage1) {
    lines.push(centerText(config.footerMessage1, cols));
  }
  if (config.footerMessage2) {
    lines.push(centerText(config.footerMessage2, cols));
  }
  if (config.csHotline) {
    lines.push(centerText(config.csHotline, cols));
  }
  if (config.websiteOrSocial) {
    lines.push(centerText(config.websiteOrSocial, cols));
  }

  // 9. Barcode Transaksi (Teks format)
  if (config.showBarcode !== false) {
    lines.push('');
    lines.push(centerText(`*${order.orderNumber}*`, cols));
  }

  // 10. Feed Lines (Gulung kertas agar sampai ke gerigi pemotong TM-U220)
  const feedCount = Math.max(2, config.feedLinesBeforeCut || 5);
  for (let i = 0; i < feedCount; i++) {
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Menghasilkan Dokumen HTML Lengkap Teroptimasi 70mm untuk Printer Dot Matrix Epson TM-U220
 * Dirancang khusus:
 * - Ukuran kertas roll 76mm / print area 70mm
 * - Monospace Font murni (Courier New / Lucida Console)
 * - Tinta monokromatik kontras tinggi (#000000 murni)
 * - Garis pemisah tegas dan presisi
 */
export function generateDotMatrixReceiptHtml(
  order: Order,
  config: ReceiptInfo,
  cashierName?: string,
  paymentDetails?: { cashReceived?: number; changeAmount?: number }
): string {
  const rawText = generateRawPosReceiptText(order, config, cashierName, paymentDetails);
  const brand = config.headerBrand || 'NUSA MART EXPRESS';
  const store = config.storeName || 'KuickMart Express';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Struk POS TM-U220 - ${order.orderNumber}</title>
  <style>
    @page {
      size: 76mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 70mm;
      max-width: 70mm;
      background: #ffffff;
      color: #000000;
      font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
      font-size: 11.5px;
      line-height: 1.18;
      font-weight: 600;
    }
    .receipt-container {
      width: 70mm;
      padding: 3mm 2mm;
      margin: 0 auto;
      background: #ffffff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: 900; }
    .header-brand {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .header-sub {
      font-size: 10px;
      margin-bottom: 3px;
    }
    .divider {
      border-top: 1px dashed #000000;
      margin: 4px 0;
    }
    .divider-double {
      border-top: 2px solid #000000;
      margin: 4px 0;
    }
    .meta-table, .item-table, .summary-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .meta-table td, .summary-table td {
      padding: 1px 0;
    }
    .item-row-title {
      font-weight: 800;
      word-break: break-word;
      padding-top: 3px;
    }
    .item-row-detail {
      display: flex;
      justify-content: space-between;
      padding-bottom: 2px;
    }
    .total-row {
      font-size: 13px;
      font-weight: 900;
      padding: 3px 0;
    }
    .barcode-area {
      text-align: center;
      margin-top: 8px;
      margin-bottom: 4px;
    }
    .barcode-lines {
      display: inline-block;
      height: 28px;
      letter-spacing: 2px;
      font-family: monospace;
      font-weight: 900;
      font-size: 11px;
    }
    .feed-lines {
      height: 35px;
      display: block;
    }
    @media screen {
      body {
        background: #e2e8f0;
        padding: 20px;
        display: flex;
        justify-content: center;
      }
      .receipt-container {
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        border: 1px solid #cbd5e1;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <!-- Header Toko -->
    <div class="text-center">
      <div class="header-brand">${brand}</div>
      ${config.subHeader ? `<div class="header-sub">${config.subHeader}</div>` : ''}
      <div style="font-size: 11px; font-weight: 800;">${store}</div>
      <div style="font-size: 10px; margin-top: 1px;">${cleanReceiptText(config.address || '')}</div>
      ${config.phone ? `<div style="font-size: 10px;">TELP: ${config.phone}</div>` : ''}
      ${config.taxIdOrNpwp ? `<div style="font-size: 9.5px;">${config.taxIdOrNpwp}</div>` : ''}
      ${config.headerCustomNote ? `<div style="font-size: 10px; font-weight: 800; margin-top: 2px;">${config.headerCustomNote}</div>` : ''}
    </div>

    <div class="divider-double"></div>

    <!-- Metadata Transaksi -->
    <table class="meta-table">
      <tr>
        <td>NO: <strong>${order.orderNumber}</strong></td>
        <td class="text-right">${new Date(order.createdAt).toLocaleDateString('id-ID')}</td>
      </tr>
      <tr>
        <td>KASIR: ${cashierName || config.cashierName || 'KASIR 01'}</td>
        <td class="text-right">${new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
      </tr>
      ${order.customerName ? `
      <tr>
        <td colspan="2">PLG: <strong>${order.customerName}</strong></td>
      </tr>` : ''}
    </table>

    <div class="divider"></div>

    <!-- Rincian Item Belanja -->
    <div>
      ${order.items.map((it, idx) => {
        const pName = it.product.name;
        const qty = it.quantity;
        const unit = it.selectedUnit || 'Pcs';
        const price = it.unitPrice || it.product.price;
        const subtotal = price * qty;
        const num = String(idx + 1).padStart(2, '0');

        return `
        <div style="margin-bottom: 3px;">
          <div class="item-row-title">${num}. ${pName}</div>
          <div class="item-row-detail">
            <span>&nbsp;&nbsp;&nbsp;${qty} ${unit} × ${formatRupiah(price).replace('Rp ', '')}</span>
            <span class="font-bold">${formatRupiah(subtotal).replace('Rp ', '')}</span>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="divider"></div>

    <!-- Ringkasan Biaya -->
    <table class="summary-table">
      <tr>
        <td>TOTAL ITEM</td>
        <td class="text-right">${order.items.length} ITEM (${order.items.reduce((acc, i) => acc + i.quantity, 0)} QTY)</td>
      </tr>
      <tr>
        <td>SUBTOTAL</td>
        <td class="text-right">${formatRupiah(order.subtotal)}</td>
      </tr>
      ${order.discountAmount > 0 ? `
      <tr>
        <td>DISKON</td>
        <td class="text-right">-${formatRupiah(order.discountAmount)}</td>
      </tr>` : ''}
      ${config.showTaxSummary && (config.taxRatePercent || 0) > 0 ? `
      <tr>
        <td>PPN (${config.taxRatePercent}%)</td>
        <td class="text-right">${formatRupiah(Math.round(order.subtotal * ((config.taxRatePercent || 11) / 100)))}</td>
      </tr>` : ''}
    </table>

    <div class="divider-double"></div>

    <table class="summary-table">
      <tr class="total-row">
        <td>TOTAL BAYAR</td>
        <td class="text-right font-bold" style="font-size: 13.5px;">${formatRupiah(order.total)}</td>
      </tr>
      <tr>
        <td>CARA BAYAR</td>
        <td class="text-right font-bold">${(order.paymentMethod || 'TUNAI').toUpperCase()}</td>
      </tr>
      ${paymentDetails && paymentDetails.cashReceived !== undefined && paymentDetails.cashReceived > 0 ? `
      <tr>
        <td>TUNAI DITERIMA</td>
        <td class="text-right">${formatRupiah(paymentDetails.cashReceived)}</td>
      </tr>
      <tr>
        <td>KEMBALIAN</td>
        <td class="text-right font-bold">${formatRupiah(paymentDetails.changeAmount || 0)}</td>
      </tr>` : ''}
    </table>

    ${order.pointsEarned > 0 && config.showMemberPoints !== false ? `
    <div class="divider"></div>
    <div class="text-center font-bold" style="font-size: 10px; margin: 3px 0;">
      ★ POIN DIPEROLEH: +${order.pointsEarned} POIN MEMBER ★
    </div>` : ''}

    <div class="divider-double"></div>

    <!-- Pesan Kaki (Footer) -->
    <div class="text-center" style="font-size: 9.5px; line-height: 1.25; margin-top: 4px;">
      ${config.footerMessage1 ? `<div>${config.footerMessage1}</div>` : ''}
      ${config.footerMessage2 ? `<div style="margin-top: 2px;">${config.footerMessage2}</div>` : ''}
      ${config.csHotline ? `<div style="margin-top: 2px;">${config.csHotline}</div>` : ''}
      ${config.websiteOrSocial ? `<div style="margin-top: 2px;">${config.websiteOrSocial}</div>` : ''}
    </div>

    <!-- Barcode -->
    ${config.showBarcode !== false ? `
    <div class="barcode-area">
      <div class="barcode-lines">||||| | |||| ||| || ||||| | ||||</div>
      <div style="font-size: 9.5px; font-weight: 800;">${order.orderNumber}</div>
    </div>` : ''}

    <!-- Feed lines to cutter -->
    <div class="feed-lines"></div>
  </div>
</body>
</html>`;
}

/**
 * Mencetak struk secara instan ke printer dot matrix Epson TM-U220 via isolated iframe
 * Tidak mengganggu viewport aplikasi dan mengisolasi ukuran halaman 70mm secara presisi.
 */
export function printPosReceiptViaIframe(htmlContent: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const frameId = '__pos_tmu220_print_frame__';
      let iframe = document.getElementById(frameId) as HTMLIFrameElement;
      
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = frameId;
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) {
        // Fallback jika iframe diblokir
        const printWin = window.open('', '_blank', 'width=350,height=600');
        if (printWin) {
          printWin.document.write(htmlContent);
          printWin.document.close();
          printWin.focus();
          setTimeout(() => {
            printWin.print();
            printWin.close();
            resolve(true);
          }, 350);
        } else {
          resolve(false);
        }
        return;
      }

      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (e) {
          console.error('Gagal memicu window.print() iframe:', e);
          resolve(false);
        }
      }, 350);
    } catch (err) {
      console.error('Error saat mencetak via iframe:', err);
      resolve(false);
    }
  });
}

/**
 * Mengunduh teks struk murni (.txt) untuk software spooler / direct serial printing
 */
export function downloadPosReceiptTxtFile(text: string, orderNumber: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `struk_${orderNumber}_tmu220.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Menyalin teks struk ke clipboard
 */
export async function copyPosReceiptText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch (err) {
    console.error('Gagal menyalin teks struk:', err);
    return false;
  }
}
