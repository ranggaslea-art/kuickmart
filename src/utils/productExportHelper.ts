import { Product, Category } from '../types';
import { EXCEL_IMPORT_COLUMNS } from './excelImportParser';

export type CsvDelimiter = ';' | ',';

export interface ProductExportOptions {
  delimiter?: CsvDelimiter;
  includeCalculations?: boolean; // HPP, Margin, Nilai Aset Stok
  includeUnitConversions?: boolean; // Info multi-satuan / kemasan
  includeImages?: boolean; // URL Gambar
  storeName?: string;
}

export interface InventoryValuationSummary {
  totalItems: number;
  totalPhysicalStock: number;
  totalAssetHppValue: number;
  totalRetailSalesValue: number;
  totalPotentialProfit: number;
  averageMarginPercent: number;
}

/**
 * Menghitung ringkasan valuasi inventori & stok
 */
export function calculateInventoryValuation(products: Product[]): InventoryValuationSummary {
  const safeList = Array.isArray(products) ? products.filter(Boolean) : [];
  let totalPhysicalStock = 0;
  let totalAssetHppValue = 0;
  let totalRetailSalesValue = 0;

  safeList.forEach((p) => {
    const stock = typeof p.stock === 'number' && !isNaN(p.stock) ? p.stock : 0;
    const price = typeof p.price === 'number' && !isNaN(p.price) ? p.price : 0;
    const hpp = typeof p.costPrice === 'number' && !isNaN(p.costPrice) ? p.costPrice : Math.round(price * 0.8);

    totalPhysicalStock += stock;
    totalAssetHppValue += hpp * stock;
    totalRetailSalesValue += price * stock;
  });

  const totalPotentialProfit = totalRetailSalesValue - totalAssetHppValue;
  const averageMarginPercent = totalRetailSalesValue > 0
    ? Math.round((totalPotentialProfit / totalRetailSalesValue) * 100)
    : 0;

  return {
    totalItems: safeList.length,
    totalPhysicalStock,
    totalAssetHppValue,
    totalRetailSalesValue,
    totalPotentialProfit,
    averageMarginPercent,
  };
}

/**
 * Escape string untuk CSV standard RFC 4180
 */
function escapeCsvValue(val: any, delimiter: string = ';'): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // Jika mengandung delimiter, petik dua, atau newline, bungkus dengan tanda petik ganda
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Menghasilkan data CSV produk dengan UTF-8 BOM untuk kompatibilitas penuh Microsoft Excel
 */
export function generateProductCsv(
  products: Product[],
  categories: Category[] = [],
  options: ProductExportOptions = {}
): string {
  const delimiter = options.delimiter || ';';
  const safeProducts = Array.isArray(products) ? products.filter(Boolean) : [];

  // Peta kategori untuk pencarian cepat nama yang ramah pengguna
  const catMap = new Map<string, string>();
  categories.forEach((c) => {
    if (c) {
      if (c.slug) catMap.set(c.slug, c.name);
      if (c.id) catMap.set(c.id, c.name);
    }
  });

  const headers = [
    'No',
    'Barcode / SKU',
    'Nama Produk',
    'Kategori',
    'Kategori Slug',
    'Merk / Brand',
    'Satuan Dasar',
    'Harga Pokok (HPP)',
    'Harga Jual',
    'Margin (Rp)',
    'Margin (%)',
    'Harga Normal / Coret',
    'Stok Gudang',
    'Total Nilai Aset HPP',
    'Total Nilai Penjualan',
    'Jumlah Terjual',
    'Rating',
    'Multi Satuan (Kemasan)',
    'Deskripsi Produk',
    'URL Foto Produk',
  ];

  const rows: string[][] = [headers];

  safeProducts.forEach((p, idx) => {
    const rawHpp = typeof p.costPrice === 'number' && !isNaN(p.costPrice) ? p.costPrice : Math.round((p.price || 0) * 0.8);
    const price = typeof p.price === 'number' && !isNaN(p.price) ? p.price : 0;
    const stock = typeof p.stock === 'number' && !isNaN(p.stock) ? p.stock : 0;
    const marginRp = price - rawHpp;
    const marginPct = price > 0 ? Math.round((marginRp / price) * 100) : 0;
    const totalAssetHpp = rawHpp * stock;
    const totalSales = price * stock;

    const catSlug = p.category || '';
    const catName = catMap.get(catSlug) || catMap.get(catSlug.replace('cat_', '')) || catSlug || 'Umum';

    // Format konversi multi-satuan jika ada
    let multiSatuanText = '';
    if (p.unitConversions && Array.isArray(p.unitConversions) && p.unitConversions.length > 0) {
      multiSatuanText = p.unitConversions
        .map((c) => {
          const cPrice = c.price ? ` @Rp ${c.price.toLocaleString('id-ID')}` : '';
          return `${c.unitName} (x${c.totalMultiplier} ${p.unit}${cPrice})`;
        })
        .join(' | ');
    }

    rows.push([
      String(idx + 1),
      p.barcode ? `'${p.barcode}` : '', // Tambahkan kutip depan agar Excel tidak mengubah barcode jadi scientific notation
      p.name || '',
      catName,
      catSlug,
      p.brand || '',
      p.unit || 'Pcs',
      String(rawHpp),
      String(price),
      String(marginRp),
      `${marginPct}%`,
      String(p.originalPrice || price),
      String(stock),
      String(totalAssetHpp),
      String(totalSales),
      String(p.soldCount || 0),
      String(p.rating || 5.0),
      multiSatuanText,
      (p.description || '').replace(/\r?\n/g, ' '),
      p.image || '',
    ]);
  });

  // Tambahkan baris total di bagian paling bawah
  const summary = calculateInventoryValuation(safeProducts);
  rows.push([
    '',
    'TOTAL KESELURUHAN',
    `${summary.totalItems} Jenis Produk`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    `${summary.averageMarginPercent}%`,
    '',
    String(summary.totalPhysicalStock),
    String(summary.totalAssetHppValue),
    String(summary.totalRetailSalesValue),
    '',
    '',
    '',
    '',
    '',
  ]);

  const csvString = rows
    .map((r) => r.map((c) => escapeCsvValue(c, delimiter)).join(delimiter))
    .join('\r\n');

  // Prepend UTF-8 Byte Order Mark (BOM) agar Excel Windows langsung membaca UTF-8 tanpa teks berantakan
  return '\uFEFF' + csvString;
}

/**
 * Menghasilkan dokumen Spreadsheet HTML (.xls) yang langsung dapat dibuka rapi di Microsoft Excel
 * Dilengkapi styling warna kolom, border, format angka, dan baris total valuasi
 */
export function generateProductExcelHtml(
  products: Product[],
  categories: Category[] = [],
  options: ProductExportOptions = {}
): string {
  const safeProducts = Array.isArray(products) ? products.filter(Boolean) : [];
  const storeTitle = options.storeName || 'Toko Retail & Grosir';
  const exportDate = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const exportTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const catMap = new Map<string, string>();
  categories.forEach((c) => {
    if (c) {
      if (c.slug) catMap.set(c.slug, c.name);
      if (c.id) catMap.set(c.id, c.name);
    }
  });

  const summary = calculateInventoryValuation(safeProducts);

  let rowsHtml = '';
  safeProducts.forEach((p, idx) => {
    const rawHpp = typeof p.costPrice === 'number' && !isNaN(p.costPrice) ? p.costPrice : Math.round((p.price || 0) * 0.8);
    const price = typeof p.price === 'number' && !isNaN(p.price) ? p.price : 0;
    const stock = typeof p.stock === 'number' && !isNaN(p.stock) ? p.stock : 0;
    const marginRp = price - rawHpp;
    const marginPct = price > 0 ? Math.round((marginRp / price) * 100) : 0;
    const totalAssetHpp = rawHpp * stock;
    const totalSales = price * stock;

    const catSlug = p.category || '';
    const catName = catMap.get(catSlug) || catMap.get(catSlug.replace('cat_', '')) || catSlug || 'Umum';

    let multiSatuanText = '-';
    if (p.unitConversions && Array.isArray(p.unitConversions) && p.unitConversions.length > 0) {
      multiSatuanText = p.unitConversions
        .map((c) => {
          const cPrice = c.price ? ` @Rp ${c.price.toLocaleString('id-ID')}` : '';
          return `${c.unitName} (x${c.totalMultiplier} ${p.unit}${cPrice})`;
        })
        .join('; ');
    }

    const rowBg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';

    rowsHtml += `
      <tr style="background-color: ${rowBg};">
        <td style="text-align: center; border: 1px solid #e5e7eb; padding: 6px;">${idx + 1}</td>
        <td style="border: 1px solid #e5e7eb; padding: 6px; font-family: monospace; mso-number-format:'\\@';">${p.barcode || '-'}</td>
        <td style="border: 1px solid #e5e7eb; padding: 6px; font-weight: bold;">${p.name || ''}</td>
        <td style="border: 1px solid #e5e7eb; padding: 6px;">${catName}</td>
        <td style="border: 1px solid #e5e7eb; padding: 6px;">${p.brand || '-'}</td>
        <td style="text-align: center; border: 1px solid #e5e7eb; padding: 6px;">${p.unit || 'Pcs'}</td>
        <td style="text-align: right; border: 1px solid #e5e7eb; padding: 6px; mso-number-format:'#,##0';">${rawHpp}</td>
        <td style="text-align: right; border: 1px solid #e5e7eb; padding: 6px; font-weight: bold; mso-number-format:'#,##0';">${price}</td>
        <td style="text-align: right; border: 1px solid #e5e7eb; padding: 6px; color: ${marginRp >= 0 ? '#047857' : '#b91c1c'}; mso-number-format:'#,##0';">${marginRp}</td>
        <td style="text-align: center; border: 1px solid #e5e7eb; padding: 6px; color: #047857; font-weight: bold;">${marginPct}%</td>
        <td style="text-align: center; border: 1px solid #e5e7eb; padding: 6px; font-weight: bold; color: ${stock > 5 ? '#111827' : '#dc2626'}; mso-number-format:'#,##0';">${stock}</td>
        <td style="text-align: right; border: 1px solid #e5e7eb; padding: 6px; mso-number-format:'#,##0';">${totalAssetHpp}</td>
        <td style="text-align: right; border: 1px solid #e5e7eb; padding: 6px; font-weight: bold; mso-number-format:'#,##0';">${totalSales}</td>
        <td style="text-align: center; border: 1px solid #e5e7eb; padding: 6px; mso-number-format:'#,##0';">${p.soldCount || 0}</td>
        <td style="border: 1px solid #e5e7eb; padding: 6px; font-size: 11px;">${multiSatuanText}</td>
      </tr>
    `;
  });

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Katalog Produk & Stok</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1f2937; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #047857; color: #ffffff; font-weight: bold; text-align: left; padding: 8px 6px; border: 1px solid #065f46; font-size: 11pt; }
        .meta-box { margin-bottom: 16px; }
        .summary-card { background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 8px 12px; margin-bottom: 12px; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="meta-box">
        <h2 style="margin: 0; color: #065f46; font-size: 16pt;">LAPORAN KATALOG PRODUK & INVENTORI GUDANG</h2>
        <div style="font-size: 11pt; color: #374151; margin-top: 4px;"><strong>${storeTitle}</strong></div>
        <div style="font-size: 9pt; color: #6b7280; margin-top: 2px;">Tanggal Ekspor: ${exportDate}, Jam ${exportTime} • Total: ${safeProducts.length} Produk Terdaftar</div>
      </div>

      <table style="margin-bottom: 15px; width: auto;">
        <tr>
          <td style="padding: 6px 12px; background-color: #f3f4f6; border: 1px solid #d1d5db; font-weight: bold;">Total Fisik Stok:</td>
          <td style="padding: 6px 12px; background-color: #ffffff; border: 1px solid #d1d5db; font-weight: bold; mso-number-format:'#,##0';">${summary.totalPhysicalStock} Unit</td>
          <td style="width: 20px;"></td>
          <td style="padding: 6px 12px; background-color: #f3f4f6; border: 1px solid #d1d5db; font-weight: bold;">Valuasi Aset (HPP):</td>
          <td style="padding: 6px 12px; background-color: #ffffff; border: 1px solid #d1d5db; font-weight: bold; color: #047857; mso-number-format:'#,##0';">Rp ${summary.totalAssetHppValue.toLocaleString('id-ID')}</td>
          <td style="width: 20px;"></td>
          <td style="padding: 6px 12px; background-color: #f3f4f6; border: 1px solid #d1d5db; font-weight: bold;">Potensi Penjualan:</td>
          <td style="padding: 6px 12px; background-color: #ffffff; border: 1px solid #d1d5db; font-weight: bold; color: #1d4ed8; mso-number-format:'#,##0';">Rp ${summary.totalRetailSalesValue.toLocaleString('id-ID')}</td>
        </tr>
      </table>

      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">No</th>
            <th style="width: 130px;">Barcode / SKU</th>
            <th style="width: 250px;">Nama Produk</th>
            <th style="width: 140px;">Kategori</th>
            <th style="width: 130px;">Merk</th>
            <th style="width: 70px; text-align: center;">Satuan</th>
            <th style="width: 110px; text-align: right;">HPP Modal (Rp)</th>
            <th style="width: 110px; text-align: right;">Harga Jual (Rp)</th>
            <th style="width: 100px; text-align: right;">Margin (Rp)</th>
            <th style="width: 70px; text-align: center;">Margin %</th>
            <th style="width: 80px; text-align: center;">Stok</th>
            <th style="width: 130px; text-align: right;">Total Nilai Aset HPP</th>
            <th style="width: 130px; text-align: right;">Potensi Omzet Jual</th>
            <th style="width: 70px; text-align: center;">Terjual</th>
            <th style="width: 220px;">Multi-Satuan Kemasan</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="background-color: #d1fae5; font-weight: bold; border-top: 2px solid #059669;">
            <td colspan="10" style="padding: 8px; text-align: right; border: 1px solid #a7f3d0;">TOTAL KESELURUHAN:</td>
            <td style="padding: 8px; text-align: center; border: 1px solid #a7f3d0; font-size: 11pt; mso-number-format:'#,##0';">${summary.totalPhysicalStock}</td>
            <td style="padding: 8px; text-align: right; border: 1px solid #a7f3d0; font-size: 11pt; mso-number-format:'#,##0';">${summary.totalAssetHppValue}</td>
            <td style="padding: 8px; text-align: right; border: 1px solid #a7f3d0; font-size: 11pt; mso-number-format:'#,##0';">${summary.totalRetailSalesValue}</td>
            <td colspan="2" style="border: 1px solid #a7f3d0;"></td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `.trim();
}

/**
 * Menghasilkan format teks pipe `Nama | Harga | Stok | Kategori | Brand`
 * yang kompatibel 100% dengan modul "Import Cepat Excel"
 */
export function generateBulkImportTextFormat(products: Product[]): string {
  const safeProducts = Array.isArray(products) ? products.filter(Boolean) : [];
  return safeProducts
    .map((p) => {
      const name = (p.name || '').trim();
      const price = typeof p.price === 'number' && !isNaN(p.price) ? p.price : 0;
      const stock = typeof p.stock === 'number' && !isNaN(p.stock) ? p.stock : 0;
      const category = (p.category || 'sembako').trim();
      const brand = (p.brand || 'Umum').trim();
      return `${name} | ${price} | ${stock} | ${category} | ${brand}`;
    })
    .join('\n');
}

/**
 * Helper untuk memicu unduhan file di browser
 */
export function downloadTextFile(content: string, fileName: string, mimeType: string = 'text/csv;charset=utf-8;'): void {
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
 * Ekspor produk ke format resmi Excel (.xls) dengan 49 kolom iPos / ritel standar
 * Menggunakan format XML Spreadsheet 2003 standar resmi Microsoft yang dapat dibuka
 * langsung oleh Microsoft Excel, LibreOffice, WPS Office, dan Google Sheets secara native tanpa dependensi eksternal.
 */
export function generateProductOfficial49ColumnExcel(
  products: Product[],
  categories: Category[] = []
): Blob {
  // Jika window.XLSX tersedia secara runtime (misal dari CDN), gunakan binary xlsx
  if (typeof window !== 'undefined' && (window as any).XLSX) {
    try {
      const XLSX = (window as any).XLSX;
      const catMap = new Map<string, string>();
      categories.forEach((c) => {
        if (c) {
          if (c.slug) catMap.set(c.slug, c.name);
          if (c.id) catMap.set(c.id, c.name);
        }
      });

      const rows = products.map((p) => {
        const catName = catMap.get(p.category) || p.category;
        const u1 = p.unit || 'Pcs';
        const conv2 = p.unitConversions?.[0];
        const conv3 = p.unitConversions?.[1];
        const conv4 = p.unitConversions?.[2];
        const hpp = typeof p.costPrice === 'number' ? p.costPrice : Math.round(p.price * 0.8);

        return {
          KODEITEM: p.itemCode || p.barcode || p.id,
          NAMAITEM: p.name || '',
          JENIS: catName || 'Sembako',
          MEREK: p.brand || 'Umum',
          SATUAN1: u1,
          SATUAN2: conv2?.unitName || '',
          SATUAN3: conv3?.unitName || '',
          SATUAN4: conv4?.unitName || '',
          BARCODESATUAN1: p.barcode || '',
          BARCODESATUAN2: conv2?.barcode || '',
          BARCODESATUAN3: conv3?.barcode || '',
          BARCODESATUAN4: conv4?.barcode || '',
          KONVERSI1: 1,
          KONVERSI2: conv2?.totalMultiplier || '',
          KONVERSI3: conv3?.totalMultiplier || '',
          KONVERSI4: conv4?.totalMultiplier || '',
          HARGAPOKOK1: hpp,
          HARGAPOKOK2: conv2 ? Math.round(hpp * (Number(conv2.totalMultiplier) || 1)) : '',
          HARGAPOKOK3: conv3 ? Math.round(hpp * (Number(conv3.totalMultiplier) || 1)) : '',
          HARGAPOKOK4: conv4 ? Math.round(hpp * (Number(conv4.totalMultiplier) || 1)) : '',
          HARGAJUAL1: p.price || 0,
          HARGAJUAL2: conv2?.price || '',
          HARGAJUAL3: conv3?.price || '',
          HARGAJUAL4: conv4?.price || '',
          POIN1: p.point || 0,
          POIN2: '',
          POIN3: '',
          POIN4: '',
          KOMISISALES1: p.commission || 0,
          KOMISISALES2: '',
          KOMISISALES3: '',
          KOMISISALES4: '',
          STOKAWAL: p.stock || 0,
          STOKMINIMAL: p.minStock || 5,
          TIPEITEM: p.itemType || 'Barang',
          MENGGUNAKANSERIAL: p.useSerial ? 'Y' : 'N',
          RAK: p.shelf || '',
          KODEGUDANG: p.warehouseCode || 'GUD-PUSAT',
          KODESUPPLIER: p.supplierCode || '',
          KONSINYASI: p.isConsignment ? 'Y' : 'N',
          KETERANGAN: (p.description || '').replace(/\r?\n/g, ' '),
          SKU1: p.sku1 || '',
          SKU2: p.sku2 || '',
          SKU3: p.sku3 || '',
          SKU4: p.sku4 || '',
          JENISPAJAK: p.taxType || 'NON-PAJAK',
          SISTEMPAJAK: p.taxSystem || 'INCLUDE',
          KODEREFERENSI: p.referenceCode || '',
          OPSIBRGJASA: 'Barang',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...EXCEL_IMPORT_COLUMNS] });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'MasterItem');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      return new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    } catch {
      // Fallback ke XML Spreadsheet 2003 di bawah
    }
  }

  // Format Standar Microsoft XML Spreadsheet 2003 (Murni zero-dependency, 100% kompatibel Excel)
  const catMap = new Map<string, string>();
  categories.forEach((c) => {
    if (c) {
      if (c.slug) catMap.set(c.slug, c.name);
      if (c.id) catMap.set(c.id, c.name);
    }
  });

  const escapeXml = (str: any) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const headerCells = EXCEL_IMPORT_COLUMNS.map(
    (col) => `<Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(col)}</Data></Cell>`
  ).join('');

  const dataRowsXml = products.map((p) => {
    const catName = catMap.get(p.category) || p.category;
    const u1 = p.unit || 'Pcs';
    const conv2 = p.unitConversions?.[0];
    const conv3 = p.unitConversions?.[1];
    const conv4 = p.unitConversions?.[2];
    const hpp = typeof p.costPrice === 'number' ? p.costPrice : Math.round(p.price * 0.8);

    const values = [
      p.itemCode || p.barcode || p.id,
      p.name || '',
      catName || 'Sembako',
      p.brand || 'Umum',
      u1,
      conv2?.unitName || '',
      conv3?.unitName || '',
      conv4?.unitName || '',
      p.barcode || '',
      conv2?.barcode || '',
      conv3?.barcode || '',
      conv4?.barcode || '',
      '1',
      conv2?.totalMultiplier || '',
      conv3?.totalMultiplier || '',
      conv4?.totalMultiplier || '',
      hpp,
      conv2 ? Math.round(hpp * (Number(conv2.totalMultiplier) || 1)) : '',
      conv3 ? Math.round(hpp * (Number(conv3.totalMultiplier) || 1)) : '',
      conv4 ? Math.round(hpp * (Number(conv4.totalMultiplier) || 1)) : '',
      p.price || 0,
      conv2?.price || '',
      conv3?.price || '',
      conv4?.price || '',
      p.point || '',
      '',
      '',
      '',
      p.commission || '',
      '',
      '',
      '',
      p.stock || 0,
      p.minStock || 5,
      p.itemType || 'Barang',
      p.useSerial ? 'Y' : 'N',
      p.shelf || '',
      p.warehouseCode || 'GUD-PUSAT',
      p.supplierCode || '',
      p.isConsignment ? 'Y' : 'N',
      (p.description || '').replace(/\r?\n/g, ' '),
      p.sku1 || '',
      p.sku2 || '',
      p.sku3 || '',
      p.sku4 || '',
      p.taxType || 'NON-PAJAK',
      p.taxSystem || 'INCLUDE',
      p.referenceCode || '',
      'Barang',
    ];

    const cellsXml = values.map((val) => {
      const isNum = typeof val === 'number' && !isNaN(val);
      const type = isNum ? 'Number' : 'String';
      const styleId = isNum ? 'NumberStyle' : 'TextStyle';
      return `<Cell ss:StyleID="${styleId}"><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>`;
    }).join('');

    return `<Row>${cellsXml}</Row>`;
  }).join('\n');

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#047857"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#047857"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#047857"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#047857"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#059669" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="TextStyle">
   <NumberFormat ss:Format="@"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <Style ss:ID="NumberStyle">
   <NumberFormat ss:Format="#,##0"/>
   <Alignment ss:Horizontal="Right"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="MasterItem">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="110"/>
   <Column ss:Width="230"/>
   <Column ss:Width="120"/>
   <Column ss:Width="110"/>
   <Column ss:Width="70"/>
   <Column ss:Width="70"/>
   <Column ss:Width="70"/>
   <Column ss:Width="70"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="70"/>
   <Column ss:Width="70"/>
   <Column ss:Width="70"/>
   <Column ss:Width="70"/>
   <Column ss:Width="95"/>
   <Column ss:Width="95"/>
   <Column ss:Width="95"/>
   <Column ss:Width="95"/>
   <Column ss:Width="95"/>
   <Column ss:Width="95"/>
   <Column ss:Width="95"/>
   <Column ss:Width="95"/>
   <Row ss:Height="24">
    ${headerCells}
   </Row>
   ${dataRowsXml}
  </Table>
 </Worksheet>
</Workbook>`;

  return new Blob([xmlContent], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
}

/**
 * Ekspor produk ke CSV dengan 49 kolom resmi
 */
export function generateProductOfficial49ColumnCsv(
  products: Product[],
  categories: Category[] = [],
  delimiter: ';' | ',' = ';'
): string {
  const catMap = new Map<string, string>();
  categories.forEach((c) => {
    if (c) {
      if (c.slug) catMap.set(c.slug, c.name);
      if (c.id) catMap.set(c.id, c.name);
    }
  });

  const headers = [...EXCEL_IMPORT_COLUMNS];
  const rows: string[] = [headers.join(delimiter)];

  products.forEach((p) => {
    const catName = catMap.get(p.category) || p.category;
    const u1 = p.unit || 'Pcs';
    const conv2 = p.unitConversions?.[0];
    const conv3 = p.unitConversions?.[1];
    const conv4 = p.unitConversions?.[2];
    const hpp = typeof p.costPrice === 'number' ? p.costPrice : Math.round(p.price * 0.8);

    const values = [
      p.itemCode || p.barcode || p.id,
      p.name || '',
      catName || 'Sembako',
      p.brand || 'Umum',
      u1,
      conv2?.unitName || '',
      conv3?.unitName || '',
      conv4?.unitName || '',
      p.barcode ? `'${p.barcode}` : '',
      conv2?.barcode ? `'${conv2.barcode}` : '',
      conv3?.barcode ? `'${conv3.barcode}` : '',
      conv4?.barcode ? `'${conv4.barcode}` : '',
      '1',
      conv2?.totalMultiplier ? String(conv2.totalMultiplier) : '',
      conv3?.totalMultiplier ? String(conv3.totalMultiplier) : '',
      conv4?.totalMultiplier ? String(conv4.totalMultiplier) : '',
      String(hpp),
      conv2 ? String(Math.round(hpp * (Number(conv2.totalMultiplier) || 1))) : '',
      conv3 ? String(Math.round(hpp * (Number(conv3.totalMultiplier) || 1))) : '',
      conv4 ? String(Math.round(hpp * (Number(conv4.totalMultiplier) || 1))) : '',
      String(p.price || 0),
      conv2?.price ? String(conv2.price) : '',
      conv3?.price ? String(conv3.price) : '',
      conv4?.price ? String(conv4.price) : '',
      String(p.point || 0),
      '',
      '',
      '',
      String(p.commission || 0),
      '',
      '',
      '',
      String(p.stock || 0),
      String(p.minStock || 5),
      p.itemType || 'Barang',
      p.useSerial ? 'Y' : 'N',
      p.shelf || '',
      p.warehouseCode || 'GUD-PUSAT',
      p.supplierCode || '',
      p.isConsignment ? 'Y' : 'N',
      (p.description || '').replace(/\r?\n/g, ' '),
      p.sku1 || '',
      p.sku2 || '',
      p.sku3 || '',
      p.sku4 || '',
      p.taxType || 'NON-PAJAK',
      p.taxSystem || 'INCLUDE',
      p.referenceCode || '',
      'Barang',
    ];

    const escaped = values.map((v) => escapeCsvValue(v, delimiter));
    rows.push(escaped.join(delimiter));
  });

  return '\uFEFF' + rows.join('\r\n');
}

