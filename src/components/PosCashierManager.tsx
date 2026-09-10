import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Product, 
  Store, 
  Order, 
  MemberProfile, 
  CartItem,
  PaymentMethod,
  ReceiptInfo
} from '../types';
import { formatRupiah } from '../utils/formatters';
import { getProductUnitOptions } from '../utils/unitConversion';
import { cleanReceiptText } from '../utils/sanitizeReceipt';
import { 
  generateRawPosReceiptText, 
  generateDotMatrixReceiptHtml, 
  printPosReceiptViaIframe,
  downloadPosReceiptTxtFile,
  copyPosReceiptText
} from '../utils/posPrinterHelper';
import { PosReceiptEditorModal } from './PosReceiptEditorModal';
import { OfflineSyncBadge } from './OfflineSyncBadge';
import { 
  ScanBarcode, 
  Camera, 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Printer, 
  RotateCcw, 
  PauseCircle, 
  PlayCircle, 
  Coins, 
  CreditCard, 
  QrCode, 
  Banknote, 
  User, 
  Award, 
  X, 
  Store as StoreIcon, 
  ChevronDown, 
  Sparkles, 
  ShoppingBag, 
  CornerDownRight, 
  Maximize, 
  Minimize, 
  Info,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  Package,
  Sliders,
  Copy,
  Download,
  FileText
} from 'lucide-react';

export interface PosRowItem {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  unit: string;
  quantity: number;
  sellingPrice: number;
  discountAmount: number;
  subtotal: number;
  costPrice: number;
  conversionMultiplier: number;
  baseUnit: string;
  baseQuantity: number;
  stockAvailable?: number;
}

export interface HeldTransaction {
  id: string;
  heldAt: string;
  customer: MemberProfile | null;
  items: PosRowItem[];
  totalAmount: number;
  note?: string;
}

interface PosCashierManagerProps {
  products: Product[];
  stores: Store[];
  currentStore: Store;
  customers: MemberProfile[];
  orders: Order[];
  onUpdateProducts: (products: Product[]) => void;
  onUpdateCustomers: (customers: MemberProfile[]) => void;
  onAddOrder: (order: Order) => void;
  onClose?: () => void;
  receiptConfigs?: ReceiptInfo[];
  onUpdateReceiptConfigs?: (configs: ReceiptInfo[]) => void;
}

// Audio Beep for Barcode Scanner
function playScanBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // ignore audio block
  }
}

// Audio Success for Sale Finalized
function playCashSuccessSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // ignore
  }
}

export const PosCashierManager: React.FC<PosCashierManagerProps> = ({
  products,
  stores,
  currentStore,
  customers,
  orders,
  onUpdateProducts,
  onUpdateCustomers,
  onAddOrder,
  onClose,
  receiptConfigs,
  onUpdateReceiptConfigs,
}) => {
  // Store & Cashier Operator
  const [selectedStoreId, setSelectedStoreId] = useState(currentStore?.id || stores[0]?.id || 'store_1');
  const [cashierName] = useState('Kasir 01 (Budi Santoso)');

  // Receipt Configuration & Epson TM-U220 Printer State
  const [isReceiptEditorModalOpen, setIsReceiptEditorModalOpen] = useState(false);
  const [receiptPrintFeedback, setReceiptPrintFeedback] = useState<string | null>(null);
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const [localReceiptConfigs, setLocalReceiptConfigs] = useState<ReceiptInfo[]>(() => {
    if (receiptConfigs && receiptConfigs.length > 0) return receiptConfigs;
    try {
      const saved = localStorage.getItem('nusamart_receipt_configs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    if (receiptConfigs && receiptConfigs.length > 0) {
      setLocalReceiptConfigs(receiptConfigs);
    }
  }, [receiptConfigs]);

  // Active Receipt Config (prioritizing Epson TM-U220 Dot Matrix 70mm)
  const activeReceiptConfig = useMemo<ReceiptInfo>(() => {
    const list = localReceiptConfigs.length > 0 ? localReceiptConfigs : (receiptConfigs || []);
    const tmu220 = list.find(r => r.printerType === 'dot_matrix_tmu220' || r.paperWidth === '70mm_dotmatrix');
    if (tmu220 && tmu220.isDefault) return tmu220;
    const def = list.find(r => r.isDefault);
    if (def) return def;
    if (tmu220) return tmu220;
    if (list.length > 0) return list[0];
    return {
      id: 'rcp_tmu220_default',
      profileName: 'Struk Dot Matrix Epson TM-U220 (70mm)',
      headerBrand: 'NUSA MART EXPRESS',
      subHeader: 'MINIMARKET & KASIR POINT OF SALE',
      storeName: currentStore?.name || 'KuickMart Express',
      address: currentStore?.address || 'Jl. Jendral Sudirman No. 18, Menteng',
      phone: currentStore?.phone || '021-5551234',
      taxIdOrNpwp: 'NPWP: 01.345.678.9-012.000',
      paperWidth: '70mm_dotmatrix',
      printerType: 'dot_matrix_tmu220',
      charactersPerLine: 40,
      dividerChar: '=',
      itemRowStyle: 'two_rows',
      feedLinesBeforeCut: 5,
      showCashierName: true,
      showCustomerName: true,
      showPaymentDetail: true,
      showMemberPoints: true,
      showBarcode: true,
      footerMessage1: 'TERIMA KASIH TELAH BERBELANJA',
      footerMessage2: 'BARANG YANG SUDAH DIBELI DAPAT DITUKAR MAKS 1X24 JAM DENGAN STRUK ASLI.',
      csHotline: 'CALL CENTER: 1500-888',
      websiteOrSocial: 'www.nusamart.id • WA: 0812-3456-7890',
      isDefault: true,
    };
  }, [localReceiptConfigs, receiptConfigs, currentStore]);

  const handleSaveReceiptConfig = (updated: ReceiptInfo) => {
    const existingIndex = localReceiptConfigs.findIndex(r => r.id === updated.id);
    let newList: ReceiptInfo[];
    if (existingIndex >= 0) {
      newList = localReceiptConfigs.map((r, i) => i === existingIndex ? updated : r);
    } else {
      newList = [updated, ...localReceiptConfigs];
    }
    setLocalReceiptConfigs(newList);
    try {
      localStorage.setItem('nusamart_receipt_configs', JSON.stringify(newList));
    } catch {}
    if (onUpdateReceiptConfigs) {
      onUpdateReceiptConfigs(newList);
    }
    setReceiptPrintFeedback('Desain struk POS berhasil disimpan!');
    setTimeout(() => setReceiptPrintFeedback(null), 3500);
  };

  // Customer / Member selection
  const [selectedCustomer, setSelectedCustomer] = useState<MemberProfile | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCity, setNewCustCity] = useState('');

  // Table Items State
  const [rows, setRows] = useState<PosRowItem[]>([
    {
      id: `row_${Date.now()}_1`,
      productId: '',
      productName: '',
      barcode: '',
      unit: 'Pcs',
      quantity: 1,
      sellingPrice: 0,
      discountAmount: 0,
      subtotal: 0,
      costPrice: 0,
      conversionMultiplier: 1,
      baseUnit: 'Pcs',
      baseQuantity: 1,
    },
  ]);

  // Quick Barcode & Product Name Search State
  const [quickBarcodeInput, setQuickBarcodeInput] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);

  // Search results for autocomplete (searching by name, brand, barcode, SKU)
  const searchResults = useMemo(() => {
    const q = quickBarcodeInput.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchBarcode = p.barcode && p.barcode.toLowerCase().includes(q);
      const matchBrand = p.brand && p.brand.toLowerCase().includes(q);
      const matchCategory = p.category && p.category.toLowerCase().includes(q);
      const matchConversions = p.unitConversions?.some(
        (uc) =>
          (uc.barcode && uc.barcode.toLowerCase().includes(q)) ||
          uc.unitName.toLowerCase().includes(q)
      );
      return matchName || matchBarcode || matchBrand || matchCategory || matchConversions;
    }).slice(0, 10);
  }, [quickBarcodeInput, products]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target as Node) &&
        quickBarcodeInputRef.current &&
        !quickBarcodeInputRef.current.contains(e.target as Node)
      ) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [lastScannedItemInfo, setLastScannedItemInfo] = useState<{
    name: string;
    qty: number;
    unit: string;
    price: number;
    subtotal: number;
  } | null>(null);

  // Camera Barcode Scanner
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Display Theme: 'vfd-green' | 'amber' | 'cyan' | 'white'
  const [displayTheme, setDisplayTheme] = useState<'vfd-green' | 'amber' | 'cyan'>('vfd-green');

  // Input Focus Refs for rapid keyboard entry
  const quickBarcodeInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const qtyInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const priceInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cashInputRef = useRef<HTMLInputElement | null>(null);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [useCustomerPoints, setUseCustomerPoints] = useState(false);
  const [pointsDiscountAmount, setPointsDiscountAmount] = useState(0);

  // Held Transactions (Tahan / Panggil Struk)
  const [heldTransactions, setHeldTransactions] = useState<HeldTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('nusamart_pos_held_bills');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);

  // Completed Receipt Modal
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Active Store object
  const activeStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId) || currentStore || stores[0];
  }, [stores, selectedStoreId, currentStore]);

  // Valid rows with productId
  const validRows = useMemo(() => rows.filter((r) => r.productId), [rows]);

  // Computations
  const subtotalBeforeDiscount = useMemo(() => {
    return validRows.reduce((sum, r) => sum + r.sellingPrice * r.quantity, 0);
  }, [validRows]);

  const totalItemDiscounts = useMemo(() => {
    return validRows.reduce((sum, r) => sum + (r.discountAmount || 0), 0);
  }, [validRows]);

  const totalPhysicalItems = useMemo(() => {
    return validRows.reduce((sum, r) => sum + (r.baseQuantity || r.quantity), 0);
  }, [validRows]);

  const totalQtyUnits = useMemo(() => {
    return validRows.reduce((sum, r) => sum + r.quantity, 0);
  }, [validRows]);

  // Member Points Redemption Calculation (1 point = Rp 1, max 50% of total)
  useEffect(() => {
    if (useCustomerPoints && selectedCustomer && selectedCustomer.points > 0) {
      const maxApplicable = Math.floor((subtotalBeforeDiscount - totalItemDiscounts) * 0.5);
      const pointsVal = Math.min(selectedCustomer.points, maxApplicable);
      setPointsDiscountAmount(Math.max(0, pointsVal));
    } else {
      setPointsDiscountAmount(0);
    }
  }, [useCustomerPoints, selectedCustomer, subtotalBeforeDiscount, totalItemDiscounts]);

  // Grand Total
  const grandTotal = useMemo(() => {
    const raw = subtotalBeforeDiscount - totalItemDiscounts - pointsDiscountAmount;
    return Math.max(0, raw);
  }, [subtotalBeforeDiscount, totalItemDiscounts, pointsDiscountAmount]);

  // Change / Kembalian Calculation
  const changeAmount = useMemo(() => {
    if (paymentMethod !== 'cash') return 0;
    return Math.max(0, cashReceived - grandTotal);
  }, [cashReceived, grandTotal, paymentMethod]);

  // Points earned on this transaction (1 point per Rp 1.000 spent)
  const pointsEarned = useMemo(() => {
    if (!selectedCustomer) return 0;
    const baseMultiplier = selectedCustomer.tier === 'Platinum' ? 2 : selectedCustomer.tier === 'Gold' ? 1.5 : 1;
    return Math.floor((grandTotal / 1000) * baseMultiplier);
  }, [grandTotal, selectedCustomer]);

  // Focus quick barcode on mount
  useEffect(() => {
    quickBarcodeInputRef.current?.focus();
  }, []);

  // Sync held bills to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nusamart_pos_held_bills', JSON.stringify(heldTransactions));
    } catch {
      // ignore
    }
  }, [heldTransactions]);

  // ==========================================
  // ROW DATA MANIPULATION & UNIT CONVERSION
  // ==========================================
  const applyProductToRow = (
    rowIndex: number,
    prod: Product,
    customBarcode?: string,
    customUnit?: string
  ) => {
    const baseUnit = prod.unit || 'Pcs';
    const unitToUse = customUnit || baseUnit;
    let mult = 1;
    let unitPrice = prod.price;

    if (customUnit) {
      const opts = getProductUnitOptions(prod);
      const matched = opts.find((o) => o.unitName.toLowerCase() === customUnit.toLowerCase());
      if (matched) {
        mult = matched.multiplier || 1;
        unitPrice = matched.price || Math.round(prod.price * mult);
      }
    }

    setRows((prev) => {
      const updated = [...prev];
      const target = updated[rowIndex] || {
        id: `row_${Date.now()}_${rowIndex}`,
        quantity: 1,
        discountAmount: 0,
      };

      const qty = target.quantity > 0 ? target.quantity : 1;
      const sub = Math.max(0, unitPrice * qty - (target.discountAmount || 0));

      updated[rowIndex] = {
        ...target,
        productId: prod.id,
        productName: prod.name,
        barcode: customBarcode || prod.barcode || '',
        unit: unitToUse,
        quantity: qty,
        sellingPrice: unitPrice,
        discountAmount: target.discountAmount || 0,
        subtotal: sub,
        costPrice: prod.costPrice || Math.round(prod.price * 0.75),
        conversionMultiplier: mult,
        baseUnit,
        baseQuantity: qty * mult,
        stockAvailable: prod.stock || 0,
      };

      return updated;
    });

    setLastScannedItemInfo({
      name: prod.name,
      qty: 1,
      unit: unitToUse,
      price: unitPrice,
      subtotal: unitPrice,
    });
  };

  const handleRowBarcodeLookup = (rowIndex: number, code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    // 1. Search by product barcode, id, or multi-tier packaging barcode
    let matched = products.find((p) => {
      if (p.barcode && p.barcode.toLowerCase() === trimmed.toLowerCase()) return true;
      if (p.id.toLowerCase() === trimmed.toLowerCase()) return true;
      if (
        p.unitConversions?.some(
          (uc) => uc.barcode && uc.barcode.toLowerCase() === trimmed.toLowerCase()
        )
      ) {
        return true;
      }
      return false;
    });

    // 2. If not found by barcode, search by product name / brand
    if (!matched) {
      matched = products.find((p) =>
        p.name.toLowerCase().includes(trimmed.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(trimmed.toLowerCase()))
      );
    }

    if (matched) {
      playScanBeep();
      const matchedConv = matched.unitConversions?.find(
        (uc) => uc.barcode && uc.barcode.toLowerCase() === trimmed.toLowerCase()
      );
      const unitName = matchedConv ? matchedConv.unitName : matched.unit || 'Pcs';
      applyProductToRow(rowIndex, matched, trimmed, unitName);

      // Advance focus to Qty
      setTimeout(() => {
        qtyInputRefs.current[rowIndex]?.focus();
        qtyInputRefs.current[rowIndex]?.select();
      }, 50);
    } else {
      alert(`Produk dengan barcode atau nama "${trimmed}" tidak ditemukan.`);
    }
  };

  const handleRowUnitChange = (rowIndex: number, newUnit: string) => {
    const currentRow = rows[rowIndex];
    if (!currentRow || !currentRow.productId) return;

    const prod = products.find((p) => p.id === currentRow.productId);
    if (!prod) return;

    const opts = getProductUnitOptions(prod);
    const matchedOpt = opts.find((o) => o.unitName.toLowerCase() === newUnit.toLowerCase());
    const mult = matchedOpt ? matchedOpt.multiplier || 1 : 1;
    const unitPrice = matchedOpt ? matchedOpt.price || Math.round(prod.price * mult) : prod.price * mult;
    const baseUnit = prod.unit || 'Pcs';
    const sub = Math.max(0, unitPrice * currentRow.quantity - currentRow.discountAmount);

    setRows((prev) => {
      const updated = [...prev];
      updated[rowIndex] = {
        ...currentRow,
        unit: newUnit,
        conversionMultiplier: mult,
        sellingPrice: unitPrice,
        subtotal: sub,
        baseUnit,
        baseQuantity: currentRow.quantity * mult,
      };
      return updated;
    });
  };

  const handleRowQtyChange = (rowIndex: number, rawQty: number) => {
    const qty = isNaN(rawQty) || rawQty < 1 ? 1 : rawQty;
    setRows((prev) => {
      const updated = [...prev];
      const r = updated[rowIndex];
      if (!r) return prev;
      const sub = Math.max(0, r.sellingPrice * qty - r.discountAmount);
      updated[rowIndex] = {
        ...r,
        quantity: qty,
        subtotal: sub,
        baseQuantity: qty * (r.conversionMultiplier || 1),
      };
      return updated;
    });
  };

  const handleRowPriceChange = (rowIndex: number, rawPrice: number) => {
    const price = isNaN(rawPrice) || rawPrice < 0 ? 0 : rawPrice;
    setRows((prev) => {
      const updated = [...prev];
      const r = updated[rowIndex];
      if (!r) return prev;
      const sub = Math.max(0, price * r.quantity - r.discountAmount);
      updated[rowIndex] = {
        ...r,
        sellingPrice: price,
        subtotal: sub,
      };
      return updated;
    });
  };

  const handleRowDiscountChange = (rowIndex: number, rawDiscount: number) => {
    const discount = isNaN(rawDiscount) || rawDiscount < 0 ? 0 : rawDiscount;
    setRows((prev) => {
      const updated = [...prev];
      const r = updated[rowIndex];
      if (!r) return prev;
      const sub = Math.max(0, r.sellingPrice * r.quantity - discount);
      updated[rowIndex] = {
        ...r,
        discountAmount: discount,
        subtotal: sub,
      };
      return updated;
    });
  };

  // ==========================================
  // AUTO ADVANCING FOCUS TO NEXT ROW (MANDATORY REQUIREMENT)
  // ==========================================
  const advanceToNextRow = (currentIndex: number) => {
    const currentRow = rows[currentIndex];
    if (!currentRow || !currentRow.productId) {
      barcodeInputRefs.current[currentIndex]?.focus();
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= rows.length) {
      // Append a new blank row
      const newRow: PosRowItem = {
        id: `row_${Date.now()}_${nextIndex}`,
        productId: '',
        productName: '',
        barcode: '',
        unit: 'Pcs',
        quantity: 1,
        sellingPrice: 0,
        discountAmount: 0,
        subtotal: 0,
        costPrice: 0,
        conversionMultiplier: 1,
        baseUnit: 'Pcs',
        baseQuantity: 1,
      };
      setRows((prev) => [...prev, newRow]);
    }

    setTimeout(() => {
      barcodeInputRefs.current[nextIndex]?.focus();
      barcodeInputRefs.current[nextIndex]?.select();
    }, 50);
  };

  const handleAddBlankRow = () => {
    const newRow: PosRowItem = {
      id: `row_${Date.now()}_${rows.length + 1}`,
      productId: '',
      productName: '',
      barcode: '',
      unit: 'Pcs',
      quantity: 1,
      sellingPrice: 0,
      discountAmount: 0,
      subtotal: 0,
      costPrice: 0,
      conversionMultiplier: 1,
      baseUnit: 'Pcs',
      baseQuantity: 1,
    };
    setRows((prev) => [...prev, newRow]);
    setTimeout(() => {
      barcodeInputRefs.current[rows.length]?.focus();
    }, 50);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
      // Keep one blank row
      setRows([
        {
          id: `row_${Date.now()}_0`,
          productId: '',
          productName: '',
          barcode: '',
          unit: 'Pcs',
          quantity: 1,
          sellingPrice: 0,
          discountAmount: 0,
          subtotal: 0,
          costPrice: 0,
          conversionMultiplier: 1,
          baseUnit: 'Pcs',
          baseQuantity: 1,
        },
      ]);
      setLastScannedItemInfo(null);
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  // ==========================================
  // ADD PRODUCT TO TRANSACTION CART
  // ==========================================
  const addProductToCart = (
    matchedProd: Product,
    customBarcode?: string,
    customUnit?: string,
    customQty: number = 1
  ) => {
    playScanBeep();
    const baseUnit = matchedProd.unit || 'Pcs';
    const matchedUc = customUnit
      ? matchedProd.unitConversions?.find(
          (uc) => uc.unitName.toLowerCase() === customUnit.toLowerCase()
        )
      : matchedProd.unitConversions?.find(
          (uc) =>
            uc.barcode &&
            customBarcode &&
            uc.barcode.toLowerCase() === customBarcode.toLowerCase()
        );
    const unitName = matchedUc ? matchedUc.unitName : customUnit || baseUnit;
    const mult = matchedUc ? matchedUc.totalMultiplier || 1 : 1;
    const unitPrice = matchedUc
      ? matchedUc.price || Math.round(matchedProd.price * mult)
      : matchedProd.price * mult;
    const barcodeToSave = customBarcode || matchedUc?.barcode || matchedProd.barcode || '';

    setRows((prev) => {
      const existingIdx = prev.findIndex(
        (r) =>
          r.productId === matchedProd.id &&
          r.unit.toLowerCase() === unitName.toLowerCase()
      );

      if (existingIdx >= 0) {
        // Increment quantity
        const updated = [...prev];
        const curr = updated[existingIdx];
        const newQty = curr.quantity + customQty;
        const newSub = Math.max(
          0,
          curr.sellingPrice * newQty - curr.discountAmount
        );
        updated[existingIdx] = {
          ...curr,
          quantity: newQty,
          subtotal: newSub,
          baseQuantity: newQty * (curr.conversionMultiplier || 1),
        };

        setLastScannedItemInfo({
          name: matchedProd.name,
          qty: newQty,
          unit: unitName,
          price: curr.sellingPrice,
          subtotal: newSub,
        });

        return updated;
      }

      // Check if there's an empty row to take
      const emptyIdx = prev.findIndex((r) => !r.productId);
      if (emptyIdx >= 0) {
        const updated = [...prev];
        updated[emptyIdx] = {
          id: `row_${Date.now()}_${emptyIdx}`,
          productId: matchedProd.id,
          productName: matchedProd.name,
          barcode: barcodeToSave,
          unit: unitName,
          quantity: customQty,
          sellingPrice: unitPrice,
          discountAmount: 0,
          subtotal: unitPrice * customQty,
          costPrice:
            matchedProd.costPrice || Math.round(matchedProd.price * 0.75),
          conversionMultiplier: mult,
          baseUnit,
          baseQuantity: customQty * mult,
          stockAvailable: matchedProd.stock || 0,
        };

        setLastScannedItemInfo({
          name: matchedProd.name,
          qty: customQty,
          unit: unitName,
          price: unitPrice,
          subtotal: unitPrice * customQty,
        });

        return updated;
      }

      // Otherwise append new row
      const newRow: PosRowItem = {
        id: `row_${Date.now()}_${prev.length}`,
        productId: matchedProd.id,
        productName: matchedProd.name,
        barcode: barcodeToSave,
        unit: unitName,
        quantity: customQty,
        sellingPrice: unitPrice,
        discountAmount: 0,
        subtotal: unitPrice * customQty,
        costPrice:
          matchedProd.costPrice || Math.round(matchedProd.price * 0.75),
        conversionMultiplier: mult,
        baseUnit,
        baseQuantity: customQty * mult,
        stockAvailable: matchedProd.stock || 0,
      };

      setLastScannedItemInfo({
        name: matchedProd.name,
        qty: customQty,
        unit: unitName,
        price: unitPrice,
        subtotal: unitPrice * customQty,
      });

      return [...prev, newRow];
    });

    setQuickBarcodeInput('');
    setIsSearchDropdownOpen(false);
    setSelectedSearchIndex(0);
  };

  // Keyboard navigation for search dropdown
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchDropdownOpen || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIndex(
        (prev) => (prev - 1 + searchResults.length) % searchResults.length
      );
    } else if (e.key === 'Escape') {
      setIsSearchDropdownOpen(false);
    }
  };

  // ==========================================
  // QUICK BARCODE & PRODUCT NAME SEARCH (Top Bar)
  // Kasir bisa mencari lewat barcode ATAU nama barang
  // ==========================================
  const handleQuickBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = quickBarcodeInput.trim();
    if (!query) return;

    // If dropdown is open and user pressed enter with selected item
    if (
      isSearchDropdownOpen &&
      searchResults.length > 0 &&
      selectedSearchIndex >= 0 &&
      selectedSearchIndex < searchResults.length
    ) {
      addProductToCart(searchResults[selectedSearchIndex]);
      return;
    }

    // 1. Search by exact barcode or SKU/ID
    const barcodeMatch = products.find((p) => {
      if (p.barcode && p.barcode.toLowerCase() === query.toLowerCase())
        return true;
      if (p.id.toLowerCase() === query.toLowerCase()) return true;
      if (
        p.unitConversions?.some(
          (uc) => uc.barcode && uc.barcode.toLowerCase() === query.toLowerCase()
        )
      ) {
        return true;
      }
      return false;
    });

    if (barcodeMatch) {
      addProductToCart(barcodeMatch, query);
      return;
    }

    // 2. Search by exact or partial product name
    const nameMatches = products.filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(query.toLowerCase()))
    );

    if (nameMatches.length === 1) {
      // Exactly 1 match found by name, immediately add to cart
      addProductToCart(nameMatches[0]);
    } else if (nameMatches.length > 1) {
      // Multiple matches: show dropdown and highlight first
      setIsSearchDropdownOpen(true);
      setSelectedSearchIndex(0);
    } else {
      alert(`Produk dengan barcode atau nama "${query}" tidak ditemukan di katalog.`);
    }
  };

  // ==========================================
  // CAMERA BARCODE SCANNER
  // ==========================================
  const startCameraScan = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a'],
        });

        const scanInterval = setInterval(async () => {
          if (!videoRef.current || !streamRef.current) {
            clearInterval(scanInterval);
            return;
          }
          try {
            const detected = await barcodeDetector.detect(videoRef.current);
            if (detected && detected.length > 0) {
              const code = detected[0].rawValue;
              stopCameraScan();
              setQuickBarcodeInput(code);
              // auto trigger quick scan
              setTimeout(() => {
                const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                setQuickBarcodeInput(code);
                // process lookup directly
                const matchedProd = products.find(
                  (p) =>
                    p.barcode === code ||
                    p.id === code ||
                    p.unitConversions?.some((uc) => uc.barcode === code)
                );
                if (matchedProd) {
                  playScanBeep();
                  setRows((prev) => {
                    const emptyIdx = prev.findIndex((r) => !r.productId);
                    const baseUnit = matchedProd.unit || 'Pcs';
                    const newRow: PosRowItem = {
                      id: `row_${Date.now()}`,
                      productId: matchedProd.id,
                      productName: matchedProd.name,
                      barcode: code,
                      unit: baseUnit,
                      quantity: 1,
                      sellingPrice: matchedProd.price,
                      discountAmount: 0,
                      subtotal: matchedProd.price,
                      costPrice: matchedProd.costPrice || Math.round(matchedProd.price * 0.75),
                      conversionMultiplier: 1,
                      baseUnit,
                      baseQuantity: 1,
                      stockAvailable: matchedProd.stock || 0,
                    };
                    if (emptyIdx >= 0) {
                      const upd = [...prev];
                      upd[emptyIdx] = newRow;
                      return upd;
                    }
                    return [...prev, newRow];
                  });
                }
              }, 100);
              clearInterval(scanInterval);
            }
          } catch {
            // frame detect pass
          }
        }, 300);
      }
    } catch (err) {
      console.warn('Gagal membuka kamera scanner:', err);
      alert('Tidak dapat mengakses kamera. Pastikan izin kamera aktif.');
      setIsCameraOpen(false);
    }
  };

  const stopCameraScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  // Quick preset sample barcode
  const sampleBarcodes = [
    { label: 'Minyak Bimoli 2L', code: '8992345112233' },
    { label: 'Beras Pandan Wangi 5kg', code: '8993456789012' },
    { label: 'Indomie Goreng', code: '8998866200225' },
    { label: 'Ultra Milk Coklat 1L', code: '8991001100223' },
    { label: 'Telur Ayam 1kg', code: '8994567890123' },
  ];

  // ==========================================
  // HOLD & RECALL BILL (TAHAN / PANGGIL TRANSAKSI)
  // ==========================================
  const handleHoldTransaction = () => {
    if (validRows.length === 0) {
      alert('Tidak ada barang di keranjang kasir untuk ditahan.');
      return;
    }

    const newHold: HeldTransaction = {
      id: `hold_${Date.now()}`,
      heldAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      customer: selectedCustomer,
      items: [...validRows],
      totalAmount: grandTotal,
      note: `Ditahan oleh ${cashierName}`,
    };

    setHeldTransactions((prev) => [newHold, ...prev]);
    // Reset active cart
    setRows([
      {
        id: `row_${Date.now()}_0`,
        productId: '',
        productName: '',
        barcode: '',
        unit: 'Pcs',
        quantity: 1,
        sellingPrice: 0,
        discountAmount: 0,
        subtotal: 0,
        costPrice: 0,
        conversionMultiplier: 1,
        baseUnit: 'Pcs',
        baseQuantity: 1,
      },
    ]);
    setSelectedCustomer(null);
    setLastScannedItemInfo(null);
    alert(`Transaksi berhasil ditahan (${newHold.items.length} item). Anda dapat melayani pelanggan berikutnya.`);
  };

  const handleRecallTransaction = (held: HeldTransaction) => {
    if (validRows.length > 0) {
      if (!confirm('Keranjang kasir saat ini memiliki barang. Ganti dengan transaksi yang dipanggil?')) {
        return;
      }
    }

    setRows(held.items);
    setSelectedCustomer(held.customer);
    setHeldTransactions((prev) => prev.filter((h) => h.id !== held.id));
    setIsHeldModalOpen(false);
    quickBarcodeInputRef.current?.focus();
  };

  // ==========================================
  // RESET / BATALKAN TRANSAKSI
  // ==========================================
  const handleResetTransaction = () => {
    if (validRows.length > 0) {
      if (!confirm('Batalkan seluruh transaksi kasir ini? Keranjang belanja akan dikosongkan.')) {
        return;
      }
    }
    setRows([
      {
        id: `row_${Date.now()}_0`,
        productId: '',
        productName: '',
        barcode: '',
        unit: 'Pcs',
        quantity: 1,
        sellingPrice: 0,
        discountAmount: 0,
        subtotal: 0,
        costPrice: 0,
        conversionMultiplier: 1,
        baseUnit: 'Pcs',
        baseQuantity: 1,
      },
    ]);
    setSelectedCustomer(null);
    setLastScannedItemInfo(null);
    setCashReceived(0);
    setUseCustomerPoints(false);
    quickBarcodeInputRef.current?.focus();
  };

  // ==========================================
  // FINALISASI PENJUALAN & CETAK STRUK
  // ==========================================
  const handleFinalizeSale = () => {
    if (validRows.length === 0) {
      alert('Mohon masukkan minimal 1 barang sebelum menyelesaikan transaksi.');
      return;
    }

    if (paymentMethod === 'cash' && cashReceived < grandTotal) {
      alert(`Uang tunai yang diterima (Rp ${cashReceived.toLocaleString('id-ID')}) kurang dari total belanja (Rp ${grandTotal.toLocaleString('id-ID')}).`);
      cashInputRef.current?.focus();
      return;
    }

    // 1. DEDUCT PHYSICAL STOCK IN CATALOG (STOK BERKURANG SECARA OTOMATIS)
    const updatedProducts = products.map((prod) => {
      const matchingRows = validRows.filter((r) => r.productId === prod.id);
      if (matchingRows.length > 0) {
        const totalBaseQtySold = matchingRows.reduce((sum, r) => sum + (r.baseQuantity || r.quantity), 0);
        const currentStock = prod.stock || 0;
        const newStock = Math.max(0, currentStock - totalBaseQtySold);
        return {
          ...prod,
          stock: newStock,
          soldCount: (prod.soldCount || 0) + totalBaseQtySold,
        };
      }
      return prod;
    });
    onUpdateProducts(updatedProducts);

    // 2. UPDATE CUSTOMER PROFILE & LOYALTY POINTS IN MASTER PELANGGAN
    if (selectedCustomer) {
      const updatedCustomers = customers.map((c) => {
        if (c.id === selectedCustomer.id) {
          const currentPoints = c.points || 0;
          const pointsRemaining = useCustomerPoints ? Math.max(0, currentPoints - pointsDiscountAmount) : currentPoints;
          const newPointsTotal = pointsRemaining + pointsEarned;
          const newSpent = (c.totalSpent || 0) + grandTotal;
          const newOrdersCount = (c.ordersCount || 0) + 1;

          // Tier progression check
          let newTier = c.tier;
          if (newSpent >= 10000000) newTier = 'Platinum';
          else if (newSpent >= 4000000) newTier = 'Gold';
          else if (newSpent >= 1000000) newTier = 'Silver';

          return {
            ...c,
            points: newPointsTotal,
            totalSpent: newSpent,
            ordersCount: newOrdersCount,
            tier: newTier,
            lastOrderDate: new Date().toISOString().slice(0, 10),
          };
        }
        return c;
      });
      onUpdateCustomers(updatedCustomers);
    }

    // 3. CREATE COMPLETED ORDER IN SYSTEM
    const orderNum = `POS-${Date.now().toString().slice(-6)}`;
    const cartItemsFromRows: CartItem[] = validRows.map((r) => {
      const p = products.find((prod) => prod.id === r.productId)!;
      return {
        cartItemId: r.id,
        product: p,
        quantity: r.quantity,
        selectedUnit: r.unit,
        unitPrice: r.sellingPrice,
        conversionMultiplier: r.conversionMultiplier,
        conversionDescription: `${r.quantity} ${r.unit} (${r.baseQuantity} ${r.baseUnit})`,
      };
    });

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      orderNumber: orderNum,
      createdAt: new Date().toISOString(),
      items: cartItemsFromRows,
      store: activeStore,
      deliveryType: 'pickup',
      status: 'completed',
      paymentMethod,
      paymentStatus: 'paid',
      subtotal: subtotalBeforeDiscount,
      deliveryFee: 0,
      discountAmount: totalItemDiscounts + pointsDiscountAmount,
      pointsUsed: useCustomerPoints ? pointsDiscountAmount : 0,
      pointsEarned,
      total: grandTotal,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer ? selectedCustomer.name : 'Pelanggan Umum',
      customerPhone: selectedCustomer?.phone,
      trackingSteps: [
        {
          status: 'completed',
          title: 'Selesai di Kasir Toko',
          description: `Kasir: ${cashierName} • Pembayaran ${paymentMethod.toUpperCase()} lunas`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          isCompleted: true,
        },
      ],
    };

    onAddOrder(newOrder);
    playCashSuccessSound();

    // Show thermal receipt modal
    setCompletedOrder(newOrder);
    setIsReceiptModalOpen(true);

    // Reset table for next transaction
    setRows([
      {
        id: `row_${Date.now()}_0`,
        productId: '',
        productName: '',
        barcode: '',
        unit: 'Pcs',
        quantity: 1,
        sellingPrice: 0,
        discountAmount: 0,
        subtotal: 0,
        costPrice: 0,
        conversionMultiplier: 1,
        baseUnit: 'Pcs',
        baseQuantity: 1,
      },
    ]);
    setCashReceived(0);
    setUseCustomerPoints(false);
  };

  // Register New Customer on the fly
  const handleQuickRegisterCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      alert('Nama dan No. WhatsApp wajib diisi');
      return;
    }

    const nextNum = customers.length + 1;
    const newCust: MemberProfile = {
      id: `usr_${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      email: `${newCustName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      memberNumber: `KM-2024-${String(nextNum).padStart(3, '0')}`,
      barcode: String(Date.now()).slice(-12),
      points: 500, // Bonus member baru
      stamps: 1,
      tier: 'Bronze',
      joinedDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      city: newCustCity.trim() || 'Jakarta',
      totalSpent: 0,
      ordersCount: 0,
      status: 'active',
    };

    onUpdateCustomers([newCust, ...customers]);
    setSelectedCustomer(newCust);
    setIsNewCustomerModalOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustCity('');
    alert(`Member baru "${newCust.name}" berhasil didaftarkan! Bonus 500 poin telah ditambahkan.`);
  };

  // Quick cash helper
  const handleSetQuickCash = (amount: number) => {
    setCashReceived(amount);
  };

  // Print Struk (Epson TM-U220 Dot Matrix 70mm or Thermal)
  const handlePrintReceipt = async () => {
    if (!completedOrder) {
      window.print();
      return;
    }
    setIsPrintingReceipt(true);
    try {
      const html = generateDotMatrixReceiptHtml(
        completedOrder, 
        activeReceiptConfig, 
        cashierName, 
        { cashReceived, changeAmount }
      );
      await printPosReceiptViaIframe(html);
    } catch (err) {
      console.error('Print iframe fallback:', err);
      window.print();
    } finally {
      setIsPrintingReceipt(false);
    }
  };

  // Copy RAW ASCII 40-col Receipt Text
  const handleCopyRawReceipt = async () => {
    if (!completedOrder) return;
    const raw = generateRawPosReceiptText(
      completedOrder, 
      activeReceiptConfig, 
      cashierName, 
      { cashReceived, changeAmount }
    );
    const ok = await copyPosReceiptText(raw);
    if (ok) {
      setReceiptPrintFeedback('Teks struk RAW 40 kolom berhasil disalin ke clipboard!');
      setTimeout(() => setReceiptPrintFeedback(null), 3000);
    }
  };

  // Download .TXT receipt for direct spooler
  const handleDownloadTxtReceipt = () => {
    if (!completedOrder) return;
    const raw = generateRawPosReceiptText(
      completedOrder, 
      activeReceiptConfig, 
      cashierName, 
      { cashReceived, changeAmount }
    );
    downloadPosReceiptTxtFile(raw, completedOrder.orderNumber);
    setReceiptPrintFeedback('File struk .txt berhasil diunduh!');
    setTimeout(() => setReceiptPrintFeedback(null), 3000);
  };

  // Display Theme CSS Classes
  const getThemeStyles = () => {
    switch (displayTheme) {
      case 'amber':
        return {
          container: 'bg-stone-950 text-amber-400 border-amber-900/60 shadow-[0_0_40px_rgba(245,158,11,0.2)]',
          totalText: 'text-amber-400 drop-shadow-[0_0_18px_rgba(245,158,11,0.5)]',
          subText: 'text-amber-300/80',
          badge: 'bg-amber-950 text-amber-300 border border-amber-700/50',
          changeText: 'text-amber-300',
        };
      case 'cyan':
        return {
          container: 'bg-stone-950 text-cyan-400 border-cyan-900/60 shadow-[0_0_40px_rgba(6,182,212,0.2)]',
          totalText: 'text-cyan-400 drop-shadow-[0_0_18px_rgba(6,182,212,0.5)]',
          subText: 'text-cyan-300/80',
          badge: 'bg-cyan-950 text-cyan-300 border border-cyan-700/50',
          changeText: 'text-cyan-300',
        };
      default: // vfd-green
        return {
          container: 'bg-stone-950 text-emerald-400 border-emerald-950 shadow-[0_0_50px_rgba(16,185,129,0.25)]',
          totalText: 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.55)]',
          subText: 'text-emerald-300/80',
          badge: 'bg-emerald-950 text-emerald-300 border border-emerald-800/60',
          changeText: 'text-emerald-300',
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <div className="flex flex-col h-full bg-stone-100 text-stone-900 font-sans select-none">
      {/* ============================================================ */}
      {/* 1. TOP CASHIER HEADER & OPERATIONAL BAR */}
      {/* ============================================================ */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black shadow-xs">
            <ScanBarcode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                Penjualan Kasir Minimarket (POS)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                POS AKTIF
              </span>
            </div>
            <div className="text-xs text-stone-500 flex items-center gap-2">
              <span>{cashierName}</span>
              <span>•</span>
              <span className="font-semibold text-stone-700">{activeStore.name}</span>
            </div>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-2">
          {/* Offline Sync Status & Queue Badge */}
          <OfflineSyncBadge />

          {/* Held Bills Badge & Button */}
          <button
            onClick={() => setIsHeldModalOpen(true)}
            className="relative px-3 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Panggil Transaksi yang Ditahan"
          >
            <PauseCircle className="w-4 h-4 text-amber-600" />
            <span>Tahan/Panggil ({heldTransactions.length})</span>
            {heldTransactions.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">
                {heldTransactions.length}
              </span>
            )}
          </button>

          {/* Reset Bill */}
          <button
            onClick={handleResetTransaction}
            className="px-3 py-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Kosongkan Keranjang Kasir"
          >
            <RotateCcw className="w-4 h-4 text-red-500" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Desain & Format Struk Epson TM-U220 70mm */}
          <button
            onClick={() => setIsReceiptEditorModalOpen(true)}
            className="px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-stone-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            title="Buka Editor Struk POS (Epson TM-U220 70mm)"
          >
            <Printer className="w-4 h-4 text-amber-600" />
            <span className="hidden md:inline">Desain Struk TM-U220</span>
            <span className="md:hidden">Struk</span>
          </button>

          {/* Close POS if modal */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600"
              title="Tutup Kasir"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* POS Notification Feedback Banner */}
      {receiptPrintFeedback && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-xs font-bold text-amber-950 flex items-center justify-between animate-slideDown">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{receiptPrintFeedback}</span>
          </div>
          <button onClick={() => setReceiptPrintFeedback(null)} className="text-amber-800 hover:text-amber-950">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="p-3 sm:p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
        {/* ============================================================ */}
        {/* 2. THE GIANT MINIMARKET CASHIER GRAND TOTAL DISPLAY SCREEN   */}
        {/*    (Customer Display Pole / Layar Besar Kasir Minimarket)     */}
        {/* ============================================================ */}
        <div className={`relative rounded-3xl border-2 p-5 sm:p-6 transition-all duration-300 ${theme.container}`}>
          {/* Background Grid Accent */}
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none rounded-3xl" />

          {/* Header of Customer Display */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3 mb-4 relative z-10">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wider uppercase ${theme.badge}`}>
                TERMINAL POS 01 • MINIMARKET DIGITAL
              </span>

              {/* Display Color Preset Switcher */}
              <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono">
                <span className="text-stone-500">DISPLAY:</span>
                <button
                  onClick={() => setDisplayTheme('vfd-green')}
                  className={`px-1.5 py-0.5 rounded ${displayTheme === 'vfd-green' ? 'bg-emerald-600 text-white font-bold' : 'text-stone-400 hover:text-white'}`}
                >
                  VFD HIJAU
                </button>
                <button
                  onClick={() => setDisplayTheme('amber')}
                  className={`px-1.5 py-0.5 rounded ${displayTheme === 'amber' ? 'bg-amber-600 text-white font-bold' : 'text-stone-400 hover:text-white'}`}
                >
                  AMBER
                </button>
                <button
                  onClick={() => setDisplayTheme('cyan')}
                  className={`px-1.5 py-0.5 rounded ${displayTheme === 'cyan' ? 'bg-cyan-600 text-white font-bold' : 'text-stone-400 hover:text-white'}`}
                >
                  CYAN
                </button>
              </div>
            </div>

            {/* Member Card & Loyalty Info on Display */}
            <div className="flex items-center gap-2">
              {selectedCustomer ? (
                <div className="flex items-center gap-2 bg-stone-900/80 border border-stone-800 px-3 py-1.5 rounded-xl">
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="text-left text-xs">
                    <span className="font-bold text-white block">{selectedCustomer.name}</span>
                    <span className="text-[10px] text-amber-300 font-mono">
                      {selectedCustomer.tier} • {selectedCustomer.points.toLocaleString('id-ID')} Poin
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-stone-500 hover:text-red-400 ml-1 p-0.5"
                    title="Lepas Pelanggan"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-bold text-stone-200 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>+ Pilih / Scan Member (F4)</span>
                </button>
              )}
            </div>
          </div>

          {/* BIG CENTER DISPLAY: GRAND TOTAL BELANJA */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
            <div>
              <div className="text-xs sm:text-sm font-mono tracking-widest text-stone-400 uppercase font-semibold flex items-center gap-2">
                <span>TOTAL BELANJA</span>
                <span className="text-stone-600">|</span>
                <span className={theme.subText}>
                  {validRows.length} Macam Barang • {totalQtyUnits} Satuan • {totalPhysicalItems} Item Fisik
                </span>
              </div>
              <div className={`text-4xl sm:text-6xl lg:text-7xl font-mono font-black tracking-tight mt-1 leading-none ${theme.totalText}`}>
                {formatRupiah(grandTotal)}
              </div>
            </div>

            {/* Payment & Change Live Indicators */}
            {paymentMethod === 'cash' && (
              <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3.5 sm:px-5 sm:py-3 min-w-[240px] text-right flex flex-col justify-center">
                <div className="text-[11px] font-mono text-stone-400 uppercase">
                  Uang Bayar: <span className="text-white font-bold">{formatRupiah(cashReceived)}</span>
                </div>
                <div className="mt-1">
                  <div className="text-[10px] font-mono text-stone-400 uppercase">Kembalian Kasir</div>
                  <div className={`text-2xl sm:text-3xl font-mono font-black ${changeAmount > 0 ? theme.changeText : 'text-stone-500'}`}>
                    {formatRupiah(changeAmount)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sub-ticker: Last item scanned info */}
          <div className="mt-4 pt-3 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-stone-400 relative z-10">
            <div className="flex items-center gap-2 truncate">
              <span className="text-stone-500">ITEM TERAKHIR:</span>
              {lastScannedItemInfo ? (
                <span className="text-stone-200 font-bold truncate">
                  {lastScannedItemInfo.name} ({lastScannedItemInfo.qty} {lastScannedItemInfo.unit} × {formatRupiah(lastScannedItemInfo.price)}) = <span className={theme.subText}>{formatRupiah(lastScannedItemInfo.subtotal)}</span>
                </span>
              ) : (
                <span className="text-stone-600 italic">Belum ada barang discan. Silakan scan barcode...</span>
              )}
            </div>

            {selectedCustomer && pointsEarned > 0 && (
              <div className="text-amber-400 font-bold flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                <span>Dapatkan +{pointsEarned} Poin Member</span>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. QUICK SEARCH & BARCODE SCANNER (NAMA / BARCODE)          */}
        {/* ============================================================ */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full" ref={searchDropdownRef}>
            <form onSubmit={handleQuickBarcodeSubmit} className="relative w-full">
              <Search className="w-5 h-5 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={quickBarcodeInputRef}
                type="text"
                value={quickBarcodeInput}
                onChange={(e) => {
                  setQuickBarcodeInput(e.target.value);
                  setIsSearchDropdownOpen(e.target.value.trim().length > 0);
                  setSelectedSearchIndex(0);
                }}
                onFocus={() => {
                  if (quickBarcodeInput.trim().length > 0) {
                    setIsSearchDropdownOpen(true);
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Ketik Nama Barang atau Scan Barcode (Contoh: Indomie, Aqua, Beras, Minyak...) [F2]"
                className="w-full pl-11 pr-28 py-3 bg-stone-50 hover:bg-stone-100/70 focus:bg-white border-2 border-emerald-300 focus:border-emerald-600 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-4 focus:ring-emerald-100 transition-all shadow-inner"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {quickBarcodeInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickBarcodeInput('');
                      setIsSearchDropdownOpen(false);
                    }}
                    className="p-1 hover:bg-stone-200 text-stone-400 hover:text-stone-600 rounded-lg text-xs"
                    title="Hapus pencarian"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Enter
                </button>
              </div>
            </form>

            {/* Instant Autocomplete Suggestions Popover */}
            {isSearchDropdownOpen && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 overflow-hidden divide-y divide-stone-100 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Pencarian Barang ({searchResults.length} ditemukan)</span>
                  <span className="text-[10px] text-stone-400 font-normal">Gunakan ↑ ↓ lalu Enter untuk memilih</span>
                </div>
                {searchResults.map((prod, sIdx) => {
                  const isSelected = sIdx === selectedSearchIndex;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => addProductToCart(prod)}
                      onMouseEnter={() => setSelectedSearchIndex(sIdx)}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50/80 text-emerald-950' : 'hover:bg-stone-50 text-stone-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {prod.image ? (
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-10 h-10 rounded-xl object-cover bg-stone-100 border border-stone-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 text-stone-400">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm truncate text-stone-900">
                            {prod.name}
                          </div>
                          <div className="text-[11px] text-stone-500 flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="font-mono bg-stone-100 px-1.5 py-0.2 rounded text-stone-600 font-medium">
                              {prod.barcode || 'ID: ' + prod.id.slice(-6)}
                            </span>
                            {prod.brand && <span className="font-medium">• {prod.brand}</span>}
                            <span>•</span>
                            <span className={prod.stock && prod.stock > 10 ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-bold'}>
                              Stok: {prod.stock || 0} {prod.unit || 'Pcs'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-sm text-emerald-700">
                          {formatRupiah(prod.price)}
                        </div>
                        <span className="text-[10px] text-stone-400 font-medium">
                          per {prod.unit || 'Pcs'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live Camera Scanner Button */}
          <button
            type="button"
            onClick={startCameraScan}
            className="w-full md:w-auto px-4 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0"
            title="Scan Barcode menggunakan Kamera HP / Laptop"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Kamera Barcode</span>
          </button>

          {/* Add Blank Row Button */}
          <button
            type="button"
            onClick={handleAddBlankRow}
            className="w-full md:w-auto px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 text-stone-600" />
            <span>+ Baris Kosong</span>
          </button>
        </div>

        {/* Quick Sample Test Barcode Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-stone-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Uji Coba Cepat Barcode:</span>
          </span>
          {sampleBarcodes.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => {
                setQuickBarcodeInput(item.code);
                setTimeout(() => {
                  const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                  // Look up
                  const matched = products.find(
                    (p) =>
                      p.barcode === item.code ||
                      p.id === item.code ||
                      p.unitConversions?.some((uc) => uc.barcode === item.code)
                  );
                  if (matched) {
                    playScanBeep();
                    setRows((prev) => {
                      const existingIdx = prev.findIndex((r) => r.productId === matched.id);
                      if (existingIdx >= 0) {
                        const upd = [...prev];
                        const curr = upd[existingIdx];
                        const newQ = curr.quantity + 1;
                        upd[existingIdx] = {
                          ...curr,
                          quantity: newQ,
                          subtotal: curr.sellingPrice * newQ - curr.discountAmount,
                          baseQuantity: newQ * (curr.conversionMultiplier || 1),
                        };
                        return upd;
                      }
                      const emptyIdx = prev.findIndex((r) => !r.productId);
                      const newRow: PosRowItem = {
                        id: `row_${Date.now()}`,
                        productId: matched.id,
                        productName: matched.name,
                        barcode: item.code,
                        unit: matched.unit || 'Pcs',
                        quantity: 1,
                        sellingPrice: matched.price,
                        discountAmount: 0,
                        subtotal: matched.price,
                        costPrice: matched.costPrice || Math.round(matched.price * 0.75),
                        conversionMultiplier: 1,
                        baseUnit: matched.unit || 'Pcs',
                        baseQuantity: 1,
                        stockAvailable: matched.stock || 0,
                      };
                      if (emptyIdx >= 0) {
                        const upd = [...prev];
                        upd[emptyIdx] = newRow;
                        return upd;
                      }
                      return [...prev, newRow];
                    });
                    setLastScannedItemInfo({
                      name: matched.name,
                      qty: 1,
                      unit: matched.unit || 'Pcs',
                      price: matched.price,
                      subtotal: matched.price,
                    });
                  }
                }, 50);
              }}
              className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 border border-stone-200 hover:border-emerald-300 rounded-lg font-mono text-[11px] transition-colors"
            >
              {item.label} ({item.code.slice(-4)})
            </button>
          ))}
        </div>

        {/* ============================================================ */}
        {/* 4. INLINE TABLE INPUT (Sama dengan modul pembelian)          */}
        {/*    Input pembelian item barang bergeser ke baris berikutnya  */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
                Daftar Barang Transaksi Kasir (Tabel Input Cepat)
              </h3>
            </div>
            <div className="text-[11px] text-stone-500 font-medium">
              💡 Navigasi Keyboard: <span className="font-bold text-stone-700">Barcode</span> ➔ Enter ➔ <span className="font-bold text-stone-700">Qty</span> ➔ Enter ➔ <span className="font-bold text-stone-700">Harga</span> ➔ Enter (Otomatis geser ke baris berikutnya)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100/70 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">No</th>
                  <th className="px-3 py-3 w-40">Barcode Barang</th>
                  <th className="px-3 py-3 min-w-[200px]">Pilih / Nama Produk</th>
                  <th className="px-3 py-3 w-32">Satuan</th>
                  <th className="px-3 py-3 w-28 text-center">Konversi Stok</th>
                  <th className="px-3 py-3 w-24 text-center">Qty Jual</th>
                  <th className="px-3 py-3 w-32 text-right">Harga Jual (Rp)</th>
                  <th className="px-3 py-3 w-28 text-right">Diskon (Rp)</th>
                  <th className="px-3 py-3 w-36 text-right">Subtotal (Rp)</th>
                  <th className="px-3 py-3 w-24 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 font-medium">
                {rows.map((row, index) => {
                  const prod = products.find((p) => p.id === row.productId);
                  const unitOpts = prod ? getProductUnitOptions(prod) : [];

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-stone-50/80 transition-colors ${!row.productId ? 'bg-amber-50/20' : ''}`}
                    >
                      {/* 1. No */}
                      <td className="px-3 py-2 text-center text-stone-400 font-mono font-bold">
                        {index + 1}
                      </td>

                      {/* 2. Barcode (Enter -> look up and advance to Qty) */}
                      <td className="px-3 py-2">
                        <div className="relative">
                          <input
                            ref={(el) => {
                              barcodeInputRefs.current[index] = el;
                            }}
                            type="text"
                            value={row.barcode}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRows((prev) => {
                                const upd = [...prev];
                                upd[index] = { ...upd[index], barcode: val };
                                return upd;
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleRowBarcodeLookup(index, row.barcode);
                              }
                            }}
                            placeholder="Scan/ketik..."
                            className="w-full px-2 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </td>

                      {/* 3. Product Selection / Name */}
                      <td className="px-3 py-2">
                        <select
                          value={row.productId}
                          onChange={(e) => {
                            const pId = e.target.value;
                            const p = products.find((item) => item.id === pId);
                            if (p) {
                              applyProductToRow(index, p);
                              setTimeout(() => {
                                qtyInputRefs.current[index]?.focus();
                                qtyInputRefs.current[index]?.select();
                              }, 50);
                            }
                          }}
                          className="w-full px-2 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- Cari / Pilih Produk dari Katalog --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Stok: {p.stock || 0} {p.unit || 'Pcs'}) - {formatRupiah(p.price)}
                            </option>
                          ))}
                        </select>
                        {prod && (
                          <div className="text-[10px] text-stone-500 mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono">{prod.brand}</span>
                            <span>•</span>
                            <span className={prod.stock && prod.stock > 10 ? 'text-emerald-600' : 'text-amber-600 font-bold'}>
                              Stok saat ini: {prod.stock || 0} {prod.unit || 'Pcs'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 4. Satuan Barang */}
                      <td className="px-3 py-2">
                        <select
                          value={row.unit}
                          disabled={!row.productId}
                          onChange={(e) => handleRowUnitChange(index, e.target.value)}
                          className="w-full px-2 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                        >
                          {unitOpts.length > 0 ? (
                            unitOpts.map((opt) => (
                              <option key={opt.unitName} value={opt.unitName}>
                                {opt.unitName} (x{opt.multiplier})
                              </option>
                            ))
                          ) : (
                            <option value={row.unit || 'Pcs'}>{row.unit || 'Pcs'}</option>
                          )}
                        </select>
                      </td>

                      {/* 5. Konversi Fisik */}
                      <td className="px-3 py-2 text-center text-stone-600">
                        <div className="font-mono text-[11px] font-bold">
                          {row.conversionMultiplier > 1 ? `x${row.conversionMultiplier}` : '1:1'}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          ={row.baseQuantity || row.quantity} {row.baseUnit || 'Pcs'}
                        </div>
                      </td>

                      {/* 6. Qty Jual (Enter -> shifts to price/discount) */}
                      <td className="px-3 py-2 text-center">
                        <input
                          ref={(el) => {
                            qtyInputRefs.current[index] = el;
                          }}
                          type="number"
                          min="1"
                          value={row.quantity}
                          disabled={!row.productId}
                          onChange={(e) => handleRowQtyChange(index, parseInt(e.target.value) || 1)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              priceInputRefs.current[index]?.focus();
                              priceInputRefs.current[index]?.select();
                            }
                          }}
                          className="w-16 px-2 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold text-center focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                        />
                      </td>

                      {/* 7. Harga Jual Satuan (Enter -> ADVANCES TO NEXT ROW AUTOMATICALLY!) */}
                      <td className="px-3 py-2 text-right">
                        <input
                          ref={(el) => {
                            priceInputRefs.current[index] = el;
                          }}
                          type="number"
                          min="0"
                          value={row.sellingPrice}
                          disabled={!row.productId}
                          onChange={(e) => handleRowPriceChange(index, parseInt(e.target.value) || 0)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              // AUTO-ADVANCE TO NEXT ROW ON ENTER!
                              advanceToNextRow(index);
                            }
                          }}
                          className="w-24 px-2 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                        />
                      </td>

                      {/* 8. Diskon per Item */}
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={row.discountAmount || 0}
                          disabled={!row.productId}
                          onChange={(e) => handleRowDiscountChange(index, parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-20 px-2 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                        />
                      </td>

                      {/* 9. Subtotal */}
                      <td className="px-3 py-2 text-right">
                        <div className="font-mono font-bold text-emerald-700 text-sm">
                          {formatRupiah(row.subtotal)}
                        </div>
                      </td>

                      {/* 10. Aksi: Geser Baris [ ↵ ] & Hapus [ 🗑 ] */}
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => advanceToNextRow(index)}
                            disabled={!row.productId}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold disabled:opacity-40"
                            title="Selesai & Geser ke baris berikutnya (Enter)"
                          >
                            <CornerDownRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold"
                            title="Hapus baris ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer Summary */}
              <tfoot className="bg-stone-100 border-t-2 border-stone-300 text-xs font-bold text-stone-800">
                <tr>
                  <td colSpan={5} className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <span>Total Macam Barang: <span className="font-mono text-emerald-700">{validRows.length}</span></span>
                      <span>Total Satuan: <span className="font-mono text-emerald-700">{totalQtyUnits}</span></span>
                      <span>Stok Fisik Keluar: <span className="font-mono text-emerald-700">-{totalPhysicalItems} unit</span></span>
                    </div>
                  </td>
                  <td colSpan={3} className="px-4 py-3 text-right text-stone-500">
                    {totalItemDiscounts > 0 && (
                      <span className="text-red-600 mr-3">Hemat Diskon: -{formatRupiah(totalItemDiscounts)}</span>
                    )}
                    <span>Subtotal Kotor:</span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black text-stone-900 text-sm">
                    {formatRupiah(subtotalBeforeDiscount)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Add Row Bar */}
          <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddBlankRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Tambah Baris Berikutnya</span>
            </button>

            <button
              type="button"
              onClick={handleHoldTransaction}
              disabled={validRows.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl text-xs font-bold text-amber-800 disabled:opacity-50"
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Tahan Transaksi (Hold Bill)</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5. CASHIER CHECKOUT & PAYMENT SECTION                        */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Box 1: Customer / Member & Points */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-sky-600" />
                  <span>Pelanggan & Poin Loyalitas</span>
                </span>
                <button
                  onClick={() => setIsNewCustomerModalOpen(true)}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Daftar Baru</span>
                </button>
              </div>

              {selectedCustomer ? (
                <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-stone-900 text-sm">{selectedCustomer.name}</div>
                      <div className="text-xs font-mono text-stone-500">{selectedCustomer.phone}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Tier {selectedCustomer.tier}
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-sky-200/80 flex items-center justify-between text-xs">
                    <span className="text-stone-600">Saldo Poin:</span>
                    <span className="font-black text-amber-600">
                      {selectedCustomer.points.toLocaleString('id-ID')} Poin
                    </span>
                  </div>

                  {/* Redeem Points Toggle */}
                  {selectedCustomer.points > 0 && (
                    <label className="mt-2.5 flex items-center gap-2 cursor-pointer pt-2 border-t border-sky-200/80">
                      <input
                        type="checkbox"
                        checked={useCustomerPoints}
                        onChange={(e) => setUseCustomerPoints(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-semibold text-stone-800">
                        Gunakan Poin Belanja (Potongan {formatRupiah(pointsDiscountAmount)})
                      </span>
                    </label>
                  )}
                </div>
              ) : (
                <div className="bg-stone-50 border border-dashed border-stone-300 rounded-xl p-4 text-center">
                  <p className="text-xs text-stone-500">Pelanggan Umum (Non-Member)</p>
                  <button
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="mt-2 px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 shadow-2xs inline-flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5 text-stone-400" />
                    <span>Cari / Pilih Member (F4)</span>
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 text-[11px] text-stone-400">
              *Member berhak mendapatkan poin belanja per Rp 1.000 transaksi untuk ditukarkan potongan belanja berikutnya.
            </div>
          </div>

          {/* Box 2: Payment Method & Quick Cash */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5 mb-2.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Metode Pembayaran</span>
              </span>

              {/* Payment Method Tabs */}
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-stone-100 rounded-xl mb-3">
                {[
                  { id: 'cash' as PaymentMethod, label: 'Tunai', icon: <Banknote className="w-3.5 h-3.5" /> },
                  { id: 'qris' as PaymentMethod, label: 'QRIS', icon: <QrCode className="w-3.5 h-3.5" /> },
                  { id: 'transfer' as PaymentMethod, label: 'Debit/EDC', icon: <CreditCard className="w-3.5 h-3.5" /> },
                  { id: 'cod' as PaymentMethod, label: 'Kasbon', icon: <Coins className="w-3.5 h-3.5" /> },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.id);
                      if (m.id === 'cash' && cashReceived === 0) {
                        setCashReceived(grandTotal);
                      }
                    }}
                    className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      paymentMethod === m.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Cash Input & Quick Buttons */}
              {paymentMethod === 'cash' ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs font-bold text-stone-700 shrink-0">Uang Diterima:</label>
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-stone-400 text-xs">
                        Rp
                      </span>
                      <input
                        ref={cashInputRef}
                        type="number"
                        min="0"
                        value={cashReceived || ''}
                        onChange={(e) => setCashReceived(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full pl-8 pr-2 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono font-bold text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Quick Cash Preset Buttons */}
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetQuickCash(grandTotal)}
                      className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold font-mono"
                    >
                      Uang Pas
                    </button>
                    {[10000, 20000, 50000, 100000, 200000, 500000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleSetQuickCash(amt)}
                        className="px-1.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-mono font-semibold"
                      >
                        {amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}k`}
                      </button>
                    ))}
                  </div>
                </div>
              ) : paymentMethod === 'qris' ? (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center">
                  <div className="w-24 h-24 mx-auto bg-white p-2 rounded-lg border border-stone-300 shadow-2xs flex items-center justify-center">
                    <QrCode className="w-20 h-20 text-stone-800" />
                  </div>
                  <div className="text-[11px] font-bold text-stone-700 mt-2">QRIS Standar Nasional</div>
                  <div className="text-[10px] text-stone-500">Scan via BCA, GoPay, OVO, Dana, ShopeePay</div>
                </div>
              ) : (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center text-xs text-stone-600">
                  <p className="font-bold">Mesin EDC / Transfer Bank</p>
                  <p className="text-[11px] text-stone-400 mt-1">Verifikasi struk debit atau slip transfer dari pembeli</p>
                </div>
              )}
            </div>
          </div>

          {/* Box 3: Final Total & Complete Transaction Button */}
          <div className="bg-stone-950 text-white p-5 rounded-2xl border border-stone-800 shadow-lg flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-stone-400">
                <span>Subtotal ({validRows.length} item):</span>
                <span className="font-mono">{formatRupiah(subtotalBeforeDiscount)}</span>
              </div>
              {totalItemDiscounts > 0 && (
                <div className="flex justify-between text-xs text-rose-400">
                  <span>Diskon Item:</span>
                  <span className="font-mono">-{formatRupiah(totalItemDiscounts)}</span>
                </div>
              )}
              {pointsDiscountAmount > 0 && (
                <div className="flex justify-between text-xs text-amber-400">
                  <span>Potongan Poin:</span>
                  <span className="font-mono">-{formatRupiah(pointsDiscountAmount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-stone-800 flex justify-between items-baseline">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-300">Total Akhir:</span>
                <span className="text-2xl font-mono font-black text-emerald-400">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
              {paymentMethod === 'cash' && (
                <div className="pt-2 border-t border-stone-800/80 flex justify-between text-xs font-mono">
                  <span className="text-stone-400">Kembalian:</span>
                  <span className={`font-bold text-sm ${changeAmount > 0 ? 'text-emerald-300' : 'text-stone-500'}`}>
                    {formatRupiah(changeAmount)}
                  </span>
                </div>
              )}
            </div>

            {/* BIG PRIMARY FINALIZE BUTTON */}
            <button
              type="button"
              onClick={handleFinalizeSale}
              disabled={validRows.length === 0}
              className="mt-4 w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white rounded-xl font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Printer className="w-5 h-5" />
              <span>SELESAIKAN & CETAK STRUK [F12]</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: PILIH PELANGGAN DARI MASTER PELANGGAN (F4)            */}
      {/* ============================================================ */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-base text-stone-900">Pilih Pelanggan / Member Toko</h3>
              </div>
              <button onClick={() => setIsCustomerModalOpen(false)} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-stone-200 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="Cari nama pelanggan, nomor WhatsApp, atau nomor member..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto divide-y divide-stone-100">
              {customers
                .filter((c) => {
                  const q = customerSearchQuery.toLowerCase();
                  return (
                    c.name.toLowerCase().includes(q) ||
                    c.phone.includes(q) ||
                    c.memberNumber.toLowerCase().includes(q)
                  );
                })
                .map((cust) => (
                  <div
                    key={cust.id}
                    onClick={() => {
                      setSelectedCustomer(cust);
                      setIsCustomerModalOpen(false);
                      quickBarcodeInputRef.current?.focus();
                    }}
                    className="py-3 px-3 hover:bg-sky-50/70 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                        <span>{cust.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          {cust.tier}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 font-mono mt-0.5">
                        {cust.phone} • {cust.memberNumber}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-amber-600">
                        {cust.points.toLocaleString('id-ID')} Poin
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {cust.ordersCount || 0} order
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsCustomerModalOpen(false);
                  setIsNewCustomerModalOpen(true);
                }}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>+ Daftarkan Pelanggan Baru</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DAFTAR MEMBER BARU ON-THE-FLY                         */}
      {/* ============================================================ */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-sky-600" />
              <span>Daftar Pelanggan / Member Baru</span>
            </h3>
            <form onSubmit={handleQuickRegisterCustomer} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Bpk. Hendra Gunawan"
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">No. WhatsApp / HP *</label>
                <input
                  type="text"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Kota / Domisili</label>
                <input
                  type="text"
                  value={newCustCity}
                  onChange={(e) => setNewCustCity(e.target.value)}
                  placeholder="e.g. Jakarta Selatan"
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
                >
                  Simpan & Pilih Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: PANGGIL TRANSAKSI DITAHAN (HELD BILLS)                */}
      {/* ============================================================ */}
      {isHeldModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-stone-900">Daftar Transaksi Ditahan (Hold Bill)</h3>
              </div>
              <button onClick={() => setIsHeldModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {heldTransactions.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-sm">
                  Tidak ada transaksi kasir yang sedang ditahan.
                </div>
              ) : (
                heldTransactions.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 bg-stone-50 hover:bg-amber-50/50 border border-stone-200 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-stone-900 text-sm">
                        {h.customer ? h.customer.name : 'Pelanggan Umum'}
                      </div>
                      <div className="text-xs text-stone-500 font-mono mt-0.5">
                        Ditahan: {h.heldAt} • {h.items.length} macam barang
                      </div>
                      <div className="text-xs font-black text-emerald-700 mt-1">
                        Total: {formatRupiah(h.totalAmount)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRecallTransaction(h)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Panggil</span>
                      </button>
                      <button
                        onClick={() => setHeldTransactions((prev) => prev.filter((item) => item.id !== h.id))}
                        className="p-1.5 text-stone-400 hover:text-red-600"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 text-right">
              <button
                type="button"
                onClick={() => setIsHeldModalOpen(false)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: LIVE CAMERA BARCODE SCANNER                           */}
      {/* ============================================================ */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4">
          <div className="bg-stone-900 rounded-3xl overflow-hidden max-w-md w-full border border-stone-700 shadow-2xl flex flex-col">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm">Arahkan Kamera ke Barcode Barang</span>
              </div>
              <button onClick={stopCameraScan} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {/* Laser Line Animation */}
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_red] animate-pulse" />
              <div className="absolute inset-12 border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none" />
            </div>

            <div className="p-4 text-center text-xs text-stone-400 border-t border-stone-800">
              Posisikan barcode produk atau barcode kartu member di dalam bingkai kotak.
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: STRUK BELANJA EPSON TM-U220 70mm / POS RECEIPT PREVIEW */}
      {/* ============================================================ */}
      {isReceiptModalOpen && completedOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-stone-200 flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-stone-900 tracking-tight">
                    TRANSAKSI KASIR BERHASIL
                  </h3>
                  <p className="text-[11px] text-stone-500">Stok fisik produk otomatis terpotong</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiptEditorModalOpen(true)}
                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Buka Editor Struk & Pengaturan TM-U220"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>Desain Struk</span>
              </button>
            </div>

            {/* Profile Info Badge */}
            <div className="mt-3 px-3 py-1.5 bg-stone-100 rounded-xl border border-stone-200 flex items-center justify-between text-[11px] text-stone-600">
              <span className="font-semibold truncate">
                Format: <strong className="text-stone-900">{activeReceiptConfig.profileName}</strong>
              </span>
              <span className="px-2 py-0.5 bg-white text-stone-700 font-mono font-bold rounded border border-stone-200 shrink-0">
                {activeReceiptConfig.paperWidth === '70mm_dotmatrix' ? '70mm Dot Matrix' : activeReceiptConfig.paperWidth} • {activeReceiptConfig.charactersPerLine || 40}c
              </span>
            </div>

            {/* Epson TM-U220 70mm Dot Matrix Receipt Canvas */}
            <div className="my-3 p-4 bg-stone-50 border border-stone-300 rounded-2xl font-mono text-xs text-stone-900 space-y-2 overflow-y-auto max-h-[50vh] shadow-inner">
              
              {/* Header Toko & Brand */}
              <div className="text-center space-y-0.5 pb-1">
                <div className="font-black text-sm tracking-wider uppercase">
                  {cleanReceiptText(activeReceiptConfig.headerBrand || activeStore.name)}
                </div>
                {activeReceiptConfig.subHeader && (
                  <div className="text-[11px] text-stone-600 font-semibold">
                    {cleanReceiptText(activeReceiptConfig.subHeader)}
                  </div>
                )}
                <div className="text-[11px] text-stone-700">
                  {cleanReceiptText(activeReceiptConfig.storeName || activeStore.name)}
                </div>
                <div className="text-[10px] text-stone-500">
                  {cleanReceiptText(activeReceiptConfig.address || activeStore.address)}
                </div>
                {(activeReceiptConfig.phone || activeStore.phone) && (
                  <div className="text-[10px] text-stone-500">
                    Telp: {cleanReceiptText(activeReceiptConfig.phone || activeStore.phone)}
                  </div>
                )}
                {activeReceiptConfig.taxIdOrNpwp && (
                  <div className="text-[10px] text-stone-500 font-semibold">
                    {cleanReceiptText(activeReceiptConfig.taxIdOrNpwp)}
                  </div>
                )}
              </div>

              {/* Monospace Divider */}
              <div className="text-stone-400 select-none overflow-hidden text-[10px] leading-none text-center">
                {(activeReceiptConfig.dividerChar || '=').repeat(activeReceiptConfig.charactersPerLine || 40)}
              </div>

              {/* Order Metadata */}
              <div className="text-[11px] text-stone-700 space-y-0.5">
                <div className="flex justify-between">
                  <span>No. Struk</span>
                  <span className="font-bold text-stone-900">{completedOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal</span>
                  <span>{new Date(completedOrder.createdAt).toLocaleString('id-ID')}</span>
                </div>
                {activeReceiptConfig.showCashierName !== false && (
                  <div className="flex justify-between">
                    <span>Kasir</span>
                    <span>{cleanReceiptText(cashierName)}</span>
                  </div>
                )}
                {activeReceiptConfig.showCustomerName !== false && (
                  <div className="flex justify-between">
                    <span>Pelanggan</span>
                    <span className="font-bold">{cleanReceiptText(completedOrder.customerName)}</span>
                  </div>
                )}
              </div>

              {/* Monospace Divider */}
              <div className="text-stone-400 select-none overflow-hidden text-[10px] leading-none text-center">
                {(activeReceiptConfig.dividerChar || '-').repeat(activeReceiptConfig.charactersPerLine || 40)}
              </div>

              {/* Item List (2-row format typical for TM-U220 70mm) */}
              <div className="space-y-1.5 text-xs">
                {completedOrder.items.map((it, idx) => {
                  const itemTotal = (it.unitPrice || it.product.price) * it.quantity;
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-bold truncate text-stone-900 uppercase">
                        {cleanReceiptText(it.product.name)}
                      </div>
                      <div className="flex justify-between text-stone-600 text-[11px]">
                        <span>
                          {it.quantity} {it.selectedUnit || 'Pcs'} x {formatRupiah(it.unitPrice || it.product.price)}
                        </span>
                        <span className="font-bold text-stone-900">
                          {formatRupiah(itemTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Monospace Divider */}
              <div className="text-stone-400 select-none overflow-hidden text-[10px] leading-none text-center">
                {(activeReceiptConfig.dividerChar || '-').repeat(activeReceiptConfig.charactersPerLine || 40)}
              </div>

              {/* Calculations & Totals */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-stone-700">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(completedOrder.subtotal)}</span>
                </div>
                {completedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600 font-bold">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(completedOrder.discountAmount)}</span>
                  </div>
                )}
                {activeReceiptConfig.taxEnabled && (
                  <div className="flex justify-between text-stone-600 text-[11px]">
                    <span>PPN ({activeReceiptConfig.taxPercentage || 11}%):</span>
                    <span>{formatRupiah(Math.round((completedOrder.subtotal - (completedOrder.discountAmount || 0)) * ((activeReceiptConfig.taxPercentage || 11) / 100)))}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-stone-900 pt-0.5">
                  <span>TOTAL:</span>
                  <span>{formatRupiah(completedOrder.total)}</span>
                </div>

                {activeReceiptConfig.showPaymentDetail !== false && (
                  <div className="pt-1 border-t border-dashed border-stone-300 space-y-0.5 text-[11px]">
                    <div className="flex justify-between text-stone-600">
                      <span>Metode Pembayaran:</span>
                      <span className="uppercase font-bold text-stone-900">{completedOrder.paymentMethod}</span>
                    </div>
                    {completedOrder.paymentMethod === 'cash' && (
                      <>
                        <div className="flex justify-between">
                          <span>Tunai Diterima:</span>
                          <span>{formatRupiah(cashReceived)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-700 text-xs">
                          <span>Kembalian:</span>
                          <span>{formatRupiah(changeAmount)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Member Points Earned */}
              {activeReceiptConfig.showMemberPoints !== false && completedOrder.pointsEarned > 0 && (
                <div className="p-2 bg-amber-50 rounded-lg text-center text-amber-900 text-[11px] font-bold border border-amber-200">
                  ⭐ +{completedOrder.pointsEarned} Poin Member NusaMart
                </div>
              )}

              {/* Monospace Divider */}
              <div className="text-stone-400 select-none overflow-hidden text-[10px] leading-none text-center">
                {(activeReceiptConfig.dividerChar || '=').repeat(activeReceiptConfig.charactersPerLine || 40)}
              </div>

              {/* Footer Messages */}
              <div className="text-center text-[10px] text-stone-600 space-y-1 pt-1">
                {activeReceiptConfig.footerMessage1 && (
                  <div>{cleanReceiptText(activeReceiptConfig.footerMessage1)}</div>
                )}
                {activeReceiptConfig.footerMessage2 && (
                  <div className="text-stone-500">{cleanReceiptText(activeReceiptConfig.footerMessage2)}</div>
                )}
                {activeReceiptConfig.csHotline && (
                  <div className="font-semibold text-stone-700">{cleanReceiptText(activeReceiptConfig.csHotline)}</div>
                )}
                {activeReceiptConfig.websiteOrSocial && (
                  <div className="text-stone-500">{cleanReceiptText(activeReceiptConfig.websiteOrSocial)}</div>
                )}
              </div>

              {/* Transaction Barcode Simulation */}
              {activeReceiptConfig.showBarcode !== false && (
                <div className="pt-2 text-center select-none">
                  <div className="font-mono text-[11px] tracking-widest text-stone-900 font-bold bg-white py-1 px-3 border border-stone-300 rounded inline-block">
                    * {completedOrder.orderNumber} *
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions for Cashier */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  disabled={isPrintingReceipt}
                  className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
                  title="Kirim ke Printer Epson TM-U220 (Kertas 70mm / 76mm)"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>{isPrintingReceipt ? 'Mempersiapkan Cetak...' : 'Cetak Struk (Epson TM-U220)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsReceiptModalOpen(false);
                    setCompletedOrder(null);
                    quickBarcodeInputRef.current?.focus();
                  }}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all shrink-0"
                  title="Mulai Transaksi Baru (Shortcut F2)"
                >
                  <Plus className="w-4 h-4" />
                  <span>Transaksi Baru (F2)</span>
                </button>
              </div>

              {/* Raw Print & Spooler Utility Tools */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200 text-xs">
                <button
                  type="button"
                  onClick={handleCopyRawReceipt}
                  className="px-3 py-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg flex items-center gap-1.5 transition-colors font-medium text-[11px]"
                  title="Salin teks ASCII mentah 40 kolom untuk spooler atau serial port"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin RAW (ASCII)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTxtReceipt}
                  className="px-3 py-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg flex items-center gap-1.5 transition-colors font-medium text-[11px]"
                  title="Unduh file .txt untuk dicetak via USB PRN / command line lpr / type file.txt > PRN"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .TXT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsReceiptEditorModalOpen(true)}
                  className="px-3 py-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg flex items-center gap-1.5 transition-colors font-bold text-[11px]"
                  title="Ubah font, divider, pesan footer, dan margin Epson TM-U220"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Edit Format</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: POS RECEIPT EDITOR & EPSON TM-U220 CONFIGURATOR       */}
      {/* ============================================================ */}
      <PosReceiptEditorModal
        isOpen={isReceiptEditorModalOpen}
        onClose={() => setIsReceiptEditorModalOpen(false)}
        activeConfig={activeReceiptConfig}
        stores={stores}
        onSaveConfig={handleSaveReceiptConfig}
        sampleOrder={completedOrder || (orders && orders[0]) || undefined}
        cashierName={cashierName}
      />
    </div>
  );
};
