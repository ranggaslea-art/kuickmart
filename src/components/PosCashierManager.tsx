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
  generateDotMatrixReceiptHtml, 
  printPosReceiptViaIframe,
  downloadPosReceiptTxtFile,
  copyPosReceiptText,
  generateRawPosReceiptText
} from '../utils/posPrinterHelper';
import { PosReceiptEditorModal } from './PosReceiptEditorModal';
import { OfflineSyncBadge } from './OfflineSyncBadge';
import { 
  ScanBarcode, 
  Camera, 
  Search, 
  Plus, 
  Minus,
  Trash2, 
  CheckCircle2, 
  Printer, 
  RotateCcw, 
  PauseCircle, 
  PlayCircle, 
  CreditCard, 
  QrCode, 
  Banknote, 
  User, 
  Award, 
  X, 
  Sparkles, 
  Package,
  Sliders,
  Coins,
  Copy,
  Download
} from 'lucide-react';

interface PosCashierManagerProps {
  products: Product[];
  stores: Store[];
  currentStore?: Store;
  customers: MemberProfile[];
  orders?: Order[];
  onUpdateProducts: (products: Product[]) => void;
  onUpdateCustomers: (customers: MemberProfile[]) => void;
  onAddOrder: (order: Order) => void;
  onClose?: () => void;
  receiptConfigs?: ReceiptInfo[];
  onUpdateReceiptConfigs?: (configs: ReceiptInfo[]) => void;
}

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
    // ignore
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
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
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
  const [selectedStoreId] = useState(currentStore?.id || stores[0]?.id || 'store_1');
  const [cashierName] = useState('Kasir 01 (Budi Santoso)');

  // Receipt Configuration (Default: Epson TM-U220 Dot Matrix 70mm)
  const [isReceiptEditorModalOpen, setIsReceiptEditorModalOpen] = useState(false);
  const [receiptPrintFeedback, setReceiptPrintFeedback] = useState<string | null>(null);
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
    setReceiptPrintFeedback('Desain struk Epson TM-U220 berhasil diperbarui!');
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

  // Camera Barcode Scanner
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Input Focus Refs
  const quickBarcodeInputRef = useRef<HTMLInputElement | null>(null);
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

  // Last Completed Order (for 1-click re-print directly to TM-U220)
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

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

  // Quick Barcode & Product Name Search
  const handleQuickBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = quickBarcodeInput.trim();
    if (!query) return;

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

    // 2. Search by product name
    const nameMatches = products.filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(query.toLowerCase()))
    );

    if (nameMatches.length === 1) {
      addProductToCart(nameMatches[0]);
    } else if (nameMatches.length > 1) {
      setIsSearchDropdownOpen(true);
      setSelectedSearchIndex(0);
    } else {
      alert(`Produk dengan barcode atau nama "${query}" tidak ditemukan di katalog.`);
    }
  };

  // Table Row Edits
  const handleRowQtyChange = (rowIndex: number, deltaOrValue: number, isAbsolute: boolean = false) => {
    setRows((prev) => {
      const updated = [...prev];
      const r = updated[rowIndex];
      if (!r) return prev;
      let newQty = isAbsolute ? deltaOrValue : r.quantity + deltaOrValue;
      if (newQty < 1) newQty = 1;
      const sub = Math.max(0, r.sellingPrice * newQty - r.discountAmount);
      updated[rowIndex] = {
        ...r,
        quantity: newQty,
        subtotal: sub,
        baseQuantity: newQty * (r.conversionMultiplier || 1),
      };
      return updated;
    });
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

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
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
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
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
  };

  // Reset Transaction
  const handleResetTransaction = () => {
    if (validRows.length > 0) {
      if (!confirm('Kosongkan keranjang transaksi saat ini?')) return;
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
    setCashReceived(0);
    setUseCustomerPoints(false);
    quickBarcodeInputRef.current?.focus();
  };

  // ===============================================================
  // 1. DIRECT PRINT TO EPSON TM-U220 (NO MODAL / MODUL PANGGILAN)
  // ===============================================================
  const handleFinalizeSale = () => {
    if (validRows.length === 0) {
      alert('Mohon masukkan minimal 1 barang sebelum menyelesaikan transaksi.');
      quickBarcodeInputRef.current?.focus();
      return;
    }

    if (paymentMethod === 'cash' && cashReceived < grandTotal) {
      alert(`Uang tunai diterima (Rp ${cashReceived.toLocaleString('id-ID')}) kurang dari total belanja (Rp ${grandTotal.toLocaleString('id-ID')}).`);
      cashInputRef.current?.focus();
      return;
    }

    // A. Potong Stok Fisik Produk
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

    // B. Update Poin & Transaksi Member
    if (selectedCustomer) {
      const updatedCustomers = customers.map((c) => {
        if (c.id === selectedCustomer.id) {
          const currentPoints = c.points || 0;
          const pointsRemaining = useCustomerPoints ? Math.max(0, currentPoints - pointsDiscountAmount) : currentPoints;
          const newPointsTotal = pointsRemaining + pointsEarned;
          const newSpent = (c.totalSpent || 0) + grandTotal;
          const newOrdersCount = (c.ordersCount || 0) + 1;

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

    // C. Buat Dokumen Transaksi Order
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

    // D. Simpan order terakhir untuk opsi cetak ulang langsung
    setCompletedOrder(newOrder);

    // E. LANGSUNG CETAK KE EPSON TM-U220 VIA IFRAME TANPA MODAL ATAU MODUL LAIN!
    try {
      const html = generateDotMatrixReceiptHtml(
        newOrder, 
        activeReceiptConfig, 
        cashierName, 
        { cashReceived: paymentMethod === 'cash' ? cashReceived : grandTotal, changeAmount }
      );
      printPosReceiptViaIframe(html);
    } catch (err) {
      console.error('Direct TM-U220 print trigger error:', err);
    }

    // F. Tampilkan feedback ringkas di status bar
    setReceiptPrintFeedback(
      `✅ Transaksi #${orderNum} Selesai (${formatRupiah(grandTotal)}) • Struk langsung dikirim ke printer Epson TM-U220.`
    );
    setTimeout(() => setReceiptPrintFeedback(null), 6000);

    // G. Reset keranjang belanja kasir seketika & kembalikan fokus ke scan barcode
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
    setCashReceived(0);
    setUseCustomerPoints(false);

    setTimeout(() => {
      quickBarcodeInputRef.current?.focus();
    }, 80);
  };

  // Direct Re-Print last order to Epson TM-U220 without modal
  const handleDirectReprintLastOrder = async () => {
    if (!completedOrder) {
      alert('Belum ada transaksi sebelumnya untuk dicetak ulang.');
      return;
    }
    try {
      const html = generateDotMatrixReceiptHtml(
        completedOrder, 
        activeReceiptConfig, 
        cashierName, 
        { cashReceived, changeAmount }
      );
      await printPosReceiptViaIframe(html);
      setReceiptPrintFeedback(`🖨️ Struk #${completedOrder.orderNumber} kembali dicetak ke printer Epson TM-U220!`);
      setTimeout(() => setReceiptPrintFeedback(null), 4000);
    } catch (err) {
      console.error('Direct reprint error:', err);
    }
  };

  // Quick cash helper
  const handleSetQuickCash = (amount: number) => {
    setCashReceived(amount);
  };

  // Hold & Recall Bill
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
    setCashReceived(0);
    setReceiptPrintFeedback(`Transaksi berhasil ditahan (${newHold.items.length} macam barang). Siap melayani pelanggan berikutnya.`);
    setTimeout(() => setReceiptPrintFeedback(null), 4000);
    quickBarcodeInputRef.current?.focus();
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

  // Quick Customer Register
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
      points: 500,
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
    setReceiptPrintFeedback(`Member baru "${newCust.name}" berhasil didaftarkan! (+500 poin)`);
    setTimeout(() => setReceiptPrintFeedback(null), 3500);
  };

  // Keyboard Shortcuts (F2, F4, F8, F9, F10, F12, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Focus Barcode / Search
      if (e.key === 'F2') {
        e.preventDefault();
        quickBarcodeInputRef.current?.focus();
        quickBarcodeInputRef.current?.select();
      }
      // F4: Pilih Member
      else if (e.key === 'F4') {
        e.preventDefault();
        setIsCustomerModalOpen((prev) => !prev);
      }
      // F8: Tahan / Panggil
      else if (e.key === 'F8') {
        e.preventDefault();
        setIsHeldModalOpen((prev) => !prev);
      }
      // F9: Uang Pas
      else if (e.key === 'F9') {
        e.preventDefault();
        if (grandTotal > 0) {
          setCashReceived(grandTotal);
        }
      }
      // F10: Cetak Ulang Terakhir Langsung ke TM-U220
      else if (e.key === 'F10') {
        e.preventDefault();
        handleDirectReprintLastOrder();
      }
      // F12: Bayar & Cetak Langsung
      else if (e.key === 'F12') {
        e.preventDefault();
        handleFinalizeSale();
      }
      // Escape: Tutup dropdown / modal
      else if (e.key === 'Escape') {
        if (isSearchDropdownOpen) {
          setIsSearchDropdownOpen(false);
        } else if (isCustomerModalOpen) {
          setIsCustomerModalOpen(false);
        } else if (isHeldModalOpen) {
          setIsHeldModalOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grandTotal, isSearchDropdownOpen, isCustomerModalOpen, isHeldModalOpen, completedOrder, activeReceiptConfig, cashierName, cashReceived, changeAmount, validRows]);

  // Camera Barcode Scanner
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
              const matchedProd = products.find(
                (p) =>
                  p.barcode === code ||
                  p.id === code ||
                  p.unitConversions?.some((uc) => uc.barcode === code)
              );
              if (matchedProd) {
                addProductToCart(matchedProd, code);
              }
              clearInterval(scanInterval);
            }
          } catch {}
        }, 300);
      }
    } catch {
      alert('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.');
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

  return (
    <div className="flex flex-col h-full bg-stone-100 text-stone-900 font-sans select-none overflow-hidden">
      {/* ============================================================ */}
      {/* 1. TOP BAR: KASIR & PRINTER TM-U220 STATUS (SIMPLE & CLEAN)  */}
      {/* ============================================================ */}
      <header className="bg-white border-b border-stone-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
            <ScanBarcode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-stone-900 tracking-tight">
                POS Kasir Minimarket
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </span>
            </div>
            <div className="text-xs text-stone-500 flex items-center gap-2">
              <span>{cashierName}</span>
              <span>•</span>
              <span className="font-semibold text-stone-700">{activeStore.name}</span>
            </div>
          </div>
        </div>

        {/* PRINTER TM-U220 DIRECT STATUS CHIP */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <Printer className="w-3.5 h-3.5 text-emerald-700" />
            <span>Epson TM-U220 (70mm Dot Matrix) • Cetak Langsung</span>
          </div>

          {/* Quick 1-Click Re-print button */}
          {completedOrder && (
            <button
              onClick={handleDirectReprintLastOrder}
              className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Cetak ulang struk sebelumnya ke TM-U220 tanpa popup [F10]"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cetak Ulang (F10)</span>
            </button>
          )}

          {/* Offline Sync Status */}
          <OfflineSyncBadge />

          {/* Held Bills Button */}
          <button
            onClick={() => setIsHeldModalOpen(true)}
            className="relative px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Panggil Transaksi Ditahan [F8]"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Tahan ({heldTransactions.length}) [F8]</span>
            {heldTransactions.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">
                {heldTransactions.length}
              </span>
            )}
          </button>

          {/* Reset Bill */}
          <button
            onClick={handleResetTransaction}
            className="px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Kosongkan Keranjang Kasir [Esc]"
          >
            <RotateCcw className="w-3.5 h-3.5 text-red-500" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Receipt Editor Settings Button */}
          <button
            onClick={() => setIsReceiptEditorModalOpen(true)}
            className="p-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 transition-colors"
            title="Pengaturan Format Struk TM-U220"
          >
            <Sliders className="w-4 h-4 text-stone-600" />
          </button>

          {/* Close button if modal */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 cursor-pointer"
              title="Tutup Kasir"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* POS Notification Feedback Banner */}
      {receiptPrintFeedback && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs animate-slideDown shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{receiptPrintFeedback}</span>
          </div>
          <button onClick={() => setReceiptPrintFeedback(null)} className="text-white hover:text-emerald-200 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. MAIN 2-COLUMN PRACTICAL & FAST CASHIER WORKSPACE          */}
      {/* ============================================================ */}
      <div className="flex-1 p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-0 overflow-y-auto">
        
        {/* LEFT COLUMN: SCANNER & CART ITEMS TABLE (7 or 8 COLS) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3 min-h-0">
          
          {/* SEARCH & BARCODE SCANNER BAR (AUTOFOCUS & FAST) */}
          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-stone-200 shadow-2xs shrink-0 relative" ref={searchDropdownRef}>
            <form onSubmit={handleQuickBarcodeSubmit} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  placeholder="Scan Barcode atau Ketik Nama Produk... [F2]"
                  className="w-full pl-10 pr-24 py-2.5 bg-stone-50 hover:bg-stone-100/80 focus:bg-white border-2 border-emerald-400 focus:border-emerald-600 rounded-xl text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-3 focus:ring-emerald-100 transition-all"
                  autoFocus
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {quickBarcodeInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickBarcodeInput('');
                        setIsSearchDropdownOpen(false);
                      }}
                      className="p-1 hover:bg-stone-200 text-stone-400 hover:text-stone-600 rounded-md text-xs cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Enter
                  </button>
                </div>
              </div>

              {/* Camera Scanner Trigger */}
              <button
                type="button"
                onClick={startCameraScan}
                className="p-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-stone-700 text-xs font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                title="Scan Barcode via Kamera HP"
              >
                <Camera className="w-4 h-4 text-emerald-600" />
                <span className="hidden md:inline">Kamera</span>
              </button>
            </form>

            {/* Instant Autocomplete Dropdown Popover */}
            {isSearchDropdownOpen && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 overflow-hidden divide-y divide-stone-100 max-h-72 overflow-y-auto">
                <div className="px-3 py-1.5 bg-stone-50 text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Pencarian ({searchResults.length} barang)</span>
                  <span className="text-[10px] text-stone-400 font-normal">Gunakan ↑ ↓ lalu Enter untuk memilih</span>
                </div>
                {searchResults.map((prod, sIdx) => {
                  const isSelected = sIdx === selectedSearchIndex;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => addProductToCart(prod)}
                      onMouseEnter={() => setSelectedSearchIndex(sIdx)}
                      className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-stone-50 text-stone-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {prod.image ? (
                          <img src={prod.image} alt={prod.name} className="w-8 h-8 rounded-lg object-cover bg-stone-100 shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 text-stone-400">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs truncate text-stone-900">{prod.name}</div>
                          <div className="text-[10px] text-stone-500 flex items-center gap-1.5">
                            <span className="font-mono bg-stone-100 px-1 rounded">{prod.barcode || prod.id.slice(-6)}</span>
                            <span>•</span>
                            <span>Stok: {prod.stock || 0} {prod.unit || 'Pcs'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 font-mono text-xs text-emerald-700 font-black">
                        {formatRupiah(prod.price)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CAMERA SCANNER POPUP IF ACTIVE */}
          {isCameraOpen && (
            <div className="bg-stone-900 p-3 rounded-2xl border border-stone-700 relative text-center text-white shrink-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold">Arahkan Barcode ke Kamera</span>
                <button onClick={stopCameraScan} className="text-stone-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative w-full max-w-sm mx-auto h-40 bg-black rounded-xl overflow-hidden border border-emerald-500/50">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_red] animate-pulse pointer-events-none" />
              </div>
            </div>
          )}

          {/* SHOPPING CART TABLE (FAST, CLEAN, COMPACT) */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs flex-1 flex flex-col min-h-[300px] overflow-hidden">
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-center">No</th>
                    <th className="px-3 py-2.5">Barang / Barcode</th>
                    <th className="px-2 py-2.5 w-24">Satuan</th>
                    <th className="px-2 py-2.5 w-28 text-center">Qty</th>
                    <th className="px-2 py-2.5 w-24 text-right">Harga (Rp)</th>
                    <th className="px-2 py-2.5 w-20 text-right">Diskon</th>
                    <th className="px-3 py-2.5 w-28 text-right">Subtotal</th>
                    <th className="px-2 py-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {rows.map((row, index) => {
                    const prod = products.find((p) => p.id === row.productId);
                    const unitOpts = prod ? getProductUnitOptions(prod) : [];

                    if (!row.productId) {
                      return (
                        <tr key={row.id} className="hover:bg-stone-50/50">
                          <td className="px-3 py-2 text-center text-stone-400 font-mono">{index + 1}</td>
                          <td colSpan={7} className="px-3 py-2">
                            <select
                              value=""
                              onChange={(e) => {
                                const p = products.find((it) => it.id === e.target.value);
                                if (p) addProductToCart(p);
                              }}
                              className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-500 focus:bg-white focus:outline-hidden"
                            >
                              <option value="">+ Cari atau Pilih Produk dari Katalog...</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.barcode || 'No barcode'}) - {formatRupiah(p.price)}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={row.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="px-3 py-2 text-center text-stone-400 font-mono font-bold">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-bold text-stone-900 text-xs sm:text-sm truncate max-w-[220px]">
                            {row.productName}
                          </div>
                          <div className="text-[10px] text-stone-400 font-mono flex items-center gap-1.5">
                            <span>{row.barcode || 'Tanpa Barcode'}</span>
                            {prod?.stock !== undefined && (
                              <span className={prod.stock > 5 ? 'text-stone-400' : 'text-amber-600 font-bold'}>
                                (Sisa: {prod.stock} {prod.unit || 'Pcs'})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          {unitOpts.length > 1 ? (
                            <select
                              value={row.unit}
                              onChange={(e) => handleRowUnitChange(index, e.target.value)}
                              className="w-full px-1.5 py-1 bg-stone-50 border border-stone-200 rounded-md text-[11px] font-bold"
                            >
                              {unitOpts.map((opt) => (
                                <option key={opt.unitName} value={opt.unitName}>
                                  {opt.unitName} (x{opt.multiplier})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-mono text-[11px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">
                              {row.unit}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="inline-flex items-center border border-stone-300 rounded-lg overflow-hidden bg-stone-50">
                            <button
                              type="button"
                              onClick={() => handleRowQtyChange(index, -1)}
                              className="px-2 py-1 hover:bg-stone-200 text-stone-600 font-bold"
                              title="Kurangi Qty"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => handleRowQtyChange(index, parseInt(e.target.value) || 1, true)}
                              className="w-10 text-center font-mono font-black text-xs bg-white py-0.5 border-x border-stone-200 focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleRowQtyChange(index, 1)}
                              className="px-2 py-1 hover:bg-stone-200 text-stone-600 font-bold"
                              title="Tambah Qty"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right font-mono">
                          <input
                            type="number"
                            min="0"
                            value={row.sellingPrice}
                            onChange={(e) => handleRowPriceChange(index, parseInt(e.target.value) || 0)}
                            className="w-20 text-right font-mono text-xs px-1 py-0.5 border border-stone-200 rounded focus:bg-white focus:outline-hidden"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-mono">
                          <input
                            type="number"
                            min="0"
                            value={row.discountAmount || ''}
                            placeholder="0"
                            onChange={(e) => handleRowDiscountChange(index, parseInt(e.target.value) || 0)}
                            className="w-16 text-right font-mono text-xs px-1 py-0.5 border border-stone-200 rounded focus:bg-white focus:outline-hidden"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-black text-emerald-700 text-xs sm:text-sm">
                          {formatRupiah(row.subtotal)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            className="p-1 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded transition-colors"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Bottom Control Bar */}
            <div className="bg-stone-50 border-t border-stone-200 px-3 py-2 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-3 text-stone-600 font-medium">
                <span>Total: <strong className="text-stone-900 font-mono">{validRows.length}</strong> jenis</span>
                <span>•</span>
                <span>Qty: <strong className="text-stone-900 font-mono">{totalQtyUnits}</strong> item</span>
                {totalItemDiscounts > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-rose-600 font-bold">Hemat: {formatRupiah(totalItemDiscounts)}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddBlankRow}
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-xs font-bold text-stone-700 flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-emerald-600" />
                  <span>+ Baris</span>
                </button>
                <button
                  type="button"
                  onClick={handleHoldTransaction}
                  disabled={validRows.length === 0}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold text-amber-800 flex items-center gap-1 disabled:opacity-40"
                  title="Tahan transaksi saat ini [F8]"
                >
                  <PauseCircle className="w-3 h-3 text-amber-600" />
                  <span>Tahan [F8]</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CASHIER DISPLAY & FAST PAYMENT (4 or 5 COLS) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 min-h-0">
          
          {/* 1. THE GIANT HIGH-CONTRAST CASHIER TOTAL SCREEN */}
          <div className="bg-stone-950 text-emerald-400 border-2 border-stone-800 rounded-2xl p-4 shadow-xl shrink-0">
            <div className="flex justify-between items-center text-[11px] font-mono text-stone-400 uppercase tracking-widest pb-1 border-b border-stone-800/80">
              <span>TOTAL BELANJA</span>
              <span>{validRows.length} BARANG • {totalQtyUnits} QTY</span>
            </div>
            
            <div className="text-4xl sm:text-5xl font-mono font-black text-emerald-400 tracking-tight mt-2 leading-none drop-shadow-[0_0_18px_rgba(52,211,153,0.4)]">
              {formatRupiah(grandTotal)}
            </div>

            {/* Live Kembalian indicator */}
            {paymentMethod === 'cash' && (
              <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex items-center justify-between">
                <span className="text-xs font-mono text-stone-400 uppercase">KEMBALIAN:</span>
                <span className={`text-xl sm:text-2xl font-mono font-black ${changeAmount > 0 ? 'text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'text-stone-500'}`}>
                  {formatRupiah(changeAmount)}
                </span>
              </div>
            )}
          </div>

          {/* 2. CUSTOMER & LOYALTY MEMBER BAR (COMPACT) */}
          <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-sky-600" />
                <span>Pelanggan / Member</span>
              </span>
              <button
                onClick={() => setIsNewCustomerModalOpen(true)}
                className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Daftar Baru</span>
              </button>
            </div>

            {selectedCustomer ? (
              <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-2.5 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-bold text-stone-900 text-xs truncate flex items-center gap-1.5">
                    <span>{selectedCustomer.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      {selectedCustomer.tier}
                    </span>
                  </div>
                  <div className="text-[10px] text-amber-700 font-bold font-mono">
                    Saldo: {selectedCustomer.points.toLocaleString('id-ID')} Poin
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedCustomer.points > 0 && (
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-stone-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useCustomerPoints}
                        onChange={(e) => setUseCustomerPoints(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Pakai Poin</span>
                    </label>
                  )}
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="p-1 text-stone-400 hover:text-red-500 rounded"
                    title="Ganti ke Pelanggan Umum"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-xl p-2">
                <span className="text-xs text-stone-600 font-medium">Pelanggan Umum (Non-Member)</span>
                <button
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-xs font-bold text-sky-700 shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  <Search className="w-3 h-3 text-sky-600" />
                  <span>Pilih [F4]</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. PAYMENT METHOD TABS (FAST TOGGLE) */}
          <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs shrink-0">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Metode Pembayaran</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl mb-3">
              {[
                { id: 'cash' as PaymentMethod, label: 'Tunai', icon: <Banknote className="w-3.5 h-3.5" /> },
                { id: 'qris' as PaymentMethod, label: 'QRIS', icon: <QrCode className="w-3.5 h-3.5" /> },
                { id: 'transfer' as PaymentMethod, label: 'Debit/EDC', icon: <CreditCard className="w-3.5 h-3.5" /> },
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
                  className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                    paymentMethod === m.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-white'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* CASH INPUT & QUICK CASH PRESET BUTTONS */}
            {paymentMethod === 'cash' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
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
                      className="w-full pl-8 pr-2 py-1.5 bg-stone-50 border-2 border-emerald-300 rounded-xl text-base font-mono font-bold text-stone-900 focus:bg-white focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* Quick Cash Presets */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetQuickCash(grandTotal)}
                    className="col-span-1 px-2 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold font-mono cursor-pointer"
                    title="Bayar Uang Pas [F9]"
                  >
                    Uang Pas [F9]
                  </button>
                  {[10000, 20000, 50000, 100000, 200000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleSetQuickCash(amt)}
                      className="px-1.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-mono font-semibold cursor-pointer"
                    >
                      {amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>
            ) : paymentMethod === 'qris' ? (
              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-center">
                <div className="w-16 h-16 mx-auto bg-white p-1 rounded-lg border border-stone-300 shadow-2xs flex items-center justify-center">
                  <QrCode className="w-14 h-14 text-stone-800" />
                </div>
                <div className="text-[11px] font-bold text-stone-700 mt-1">QRIS Standar Nasional</div>
              </div>
            ) : (
              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-center text-xs text-stone-600">
                <p className="font-bold">Mesin EDC / Transfer Bank</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Lakukan swipe/tap kartu di EDC kasir</p>
              </div>
            )}
          </div>

          {/* 4. THE GIANT ACTION BUTTON: BAYAR & LANGSUNG PRINT KE TM-U220 */}
          <div className="bg-stone-900 text-white p-4 rounded-2xl border border-stone-800 shadow-lg flex flex-col justify-between shrink-0">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Subtotal ({validRows.length} item):</span>
                <span className="font-mono">{formatRupiah(subtotalBeforeDiscount)}</span>
              </div>
              {totalItemDiscounts > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Diskon Hemat:</span>
                  <span className="font-mono">-{formatRupiah(totalItemDiscounts)}</span>
                </div>
              )}
              {pointsDiscountAmount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Potongan Poin:</span>
                  <span className="font-mono">-{formatRupiah(pointsDiscountAmount)}</span>
                </div>
              )}
            </div>

            {/* BIG 1-CLICK FINALIZE & DIRECT PRINT BUTTON */}
            <button
              type="button"
              onClick={handleFinalizeSale}
              disabled={validRows.length === 0}
              className="mt-3.5 w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-xl font-black text-sm tracking-wide flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <div className="flex items-center gap-2 text-base font-extrabold">
                <Printer className="w-5 h-5 text-emerald-200" />
                <span>BAYAR & CETAK TM-U220 [F12]</span>
              </div>
              <span className="text-[10px] font-normal text-emerald-100 tracking-normal opacity-90">
                Langsung print ke printer tanpa modul lain
              </span>
            </button>
          </div>

          {/* 5. SHORTCUT HELPER CHIP */}
          <div className="px-3 py-2 bg-white rounded-xl border border-stone-200 text-[11px] text-stone-500 flex flex-wrap items-center justify-between gap-1 shadow-2xs shrink-0">
            <span><strong className="text-stone-700">F2</strong> Scan</span>
            <span><strong className="text-stone-700">F4</strong> Member</span>
            <span><strong className="text-stone-700">F8</strong> Tahan</span>
            <span><strong className="text-stone-700">F9</strong> Uang Pas</span>
            <span><strong className="text-stone-700">F10</strong> Print Ulang</span>
            <span><strong className="text-stone-700">F12</strong> Bayar</span>
          </div>

        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: PILIH PELANGGAN / MEMBER (F4)                         */}
      {/* ============================================================ */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200">
            <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-sm sm:text-base text-stone-900">Pilih Member Toko (F4)</h3>
              </div>
              <button onClick={() => setIsCustomerModalOpen(false)} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-stone-200 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="Cari nama pelanggan, nomor WhatsApp, atau nomor member..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-3 flex-1 overflow-y-auto divide-y divide-stone-100">
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
                    className="py-2.5 px-3 hover:bg-sky-50 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-bold text-stone-900 text-xs flex items-center gap-2">
                        <span>{cust.name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          {cust.tier}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                        {cust.phone} • {cust.memberNumber}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-amber-600">
                        {cust.points.toLocaleString('id-ID')} Poin
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setIsCustomerModalOpen(false);
                  quickBarcodeInputRef.current?.focus();
                }}
                className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 font-bold"
              >
                Gunakan Pelanggan Umum
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCustomerModalOpen(false);
                  setIsNewCustomerModalOpen(true);
                }}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold"
              >
                + Tambah Member Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DAFTAR MEMBER BARU CEPAT                              */}
      {/* ============================================================ */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-200">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <h3 className="font-bold text-sm text-stone-900">Registrasi Member Baru</h3>
              <button onClick={() => setIsNewCustomerModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleQuickRegisterCustomer} className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Nama Lengkap Member:</label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Contoh: Ibu Rina Melati"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">No. WhatsApp / HP:</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Kota / Domisili:</label>
                <input
                  type="text"
                  value={newCustCity}
                  onChange={(e) => setNewCustCity(e.target.value)}
                  placeholder="Jakarta"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="px-3 py-2 border border-stone-300 rounded-xl font-bold text-stone-600 hover:bg-stone-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Simpan & Pilih Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DAFTAR TRANSAKSI DITAHAN (HOLD / RECALL - F8)         */}
      {/* ============================================================ */}
      {isHeldModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200">
            <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm sm:text-base text-stone-900">Transaksi Ditahan (Hold Bills)</h3>
              </div>
              <button onClick={() => setIsHeldModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
              {heldTransactions.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                  Tidak ada transaksi yang sedang ditahan.
                </div>
              ) : (
                heldTransactions.map((held) => (
                  <div
                    key={held.id}
                    className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-stone-900">
                        {held.customer ? held.customer.name : 'Pelanggan Umum'} ({held.items.length} macam barang)
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                        Ditahan jam {held.heldAt} • Total: <strong className="text-emerald-700">{formatRupiah(held.totalAmount)}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRecallTransaction(held)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Panggil</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeldTransactions((prev) => prev.filter((h) => h.id !== held.id))}
                        className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
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
