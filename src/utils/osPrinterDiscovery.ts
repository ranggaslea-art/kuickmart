import { DiscoveredOsPrinter, ClientOsEnvironment, OsPrinterInterfaceType } from '../types/osPrinter';

const STORAGE_KEY_SELECTED_PRINTER = 'nusamart_pos_selected_os_printer';
const STORAGE_KEY_CUSTOM_PRINTERS = 'nusamart_pos_custom_printers';

/**
 * Deteksi Lingkungan Sistem Operasi (OS) dan Kemampuan Media yang Mengakses Projek
 */
export function detectClientOsEnvironment(): ClientOsEnvironment {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = typeof navigator !== 'undefined' ? (navigator.platform || '') : '';
  
  // 1. Identifikasi Sistem Operasi
  let osName = 'Sistem Operasi Tidak Diketahui';
  if (/Windows NT 10.0/i.test(ua)) {
    // Windows 10 atau Windows 11
    osName = 'Windows 10 / Windows 11';
  } else if (/Windows NT 6.3/i.test(ua)) {
    osName = 'Windows 8.1';
  } else if (/Windows NT 6.1/i.test(ua)) {
    osName = 'Windows 7 (POSReady / Embedded)';
  } else if (/Windows/i.test(ua)) {
    osName = 'Microsoft Windows';
  } else if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s([0-9\.]+)/i);
    osName = match ? `Android ${match[1]} (Mobile/Tablet POS)` : 'Android POS';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    osName = 'Apple iOS';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    osName = 'macOS';
  } else if (/Linux/i.test(ua)) {
    osName = 'Linux (Ubuntu/Debian POS Terminal)';
  }

  // 2. Identifikasi Peramban (Browser)
  let browserName = 'Web Browser';
  if (/Edg\//i.test(ua)) {
    browserName = 'Microsoft Edge';
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browserName = 'Google Chrome';
  } else if (/Firefox\//i.test(ua)) {
    browserName = 'Mozilla Firefox';
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browserName = 'Apple Safari';
  } else if (/Opera|OPR\//i.test(ua)) {
    browserName = 'Opera';
  }

  // 3. Identifikasi Tipe Media / Perangkat
  let deviceType: ClientOsEnvironment['deviceType'] = 'Desktop PC Kasir';
  const isMobile = /Mobile|Android|iP(hone|od)/i.test(ua);
  const isTablet = /Tablet|iPad/i.test(ua) || (isMobile && screen.width >= 600);
  if (isTablet) {
    deviceType = 'Tablet POS';
  } else if (isMobile) {
    deviceType = 'Smartphone POS';
  } else if (/Laptop/i.test(ua) || (screen.width <= 1440 && screen.height <= 900)) {
    deviceType = 'Laptop';
  }

  // 4. Periksa Dukungan API Akses Hardware Printer
  const isSecureContext = typeof window !== 'undefined' ? window.isSecureContext : false;
  const supportsWebSerial = typeof navigator !== 'undefined' && 'serial' in navigator;
  const supportsWebUsb = typeof navigator !== 'undefined' && 'usb' in navigator;
  const supportsWebBluetooth = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const supportsWindowPrint = typeof window !== 'undefined' && typeof window.print === 'function';
  const userHost = typeof window !== 'undefined' ? window.location.host : 'localhost';

  return {
    osName,
    osPlatform: platform,
    browserName,
    deviceType,
    isSecureContext,
    supportsWebSerial,
    supportsWebUsb,
    supportsWebBluetooth,
    supportsWindowPrint,
    userHost,
    userAgentString: ua,
  };
}

/**
 * Daftar Printer Default Sistem Operasi yang umum tertanam pada sistem kasir / OS retail
 */
export function getDefaultKnownOsPrinters(): DiscoveredOsPrinter[] {
  return [
    {
      id: 'os-spooler-default',
      name: 'Default OS Printer (Spooler Sistem Operasi)',
      interfaceType: 'os_spooler',
      description: 'Mencetak langsung menggunakan Print Spooler bawaan Windows/macOS/Linux yang terpasang di media ini.',
      status: 'ready',
      isDefault: true,
      paperType: '70mm_dotmatrix',
      manufacturer: 'Sistem Operasi Driver',
      details: {
        osDriverName: 'Default System Spooler',
        supportsRawEscPos: true,
      },
    },
    {
      id: 'epson-tmu220-spooler',
      name: 'EPSON TM-U220 Receipt (Driver OS)',
      interfaceType: 'os_spooler',
      description: 'Printer Dot Matrix Kasir 70mm / 76mm roll. Driver resmi EPSON Advanced Printer Driver (APD) terpasang di OS.',
      status: 'ready',
      paperType: '70mm_dotmatrix',
      manufacturer: 'EPSON',
      details: {
        osDriverName: 'EPSON TM-U220 Receipt',
        supportsRawEscPos: true,
      },
    },
    {
      id: 'epson-tmt82-spooler',
      name: 'EPSON TM-T82 / TM-T88 Thermal (Driver OS)',
      interfaceType: 'os_spooler',
      description: 'Printer Kasir Termal 80mm kecepatan tinggi dengan auto-cutter terpasang di OS.',
      status: 'ready',
      paperType: '80mm_thermal',
      manufacturer: 'EPSON',
      details: {
        osDriverName: 'EPSON TM-T82 Receipt',
        supportsRawEscPos: true,
      },
    },
    {
      id: 'generic-text-spooler',
      name: 'Generic / Text Only (Spooler Cetak Teks Murni)',
      interfaceType: 'os_spooler',
      description: 'Driver bawaan Windows "Generic / Text Only" untuk mencetak karakter ASCII tanpa grafis (sangat cepat pada Dot Matrix).',
      status: 'ready',
      paperType: '70mm_dotmatrix',
      manufacturer: 'Microsoft / Generic Driver',
      details: {
        osDriverName: 'Generic / Text Only',
        supportsRawEscPos: true,
      },
    },
    {
      id: 'pdf-virtual-spooler',
      name: 'Microsoft Print to PDF / Save as PDF',
      interfaceType: 'os_spooler',
      description: 'Printer virtual terpasang di sistem operasi untuk menyimpan arsip nota/faktur dalam format digital PDF.',
      status: 'ready',
      paperType: 'a4_continuous',
      manufacturer: 'Microsoft / OS Virtual Printer',
      details: {
        osDriverName: 'Microsoft Print to PDF',
        supportsRawEscPos: false,
      },
    }
  ];
}

/**
 * Mengambil printer yang tersimpan di localStorage
 */
export function getSavedSelectedPrinter(): DiscoveredOsPrinter | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SELECTED_PRINTER);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading saved printer:', e);
  }
  return null;
}

/**
 * Menyimpan printer aktif ke localStorage
 */
export function saveSelectedPrinter(printer: DiscoveredOsPrinter): void {
  try {
    localStorage.setItem(STORAGE_KEY_SELECTED_PRINTER, JSON.stringify(printer));
  } catch (e) {
    console.error('Error saving selected printer:', e);
  }
}

/**
 * Mengambil daftar printer kustom tambahan dari localStorage
 */
export function getCustomPrinters(): DiscoveredOsPrinter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_PRINTERS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

/**
 * Menyimpan printer kustom baru ke localStorage
 */
export function addCustomPrinter(printer: DiscoveredOsPrinter): void {
  try {
    const existing = getCustomPrinters();
    const updated = [printer, ...existing.filter(p => p.id !== printer.id)];
    localStorage.setItem(STORAGE_KEY_CUSTOM_PRINTERS, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving custom printer:', e);
  }
}

/**
 * Menghapus printer kustom dari localStorage
 */
export function removeCustomPrinter(id: string): void {
  try {
    const existing = getCustomPrinters();
    const updated = existing.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY_CUSTOM_PRINTERS, JSON.stringify(updated));
  } catch {}
}

/**
 * Pindai port serial perangkat keras yang terpasang di OS (COM1, COM2, COM3, dsb)
 */
export async function scanSerialPorts(): Promise<DiscoveredOsPrinter[]> {
  const printers: DiscoveredOsPrinter[] = [];
  if (typeof navigator === 'undefined' || !('serial' in navigator)) {
    return printers;
  }

  try {
    // @ts-ignore Web Serial API
    const ports = await navigator.serial.getPorts();
    ports.forEach((port: any, idx: number) => {
      const info = port.getInfo ? port.getInfo() : {};
      const vendorHex = info.usbVendorId ? `0x${info.usbVendorId.toString(16).toUpperCase()}` : '';
      const productHex = info.usbProductId ? `0x${info.usbProductId.toString(16).toUpperCase()}` : '';

      printers.push({
        id: `serial-port-${idx}-${info.usbVendorId || idx}`,
        name: `Serial COM Port ${idx + 1} (${vendorHex || 'Hardware Port'})`,
        interfaceType: 'serial_com',
        description: `Port Serial fisik terdeteksi di OS (Vendor: ${vendorHex || 'Standard'}, Product: ${productHex || 'Unknown'}). Cocok untuk TM-U220 Serial.`,
        status: 'ready',
        port: `COM${idx + 1}`,
        paperType: '70mm_dotmatrix',
        manufacturer: 'Serial/RS-232 Controller',
        details: {
          vendorId: vendorHex,
          productId: productHex,
          baudRate: 9600,
          supportsRawEscPos: true,
        },
      });
    });
  } catch (err) {
    console.warn('Gagal membaca getPorts() Serial:', err);
  }

  return printers;
}

/**
 * Membuka dialog pemilih COM Port Serial di OS (Meminta izin pengguna)
 */
export async function requestOsSerialPort(): Promise<DiscoveredOsPrinter | null> {
  if (typeof navigator === 'undefined' || !('serial' in navigator)) {
    throw new Error('Web Serial API tidak didukung pada peramban ini. Harap gunakan Google Chrome atau Microsoft Edge pada PC Kasir.');
  }

  try {
    // @ts-ignore
    const port = await navigator.serial.requestPort();
    const info = port.getInfo ? port.getInfo() : {};
    const vendorHex = info.usbVendorId ? `0x${info.usbVendorId.toString(16).toUpperCase()}` : '0x04B8';
    const productHex = info.usbProductId ? `0x${info.usbProductId.toString(16).toUpperCase()}` : '';

    const newPrinter: DiscoveredOsPrinter = {
      id: `serial-com-${Date.now()}`,
      name: `Epson TM-U220 / Serial POS (${vendorHex})`,
      interfaceType: 'serial_com',
      description: `Perangkat Serial Hardware terhubung ke OS via Port COM. Baudrate default 9600 bps.`,
      status: 'ready',
      port: 'COM Port (Serial)',
      paperType: '70mm_dotmatrix',
      manufacturer: vendorHex === '0x04B8' ? 'EPSON' : 'POS Hardware Serial',
      details: {
        vendorId: vendorHex,
        productId: productHex,
        baudRate: 9600,
        supportsRawEscPos: true,
      },
    };

    addCustomPrinter(newPrinter);
    return newPrinter;
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      // User cancelled port picker dialog
      return null;
    }
    throw err;
  }
}

/**
 * Membuka dialog pemilih USB Printer di OS (Meminta izin pengguna)
 */
export async function requestOsUsbDevice(): Promise<DiscoveredOsPrinter | null> {
  if (typeof navigator === 'undefined' || !('usb' in navigator)) {
    throw new Error('WebUSB API tidak didukung pada peramban ini. Harap gunakan Google Chrome atau Microsoft Edge.');
  }

  try {
    // Filter untuk vendor Epson, Star, Citizen, Xprinter, atau USB Printer Class (classCode 7)
    // @ts-ignore
    const device = await navigator.usb.requestDevice({
      filters: [
        { classCode: 7 }, // USB Printer Class
        { vendorId: 0x04b8 }, // Epson
        { vendorId: 0x051d }, // Star Micronics
        { vendorId: 0x1d90 }, // Citizen
        { vendorId: 0x0416 }, // Xprinter
        { vendorId: 0x1504 }, // Bixolon
      ]
    });

    const vendorHex = `0x${device.vendorId.toString(16).toUpperCase()}`;
    const productHex = `0x${device.productId.toString(16).toUpperCase()}`;
    const deviceName = device.productName || (device.vendorId === 0x04b8 ? 'EPSON POS Printer' : 'USB Thermal/Dot Matrix Printer');

    const newPrinter: DiscoveredOsPrinter = {
      id: `usb-device-${device.vendorId}-${device.productId}-${Date.now()}`,
      name: deviceName,
      interfaceType: 'usb_direct',
      description: `Printer USB terdeteksi di OS (${device.manufacturerName || 'Vendor'}, Model: ${deviceName}).`,
      status: 'ready',
      port: 'USB001',
      paperType: device.vendorId === 0x04b8 ? '70mm_dotmatrix' : '80mm_thermal',
      manufacturer: device.manufacturerName || (device.vendorId === 0x04b8 ? 'EPSON' : 'USB POS'),
      details: {
        vendorId: vendorHex,
        productId: productHex,
        supportsRawEscPos: true,
      }
    };

    addCustomPrinter(newPrinter);
    return newPrinter;
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return null;
    }
    throw err;
  }
}

/**
 * Membuka dialog pemilih Bluetooth POS Printer di OS
 */
export async function requestOsBluetoothPrinter(): Promise<DiscoveredOsPrinter | null> {
  if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
    throw new Error('Web Bluetooth API tidak didukung pada peramban ini atau perangkat tidak memiliki adapter Bluetooth.');
  }

  try {
    // @ts-ignore
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent Serial
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      ]
    });

    const newPrinter: DiscoveredOsPrinter = {
      id: `bt-${device.id}-${Date.now()}`,
      name: device.name || 'Bluetooth POS Printer',
      interfaceType: 'bluetooth',
      description: `Printer nirkabel Bluetooth terpasang di OS / media.`,
      status: 'ready',
      port: 'Bluetooth RFCOMM',
      paperType: '58mm_thermal',
      manufacturer: 'Wireless POS Bluetooth',
      details: {
        supportsRawEscPos: true,
      }
    };

    addCustomPrinter(newPrinter);
    return newPrinter;
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return null;
    }
    throw err;
  }
}

/**
 * Ping pengecekan Localhost Print Spooler Agent (QZ Tray / ePOS Agent)
 */
export async function checkLocalhostPrintAgent(): Promise<DiscoveredOsPrinter | null> {
  const commonPorts = [8182, 8008, 9100];
  
  for (const port of commonPorts) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      
      const res = await fetch(`http://127.0.0.1:${port}/`, { 
        method: 'GET', 
        mode: 'no-cors', 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);

      return {
        id: `agent-local-${port}`,
        name: `Local OS Print Agent (Port ${port})`,
        interfaceType: 'local_agent',
        description: `Service daemon pencetak lokal terdeteksi aktif pada media ini di port ${port}.`,
        status: 'online',
        port: `127.0.0.1:${port}`,
        paperType: '70mm_dotmatrix',
        manufacturer: 'Local Spooler Daemon',
        details: {
          rawPort: port,
          supportsRawEscPos: true,
        }
      };
    } catch {
      // Not listening on this port, continue
    }
  }

  return null;
}

/**
 * Menghasilkan Dokumen HTML Halaman Test Diagnostic Khusus Printer Sistem Operasi
 * Teroptimasi untuk Dot Matrix Epson TM-U220 (70mm) maupun Thermal POS (80mm/58mm)
 */
export function generatePrinterDiagnosticTestHtml(
  printer: DiscoveredOsPrinter,
  osEnv: ClientOsEnvironment
): string {
  const isDotMatrix = printer.paperType === '70mm_dotmatrix';
  const widthMm = isDotMatrix ? '70mm' : printer.paperType === '58mm_thermal' ? '58mm' : '80mm';
  const pageSize = isDotMatrix ? '76mm auto' : printer.paperType === '58mm_thermal' ? '58mm auto' : '80mm auto';
  const timestamp = new Date().toLocaleString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Test Page - ${printer.name}</title>
  <style>
    @page {
      size: ${pageSize};
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
      width: ${widthMm};
      max-width: ${widthMm};
      background: #ffffff;
      color: #000000;
      font-family: 'Courier New', Courier, 'Lucida Console', monospace;
      font-size: 11px;
      line-height: 1.25;
      font-weight: 600;
    }
    .test-container {
      width: ${widthMm};
      padding: 4mm 2.5mm;
      margin: 0 auto;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: 900; }
    .title {
      font-size: 13.5px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .subtitle {
      font-size: 10px;
      margin-bottom: 4px;
    }
    .divider {
      border-top: 1px dashed #000000;
      margin: 4px 0;
    }
    .divider-double {
      border-top: 2px solid #000000;
      margin: 4px 0;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin: 3px 0;
    }
    .info-table td {
      padding: 1.5px 0;
      vertical-align: top;
    }
    .pin-test-block {
      background: #000000;
      color: #ffffff;
      padding: 2px;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-align: center;
      margin: 4px 0;
      font-size: 10px;
    }
    .font-samples {
      font-size: 10px;
      margin: 3px 0;
      word-break: break-all;
    }
    .box-test {
      border: 1px solid #000000;
      padding: 4px;
      margin: 4px 0;
      text-align: center;
      font-size: 9.5px;
    }
    .feed-space {
      height: 35px;
    }
  </style>
</head>
<body>
  <div class="test-container">
    <div class="text-center title">*** UJI COBA PRINTER OS ***</div>
    <div class="text-center subtitle">DIAGNOSTIK SISTEM KASIR POS</div>
    <div class="divider-double"></div>

    <table class="info-table">
      <tr>
        <td style="width: 32%;">PRINTER:</td>
        <td class="font-bold">${printer.name}</td>
      </tr>
      <tr>
        <td>INTERFACE:</td>
        <td>${printer.interfaceType.toUpperCase()} (${printer.port || 'OS Spooler'})</td>
      </tr>
      <tr>
        <td>PROFIL KERTAS:</td>
        <td>${isDotMatrix ? '70mm Dot Matrix (Roll 76mm)' : printer.paperType}</td>
      </tr>
      <tr>
        <td>STATUS:</td>
        <td class="font-bold">[ SIAP / READY ]</td>
      </tr>
    </table>

    <div class="divider"></div>
    <div class="font-bold text-center" style="font-size: 10px;">INFORMASI MEDIA & SISTEM OPERASI</div>
    <div class="divider"></div>

    <table class="info-table">
      <tr>
        <td style="width: 32%;">OS MEDIA:</td>
        <td class="font-bold">${osEnv.osName}</td>
      </tr>
      <tr>
        <td>TIPE DEVICE:</td>
        <td>${osEnv.deviceType}</td>
      </tr>
      <tr>
        <td>PERAMBAN:</td>
        <td>${osEnv.browserName}</td>
      </tr>
      <tr>
        <td>HOST ASAL:</td>
        <td>${osEnv.userHost}</td>
      </tr>
      <tr>
        <td>WAKTU TES:</td>
        <td>${timestamp}</td>
      </tr>
    </table>

    <div class="divider"></div>
    <div class="font-bold" style="font-size: 10.5px;">UJI ELEMEN HEAD & JARUM DOT MATRIX:</div>
    <div class="pin-test-block">
      ||||||||||||||||||||||||||||||||||||||||
    </div>
    <div class="text-center" style="font-size: 9px;">
      (Pastikan seluruh 9 jarum / dot head tercetak rata tanpa garis putus)
    </div>

    <div class="divider"></div>
    <div class="font-bold" style="font-size: 10px;">UJI FONT ASCII & ALIGNMENT:</div>
    <div class="font-samples">
      ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>
      abcdefghijklmnopqrstuvwxyz<br>
      0123456789 !@#$%^&*()_+-=[]{}|;:,.<>?
    </div>

    <div class="box-test">
      [+] KOTAK KALIBRASI BATAS MARGIN 70MM [+]<br>
      Jika kotak ini terpotong di tepi kiri/kanan,<br>
      sesuaikan margin pada setelan cetak sistem OS.
    </div>

    <div class="divider"></div>
    <div class="text-center font-bold" style="font-size: 10.5px;">
      HASIL TEST: BERHASIL TERKONEKSI!
    </div>
    <div class="text-center" style="font-size: 9.5px; margin-top: 2px;">
      Printer ini siap digunakan untuk cetak struk kasir & faktur penjualan.
    </div>
    <div class="divider-double"></div>

    <div class="text-center" style="font-size: 9px;">
      --- GULUNG KERTAS UNTUK SOBEK ---
    </div>

    <!-- Feed lines to reach tear-off bar -->
    <div class="feed-space"></div>
  </div>
</body>
</html>`;
}

/**
 * Mencetak Halaman Test Diagnostik melalui Iframe / Dialog Print OS
 */
export function executeTestPrint(
  printer: DiscoveredOsPrinter,
  osEnv: ClientOsEnvironment
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const htmlContent = generatePrinterDiagnosticTestHtml(printer, osEnv);
      
      let iframe = document.getElementById('pos-printer-test-iframe') as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'pos-printer-test-iframe';
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
        const printWin = window.open('', '_blank', 'width=350,height=600');
        if (printWin) {
          printWin.document.write(htmlContent);
          printWin.document.close();
          printWin.focus();
          setTimeout(() => {
            printWin.print();
            printWin.close();
            resolve(true);
          }, 400);
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
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
          resolve(true);
        } catch (e) {
          console.error('Gagal mencetak iframe test:', e);
          resolve(false);
        }
      }, 350);
    } catch (err) {
      console.error('Error executeTestPrint:', err);
      resolve(false);
    }
  });
}
