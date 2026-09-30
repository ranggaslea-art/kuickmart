import { Product, Category } from '../types';

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
