import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  PurchaseOrder, 
  PurchaseItem, 
  Supplier, 
  Product, 
  Store,
  Order 
} from '../types';
import { formatRupiah } from '../utils/formatters';
import { getProductUnitOptions, formatStockBreakdown } from '../utils/unitConversion';
import { 
  exportPurchaseOrdersToExcel, 
  exportPurchaseItemsDetailToExcel, 
  exportPurchaseOrdersToCsv, 
  exportPurchaseOrdersToJson 
} from '../utils/purchaseExport';
import { ProductPurchaseHistoryModal } from './ProductPurchaseHistoryModal';
import { PurchaseOrderPrintModal } from './PurchaseOrderPrintModal';
import { PurchaseOrderWhatsAppModal } from './PurchaseOrderWhatsAppModal';
import { PurchaseReportModal } from './PurchaseReportModal';
import { 
  savePurchaseToMySql, 
  deletePurchaseFromMySql, 
  savePurchasesToMySql, 
  fetchPurchasesFromMySql,
  fetchMySqlStatus 
} from '../lib/mysqlClientApi';
import { getStoreSlugFromUrl } from '../utils/tenantHelper';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download, 
  Printer, 
  Eye, 
  Trash2, 
  PackagePlus, 
  Building2, 
  Calendar, 
  FileText, 
  TrendingUp,
  CreditCard,
  Layers,
  X,
  Boxes,
  Barcode,
  ScanBarcode,
  Camera,
  CornerDownRight,
  Check,
  RotateCcw,
  Info,
  Sparkles,
  MessageSquare,
  FileSpreadsheet,
  ChevronDown,
  Share2,
  Package,
  Database,
  RefreshCw
} from 'lucide-react';

const COMMON_SUPPLIER_UNITS = [
  'Dus',
  'Karton',
  'Pak',
  'Bal',
  'Sak',
  'Karung',
  'Pcs',
  'Pouch',
  'Kg',
  'Liter',
  'Lusin',
  'Kodi',
  'Renceng',
  'Botol',
  'Kaleng',
  'Boks',
  'Roll',
  'Strip',
];

interface PurchaseManagerProps {
  purchases: PurchaseOrder[];
  suppliers: Supplier[];
  products: Product[];
  stores: Store[];
  orders?: Order[];
  onUpdatePurchases: (purchases: PurchaseOrder[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  canEdit?: boolean;
}

export const PurchaseManager: React.FC<PurchaseManagerProps> = ({
  purchases,
  suppliers,
  products,
  stores,
  orders = [],
  onUpdatePurchases,
  onUpdateProducts,
  canEdit = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('all');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPurchaseDetail, setSelectedPurchaseDetail] = useState<PurchaseOrder | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Print & WhatsApp Modal states
  const [selectedPrintPo, setSelectedPrintPo] = useState<PurchaseOrder | null>(null);
  const [selectedWhatsAppPo, setSelectedWhatsAppPo] = useState<PurchaseOrder | null>(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Database MySQL Sync Status
  const [isDbConnected, setIsDbConnected] = useState(true);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [dbNotification, setDbNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Cek koneksi MySQL saat komponen dimuat
  useEffect(() => {
    fetchMySqlStatus().then(st => {
      setIsDbConnected(Boolean(st.connected));
    }).catch(() => {
      setIsDbConnected(false);
    });
  }, []);

  // Sinkronisasi manual seluruh pesanan pembelian ke MySQL
  const handleSyncToDatabase = async () => {
    setIsSyncingDb(true);
    try {
      const slug = getStoreSlugFromUrl();
      const success = await savePurchasesToMySql(purchases, slug);
      if (success) {
        setDbNotification({
          type: 'success',
          message: `✓ Berhasil menyinkronkan ${purchases.length} faktur pembelian ke Database MySQL!`,
        });
        setIsDbConnected(true);
      } else {
        setDbNotification({
          type: 'error',
          message: 'Gagal menyinkronkan data ke MySQL. Coba periksa koneksi database.',
        });
      }
    } catch (err: any) {
      setDbNotification({
        type: 'error',
        message: `Error sinkronisasi: ${err.message || 'Koneksi terputus'}`,
      });
    } finally {
      setIsSyncingDb(false);
      setTimeout(() => setDbNotification(null), 5000);
    }
  };

  // Item Info & History Modal state
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<Product | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTargetRowIndex, setHistoryTargetRowIndex] = useState<number | null>(null);

  // Form states for creating Purchase
  const [supplierId, setSupplierId] = useState('');
  const [storeId, setStoreId] = useState(stores[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'tempo'>('tempo');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'partial'>('unpaid');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [autoUpdateCostPrice, setAutoUpdateCostPrice] = useState(true);
  const [immediatelyReceiveStock, setImmediatelyReceiveStock] = useState(true);

  // Helper to create an empty draft row for inline table input
  const createEmptyRow = (suffix?: string): PurchaseItem => ({
    id: `pitem_${Date.now()}_${suffix || Math.random().toString(36).substr(2, 5)}`,
    productId: '',
    productName: '',
    barcode: '',
    unit: 'Pcs',
    conversionMultiplier: 1,
    baseUnit: 'Pcs',
    quantity: 1,
    costPrice: 0,
    subtotal: 0,
    baseQuantity: 1,
  });

  // Items directly inside the Purchase Order Table
  const [formItems, setFormItems] = useState<PurchaseItem[]>([]);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [isQuickSearchFocused, setIsQuickSearchFocused] = useState(false);
  const [barcodeFeedback, setBarcodeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Input refs for seamless keyboard navigation across rows
  const barcodeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const qtyInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const priceInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const quickSearchInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Subtle POS scanner beep using Web Audio API
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // Audio context not allowed or unsupported
    }
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalOrders = purchases.length;
    const totalSpend = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalItemsReceived = purchases
      .filter(p => p.status === 'received')
      .reduce((sum, p) => sum + p.totalQuantity, 0);
    const unpaidTempo = purchases
      .filter(p => p.paymentStatus !== 'paid' && p.status !== 'cancelled')
      .reduce((sum, p) => sum + p.totalAmount, 0);

    return { totalOrders, totalSpend, totalItemsReceived, unpaidTempo };
  }, [purchases]);

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const matchSearch = 
        p.purchaseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.items.some(it => it.productName.toLowerCase().includes(searchQuery.toLowerCase()) || it.unit.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchSupplier = selectedSupplierFilter === 'all' || p.supplierId === selectedSupplierFilter;
      const matchStatus = selectedStatusFilter === 'all' || p.status === selectedStatusFilter;
      const matchPayment = selectedPaymentFilter === 'all' || p.paymentStatus === selectedPaymentFilter;

      return matchSearch && matchSupplier && matchStatus && matchPayment;
    });
  }, [purchases, searchQuery, selectedSupplierFilter, selectedStatusFilter, selectedPaymentFilter]);

  // Live matching products for the Quick Search & Barcode Input
  // Searches both Product Name AND Barcode of Pcs AND Barcode of Dusan/Karton!
  const quickSearchResults = useMemo(() => {
    const q = quickSearchQuery.trim().toLowerCase();
    if (!q) return [];

    return products.filter(p => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchPcsBarcode = p.barcode && p.barcode.toLowerCase().includes(q);
      const matchDusBarcode = p.unitConversions?.some(uc => uc.barcode && uc.barcode.toLowerCase().includes(q));
      const matchBrand = p.brand && p.brand.toLowerCase().includes(q);
      const matchCode = p.itemCode && p.itemCode.toLowerCase().includes(q);
      return matchName || matchPcsBarcode || matchDusBarcode || matchBrand || matchCode;
    }).slice(0, 8);
  }, [quickSearchQuery, products]);

  // Handle open create modal: Initialize with 1 empty row in the table ready for barcode/product input
  const handleOpenCreateModal = () => {
    const defaultSup = suppliers.find(s => s.isActive) || suppliers[0];
    setSupplierId(defaultSup ? defaultSup.id : '');
    setStoreId(stores[0]?.id || '');
    setInvoiceNumber('');
    setOrderDate(new Date().toISOString().slice(0, 10));
    setReceivedDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod(defaultSup?.paymentTerms === 'cash' ? 'cash' : 'tempo');
    setPaymentStatus('unpaid');
    
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setDueDate(d.toISOString().slice(0, 10));

    setNotes('');
    setAutoUpdateCostPrice(true);
    setImmediatelyReceiveStock(true);
    setQuickSearchQuery('');
    setBarcodeFeedback(null);
    setIsCameraScannerOpen(false);

    // Initial draft row in the table
    setFormItems([createEmptyRow('row_0')]);
    setIsCreateModalOpen(true);

    // Auto-focus barcode input of first row
    setTimeout(() => {
      barcodeInputRefs.current[0]?.focus();
    }, 150);
  };

  // Populate row with matched product data (handles both Pcs and Dus/Karton)
  const applyProductToRow = (
    rowIndex: number, 
    prod: Product, 
    customBarcode?: string, 
    customUnit?: string, 
    customMultiplier?: number,
    customPrice?: number
  ) => {
    const baseUnit = prod.unit || 'Pcs';
    const unitToUse = customUnit || baseUnit;
    
    let mult = customMultiplier || 1;
    if (!customMultiplier && customUnit) {
      const opts = getProductUnitOptions(prod);
      const matched = opts.find(o => o.unitName.toLowerCase() === customUnit.toLowerCase());
      if (matched) mult = matched.multiplier || 1;
    }

    const defaultCost = customPrice !== undefined && customPrice > 0 
      ? customPrice 
      : prod.costPrice 
        ? prod.costPrice * mult 
        : Math.round(prod.price * 0.75 * mult);

    setFormItems(prev => {
      const updated = [...prev];
      const currentQty = updated[rowIndex]?.quantity > 0 ? updated[rowIndex].quantity : 1;
      updated[rowIndex] = {
        ...updated[rowIndex],
        productId: prod.id,
        productName: prod.name,
        barcode: customBarcode || prod.barcode || '',
        unit: unitToUse,
        baseUnit: baseUnit,
        conversionMultiplier: mult,
        quantity: currentQty,
        costPrice: defaultCost,
        subtotal: currentQty * defaultCost,
        baseQuantity: currentQty * mult,
      };
      return updated;
    });
  };

  // Add product directly from Quick Search / Barcode Bar
  const insertProductFromQuickSearch = (
    prod: Product, 
    unitName: string, 
    multiplier: number, 
    barcodeStr: string, 
    price: number
  ) => {
    playScanBeep();
    const baseUnit = prod.unit || 'Pcs';
    const cost = price > 0 ? price : prod.costPrice ? prod.costPrice * multiplier : Math.round(prod.price * 0.75 * multiplier);

    setFormItems(prev => {
      const emptyIdx = prev.findIndex(r => !r.productId);
      if (emptyIdx >= 0) {
        const updated = [...prev];
        updated[emptyIdx] = {
          ...updated[emptyIdx],
          productId: prod.id,
          productName: prod.name,
          barcode: barcodeStr || prod.barcode || '',
          unit: unitName,
          baseUnit: baseUnit,
          conversionMultiplier: multiplier,
          quantity: 1,
          costPrice: cost,
          subtotal: cost,
          baseQuantity: multiplier,
        };
        return [...updated, createEmptyRow()];
      } else {
        const newItem: PurchaseItem = {
          id: `pitem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          productId: prod.id,
          productName: prod.name,
          barcode: barcodeStr || prod.barcode || '',
          unit: unitName,
          baseUnit: baseUnit,
          conversionMultiplier: multiplier,
          quantity: 1,
          costPrice: cost,
          subtotal: cost,
          baseQuantity: multiplier,
        };
        return [...prev, newItem, createEmptyRow()];
      }
    });

    setBarcodeFeedback({
      type: 'success',
      message: `✓ [${unitName}] ${prod.name} (${barcodeStr || 'Tanpa Barcode'}) ditambahkan ke tabel PO!`,
    });
    setTimeout(() => setBarcodeFeedback(null), 3000);
    setQuickSearchQuery('');
    setIsQuickSearchFocused(false);

    setTimeout(() => {
      quickSearchInputRef.current?.focus();
    }, 50);
  };

  // 1. INLINE TABLE: Barcode change in row
  const handleRowBarcodeChange = (rowIndex: number, val: string) => {
    setFormItems(prev => {
      const updated = [...prev];
      updated[rowIndex] = {
        ...updated[rowIndex],
        barcode: val,
      };
      return updated;
    });
  };

  // 2. INLINE TABLE: Barcode lookup by Enter or Blur
  // Supports both PCS barcode and DUSAN/KARTON barcode!
  const handleRowBarcodeLookup = (rowIndex: number, barcodeValue?: string) => {
    const rawCode = (barcodeValue ?? formItems[rowIndex]?.barcode ?? '').trim();
    if (!rawCode) {
      qtyInputRefs.current[rowIndex]?.focus();
      return;
    }

    // A. Check if code matches barcode of Dus / Karton unit conversion
    for (const prod of products) {
      if (prod.unitConversions) {
        const matchedUc = prod.unitConversions.find(
          uc => uc.barcode && uc.barcode.toLowerCase() === rawCode.toLowerCase()
        );
        if (matchedUc) {
          playScanBeep();
          const mult = matchedUc.totalMultiplier || 1;
          const cost = matchedUc.price && matchedUc.price > 0 
            ? matchedUc.price 
            : prod.costPrice ? prod.costPrice * mult : Math.round(prod.price * 0.75 * mult);

          applyProductToRow(rowIndex, prod, rawCode, matchedUc.unitName, mult, cost);
          setBarcodeFeedback({
            type: 'success',
            message: `✓ Barcode DUS/Karton terdeteksi: ${prod.name} (Satuan: ${matchedUc.unitName}, isi ${mult} ${prod.unit})`,
          });
          setTimeout(() => setBarcodeFeedback(null), 3000);

          setTimeout(() => {
            qtyInputRefs.current[rowIndex]?.focus();
            qtyInputRefs.current[rowIndex]?.select();
          }, 50);
          return;
        }
      }
    }

    // B. Check if code matches PCS barcode or Product ID
    const matchedProd = products.find(p => 
      (p.barcode && p.barcode.toLowerCase() === rawCode.toLowerCase()) ||
      p.id.toLowerCase() === rawCode.toLowerCase()
    );

    if (matchedProd) {
      playScanBeep();
      applyProductToRow(rowIndex, matchedProd, rawCode, matchedProd.unit || 'Pcs', 1);
      
      setBarcodeFeedback({
        type: 'success',
        message: `✓ Barcode Pcs terdeteksi: ${matchedProd.name} (${rawCode})`,
      });
      setTimeout(() => setBarcodeFeedback(null), 3000);

      setTimeout(() => {
        qtyInputRefs.current[rowIndex]?.focus();
        qtyInputRefs.current[rowIndex]?.select();
      }, 50);
    } else {
      // Check if code matches product name partially
      const nameMatch = products.find(p => p.name.toLowerCase().includes(rawCode.toLowerCase()));
      if (nameMatch) {
        applyProductToRow(rowIndex, nameMatch, nameMatch.barcode, nameMatch.unit || 'Pcs', 1);
        setBarcodeFeedback({
          type: 'success',
          message: `✓ Produk dicocokkan: ${nameMatch.name}`,
        });
        setTimeout(() => setBarcodeFeedback(null), 3000);
      } else {
        setBarcodeFeedback({
          type: 'error',
          message: `Barcode/Nama "${rawCode}" tidak ditemukan. Silakan pilih dari dropdown atau ketik nama barang.`,
        });
        setTimeout(() => setBarcodeFeedback(null), 4000);
      }
    }
  };

  // 3. INLINE TABLE: Product selection via dropdown
  const handleRowProductSelect = (rowIndex: number, prodId: string) => {
    if (!prodId) {
      setFormItems(prev => {
        const updated = [...prev];
        updated[rowIndex] = createEmptyRow();
        return updated;
      });
      return;
    }
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    applyProductToRow(rowIndex, prod, prod.barcode);

    setTimeout(() => {
      qtyInputRefs.current[rowIndex]?.focus();
      qtyInputRefs.current[rowIndex]?.select();
    }, 50);
  };

  // 4. INLINE TABLE: Unit change in row
  const handleRowUnitChange = (rowIndex: number, newUnit: string) => {
    setFormItems(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };
      const prod = products.find(p => p.id === row.productId);
      row.unit = newUnit;

      let mult = 1;
      let cost = row.costPrice;

      if (prod) {
        const opts = getProductUnitOptions(prod);
        const matched = opts.find(o => o.unitName.toLowerCase() === newUnit.toLowerCase());
        if (matched) {
          mult = matched.multiplier || 1;
          row.barcode = matched.barcode || row.barcode;
        } else {
          const lower = newUnit.toLowerCase();
          if (lower === 'lusin') mult = 12;
          else if (lower === 'kodi') mult = 20;
          else if (lower === 'gross') mult = 144;
          else if (lower === 'dus') mult = 24;
          else if (lower === 'karton') mult = 40;
          else if (lower === 'bal') mult = 50;
          else mult = 1;
        }

        // Adjust cost price proportionally to unit multiplier
        const baseCost = prod.costPrice || Math.round(prod.price * 0.75);
        cost = baseCost * mult;
      }

      row.conversionMultiplier = mult;
      row.costPrice = cost;
      row.subtotal = row.quantity * cost;
      row.baseQuantity = row.quantity * mult;
      updated[rowIndex] = row;
      return updated;
    });
  };

  // 5. INLINE TABLE: Multiplier adjustment
  const handleRowMultiplierChange = (rowIndex: number, mult: number) => {
    setFormItems(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };
      row.conversionMultiplier = Math.max(1, mult);
      row.baseQuantity = row.quantity * row.conversionMultiplier;
      updated[rowIndex] = row;
      return updated;
    });
  };

  // 6. INLINE TABLE: Quantity change
  const handleRowQtyChange = (rowIndex: number, qty: number) => {
    setFormItems(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };
      row.quantity = Math.max(1, qty);
      row.subtotal = row.quantity * row.costPrice;
      row.baseQuantity = row.quantity * (row.conversionMultiplier || 1);
      updated[rowIndex] = row;
      return updated;
    });
  };

  // 7. INLINE TABLE: Price change
  const handleRowPriceChange = (rowIndex: number, price: number) => {
    setFormItems(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };
      row.costPrice = Math.max(0, price);
      row.subtotal = row.quantity * row.costPrice;
      updated[rowIndex] = row;
      return updated;
    });
  };

  // Advance to next row
  const advanceToNextRow = (currentIndex: number) => {
    const nextIndex = currentIndex + 1;
    setFormItems(prev => {
      if (nextIndex >= prev.length) {
        return [...prev, createEmptyRow(`row_${nextIndex}`)];
      }
      return prev;
    });

    setTimeout(() => {
      barcodeInputRefs.current[nextIndex]?.focus();
      barcodeInputRefs.current[nextIndex]?.select();
    }, 60);
  };

  // Add a new empty row manually
  const handleAddNewRow = () => {
    setFormItems(prev => {
      const nextIndex = prev.length;
      setTimeout(() => {
        barcodeInputRefs.current[nextIndex]?.focus();
      }, 60);
      return [...prev, createEmptyRow(`row_${nextIndex}`)];
    });
  };

  // Remove row from table
  const handleRemoveRow = (index: number) => {
    setFormItems(prev => {
      if (prev.length <= 1) {
        return [createEmptyRow('row_0')];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  // Handle Quick Search / Barcode form submit (Enter key)
  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = quickSearchQuery.trim();
    if (!query) return;

    // 1. Check if matches Dus/Karton barcode directly
    for (const prod of products) {
      if (prod.unitConversions) {
        const matchedUc = prod.unitConversions.find(
          uc => uc.barcode && uc.barcode.toLowerCase() === query.toLowerCase()
        );
        if (matchedUc) {
          const mult = matchedUc.totalMultiplier || 1;
          const cost = matchedUc.price && matchedUc.price > 0 
            ? matchedUc.price 
            : prod.costPrice ? prod.costPrice * mult : Math.round(prod.price * 0.75 * mult);
          insertProductFromQuickSearch(prod, matchedUc.unitName, mult, query, cost);
          return;
        }
      }
    }

    // 2. Check if matches Pcs barcode directly
    const matchedPcs = products.find(p => p.barcode && p.barcode.toLowerCase() === query.toLowerCase());
    if (matchedPcs) {
      insertProductFromQuickSearch(
        matchedPcs, 
        matchedPcs.unit || 'Pcs', 
        1, 
        query, 
        matchedPcs.costPrice || Math.round(matchedPcs.price * 0.75)
      );
      return;
    }

    // 3. Check if first result from name search
    if (quickSearchResults.length > 0) {
      const topMatch = quickSearchResults[0];
      const dusOpt = topMatch.unitConversions?.[0];
      // Default to PCS or first unit
      insertProductFromQuickSearch(
        topMatch, 
        topMatch.unit || 'Pcs', 
        1, 
        topMatch.barcode, 
        topMatch.costPrice || Math.round(topMatch.price * 0.75)
      );
      return;
    }

    setBarcodeFeedback({
      type: 'error',
      message: `Tidak ada produk yang cocok dengan "${query}". Coba ketik sebagian nama barang atau scan barcode.`,
    });
    setTimeout(() => setBarcodeFeedback(null), 3500);
  };

  // Open Item Info & History Modal for a product
  const handleOpenItemHistory = (productOrId: Product | string, rowIndex?: number) => {
    const prod = typeof productOrId === 'string' ? products.find(p => p.id === productOrId) : productOrId;
    if (prod) {
      setSelectedHistoryProduct(prod);
      setHistoryTargetRowIndex(rowIndex !== undefined ? rowIndex : null);
      setIsHistoryModalOpen(true);
    }
  };

  // Handle Apply Recommendation from Item History Modal
  const handleApplyOrderRecommendation = (params: {
    productId: string;
    productName: string;
    barcode: string;
    unit: string;
    conversionMultiplier: number;
    quantity: number;
    costPrice: number;
  }) => {
    const prod = products.find(p => p.id === params.productId);
    if (!prod) return;

    if (historyTargetRowIndex !== null && historyTargetRowIndex >= 0) {
      // Update targeted row
      setFormItems(prev => {
        const updated = [...prev];
        updated[historyTargetRowIndex] = {
          ...updated[historyTargetRowIndex],
          productId: prod.id,
          productName: prod.name,
          barcode: params.barcode || prod.barcode || '',
          unit: params.unit,
          baseUnit: prod.unit || 'Pcs',
          conversionMultiplier: params.conversionMultiplier,
          quantity: params.quantity,
          costPrice: params.costPrice,
          subtotal: params.quantity * params.costPrice,
          baseQuantity: params.quantity * params.conversionMultiplier,
        };
        return updated;
      });
    } else {
      // Insert into draft or append
      insertProductFromQuickSearch(
        prod, 
        params.unit, 
        params.conversionMultiplier, 
        params.barcode, 
        params.costPrice
      );
    }

    setBarcodeFeedback({
      type: 'success',
      message: `✓ Rekomendasi order diterapkan: ${params.quantity} ${params.unit} untuk ${prod.name}!`,
    });
    setTimeout(() => setBarcodeFeedback(null), 3000);
  };

  // Camera Barcode Scanner setup
  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;
    let intervalId: any = null;

    if (isCameraScannerOpen) {
      setCameraError(null);
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          if (!active) {
            s.getTracks().forEach(t => t.stop());
            return;
          }
          stream = s;
          cameraStreamRef.current = s;
          if (cameraVideoRef.current) {
            cameraVideoRef.current.srcObject = s;
            cameraVideoRef.current.play().catch(() => {});
          }

          if ('BarcodeDetector' in window) {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']
            });

            intervalId = setInterval(async () => {
              if (cameraVideoRef.current && cameraVideoRef.current.readyState >= 2) {
                try {
                  const barcodes = await barcodeDetector.detect(cameraVideoRef.current);
                  if (barcodes && barcodes.length > 0) {
                    const rawVal = barcodes[0].rawValue;
                    if (rawVal) {
                      setQuickSearchQuery(rawVal);
                      const fakeEvent = { preventDefault: () => {} } as any;
                      setTimeout(() => {
                        handleQuickSearchSubmit(fakeEvent);
                      }, 50);
                      clearInterval(intervalId);
                      setTimeout(() => {
                        setIsCameraScannerOpen(false);
                      }, 800);
                    }
                  }
                } catch {
                  // Frame detector error ignored
                }
              }
            }, 300);
          }
        })
        .catch(err => {
          setCameraError('Kamera tidak dapat diakses atau izin ditolak. Anda tetap dapat mengetik barcode manual di tabel.');
        });
    }

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
    };
  }, [isCameraScannerOpen]);

  // Save Purchase Order & Automatically Increase Stock
  const handleSavePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = formItems.filter(item => item.productId && item.productName && item.quantity > 0);

    if (validItems.length === 0) {
      alert('Mohon isi minimal 1 baris barang pembelian di tabel (masukkan barcode atau pilih produk).');
      return;
    }

    const sup = suppliers.find(s => s.id === supplierId);
    const targetStore = stores.find(st => st.id === storeId) || stores[0];

    const subtotal = validItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalQty = validItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = subtotal;

    const purchaseNum = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(purchases.length + 1).padStart(3, '0')}`;

    const newPurchase: PurchaseOrder = {
      id: `po_${Date.now()}`,
      purchaseNumber: purchaseNum,
      invoiceNumber: invoiceNumber.trim() || undefined,
      supplierId: sup ? sup.id : 'sup_general',
      supplierName: sup ? sup.name : 'Supplier Umum',
      storeId: targetStore?.id || 'store_1',
      storeName: targetStore?.name || 'Toko Utama',
      orderDate,
      receivedDate: immediatelyReceiveStock ? receivedDate : undefined,
      items: validItems,
      totalQuantity: totalQty,
      subtotal,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount,
      status: immediatelyReceiveStock ? 'received' : 'ordered',
      paymentStatus,
      paymentMethod,
      dueDate: paymentMethod === 'tempo' ? dueDate : undefined,
      notes: notes.trim() || undefined,
      stockUpdated: immediatelyReceiveStock,
      receivedBy: immediatelyReceiveStock ? 'Petugas Gudang / Admin' : undefined,
      createdAt: new Date().toISOString(),
    };

    if (immediatelyReceiveStock) {
      const updatedProducts = products.map(prod => {
        const matchingItems = validItems.filter(it => it.productId === prod.id);
        if (matchingItems.length > 0) {
          const addedStock = matchingItems.reduce((sum, it) => {
            const mult = it.conversionMultiplier || 1;
            return sum + (it.baseQuantity !== undefined ? it.baseQuantity : (it.quantity * mult));
          }, 0);
          const newStock = (prod.stock || 0) + addedStock;
          
          const lastItem = matchingItems[matchingItems.length - 1];
          const mult = lastItem.conversionMultiplier || 1;
          const newCostPrice = autoUpdateCostPrice && lastItem.costPrice > 0 
            ? Math.round(lastItem.costPrice / mult)
            : (prod.costPrice || Math.round(prod.price * 0.75));
          
          return {
            ...prod,
            stock: newStock,
            costPrice: newCostPrice,
          };
        }
        return prod;
      });

      onUpdateProducts(updatedProducts);
    }

    onUpdatePurchases([newPurchase, ...purchases]);
    setIsCreateModalOpen(false);

    // Simpan otomatis ke Database MySQL
    try {
      const slug = getStoreSlugFromUrl();
      savePurchaseToMySql(newPurchase, slug).then((ok) => {
        if (ok) {
          setIsDbConnected(true);
          setDbNotification({
            type: 'success',
            message: `✓ Faktur ${newPurchase.purchaseNumber} berhasil disimpan ke Database MySQL & Stok Produk diperbarui!`
          });
          setTimeout(() => setDbNotification(null), 4000);
        }
      }).catch(err => {
        console.warn('Gagal simpan ke MySQL:', err);
      });
    } catch (_) {}
  };

  // Action to receive an ordered/draft PO and increase stock
  const handleReceiveStockNow = (po: PurchaseOrder) => {
    if (po.stockUpdated) {
      alert('Stok untuk pembelian ini sudah pernah ditambahkan sebelumnya.');
      return;
    }

    if (!confirm(`Konfirmasi penerimaan barang untuk faktur ${po.purchaseNumber}? Stok barang di katalog akan bertambah sesuai kuantitas faktur.`)) {
      return;
    }

    const updatedProducts = products.map(prod => {
      const matchingItems = po.items.filter(it => it.productId === prod.id);
      if (matchingItems.length > 0) {
        const addedStock = matchingItems.reduce((sum, it) => {
          const mult = it.conversionMultiplier || 1;
          return sum + (it.baseQuantity !== undefined ? it.baseQuantity : (it.quantity * mult));
        }, 0);
        const lastItem = matchingItems[matchingItems.length - 1];
        const mult = lastItem.conversionMultiplier || 1;
        const newCostPrice = lastItem.costPrice > 0 ? Math.round(lastItem.costPrice / mult) : prod.costPrice;

        return {
          ...prod,
          stock: (prod.stock || 0) + addedStock,
          costPrice: newCostPrice,
        };
      }
      return prod;
    });

    onUpdateProducts(updatedProducts);

    const updatedPurchases = purchases.map(p => {
      if (p.id === po.id) {
        return {
          ...p,
          status: 'received' as const,
          stockUpdated: true,
          receivedDate: new Date().toISOString().slice(0, 10),
          receivedBy: 'Petugas Gudang',
        };
      }
      return p;
    });

    onUpdatePurchases(updatedPurchases);

    // Sinkronkan status penerimaan ke MySQL
    try {
      const slug = getStoreSlugFromUrl();
      const updatedPo = updatedPurchases.find(p => p.id === po.id);
      if (updatedPo) {
        savePurchaseToMySql(updatedPo, slug).catch(() => {});
      }
    } catch (_) {}

    if (selectedPurchaseDetail?.id === po.id) {
      setSelectedPurchaseDetail({
        ...selectedPurchaseDetail,
        status: 'received',
        stockUpdated: true,
        receivedDate: new Date().toISOString().slice(0, 10),
      });
    }
  };

  const handleDeletePurchase = (id: string) => {
    const updated = purchases.filter(p => p.id !== id);
    onUpdatePurchases(updated);
    setDeleteConfirmId(null);
    if (selectedPurchaseDetail?.id === id) {
      setSelectedPurchaseDetail(null);
    }
    // Hapus dari MySQL
    try {
      const slug = getStoreSlugFromUrl();
      deletePurchaseFromMySql(id, slug).then(ok => {
        if (ok) {
          setDbNotification({
            type: 'info',
            message: 'Faktur pembelian berhasil dihapus dari Database MySQL.'
          });
          setTimeout(() => setDbNotification(null), 3000);
        }
      }).catch(() => {});
    } catch (_) {}
  };

  return (
    <div className="space-y-6">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-stone-900">Modul Pesanan Pembelian (Purchase Order) & Stok Masuk</h2>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Input pesanan barang supplier dengan nama barang atau barcode (Pcs maupun Dusan). Cek history item untuk menentukan kuantitas order, serta ekspor laporan ke berbagai format.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* DATABASE MYSQL SYNC BUTTON */}
          <button
            onClick={handleSyncToDatabase}
            disabled={isSyncingDb}
            title={isDbConnected ? "Database MySQL terhubung. Klik untuk menyinkronkan seluruh PO ke MySQL" : "Klik untuk mencoba menghubungkan dan sinkronkan ke MySQL"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Database className={`w-3.5 h-3.5 ${isDbConnected ? 'text-emerald-600' : 'text-amber-500'}`} />
            <span>{isSyncingDb ? 'Menyinkronkan...' : isDbConnected ? 'MySQL Terhubung' : 'Sinkron MySQL'}</span>
            {isSyncingDb && <RefreshCw className="w-3 h-3 animate-spin text-stone-500" />}
          </button>

          {/* LAPORAN & CETAK PO (PER PEMASOK, PER FAKTUR, PER PERIODE) */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-xs font-bold transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Laporan & Cetak PO</span>
          </button>

          {/* MULTI-FORMAT EXPORT DROPDOWN (REQUIREMENT 3) */}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Ekspor File</span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {isExportDropdownOpen && (
              <div 
                className="absolute right-0 mt-1 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-fadeIn text-xs"
                onMouseLeave={() => setIsExportDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  Pilihan Format Ekspor
                </div>

                <button
                  onClick={() => {
                    exportPurchaseOrdersToExcel(filteredPurchases);
                    setIsExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-stone-800 flex items-center gap-2.5 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-bold">Unduh Excel (.xls / .xlsx)</div>
                    <div className="text-[10px] text-stone-400">Rekap faktur PO lengkap dengan total & format uang</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    exportPurchaseItemsDetailToExcel(filteredPurchases);
                    setIsExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-stone-800 flex items-center gap-2.5 transition-colors"
                >
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="font-bold">Unduh Excel Rincian Barang</div>
                    <div className="text-[10px] text-stone-400">Detail item per baris dengan satuan Dus & Pcs</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    exportPurchaseOrdersToCsv(filteredPurchases);
                    setIsExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-stone-50 text-stone-800 flex items-center gap-2.5 transition-colors"
                >
                  <FileText className="w-4 h-4 text-stone-600" />
                  <div>
                    <div className="font-bold">Unduh CSV (.csv)</div>
                    <div className="text-[10px] text-stone-400">Format data mentah kompatibel spreadsheet</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    exportPurchaseOrdersToJson(filteredPurchases);
                    setIsExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-amber-50 text-stone-800 flex items-center gap-2.5 transition-colors"
                >
                  <Boxes className="w-4 h-4 text-amber-600" />
                  <div>
                    <div className="font-bold">Unduh JSON (.json)</div>
                    <div className="text-[10px] text-stone-400">Format data terstruktur untuk integrasi sistem</div>
                  </div>
                </button>

                <div className="border-t border-stone-100 my-1"></div>

                <button
                  onClick={() => {
                    setIsReportModalOpen(true);
                    setIsExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-stone-800 flex items-center gap-2.5 transition-colors"
                >
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-bold">Cetak / Simpan PDF Laporan</div>
                    <div className="text-[10px] text-stone-400">Laporan formal rapi dengan Kop Toko & Tanda Tangan</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {canEdit && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>+ Input Pesanan PO (Tambah Stok)</span>
            </button>
          )}
        </div>
      </div>

      {/* DATABASE NOTIFICATION BANNER */}
      {dbNotification && (
        <div className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold animate-fadeIn ${
          dbNotification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : dbNotification.type === 'error'
            ? 'bg-rose-50 text-rose-800 border border-rose-200'
            : 'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {dbNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{dbNotification.message}</span>
          </div>
          <button 
            onClick={() => setDbNotification(null)}
            className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Total Nilai Pembelian</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{formatRupiah(metrics.totalSpend)}</div>
          <div className="text-xs text-stone-500 mt-1">{metrics.totalOrders} Transaksi Faktur</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Total Unit Masuk (Stok Bertambah)</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">+{metrics.totalItemsReceived} unit</div>
          <div className="text-xs text-stone-500 mt-1">Sudah terefleksi di katalog</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Tagihan Tempo / Hutang Usaha</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{formatRupiah(metrics.unpaidTempo)}</div>
          <div className="text-xs text-stone-500 mt-1">Belum jatuh tempo / lunas</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Mitra Supplier Aktif</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{suppliers.filter(s => s.isActive).length}</div>
          <div className="text-xs text-stone-500 mt-1">Siap memasok barang</div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor PO, no faktur supplier, nama vendor, atau nama barang..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedSupplierFilter}
            onChange={(e) => setSelectedSupplierFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl text-stone-700"
          >
            <option value="all">Semua Supplier</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl text-stone-700"
          >
            <option value="all">Semua Status Barang</option>
            <option value="received">Diterima (Stok Masuk)</option>
            <option value="ordered">Dipesan (Menunggu)</option>
            <option value="draft">Draft</option>
          </select>

          <select
            value={selectedPaymentFilter}
            onChange={(e) => setSelectedPaymentFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl text-stone-700"
          >
            <option value="all">Semua Status Bayar</option>
            <option value="paid">Lunas</option>
            <option value="unpaid">Belum Lunas / Tempo</option>
          </select>
        </div>
      </div>

      {/* TABLE OF PURCHASES */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3">No. Faktur Beli</th>
                <th className="px-3.5 py-3">Tanggal</th>
                <th className="px-3.5 py-3">Supplier & Toko</th>
                <th className="px-3.5 py-3">Rincian Barang</th>
                <th className="px-3.5 py-3 text-center">Satuan Barang</th>
                <th className="px-3.5 py-3 text-center">Qty Pembelian</th>
                <th className="px-3.5 py-3 text-right">Total Pembelian</th>
                <th className="px-3.5 py-3 text-center">Status Stok</th>
                <th className="px-3.5 py-3 text-center">Pembayaran</th>
                <th className="px-3.5 py-3 text-center">Aksi & Ekspor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredPurchases.map(po => (
                <tr key={po.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="px-3.5 py-3">
                    <div className="font-mono font-bold text-stone-900">{po.purchaseNumber}</div>
                    {po.invoiceNumber && (
                      <div className="text-[11px] text-stone-500">Faktur: {po.invoiceNumber}</div>
                    )}
                  </td>

                  <td className="px-3.5 py-3 text-stone-600 whitespace-nowrap">
                    <div>{po.orderDate}</div>
                    {po.receivedDate && (
                      <div className="text-[10px] text-emerald-700 font-medium">
                        Masuk: {po.receivedDate}
                      </div>
                    )}
                  </td>

                  <td className="px-3.5 py-3">
                    <div className="font-bold text-stone-900">{po.supplierName}</div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-stone-400" />
                      <span>{po.storeName}</span>
                    </div>
                  </td>

                  <td className="px-3.5 py-3 max-w-xs">
                    <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                      <span>{po.items.length} Macam Produk</span>
                    </div>
                    <div className="text-[11px] text-stone-500 truncate" title={po.items.map(it => it.productName).join(', ')}>
                      {po.items.map(it => it.productName).join(', ')}
                    </div>
                  </td>

                  {/* KOLOM SATUAN BARANG */}
                  <td className="px-3.5 py-3 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-1 max-w-[130px] mx-auto">
                      {Array.from(new Set(po.items.map(it => it.unit || 'Pcs'))).map((uName, uIdx) => (
                        <span 
                          key={uIdx}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs"
                        >
                          {uName}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* KOLOM QTY PEMBELIAN */}
                  <td className="px-3.5 py-3 text-center">
                    <div className="font-bold text-stone-900 text-xs">
                      {po.items.map(it => `${it.quantity} ${it.unit || 'Pcs'}`).join(', ')}
                    </div>
                    {po.items.some(it => (it.conversionMultiplier && it.conversionMultiplier > 1)) && (
                      <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                        (= +{po.items.reduce((sum, it) => sum + (it.baseQuantity || (it.quantity * (it.conversionMultiplier || 1))), 0)} {po.items[0]?.baseUnit || 'Pcs'} fisik)
                      </div>
                    )}
                  </td>

                  <td className="px-3.5 py-3 text-right">
                    <div className="font-bold text-stone-900">{formatRupiah(po.totalAmount)}</div>
                    <div className="text-[10px] text-stone-500 uppercase">{po.paymentMethod}</div>
                  </td>

                  <td className="px-3.5 py-3 text-center">
                    {po.stockUpdated ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Stok Bertambah
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        Belum Masuk
                      </span>
                    )}
                  </td>

                  <td className="px-3.5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                      po.paymentStatus === 'paid' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {po.paymentStatus === 'paid' ? 'Lunas' : 'Belum Lunas'}
                    </span>
                    {po.dueDate && po.paymentStatus !== 'paid' && (
                      <div className="text-[10px] text-stone-400 mt-0.5">Tempo: {po.dueDate}</div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {!po.stockUpdated && canEdit && (
                        <button
                          onClick={() => handleReceiveStockNow(po)}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Terima Barang & Tambah Stok di Katalog"
                        >
                          <PackagePlus className="w-3 h-3" />
                          <span>Terima</span>
                        </button>
                      )}

                      {/* CETAK FAKTUR RESMI (REQUIREMENT 3) */}
                      <button
                        onClick={() => setSelectedPrintPo(po)}
                        className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                        title="Cetak Surat PO Resmi / Simpan PDF"
                      >
                        <Printer className="w-3.5 h-3.5 text-stone-700" />
                      </button>

                      {/* FORMAT WHATSAPP (REQUIREMENT 3) */}
                      <button
                        onClick={() => setSelectedWhatsAppPo(po)}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                        title="Format Chat WhatsApp ke Supplier"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSelectedPurchaseDetail(po)}
                        className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                        title="Lihat Detail Faktur"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {canEdit && (
                        <button
                          onClick={() => setDeleteConfirmId(po.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          title="Hapus Faktur"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPurchases.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-700">Belum ada transaksi pembelian barang</h3>
            <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
              Klik tombol "+ Input Pesanan PO (Tambah Stok)" untuk mencatat pesanan barang masuk dari supplier.
            </p>
          </div>
        )}
      </div>

      {/* MODAL INPUT PEMBELIAN BARANG (PURCHASE ORDER FORM) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 my-8 max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-base">Faktur Pesanan Pembelian Barang (Purchase Order)</h3>
                  <p className="text-xs text-stone-500">
                    Bisa input dengan mengetik nama barang atau barcode (Pcs maupun Dusan). Klik tombol Info Item untuk melihat riwayat sebelum menentukan jumlah order.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePurchaseOrder} className="space-y-4 text-xs">
              {/* Supplier & Store Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Pilih Supplier Pemasok *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white text-xs font-semibold"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Cabang Toko Tujuan *</label>
                  <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white text-xs font-semibold"
                  >
                    {stores.map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">No. Faktur Supplier (Opsional)</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Contoh: INV-IND/26/09"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white font-mono"
                  />
                </div>
              </div>

              {/* Dates & Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tanggal Pesan</label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tanggal Barang Masuk</label>
                  <input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Metode Bayar</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white"
                  >
                    <option value="tempo">Tempo Kredit (Hutang)</option>
                    <option value="cash">Tunai / Cash</option>
                    <option value="transfer">Transfer Bank</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Status Pembayaran</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white"
                  >
                    <option value="unpaid">Belum Lunas (Tempo)</option>
                    <option value="paid">Sudah Lunas</option>
                  </select>
                </div>
              </div>

              {/* QUICK SEARCH & BARCODE INPUT BAR (REQUIREMENT 1) */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-stone-50 border border-emerald-200/80 rounded-2xl p-3 sm:p-4 space-y-2.5 relative">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-xs">
                      <ScanBarcode className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                        Pencarian Cepat: Ketik Nama Barang atau Barcode (Pcs / Dusan)
                      </span>
                      <p className="text-[11px] text-stone-500">
                        Scan barcode scanner gun atau ketik nama barang untuk memilih satuan Pcs atau Dusan secara instan
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCameraScannerOpen(true)}
                    className="px-3 py-1.5 bg-white border border-stone-200 hover:border-emerald-500 hover:text-emerald-700 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors text-xs text-stone-700 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    <span>📷 Buka Kamera Scanner</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        ref={quickSearchInputRef}
                        type="text"
                        value={quickSearchQuery}
                        onChange={(e) => setQuickSearchQuery(e.target.value)}
                        onFocus={() => setIsQuickSearchFocused(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleQuickSearchSubmit(e);
                          }
                        }}
                        placeholder="Ketik nama barang (contoh: Indomie, Aqua, Minyak) ATAU scan barcode pcs / dusan lalu tekan Enter..."
                        className="w-full pl-9 pr-24 py-2.5 border border-stone-200 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={handleQuickSearchSubmit}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        + Masukkan
                      </button>
                    </div>
                  </div>

                  {/* AUTOCOMPLETE POPUP WHEN TYPING PRODUCT NAME OR BARCODE */}
                  {quickSearchQuery.trim().length > 0 && quickSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 max-h-80 overflow-y-auto divide-y divide-stone-100 animate-fadeIn">
                      <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Hasil Pencarian Barang ({quickSearchResults.length} ditemukan)</span>
                        <span>Klik Satuan untuk Masukkan ke Tabel</span>
                      </div>

                      {quickSearchResults.map(prod => {
                        const unitOpts = getProductUnitOptions(prod);
                        const baseOpt = unitOpts.find(o => o.isBase) || unitOpts[0];
                        const dusOpts = unitOpts.filter(o => !o.isBase);

                        return (
                          <div key={prod.id} className="p-3 hover:bg-stone-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-stone-900 text-xs truncate">{prod.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium">
                                  {prod.brand || prod.category}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-1">
                                <span>Stok: <strong className={prod.stock <= 5 ? 'text-rose-600 font-bold' : 'text-stone-800 font-bold'}>{prod.stock} {prod.unit || 'Pcs'}</strong></span>
                                <span className="font-mono">Barcode Pcs: {prod.barcode || '-'}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                              {/* BUTTON: INFO & RIWAYAT ITEM (REQUIREMENT 2) */}
                              <button
                                type="button"
                                onClick={() => handleOpenItemHistory(prod)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-lg border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
                                title="Lihat History Penjualan & Pembelian untuk menentukan jumlah order"
                              >
                                <Info className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Info Item</span>
                              </button>

                              {/* BUTTON: INSERT AS PCS */}
                              <button
                                type="button"
                                onClick={() => {
                                  const cost = prod.costPrice || Math.round(prod.price * 0.75);
                                  insertProductFromQuickSearch(prod, prod.unit || 'Pcs', 1, prod.barcode, cost);
                                }}
                                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                              >
                                + {prod.unit || 'Pcs'}
                              </button>

                              {/* BUTTON(S): INSERT AS DUS / KARTON / MULTI-SATUAN */}
                              {dusOpts.map(dOpt => (
                                <button
                                  key={dOpt.unitName}
                                  type="button"
                                  onClick={() => {
                                    const cost = dOpt.price && dOpt.price > 0 
                                      ? dOpt.price 
                                      : (prod.costPrice ? prod.costPrice * dOpt.multiplier : Math.round(prod.price * 0.75 * dOpt.multiplier));
                                    insertProductFromQuickSearch(prod, dOpt.unitName, dOpt.multiplier, dOpt.barcode || prod.barcode, cost);
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                  title={`1 ${dOpt.unitName} = ${dOpt.multiplier} ${prod.unit}`}
                                >
                                  <span>+ {dOpt.unitName}</span>
                                  <span className="text-[10px] text-emerald-600 font-normal">({dOpt.multiplier}x)</span>
                                </button>
                              ))}

                              {/* FALLBACK DUS BUTTON IF NOT EXPLICITLY IN UNIT CONVERSIONS */}
                              {dusOpts.length === 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const mult = 24;
                                    const cost = (prod.costPrice ? prod.costPrice * mult : Math.round(prod.price * 0.75 * mult));
                                    insertProductFromQuickSearch(prod, 'Dus', mult, prod.barcode, cost);
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                                  title="Masukkan sebagai 1 Dus (= 24 pcs)"
                                >
                                  + Dus (24x)
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Feedback banner */}
                {barcodeFeedback && (
                  <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between animate-fadeIn ${
                    barcodeFeedback.type === 'success' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    <span>{barcodeFeedback.message}</span>
                    <button 
                      type="button" 
                      onClick={() => setBarcodeFeedback(null)} 
                      className="text-stone-400 hover:text-stone-600 text-xs ml-2 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* TABEL DAFTAR BARANG PEMBELIAN (INLINE TABLE INPUT) */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <PackagePlus className="w-4 h-4 text-emerald-600" />
                    <span>Daftar Barang Pembelian (Input di Tabel)</span>
                    <span className="text-[11px] font-normal text-stone-400 ml-1">
                      ({formItems.filter(r => r.productId).length} barang terdaftar)
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-medium">
                    💡 Klik <span className="font-bold text-indigo-700">ℹ️ Info Item</span> di samping barang untuk melihat analisis & riwayat penjualan/pembelian
                  </div>
                </div>

                <div className="border border-stone-200 rounded-2xl bg-white overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-8">No</th>
                          <th className="px-3 py-2.5 min-w-[130px] w-36">Barcode Barang</th>
                          <th className="px-3 py-2.5 min-w-[200px]">Nama Produk</th>
                          <th className="px-3 py-2.5 min-w-[110px] w-28 text-center">Satuan</th>
                          <th className="px-3 py-2.5 min-w-[130px] w-32 text-center">Konversi Fisik</th>
                          <th className="px-3 py-2.5 min-w-[80px] w-20 text-center">Qty Beli</th>
                          <th className="px-3 py-2.5 min-w-[120px] w-32 text-right">Harga Modal (Rp)</th>
                          <th className="px-3 py-2.5 min-w-[110px] w-28 text-right">Subtotal</th>
                          <th className="px-3 py-2.5 w-20 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {formItems.map((item, idx) => {
                          const prod = products.find(p => p.id === item.productId);
                          const unitOpts = prod ? getProductUnitOptions(prod) : [];

                          return (
                            <tr 
                              key={item.id || idx} 
                              className={`transition-colors ${item.productId ? 'bg-white hover:bg-stone-50/70' : 'bg-amber-50/30'}`}
                            >
                              {/* 1. No */}
                              <td className="px-3 py-2 text-center text-stone-400 font-medium">
                                {idx + 1}
                              </td>

                              {/* 2. Barcode Barang (Pcs atau Dus) */}
                              <td className="px-3 py-2">
                                <div className="relative">
                                  <input
                                    ref={(el) => { barcodeInputRefs.current[idx] = el; }}
                                    type="text"
                                    value={item.barcode || ''}
                                    onChange={(e) => handleRowBarcodeChange(idx, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleRowBarcodeLookup(idx);
                                      }
                                    }}
                                    onBlur={() => {
                                      if (item.barcode && !item.productId) {
                                        handleRowBarcodeLookup(idx);
                                      }
                                    }}
                                    placeholder="Barcode Pcs / Dus..."
                                    className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                  />
                                </div>
                              </td>

                              {/* 3. Nama / Pilih Produk & Tombol Info Riwayat Item */}
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={item.productId || ''}
                                    onChange={(e) => handleRowProductSelect(idx, e.target.value)}
                                    className="flex-1 px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs font-semibold text-stone-900 bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 truncate"
                                  >
                                    <option value="">-- Pilih / Ketik Produk --</option>
                                    {products.map(p => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} (Stok: {p.stock || 0} {p.unit || 'Pcs'})
                                      </option>
                                    ))}
                                  </select>

                                  {/* TOMBOL POPUP INFO ITEM & HISTORY (REQUIREMENT 2) */}
                                  {prod && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenItemHistory(prod, idx)}
                                      className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs transition-colors shrink-0 cursor-pointer"
                                      title="Buka Popup Riwayat & Info Item ini (History Penjualan & Pembelian)"
                                    >
                                      <Info className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                {item.productName && !item.productId && (
                                  <span className="text-[10px] text-amber-600 font-medium block mt-0.5">
                                    {item.productName}
                                  </span>
                                )}
                              </td>

                              {/* 4. Satuan Barang (Pcs, Dus, Karton, dll) */}
                              <td className="px-3 py-2 text-center">
                                <select
                                  value={item.unit || 'Pcs'}
                                  onChange={(e) => handleRowUnitChange(idx, e.target.value)}
                                  className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-xs font-bold text-indigo-700 bg-white focus:ring-1 focus:ring-emerald-500 text-center"
                                >
                                  {unitOpts.length > 0 && (
                                    <optgroup label="Satuan Terdaftar">
                                      {unitOpts.map(opt => (
                                        <option key={opt.unitName} value={opt.unitName}>
                                          {opt.unitName} {opt.multiplier > 1 ? `(= ${opt.multiplier})` : ''}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                  <optgroup label="Satuan Grosir">
                                    {COMMON_SUPPLIER_UNITS.filter(u => !unitOpts.some(o => o.unitName.toLowerCase() === u.toLowerCase())).map(u => (
                                      <option key={u} value={u}>{u}</option>
                                    ))}
                                  </optgroup>
                                </select>
                              </td>

                              {/* 5. Konversi Fisik */}
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[10px] text-stone-400 font-medium">1 {item.unit} =</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.conversionMultiplier || 1}
                                    onChange={(e) => handleRowMultiplierChange(idx, parseInt(e.target.value) || 1)}
                                    className="w-11 px-1 py-1 border border-stone-200 rounded-md text-center font-bold text-xs text-emerald-700 bg-white"
                                  />
                                  <span className="text-[10px] text-stone-600 font-semibold">{item.baseUnit || 'Pcs'}</span>
                                </div>
                                <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                                  +{item.baseQuantity || (item.quantity * (item.conversionMultiplier || 1))} fisik
                                </div>
                              </td>

                              {/* 6. Qty Beli */}
                              <td className="px-3 py-2 text-center">
                                <input
                                  ref={(el) => { qtyInputRefs.current[idx] = el; }}
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleRowQtyChange(idx, parseInt(e.target.value) || 1)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      priceInputRefs.current[idx]?.focus();
                                      priceInputRefs.current[idx]?.select();
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-center font-bold text-xs text-stone-900 bg-white focus:ring-1 focus:ring-emerald-500"
                                />
                              </td>

                              {/* 7. Harga Modal (Rp) -> On Enter: GESER KE BARIS BERIKUTNYA */}
                              <td className="px-3 py-2 text-right">
                                <input
                                  ref={(el) => { priceInputRefs.current[idx] = el; }}
                                  type="number"
                                  min="0"
                                  step="100"
                                  value={item.costPrice}
                                  onChange={(e) => handleRowPriceChange(idx, parseInt(e.target.value) || 0)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      advanceToNextRow(idx);
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-right font-bold text-xs text-emerald-700 bg-white focus:ring-1 focus:ring-emerald-500"
                                />
                              </td>

                              {/* 8. Subtotal */}
                              <td className="px-3 py-2 text-right font-bold text-stone-900">
                                {formatRupiah(item.subtotal)}
                              </td>

                              {/* 9. Aksi */}
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => advanceToNextRow(idx)}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md cursor-pointer"
                                    title="Selesai & Geser ke baris berikutnya (Enter)"
                                  >
                                    <CornerDownRight className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRow(idx)}
                                    className="p-1 text-rose-500 hover:bg-rose-50 rounded-md cursor-pointer"
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
                      <tfoot className="bg-stone-50 font-bold border-t border-stone-200 text-stone-900">
                        <tr>
                          <td className="px-3 py-3" colSpan={3}>
                            <div className="flex items-center gap-2">
                              <span>Total Transaksi Pembelian</span>
                              <span className="text-[11px] font-normal text-stone-500">
                                ({formItems.filter(i => i.productId).length} macam produk)
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-stone-500 text-[11px]">
                            {Array.from(new Set(formItems.filter(i => i.productId).map(i => i.unit))).join(', ') || '-'}
                          </td>
                          <td className="px-3 py-3 text-center text-emerald-700">
                            +{formItems.filter(i => i.productId).reduce((sum, i) => sum + (i.baseQuantity || (i.quantity * (i.conversionMultiplier || 1))), 0)} fisik
                          </td>
                          <td className="px-3 py-3 text-center text-stone-900 text-sm">
                            {formItems.filter(i => i.productId).reduce((sum, i) => sum + i.quantity, 0)}
                          </td>
                          <td className="px-3 py-3 text-right text-stone-500 text-[11px]">
                            Total Bayar:
                          </td>
                          <td className="px-3 py-3 text-right text-emerald-700 font-extrabold text-sm">
                            {formatRupiah(formItems.filter(i => i.productId).reduce((sum, i) => sum + i.subtotal, 0))}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Button to add next row manually */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddNewRow}
                    className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+ Tambah Baris Berikutnya (Atau tekan Enter di kolom Harga)</span>
                  </button>

                  <div className="flex items-center gap-1 text-[11px] text-stone-500 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Alur: Ketik/Scan Barcode ➔ Enter (Qty) ➔ Enter (Harga) ➔ Enter (Geser Baris Baru)</span>
                  </div>
                </div>
              </div>

              {/* Automatic Stock Increment & HPP Update options */}
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="imm-receive"
                    checked={immediatelyReceiveStock}
                    onChange={(e) => setImmediatelyReceiveStock(e.target.checked)}
                    className="rounded-md border-emerald-400 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="imm-receive" className="text-xs font-bold text-emerald-900 cursor-pointer">
                    ⚡ Langsung Tambahkan Stok Fisik ke Katalog Sekarang (Barang Sudah Diterima)
                  </label>
                </div>
                <p className="text-[11px] text-emerald-800 ml-6">
                  Ketika dicentang, stok barang di etalase dan POS kasir akan langsung bertambah sesuai kuantitas faktur ini.
                </p>

                <div className="flex items-center gap-2 pt-1 border-t border-emerald-200/60 mt-2">
                  <input
                    type="checkbox"
                    id="auto-hpp"
                    checked={autoUpdateCostPrice}
                    onChange={(e) => setAutoUpdateCostPrice(e.target.checked)}
                    className="rounded-md border-emerald-400 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="auto-hpp" className="text-xs font-medium text-emerald-900 cursor-pointer">
                    Perbarui Harga Pokok Modal (HPP) Produk di Katalog sesuai harga beli terbaru dari supplier
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Catatan Tambahan Penerimaan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Kondisi karton segel utuh, pengiriman menggunakan truk ekspedisi..."
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Faktur & Tambah Stok</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL PEMBELIAN */}
      {selectedPurchaseDetail && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                    {selectedPurchaseDetail.purchaseNumber}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedPurchaseDetail.stockUpdated ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                  }`}>
                    {selectedPurchaseDetail.stockUpdated ? 'Stok Sudah Bertambah' : 'Menunggu Penerimaan'}
                  </span>
                </div>
                <h3 className="font-bold text-stone-900 text-base mt-1">
                  Detail Faktur Pembelian: {selectedPurchaseDetail.supplierName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPurchaseDetail(null)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3.5 rounded-2xl text-xs">
              <div>
                <div className="text-stone-500">Tanggal Pesan</div>
                <div className="font-bold text-stone-800">{selectedPurchaseDetail.orderDate}</div>
              </div>
              <div>
                <div className="text-stone-500">Toko Tujuan</div>
                <div className="font-bold text-stone-800">{selectedPurchaseDetail.storeName}</div>
              </div>
              <div>
                <div className="text-stone-500">Status Bayar</div>
                <div className="font-bold text-stone-800 uppercase">{selectedPurchaseDetail.paymentStatus}</div>
              </div>
              <div>
                <div className="text-stone-500">Metode</div>
                <div className="font-bold text-stone-800 uppercase">{selectedPurchaseDetail.paymentMethod}</div>
              </div>
            </div>

            <div className="border border-stone-200 rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                  <tr>
                    <th className="px-3.5 py-2.5">Nama Produk</th>
                    <th className="px-3.5 py-2.5 text-center">Qty Pembelian</th>
                    <th className="px-3.5 py-2.5 text-center">Satuan Barang</th>
                    <th className="px-3.5 py-2.5 text-center">Stok Masuk Fisik</th>
                    <th className="px-3.5 py-2.5 text-right">Harga Beli Modal</th>
                    <th className="px-3.5 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {selectedPurchaseDetail.items.map(it => (
                    <tr key={it.id}>
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-stone-900">{it.productName}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenItemHistory(it.productId)}
                            className="p-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                            title="Buka Info & History Item"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">{it.barcode}</div>
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-bold text-stone-900">
                        {it.quantity}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {it.unit || 'Pcs'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-emerald-700 font-bold">
                        +{it.baseQuantity || (it.quantity * (it.conversionMultiplier || 1))} {it.baseUnit || 'Pcs'}
                        {(it.conversionMultiplier || 1) > 1 && (
                          <span className="block text-[10px] text-stone-400 font-normal">
                            (1 {it.unit} = {it.conversionMultiplier} {it.baseUnit})
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-medium">
                        {formatRupiah(it.costPrice)} / {it.unit}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-stone-900">{formatRupiah(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-stone-50 font-bold border-t border-stone-200">
                  <tr>
                    <td className="px-3.5 py-3">Total Pembelian</td>
                    <td className="px-3.5 py-3 text-center text-stone-900">
                      {selectedPurchaseDetail.totalQuantity}
                    </td>
                    <td className="px-3.5 py-3 text-center text-stone-500 text-[11px]">
                      {Array.from(new Set(selectedPurchaseDetail.items.map(i => i.unit || 'Pcs'))).join(', ')}
                    </td>
                    <td className="px-3.5 py-3 text-center text-emerald-700">
                      +{selectedPurchaseDetail.items.reduce((sum, it) => sum + (it.baseQuantity || (it.quantity * (it.conversionMultiplier || 1))), 0)} fisik
                    </td>
                    <td></td>
                    <td className="px-3.5 py-3 text-right text-stone-900 text-sm">
                      {formatRupiah(selectedPurchaseDetail.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPrintPo(selectedPurchaseDetail)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <span>Cetak PO Resmi</span>
                </button>

                <button
                  onClick={() => setSelectedWhatsAppPo(selectedPurchaseDetail)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 text-emerald-700 hover:bg-emerald-50 font-semibold cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Kirim WhatsApp</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {!selectedPurchaseDetail.stockUpdated && canEdit && (
                  <button
                    onClick={() => handleReceiveStockNow(selectedPurchaseDetail)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Terima Barang & Tambah Stok</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedPurchaseDetail(null)}
                  className="px-4 py-2 rounded-xl bg-stone-900 text-white font-bold hover:bg-black cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Hapus Faktur Pembelian?</h3>
              <p className="text-xs text-stone-500 mt-1">
                Catatan: Menghapus faktur ini tidak akan mengurangi stok yang sudah terlanjur diterima di katalog.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeletePurchase(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 cursor-pointer"
              >
                Hapus Faktur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP INFO & HISTORY ITEM MODAL (REQUIREMENT 2) */}
      <ProductPurchaseHistoryModal
        product={selectedHistoryProduct}
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedHistoryProduct(null);
          setHistoryTargetRowIndex(null);
        }}
        purchases={purchases}
        orders={orders}
        suppliers={suppliers}
        onApplyRecommendation={handleApplyOrderRecommendation}
      />

      {/* PRINTABLE OFFICIAL PO MODAL (REQUIREMENT 3) */}
      <PurchaseOrderPrintModal
        po={selectedPrintPo}
        isOpen={!!selectedPrintPo}
        onClose={() => setSelectedPrintPo(null)}
        stores={stores}
        suppliers={suppliers}
      />

      {/* WHATSAPP SHARE MODAL (REQUIREMENT 3) */}
      <PurchaseOrderWhatsAppModal
        po={selectedWhatsAppPo}
        isOpen={!!selectedWhatsAppPo}
        onClose={() => setSelectedWhatsAppPo(null)}
        stores={stores}
        suppliers={suppliers}
      />

      {/* FORMAL PRINTABLE REPORT MODAL (BY SUPPLIER, INVOICE, PERIOD, ETC.) */}
      <PurchaseReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        purchases={purchases}
        suppliers={suppliers}
        stores={stores}
        products={products}
        currentStore={stores[0]}
      />
    </div>
  );
};
