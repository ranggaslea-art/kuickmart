import React, { useState, useMemo, useEffect } from 'react';
import { 
  Receipt, 
  Printer, 
  Check, 
  X, 
  RotateCcw, 
  Sliders, 
  Copy, 
  Download, 
  Sparkles, 
  Building2, 
  FileText, 
  Tag, 
  ShieldCheck, 
  CreditCard,
  AlignLeft,
  Columns3,
  HelpCircle,
  Eye,
  CheckCircle2,
  Type,
  Zap,
  Cpu,
  Layers,
  Info
} from 'lucide-react';
import { ReceiptInfo, Store, Order } from '../types';
import { cleanReceiptText, formatReceiptAddress } from '../utils/sanitizeReceipt';
import { 
  generateRawPosReceiptText, 
  generateDotMatrixReceiptHtml, 
  generateEscPosBinaryBuffer,
  printDirectRawToSerialPort,
  isWebSerialSupported,
  getOrRequestSerialPort,
  printPosReceiptViaIframe,
  downloadPosReceiptTxtFile,
  copyPosReceiptText,
  getReceiptFontFamilyCss,
  getReceiptFontWeightCss,
  getReceiptFontSizeCss,
  resolveReceiptColumns
} from '../utils/posPrinterHelper';
import { OsPrinterSearchModal } from './OsPrinterSearchModal';
import { DiscoveredOsPrinter } from '../types/osPrinter';
import { getSavedSelectedPrinter } from '../utils/osPrinterDiscovery';

interface PosReceiptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConfig?: ReceiptInfo;
  stores?: Store[];
  onSaveConfig: (updatedConfig: ReceiptInfo) => void;
  sampleOrder?: Order | null;
  cashierName?: string;
}

// Contoh order dummy untuk pratinjau langsung struk minimarket
const DEFAULT_SAMPLE_ORDER: Order = {
  id: 'sample-ord-01',
  orderNumber: 'TRX-POS-2609-089',
  customerId: 'usr_guest',
  customerName: 'Bpk. Hendra Pratama',
  customerPhone: '0812-3456-7890',
  items: [
    {
      product: {
        id: 'p1',
        name: 'Minyak Goreng Sania 2L Pouch',
        category: 'sembako',
        brand: 'Sania',
        unit: 'Pcs',
        soldCount: 150,
        barcode: '899123456701',
        price: 34500,
        stock: 50,
        description: 'Minyak goreng kelapa sawit premium',
        image: '',
        rating: 4.9,
        isPopular: true
      },
      quantity: 2,
      selectedUnit: 'Pcs',
      unitPrice: 34500
    },
    {
      product: {
        id: 'p2',
        name: 'Indomie Goreng Spesial 85g',
        category: 'makanan',
        brand: 'Indofood',
        unit: 'Bks',
        soldCount: 500,
        barcode: '899123456702',
        price: 3500,
        stock: 200,
        description: 'Mie instan goreng',
        image: '',
        rating: 5.0,
        isPopular: true
      },
      quantity: 5,
      selectedUnit: 'Bks',
      unitPrice: 3500
    },
    {
      product: {
        id: 'p3',
        name: 'Gula Pasir Gulaku Kuning 1Kg',
        category: 'sembako',
        brand: 'Gulaku',
        unit: 'Kg',
        soldCount: 80,
        barcode: '899123456703',
        price: 18000,
        stock: 35,
        description: 'Gula tebu murni',
        image: '',
        rating: 4.8,
        isPopular: true
      },
      quantity: 1,
      selectedUnit: 'Kg',
      unitPrice: 18000
    }
  ],
  subtotal: 104500,
  deliveryFee: 0,
  discountAmount: 4500,
  total: 100000,
  deliveryType: 'pickup',
  paymentMethod: 'cash',
  paymentStatus: 'paid',
  status: 'completed',
  createdAt: new Date().toISOString(),
  pickupStoreName: 'toko-online.online - Pusat',
  pointsUsed: 0,
  pointsEarned: 1000,
  store: {
    id: 'str-01',
    name: 'toko-online.online - Pusat',
    code: 'KM-01',
    address: 'Jl. Jendral Sudirman No. 18',
    city: 'Jakarta',
    phone: '021-5551234',
    distanceKm: 1.2,
    is24Hours: false,
    isOpen: true,
    openHours: '07:00 - 22:00',
    readyForPickup: true,
    readyForDelivery: true,
    deliveryFee: 5000,
    minOrder: 10000
  },
  trackingSteps: []
};

export const PosReceiptEditorModal: React.FC<PosReceiptEditorModalProps> = ({
  isOpen,
  onClose,
  activeConfig,
  stores = [],
  onSaveConfig,
  sampleOrder,
  cashierName = 'KASIR 01'
}) => {
  // Config state
  const [config, setConfig] = useState<ReceiptInfo>(() => {
    if (activeConfig) {
      return {
        ...activeConfig,
        printerType: activeConfig.printerType || 'dot_matrix_tmu220',
        paperWidth: activeConfig.paperWidth || '70mm_dotmatrix',
        charactersPerLine: activeConfig.charactersPerLine || 40,
        dividerChar: activeConfig.dividerChar || '=',
        itemRowStyle: activeConfig.itemRowStyle || 'two_rows',
        feedLinesBeforeCut: activeConfig.feedLinesBeforeCut || 5,
      };
    }
    return {
      id: 'rcp_tmu220',
      profileName: 'Struk Dot Matrix Epson TM-U220 (70mm)',
      headerBrand: 'NUSA MART EXPRESS',
      subHeader: 'MINIMARKET & KASIR POINT OF SALE',
      storeName: 'toko-online.online - Kasir Pusat',
      address: 'Jl. Jendral Sudirman No. 18, Menteng',
      phone: '021-5551234',
      taxIdOrNpwp: 'NPWP: 01.345.678.9-012.000',
      websiteOrSocial: 'www.nusamart.id • WA: 0812-3456-7890',
      cashierName: 'KASIR 01',
      footerMessage1: 'TERIMA KASIH TELAH BERBELANJA',
      footerMessage2: 'BARANG YANG SUDAH DIBELI DAPAT DITUKAR MAKS 1X24 JAM DENGAN STRUK ASLI.',
      csHotline: 'CALL CENTER: 1500-888',
      showBarcode: true,
      showStoreLogo: true,
      paperWidth: '70mm_dotmatrix',
      printerType: 'dot_matrix_tmu220',
      charactersPerLine: 40,
      dividerChar: '=',
      itemRowStyle: 'two_rows',
      feedLinesBeforeCut: 5,
      showItemCode: true,
      showItemUnit: true,
      showItemDiscount: true,
      showTaxSummary: false,
      taxRatePercent: 11,
      showPaymentDetail: true,
      showCustomerName: true,
      showCashierName: true,
      showMemberPoints: true,
      showSignatures: true,
      headerCustomNote: 'STRUK PENJUALAN RESMI POS',
      isDefault: true,
    };
  });

  const [activeTab, setActiveTab] = useState<'tmu220' | 'typography' | 'header' | 'items' | 'meta' | 'footer'>('typography');
  const [previewMode, setPreviewMode] = useState<'dotmatrix_visual' | 'raw_ascii'>('dotmatrix_visual');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isOsPrinterModalOpen, setIsOsPrinterModalOpen] = useState(false);
  const [activeOsPrinter, setActiveOsPrinter] = useState<DiscoveredOsPrinter | null>(() => getSavedSelectedPrinter());

  // Sync state if activeConfig prop changes
  React.useEffect(() => {
    if (activeConfig) {
      setConfig({
        ...activeConfig,
        printerType: activeConfig.printerType || 'dot_matrix_tmu220',
        paperWidth: activeConfig.paperWidth || '70mm_dotmatrix',
        charactersPerLine: activeConfig.charactersPerLine || 40,
        dividerChar: activeConfig.dividerChar || '=',
        itemRowStyle: activeConfig.itemRowStyle || 'two_rows',
        feedLinesBeforeCut: activeConfig.feedLinesBeforeCut || 5,
        fontFamily: activeConfig.fontFamily || 'courier',
        fontBoldness: activeConfig.fontBoldness || 'bold',
        fontSize: activeConfig.fontSize || 'normal',
        lineSpacing: activeConfig.lineSpacing || 'normal',
        showSignatures: activeConfig.showSignatures !== undefined ? activeConfig.showSignatures : true,
      });
    }
  }, [activeConfig]);

  const effectiveOrder = sampleOrder || DEFAULT_SAMPLE_ORDER;

  // Real-time generated RAW ASCII string
  const rawTextOutput = useMemo(() => {
    return generateRawPosReceiptText(effectiveOrder, config, cashierName, {
      cashReceived: 100000,
      changeAmount: 0,
    });
  }, [effectiveOrder, config, cashierName]);

  // Load official Epson TM-U220 70mm preset
  const handleLoadTmu220Preset = () => {
    setConfig(prev => ({
      ...prev,
      printerType: 'dot_matrix_tmu220',
      paperWidth: '70mm_dotmatrix',
      charactersPerLine: 40,
      dividerChar: '=',
      itemRowStyle: 'two_rows',
      feedLinesBeforeCut: 5,
      fontFamily: 'courier',
      fontBoldness: 'bold',
      fontSize: 'normal',
      lineSpacing: 'normal',
      showItemUnit: true,
      showPaymentDetail: true,
      showCashierName: true,
      showCustomerName: true,
      showMemberPoints: true,
      showBarcode: true,
      headerBrand: prev.headerBrand || 'NUSA MART EXPRESS',
      subHeader: prev.subHeader || 'MINIMARKET & KASIR POINT OF SALE',
      footerMessage1: 'TERIMA KASIH TELAH BERBELANJA',
      footerMessage2: 'BARANG YANG SUDAH DIBELI DAPAT DITUKAR MAKS 1X24 JAM DENGAN STRUK ASLI.',
    }));
    setFeedback('Preset optimal Epson TM-U220 (70mm / 40 Kolom / Bold) berhasil dimuat!');
    setTimeout(() => setFeedback(null), 3000);
  };

  // Quick autofill from selected store
  const handleAutofillStore = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    if (store) {
      setConfig(prev => ({
        ...prev,
        storeName: store.name,
        address: store.address,
        phone: store.phone,
      }));
      setFeedback(`Identitas cabang "${store.name}" berhasil diterapkan!`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // State serial printing
  const [isSerialPrinting, setIsSerialPrinting] = useState(false);

  // Test Print via Direct Web Serial (Mode iPos 4 - Super Cepat & Tajam)
  const handleTestSerialPrint = async () => {
    setIsSerialPrinting(true);
    try {
      let printedViaSerial = false;
      if (isWebSerialSupported()) {
        try {
          const bytes = generateEscPosBinaryBuffer(effectiveOrder, config, cashierName, {
            cashReceived: 100000,
            changeAmount: 0,
          });
          const res = await printDirectRawToSerialPort(bytes, config.serialBaudRate || 9600);
          if (res.success) {
            printedViaSerial = true;
            setFeedback('⚡ Berhasil! Perintah ESC/POS mentah berhasil dikirim ke printer Epson TM-U220 (Mode iPos 4).');
            setTimeout(() => setFeedback(null), 5000);
            return;
          }
        } catch (serialErr: any) {
          console.warn('Web Serial port error, falling back to direct crisp ESC/POS print:', serialErr);
        }
      }

      // Fallback: Jika Web Serial tidak didukung atau port hardware tidak terhubung, otomatis cetak via print engine iPos 4
      if (!printedViaSerial) {
        const html = generateDotMatrixReceiptHtml(effectiveOrder, config, cashierName, {
          cashReceived: 100000,
          changeAmount: 0,
        });
        await printPosReceiptViaIframe(html);
        setFeedback('⚡ Uji Cetak ESC/POS (Mode iPos 4) berhasil dijalankan! Dialog cetak dibuka dengan format monokrom 40-kolom dot matrix murni.');
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (err: any) {
      console.error('Gagal uji cetak ESC/POS:', err);
      try {
        const html = generateDotMatrixReceiptHtml(effectiveOrder, config, cashierName, {
          cashReceived: 100000,
          changeAmount: 0,
        });
        await printPosReceiptViaIframe(html);
        setFeedback('⚡ Format cetak ESC/POS iPos 4 dibuka ke spooler.');
        setTimeout(() => setFeedback(null), 4000);
      } catch (fallbackErr: any) {
        setFeedback(`Gagal cetak: ${err.message || 'Error'}`);
        setTimeout(() => setFeedback(null), 4000);
      }
    } finally {
      setIsSerialPrinting(false);
    }
  };

  // Connect or Request Serial Port
  const handleConnectSerialPort = async () => {
    try {
      const port = await getOrRequestSerialPort();
      if (port) {
        setFeedback('🔌 Port Serial Epson TM-U220 berhasil terhubung dan siap digunakan!');
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (err: any) {
      setFeedback(`Gagal menghubungkan serial port: ${err.message || 'Dibatalkan'}`);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Test Print via Windows Driver / Browser Spooler
  const handleTestPrint = async () => {
    setIsPrinting(true);
    try {
      const html = generateDotMatrixReceiptHtml(effectiveOrder, config, cashierName, {
        cashReceived: 100000,
        changeAmount: 0,
      });
      await printPosReceiptViaIframe(html);
      setFeedback('🖨️ Dialog cetak Windows dibuka dengan mode Monokrom Anti-Blur.');
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setIsPrinting(false);
    }
  };

  // Copy raw text
  const handleCopyRaw = async () => {
    const ok = await copyPosReceiptText(rawTextOutput);
    if (ok) {
      setFeedback('Teks struk RAW 40 kolom berhasil disalin ke clipboard!');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Download raw txt file
  const handleDownloadTxt = () => {
    downloadPosReceiptTxtFile(rawTextOutput, effectiveOrder.orderNumber);
    setFeedback('File teks struk (.txt) berhasil diunduh untuk printer dot matrix!');
    setTimeout(() => setFeedback(null), 3000);
  };

  // Save changes
  const handleSave = () => {
    const updated: ReceiptInfo = {
      ...config,
      updatedAt: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    onSaveConfig(updated);
    setFeedback('Pengaturan struk POS berhasil disimpan!');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  // Keyboard Escape handler untuk menutup modal editor struk
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isOsPrinterModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isOsPrinterModalOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fadeIn select-none"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[95vh] my-auto"
      >
        
        {/* TOP BAR: MODAL HEADER */}
        <div className="px-5 py-4 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-stone-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Editor Hasil Print Struk POS (Epson TM-U220 70mm)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Dot Matrix 70mm
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Atur tata letak, teks header, kolom karakter, footer, dan format cetak pita monokromatik
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOsPrinterModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Pindai printer terpasang di sistem operasi media ini"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-200" />
              <span>Cari Printer OS</span>
            </button>
            <button
              onClick={handleLoadTmu220Preset}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-400/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              title="Reset ke pengaturan standar pabrik Epson TM-U220"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Preset TM-U220</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEEDBACK TOAST BANNER */}
        {feedback && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-slideDown">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* MAIN BODY: 2 COLUMNS (CONTROLS LEFT, PREVIEW RIGHT) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-stone-50/50">
          
          {/* ============================================================ */}
          {/* LEFT SIDE: CONFIGURATION TABS & FORMS (7 COLS) */}
          {/* ============================================================ */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* Navigasi Tab Pengaturan */}
            <div className="flex items-center gap-1.5 p-1 bg-stone-200/70 rounded-2xl overflow-x-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('tmu220')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'tmu220'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>Format TM-U220 (70mm)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('typography')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'typography'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Type className="w-3.5 h-3.5 text-purple-600" />
                <span className="font-extrabold text-purple-900">Jenis Huruf & Ketajaman</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('header')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'header'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Header & Toko</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'items'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>Item & Kolom</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('meta')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'meta'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                <span>Transaksi & Kasir</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('footer')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'footer'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>Footer & Kebijakan</span>
              </button>
            </div>

            {/* TAB 1: KHUSUS PRINTER DOT MATRIX EPSON TM-U220 */}
            {activeTab === 'tmu220' && (
              <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-xs space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div>
                    <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                      <span>Karakteristik Kertas & Printer Epson TM-U220</span>
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Printer dot matrix pita impak dengan lebar roll kertas 76mm (lebar cetak aktif ~70mm)
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-black rounded-xl text-[10px] border border-amber-200">
                    TM-U220 / 70mm
                  </span>
                </div>

                {/* PENJELASAN TEKNIS: MENGAPA IPOS 4 SANGAT JELAS & CEPAT */}
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 text-xs text-stone-800 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-black">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-stone-900 text-xs sm:text-sm">
                        Mengapa hasil cetak program iPos 4 terlihat lebih jelas dan cepat dieksekusi oleh Epson TM-U220?
                      </h5>
                      <p className="text-stone-600 mt-1 leading-relaxed text-[11.5px]">
                        <strong>1. Kecepatan Kilat (~1.5 Detik):</strong> Program desktop seperti <em>iPos 4</em> mengirim teks mentah (ESC/POS) langsung ke chip ROM printer TM-U220. Kepala jarum mencetak bolak-balik (bi-directional) 4.7 baris/detik tanpa proses rendering grafis sama sekali.<br />
                        <strong>2. Huruf Pekat 100% Tanpa Blur:</strong> Menggunakan <em>Font A 9×9 dot-pin bawaan printer</em>. Setiap jarum memukul pita dengan gaya maksimal. Tidak ada efek anti-aliasing (abu-abu halus) dari browser yang membuat jarum printer bergerak lambat dan menghasilkan huruf berbayang/samar.<br />
                        <strong>3. Rekomendasi:</strong> Pilih <strong>Mode iPos 4 (Direct ESC/POS Web Serial)</strong> di bawah ini untuk hasil yang 100% sama dengan program kasir desktop!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Mode Cetak Utama Kasir */}
                  <div className="sm:col-span-2 p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                    <label className="block font-black text-stone-800 text-xs mb-2">
                      Mode Eksekusi Cetak Utama Kasir:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, printExecutionMode: 'escpos_serial' })}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          (config.printExecutionMode || 'escpos_serial') === 'escpos_serial'
                            ? 'bg-amber-400/15 border-amber-500 text-stone-900 shadow-2xs ring-2 ring-amber-400/40'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-black text-xs text-amber-900">
                          <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
                          <span>Mode iPos 4: Direct ESC/POS Serial</span>
                          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold uppercase">
                            Super Cepat
                          </span>
                        </div>
                        <p className="text-[10.5px] text-stone-600 mt-1 leading-snug">
                          Kirim byte mentah langsung ke port COM/USB printer via Web Serial API. Eksekusi kilat ~1.5 detik & ketajaman jarum 100% murni tanpa distorsi.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, printExecutionMode: 'browser_crisp' })}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          config.printExecutionMode === 'browser_crisp'
                            ? 'bg-amber-400/15 border-amber-500 text-stone-900 shadow-2xs ring-2 ring-amber-400/40'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-black text-xs text-stone-900">
                          <Printer className="w-4 h-4 text-stone-600" />
                          <span>Mode Driver Windows (Anti-Blur)</span>
                        </div>
                        <p className="text-[10.5px] text-stone-600 mt-1 leading-snug">
                          Mencetak melalui dialog peramban / Spooler Windows APD dengan CSS zero-antialiasing monokrom hitam pekat agar tidak blur.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Format Tata Letak Struk */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Gaya Format Tata Letak Struk:
                    </label>
                    <select
                      value={config.receiptLayoutFormat || 'ipos4'}
                      onChange={e => setConfig({ ...config, receiptLayoutFormat: e.target.value as any })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 font-bold text-stone-900 focus:bg-white"
                    >
                      <option value="ipos4">Format iPos 4 (40 Kolom Klasik - Sangat Jelas)</option>
                      <option value="standard">Format Standar Tabular</option>
                    </select>
                    <span className="text-[10px] text-stone-500 mt-1 block">
                      *Format iPos 4 menyusun nama barang dan rincian harga berindentasi rapi sesuai software kasir retail
                    </span>
                  </div>

                  {/* Serial Baud Rate */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Baud Rate Port Serial TM-U220:
                    </label>
                    <div className="flex gap-2">
                      {[9600, 19200, 38400].map(rate => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setConfig({ ...config, serialBaudRate: rate as any })}
                          className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                            (config.serialBaudRate || 9600) === rate
                              ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {rate} {rate === 9600 ? '(Default)' : ''}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-stone-500 mt-1 block">
                      *DIP switch pabrik Epson TM-U220 umumnya disetel pada 9600 bps
                    </span>
                  </div>
                  {/* Pilihan Jenis Printer */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Tipe Printer Kasir:
                    </label>
                    <select
                      value={config.printerType || 'dot_matrix_tmu220'}
                      onChange={e => setConfig({ ...config, printerType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 font-bold text-stone-900 focus:bg-white"
                    >
                      <option value="dot_matrix_tmu220">Epson TM-U220 (Dot Matrix Pita 70mm)</option>
                      <option value="thermal">Printer Thermal Standar (58mm / 80mm)</option>
                    </select>
                  </div>

                  {/* Lebar Kertas */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Ukuran Roll Kertas:
                    </label>
                    <select
                      value={config.paperWidth || '70mm_dotmatrix'}
                      onChange={e => {
                        const newWidth = e.target.value as any;
                        setConfig(prev => ({
                          ...prev,
                          paperWidth: newWidth,
                          charactersPerLine: newWidth === '58mm' ? 32 : prev.charactersPerLine || 40
                        }));
                      }}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 font-bold text-stone-900 focus:bg-white"
                    >
                      <option value="70mm_dotmatrix">70mm / 76mm Roll (Epson TM-U220)</option>
                      <option value="58mm">58mm (Thermal Kecil)</option>
                      <option value="80mm">80mm (Thermal Desktop)</option>
                    </select>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      <span>Batas Aman Kiri & Kanan Aktif (100% Anti-Cutoff)</span>
                    </div>
                  </div>

                  {/* Jumlah Karakter Kolom per Baris */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Jumlah Kolom Karakter:
                    </label>
                    <div className="flex gap-2">
                      {(config.paperWidth === '58mm' ? [32, 30] : [40, 33, 42]).map(cols => (
                        <button
                          key={cols}
                          type="button"
                          onClick={() => setConfig({ ...config, charactersPerLine: cols as any })}
                          className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                            (config.charactersPerLine || (config.paperWidth === '58mm' ? 32 : 40)) === cols
                              ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {cols} Kolom {cols === 40 ? '(Font A)' : cols === 33 ? '(Font B)' : cols === 32 ? '(58mm)' : ''}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-stone-400 mt-1 block">
                      {config.paperWidth === '58mm' 
                        ? '*32 Kolom adalah standar aman untuk printer thermal 58mm agar teks tidak terpotong tepi.'
                        : '*40 Kolom (Font A 9×9) adalah standar pabrik paling presisi untuk Epson TM-U220.'}
                    </span>
                  </div>

                  {/* Karakter Garis Pemisah (Divider) */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Karakter Garis Pemisah (ASCII):
                    </label>
                    <div className="flex gap-2">
                      {[
                        { char: '=', label: 'Garis Ganda (===)' },
                        { char: '-', label: 'Garis Putus (---)' },
                        { char: '*', label: 'Bintang (***)' }
                      ].map(d => (
                        <button
                          key={d.char}
                          type="button"
                          onClick={() => setConfig({ ...config, dividerChar: d.char as any })}
                          className={`flex-1 py-2 rounded-xl text-xs font-mono font-black border transition-all ${
                            (config.dividerChar || '=') === d.char
                              ? 'bg-amber-400 text-stone-950 border-amber-500 shadow-xs'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feed Lines Before Cut */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-stone-700">
                        Jarak Gulung Kertas Sebelum Potong / Sobek (Feed Lines):
                      </label>
                      <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        {config.feedLinesBeforeCut || 5} Baris
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={8}
                      step={1}
                      value={config.feedLinesBeforeCut || 5}
                      onChange={e => setConfig({ ...config, feedLinesBeforeCut: Number(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      Memberi ruang kosong agar teks terbawah struk tidak terpotong oleh gerigi pisau manual / auto-cutter printer TM-U220.
                    </p>
                  </div>
                </div>

                {/* Status Printer Sistem Operasi */}
                <div className="p-3.5 bg-stone-900 text-white rounded-2xl border border-stone-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="font-bold text-xs text-white">Target Hardware OS:</span>
                      <span className="text-xs text-emerald-300 font-mono font-bold">
                        {activeOsPrinter ? activeOsPrinter.name : 'Epson TM-U220 (Spooler OS / COM)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Port: {activeOsPrinter?.port || 'Sistem Spooler'} • Tipe: {activeOsPrinter?.interfaceType || 'os_spooler'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOsPrinterModalOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    Pindai / Ubah Printer OS
                  </button>
                </div>
              </div>
            )}

            {/* TAB TYPOGRAPHY: JENIS HURUF, KETEBALAN & KETAJAMAN CETAK */}
            {activeTab === 'typography' && (
              <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-xs space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div>
                    <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                      <Type className="w-4 h-4 text-purple-600" />
                      <span>Desain & Jenis Huruf Struk (Typography POS)</span>
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Ganti jenis font, ketebalan, dan ukuran huruf agar hasil print di printer dot matrix & thermal terbaca maksimal dan tajam
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-purple-100 text-purple-900 font-black rounded-xl text-[10px] border border-purple-200">
                    Maksimal Cetak
                  </span>
                </div>

                {/* 1. PILIHAN JENIS HURUF (FONT FAMILY) */}
                <div className="space-y-2">
                  <label className="block font-bold text-xs text-stone-800">
                    Pilih Jenis Huruf (Font Family):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        id: 'courier',
                        name: 'Courier New (Standar Kasir)',
                        desc: 'Font monospaced bawaan minimarket, proporsional dan presisi pada pita impak.',
                        previewText: '12345 ABCDE INDOMIE',
                        fontCss: "'Courier New', Courier, monospace",
                        badge: 'Standar Pabrik'
                      },
                      {
                        id: 'roboto_mono',
                        name: 'Roboto Mono (Modern & Tajam)',
                        desc: 'Huruf monospace modern berjarak tegas, sangat jelas dan mudah dibaca pelanggan.',
                        previewText: '12345 ABCDE INDOMIE',
                        fontCss: "'Roboto Mono', monospace",
                        badge: 'Rekomendasi'
                      },
                      {
                        id: 'consolas',
                        name: 'Consolas (Tegas & Rapi)',
                        desc: 'Huruf geometris yang padat, membuat struk terlihat profesional dan tidak blur.',
                        previewText: '12345 ABCDE INDOMIE',
                        fontCss: "Consolas, monospace",
                        badge: 'Sangat Tajam'
                      },
                      {
                        id: 'dot_matrix',
                        name: 'Lucida Console (Klasik POS)',
                        desc: 'Font monokrom klasik sistem kasir jadul/vintage, huruf bulat jelas.',
                        previewText: '12345 ABCDE INDOMIE',
                        fontCss: "'Lucida Console', monospace",
                        badge: 'Klasik'
                      },
                      {
                        id: 'space_mono',
                        name: 'Space Mono (Bold Retro)',
                        desc: 'Karakter retro dengan sudut tajam, angka harga terlihat sangat mencolok.',
                        previewText: '12345 ABCDE INDOMIE',
                        fontCss: "'Space Mono', monospace",
                        badge: 'Retro POS'
                      },
                      {
                        id: 'inconsolata',
                        name: 'Inconsolata (Elegan & Ramping)',
                        desc: 'Karakter langsing dengan kurva halus, memuat banyak teks tanpa berhimpitan.',
                        previewText: '12345 ABCDE INDOMIE',
                        fontCss: "Inconsolata, monospace",
                        badge: 'Ramping'
                      }
                    ].map(f => {
                      const isSelected = (config.fontFamily || 'courier') === f.id;
                      return (
                        <div
                          key={f.id}
                          onClick={() => setConfig({ ...config, fontFamily: f.id as any })}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-200 shadow-xs'
                              : 'border-stone-200 bg-stone-50 hover:bg-stone-100/80 text-stone-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-extrabold text-xs text-stone-900">{f.name}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              isSelected ? 'bg-purple-600 text-white' : 'bg-stone-200 text-stone-700'
                            }`}>
                              {f.badge}
                            </span>
                          </div>
                          <div
                            style={{ fontFamily: f.fontCss }}
                            className="bg-white p-2 rounded-xl border border-stone-200 text-stone-900 text-xs font-bold tracking-wider my-1.5"
                          >
                            {f.previewText} • Rp 35.000
                          </div>
                          <p className="text-[10px] text-stone-500 leading-tight">
                            {f.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. KETEBALAN TINTA / HURUF (FONT BOLDNESS & KEPEKATAN) */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-xs text-stone-800">
                      Tingkat Kepekatan & Ketajaman Huruf (Anti-Kabur):
                    </label>
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      ✓ Monokrom 100% Hitam Murni (Vector Crisp)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'normal', label: 'Standar (600)', desc: 'Pita baru / pekat' },
                      { id: 'semibold', label: 'Tebal (700)', desc: 'Sedang & rapi' },
                      { id: 'bold', label: 'Sangat Pekat (800)', desc: 'Anti-Kabur / Tajam', recommend: true },
                      { id: 'extra_bold', label: 'Super Gelap (900)', desc: 'Maksimal terbaca / Pita tipis' }
                    ].map(b => {
                      const isSelected = (config.fontBoldness || 'bold') === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setConfig({ ...config, fontBoldness: b.id as any })}
                          className={`p-2.5 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'border-purple-600 bg-purple-600 text-white shadow-xs'
                              : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                          }`}
                        >
                          <div className="font-extrabold text-xs flex items-center justify-between">
                            <span>{b.label}</span>
                            {b.recommend && (
                              <span className={`text-[8px] font-black px-1 rounded ${
                                isSelected ? 'bg-amber-300 text-stone-950' : 'bg-purple-100 text-purple-900'
                              }`}>
                                BEST
                              </span>
                            )}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-purple-100' : 'text-stone-400'}`}>
                            {b.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                    <span className="text-base">💡</span>
                    <div>
                      <strong className="font-bold">Tips Hasil Print Tajam & Jelas:</strong>
                      <p className="text-[10px] text-amber-800 mt-0.5">
                        Pilih jenis huruf <strong>Courier New</strong> atau <strong>Consolas</strong> dengan opsi <strong>Sangat Pekat (800)</strong>. Browser kini mengirim instruksi vektor langsung ke printer tanpa filter rasterisasi sehingga bebas kabur dan buram.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. UKURAN HURUF & KERAPATAN BARIS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100 text-xs">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1.5">
                      Ukuran Huruf Keseluruhan:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'compact', label: 'Kompak (10.5px)', desc: 'Hemat kertas' },
                        { id: 'normal', label: 'Standar (11.5px)', desc: 'Paling pas' },
                        { id: 'large', label: 'Besar (12.5px)', desc: 'Jelas untuk lansia' }
                      ].map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setConfig({ ...config, fontSize: s.id as any })}
                          className={`p-2 rounded-xl text-center border font-bold transition-all ${
                            (config.fontSize || 'normal') === s.id
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <div>{s.label}</div>
                          <div className={`text-[9px] mt-0.5 ${(config.fontSize || 'normal') === s.id ? 'text-purple-200' : 'text-stone-400'}`}>
                            {s.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1.5">
                      Kerapatan Jarak Antar Baris:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'compact', label: 'Sangat Rapat (1.05)', desc: 'Hemat kertas' },
                        { id: 'normal', label: 'Standar Kasir (1.12)', desc: 'Ideal & rapi' },
                        { id: 'relaxed', label: 'Sedang (1.20)', desc: 'Nyaman dibaca' }
                      ].map(sp => (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => setConfig({ ...config, lineSpacing: sp.id as any })}
                          className={`p-2 rounded-xl text-center border font-bold transition-all ${
                            (config.lineSpacing || 'normal') === sp.id
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <div>{sp.label}</div>
                          <div className={`text-[9px] mt-0.5 ${(config.lineSpacing || 'normal') === sp.id ? 'text-purple-200' : 'text-stone-400'}`}>
                            {sp.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* TIPS KETAJAMAN PRINT DOT MATRIX */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Tips Hasil Print Paling Maksimal pada Epson TM-U220:</strong>
                    <p className="text-amber-800 mt-0.5 leading-relaxed">
                      Gunakan font <strong>Roboto Mono</strong> atau <strong>Courier New</strong> dengan ketebalan <strong>Tebal (700)</strong>. Format ini memberikan benturan pin head dot matrix yang tajam pada kertas roll 1-ply maupun kertas rangkap NCR (2-ply/3-ply) tanpa membuat pita beleber.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'header' && (
              <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-xs space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div>
                    <h4 className="font-extrabold text-sm text-stone-900">
                      Identitas Header Struk Toko
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Nama brand, cabang, alamat, telepon, dan nomor perizinan
                    </p>
                  </div>

                  {stores.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-stone-400 text-[11px]">Salin info dari:</span>
                      <select
                        onChange={e => {
                          if (e.target.value) handleAutofillStore(e.target.value);
                        }}
                        defaultValue=""
                        className="px-2 py-1 rounded-lg border border-stone-200 text-[11px] font-semibold bg-stone-50"
                      >
                        <option value="" disabled>Pilih Cabang...</option>
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Nama Brand Utama (Huruf Besar):
                    </label>
                    <input
                      type="text"
                      value={config.headerBrand}
                      onChange={e => setConfig({ ...config, headerBrand: e.target.value.toUpperCase() })}
                      placeholder="NUSA MART EXPRESS"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl font-black uppercase text-stone-900 bg-stone-50/50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Slogan / Sub-Header:
                    </label>
                    <input
                      type="text"
                      value={config.subHeader || ''}
                      onChange={e => setConfig({ ...config, subHeader: e.target.value })}
                      placeholder="MINIMARKET & KASIR POINT OF SALE"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl font-semibold text-stone-900 bg-stone-50/50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Nama Cabang / Toko:
                    </label>
                    <input
                      type="text"
                      value={config.storeName}
                      onChange={e => setConfig({ ...config, storeName: e.target.value })}
                      placeholder="toko-online.online - Kasir Pusat"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl font-bold text-stone-900 bg-stone-50/50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Nomor Telepon / WhatsApp:
                    </label>
                    <input
                      type="text"
                      value={config.phone}
                      onChange={e => setConfig({ ...config, phone: e.target.value })}
                      placeholder="021-5551234 atau 0812-3456-7890"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 bg-stone-50/50 focus:bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-stone-700 mb-1">
                      Alamat Lengkap Toko:
                    </label>
                    <textarea
                      rows={2}
                      value={config.address}
                      onChange={e => setConfig({ ...config, address: e.target.value })}
                      placeholder="Jl. Jendral Sudirman No. 18, Menteng"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 bg-stone-50/50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Nomor NPWP / NIB / Pajak (Opsional):
                    </label>
                    <input
                      type="text"
                      value={config.taxIdOrNpwp || ''}
                      onChange={e => setConfig({ ...config, taxIdOrNpwp: e.target.value })}
                      placeholder="NPWP: 01.345.678.9-012.000"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono text-stone-900 bg-stone-50/50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Teks Keterangan Header Khusus:
                    </label>
                    <input
                      type="text"
                      value={config.headerCustomNote || ''}
                      onChange={e => setConfig({ ...config, headerCustomNote: e.target.value })}
                      placeholder="STRUK PENJUALAN RESMI POS"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl font-semibold text-stone-900 bg-stone-50/50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FORMAT ITEM & KOLOM BELANJA */}
            {activeTab === 'items' && (
              <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-xs space-y-4 animate-fadeIn">
                <div className="pb-3 border-b border-stone-100">
                  <h4 className="font-extrabold text-sm text-stone-900">
                    Format Tabel Daftar Produk Belanja
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Atur susunan baris item belanja agar mudah dibaca pada kertas 70mm dot matrix
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Style format baris */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-2">
                      Gaya Susunan Baris Item Produk:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setConfig({ ...config, itemRowStyle: 'two_rows' })}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          (config.itemRowStyle || 'two_rows') === 'two_rows'
                            ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-100 font-bold text-stone-900'
                            : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-black text-amber-900">Format 2 Baris (Rekomendasi Minimarket)</span>
                          {(config.itemRowStyle || 'two_rows') === 'two_rows' && <Check className="w-4 h-4 text-amber-600" />}
                        </div>
                        <div className="font-mono text-[10px] text-stone-600 bg-white p-2 rounded-lg border border-stone-200 space-y-0.5">
                          <div>01. INDOMIE GOR KRNCHY 85G</div>
                          <div className="flex justify-between text-stone-500">
                            <span>&nbsp;&nbsp;&nbsp;2 Pcs × 3.500</span>
                            <span className="font-bold text-stone-900">7.000</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-stone-400 mt-1.5">
                          Nama produk panjang tidak terpotong kerdil, sangat rapi di printer pita 70mm.
                        </p>
                      </div>

                      <div
                        onClick={() => setConfig({ ...config, itemRowStyle: 'single_row' })}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          config.itemRowStyle === 'single_row'
                            ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-100 font-bold text-stone-900'
                            : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-black text-stone-900">Format 1 Baris Ringkas</span>
                          {config.itemRowStyle === 'single_row' && <Check className="w-4 h-4 text-amber-600" />}
                        </div>
                        <div className="font-mono text-[10px] text-stone-600 bg-white p-2 rounded-lg border border-stone-200">
                          <div className="flex justify-between">
                            <span>2x INDOMIE GOR...</span>
                            <span className="font-bold text-stone-900">7.000</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-stone-400 mt-1.5">
                          Menghemat panjang kertas, tetapi nama produk akan disingkat bila melebihi kolom.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Checkbox Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <label className="flex items-center gap-2 p-3 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 cursor-pointer font-bold text-stone-800">
                      <input
                        type="checkbox"
                        checked={config.showItemUnit !== false}
                        onChange={e => setConfig({ ...config, showItemUnit: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-600 border-stone-300"
                      />
                      <span>Tampilkan Satuan Barang (Pcs, Dus, Kg)</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 cursor-pointer font-bold text-stone-800">
                      <input
                        type="checkbox"
                        checked={Boolean(config.showTaxSummary)}
                        onChange={e => setConfig({ ...config, showTaxSummary: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-600 border-stone-300"
                      />
                      <span>Tampilkan Baris PPN ({config.taxRatePercent || 11}%)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: TRANSAKSI & DETAIL KASIR */}
            {activeTab === 'meta' && (
              <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-xs space-y-4 animate-fadeIn">
                <div className="pb-3 border-b border-stone-100">
                  <h4 className="font-extrabold text-sm text-stone-900">
                    Informasi Transaksi, Kasir, & Pembayaran
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Pengaturan tampilan nama kasir, data pelanggan, kembalian tunai, dan poin
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 p-3 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={config.showCashierName !== false}
                      onChange={e => setConfig({ ...config, showCashierName: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 border-stone-300"
                    />
                    <span>Tampilkan Nama Kasir</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={config.showCustomerName !== false}
                      onChange={e => setConfig({ ...config, showCustomerName: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 border-stone-300"
                    />
                    <span>Tampilkan Nama Pelanggan</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={config.showPaymentDetail !== false}
                      onChange={e => setConfig({ ...config, showPaymentDetail: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 border-stone-300"
                    />
                    <span>Tampilkan Tunai Diterima & Kembalian</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={config.showMemberPoints !== false}
                      onChange={e => setConfig({ ...config, showMemberPoints: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 border-stone-300"
                    />
                    <span>Tampilkan Poin Loyalitas Member</span>
                  </label>
                </div>
              </div>
            )}

            {/* TAB 5: FOOTER, UCAPAN, & KEBIJAKAN RETUR */}
            {activeTab === 'footer' && (
              <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-xs space-y-4 animate-fadeIn">
                <div className="pb-3 border-b border-stone-100">
                  <h4 className="font-extrabold text-sm text-stone-900">
                    Pesan Kaki Struk (Footer) & Kebijakan
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Ucapan terima kasih, nomor kontak customer care, dan syarat penukaran barang
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Pesan Kaki 1 (Ucapan Terima Kasih):
                    </label>
                    <input
                      type="text"
                      value={config.footerMessage1}
                      onChange={e => setConfig({ ...config, footerMessage1: e.target.value })}
                      placeholder="TERIMA KASIH TELAH BERBELANJA"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl font-bold text-stone-900 bg-stone-50/50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Pesan Kaki 2 (Ketentuan Retur / Penukaran Barang):
                    </label>
                    <textarea
                      rows={2}
                      value={config.footerMessage2 || ''}
                      onChange={e => setConfig({ ...config, footerMessage2: e.target.value })}
                      placeholder="BARANG YANG SUDAH DIBELI DAPAT DITUKAR MAKS 1X24 JAM DENGAN STRUK ASLI."
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 bg-stone-50/50 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Call Center / CS Hotline:
                      </label>
                      <input
                        type="text"
                        value={config.csHotline || ''}
                        onChange={e => setConfig({ ...config, csHotline: e.target.value })}
                        placeholder="CALL CENTER: 1500-888"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 bg-stone-50/50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Website / Instagram / WA:
                      </label>
                      <input
                        type="text"
                        value={config.websiteOrSocial || ''}
                        onChange={e => setConfig({ ...config, websiteOrSocial: e.target.value })}
                        placeholder="www.nusamart.id • WA: 0812-3456-7890"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 bg-stone-50/50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    <label className="flex items-start gap-2.5 p-3 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 cursor-pointer font-bold text-stone-800">
                      <input
                        type="checkbox"
                        checked={config.showSignatures !== false}
                        onChange={e => setConfig({ ...config, showSignatures: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-600 border-stone-300 mt-0.5"
                      />
                      <div>
                        <div>Cetak Kolom Tanda Tangan Kasir & Pelanggan</div>
                        <div className="text-[11px] text-stone-500 font-normal mt-0.5">
                          Menggunakan tata letak horizontal flexbox (justify-between) agar tanda tangan kasir dan pelanggan tersebar rapi di kiri & kanan dan tidak menumpuk di satu sisi.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-3 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 cursor-pointer font-bold text-stone-800">
                      <input
                        type="checkbox"
                        checked={config.showBarcode !== false}
                        onChange={e => setConfig({ ...config, showBarcode: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-600 border-stone-300"
                      />
                      <span>Cetak Barcode Transaksi di Bagian Bawah Struk</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ACTION BAR: BUTTONS */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Uji Cetak Direct ESC/POS (Mode iPos 4) */}
                <button
                  type="button"
                  onClick={handleTestSerialPrint}
                  disabled={isSerialPrinting}
                  className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs flex items-center gap-2 transition-all shadow-xs disabled:opacity-50 active:scale-95 cursor-pointer"
                  title="Kirim cetak teks mentah ESC/POS langsung ke port Serial/USB printer Epson TM-U220 (Super Cepat & 100% Tajam)"
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>{isSerialPrinting ? 'Mengirim Serial...' : '⚡ Uji Cetak ESC/POS (Mode iPos 4)'}</span>
                </button>

                {/* 2. Uji Cetak Driver Windows (Zero Antialiasing) */}
                <button
                  type="button"
                  onClick={handleTestPrint}
                  disabled={isPrinting}
                  className="px-3 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  title="Kirim uji cetak via dialog printer Windows Spooler dengan format Monokrom Anti-Blur"
                >
                  <Printer className="w-4 h-4 text-stone-300" />
                  <span>{isPrinting ? 'Membuka...' : '🖨️ Uji Cetak Windows'}</span>
                </button>

                {/* 3. Salin RAW */}
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Salin teks ASCII 40 kolom iPos 4 ke clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salin RAW</span>
                </button>

                {/* 4. Unduh .TXT */}
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Unduh file .txt untuk batch print atau serial spooler"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Unduh .TXT</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-black text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Desain Struk</span>
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT SIDE: INTERACTIVE LIVE PREVIEW (5 COLS) */}
          {/* ============================================================ */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            
            {/* Header Preview Bar */}
            <div className="bg-stone-900 text-white p-3 rounded-2xl flex items-center justify-between text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-extrabold">Live Preview 70mm Dot Matrix</span>
              </div>

              <div className="flex items-center gap-1 bg-stone-800 p-0.5 rounded-xl border border-stone-700 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPreviewMode('dotmatrix_visual')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    previewMode === 'dotmatrix_visual'
                      ? 'bg-amber-400 text-stone-950 shadow-xs'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Visual Pita
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('raw_ascii')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    previewMode === 'raw_ascii'
                      ? 'bg-amber-400 text-stone-950 shadow-xs'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  ASCII Grid
                </button>
              </div>
            </div>

            {/* Column Ruler (Penggaris Kolom Monospace) */}
            <div className="bg-stone-800 text-amber-300 font-mono text-[9px] px-3 py-1.5 rounded-xl tracking-wider text-center border border-stone-700 overflow-x-auto select-none">
              <div className="text-stone-400 text-[8px] mb-0.5">LEBAR {resolveReceiptColumns(config)} KOLOM KARAKTER • BATAS AMAN KIRI & KANAN AKTIF</div>
              <div>|....5...10...15...20...25...30...35...40|</div>
            </div>

            {/* RECEIPT PAPER CONTAINER (SIMULASI KERTAS STRUK ROLL) */}
            <div className="flex-1 bg-stone-200/80 rounded-3xl p-3 sm:p-5 flex justify-center items-start overflow-y-auto border border-stone-300 shadow-inner max-h-[620px]">
              
              {previewMode === 'dotmatrix_visual' ? (
                /* MODE VISUAL MONOCHROME DOT MATRIX DENGAN SAFE MARGINS */
                <div 
                  style={{
                    fontFamily: getReceiptFontFamilyCss(config.fontFamily),
                    fontWeight: getReceiptFontWeightCss(config.fontBoldness),
                    fontSize: getReceiptFontSizeCss(config.fontSize, config.paperWidth).base,
                    lineHeight: config.lineSpacing === 'compact' ? '1.05' : config.lineSpacing === 'relaxed' ? '1.20' : '1.12'
                  }}
                  className={`${config.paperWidth === '58mm' ? 'w-[230px]' : config.paperWidth === '80mm' ? 'w-[310px]' : 'w-[275px]'} bg-white text-black px-4 py-3 rounded-xs shadow-md border-x border-stone-300 relative leading-tight select-text transition-all`}
                >
                  
                  {/* Efek gerigi sobekan kertas atas */}
                  <div className="absolute -top-1.5 left-0 right-0 h-2 bg-[radial-gradient(circle,_transparent_3px,_white_3.5px)] bg-[length:8px_8px]" />

                  {/* Header */}
                  <div className="text-center space-y-0.5 pb-2">
                    <div 
                      style={{ fontSize: getReceiptFontSizeCss(config.fontSize, config.paperWidth).brand }}
                      className="font-black tracking-wider uppercase break-words"
                    >
                      {config.headerBrand || config.storeName || ''}
                    </div>
                    {config.subHeader && (
                      <div className="text-[9.5px] text-stone-700 italic">
                        {config.subHeader}
                      </div>
                    )}
                    {config.storeName && (!config.headerBrand || config.storeName.toUpperCase() !== config.headerBrand.toUpperCase()) && (
                      <div className="text-[11px] font-bold">
                        {config.storeName}
                      </div>
                    )}
                    {formatReceiptAddress(config) && (
                      <div className="text-[10px] text-stone-700 leading-tight">
                        {formatReceiptAddress(config)}
                      </div>
                    )}
                    {config.phone && (
                      <div className="text-[10px]">TELP: {config.phone}</div>
                    )}
                    {config.taxIdOrNpwp && (
                      <div className="text-[9.5px] text-stone-700">{config.taxIdOrNpwp}</div>
                    )}
                    {config.headerCustomNote && (
                      <div className="text-[9.5px] font-bold mt-1 uppercase">
                        {config.headerCustomNote}
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-b-2 border-stone-900 my-1.5" />

                  {/* Metadata */}
                  <div className="text-[10.5px] space-y-0.5">
                    <div className="flex justify-between">
                      <span>NO : {effectiveOrder.orderNumber}</span>
                      <span>{new Date(effectiveOrder.createdAt).toLocaleDateString('id-ID')}</span>
                    </div>
                    {config.showCashierName !== false && (
                      <div className="flex justify-between">
                        <span>KASIR: {cashierName}</span>
                        <span>{new Date(effectiveOrder.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    {config.showCustomerName !== false && effectiveOrder.customerName && (
                      <div className="flex justify-between">
                        <span>PLG : {effectiveOrder.customerName.slice(0, 18)}</span>
                      </div>
                    )}
                  </div>

                  {/* Thin Divider */}
                  <div className="border-b border-dashed border-stone-900 my-1.5" />

                  {/* Items */}
                  <div className="space-y-1.5 text-[11px]">
                    {effectiveOrder.items.map((it, idx) => {
                      const num = String(idx + 1).padStart(2, '0');
                      const pName = it.product.name.toUpperCase();
                      const qty = it.quantity;
                      const unit = (it.selectedUnit || 'Pcs').toUpperCase();
                      const price = it.unitPrice || it.product.price;
                      const subtotal = price * qty;

                      if (config.itemRowStyle === 'single_row') {
                        return (
                          <div key={idx} className="flex justify-between">
                            <span className="truncate pr-1">{qty}x {pName.slice(0, 18)}</span>
                            <span className="font-bold">{subtotal.toLocaleString('id-ID')}</span>
                          </div>
                        );
                      }

                      return (
                        <div key={idx}>
                          <div className="font-bold truncate">{num}. {pName}</div>
                          <div className="flex justify-between text-[10.5px]">
                            <span>
                              &nbsp;&nbsp;&nbsp;{qty} {config.showItemUnit !== false ? unit : ''} x {price.toLocaleString('id-ID')}
                            </span>
                            <span className="font-bold">{subtotal.toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Thin Divider */}
                  <div className="border-b border-dashed border-stone-900 my-1.5" />

                  {/* Totals */}
                  <div className="space-y-0.5 text-[11px]">
                    <div className="flex justify-between">
                      <span>TOTAL ITEM</span>
                      <span>{effectiveOrder.items.length} ITEM / {effectiveOrder.items.reduce((a, b) => a + b.quantity, 0)} QTY</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SUBTOTAL</span>
                      <span>Rp {effectiveOrder.subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    {effectiveOrder.discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span>DISKON</span>
                        <span>-Rp {effectiveOrder.discountAmount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {config.showTaxSummary && (
                      <div className="flex justify-between">
                        <span>PPN ({config.taxRatePercent || 11}%)</span>
                        <span>Rp {Math.round(effectiveOrder.subtotal * ((config.taxRatePercent || 11) / 100)).toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>

                  {/* Double Divider */}
                  <div className="border-b-2 border-stone-900 my-1.5" />

                  {/* TOTAL AKHIR */}
                  <div className="flex justify-between font-black text-xs py-0.5">
                    <span>TOTAL BAYAR</span>
                    <span>Rp {effectiveOrder.total.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="text-[10.5px] space-y-0.5 pt-0.5">
                    <div className="flex justify-between">
                      <span>CARA BAYAR</span>
                      <span>{(effectiveOrder.paymentMethod || 'TUNAI').toUpperCase()}</span>
                    </div>
                    {config.showPaymentDetail !== false && (
                      <>
                        <div className="flex justify-between">
                          <span>TUNAI DITERIMA</span>
                          <span>Rp 100.000</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>KEMBALIAN</span>
                          <span>Rp 0</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Loyalty Points */}
                  {config.showMemberPoints !== false && effectiveOrder.pointsEarned > 0 && (
                    <div className="text-center text-[10px] font-bold py-1 border-y border-dashed border-stone-400 my-1.5">
                      ★ POIN DIPEROLEH: +{effectiveOrder.pointsEarned} POIN ★
                    </div>
                  )}

                  {/* Komponen Penandatanganan Struk (Flexbox layout justify-between / grid horizontal agar tanda tangan kasir dan pelanggan tersebar rapi di kiri & kanan dan tidak menumpuk) */}
                  {config.showSignatures !== false && (
                    <div className="pt-2.5 pb-1 my-1.5 border-t border-dashed border-stone-400">
                      <div className="flex justify-between items-end text-center text-[10px] leading-tight select-none">
                        {/* Kolom Tanda Tangan Kasir (Kiri) */}
                        <div className="w-[45%] flex flex-col items-center">
                          <span className="font-semibold text-stone-700">Kasir,</span>
                          <div className="h-8"></div>
                          <span className="font-bold border-t border-stone-800 pt-0.5 w-full block truncate">
                            ( {cashierName} )
                          </span>
                        </div>

                        {/* Kolom Tanda Tangan Pelanggan (Kanan) */}
                        <div className="w-[45%] flex flex-col items-center">
                          <span className="font-semibold text-stone-700">Pelanggan,</span>
                          <div className="h-8"></div>
                          <span className="font-bold border-t border-stone-800 pt-0.5 w-full block truncate">
                            ( {effectiveOrder.customerName || 'Pelanggan'} )
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-b-2 border-stone-900 my-1.5" />

                  {/* Footer Messages */}
                  <div className="text-center text-[9.5px] space-y-1 pt-1 leading-tight text-stone-800">
                    {config.footerMessage1 && <div>{config.footerMessage1}</div>}
                    {config.footerMessage2 && <div>{config.footerMessage2}</div>}
                    {config.csHotline && <div>{config.csHotline}</div>}
                    {config.websiteOrSocial && <div>{config.websiteOrSocial}</div>}
                  </div>

                  {/* Barcode Area */}
                  {config.showBarcode !== false && (
                    <div className="text-center pt-2">
                      <div className="text-[10px] tracking-widest font-black">
                        ||||| | |||| ||| || ||||| | ||||
                      </div>
                      <div className="text-[9px] mt-0.5">*{effectiveOrder.orderNumber}*</div>
                    </div>
                  )}

                  {/* Feed Lines Simulation */}
                  <div className="pt-8 text-center text-[9px] text-stone-400 border-b-2 border-dashed border-stone-300 pb-1 mt-2 select-none">
                    --- [ PISAU PEMOTONG / TEAR BAR ] ---
                  </div>

                  {/* Efek sobekan kertas bawah */}
                  <div className="absolute -bottom-1.5 left-0 right-0 h-2 bg-[radial-gradient(circle,_transparent_3px,_white_3.5px)] bg-[length:8px_8px]" />
                </div>
              ) : (
                /* MODE RAW ASCII MONOSPACE GRID */
                <pre className="bg-stone-950 text-emerald-400 p-4 rounded-xl font-mono text-[10.5px] leading-tight overflow-x-auto shadow-md border border-stone-800 w-full max-w-[340px]">
                  {rawTextOutput}
                </pre>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* MODAL PENCARIAN PRINTER SISTEM OPERASI */}
      <OsPrinterSearchModal
        isOpen={isOsPrinterModalOpen}
        onClose={() => setIsOsPrinterModalOpen(false)}
        onSelectPrinter={(printer) => {
          setActiveOsPrinter(printer);
          setFeedback(`Printer aktif berhasil diatur ke "${printer.name}" (${printer.interfaceType.toUpperCase()})`);
          setTimeout(() => setFeedback(null), 4000);
        }}
        currentSelectedPrinter={activeOsPrinter}
      />
    </div>
  );
};
