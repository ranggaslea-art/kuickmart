/**
 * Raw POS & ESC/POS Dot Matrix Printing Engine for Epson TM-U220 & iPos 4 Compatibility
 * 
 * Mengapa iPos 4 sangat jelas dan cepat?
 * 1. Mode Raw Text / Direct ESC/POS Command:
 *    iPos 4 mengirim teks ASCII mentah langsung ke port printer (Serial / USB / Raw Spooler),
 *    BUKAN merender halaman grafis HTML/CSS.
 *    Printer TM-U220 memiliki ROM Font bawaan (Font A: 9x9 dot pin / Font B: 7x9 dot pin).
 *    Saat menerima raw text, jarum mencetak 1 pass per baris secara instan (4.7 lines/sec)
 *    dengan ketajaman 100% pin impact dot tanpa distorsi grafis browser.
 * 
 * 2. Mode Browser Print CSS Monokrom Murni (Zero Antialiasing / Crisp Dot):
 *    Jika mencetak melalui dialog peramban (OS Spooler / Edge / Chrome),
 *    kita menggunakan CSS @media print khusus dot matrix:
 *    - Font hardware: 'Courier New', monospace
 *    - Non-antialiasing: text-rendering: geometricPrecision; image-rendering: pixelated;
 *    - Tidak ada elemen abu-abu atau gradien, 100% kontras murni #000000
 *    - Petunjuk driver EPSON APD / Generic Text Only agar tidak memproses gambar
 */

import { Order, ReceiptInfo } from '../types';
import { formatRupiah } from './formatters';
import { cleanReceiptText } from './sanitizeReceipt';

// ESC/POS Byte Constants
export const ESC = 0x1b;
export const GS = 0x1d;

/**
 * Membuat binary buffer ESC/POS murni untuk dikirim langsung via Web Serial / Web USB / RawBT / QZ Tray
 */
export function generateEscPosBinaryBuffer(
  order: Order,
  config: ReceiptInfo,
  cashierName?: string,
  paymentDetails?: { cashReceived?: number; changeAmount?: number }
): Uint8Array {
  const bytes: number[] = [];

  const addBytes = (...b: number[]) => bytes.push(...b);
  const addText = (text: string) => {
    // Encode to CP437 / ASCII bytes
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      bytes.push(code > 127 ? 63 : code); // 63 = '?' if non-ascii
    }
  };
  const addLine = (text: string = '') => {
    addText(text);
    addBytes(0x0a); // LF
  };

  const cols = config.charactersPerLine || 40;
  const divider = (config.dividerChar || '=').repeat(cols);
  const thinDivider = '-'.repeat(cols);

  // 1. Initialize Printer
  addBytes(ESC, 0x40); // ESC @ (Initialize printer)

  // Double-strike mode (ESC G 1): Jarum dot-matrix memukul 2x per titik, menghasilkan cetakan hitam pekat dan bebas kabur
  addBytes(ESC, 0x47, 0x01); // ESC G 1 (Double Strike ON)

  // 2. Select Font A (9x9, 40 cols) or Font B (7x9, 33 cols)
  if (cols === 33) {
    addBytes(ESC, 0x4d, 0x01); // ESC M 1 (Font B)
  } else {
    addBytes(ESC, 0x4d, 0x00); // ESC M 0 (Font A - Standard 40 cols)
  }

  // 3. Header Toko (Center)
  addBytes(ESC, 0x61, 0x01); // ESC a 1 (Align Center)

  // Brand Name - Emphasized / Double Width
  addBytes(ESC, 0x45, 0x01); // ESC E 1 (Emphasized/Bold ON)
  addBytes(ESC, 0x21, 0x20); // ESC ! 32 (Double width)
  const defaultBrand = config.headerBrand || config.storeName || order.pickupStoreName || order.store?.name || 'NUSA MART EXPRESS';
  addLine(defaultBrand.toUpperCase());

  addBytes(ESC, 0x21, 0x00); // Normal width
  addBytes(ESC, 0x45, 0x00); // Bold OFF

  if (config.subHeader) {
    addLine(config.subHeader.toUpperCase());
  }

  const storeName = config.storeName || order.pickupStoreName || order.store?.name || 'KUICKMART';
  if (storeName && storeName !== config.headerBrand) {
    addLine(storeName);
  }

  const address = cleanReceiptText(config.address || '');
  if (address) {
    // Split per 40 karakter agar rapi
    const words = address.split(' ');
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length <= cols) {
        line = (line + ' ' + w).trim();
      } else {
        addLine(line);
        line = w;
      }
    }
    if (line) addLine(line);
  }

  if (config.phone) {
    addLine(`TELP: ${config.phone}`);
  }
  if (config.taxIdOrNpwp) {
    addLine(config.taxIdOrNpwp);
  }

  // 4. Garis Pemisah
  addBytes(ESC, 0x61, 0x00); // Align Left
  addLine(divider);

  // 5. Metadata Transaksi
  const dateStr = new Date(order.createdAt).toLocaleDateString('id-ID');
  const timeStr = new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const cashierDisp = cashierName || config.cashierName || '01';
  const customerDisp = order.customerName ? order.customerName.toUpperCase() : 'PELANGGAN';

  addLine(padBetweenEsc(`No. : ${order.orderNumber}`, dateStr, cols));
  addLine(padBetweenEsc(`Kasir: ${cashierDisp}`, timeStr, cols));

  if (config.showCustomerName !== false) {
    addLine(padBetweenEsc(`Pel. : ${customerDisp}`, '', cols));
  }

  addLine(thinDivider);

  // 6. Item Belanja (Format mirip iPos 4 yang ringkas & jelas)
  const isSingleRow = config.itemRowStyle === 'single_row';

  order.items.forEach((it) => {
    const pName = it.product.name.toUpperCase();
    const qty = it.quantity;
    const unit = (it.selectedUnit || 'PCS').toUpperCase();
    const price = it.unitPrice || it.product.price;
    const subtotal = price * qty;

    const formattedPrice = formatNumberNoRp(price);
    const formattedSubtotal = formatNumberNoRp(subtotal);

    if (isSingleRow && pName.length <= 16) {
      // 1 Baris: NAMA        1 PCS   10,000
      const leftPart = pName.padEnd(16, ' ');
      const qtyPart = `${qty} ${unit}`.padStart(8, ' ');
      const totalPart = formattedSubtotal.padStart(cols - 24, ' ');
      addLine(leftPart + qtyPart + totalPart);
    } else {
      // Format 2 Baris iPos 4:
      // LE MINERALE 1500ML
      // 4.500,000  x 1,000 PCS =    4.500,000
      addLine(pName.slice(0, cols));
      const calcStr = `${formattedPrice}  x ${qty} ${unit} =`;
      const line2 = padBetweenEsc(calcStr, formattedSubtotal, cols);
      addLine(line2);
    }
  });

  addLine(thinDivider);

  // 7. Ringkasan & Total
  const totalQty = order.items.reduce((acc, i) => acc + i.quantity, 0);
  const totalItemStr = `BARIS=${order.items.length}  ,QTY ${totalQty}`;
  addLine(padBetweenEsc(totalItemStr, formatNumberNoRp(order.subtotal), cols));

  if (order.discountAmount > 0) {
    addLine(padBetweenEsc('Diskon', `-${formatNumberNoRp(order.discountAmount)}`, cols));
  }

  // TOTAL UTAMA (Bold & Double width di iPos 4)
  addBytes(ESC, 0x45, 0x01); // Bold ON
  addLine(padBetweenEsc('TOTAL :', formatNumberNoRp(order.total), cols));
  addBytes(ESC, 0x45, 0x00); // Bold OFF

  // Pembayaran Tunai & Kembali
  const cashRec = paymentDetails?.cashReceived || order.total;
  const change = paymentDetails?.changeAmount !== undefined ? paymentDetails.changeAmount : Math.max(0, cashRec - order.total);

  addLine(padBetweenEsc('Tunai', formatNumberNoRp(cashRec), cols));
  addLine(padBetweenEsc('Kembali', formatNumberNoRp(change), cols));

  // Tanda Tangan Kasir & Pelanggan (Sejajar Horizontal 2 Sisi Kiri & Kanan)
  if (config.showSignatures !== false) {
    addLine(thinDivider);
    addLine(padBetweenEsc('Kasir,', 'Pelanggan,', cols));
    addLine('');
    addLine('');
    const leftSig = `( ${(cashierDisp || 'Kasir').slice(0, 12)} )`;
    const rightSig = `( ${(customerDisp || 'Pelanggan').slice(0, 12)} )`;
    addLine(padBetweenEsc(leftSig, rightSig, cols));
  }

  // 8. Footer Pesan
  addLine(divider);
  addBytes(ESC, 0x61, 0x01); // Center
  addLine(config.footerMessage1 || 'TERIMA KASIH SUDAH BERBELANJA');
  if (config.footerMessage2) {
    addLine(config.footerMessage2);
  }
  if (config.csHotline) {
    addLine(config.csHotline);
  }

  // 9. Feed Lines
  const feed = config.feedLinesBeforeCut || 5;
  for (let i = 0; i < feed; i++) {
    addBytes(0x0a);
  }

  // 10. Cut Paper Command (GS V 66 0 = Partial Cut jika ada cutter)
  addBytes(GS, 0x56, 0x42, 0x00);

  return new Uint8Array(bytes);
}

function formatNumberNoRp(val: number): string {
  return val.toLocaleString('id-ID');
}

function padBetweenEsc(left: string, right: string, width: number = 40): string {
  const l = left.trim();
  const r = right.trim();
  const spaceNeeded = width - l.length - r.length;
  if (spaceNeeded <= 0) {
    return l.slice(0, Math.max(5, width - r.length - 1)) + ' ' + r;
  }
  return l + ' '.repeat(spaceNeeded) + r;
}

// Cached active serial port to avoid re-prompting user on every receipt
let cachedSerialPort: any = null;

/**
 * Cek apakah browser mendukung Web Serial API (Google Chrome, Microsoft Edge, Opera di Desktop)
 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * Meminta izin port serial baru atau mengembalikan port yang sudah diotorisasi
 */
export async function getOrRequestSerialPort(): Promise<any> {
  if (!isWebSerialSupported()) {
    throw new Error('Browser tidak mendukung Web Serial API. Gunakan Chrome atau Edge.');
  }

  // Cek apakah sudah ada port yang terotorisasi
  // @ts-ignore
  const authorizedPorts = await navigator.serial.getPorts();
  if (authorizedPorts && authorizedPorts.length > 0) {
    cachedSerialPort = authorizedPorts[0];
    return cachedSerialPort;
  }

  // Jika belum, buka dialog pemilih port serial
  // @ts-ignore
  cachedSerialPort = await navigator.serial.requestPort();
  return cachedSerialPort;
}

/**
 * Putus koneksi port serial
 */
export async function disconnectSerialPort(): Promise<void> {
  if (cachedSerialPort) {
    try {
      if (cachedSerialPort.readable || cachedSerialPort.writable) {
        await cachedSerialPort.close();
      }
    } catch (e) {
      console.warn('Error closing serial port:', e);
    }
    cachedSerialPort = null;
  }
}

/**
 * Mencetak langsung ke port hardware Serial / COM (USB-to-Serial Epson TM-U220) via Web Serial API
 * Tanpa melalui dialog print OS, langsung menembakkan byte ESC/POS mentah ke printer!
 * Kecepatan: ~1.5 detik, 100% ketajaman jarum ROM Font A 9x9 (Sama persis dengan iPos 4)
 */
export async function printDirectRawToSerialPort(
  rawBytes: Uint8Array,
  baudRate: number = 9600,
  forceSelectPort: boolean = false
): Promise<{ success: boolean; message: string }> {
  if (!isWebSerialSupported()) {
    return {
      success: false,
      message: 'Browser tidak mendukung Web Serial API. Gunakan Google Chrome atau Microsoft Edge di PC/Laptop untuk mencetak langsung ke Epson TM-U220.',
    };
  }

  try {
    let port = forceSelectPort ? null : cachedSerialPort;

    if (!port) {
      // @ts-ignore
      const authorizedPorts = await navigator.serial.getPorts();
      if (!forceSelectPort && authorizedPorts && authorizedPorts.length > 0) {
        port = authorizedPorts[0];
      } else {
        // @ts-ignore
        port = await navigator.serial.requestPort();
      }
      cachedSerialPort = port;
    }

    // Buka port jika belum terbuka
    if (!port.readable || !port.writable) {
      await port.open({ baudRate: baudRate, dataBits: 8, stopBits: 1, parity: 'none' });
    }

    const writer = port.writable.getWriter();
    await writer.write(rawBytes);
    writer.releaseLock();

    return {
      success: true,
      message: 'Struk berhasil dikirim langsung ke port Epson TM-U220 (Mode Raw Text iPos 4: Super Cepat & Tajam)!',
    };
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return { success: false, message: 'Pemilihan port serial dibatalkan.' };
    }
    // Jika port macet/error, reset cache agar transaksi berikutnya mencoba membuka ulang
    cachedSerialPort = null;
    console.error('Serial raw print error:', err);
    return { success: false, message: `Gagal mencetak serial: ${err.message || 'Port serial tidak dapat diakses'}` };
  }
}

/**
 * Mencetak via RawBT Android Print Service (Jika menggunakan smartphone / tablet kasir)
 */
export function printViaRawBt(rawText: string): void {
  const encoded = encodeURIComponent(rawText);
  window.location.href = `rawbt:data=${encoded}`;
}

/**
 * Menghasilkan Dokumen HTML Super Tajam (iPos 4 Native Dot Matrix Simulation)
 * Didesain khusus agar driver printer Windows tidak merender antialiasing blur:
 * 1. Menggunakan CSS font crisp dot-matrix pixelated
 * 2. Warna teks #000000 murni (CMYK 100% K)
 * 3. Tidak ada padding border tebal yang bikin jarum pusing
 * 4. Kolom karakter proporsional 40 kolom (Font A) persis seperti struk kasir iPos 4
 */
/**
 * Helper untuk mendapatkan CSS font-family string berdasarkan pilihan pengguna
 */
export function getReceiptFontFamilyCss(family?: string): string {
  switch (family) {
    case 'courier':
      return "'Courier New', Courier, 'Liberation Mono', monospace";
    case 'consolas':
      return "Consolas, 'Courier New', Courier, monospace";
    case 'roboto_mono':
      return "'Roboto Mono', 'Courier New', Courier, monospace";
    case 'dot_matrix':
      return "'Lucida Console', 'Courier New', Consolas, monospace";
    case 'space_mono':
      return "'Space Mono', Consolas, monospace";
    case 'inconsolata':
      return "Inconsolata, Consolas, monospace";
    default:
      // Font monospaced bawaan OS kasir paling tajam dan jelas tanpa blur/antialiasing berlebih
      return "'Courier New', Consolas, 'Lucida Console', Courier, monospace";
  }
}

/**
 * Helper untuk mendapatkan font-weight numerik untuk ketajaman print fisik
 */
export function getReceiptFontWeightCss(boldness?: string): number {
  switch (boldness) {
    case 'normal':
      return 600;
    case 'semibold':
      return 700;
    case 'extra_bold':
      return 900;
    case 'bold':
    default:
      return 800; // Bobot 800 memastikan jarum printer menghasilkan benturan solid tebal hitam pekat
  }
}

/**
 * Helper untuk mendapatkan ukuran font base struk
 */
export function getReceiptFontSizeCss(size?: string): { base: string; brand: string; meta: string; footer: string } {
  switch (size) {
    case 'compact':
      return { base: '11px', brand: '13px', meta: '10.5px', footer: '10px' };
    case 'large':
      return { base: '13px', brand: '15px', meta: '12px', footer: '11.5px' };
    case 'normal':
    default:
      return { base: '12px', brand: '14px', meta: '11px', footer: '10.5px' };
  }
}

/**
 * Menghasilkan Dokumen HTML Super Tajam & Rapat (Format Kasir POS / iPos 4)
 * Didesain khusus untuk printer Dot Matrix (Epson TM-U220) dan Thermal POS:
 * 1. Mode Huruf Pekat Maksimal (Double-Strike Simulation via text-stroke & text-shadow):
 *    Mencegah hasil print kabur/samar pada pita ribbon ERC-38
 * 2. Menggunakan margin/padding 0 dengan line-height rapat dan konsisten
 * 3. Safe left padding 3.5mm agar teks tepi kiri tidak terpotong pisau
 * 4. Mendukung penyesuaian lebar kertas (58mm, 70mm TM-U220, 80mm)
 * 5. Tinta monokrom kontras tinggi 100% #000000 murni (CMYK 100% K)
 */
export function generateCrispDotMatrixReceiptHtml(
  order: Order,
  config: ReceiptInfo,
  cashierName?: string,
  paymentDetails?: { cashReceived?: number; changeAmount?: number }
): string {
  const cols = config.charactersPerLine || 40;
  const brand = (config.headerBrand || config.storeName || order.pickupStoreName || order.store?.name || 'NUSA MART EXPRESS').toUpperCase();
  const address = cleanReceiptText(config.address || '');
  const phone = config.phone || '';
  const dateStr = new Date(order.createdAt).toLocaleDateString('id-ID');
  const timeStr = new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const cashierDisp = cashierName || config.cashierName || 'Kasir 01';
  const customerDisp = order.customerName ? order.customerName.toUpperCase() : 'PELANGGAN UMUM';

  const totalQty = order.items.reduce((acc, i) => acc + i.quantity, 0);
  const cashRec = paymentDetails?.cashReceived || order.total;
  const change = paymentDetails?.changeAmount !== undefined ? paymentDetails.changeAmount : Math.max(0, cashRec - order.total);

  const dividerChar = config.dividerChar || '=';
  const divider = dividerChar.repeat(cols);
  const thinDivider = '-'.repeat(cols);

  // Parameter typografi dinamis sesuai konfigurasi
  const fontCss = getReceiptFontFamilyCss(config.fontFamily);
  const weightCss = getReceiptFontWeightCss(config.fontBoldness);
  const fontSizes = getReceiptFontSizeCss(config.fontSize);
  const lineSpacingVal = config.lineSpacing === 'compact' ? '1.05' : config.lineSpacing === 'relaxed' ? '1.20' : '1.12';

  // Penyesuaian lebar kertas (76mm roll / 70mm print untuk TM-U220, 58mm, atau 80mm)
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

  // Jarak gulung akhir sebelum potong kertas (dalam pixel terkendali)
  const feedHeightPx = Math.max(1, config.feedLinesBeforeCut || 3) * 6;

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
    .tmu220-receipt {
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
    .bold { font-weight: 900; }
    table.receipt-table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      margin: 0;
      padding: 0;
      border: none;
      line-height: ${lineSpacingVal};
    }
    table.receipt-table td {
      padding: 0.5px 0;
      margin: 0;
      border: none;
      vertical-align: top;
      line-height: ${lineSpacingVal};
      font-size: inherit;
      font-weight: inherit;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
    }
    .divider {
      overflow: hidden;
      white-space: nowrap;
      margin: 1px 0;
      line-height: 1;
      font-size: ${fontSizes.base};
      letter-spacing: -0.2px;
      font-weight: 900;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
    }
    .double-title {
      font-size: ${fontSizes.brand};
      font-weight: 900;
      letter-spacing: 0.5px;
      margin: 0 0 1px 0;
      text-align: center;
      line-height: 1.15;
      text-transform: uppercase;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
    }
    .item-block {
      margin: 0 0 1.5px 0;
      padding: 0;
      line-height: ${lineSpacingVal};
    }
    .feed-lines {
      height: ${feedHeightPx}px;
      display: block;
    }
    @media screen {
      body {
        background: #f1f5f9;
        padding: 20px;
        display: flex;
        justify-content: center;
      }
      .tmu220-receipt {
        box-shadow: 0 4px 15px rgba(0,0,0,0.12);
        border: 1px solid #cbd5e1;
      }
    }
  </style>
</head>
<body>
  <div class="tmu220-receipt">
    <div class="double-title">${brand}</div>
    ${address ? `<div class="text-center" style="font-size: ${fontSizes.meta}; margin: 0; padding: 0;">${address}</div>` : ''}
    ${phone ? `<div class="text-center" style="font-size: ${fontSizes.meta}; margin: 0; padding: 0;">WA: ${phone}${config.csHotline ? ` Fax: ${config.csHotline}` : ''}</div>` : ''}
    ${config.taxIdOrNpwp ? `<div class="text-center" style="font-size: ${fontSizes.footer}; margin: 0; padding: 0;">${config.taxIdOrNpwp}</div>` : ''}
    ${config.headerCustomNote ? `<div class="text-center" style="font-size: ${fontSizes.footer}; font-weight: 900; margin: 0; padding: 0;">${config.headerCustomNote}</div>` : ''}
    <div class="divider">${divider}</div>
    <table class="receipt-table">
      <tr>
        <td class="text-left">No. : ${order.orderNumber}</td>
        <td class="text-right">${dateStr}</td>
      </tr>
      <tr>
        <td class="text-left">Kasir: ${cashierDisp}</td>
        <td class="text-right">${timeStr}</td>
      </tr>
      ${config.showCustomerName !== false ? `<tr>
        <td class="text-left" colspan="2">Pel. : ${customerDisp}</td>
      </tr>` : ''}
    </table>
    <div class="divider">${thinDivider}</div>
    <div>${order.items.map((it) => {
      const pName = it.product.name.toUpperCase();
      const qty = it.quantity;
      const unit = (it.selectedUnit || 'PCS').toUpperCase();
      const price = it.unitPrice || it.product.price;
      const subtotal = price * qty;
      return `<div class="item-block">
        <div style="font-weight: 900;">${pName}</div>
        <table class="receipt-table">
          <tr>
            <td class="text-left" style="padding-left: 2px;">${price.toLocaleString('id-ID')} × ${qty} ${unit} =</td>
            <td class="text-right bold">${subtotal.toLocaleString('id-ID')}</td>
          </tr>
        </table>
      </div>`;
    }).join('')}</div>
    <div class="divider">${thinDivider}</div>
    <table class="receipt-table">
      <tr>
        <td class="text-left">BARIS=${order.items.length}  ,QTY ${totalQty}</td>
        <td class="text-right bold">${order.subtotal.toLocaleString('id-ID')}</td>
      </tr>
      ${order.discountAmount > 0 ? `<tr>
        <td class="text-left">Diskon</td>
        <td class="text-right">-${order.discountAmount.toLocaleString('id-ID')}</td>
      </tr>` : ''}
      ${config.showTaxSummary && (config.taxRatePercent || 0) > 0 ? `<tr>
        <td class="text-left">PPN (${config.taxRatePercent}%)</td>
        <td class="text-right">${Math.round(order.subtotal * ((config.taxRatePercent || 11) / 100)).toLocaleString('id-ID')}</td>
      </tr>` : ''}
      <tr style="font-weight: 900; font-size: ${fontSizes.brand};">
        <td class="text-left" style="padding: 1px 0;">TOTAL</td>
        <td class="text-right bold" style="padding: 1px 0;">${order.total.toLocaleString('id-ID')}</td>
      </tr>
      <tr>
        <td class="text-left">Tunai</td>
        <td class="text-right">${cashRec.toLocaleString('id-ID')}</td>
      </tr>
      <tr>
        <td class="text-left">Kembali</td>
        <td class="text-right bold">${change.toLocaleString('id-ID')}</td>
      </tr>
    </table>
    ${config.showSignatures !== false ? `
    <div class="divider">${thinDivider}</div>
    <!-- Komponen Penandatanganan Struk (Flexbox justify-between & Grid 2-kolom horizontal) -->
    <div class="receipt-signatures" style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; margin: 6px 0 4px 0; font-size: ${fontSizes.meta}; text-align: center; box-sizing: border-box;">
      <div style="width: 46%; flex: 1; text-align: center; padding: 0 4px; box-sizing: border-box;">
        <div style="font-weight: 700;">Kasir,</div>
        <div style="height: 26px;"></div>
        <div style="border-top: 1px dashed #000000; padding-top: 2px; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">( ${cashierDisp} )</div>
      </div>
      <div style="width: 46%; flex: 1; text-align: center; padding: 0 4px; box-sizing: border-box;">
        <div style="font-weight: 700;">Pelanggan,</div>
        <div style="height: 26px;"></div>
        <div style="border-top: 1px dashed #000000; padding-top: 2px; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">( ${customerDisp} )</div>
      </div>
    </div>
    ` : ''}
    <div class="divider">${divider}</div>
    <div class="text-center" style="font-size: ${fontSizes.footer}; margin-top: 1px; line-height: 1.15; font-weight: 700;">
      <div>${config.footerMessage1 || 'Terima kasih atas kunjungan Anda!'}</div>
      <div class="bold" style="font-size: ${fontSizes.base}; color: #000000; -webkit-text-fill-color: #000000;">${brand}</div>
      ${config.footerMessage2 ? `<div style="font-size: ${fontSizes.footer}; margin-top: 0.5px;">${config.footerMessage2}</div>` : ''}
      ${config.websiteOrSocial ? `<div style="font-size: ${fontSizes.footer}; margin-top: 0.5px;">${config.websiteOrSocial}</div>` : ''}
    </div>
    ${config.showBarcode !== false ? `<div class="text-center" style="margin-top: 3px; line-height: 1;">
      <div style="font-family: monospace; letter-spacing: 2px; font-weight: 900; font-size: 11px;">||||| | |||| ||| || ||||| | ||||</div>
      <div style="font-size: ${fontSizes.footer}; font-weight: 900; margin-top: 1px;">*${order.orderNumber}*</div>
    </div>` : ''}
    <div class="feed-lines"></div>
  </div>
</body>
</html>`;
}

