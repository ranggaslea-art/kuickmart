import { Product, ProductUnitConversion, Category, BrandItem } from '../types';
import { getProductFallbackImage } from './imageHelper';

let xlsxEnginePromise: Promise<any> | null = null;

export async function getXlsxEngine(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if ((window as any).XLSX) return (window as any).XLSX;
  if (xlsxEnginePromise) return xlsxEnginePromise;

  xlsxEnginePromise = new Promise((resolve) => {
    const existing = document.querySelector('script[data-xlsx-engine]');
    if (existing) {
      if ((window as any).XLSX) {
        resolve((window as any).XLSX);
      } else {
        existing.addEventListener('load', () => resolve((window as any).XLSX));
      }
      return;
    }

    const script = document.createElement('script');
    script.setAttribute('data-xlsx-engine', 'true');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = () => {
      const fallback = document.createElement('script');
      fallback.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      fallback.onload = () => resolve((window as any).XLSX);
      fallback.onerror = () => {
        console.warn('XLSX engine could not be loaded from CDN');
        resolve(null);
      };
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
  });

  return xlsxEnginePromise;
}

export const EXCEL_IMPORT_COLUMNS = [
  'KODEITEM',
  'NAMAITEM',
  'JENIS',
  'MEREK',
  'SATUAN1',
  'SATUAN2',
  'SATUAN3',
  'SATUAN4',
  'BARCODESATUAN1',
  'BARCODESATUAN2',
  'BARCODESATUAN3',
  'BARCODESATUAN4',
  'KONVERSI1',
  'KONVERSI2',
  'KONVERSI3',
  'KONVERSI4',
  'HARGAPOKOK1',
  'HARGAPOKOK2',
  'HARGAPOKOK3',
  'HARGAPOKOK4',
  'HARGAJUAL1',
  'HARGAJUAL2',
  'HARGAJUAL3',
  'HARGAJUAL4',
  'POIN1',
  'POIN2',
  'POIN3',
  'POIN4',
  'KOMISISALES1',
  'KOMISISALES2',
  'KOMISISALES3',
  'KOMISISALES4',
  'STOKAWAL',
  'STOKMINIMAL',
  'TIPEITEM',
  'MENGGUNAKANSERIAL',
  'RAK',
  'KODEGUDANG',
  'KODESUPPLIER',
  'KONSINYASI',
  'KETERANGAN',
  'SKU1',
  'SKU2',
  'SKU3',
  'SKU4',
  'JENISPAJAK',
  'SISTEMPAJAK',
  'KODEREFERENSI',
  'OPSIBRGJASA',
] as const;

export interface ParsedExcelRow {
  rowIndex: number;
  raw: Record<string, any>;
  product: Product;
  hasMultiUnit: boolean;
  unitLevelsCount: number;
  isExistingMatch?: boolean;
  warnings: string[];
}

export interface ExcelImportParseResult {
  success: boolean;
  totalRowsFound: number;
  validRows: ParsedExcelRow[];
  warningRows: ParsedExcelRow[];
  detectedColumns: string[];
  newCategoriesDetected: string[];
  newBrandsDetected: string[];
  errorMessage?: string;
}

/**
 * Normalisasi nama header agar toleran terhadap spasi, huruf besar/kecil, garis bawah, dan singkatan umum
 */
export function normalizeHeaderKey(key: string): string {
  if (!key) return '';
  return key
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[\s_\-]+/g, '');
}

/**
 * Peta pencocokan header fleksibel ke format 49 kolom resmi
 */
const HEADER_SYNONYMS: Record<string, string> = {
  // KODEITEM
  KODEITEM: 'KODEITEM',
  KODE: 'KODEITEM',
  KODEPRODUK: 'KODEITEM',
  KODEBARANG: 'KODEITEM',
  ITEMCODE: 'KODEITEM',

  // NAMAITEM
  NAMAITEM: 'NAMAITEM',
  NAMA: 'NAMAITEM',
  NAMAPRODUK: 'NAMAITEM',
  NAMABARANG: 'NAMAITEM',
  ITEMNAME: 'NAMAITEM',
  PRODUCTNAME: 'NAMAITEM',

  // JENIS / KATEGORI
  JENIS: 'JENIS',
  KATEGORI: 'JENIS',
  CATEGORY: 'JENIS',
  JENISBARANG: 'JENIS',

  // MEREK / BRAND
  MEREK: 'MEREK',
  MERK: 'MEREK',
  BRAND: 'MEREK',

  // SATUAN 1..4
  SATUAN1: 'SATUAN1',
  SATUAN: 'SATUAN1',
  SATUANDASAR: 'SATUAN1',
  UNIT1: 'SATUAN1',
  SATUAN2: 'SATUAN2',
  UNIT2: 'SATUAN2',
  SATUAN3: 'SATUAN3',
  UNIT3: 'SATUAN3',
  SATUAN4: 'SATUAN4',
  UNIT4: 'SATUAN4',

  // BARCODE 1..4
  BARCODESATUAN1: 'BARCODESATUAN1',
  BARCODE1: 'BARCODESATUAN1',
  BARCODE: 'BARCODESATUAN1',
  BARCODESATUAN2: 'BARCODESATUAN2',
  BARCODE2: 'BARCODESATUAN2',
  BARCODESATUAN3: 'BARCODESATUAN3',
  BARCODE3: 'BARCODESATUAN3',
  BARCODESATUAN4: 'BARCODESATUAN4',
  BARCODE4: 'BARCODESATUAN4',

  // KONVERSI 1..4
  KONVERSI1: 'KONVERSI1',
  ISI1: 'KONVERSI1',
  PENGALI1: 'KONVERSI1',
  KONVERSI2: 'KONVERSI2',
  ISI2: 'KONVERSI2',
  PENGALI2: 'KONVERSI2',
  KONVERSI3: 'KONVERSI3',
  ISI3: 'KONVERSI3',
  PENGALI3: 'KONVERSI3',
  KONVERSI4: 'KONVERSI4',
  ISI4: 'KONVERSI4',
  PENGALI4: 'KONVERSI4',

  // HARGAPOKOK (HPP) 1..4
  HARGAPOKOK1: 'HARGAPOKOK1',
  HARGAPOKOK: 'HARGAPOKOK1',
  HPP1: 'HARGAPOKOK1',
  HPP: 'HARGAPOKOK1',
  MODAL1: 'HARGAPOKOK1',
  MODAL: 'HARGAPOKOK1',
  HARGAMODAL1: 'HARGAPOKOK1',
  HARGAPOKOK2: 'HARGAPOKOK2',
  HPP2: 'HARGAPOKOK2',
  MODAL2: 'HARGAPOKOK2',
  HARGAPOKOK3: 'HARGAPOKOK3',
  HPP3: 'HARGAPOKOK3',
  MODAL3: 'HARGAPOKOK3',
  HARGAPOKOK4: 'HARGAPOKOK4',
  HPP4: 'HARGAPOKOK4',
  MODAL4: 'HARGAPOKOK4',

  // HARGAJUAL 1..4
  HARGAJUAL1: 'HARGAJUAL1',
  HARGAJUAL: 'HARGAJUAL1',
  HARGA1: 'HARGAJUAL1',
  HARGA: 'HARGAJUAL1',
  PRICE1: 'HARGAJUAL1',
  PRICE: 'HARGAJUAL1',
  HARGAJUAL2: 'HARGAJUAL2',
  HARGA2: 'HARGAJUAL2',
  HARGAJUAL3: 'HARGAJUAL3',
  HARGA3: 'HARGAJUAL3',
  HARGAJUAL4: 'HARGAJUAL4',
  HARGA4: 'HARGAJUAL4',

  // POIN 1..4
  POIN1: 'POIN1',
  POIN: 'POIN1',
  POINT1: 'POIN1',
  POIN2: 'POIN2',
  POIN3: 'POIN3',
  POIN4: 'POIN4',

  // KOMISISALES 1..4
  KOMISISALES1: 'KOMISISALES1',
  KOMISI1: 'KOMISISALES1',
  KOMISISALES2: 'KOMISISALES2',
  KOMISI2: 'KOMISISALES2',
  KOMISISALES3: 'KOMISISALES3',
  KOMISI3: 'KOMISISALES3',
  KOMISISALES4: 'KOMISISALES4',
  KOMISI4: 'KOMISISALES4',

  // STOK
  STOKAWAL: 'STOKAWAL',
  STOK: 'STOKAWAL',
  STOCK: 'STOKAWAL',
  STOKSEKARANG: 'STOKAWAL',
  QTY: 'STOKAWAL',
  STOKMINIMAL: 'STOKMINIMAL',
  STOKMIN: 'STOKMINIMAL',
  MINSTOK: 'STOKMINIMAL',
  MINSTOCK: 'STOKMINIMAL',

  // LAINNYA
  TIPEITEM: 'TIPEITEM',
  TIPE: 'TIPEITEM',
  JENISTIPE: 'TIPEITEM',
  MENGGUNAKANSERIAL: 'MENGGUNAKANSERIAL',
  SERIAL: 'MENGGUNAKANSERIAL',
  RAK: 'RAK',
  LOKASIRAK: 'RAK',
  LOKASI: 'RAK',
  KODEGUDANG: 'KODEGUDANG',
  GUDANG: 'KODEGUDANG',
  KODESUPPLIER: 'KODESUPPLIER',
  SUPPLIER: 'KODESUPPLIER',
  PEMASOK: 'KODESUPPLIER',
  KONSINYASI: 'KONSINYASI',
  KETERANGAN: 'KETERANGAN',
  DESKRIPSI: 'KETERANGAN',
  NOTE: 'KETERANGAN',
  CATATAN: 'KETERANGAN',
  SKU1: 'SKU1',
  SKU2: 'SKU2',
  SKU3: 'SKU3',
  SKU4: 'SKU4',
  JENISPAJAK: 'JENISPAJAK',
  PAJAK: 'JENISPAJAK',
  SISTEMPAJAK: 'SISTEMPAJAK',
  KODEREFERENSI: 'KODEREFERENSI',
  REFERENSI: 'KODEREFERENSI',
  OPSIBRGJASA: 'OPSIBRGJASA',
};

/**
 * Parsing angka dari string Excel yang mungkin mengandung koma/titik atau lambang Rp
 */
export function parseNumberField(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;

  const str = String(val).trim();
  // Bersihkan teks non-angka kecuali minus, koma, titik
  const cleaned = str.replace(/[^0-9.,\-]/g, '');
  if (!cleaned) return fallback;

  // Cek format koma sebagai pemisah desimal (misal 15.000,50 atau 15000,5)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
      // Format Indonesia: 15.000,00 -> hilangkan titik, ganti koma ke titik
      const normalized = cleaned.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(normalized);
      return isNaN(num) ? fallback : num;
    } else {
      // Format US: 15,000.00
      const normalized = cleaned.replace(/,/g, '');
      const num = parseFloat(normalized);
      return isNaN(num) ? fallback : num;
    }
  }

  // Jika hanya memiliki koma (contoh: 15,5 atau 15000,00)
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      const num = parseFloat(parts[0] + '.' + parts[1]);
      return isNaN(num) ? fallback : num;
    }
    // Asumsi pemisah ribuan
    const num = parseFloat(cleaned.replace(/,/g, ''));
    return isNaN(num) ? fallback : num;
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

/**
 * Bersihkan nilai teks string
 */
export function parseStringField(val: any, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  return String(val).trim();
}

/**
 * Slugify category name
 */
export function slugifyCategory(catName: string): string {
  if (!catName || !catName.trim()) return 'sembako-dapur';
  return catName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Buat konversi bertingkat dari SATUAN2, SATUAN3, SATUAN4
 */
function buildUnitConversionsFromRow(
  canonical: Record<string, any>,
  baseUnit: string,
  basePrice: number,
  baseCost: number
): ProductUnitConversion[] {
  const conversions: ProductUnitConversion[] = [];

  const levels = [
    { num: 2, unit: canonical.SATUAN2, conv: canonical.KONVERSI2, price: canonical.HARGAJUAL2, cost: canonical.HARGAPOKOK2, barcode: canonical.BARCODESATUAN2 },
    { num: 3, unit: canonical.SATUAN3, conv: canonical.KONVERSI3, price: canonical.HARGAJUAL3, cost: canonical.HARGAPOKOK3, barcode: canonical.BARCODESATUAN3 },
    { num: 4, unit: canonical.SATUAN4, conv: canonical.KONVERSI4, price: canonical.HARGAJUAL4, cost: canonical.HARGAPOKOK4, barcode: canonical.BARCODESATUAN4 },
  ];

  levels.forEach((lvl) => {
    const unitName = parseStringField(lvl.unit);
    const multiplier = parseNumberField(lvl.conv, 0);
    const salePrice = parseNumberField(lvl.price, 0);
    const barcode = parseStringField(lvl.barcode);

    // Satuan kemasan diakui jika memiliki nama unit ATAU pengali > 1 ATAU harga jual kemasan terisi
    if (unitName && unitName.toUpperCase() !== baseUnit.toUpperCase()) {
      const finalMultiplier = multiplier > 0 ? multiplier : 1;
      const finalPrice = salePrice > 0 ? salePrice : (basePrice > 0 ? basePrice * finalMultiplier : undefined);

      conversions.push({
        id: `conv_${Date.now()}_${lvl.num}_${Math.random().toString(36).substring(2, 6)}`,
        unitName,
        containsQty: finalMultiplier,
        containsUnit: baseUnit,
        totalMultiplier: finalMultiplier,
        price: finalPrice,
        barcode: barcode || undefined,
        description: `1 ${unitName} = ${finalMultiplier} ${baseUnit}`,
      });
    }
  });

  return conversions;
}

/**
 * Ubah baris data mentah ke objek Product yang lengkap
 */
export function mapRowToProduct(
  canonical: Record<string, any>,
  index: number,
  existingProducts: Product[] = []
): { product: Product; warnings: string[]; hasMultiUnit: boolean; unitLevelsCount: number } {
  const warnings: string[] = [];

  const rawKode = parseStringField(canonical.KODEITEM);
  const rawNama = parseStringField(canonical.NAMAITEM);
  const rawJenis = parseStringField(canonical.JENIS);
  const rawMerek = parseStringField(canonical.MEREK);
  const rawSatuan1 = parseStringField(canonical.SATUAN1) || 'Pcs';
  const rawBarcode1 = parseStringField(canonical.BARCODESATUAN1);
  const rawHpp1 = parseNumberField(canonical.HARGAPOKOK1, 0);
  const rawHarga1 = parseNumberField(canonical.HARGAJUAL1, 0);
  const rawStok = parseNumberField(canonical.STOKAWAL, 0);
  const rawMinStok = parseNumberField(canonical.STOKMINIMAL, 5);
  const rawRak = parseStringField(canonical.RAK);
  const rawGudang = parseStringField(canonical.KODEGUDANG);
  const rawSupplier = parseStringField(canonical.KODESUPPLIER);
  const rawTipe = parseStringField(canonical.TIPEITEM) || 'Barang';
  const rawSerial = parseStringField(canonical.MENGGUNAKANSERIAL);
  const rawKonsinyasi = parseStringField(canonical.KONSINYASI);
  const rawPoin1 = parseNumberField(canonical.POIN1, 0);
  const rawKomisi1 = parseNumberField(canonical.KOMISISALES1, 0);
  const rawKeterangan = parseStringField(canonical.KETERANGAN);
  const rawSku1 = parseStringField(canonical.SKU1);
  const rawSku2 = parseStringField(canonical.SKU2);
  const rawSku3 = parseStringField(canonical.SKU3);
  const rawSku4 = parseStringField(canonical.SKU4);
  const rawPajak = parseStringField(canonical.JENISPAJAK);
  const rawSistemPajak = parseStringField(canonical.SISTEMPAJAK);
  const rawRef = parseStringField(canonical.KODEREFERENSI);

  if (!rawNama) {
    warnings.push('Nama item kosong pada baris ini.');
  }

  // Tentukan Barcode utama & ID
  let barcode = rawBarcode1 || rawKode;
  if (!barcode) {
    barcode = Math.floor(8990000000000 + Math.random() * 999999999).toString();
  }

  // Cek apakah produk sudah ada di database saat ini (pencocokan via barcode atau kode item)
  const existing = existingProducts.find(
    p => (p.barcode && barcode && p.barcode.toLowerCase() === barcode.toLowerCase()) ||
         (p.itemCode && rawKode && p.itemCode.toLowerCase() === rawKode.toLowerCase()) ||
         (p.name.toLowerCase() === (rawNama || '').toLowerCase())
  );

  const productId = existing ? existing.id : `bulk_imp_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`;
  const brand = rawMerek || (existing ? existing.brand : 'Umum');
  const categorySlug = rawJenis ? slugifyCategory(rawJenis) : (existing ? existing.category : 'sembako');

  // Multi-satuan konversi
  const unitConversions = buildUnitConversionsFromRow(canonical, rawSatuan1, rawHarga1, rawHpp1);
  const hasMultiUnit = unitConversions.length > 0;
  const unitLevelsCount = 1 + unitConversions.length;

  // Fallback image
  const fallbackImg = existing?.image || getProductFallbackImage(rawNama, rawJenis);

  // Estimasi HPP jika kosong tetapi harga jual ada
  const finalHpp = rawHpp1 > 0 ? rawHpp1 : (rawHarga1 > 0 ? Math.round(rawHarga1 * 0.8) : 0);

  const product: Product = {
    id: productId,
    name: rawNama || `Item Baru #${index + 1}`,
    brand,
    category: categorySlug,
    price: rawHarga1 > 0 ? rawHarga1 : (finalHpp > 0 ? Math.round(finalHpp * 1.25) : 10000),
    originalPrice: rawHarga1 > 0 ? rawHarga1 : 10000,
    costPrice: finalHpp,
    unit: rawSatuan1,
    unitConversions: hasMultiUnit ? unitConversions : undefined,
    image: fallbackImg,
    stock: rawStok,
    rating: existing?.rating || 4.9,
    soldCount: existing?.soldCount || 0,
    tags: existing?.tags || ['Best Seller'],
    description: rawKeterangan || `Produk resmi ${rawNama || 'minimarket'} terdaftar di sistem toko-online.online.`,
    barcode,
    itemCode: rawKode || barcode,
    shelf: rawRak || undefined,
    minStock: rawMinStok > 0 ? rawMinStok : 5,
    warehouseCode: rawGudang || undefined,
    supplierCode: rawSupplier || undefined,
    itemType: rawTipe,
    useSerial: /ya|y|true|1/i.test(rawSerial),
    isConsignment: /ya|y|true|1/i.test(rawKonsinyasi),
    point: rawPoin1 > 0 ? rawPoin1 : undefined,
    commission: rawKomisi1 > 0 ? rawKomisi1 : undefined,
    taxType: rawPajak || undefined,
    taxSystem: rawSistemPajak || undefined,
    referenceCode: rawRef || undefined,
    sku1: rawSku1 || undefined,
    sku2: rawSku2 || undefined,
    sku3: rawSku3 || undefined,
    sku4: rawSku4 || undefined,
  };

  return { product, warnings, hasMultiUnit, unitLevelsCount };
}

/**
 * Parsing array of raw objects (hasil dari XLSX.utils.sheet_to_json)
 */
export function parseRawJsonRows(
  rows: any[],
  existingProducts: Product[] = []
): ExcelImportParseResult {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      success: false,
      totalRowsFound: 0,
      validRows: [],
      warningRows: [],
      detectedColumns: [],
      newCategoriesDetected: [],
      newBrandsDetected: [],
      errorMessage: 'Berkas atau teks tidak memuat baris data yang valid.',
    };
  }

  // Deteksi kolom yang ada
  const detectedHeadersSet = new Set<string>();
  rows.forEach(r => {
    if (r && typeof r === 'object') {
      Object.keys(r).forEach(k => detectedHeadersSet.add(k));
    }
  });

  const detectedColumns = Array.from(detectedHeadersSet);
  const newCategoriesSet = new Set<string>();
  const newBrandsSet = new Set<string>();
  const validRows: ParsedExcelRow[] = [];
  const warningRows: ParsedExcelRow[] = [];

  rows.forEach((row, idx) => {
    // Bangun canonical dictionary berdasarkan sinomin kolom
    const canonical: Record<string, any> = {};

    Object.entries(row).forEach(([colName, colVal]) => {
      const norm = normalizeHeaderKey(colName);
      const canonKey = HEADER_SYNONYMS[norm] || norm;
      canonical[canonKey] = colVal;
    });

    // Validasi baris kosong
    const hasAnyContent = Object.values(canonical).some(v => v !== null && v !== undefined && String(v).trim() !== '');
    if (!hasAnyContent) return;

    const { product, warnings, hasMultiUnit, unitLevelsCount } = mapRowToProduct(canonical, idx, existingProducts);

    if (canonical.JENIS) {
      newCategoriesSet.add(String(canonical.JENIS).trim());
    }
    if (canonical.MEREK && canonical.MEREK !== 'Umum') {
      newBrandsSet.add(String(canonical.MEREK).trim());
    }

    const isExistingMatch = existingProducts.some(p => p.id === product.id);

    const parsedRow: ParsedExcelRow = {
      rowIndex: idx + 1,
      raw: canonical,
      product,
      hasMultiUnit,
      unitLevelsCount,
      isExistingMatch,
      warnings,
    };

    if (warnings.length > 0) {
      warningRows.push(parsedRow);
    } else {
      validRows.push(parsedRow);
    }
  });

  return {
    success: validRows.length + warningRows.length > 0,
    totalRowsFound: validRows.length + warningRows.length,
    validRows,
    warningRows,
    detectedColumns,
    newCategoriesDetected: Array.from(newCategoriesSet).filter(Boolean),
    newBrandsDetected: Array.from(newBrandsSet).filter(Boolean),
  };
}

/**
 * Parsing berkas Excel (.xlsx / .xls / .csv) menggunakan library xlsx atau parser CSV internal
 */
export async function parseExcelFile(
  file: File,
  existingProducts: Product[] = []
): Promise<ExcelImportParseResult> {
  try {
    const fileName = (file.name || '').toLowerCase();

    // 1. Jika berkas adalah CSV atau teks, proses langsung secara native
    if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || file.type.includes('csv')) {
      const text = await file.text();
      return parsePastedExcelText(text, existingProducts);
    }

    // 2. Berkas biner Excel (.xlsx / .xls)
    const XLSX = await getXlsxEngine();
    if (!XLSX) {
      return {
        success: false,
        totalRowsFound: 0,
        validRows: [],
        warningRows: [],
        detectedColumns: [],
        newCategoriesDetected: [],
        newBrandsDetected: [],
        errorMessage: 'Pustaka pembaca file Excel (.xlsx) biner sedang dimuat atau perangkat Anda offline. Sebagai alternatif cepat, Anda dapat menyimpan file Anda sebagai CSV (.csv) di Excel atau salin sel dan tempel di tab "Tempel Teks Sel".',
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        totalRowsFound: 0,
        validRows: [],
        warningRows: [],
        detectedColumns: [],
        newCategoriesDetected: [],
        newBrandsDetected: [],
        errorMessage: 'Lembar kerja (Sheet) di dalam berkas Excel tidak ditemukan.',
      };
    }

    // Ambil sheet pertama atau yang bernama "Item" / "Produk"
    const firstSheetName = workbook.SheetNames[0];
    const targetSheet = workbook.Sheets[firstSheetName];
    if (!targetSheet) {
      return {
        success: false,
        totalRowsFound: 0,
        validRows: [],
        warningRows: [],
        detectedColumns: [],
        newCategoriesDetected: [],
        newBrandsDetected: [],
        errorMessage: `Sheet '${firstSheetName}' kosong atau tidak terbaca.`,
      };
    }

    // Convert sheet ke json objek
    const rawData = XLSX.utils.sheet_to_json(targetSheet, { defval: '' });
    return parseRawJsonRows(rawData, existingProducts);
  } catch (err: any) {
    return {
      success: false,
      totalRowsFound: 0,
      validRows: [],
      warningRows: [],
      detectedColumns: [],
      newCategoriesDetected: [],
      newBrandsDetected: [],
      errorMessage: `Gagal membaca file Excel: ${err.message || 'Format tidak didukung'}`,
    };
  }
}

/**
 * Parsing teks yang ditempel (Paste) dari Excel/Google Sheets
 * Mendukung Tab-delimited (Ctrl+C langsung dari sel Excel), CSV (koma/titik-koma), atau Pipe (|)
 */
export function parsePastedExcelText(
  text: string,
  existingProducts: Product[] = []
): ExcelImportParseResult {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      success: false,
      totalRowsFound: 0,
      validRows: [],
      warningRows: [],
      detectedColumns: [],
      newCategoriesDetected: [],
      newBrandsDetected: [],
      errorMessage: 'Teks yang ditempel masih kosong. Silakan salin sel data dari Excel.',
    };
  }

  const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    return {
      success: false,
      totalRowsFound: 0,
      validRows: [],
      warningRows: [],
      detectedColumns: [],
      newCategoriesDetected: [],
      newBrandsDetected: [],
      errorMessage: 'Tidak ada baris teks yang ditemukan.',
    };
  }

  // Deteksi pemisah (Delimiter): Tab (\t), Semicolon (;), Comma (,), atau Pipe (|)
  const firstLine = lines[0];
  let delimiter = '\t';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.includes(';') && (firstLine.match(/;/g) || []).length >= 2) {
    delimiter = ';';
  } else if (firstLine.includes('|')) {
    delimiter = '|';
  } else if (firstLine.includes(',') && (firstLine.match(/,/g) || []).length >= 2) {
    delimiter = ',';
  }

  // Cek apakah baris pertama adalah Header
  const firstRowCols = firstLine.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
  const firstRowNorm = firstRowCols.map(c => normalizeHeaderKey(c));

  // Indikator kuat baris pertama adalah header: mengandung KODEITEM / NAMAITEM / JENIS / SATUAN1
  const isHeaderRow = firstRowNorm.some(k => 
    k === 'KODEITEM' || k === 'NAMAITEM' || k === 'JENIS' || k === 'MEREK' || k === 'SATUAN1' || k === 'HARGAJUAL1' || k === 'STOKAWAL' || k === 'NAMABARANG'
  );

  let headerColumns: string[] = [];
  let dataLines: string[] = [];

  if (isHeaderRow) {
    headerColumns = firstRowCols;
    dataLines = lines.slice(1);
  } else {
    // Jika tidak ada header, gunakan urutan standar 49 kolom resmi
    // atau jika hanya 5 kolom, gunakan format legacy: Nama | Harga | Stok | Kategori | Brand
    if (firstRowCols.length <= 5 && delimiter === '|') {
      headerColumns = ['NAMAITEM', 'HARGAJUAL1', 'STOKAWAL', 'JENIS', 'MEREK'];
    } else {
      headerColumns = [...EXCEL_IMPORT_COLUMNS];
    }
    dataLines = lines;
  }

  // Ubah ke raw json objects
  const rawRows: Record<string, any>[] = [];

  dataLines.forEach((line) => {
    const rawTokens = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (rawTokens.length === 0 || rawTokens.every(t => !t)) return;

    const rowObj: Record<string, any> = {};
    headerColumns.forEach((colName, cIdx) => {
      rowObj[colName] = rawTokens[cIdx] ?? '';
    });

    rawRows.push(rowObj);
  });

  return parseRawJsonRows(rawRows, existingProducts);
}

/**
 * Sampel data realistis ritel / minimarket Indonesia dengan format 49 kolom resmi
 */
export const SAMPLE_EXCEL_IMPORT_DATA = [
  {
    KODEITEM: 'BRG-001-ROJ5K',
    NAMAITEM: 'Beras Rojolele Super Premium 5kg',
    JENIS: 'Sembako',
    MEREK: 'Rojolele',
    SATUAN1: 'PCS',
    SATUAN2: 'KARUNG',
    SATUAN3: 'TON',
    SATUAN4: '',
    BARCODESATUAN1: '8991234500011',
    BARCODESATUAN2: '8991234500012',
    BARCODESATUAN3: '',
    BARCODESATUAN4: '',
    KONVERSI1: 1,
    KONVERSI2: 10,
    KONVERSI3: 200,
    KONVERSI4: 0,
    HARGAPOKOK1: 67000,
    HARGAPOKOK2: 660000,
    HARGAPOKOK3: 13000000,
    HARGAPOKOK4: 0,
    HARGAJUAL1: 75000,
    HARGAJUAL2: 740000,
    HARGAJUAL3: 14500000,
    HARGAJUAL4: 0,
    POIN1: 5,
    POIN2: 50,
    POIN3: 1000,
    POIN4: 0,
    KOMISISALES1: 500,
    KOMISISALES2: 5000,
    KOMISISALES3: 50000,
    KOMISISALES4: 0,
    STOKAWAL: 45,
    STOKMINIMAL: 10,
    TIPEITEM: 'Barang',
    MENGGUNAKANSERIAL: 'N',
    RAK: 'Gudang-A1',
    KODEGUDANG: 'GUD-PUSAT',
    KODESUPPLIER: 'SUP-BERAS-01',
    KONSINYASI: 'N',
    KETERANGAN: 'Beras pulen pilihan kualitas nomor 1 keluarga Indonesia',
    SKU1: 'SKU-ROJO-5K',
    SKU2: 'SKU-ROJO-KRNG',
    SKU3: '',
    SKU4: '',
    JENISPAJAK: 'NON-PAJAK',
    SISTEMPAJAK: 'INCLUDE',
    KODEREFERENSI: 'REF-SEMBAKO-01',
    OPSIBRGJASA: 'Barang',
  },
  {
    KODEITEM: 'BRG-002-TRP2L',
    NAMAITEM: 'Minyak Goreng Tropical Pouch 2 Liter',
    JENIS: 'Minyak & Bumbu',
    MEREK: 'Tropical',
    SATUAN1: 'PCS',
    SATUAN2: 'DUS',
    SATUAN3: '',
    SATUAN4: '',
    BARCODESATUAN1: '8992753100223',
    BARCODESATUAN2: '8992753100224',
    BARCODESATUAN3: '',
    BARCODESATUAN4: '',
    KONVERSI1: 1,
    KONVERSI2: 6,
    KONVERSI3: 0,
    KONVERSI4: 0,
    HARGAPOKOK1: 34500,
    HARGAPOKOK2: 204000,
    HARGAPOKOK3: 0,
    HARGAPOKOK4: 0,
    HARGAJUAL1: 38500,
    HARGAJUAL2: 228000,
    HARGAJUAL3: 0,
    HARGAJUAL4: 0,
    POIN1: 3,
    POIN2: 18,
    POIN3: 0,
    POIN4: 0,
    KOMISISALES1: 250,
    KOMISISALES2: 1500,
    KOMISISALES3: 0,
    KOMISISALES4: 0,
    STOKAWAL: 72,
    STOKMINIMAL: 12,
    TIPEITEM: 'Barang',
    MENGGUNAKANSERIAL: 'N',
    RAK: 'Rak-B2',
    KODEGUDANG: 'GUD-PUSAT',
    KODESUPPLIER: 'SUP-MINYAK-02',
    KONSINYASI: 'N',
    KETERANGAN: '2 kali penyaringan higienis menjaga rasa masakan renyah',
    SKU1: 'SKU-TRP-2L',
    SKU2: 'SKU-TRP-DUS',
    SKU3: '',
    SKU4: '',
    JENISPAJAK: 'PPN',
    SISTEMPAJAK: 'INCLUDE',
    KODEREFERENSI: 'REF-MINYAK-02',
    OPSIBRGJASA: 'Barang',
  },
  {
    KODEITEM: 'BRG-003-INDMIE',
    NAMAITEM: 'Indomie Kuah Rasa Ayam Bawang 69g',
    JENIS: 'Makanan Instan',
    MEREK: 'Indofood',
    SATUAN1: 'BKS',
    SATUAN2: 'PACK',
    SATUAN3: 'DUS',
    SATUAN4: '',
    BARCODESATUAN1: '8998866200155',
    BARCODESATUAN2: '8998866200156',
    BARCODESATUAN3: '8998866200157',
    BARCODESATUAN4: '',
    KONVERSI1: 1,
    KONVERSI2: 5,
    KONVERSI3: 40,
    KONVERSI4: 0,
    HARGAPOKOK1: 2750,
    HARGAPOKOK2: 13500,
    HARGAPOKOK3: 106000,
    HARGAPOKOK4: 0,
    HARGAJUAL1: 3200,
    HARGAJUAL2: 15500,
    HARGAJUAL3: 122000,
    HARGAJUAL4: 0,
    POIN1: 1,
    POIN2: 5,
    POIN3: 40,
    POIN4: 0,
    KOMISISALES1: 50,
    KOMISISALES2: 250,
    KOMISISALES3: 2000,
    KOMISISALES4: 0,
    STOKAWAL: 240,
    STOKMINIMAL: 40,
    TIPEITEM: 'Barang',
    MENGGUNAKANSERIAL: 'N',
    RAK: 'Rak-C1',
    KODEGUDANG: 'GUD-PUSAT',
    KODESUPPLIER: 'SUP-INDOFOOD-01',
    KONSINYASI: 'N',
    KETERANGAN: 'Mie kuah kaldu gurih ayam bawang legendaris',
    SKU1: 'SKU-IND-AYMBWG-BKS',
    SKU2: 'SKU-IND-AYMBWG-PCK',
    SKU3: 'SKU-IND-AYMBWG-DUS',
    SKU4: '',
    JENISPAJAK: 'PPN',
    SISTEMPAJAK: 'INCLUDE',
    KODEREFERENSI: 'REF-INDOMIE-03',
    OPSIBRGJASA: 'Barang',
  },
  {
    KODEITEM: 'BRG-004-DJR12',
    NAMAITEM: 'Djarum Super 12 Batang Cukai Resmi',
    JENIS: 'Rokok & Tembakau',
    MEREK: 'Djarum',
    SATUAN1: 'BKS',
    SATUAN2: 'SLOP',
    SATUAN3: 'BAL',
    SATUAN4: '',
    BARCODESATUAN1: '8992761001228',
    BARCODESATUAN2: '8992761001229',
    BARCODESATUAN3: '8992761001230',
    BARCODESATUAN4: '',
    KONVERSI1: 1,
    KONVERSI2: 10,
    KONVERSI3: 200,
    KONVERSI4: 0,
    HARGAPOKOK1: 22800,
    HARGAPOKOK2: 226000,
    HARGAPOKOK3: 4480000,
    HARGAPOKOK4: 0,
    HARGAJUAL1: 24500,
    HARGAJUAL2: 243000,
    HARGAJUAL3: 4820000,
    HARGAJUAL4: 0,
    POIN1: 2,
    POIN2: 20,
    POIN3: 400,
    POIN4: 0,
    KOMISISALES1: 200,
    KOMISISALES2: 2000,
    KOMISISALES3: 40000,
    KOMISISALES4: 0,
    STOKAWAL: 150,
    STOKMINIMAL: 20,
    TIPEITEM: 'Barang',
    MENGGUNAKANSERIAL: 'N',
    RAK: 'Lemari-Kasir-01',
    KODEGUDANG: 'GUD-PUSAT',
    KODESUPPLIER: 'SUP-DJARUM-01',
    KONSINYASI: 'N',
    KETERANGAN: 'Rokok kretek filter premium Djarum Super isi 12 batang',
    SKU1: 'SKU-DJR-12-BKS',
    SKU2: 'SKU-DJR-12-SLP',
    SKU3: 'SKU-DJR-12-BAL',
    SKU4: '',
    JENISPAJAK: 'NON-PAJAK',
    SISTEMPAJAK: 'INCLUDE',
    KODEREFERENSI: 'REF-ROKOK-04',
    OPSIBRGJASA: 'Barang',
  },
  {
    KODEITEM: 'BRG-005-GULAKU',
    NAMAITEM: 'Gulaku Tebu Murni Kuning Premium 1kg',
    JENIS: 'Sembako',
    MEREK: 'Gulaku',
    SATUAN1: 'PCS',
    SATUAN2: 'DUS',
    SATUAN3: '',
    SATUAN4: '',
    BARCODESATUAN1: '8999999551122',
    BARCODESATUAN2: '8999999551123',
    BARCODESATUAN3: '',
    BARCODESATUAN4: '',
    KONVERSI1: 1,
    KONVERSI2: 24,
    KONVERSI3: 0,
    KONVERSI4: 0,
    HARGAPOKOK1: 16500,
    HARGAPOKOK2: 390000,
    HARGAPOKOK3: 0,
    HARGAPOKOK4: 0,
    HARGAJUAL1: 18500,
    HARGAJUAL2: 438000,
    HARGAJUAL3: 0,
    HARGAJUAL4: 0,
    POIN1: 1,
    POIN2: 24,
    POIN3: 0,
    POIN4: 0,
    KOMISISALES1: 150,
    KOMISISALES2: 3600,
    KOMISISALES3: 0,
    KOMISISALES4: 0,
    STOKAWAL: 96,
    STOKMINIMAL: 24,
    TIPEITEM: 'Barang',
    MENGGUNAKANSERIAL: 'N',
    RAK: 'Rak-A3',
    KODEGUDANG: 'GUD-PUSAT',
    KODESUPPLIER: 'SUP-GULA-01',
    KONSINYASI: 'N',
    KETERANGAN: 'Gula pasir tebu alami butiran halus manis higienis',
    SKU1: 'SKU-GLK-1K-PCS',
    SKU2: 'SKU-GLK-1K-DUS',
    SKU3: '',
    SKU4: '',
    JENISPAJAK: 'NON-PAJAK',
    SISTEMPAJAK: 'INCLUDE',
    KODEREFERENSI: 'REF-GULA-05',
    OPSIBRGJASA: 'Barang',
  },
];

/**
 * Buat dan unduh berkas template Excel dengan 49 kolom resmi
 * Mendukung format XML Spreadsheet 2003 (.xls) yang dapat langsung dibuka di Excel tanpa library eksternal
 * atau binary .xlsx jika XLSX engine sudah termuat.
 */
export async function downloadOfficialExcelTemplate(): Promise<void> {
  const XLSX = await getXlsxEngine();

  if (XLSX) {
    try {
      const worksheet = XLSX.utils.json_to_sheet(SAMPLE_EXCEL_IMPORT_DATA, {
        header: [...EXCEL_IMPORT_COLUMNS],
      });

      worksheet['!cols'] = EXCEL_IMPORT_COLUMNS.map((col) => {
        if (col === 'NAMAITEM') return { wch: 35 };
        if (col === 'KODEITEM' || col === 'JENIS' || col === 'MEREK') return { wch: 18 };
        if (col.startsWith('BARCODE')) return { wch: 18 };
        if (col.startsWith('HARGA')) return { wch: 15 };
        if (col === 'KETERANGAN') return { wch: 40 };
        return { wch: 12 };
      });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'MasterItem');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Template_Import_Cepat_Excel_toko_online_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    } catch {
      // Fallback ke XML Spreadsheet 2003
    }
  }

  // Pure XML Spreadsheet 2003 fallback (.xls)
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

  const dataRowsXml = SAMPLE_EXCEL_IMPORT_DATA.map((row) => {
    const cellsXml = EXCEL_IMPORT_COLUMNS.map((col) => {
      const val = (row as any)[col] ?? '';
      const isNum = typeof val === 'number';
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
  </Style>
  <Style ss:ID="NumberStyle">
   <NumberFormat ss:Format="#,##0"/>
   <Alignment ss:Horizontal="Right"/>
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
   <Row ss:Height="24">
    ${headerCells}
   </Row>
   ${dataRowsXml}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Template_Import_Cepat_Excel_toko_online_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Buat dan unduh template CSV dengan 49 kolom resmi
 */
export function downloadOfficialCsvTemplate(delimiter: ';' | ',' = ';'): void {
  const headers = [...EXCEL_IMPORT_COLUMNS];
  const rows = [headers.join(delimiter)];

  SAMPLE_EXCEL_IMPORT_DATA.forEach((item) => {
    const values = headers.map((h) => {
      const val = (item as any)[h] ?? '';
      const str = String(val);
      if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    rows.push(values.join(delimiter));
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Template_Import_Cepat_Excel_toko_online_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generate tab-delimited sample text untuk di-paste langsung
 */
export function generateSampleTsvText(): string {
  const headers = [...EXCEL_IMPORT_COLUMNS].join('\t');
  const rows = SAMPLE_EXCEL_IMPORT_DATA.map((item) => {
    return EXCEL_IMPORT_COLUMNS.map((h) => (item as any)[h] ?? '').join('\t');
  });
  return [headers, ...rows].join('\n');
}
