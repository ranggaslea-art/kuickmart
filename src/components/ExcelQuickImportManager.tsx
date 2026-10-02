import React, { useState, useMemo, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Search, 
  Copy, 
  Check, 
  RotateCcw, 
  FileText, 
  Sparkles, 
  Boxes, 
  Tag, 
  Package, 
  Info, 
  X, 
  ArrowRight,
  Database,
  Building2,
  TableProperties,
  SlidersHorizontal,
  Bookmark
} from 'lucide-react';
import { Product, Category, BrandItem } from '../types';
import { formatRupiah, formatNumber } from '../utils/formatters';
import { 
  EXCEL_IMPORT_COLUMNS, 
  parseExcelFile, 
  parsePastedExcelText, 
  downloadOfficialExcelTemplate, 
  downloadOfficialCsvTemplate,
  generateSampleTsvText,
  ExcelImportParseResult,
  ParsedExcelRow
} from '../utils/excelImportParser';

interface ExcelQuickImportManagerProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  categories?: Category[];
  onUpdateCategories?: (categories: Category[]) => void;
  brands?: BrandItem[];
  onUpdateBrands?: (brands: BrandItem[]) => void;
  canEdit?: boolean;
  onOpenProductCatalog?: () => void;
}

export const ExcelQuickImportManager: React.FC<ExcelQuickImportManagerProps> = ({
  products = [],
  onUpdateProducts,
  categories = [],
  onUpdateCategories,
  brands = [],
  onUpdateBrands,
  canEdit = true,
  onOpenProductCatalog,
}) => {
  const [activeInputMode, setActiveInputMode] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ExcelImportParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  
  // Settings
  const [duplicateStrategy, setDuplicateStrategy] = useState<'update' | 'skip' | 'add_new'>('update');
  const [autoAddCategories, setAutoAddCategories] = useState(true);
  const [autoAddBrands, setAutoAddBrands] = useState(true);

  // Filter preview table
  const [previewSearch, setPreviewSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'multi_unit' | 'warnings' | 'existing'>('all');

  // Copy status feedback
  const [isCopied, setIsCopied] = useState(false);
  const [importReport, setImportReport] = useState<{
    added: number;
    updated: number;
    categoriesCreated: number;
    brandsCreated: number;
    timestamp: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse file when selected
  const handleFileChange = async (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setIsParsing(true);
    setParseError(null);
    setImportReport(null);

    try {
      const result = await parseExcelFile(file, products);
      setParseResult(result);
      if (!result.success && result.errorMessage) {
        setParseError(result.errorMessage);
      }
    } catch (err: any) {
      setParseError(`Gagal membaca berkas Excel: ${err.message || 'Format tidak valid'}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Parse pasted text
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setParseError('Teks yang ditempel masih kosong. Silakan salin sel data dari Excel.');
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setImportReport(null);

    try {
      const result = parsePastedExcelText(pastedText, products);
      setParseResult(result);
      if (!result.success && result.errorMessage) {
        setParseError(result.errorMessage);
      }
    } catch (err: any) {
      setParseError(`Gagal memproses data teks: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Quick load sample text
  const handleLoadSampleText = () => {
    const sample = generateSampleTsvText();
    setPastedText(sample);
    const result = parsePastedExcelText(sample, products);
    setParseResult(result);
    setParseError(null);
    setImportReport(null);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileChange(file);
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedFile(null);
    setPastedText('');
    setParseResult(null);
    setParseError(null);
    setImportReport(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Filtered preview rows
  const allRows = useMemo(() => {
    if (!parseResult) return [];
    return [...parseResult.validRows, ...parseResult.warningRows];
  }, [parseResult]);

  const filteredPreviewRows = useMemo(() => {
    let rows = allRows;

    if (filterMode === 'multi_unit') {
      rows = rows.filter(r => r.hasMultiUnit);
    } else if (filterMode === 'warnings') {
      rows = rows.filter(r => r.warnings.length > 0);
    } else if (filterMode === 'existing') {
      rows = rows.filter(r => r.isExistingMatch);
    }

    if (previewSearch.trim()) {
      const q = previewSearch.toLowerCase();
      rows = rows.filter(r => {
        const name = (r.product.name || '').toLowerCase();
        const brand = (r.product.brand || '').toLowerCase();
        const category = (r.product.category || '').toLowerCase();
        const barcode = (r.product.barcode || '').toLowerCase();
        const itemCode = (r.product.itemCode || '').toLowerCase();
        return name.includes(q) || brand.includes(q) || category.includes(q) || barcode.includes(q) || itemCode.includes(q);
      });
    }

    return rows;
  }, [allRows, filterMode, previewSearch]);

  // Execute import
  const handleExecuteImport = () => {
    if (!parseResult || allRows.length === 0) return;

    let addedCount = 0;
    let updatedCount = 0;
    const currentProductsMap = new Map<string, Product>();
    const barcodeMap = new Map<string, string>(); // barcode -> id
    const itemCodeMap = new Map<string, string>(); // itemCode -> id

    products.forEach(p => {
      currentProductsMap.set(p.id, p);
      if (p.barcode) barcodeMap.set(p.barcode.toLowerCase(), p.id);
      if (p.itemCode) itemCodeMap.set(p.itemCode.toLowerCase(), p.id);
    });

    const newCategoriesToRegister: Category[] = [...categories];
    const newBrandsToRegister: BrandItem[] = [...brands];
    let createdCatCount = 0;
    let createdBrandCount = 0;

    allRows.forEach(row => {
      const incoming = row.product;
      const incomingBarcode = (incoming.barcode || '').toLowerCase();
      const incomingItemCode = (incoming.itemCode || '').toLowerCase();

      // Cari duplikat
      let existingId = (incomingBarcode && barcodeMap.get(incomingBarcode)) ||
                       (incomingItemCode && itemCodeMap.get(incomingItemCode));

      if (!existingId) {
        // Fallback cek nama persis
        const nameMatch = products.find(p => p.name.trim().toLowerCase() === incoming.name.trim().toLowerCase());
        if (nameMatch) existingId = nameMatch.id;
      }

      if (existingId && currentProductsMap.has(existingId)) {
        if (duplicateStrategy === 'update') {
          const old = currentProductsMap.get(existingId)!;
          const merged: Product = {
            ...old,
            ...incoming,
            id: old.id, // Pertahankan ID lama agar riwayat transaksi/stok tetap konsisten
            stock: incoming.stock > 0 ? incoming.stock : old.stock,
            soldCount: old.soldCount || 0,
            rating: old.rating || 4.9,
          };
          currentProductsMap.set(old.id, merged);
          updatedCount++;
        } else if (duplicateStrategy === 'skip') {
          // Abaikan baris ini
        } else {
          // add_new: generate ID baru
          const newId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const freshProduct = { ...incoming, id: newId };
          currentProductsMap.set(newId, freshProduct);
          addedCount++;
        }
      } else {
        // Produk baru
        currentProductsMap.set(incoming.id, incoming);
        if (incoming.barcode) barcodeMap.set(incoming.barcode.toLowerCase(), incoming.id);
        if (incoming.itemCode) itemCodeMap.set(incoming.itemCode.toLowerCase(), incoming.id);
        addedCount++;
      }

      // Auto-register Category jika opsi aktif
      if (autoAddCategories && incoming.category) {
        const catSlug = incoming.category;
        const exists = newCategoriesToRegister.some(c => c.slug === catSlug || c.id === catSlug);
        if (!exists) {
          const rawJenis = String(row.raw.JENIS || catSlug);
          newCategoriesToRegister.push({
            id: catSlug,
            name: rawJenis.charAt(0).toUpperCase() + rawJenis.slice(1),
            slug: catSlug,
            icon: 'Store',
            color: '#10B981',
          });
          createdCatCount++;
        }
      }

      // Auto-register Brand jika opsi aktif
      if (autoAddBrands && incoming.brand && incoming.brand !== 'Umum') {
        const brandName = incoming.brand.trim();
        const exists = newBrandsToRegister.some(b => b.name.toLowerCase() === brandName.toLowerCase());
        if (!exists) {
          newBrandsToRegister.push({
            id: `brand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: brandName,
            isActive: true,
            createdAt: new Date().toISOString(),
          });
          createdBrandCount++;
        }
      }
    });

    // Simpan ke state produk
    const updatedList = Array.from(currentProductsMap.values());
    onUpdateProducts(updatedList);

    // Simpan kategori dan brand baru jika ada
    if (createdCatCount > 0 && onUpdateCategories) {
      onUpdateCategories(newCategoriesToRegister);
    }
    if (createdBrandCount > 0 && onUpdateBrands) {
      onUpdateBrands(newBrandsToRegister);
    }

    setImportReport({
      added: addedCount,
      updated: updatedCount,
      categoriesCreated: createdCatCount,
      brandsCreated: createdBrandCount,
      timestamp: new Date().toLocaleTimeString('id-ID'),
    });
  };

  const copyHeaderCheatSheet = () => {
    const text = EXCEL_IMPORT_COLUMNS.join('\t');
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* HEADER CARD */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-5 rounded-3xl shadow-md border border-emerald-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl">
                <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
              </span>
              <h3 className="font-extrabold text-base md:text-lg tracking-tight">
                Modul Import Cepat Excel (Format Standar Ritel & iPos)
              </h3>
            </div>
            <p className="text-xs text-emerald-100/90 leading-relaxed max-w-2xl">
              Mendukung penuh <strong>49 kolom resmi</strong> template Excel: KODEITEM, NAMAITEM, JENIS, MEREK, SATUAN1-4, KONVERSI1-4, HARGAPOKOK1-4, HARGAJUAL1-4, STOKAWAL, RAK, dan multi-satuan bertingkat.
            </p>
          </div>

          {/* TEMPLATE DOWNLOAD BUTTONS */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={downloadOfficialExcelTemplate}
              className="px-3.5 py-2 bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
              title="Unduh berkas Excel .xlsx dengan 49 kolom dan 5 contoh produk sembako ritel"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Unduh Template Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => downloadOfficialCsvTemplate(';')}
              className="px-3 py-2 bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-600/60 font-medium text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Unduh berkas CSV template 49 kolom"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV (.csv)</span>
            </button>
            <button
              type="button"
              onClick={copyHeaderCheatSheet}
              className="px-3 py-2 bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-600/60 font-medium text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Salin 49 nama kolom ke clipboard untuk ditempel di baris 1 spreadsheet"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Tersalin!' : 'Salin Header'}</span>
            </button>
          </div>
        </div>

        {/* 49 COLUMNS CHEAT SHEET BADGES */}
        <div className="mt-4 pt-3.5 border-t border-emerald-700/60">
          <div className="text-[11px] font-semibold text-emerald-200/90 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <TableProperties className="w-3.5 h-3.5 text-emerald-300" />
              <span>Struktur 49 Kolom yang Didukung Otomatis:</span>
            </span>
            <span className="text-[10px] text-emerald-300/80">
              Format kompatibel Inspirasibiz iPos 4 / 5, Accurate, & Excel Kasir
            </span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
            {EXCEL_IMPORT_COLUMNS.map((col, idx) => (
              <span
                key={col}
                className="px-1.5 py-0.5 bg-emerald-950/40 text-emerald-200/90 border border-emerald-600/30 rounded text-[9.5px] font-mono tracking-tight"
                title={`Kolom #${idx + 1}: ${col}`}
              >
                {col}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* INPUT METHOD SWITCHER TABS */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveInputMode('upload')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeInputMode === 'upload'
                ? 'bg-white text-emerald-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-emerald-600" />
            <span>Unggah Berkas (.xlsx / .xls / .csv)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveInputMode('paste')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeInputMode === 'paste'
                ? 'bg-white text-emerald-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Tempel Teks Sel (Copy-Paste Spreadsheet)</span>
          </button>
        </div>

        {(parseResult || selectedFile || pastedText) && (
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-stone-500 hover:text-stone-800 text-xs font-medium flex items-center gap-1.5 hover:bg-stone-100 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Input</span>
          </button>
        )}
      </div>

      {/* INPUT AREA 1: FILE DRAG & DROP */}
      {activeInputMode === 'upload' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
              : 'border-stone-300 hover:border-emerald-400 bg-stone-50/60 hover:bg-emerald-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="max-w-md mx-auto space-y-2.5">
            <div className="w-14 h-14 mx-auto bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-2xs">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-stone-900">
                Pilih atau Tarik Berkas Excel (.xlsx, .xls, atau .csv) ke sini
              </p>
              <p className="text-xs text-stone-500 mt-1">
                Sistem otomatis membaca lembar kerja (Sheet) dan memetakan 49 kolom ke katalog produk.
              </p>
            </div>

            {selectedFile && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold border border-emerald-300">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INPUT AREA 2: COPY-PASTE TEXTAREA */}
      {activeInputMode === 'paste' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-stone-600">
            <label className="font-bold text-stone-800 flex items-center gap-1.5">
              <span>Tempel Sel Data dari Excel / Google Sheets di Sini:</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSampleText}
                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                title="Isi textarea dengan 5 baris contoh data sembako lengkap"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Isi Contoh Data 49 Kolom</span>
              </button>
            </div>
          </div>

          <textarea
            rows={7}
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            placeholder={`Salin (Ctrl+C) data dari Excel Anda lalu tempel di sini.\nFormat standar: KODEITEM\tNAMAITEM\tJENIS\tMEREK\tSATUAN1\tSATUAN2...\nAtau format pipa sederhana: Nama Barang | Harga | Stok | Kategori | Brand`}
            className="w-full p-3 font-mono text-xs border border-stone-300 rounded-2xl bg-white focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition leading-relaxed"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-stone-500">
              {pastedText ? `${pastedText.split('\n').filter(l => l.trim().length > 0).length} baris terdeteksi` : 'Siap memproses data sel'}
            </span>
            <button
              type="button"
              onClick={handleParsePastedText}
              disabled={!pastedText.trim() || isParsing}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <TableProperties className="w-4 h-4" />
              <span>{isParsing ? 'Memproses Data...' : 'Pratinjau Data Tabel'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {parseError && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="font-medium">{parseError}</span>
        </div>
      )}

      {/* SUCCESS IMPORT REPORT TOAST */}
      {importReport && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Import Data Berhasil Dieksekusi pada {importReport.timestamp}!</span>
            </div>
            {onOpenProductCatalog && (
              <button
                type="button"
                onClick={onOpenProductCatalog}
                className="px-3 py-1 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 flex items-center gap-1 cursor-pointer transition"
              >
                <span>Lihat Katalog Produk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
              <div className="text-stone-500 text-[10px]">Produk Baru Masuk:</div>
              <div className="font-extrabold text-sm text-emerald-700">+{importReport.added} Produk</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
              <div className="text-stone-500 text-[10px]">Produk Diperbarui:</div>
              <div className="font-extrabold text-sm text-blue-700">{importReport.updated} Produk</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
              <div className="text-stone-500 text-[10px]">Kategori Baru Dibuat:</div>
              <div className="font-extrabold text-sm text-amber-700">+{importReport.categoriesCreated} Kategori</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
              <div className="text-stone-500 text-[10px]">Merek Baru Didaftarkan:</div>
              <div className="font-extrabold text-sm text-purple-700">+{importReport.brandsCreated} Brand</div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW & EXECUTION SECTION */}
      {parseResult && allRows.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-3xl p-5 space-y-4 shadow-sm animate-in fade-in">
          {/* STATS & SUMMARY */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
            <div>
              <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>Pratinjau Data ({allRows.length} Produk Siap Diimport)</span>
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Periksa daftar produk di bawah sebelum mengeksekusi penyimpanan ke katalog minimarket.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
                {parseResult.validRows.length} Siap Diimport
              </span>
              {parseResult.validRows.filter(r => r.hasMultiUnit).length > 0 && (
                <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>{parseResult.validRows.filter(r => r.hasMultiUnit).length} Multi-Satuan</span>
                </span>
              )}
              {parseResult.newCategoriesDetected.length > 0 && (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold">
                  {parseResult.newCategoriesDetected.length} Kategori Baru
                </span>
              )}
            </div>
          </div>

          {/* IMPORT OPTIONS */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
            <div className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan & Perilaku Import:</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Opsi 1: Duplikat */}
              <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-1.5">
                <div className="font-bold text-stone-800">Jika Kode / Barcode Sudah Ada:</div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dup_strategy"
                      checked={duplicateStrategy === 'update'}
                      onChange={() => setDuplicateStrategy('update')}
                      className="text-emerald-600"
                    />
                    <span>Perbarui harga & stok lama</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dup_strategy"
                      checked={duplicateStrategy === 'skip'}
                      onChange={() => setDuplicateStrategy('skip')}
                      className="text-emerald-600"
                    />
                    <span>Lewati (Jangan ubah yang ada)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dup_strategy"
                      checked={duplicateStrategy === 'add_new'}
                      onChange={() => setDuplicateStrategy('add_new')}
                      className="text-emerald-600"
                    />
                    <span>Selalu buat produk baru</span>
                  </label>
                </div>
              </div>

              {/* Opsi 2: Kategori otomatis */}
              <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-1.5">
                <div className="font-bold text-stone-800">Pendaftaran Kategori:</div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoAddCategories}
                    onChange={e => setAutoAddCategories(e.target.checked)}
                    className="mt-0.5 text-emerald-600 rounded"
                  />
                  <span className="text-stone-600">
                    Otomatis tambahkan kategori baru dari kolom <strong>JENIS</strong> ke menu kategori toko.
                  </span>
                </label>
              </div>

              {/* Opsi 3: Brand otomatis */}
              <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-1.5">
                <div className="font-bold text-stone-800">Pendaftaran Merek:</div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoAddBrands}
                    onChange={e => setAutoAddBrands(e.target.checked)}
                    className="mt-0.5 text-emerald-600 rounded"
                  />
                  <span className="text-stone-600">
                    Otomatis daftarkan merek baru dari kolom <strong>MEREK</strong> ke daftar brand toko.
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* SEARCH & FILTERS IN PREVIEW */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={previewSearch}
                onChange={e => setPreviewSearch(e.target.value)}
                placeholder="Cari item dalam pratinjau..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-300 rounded-xl bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterMode === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Semua ({allRows.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('multi_unit')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterMode === 'multi_unit' ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Multi-Satuan ({allRows.filter(r => r.hasMultiUnit).length})
              </button>
              {allRows.filter(r => r.isExistingMatch).length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode('existing')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filterMode === 'existing' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Cocok Item Lama ({allRows.filter(r => r.isExistingMatch).length})
                </button>
              )}
            </div>
          </div>

          {/* TABLE PREVIEW */}
          <div className="border border-stone-200 rounded-2xl overflow-hidden overflow-x-auto max-h-96 shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-stone-100/90 text-stone-700 sticky top-0 border-b border-stone-200 z-10 font-bold">
                <tr>
                  <th className="p-2.5 text-center w-10">No</th>
                  <th className="p-2.5">Kode & Barcode</th>
                  <th className="p-2.5">Nama Item</th>
                  <th className="p-2.5">Jenis & Merek</th>
                  <th className="p-2.5">Satuan 1 (Dasar)</th>
                  <th className="p-2.5 text-right">HPP (Modal)</th>
                  <th className="p-2.5 text-right">Harga Jual</th>
                  <th className="p-2.5">Multi-Satuan (Kemasan)</th>
                  <th className="p-2.5 text-center">Stok Awal</th>
                  <th className="p-2.5">Lokasi Rak</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPreviewRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-stone-500">
                      Tidak ada produk yang cocok dengan pencarian / filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredPreviewRows.map((row, idx) => {
                    const p = row.product;
                    const margin = (p.price || 0) - (p.costPrice || 0);

                    return (
                      <tr key={idx} className="hover:bg-emerald-50/40 transition">
                        <td className="p-2.5 text-center font-mono text-stone-400">{row.rowIndex}</td>
                        <td className="p-2.5">
                          <div className="font-mono text-[11px] font-bold text-stone-800">{p.itemCode || '-'}</div>
                          <div className="font-mono text-[10px] text-stone-500">{p.barcode || '-'}</div>
                        </td>
                        <td className="p-2.5 font-bold text-stone-900 max-w-[220px]">
                          <div className="truncate" title={p.name}>{p.name}</div>
                          {row.warnings.length > 0 && (
                            <div className="text-[10px] text-amber-600 font-normal mt-0.5">
                              ⚠️ {row.warnings.join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 bg-stone-100 rounded text-[10px] font-medium text-stone-700 inline-block mr-1">
                            {row.raw.JENIS || p.category}
                          </span>
                          <span className="text-[11px] text-stone-600">{p.brand}</span>
                        </td>
                        <td className="p-2.5 font-semibold text-stone-800">
                          {p.unit || 'Pcs'}
                        </td>
                        <td className="p-2.5 text-right font-mono text-stone-600">
                          {formatRupiah(p.costPrice || 0)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-800">
                          {formatRupiah(p.price || 0)}
                          {margin > 0 && (
                            <div className="text-[9.5px] text-emerald-600 font-normal">
                              +{formatRupiah(margin)}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5">
                          {p.unitConversions && p.unitConversions.length > 0 ? (
                            <div className="space-y-0.5">
                              {p.unitConversions.map((uc, uIdx) => (
                                <div key={uIdx} className="text-[10px] bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded font-mono">
                                  <strong>{uc.unitName}</strong> (x{uc.totalMultiplier})
                                  {uc.price ? ` @${formatRupiah(uc.price)}` : ''}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-stone-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-bold font-mono text-stone-800">
                          {p.stock}
                        </td>
                        <td className="p-2.5 text-stone-600 text-[11px]">
                          {p.shelf || '-'}
                        </td>
                        <td className="p-2.5 text-center">
                          {row.isExistingMatch ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[10px] font-bold">
                              Update
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-full text-[10px] font-bold">
                              Baru
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ACTION BUTTON */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-stone-500">
              Menampilkan {filteredPreviewRows.length} dari total {allRows.length} produk siap import.
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={handleExecuteImport}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <UploadCloud className="w-5 h-5" />
                <span>Eksekusi & Masukkan {allRows.length} Produk ke Katalog Toko</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
