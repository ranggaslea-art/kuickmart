import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Copy, 
  Check, 
  X, 
  Package, 
  Boxes, 
  Coins, 
  TrendingUp, 
  Info, 
  FileText,
  SlidersHorizontal,
  Layers,
  Sparkles
} from 'lucide-react';
import { Product, Category } from '../types';
import { formatRupiah, formatNumber } from '../utils/formatters';
import { 
  generateProductCsv, 
  generateProductExcelHtml, 
  generateBulkImportTextFormat, 
  downloadTextFile, 
  calculateInventoryValuation,
  CsvDelimiter
} from '../utils/productExportHelper';

interface ProductExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allProducts: Product[];
  filteredProducts: Product[];
  categories: Category[];
  storeName?: string;
}

export const ProductExportModal: React.FC<ProductExportModalProps> = ({
  isOpen,
  onClose,
  allProducts = [],
  filteredProducts = [],
  categories = [],
  storeName = 'NusaMart Express',
}) => {
  const [dataScope, setDataScope] = useState<'all' | 'filtered'>('all');
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'bulk_txt'>('excel');
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(';');
  const [isCopied, setIsCopied] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Filtered vs all products selection
  const targetProducts = useMemo(() => {
    if (dataScope === 'filtered' && filteredProducts.length > 0) {
      return filteredProducts;
    }
    return allProducts;
  }, [dataScope, filteredProducts, allProducts]);

  // Inventory valuation summary of target products
  const valuation = useMemo(() => {
    return calculateInventoryValuation(targetProducts);
  }, [targetProducts]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const cleanStoreSlug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    if (exportFormat === 'excel') {
      const htmlContent = generateProductExcelHtml(targetProducts, categories, {
        storeName,
      });
      const fileName = `Katalog_Produk_${cleanStoreSlug}_${timestamp}.xls`;
      downloadTextFile(htmlContent, fileName, 'application/vnd.ms-excel;charset=utf-8');
      setFeedbackMessage(`Berhasil mengunduh ${targetProducts.length} produk dalam format Excel (.xls)!`);
    } else if (exportFormat === 'csv') {
      const csvContent = generateProductCsv(targetProducts, categories, {
        delimiter,
        storeName,
      });
      const fileName = `Katalog_Produk_${cleanStoreSlug}_${timestamp}.csv`;
      downloadTextFile(csvContent, fileName, 'text/csv;charset=utf-8;');
      setFeedbackMessage(`Berhasil mengunduh ${targetProducts.length} produk dalam format CSV (pemisah "${delimiter}")!`);
    } else {
      // Bulk text import format
      const bulkText = generateBulkImportTextFormat(targetProducts);
      const fileName = `Template_Import_${cleanStoreSlug}_${timestamp}.txt`;
      downloadTextFile(bulkText, fileName, 'text/plain;charset=utf-8;');
      setFeedbackMessage(`Berhasil mengunduh data format teks import (${targetProducts.length} baris)!`);
    }

    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  const handleCopyClipboard = async () => {
    try {
      let content = '';
      if (exportFormat === 'bulk_txt') {
        content = generateBulkImportTextFormat(targetProducts);
      } else {
        // Tab-separated values (TSV) for direct paste into Excel / Google Sheets
        content = generateProductCsv(targetProducts, categories, { delimiter: '\t' as any });
      }

      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setFeedbackMessage('Data berhasil disalin ke clipboard! Silakan paste (Ctrl+V) langsung ke Excel atau Google Sheets.');
      setTimeout(() => {
        setIsCopied(false);
        setFeedbackMessage(null);
      }, 3500);
    } catch (e) {
      console.error(e);
      setFeedbackMessage('Gagal menyalin ke clipboard. Gunakan tombol unduh file.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in select-none">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-center justify-between border-b border-emerald-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  Ekspor Katalog Produk & Stok
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-400 text-stone-950">
                  Excel & CSV
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Unduh data inventori produk untuk pembukuan offline, audit stok fisik, atau backup data
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* NOTIFICATION FEEDBACK */}
        {feedbackMessage && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-slideDown">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* MODAL CONTENT BODY */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-stone-800">

          {/* VALUATION METRICS SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="flex items-center gap-1.5 text-stone-500 text-[10.5px] font-bold">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                <span>Jenis Produk</span>
              </div>
              <div className="text-base font-black text-stone-900 mt-1">
                {formatNumber(valuation.totalItems)} <span className="text-[10px] font-medium text-stone-500">Item</span>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="flex items-center gap-1.5 text-stone-500 text-[10.5px] font-bold">
                <Boxes className="w-3.5 h-3.5 text-amber-600" />
                <span>Fisik Stok</span>
              </div>
              <div className="text-base font-black text-stone-900 mt-1">
                {formatNumber(valuation.totalPhysicalStock)} <span className="text-[10px] font-medium text-stone-500">Unit</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200">
              <div className="flex items-center gap-1.5 text-emerald-800 text-[10.5px] font-bold">
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span>Valuasi Aset HPP</span>
              </div>
              <div className="text-xs sm:text-sm font-black text-emerald-900 mt-1 truncate" title={formatRupiah(valuation.totalAssetHppValue)}>
                {formatRupiah(valuation.totalAssetHppValue)}
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200">
              <div className="flex items-center gap-1.5 text-blue-800 text-[10.5px] font-bold">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Potensi Penjualan</span>
              </div>
              <div className="text-xs sm:text-sm font-black text-blue-900 mt-1 truncate" title={formatRupiah(valuation.totalRetailSalesValue)}>
                {formatRupiah(valuation.totalRetailSalesValue)}
              </div>
            </div>
          </div>

          {/* 1. DATA SCOPE SELECTION */}
          <div className="space-y-2">
            <label className="block font-black text-stone-900 text-xs flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-stone-600" />
              <span>1. Cakupan Produk yang Diekspor:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDataScope('all')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  dataScope === 'all'
                    ? 'bg-emerald-50/60 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400/30'
                    : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div className="font-extrabold text-xs flex items-center justify-between">
                  <span>Semua Produk Katalog</span>
                  <span className="px-2 py-0.5 bg-stone-100 text-stone-800 rounded-full font-bold text-[10px]">
                    {allProducts.length} Produk
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                  Ekspor seluruh basis data produk yang terdaftar di toko ini tanpa kecuali.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDataScope('filtered')}
                disabled={filteredProducts.length === 0 || filteredProducts.length === allProducts.length}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  dataScope === 'filtered'
                    ? 'bg-emerald-50/60 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400/30'
                    : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div className="font-extrabold text-xs flex items-center justify-between">
                  <span>Hasil Filter / Pencarian</span>
                  <span className="px-2 py-0.5 bg-stone-100 text-stone-800 rounded-full font-bold text-[10px]">
                    {filteredProducts.length} Produk
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                  Hanya ekspor produk yang saat ini cocok dengan kata kunci pencarian atau filter kategori.
                </p>
              </button>
            </div>
          </div>

          {/* 2. FORMAT SELECTION */}
          <div className="space-y-2">
            <label className="block font-black text-stone-900 text-xs flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-stone-600" />
              <span>2. Pilih Format Berkas:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option A: Excel */}
              <button
                type="button"
                onClick={() => setExportFormat('excel')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  exportFormat === 'excel'
                    ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400/30'
                    : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-extrabold text-xs text-emerald-900">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Excel (.xls)</span>
                    <span className="ml-auto text-[9px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded-full">
                      Paling Rapi
                    </span>
                  </div>
                  <p className="text-[10.5px] text-stone-500 mt-1 leading-snug">
                    Format spreadsheet Excel dengan tabel warna, format rupiah, dan baris total valuasi stok.
                  </p>
                </div>
              </button>

              {/* Option B: CSV */}
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  exportFormat === 'csv'
                    ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400/30'
                    : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-extrabold text-xs text-stone-900">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>CSV (.csv)</span>
                  </div>
                  <p className="text-[10.5px] text-stone-500 mt-1 leading-snug">
                    Format tabel data universal UTF-8 BOM yang dapat diimpor ke Google Sheets, Excel, atau database.
                  </p>
                </div>
              </button>

              {/* Option C: Bulk Import Text */}
              <button
                type="button"
                onClick={() => setExportFormat('bulk_txt')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  exportFormat === 'bulk_txt'
                    ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400/30'
                    : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-extrabold text-xs text-stone-900">
                    <Copy className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Template Import (.txt)</span>
                  </div>
                  <p className="text-[10.5px] text-stone-500 mt-1 leading-snug">
                    Format baris <code>Nama | Harga | Stok</code> untuk kemudahan edit dan di-import kembali.
                  </p>
                </div>
              </button>
            </div>

            {/* Delimiter selection if CSV is chosen */}
            {exportFormat === 'csv' && (
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-2 mt-2 animate-fade-in">
                <span className="font-bold text-[11px] text-stone-700">
                  Karakter Pemisah Kolom (Delimiter CSV):
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs">
                    <input
                      type="radio"
                      name="csv_delimiter"
                      checked={delimiter === ';'}
                      onChange={() => setDelimiter(';')}
                      className="text-emerald-600"
                    />
                    <span>Titik Koma (;) <em className="font-normal text-[10px] text-stone-500">(Excel Indonesia)</em></span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs ml-2">
                    <input
                      type="radio"
                      name="csv_delimiter"
                      checked={delimiter === ','}
                      onChange={() => setDelimiter(',')}
                      className="text-emerald-600"
                    />
                    <span>Koma (,) <em className="font-normal text-[10px] text-stone-500">(Google Sheets / US)</em></span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* INFORMATION BANNER FOR STORE OWNERS */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 text-emerald-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Tips Manajemen Inventori Offline:</strong> File ekspor mencakup <em>Barcode, Nama Barang, Kategori, Merk, Satuan Dasar, HPP Modal, Harga Jual, Margin %, Stok Gudang, Multi-Satuan Kemasan (Dus/Pak),</em> dan total valuasi nilai aset. File dapat langsung dibuka di <strong>Microsoft Excel</strong> untuk audit fisik (Stock Opname) atau cetak laporan stok.
            </div>
          </div>
        </div>

        {/* MODAL FOOTER ACTION BUTTONS */}
        <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-stone-500 text-[11px]">
            Target Ekspor: <strong className="text-stone-800">{targetProducts.length} Produk</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyClipboard}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="Salin teks tabel ke clipboard untuk di-paste langsung ke Excel / Google Sheets"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-600" />}
              <span>{isCopied ? 'Tersalin!' : 'Salin ke Clipboard'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                Unduh Berkas {exportFormat === 'excel' ? 'Excel (.xls)' : exportFormat === 'csv' ? 'CSV (.csv)' : 'Teks (.txt)'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
