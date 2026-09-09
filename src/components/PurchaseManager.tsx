import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  PurchaseOrder, 
  PurchaseItem, 
  Supplier, 
  Product, 
  Store 
} from '../types';
import { formatRupiah } from '../utils/formatters';
import { getProductUnitOptions } from '../utils/unitConversion';
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
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Layers,
  X,
  Scale,
  Boxes,
  Barcode,
  ScanBarcode,
  Camera,
  CornerDownRight,
  Check,
  RotateCcw
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
  onUpdatePurchases: (purchases: PurchaseOrder[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  canEdit?: boolean;
}

export const PurchaseManager: React.FC<PurchaseManagerProps> = ({
  purchases,
  suppliers,
  products,
  stores,
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
  const [quickBarcodeQuery, setQuickBarcodeQuery] = useState('');
  const [barcodeFeedback, setBarcodeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Input refs for seamless keyboard navigation across rows
  const barcodeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const qtyInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const priceInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const quickBarcodeInputRef = useRef<HTMLInputElement | null>(null);
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
    setQuickBarcodeQuery('');
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

  // Populate row with matched product data
  const applyProductToRow = (rowIndex: number, prod: Product, customBarcode?: string, customUnit?: string) => {
    const baseUnit = prod.unit || 'Pcs';
    const unitToUse = customUnit || baseUnit;
    let mult = 1;
    if (customUnit) {
      const opts = getProductUnitOptions(prod);
      const matched = opts.find(o => o.unitName.toLowerCase() === customUnit.toLowerCase());
      if (matched) mult = matched.multiplier || 1;
    }

    const defaultCost = prod.costPrice ? prod.costPrice * mult : Math.round(prod.price * 0.75 * mult);

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
  const handleRowBarcodeLookup = (rowIndex: number, barcodeValue?: string) => {
    const rawCode = (barcodeValue ?? formItems[rowIndex]?.barcode ?? '').trim();
    if (!rawCode) {
      // If empty, shift focus to quantity or select
      qtyInputRefs.current[rowIndex]?.focus();
      return;
    }

    // Search in products by barcode, id, or unit conversions
    const matchedProd = products.find(p => 
      (p.barcode && p.barcode.toLowerCase() === rawCode.toLowerCase()) ||
      p.id.toLowerCase() === rawCode.toLowerCase() ||
      p.unitConversions?.some(uc => uc.barcode && uc.barcode.toLowerCase() === rawCode.toLowerCase())
    );

    if (matchedProd) {
      playScanBeep();
      const matchedUc = matchedProd.unitConversions?.find(uc => uc.barcode && uc.barcode.toLowerCase() === rawCode.toLowerCase());
      applyProductToRow(rowIndex, matchedProd, rawCode, matchedUc?.unitName);
      
      setBarcodeFeedback({
        type: 'success',
        message: `✓ Barcode terdeteksi: ${matchedProd.name} (${rawCode})`,
      });
      setTimeout(() => setBarcodeFeedback(null), 3000);

      // Auto advance to Quantity field in this row
      setTimeout(() => {
        qtyInputRefs.current[rowIndex]?.focus();
        qtyInputRefs.current[rowIndex]?.select();
      }, 50);
    } else {
      setBarcodeFeedback({
        type: 'error',
        message: `Barcode "${rawCode}" tidak ditemukan di master produk. Silakan pilih dari dropdown atau ketik ulang.`,
      });
      setTimeout(() => setBarcodeFeedback(null), 4000);
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

    // Auto advance to Quantity field in this row
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
      if (prod) {
        const opts = getProductUnitOptions(prod);
        const matched = opts.find(o => o.unitName.toLowerCase() === newUnit.toLowerCase());
        if (matched) {
          mult = matched.multiplier || 1;
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
      }
      row.conversionMultiplier = mult;
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

  // 8. REQUIREMENT 2: "Input pembelian item barang bergeser ke baris berikutnya apabila telah selesai input item barang"
  const advanceToNextRow = (currentIndex: number) => {
    const nextIndex = currentIndex + 1;
    setFormItems(prev => {
      if (nextIndex >= prev.length) {
        return [...prev, createEmptyRow(`row_${nextIndex}`)];
      }
      return prev;
    });

    // Focus next row's barcode input smoothly
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
        // Keep at least 1 empty row
        return [createEmptyRow('row_0')];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  // 9. REQUIREMENT 3: Fast Quick Barcode Scanner Bar at top of table
  const handleQuickBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = quickBarcodeQuery.trim();
    if (!code) return;

    const matchedProd = products.find(p => 
      (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
      p.id.toLowerCase() === code.toLowerCase() ||
      p.unitConversions?.some(uc => uc.barcode && uc.barcode.toLowerCase() === code.toLowerCase())
    );

    if (matchedProd) {
      playScanBeep();
      const matchedUc = matchedProd.unitConversions?.find(uc => uc.barcode && uc.barcode.toLowerCase() === code.toLowerCase());
      const baseUnit = matchedProd.unit || 'Pcs';
      const unitName = matchedUc ? matchedUc.unitName : baseUnit;
      const mult = matchedUc ? (matchedUc.totalMultiplier || 1) : 1;
      const cost = matchedProd.costPrice ? matchedProd.costPrice * mult : Math.round(matchedProd.price * 0.75 * mult);

      setFormItems(prev => {
        // Find if the last row is empty (no productId)
        const emptyIdx = prev.findIndex(r => !r.productId);
        if (emptyIdx >= 0) {
          const updated = [...prev];
          updated[emptyIdx] = {
            ...updated[emptyIdx],
            productId: matchedProd.id,
            productName: matchedProd.name,
            barcode: code,
            unit: unitName,
            baseUnit: baseUnit,
            conversionMultiplier: mult,
            quantity: 1,
            costPrice: cost,
            subtotal: cost,
            baseQuantity: mult,
          };
          // Automatically append next empty row ready for next scan
          return [...updated, createEmptyRow()];
        } else {
          // Append this item and an empty row below it
          const newItem: PurchaseItem = {
            id: `pitem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            productId: matchedProd.id,
            productName: matchedProd.name,
            barcode: code,
            unit: unitName,
            baseUnit: baseUnit,
            conversionMultiplier: mult,
            quantity: 1,
            costPrice: cost,
            subtotal: cost,
            baseQuantity: mult,
          };
          return [...prev, newItem, createEmptyRow()];
        }
      });

      setBarcodeFeedback({
        type: 'success',
        message: `✓ [Barcode: ${code}] ${matchedProd.name} berhasil diinput ke tabel & bergeser ke baris baru!`,
      });
      setTimeout(() => setBarcodeFeedback(null), 3000);
      setQuickBarcodeQuery('');

      // Keep focus in quick scan input for rapid laser barcode scanning
      setTimeout(() => {
        quickBarcodeInputRef.current?.focus();
      }, 50);
    } else {
      setBarcodeFeedback({
        type: 'error',
        message: `Barcode "${code}" tidak ditemukan di katalog produk master.`,
      });
      setTimeout(() => setBarcodeFeedback(null), 3500);
    }
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

          // Check if BarcodeDetector API is supported
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
                      // Process barcode
                      const fakeEvent = { preventDefault: () => {} } as any;
                      setQuickBarcodeQuery(rawVal);
                      setTimeout(() => {
                        handleQuickBarcodeSubmit(fakeEvent);
                      }, 50);
                      // Pause briefly
                      clearInterval(intervalId);
                      setTimeout(() => {
                        setIsCameraScannerOpen(false);
                      }, 800);
                    }
                  }
                } catch {
                  // Ignore detection loop frame error
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

  // Save Purchase Order & Automatically Increase Stock!
  const handleSavePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();

    // Filter valid items that have a product selected and quantity > 0
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

    // CRITICAL REQUIREMENT: "stok barang bertambah" with correct unit conversion
    // If immediately received, automatically increase physical stock and update HPP cost price in products!
    if (immediatelyReceiveStock) {
      const updatedProducts = products.map(prod => {
        const matchingItems = validItems.filter(it => it.productId === prod.id);
        if (matchingItems.length > 0) {
          const addedStock = matchingItems.reduce((sum, it) => {
            const mult = it.conversionMultiplier || 1;
            return sum + (it.baseQuantity !== undefined ? it.baseQuantity : (it.quantity * mult));
          }, 0);
          const newStock = (prod.stock || 0) + addedStock;
          
          // Cost price per base unit
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

    // Save to purchases list
    onUpdatePurchases([newPurchase, ...purchases]);
    setIsCreateModalOpen(false);
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

    // Increase product stock respecting unit conversion
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

    // Update PO status
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
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['No PO', 'No Faktur Supplier', 'Supplier', 'Cabang Toko', 'Tgl Pesan', 'Tgl Diterima', 'Daftar Barang & Satuan', 'Satuan Barang', 'Total Qty', 'Subtotal (Rp)', 'Total (Rp)', 'Status Barang', 'Status Bayar', 'Metode Bayar', 'Stok Masuk'];
    const rows = filteredPurchases.map(p => [
      `"${p.purchaseNumber}"`,
      `"${p.invoiceNumber || '-'}"`,
      `"${p.supplierName.replace(/"/g, '""')}"`,
      `"${p.storeName}"`,
      p.orderDate,
      p.receivedDate || '-',
      `"${p.items.map(it => `${it.productName} (${it.quantity} ${it.unit})`).join('; ')}"`,
      `"${Array.from(new Set(p.items.map(it => it.unit))).join(', ')}"`,
      p.totalQuantity,
      p.subtotal,
      p.totalAmount,
      p.status,
      p.paymentStatus,
      p.paymentMethod,
      p.stockUpdated ? 'Sudah Ditambah' : 'Belum',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Pembelian_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-stone-900">Modul Pembelian Barang & Stok Masuk</h2>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Catat pesanan barang dari supplier. Saat status <span className="font-semibold text-emerald-700">Diterima</span>, stok fisik di katalog toko otomatis bertambah dan HPP modal terupdate.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span>Ekspor CSV</span>
          </button>

          {canEdit && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <PackagePlus className="w-4 h-4" />
              <span>+ Beli Barang (Tambah Stok)</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
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

      {/* Filters */}
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

      {/* Table of Purchases */}
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
                <th className="px-3.5 py-3 text-center">Aksi</th>
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
                    <div className="font-semibold text-stone-800">
                      {po.items.length} Macam Produk
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
                    <div className="flex items-center justify-center gap-1.5">
                      {!po.stockUpdated && canEdit && (
                        <button
                          onClick={() => handleReceiveStockNow(po)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
                          title="Terima Barang & Tambah Stok di Katalog"
                        >
                          <PackagePlus className="w-3 h-3" />
                          <span>Terima Stok</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedPurchaseDetail(po)}
                        className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700"
                        title="Lihat Detail Faktur"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {canEdit && (
                        <button
                          onClick={() => setDeleteConfirmId(po.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
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
              Klik tombol "+ Beli Barang (Tambah Stok)" untuk mencatat pesanan barang masuk dari supplier.
            </p>
          </div>
        )}
      </div>

      {/* MODAL INPUT PEMBELIAN BARANG (TAMBAH STOK) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 my-8 max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Faktur Pembelian Barang Masuk</h3>
                  <p className="text-xs text-stone-500">Input barang langsung di tabel dengan barcode atau pilih produk, otomatis geser ke baris berikutnya</p>
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

              {/* BARCODE SCANNER QUICK INPUT BAR */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-stone-50 border border-emerald-200/80 rounded-2xl p-3 sm:p-3.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-xs">
                      <ScanBarcode className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                        Scan Barcode Cepat (Barcode Scanner Gun / Kamera)
                      </span>
                      <p className="text-[11px] text-stone-500">Scan barcode untuk otomatis memasukkan produk ke tabel & menambah baris baru</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCameraScannerOpen(true)}
                    className="px-3 py-1.5 bg-white border border-stone-200 hover:border-emerald-500 hover:text-emerald-700 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors text-xs text-stone-700"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    <span>📷 Buka Kamera Scanner</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={quickBarcodeInputRef}
                      type="text"
                      value={quickBarcodeQuery}
                      onChange={(e) => setQuickBarcodeQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleQuickBarcodeSubmit(e);
                        }
                      }}
                      placeholder="Arahkan Barcode Scanner ke sini atau ketik kode barcode lalu tekan Enter..."
                      className="w-full pl-9 pr-24 py-2 border border-stone-200 rounded-xl bg-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleQuickBarcodeSubmit}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors"
                    >
                      + Masukkan
                    </button>
                  </div>
                </div>

                {/* Barcode feedback banner */}
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
                      className="text-stone-400 hover:text-stone-600 text-xs ml-2"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Quick Sample Barcode Chips for instant testing */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-stone-400 font-medium">Tes Barcode Cepat:</span>
                  {products.filter(p => p.barcode).slice(0, 4).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setQuickBarcodeQuery(p.barcode || '');
                        const fakeEvt = { preventDefault: () => {} } as any;
                        // Trigger immediate lookup
                        setTimeout(() => {
                          const code = p.barcode || '';
                          const matchedProd = p;
                          playScanBeep();
                          const baseUnit = matchedProd.unit || 'Pcs';
                          const defaultCost = matchedProd.costPrice || Math.round(matchedProd.price * 0.75);
                          setFormItems(prev => {
                            const emptyIdx = prev.findIndex(r => !r.productId);
                            if (emptyIdx >= 0) {
                              const updated = [...prev];
                              updated[emptyIdx] = {
                                ...updated[emptyIdx],
                                productId: matchedProd.id,
                                productName: matchedProd.name,
                                barcode: code,
                                unit: baseUnit,
                                baseUnit: baseUnit,
                                conversionMultiplier: 1,
                                quantity: 1,
                                costPrice: defaultCost,
                                subtotal: defaultCost,
                                baseQuantity: 1,
                              };
                              return [...updated, createEmptyRow()];
                            } else {
                              const newItem: PurchaseItem = {
                                id: `pitem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                                productId: matchedProd.id,
                                productName: matchedProd.name,
                                barcode: code,
                                unit: baseUnit,
                                baseUnit: baseUnit,
                                conversionMultiplier: 1,
                                quantity: 1,
                                costPrice: defaultCost,
                                subtotal: defaultCost,
                                baseQuantity: 1,
                              };
                              return [...prev, newItem, createEmptyRow()];
                            }
                          });
                          setBarcodeFeedback({
                            type: 'success',
                            message: `✓ [Barcode: ${code}] ${matchedProd.name} dimasukkan ke tabel!`,
                          });
                          setTimeout(() => setBarcodeFeedback(null), 3000);
                        }, 50);
                      }}
                      className="px-2 py-0.5 bg-white hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 border border-stone-200 rounded-lg text-[10px] font-mono transition-colors"
                      title={`Klik untuk tes scan barcode ${p.name}`}
                    >
                      {p.name.split(' ')[0]} ({p.barcode})
                    </button>
                  ))}
                </div>
              </div>

              {/* TABEL PEMBELIAN BARANG (DIRECT INLINE TABLE INPUT) */}
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
                    💡 Tekan <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-300 rounded font-mono text-[10px]">Enter</kbd> untuk bergeser antar kolom & baris
                  </div>
                </div>

                <div className="border border-stone-200 rounded-2xl bg-white overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-8">No</th>
                          <th className="px-3 py-2.5 min-w-[130px] w-36">Barcode Barang</th>
                          <th className="px-3 py-2.5 min-w-[180px]">Nama Produk</th>
                          <th className="px-3 py-2.5 min-w-[110px] w-28 text-center">Satuan</th>
                          <th className="px-3 py-2.5 min-w-[130px] w-32 text-center">Konversi Fisik</th>
                          <th className="px-3 py-2.5 min-w-[80px] w-20 text-center">Qty Beli</th>
                          <th className="px-3 py-2.5 min-w-[120px] w-32 text-right">Harga Modal (Rp)</th>
                          <th className="px-3 py-2.5 min-w-[110px] w-28 text-right">Subtotal</th>
                          <th className="px-3 py-2.5 w-16 text-center">Aksi</th>
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

                              {/* 2. Barcode Barang */}
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
                                    placeholder="Ketik/Scan..."
                                    className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                  />
                                </div>
                              </td>

                              {/* 3. Nama / Pilih Produk */}
                              <td className="px-3 py-2">
                                <select
                                  value={item.productId || ''}
                                  onChange={(e) => handleRowProductSelect(idx, e.target.value)}
                                  className="w-full px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs font-semibold text-stone-900 bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                  <option value="">-- Pilih / Cari Produk Master --</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} (Stok saat ini: {p.stock || 0} {p.unit || 'Pcs'})
                                    </option>
                                  ))}
                                </select>
                                {item.productName && !item.productId && (
                                  <span className="text-[10px] text-amber-600 font-medium block mt-0.5">
                                    {item.productName}
                                  </span>
                                )}
                              </td>

                              {/* 4. Satuan Barang */}
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
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md"
                                    title="Selesai & Geser ke baris berikutnya (Enter)"
                                  >
                                    <CornerDownRight className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRow(idx)}
                                    className="p-1 text-rose-500 hover:bg-rose-50 rounded-md"
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
                    className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+ Tambah Baris Berikutnya (Atau tekan Enter di kolom Harga)</span>
                  </button>

                  <div className="flex items-center gap-1 text-[11px] text-stone-500 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Alur: Scan/Ketik Barcode ➔ Enter (Qty) ➔ Enter (Harga Modal) ➔ Enter (Geser Baris Baru)</span>
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
                    className="rounded-md border-emerald-400 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
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
                    className="rounded-md border-emerald-400 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
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
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors flex items-center gap-1.5"
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
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl"
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
                        <div className="font-semibold text-stone-900">{it.productName}</div>
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
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Faktur</span>
              </button>

              <div className="flex items-center gap-2">
                {!selectedPurchaseDetail.stockUpdated && canEdit && (
                  <button
                    onClick={() => handleReceiveStockNow(selectedPurchaseDetail)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Terima Barang & Tambah Stok</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedPurchaseDetail(null)}
                  className="px-4 py-2 rounded-xl bg-stone-900 text-white font-bold hover:bg-black"
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
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeletePurchase(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700"
              >
                Hapus Faktur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
