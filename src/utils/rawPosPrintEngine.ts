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

  addLine(padBetweenEsc(`No. : ${order.orderNumber}`, dateStr, cols));
  addLine(padBetweenEsc(`Kasir: ${cashierDisp}`, timeStr, cols));

  if (config.showCustomerName !== false) {
    const cust = order.customerName ? order.customerName.toUpperCase() : 'UMUM';
    addLine(padBetweenEsc(`Pel. : ${cust}`, '', cols));
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
  const cashierDisp = cashierName || config.cashierName || '01';
  const customerDisp = order.customerName ? order.customerName.toUpperCase() : 'UMUM';

  const totalQty = order.items.reduce((acc, i) => acc + i.quantity, 0);
  const cashRec = paymentDetails?.cashReceived || order.total;
  const change = paymentDetails?.changeAmount !== undefined ? paymentDetails.changeAmount : Math.max(0, cashRec - order.total);

  const divider = (config.dividerChar || '=').repeat(cols);
  const thinDivider = '-'.repeat(cols);

  // Mode font
  const fontFamilyChoice = config.fontFamily || 'courier';
  let fontStack = "'Courier New', Courier, 'Lucida Console', monospace";
  if (fontFamilyChoice === 'dot_matrix') {
    fontStack = "'Lucida Console', 'Courier New', monospace";
  } else if (fontFamilyChoice === 'consolas') {
    fontStack = "Consolas, 'Courier New', monospace";
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Struk iPos TM-U220 - ${order.orderNumber}</title>
  <style>
    @page {
      size: 76mm auto;
      margin: 0mm;
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
      /* Font mono presisi tinggi */
      font-family: ${fontStack};
      font-size: 11px;
      line-height: 1.2;
      font-weight: 700;
      /* Anti-blur untuk driver dot-matrix */
      text-rendering: geometricPrecision;
      -webkit-font-smoothing: none;
      -moz-osx-font-smoothing: unset;
    }
    .tmu220-receipt {
      width: 70mm;
      padding: 2mm 1.5mm;
      margin: 0 auto;
      background: #ffffff;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .bold { font-weight: 900; }
    .divider {
      overflow: hidden;
      white-space: nowrap;
      margin: 2px 0;
      letter-spacing: -0.5px;
    }
    .double-title {
      font-size: 13.5px;
      font-weight: 900;
      letter-spacing: 1px;
      margin-bottom: 2px;
      text-align: center;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      width: 100%;
    }
    .feed-lines {
      height: ${Math.max(2, config.feedLinesBeforeCut || 5) * 14}px;
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
    <!-- Header iPos 4 Style -->
    <div class="double-title">${brand}</div>
    ${address ? `<div class="text-center" style="font-size: 10px;">${address}</div>` : ''}
    ${phone ? `<div class="text-center" style="font-size: 10px;">WA : ${phone} ${config.csHotline ? `Fax: ${config.csHotline}` : ''}</div>` : ''}
    ${config.headerCustomNote ? `<div class="text-center" style="font-size: 9.5px;">${config.headerCustomNote}</div>` : ''}

    <div class="divider">${divider}</div>

    <!-- Meta Info -->
    <div class="flex-row">
      <span>No. : ${order.orderNumber}</span>
      <span>${dateStr}</span>
    </div>
    <div class="flex-row">
      <span>Kasir: ${cashierDisp}</span>
      <span>${timeStr}</span>
    </div>
    <div class="flex-row">
      <span>Pel. : ${customerDisp}</span>
      <span></span>
    </div>

    <div class="divider">${thinDivider}</div>

    <!-- Items List (Format iPos 4) -->
    <div>
      ${order.items.map((it) => {
        const pName = it.product.name.toUpperCase();
        const qty = it.quantity;
        const unit = (it.selectedUnit || 'PCS').toUpperCase();
        const price = it.unitPrice || it.product.price;
        const subtotal = price * qty;

        return `
        <div style="margin-bottom: 2px;">
          <div>${pName}</div>
          <div class="flex-row" style="padding-left: 2px;">
            <span>${price.toLocaleString('id-ID')} × ${qty} ${unit} =</span>
            <span class="bold">${subtotal.toLocaleString('id-ID')}</span>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="divider">${thinDivider}</div>

    <!-- Summary Total -->
    <div class="flex-row">
      <span>BARIS=${order.items.length}  ,QTY ${totalQty}</span>
      <span class="bold">${order.subtotal.toLocaleString('id-ID')}</span>
    </div>
    ${order.discountAmount > 0 ? `
    <div class="flex-row">
      <span>Diskon</span>
      <span>-${order.discountAmount.toLocaleString('id-ID')}</span>
    </div>` : ''}

    <div class="flex-row bold" style="font-size: 12.5px; margin: 2px 0;">
      <span>TOTAL</span>
      <span>${order.total.toLocaleString('id-ID')}</span>
    </div>

    <div class="flex-row">
      <span>Tunai</span>
      <span>${cashRec.toLocaleString('id-ID')}</span>
    </div>
    <div class="flex-row">
      <span>Kembali</span>
      <span>${change.toLocaleString('id-ID')}</span>
    </div>

    <div class="divider">${divider}</div>

    <!-- Footer -->
    <div class="text-center" style="font-size: 10px; margin-top: 2px;">
      <div>${config.footerMessage1 || 'TERIMA KASIH SUDAH BERBELANJA DI'}</div>
      <div class="bold">${brand}.</div>
      ${config.footerMessage2 ? `<div style="font-size: 9px; margin-top: 1px;">${config.footerMessage2}</div>` : ''}
    </div>

    <!-- Feed lines to reach tear-off knife -->
    <div class="feed-lines"></div>
  </div>
</body>
</html>`;
}
