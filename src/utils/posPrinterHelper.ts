import { Order, ReceiptInfo } from '../types';
import { formatRupiah } from './formatters';
import { cleanReceiptText, formatReceiptAddress } from './sanitizeReceipt';
import { 
  generateCrispDotMatrixReceiptHtml, 
  generateEscPosBinaryBuffer, 
  printDirectRawToSerialPort, 
  isWebSerialSupported,
  getOrRequestSerialPort,
  disconnectSerialPort,
  printViaRawBt,
  getReceiptFontFamilyCss,
  getReceiptFontWeightCss,
  getReceiptFontSizeCss
} from './rawPosPrintEngine';

// Re-export untuk kemudahan akses di komponen POS
export { 
  generateCrispDotMatrixReceiptHtml, 
  generateEscPosBinaryBuffer, 
  printDirectRawToSerialPort, 
  isWebSerialSupported,
  getOrRequestSerialPort,
  disconnectSerialPort,
  printViaRawBt,
  getReceiptFontFamilyCss,
  getReceiptFontWeightCss,
  getReceiptFontSizeCss
};

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
  const brand = (config.headerBrand || config.storeName || order.pickupStoreName || order.store?.name || '').trim().toUpperCase();
  if (brand) {
    lines.push(centerText(brand, cols));
  }

  if (config.subHeader) {
    lines.push(centerText(config.subHeader.toUpperCase(), cols));
  }

  const storeName = (config.storeName || '').trim();
  if (storeName && (!brand || storeName.toUpperCase() !== brand)) {
    lines.push(centerText(storeName, cols));
  }

  const address = formatReceiptAddress(config);
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

  // Tanda Tangan Kasir & Pelanggan (Sejajar Horizontal 2 Sisi Kiri & Kanan)
  if (config.showSignatures !== false) {
    lines.push(thinDivider);
    lines.push(padBetween('Kasir,', 'Pelanggan,', cols));
    lines.push('');
    lines.push('');
    const leftSig = `( ${(cashierDisplay || 'Kasir').slice(0, 12)} )`;
    const rightSig = `( ${(order.customerName || 'Pelanggan').slice(0, 12)} )`;
    lines.push(padBetween(leftSig, rightSig, cols));
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
 * Menghasilkan Dokumen HTML Lengkap Teroptimasi untuk Printer Dot Matrix Epson TM-U220 & Thermal
 * Dirancang khusus:
 * - Ukuran kertas roll 76mm / print area 70mm, atau 58mm / 80mm
 * - Pilihan jenis huruf tajam (Courier New, Roboto Mono, Consolas, Lucida Console)
 * - Tinta monokromatik kontras tinggi (#000000 murni)
 * - Jarak antar baris rapat dan presisi tanpa gap kosong berlebih
 */
export function generateDotMatrixReceiptHtml(
  order: Order,
  config: ReceiptInfo,
  cashierName?: string,
  paymentDetails?: { cashReceived?: number; changeAmount?: number }
): string {
  // Format iPos 4 (Native Monospace 40-Kolom Super Tajam & Cepat untuk TM-U220)
  if (
    config.receiptLayoutFormat === 'ipos4' || 
    config.receiptLayoutFormat === undefined || 
    config.printerType === 'dot_matrix_tmu220' || 
    config.paperWidth === '70mm_dotmatrix'
  ) {
    return generateCrispDotMatrixReceiptHtml(order, config, cashierName, paymentDetails);
  }

  const brand = (config.headerBrand || config.storeName || order.pickupStoreName || order.store?.name || '').trim().toUpperCase();
  const store = (config.storeName || '').trim();
  const address = formatReceiptAddress(config);

  const fontCss = getReceiptFontFamilyCss(config.fontFamily);
  const weightCss = getReceiptFontWeightCss(config.fontBoldness);
  const fontSizes = getReceiptFontSizeCss(config.fontSize);
  const lineSpacingVal = config.lineSpacing === 'compact' ? '1.05' : config.lineSpacing === 'relaxed' ? '1.20' : '1.12';

  const paperWidthChoice = config.paperWidth || '70mm_dotmatrix';
  let rollWidthMm = 76;
  let printWidthMm = 70;
  if (paperWidthChoice === '58mm') {
    rollWidthMm = 58;
    printWidthMm = 52;
  } else if (paperWidthChoice === '80mm') {
    rollWidthMm = 80;
    printWidthMm = 74;
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Struk POS - ${order.orderNumber}</title>
  <!-- Font Monospace Tajam & Pekat -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inconsolata:wght@600;700;800;900&family=Roboto+Mono:wght@500;600;700;800;900&family=Space+Mono:wght@700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: ${rollWidthMm}mm auto;
      margin: 0mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: ${rollWidthMm}mm;
      max-width: ${rollWidthMm}mm;
      background: #ffffff !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      font-family: ${fontCss};
      font-size: ${fontSizes.base};
      line-height: ${lineSpacingVal};
      font-weight: ${weightCss};
      text-rendering: optimizeLegibility !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      image-rendering: pixelated;
    }
    .receipt-container {
      width: ${printWidthMm}mm;
      max-width: ${printWidthMm}mm;
      padding: 1mm 2mm 1mm 3.5mm;
      margin: 0 auto;
      background: #ffffff;
      white-space: normal;
      word-break: break-word;
      line-height: ${lineSpacingVal};
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      font-weight: ${weightCss};
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: 900; }
    .header-brand {
      font-size: ${fontSizes.brand};
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-bottom: 1px;
      text-transform: uppercase;
      line-height: 1.15;
    }
    .header-sub {
      font-size: 10px;
      margin-bottom: 1px;
      line-height: 1.15;
    }
    .divider {
      border-top: 1px dashed #000000;
      margin: 2px 0;
    }
    .divider-double {
      border-top: 2px solid #000000;
      margin: 2px 0;
    }
    .meta-table, .item-table, .summary-table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      font-size: ${fontSizes.meta};
      line-height: ${lineSpacingVal};
      margin: 0;
      padding: 0;
    }
    .meta-table td, .summary-table td {
      padding: 0.5px 0;
      line-height: ${lineSpacingVal};
    }
    .item-row-title {
      font-weight: 800;
      word-break: break-word;
      padding-top: 1px;
      line-height: ${lineSpacingVal};
    }
    .item-row-detail {
      display: flex;
      justify-content: space-between;
      padding-bottom: 1px;
      line-height: ${lineSpacingVal};
    }
    .total-row {
      font-size: ${fontSizes.brand};
      font-weight: 900;
      padding: 1px 0;
      line-height: 1.15;
    }
    .barcode-area {
      text-align: center;
      margin-top: 4px;
      margin-bottom: 2px;
      line-height: 1;
    }
    .barcode-lines {
      display: inline-block;
      height: 22px;
      letter-spacing: 2px;
      font-family: monospace;
      font-weight: 900;
      font-size: 11px;
    }
    .feed-lines {
      height: ${Math.max(1, config.feedLinesBeforeCut || 3) * 6}px;
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
    <div class="text-center">
      ${brand ? `<div class="header-brand">${brand}</div>` : ''}
      ${config.subHeader ? `<div class="header-sub">${config.subHeader}</div>` : ''}
      ${store && (!brand || store.toUpperCase() !== brand) ? `<div style="font-size: 11px; font-weight: 800;">${store}</div>` : ''}
      ${address ? `<div style="font-size: 10px; margin-top: 0.5px;">${address}</div>` : ''}
      ${config.phone ? `<div style="font-size: 10px;">TELP: ${config.phone}</div>` : ''}
      ${config.taxIdOrNpwp ? `<div style="font-size: 9.5px;">${config.taxIdOrNpwp}</div>` : ''}
      ${config.headerCustomNote ? `<div style="font-size: 10px; font-weight: 800; margin-top: 1px;">${config.headerCustomNote}</div>` : ''}
    </div>

    <div class="divider-double"></div>

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

    <div>
      ${order.items.map((it, idx) => {
        const pName = it.product.name;
        const qty = it.quantity;
        const unit = it.selectedUnit || 'Pcs';
        const price = it.unitPrice || it.product.price;
        const subtotal = price * qty;
        const num = String(idx + 1).padStart(2, '0');

        return `
        <div style="margin-bottom: 1.5px;">
          <div class="item-row-title">${num}. ${pName}</div>
          <div class="item-row-detail">
            <span>&nbsp;&nbsp;&nbsp;${qty} ${unit} × ${formatRupiah(price).replace('Rp ', '')}</span>
            <span class="font-bold">${formatRupiah(subtotal).replace('Rp ', '')}</span>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="divider"></div>

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
        <td class="text-right font-bold">${formatRupiah(order.total)}</td>
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
    <div class="text-center font-bold" style="font-size: 10px; margin: 2px 0;">
      ★ POIN DIPEROLEH: +${order.pointsEarned} POIN MEMBER ★
    </div>` : ''}

    <div class="divider-double"></div>

    ${config.showSignatures !== false ? `
    <!-- Komponen Penandatanganan Struk (Flexbox justify-between & Grid 2-kolom horizontal) -->
    <div class="receipt-signatures" style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; margin: 6px 0 4px 0; font-size: 10px; text-align: center; box-sizing: border-box;">
      <div style="width: 46%; flex: 1; text-align: center; padding: 0 4px; box-sizing: border-box;">
        <div>Kasir,</div>
        <div style="height: 26px;"></div>
        <div style="border-top: 1px dashed #000000; padding-top: 2px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">( ${cashierName || config.cashierName || 'Kasir 01'} )</div>
      </div>
      <div style="width: 46%; flex: 1; text-align: center; padding: 0 4px; box-sizing: border-box;">
        <div>Pelanggan,</div>
        <div style="height: 26px;"></div>
        <div style="border-top: 1px dashed #000000; padding-top: 2px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">( ${order.customerName || 'Pelanggan'} )</div>
      </div>
    </div>
    <div class="divider"></div>
    ` : ''}

    <div class="text-center" style="font-size: 9.5px; line-height: 1.15; margin-top: 2px;">
      ${config.footerMessage1 ? `<div>${config.footerMessage1}</div>` : ''}
      ${config.footerMessage2 ? `<div style="margin-top: 1px;">${config.footerMessage2}</div>` : ''}
      ${config.csHotline ? `<div style="margin-top: 1px;">${config.csHotline}</div>` : ''}
      ${config.websiteOrSocial ? `<div style="margin-top: 1px;">${config.websiteOrSocial}</div>` : ''}
    </div>

    ${config.showBarcode !== false ? `
    <div class="barcode-area">
      <div class="barcode-lines">||||| | |||| ||| || ||||| | ||||</div>
      <div style="font-size: 9.5px; font-weight: 800;">${order.orderNumber}</div>
    </div>` : ''}

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

      const runPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (e) {
          console.error('Gagal memicu window.print() iframe:', e);
          resolve(false);
        }
      };

      const docObj = iframe.contentDocument;
      if (docObj && 'fonts' in docObj) {
        docObj.fonts.ready
          .then(() => {
            setTimeout(runPrint, 150);
          })
          .catch(() => {
            setTimeout(runPrint, 300);
          });
      } else {
        setTimeout(runPrint, 300);
      }
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
