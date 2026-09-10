import React, { useState, useMemo, useEffect } from 'react';
import { 
  Product, 
  Store, 
  Order, 
  Supplier, 
  PurchaseOrder, 
  SalesReturn, 
  SalesReturnItem, 
  PurchaseReturn, 
  PurchaseReturnItem 
} from '../types';
import { formatRupiah } from '../utils/formatters';
import { 
  Undo2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Search, 
  Calendar, 
  Printer, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Trash2, 
  User, 
  Truck, 
  ShoppingBag, 
  Receipt, 
  Check, 
  PackageMinus, 
  PackagePlus, 
  RefreshCw 
} from 'lucide-react';
import { INITIAL_SALES_RETURNS, INITIAL_PURCHASE_RETURNS } from '../data/mockOperations';

interface ReturnsManagerProps {
  products: Product[];
  stores: Store[];
  currentStore: Store;
  orders: Order[];
  suppliers?: Supplier[];
  purchases?: PurchaseOrder[];
  onUpdateProducts: (products: Product[]) => void;
  salesReturns?: SalesReturn[];
  onUpdateSalesReturns?: (returns: SalesReturn[]) => void;
  purchaseReturns?: PurchaseReturn[];
  onUpdatePurchaseReturns?: (returns: PurchaseReturn[]) => void;
  onClose?: () => void;
}

export const ReturnsManager: React.FC<ReturnsManagerProps> = ({
  products,
  stores,
  currentStore,
  orders,
  suppliers = [],
  purchases = [],
  onUpdateProducts,
  salesReturns: propSalesReturns,
  onUpdateSalesReturns,
  purchaseReturns: propPurchaseReturns,
  onUpdatePurchaseReturns,
  onClose,
}) => {
  // Main Tab: 'sales_return' (Retur Jual) | 'purchase_return' (Retur Beli)
  const [activeTab, setActiveTab] = useState<'sales_return' | 'purchase_return'>('sales_return');

  // Active Store
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    currentStore?.id || stores[0]?.id || 'store_1'
  );
  const activeStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId) || currentStore || stores[0];
  }, [stores, selectedStoreId, currentStore]);

  // Persistent Sales Returns State
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>(() => {
    try {
      const saved = localStorage.getItem('kuickmart_sales_returns');
      if (saved) return JSON.parse(saved);
    } catch {}
    return propSalesReturns && propSalesReturns.length > 0
      ? propSalesReturns
      : INITIAL_SALES_RETURNS;
  });

  // Persistent Purchase Returns State
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>(() => {
    try {
      const saved = localStorage.getItem('kuickmart_purchase_returns');
      if (saved) return JSON.parse(saved);
    } catch {}
    return propPurchaseReturns && propPurchaseReturns.length > 0
      ? propPurchaseReturns
      : INITIAL_PURCHASE_RETURNS;
  });

  const saveSalesReturns = (newReturns: SalesReturn[]) => {
    setSalesReturns(newReturns);
    if (onUpdateSalesReturns) onUpdateSalesReturns(newReturns);
    try {
      localStorage.setItem('kuickmart_sales_returns', JSON.stringify(newReturns));
    } catch (e) {
      console.error(e);
    }
  };

  const savePurchaseReturns = (newReturns: PurchaseReturn[]) => {
    setPurchaseReturns(newReturns);
    if (onUpdatePurchaseReturns) onUpdatePurchaseReturns(newReturns);
    try {
      localStorage.setItem('kuickmart_purchase_returns', JSON.stringify(newReturns));
    } catch (e) {
      console.error(e);
    }
  };

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');

  // ==========================================
  // NEW SALES RETURN (RETUR JUAL) MODAL FORM
  // ==========================================
  const [isNewSalesModalOpen, setIsNewSalesModalOpen] = useState(false);
  const [srSelectedOrderId, setSrSelectedOrderId] = useState('');
  const [srCustomerName, setSrCustomerName] = useState('Pelanggan Kasir');
  const [srCustomerPhone, setSrCustomerPhone] = useState('');
  const [srCashierName, setSrCashierName] = useState('Kasir Toko (Budi)');
  const [srRefundMethod, setSrRefundMethod] = useState<'cash' | 'exchange' | 'credit_note' | 'points'>('cash');
  const [srNotes, setSrNotes] = useState('');
  const [srItems, setSrItems] = useState<
    Array<{
      productId: string;
      productName: string;
      barcode: string;
      unit: string;
      quantity: number;
      sellingPrice: number;
      condition: 'good' | 'damaged' | 'expired';
      reason: string;
      restocked: boolean;
      maxQty?: number;
    }>
  >([]);

  // When order is selected in Sales Return form, auto-fill items
  const handleSelectOrderForReturn = (orderId: string) => {
    setSrSelectedOrderId(orderId);
    if (!orderId) return;

    const matchedOrder = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (matchedOrder) {
      setSrCustomerName(matchedOrder.customerName || 'Pelanggan Walk-In');
      setSrCustomerPhone(matchedOrder.customerPhone || '');
      // populate items from order
      const initialItems = matchedOrder.items.map((it) => {
        return {
          productId: it.product.id,
          productName: it.product.name,
          barcode: it.product.barcode || '',
          unit: it.selectedUnit || it.product.unit || 'Pcs',
          quantity: 1,
          sellingPrice: it.unitPrice || it.product.price,
          condition: 'good' as const,
          reason: 'Salah beli varian produk',
          restocked: true,
          maxQty: it.quantity,
        };
      });
      setSrItems(initialItems);
    }
  };

  // Add item manually to Sales Return
  const handleAddManualSalesReturnItem = () => {
    const firstProd = products[0];
    if (!firstProd) return;
    setSrItems((prev) => [
      ...prev,
      {
        productId: firstProd.id,
        productName: firstProd.name,
        barcode: firstProd.barcode || '',
        unit: firstProd.unit || 'Pcs',
        quantity: 1,
        sellingPrice: firstProd.price,
        condition: 'good',
        reason: 'Salah beli varian',
        restocked: true,
      },
    ]);
  };

  // Submit New Sales Return
  const handleSubmitSalesReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (srItems.length === 0) {
      alert('Pilih minimal 1 barang yang diretur!');
      return;
    }

    const totalQty = srItems.reduce((sum, it) => sum + it.quantity, 0);
    const totalAmt = srItems.reduce((sum, it) => sum + it.quantity * it.sellingPrice, 0);
    const docNo = `RJ-${new Date().toISOString().replace(/-/g, '').slice(0, 6)}-${String(
      salesReturns.length + 1
    ).padStart(3, '0')}`;

    const newReturnRecord: SalesReturn = {
      id: `sr_${Date.now()}`,
      returnNumber: docNo,
      orderId: srSelectedOrderId || undefined,
      orderNumber: srSelectedOrderId ? srSelectedOrderId : undefined,
      date: new Date().toISOString().split('T')[0],
      storeId: activeStore.id,
      storeName: activeStore.name,
      customerName: srCustomerName,
      customerPhone: srCustomerPhone,
      cashierName: srCashierName,
      items: srItems.map((it, idx) => ({
        id: `sri_${Date.now()}_${idx}`,
        productId: it.productId,
        productName: it.productName,
        barcode: it.barcode,
        unit: it.unit,
        quantity: it.quantity,
        sellingPrice: it.sellingPrice,
        subtotal: it.quantity * it.sellingPrice,
        condition: it.condition,
        reason: it.reason,
        restocked: it.restocked,
      })),
      totalQuantity: totalQty,
      totalAmount: totalAmt,
      refundMethod: srRefundMethod,
      status: 'completed',
      notes: srNotes,
      createdAt: new Date().toISOString(),
    };

    // Update product stock for items with restocked = true
    const updatedProducts = products.map((p) => {
      const returned = srItems.find((it) => it.productId === p.id && it.restocked);
      if (returned) {
        return {
          ...p,
          stock: (p.stock || 0) + returned.quantity,
        };
      }
      return p;
    });

    onUpdateProducts(updatedProducts);
    saveSalesReturns([newReturnRecord, ...salesReturns]);

    alert(`Retur Penjualan ${docNo} berhasil diproses!\nStok barang yang berkondisi baik telah dimasukkan kembali ke katalog.`);
    setIsNewSalesModalOpen(false);
    setSrItems([]);
    setSrNotes('');
    setSrSelectedOrderId('');
  };

  // ==========================================
  // NEW PURCHASE RETURN (RETUR BELI) MODAL FORM
  // ==========================================
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);
  const [prSupplierId, setPrSupplierId] = useState(suppliers[0]?.id || 'sup_001');
  const [prSelectedPoId, setPrSelectedPoId] = useState('');
  const [prHandledBy, setPrHandledBy] = useState('Staff Gudang (Agus)');
  const [prResolutionType, setPrResolutionType] = useState<
    'deduct_invoice' | 'cash_refund' | 'replacement'
  >('deduct_invoice');
  const [prNotes, setPrNotes] = useState('');
  const [prItems, setPrItems] = useState<
    Array<{
      productId: string;
      productName: string;
      barcode: string;
      unit: string;
      quantity: number;
      costPrice: number;
      reason: string;
    }>
  >([]);

  // When PO is selected in Purchase Return form
  const handleSelectPoForReturn = (poId: string) => {
    setPrSelectedPoId(poId);
    if (!poId) return;

    const matchedPo = purchases.find((p) => p.id === poId || p.purchaseNumber === poId);
    if (matchedPo) {
      setPrSupplierId(matchedPo.supplierId);
      const initialItems = matchedPo.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        barcode: it.barcode || '',
        unit: it.unit || 'Pcs',
        quantity: 1,
        costPrice: it.costPrice,
        reason: 'Kemasan rusak / sobek saat diterima',
      }));
      setPrItems(initialItems);
    }
  };

  // Add item manually to Purchase Return
  const handleAddManualPurchaseReturnItem = () => {
    const firstProd = products[0];
    if (!firstProd) return;
    setPrItems((prev) => [
      ...prev,
      {
        productId: firstProd.id,
        productName: firstProd.name,
        barcode: firstProd.barcode || '',
        unit: firstProd.unit || 'Pcs',
        quantity: 1,
        costPrice: firstProd.costPrice || Math.round(firstProd.price * 0.75),
        reason: 'Kemasan rusak / mendekati expired',
      },
    ]);
  };

  // Submit New Purchase Return
  const handleSubmitPurchaseReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (prItems.length === 0) {
      alert('Pilih minimal 1 barang yang akan diretur ke suplier!');
      return;
    }

    const matchedSupplier = suppliers.find((s) => s.id === prSupplierId) || {
      name: 'Supplier Terkait',
    };
    const totalQty = prItems.reduce((sum, it) => sum + it.quantity, 0);
    const totalAmt = prItems.reduce((sum, it) => sum + it.quantity * it.costPrice, 0);
    const docNo = `RB-${new Date().toISOString().replace(/-/g, '').slice(0, 6)}-${String(
      purchaseReturns.length + 1
    ).padStart(3, '0')}`;

    const newReturnRecord: PurchaseReturn = {
      id: `pr_${Date.now()}`,
      returnNumber: docNo,
      purchaseId: prSelectedPoId || undefined,
      purchaseNumber: prSelectedPoId ? prSelectedPoId : undefined,
      supplierId: prSupplierId,
      supplierName: matchedSupplier.name,
      date: new Date().toISOString().split('T')[0],
      storeId: activeStore.id,
      storeName: activeStore.name,
      items: prItems.map((it, idx) => ({
        id: `pri_${Date.now()}_${idx}`,
        productId: it.productId,
        productName: it.productName,
        barcode: it.barcode,
        unit: it.unit,
        quantity: it.quantity,
        costPrice: it.costPrice,
        subtotal: it.quantity * it.costPrice,
        reason: it.reason,
        stockReduced: true,
      })),
      totalQuantity: totalQty,
      totalAmount: totalAmt,
      resolutionType: prResolutionType,
      status: 'completed',
      handledBy: prHandledBy,
      notes: prNotes,
      createdAt: new Date().toISOString(),
    };

    // Automatically reduce product stock from catalog
    const updatedProducts = products.map((p) => {
      const returned = prItems.find((it) => it.productId === p.id);
      if (returned) {
        return {
          ...p,
          stock: Math.max(0, (p.stock || 0) - returned.quantity),
        };
      }
      return p;
    });

    onUpdateProducts(updatedProducts);
    savePurchaseReturns([newReturnRecord, ...purchaseReturns]);

    alert(`Surat Jalan Retur Pembelian ${docNo} berhasil diterbitkan!\nStok barang telah dikurangkan dari katalog toko.`);
    setIsNewPurchaseModalOpen(false);
    setPrItems([]);
    setPrNotes('');
    setPrSelectedPoId('');
  };

  // Detail View Modal State
  const [viewingSalesReturn, setViewingSalesReturn] = useState<SalesReturn | null>(null);
  const [viewingPurchaseReturn, setViewingPurchaseReturn] = useState<PurchaseReturn | null>(null);

  // Filtered Lists
  const filteredSalesReturns = useMemo(() => {
    return salesReturns.filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.returnNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        (r.orderNumber && r.orderNumber.toLowerCase().includes(q))
      );
    });
  }, [salesReturns, searchQuery]);

  const filteredPurchaseReturns = useMemo(() => {
    return purchaseReturns.filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.returnNumber.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q) ||
        (r.purchaseNumber && r.purchaseNumber.toLowerCase().includes(q))
      );
    });
  }, [purchaseReturns, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-stone-100 text-stone-900">
      {/* Top Header */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
            <Undo2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-stone-900">
                Retur Barang (Jual & Beli)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                Logistik & Kasir
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Pencatatan pengembalian barang dari pelanggan (Retur Jual) dan ke suplier (Retur Beli)
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab('sales_return')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'sales_return'
                  ? 'bg-white text-amber-800 shadow-xs font-black'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" />
              <span>Retur Penjualan (Konsumen)</span>
            </button>
            <button
              onClick={() => setActiveTab('purchase_return')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'purchase_return'
                  ? 'bg-white text-amber-800 shadow-xs font-black'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
              <span>Retur Pembelian (Suplier)</span>
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600"
              title="Tutup Modul"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
        {/* ============================================================ */}
        {/* TAB 1: RETUR PENJUALAN (CUSTOMER SALES RETURN)               */}
        {/* ============================================================ */}
        {activeTab === 'sales_return' && (
          <div className="space-y-4">
            {/* KPI Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <span className="text-[11px] font-bold text-stone-500 uppercase">
                  Total Transaksi Retur Jual
                </span>
                <span className="text-2xl font-mono font-black text-stone-900 mt-1 block">
                  {salesReturns.length} Dokumen
                </span>
                <span className="text-[10px] text-stone-400">Pengembalian dari pembeli</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
                <span className="text-[11px] font-bold text-blue-800 uppercase">
                  Total Fisik Barang Diretur
                </span>
                <span className="text-2xl font-mono font-black text-blue-700 mt-1 block">
                  {salesReturns.reduce((sum, r) => sum + r.totalQuantity, 0)} Item
                </span>
                <span className="text-[10px] text-blue-600">Unit fisik kembali ke kasir/gudang</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
                <span className="text-[11px] font-bold text-amber-800 uppercase">
                  Total Nilai Refund Penjualan
                </span>
                <span className="text-2xl font-mono font-black text-amber-700 mt-1 block">
                  {formatRupiah(salesReturns.reduce((sum, r) => sum + r.totalAmount, 0))}
                </span>
                <span className="text-[10px] text-amber-600">Dana / deposit dikembalikan</span>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nomor retur (RJ-...), nama pelanggan, atau no. nota..."
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSrItems([]);
                  setSrCustomerName('Pelanggan Kasir');
                  setSrCustomerPhone('');
                  setSrSelectedOrderId('');
                  setIsNewSalesModalOpen(true);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Retur Penjualan Baru</span>
              </button>
            </div>

            {/* Table of Sales Returns */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">No. Retur</th>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">No. Nota Penjualan</th>
                      <th className="px-4 py-3">Nama Pelanggan</th>
                      <th className="px-4 py-3 text-center">Total Qty</th>
                      <th className="px-4 py-3 text-right">Nilai Refund (Rp)</th>
                      <th className="px-4 py-3 text-center">Metode Refund</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 font-medium">
                    {filteredSalesReturns.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-stone-400">
                          Belum ada transaksi retur penjualan dari pelanggan.
                        </td>
                      </tr>
                    ) : (
                      filteredSalesReturns.map((rec) => (
                        <tr key={rec.id} className="hover:bg-stone-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-blue-700">
                            {rec.returnNumber}
                          </td>
                          <td className="px-4 py-3 text-stone-600">{rec.date}</td>
                          <td className="px-4 py-3 font-mono text-stone-600">
                            {rec.orderNumber || '- (Penjualan Bebas)'}
                          </td>
                          <td className="px-4 py-3 font-bold text-stone-900">{rec.customerName}</td>
                          <td className="px-4 py-3 text-center font-mono font-bold">
                            {rec.totalQuantity} Item
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-stone-900">
                            {formatRupiah(rec.totalAmount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                              {rec.refundMethod === 'cash'
                                ? 'Tunai / Cash'
                                : rec.refundMethod === 'exchange'
                                ? 'Tukar Barang'
                                : 'Deposit/Kredit'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setViewingSalesReturn(rec)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat Detail</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: RETUR PEMBELIAN (SUPPLIER PURCHASE RETURN)            */}
        {/* ============================================================ */}
        {activeTab === 'purchase_return' && (
          <div className="space-y-4">
            {/* KPI Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <span className="text-[11px] font-bold text-stone-500 uppercase">
                  Total Surat Retur Suplier
                </span>
                <span className="text-2xl font-mono font-black text-stone-900 mt-1 block">
                  {purchaseReturns.length} Dokumen
                </span>
                <span className="text-[10px] text-stone-400">Pengembalian barang ke pemasok</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-red-200 bg-red-50/20 shadow-xs">
                <span className="text-[11px] font-bold text-red-800 uppercase">
                  Total Barang Dikeluarkan
                </span>
                <span className="text-2xl font-mono font-black text-red-700 mt-1 block">
                  {purchaseReturns.reduce((sum, r) => sum + r.totalQuantity, 0)} Item
                </span>
                <span className="text-[10px] text-red-600">Unit dikembalikan & dipotong stok</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
                <span className="text-[11px] font-bold text-emerald-800 uppercase">
                  Total Nilai Klaim Retur Beli
                </span>
                <span className="text-2xl font-mono font-black text-emerald-700 mt-1 block">
                  {formatRupiah(purchaseReturns.reduce((sum, r) => sum + r.totalAmount, 0))}
                </span>
                <span className="text-[10px] text-emerald-600">Nilai potong faktur / ganti barang</span>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nomor retur (RB-...), nama suplier, atau faktur beli..."
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setPrItems([]);
                  setPrSelectedPoId('');
                  setIsNewPurchaseModalOpen(true);
                }}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Retur Pembelian ke Suplier</span>
              </button>
            </div>

            {/* Table of Purchase Returns */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">No. Retur Beli</th>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Pemasok / Suplier</th>
                      <th className="px-4 py-3">No. Faktur Beli (PO)</th>
                      <th className="px-4 py-3 text-center">Total Qty</th>
                      <th className="px-4 py-3 text-right">Nilai Retur (Rp)</th>
                      <th className="px-4 py-3 text-center">Bentuk Kompensasi</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 font-medium">
                    {filteredPurchaseReturns.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-stone-400">
                          Belum ada transaksi retur pembelian ke suplier.
                        </td>
                      </tr>
                    ) : (
                      filteredPurchaseReturns.map((rec) => (
                        <tr key={rec.id} className="hover:bg-stone-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-red-700">
                            {rec.returnNumber}
                          </td>
                          <td className="px-4 py-3 text-stone-600">{rec.date}</td>
                          <td className="px-4 py-3 font-bold text-stone-900">{rec.supplierName}</td>
                          <td className="px-4 py-3 font-mono text-stone-600">
                            {rec.purchaseNumber || '-'}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold">
                            {rec.totalQuantity} Item
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-stone-900">
                            {formatRupiah(rec.totalAmount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                              {rec.resolutionType === 'deduct_invoice'
                                ? 'Potong Utang'
                                : rec.resolutionType === 'replacement'
                                ? 'Ganti Barang'
                                : 'Pengembalian Dana'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setViewingPurchaseReturn(rec)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat Detail</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL: FORM RETUR PENJUALAN (SALES RETURN)                   */}
      {/* ============================================================ */}
      {isNewSalesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-stone-200">
            <div className="px-5 py-4 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-blue-700" />
                <h3 className="text-base font-bold text-stone-900">
                  Formulir Retur Penjualan (Dari Pelanggan)
                </h3>
              </div>
              <button
                onClick={() => setIsNewSalesModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSalesReturn} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Header Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
                {/* Pilih Nota Penjualan */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Pilih Nomor Nota Penjualan (Opsional)
                  </label>
                  <select
                    value={srSelectedOrderId}
                    onChange={(e) => handleSelectOrderForReturn(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Retur Langsung / Input Bebas --</option>
                    {orders.slice(0, 30).map((ord) => (
                      <option key={ord.id} value={ord.orderNumber || ord.id}>
                        {ord.orderNumber} - {ord.customerName || 'Pelanggan'} ({formatRupiah(ord.total)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Metode Refund */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Bentuk Pengembalian / Refund
                  </label>
                  <select
                    value={srRefundMethod}
                    onChange={(e) => setSrRefundMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Uang Tunai (Cash Refund)</option>
                    <option value="exchange">Tukar Barang Sejenis</option>
                    <option value="credit_note">Potong Nota / Saldo Pelanggan</option>
                    <option value="points">Poin Belanja Loyalitas</option>
                  </select>
                </div>

                {/* Nama Pelanggan */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nama Pelanggan</label>
                  <input
                    type="text"
                    value={srCustomerName}
                    onChange={(e) => setSrCustomerName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Petugas Kasir */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Petugas Kasir</label>
                  <input
                    type="text"
                    value={srCashierName}
                    onChange={(e) => setSrCashierName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">
                    Daftar Barang yang Diretur ({srItems.length} item)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddManualSalesReturnItem}
                    className="px-2.5 py-1 bg-white hover:bg-stone-200 border border-stone-300 text-stone-700 rounded-lg text-xs font-bold transition-colors"
                  >
                    + Tambah Baris Produk
                  </button>
                </div>

                <div className="p-3 space-y-3">
                  {srItems.length === 0 ? (
                    <p className="text-center py-4 text-xs text-stone-400">
                      Belum ada barang dipilih. Silakan pilih nota penjualan di atas atau klik "+ Tambah Baris Produk".
                    </p>
                  ) : (
                    srItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs space-y-2"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          {/* Produk */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                              Produk
                            </label>
                            <select
                              value={item.productId}
                              onChange={(e) => {
                                const p = products.find((prod) => prod.id === e.target.value);
                                if (p) {
                                  const upd = [...srItems];
                                  upd[idx] = {
                                    ...upd[idx],
                                    productId: p.id,
                                    productName: p.name,
                                    barcode: p.barcode || '',
                                    unit: p.unit || 'Pcs',
                                    sellingPrice: p.price,
                                  };
                                  setSrItems(upd);
                                }
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg font-semibold"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.unit || 'Pcs'}) - {formatRupiah(p.price)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Qty */}
                          <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                              Qty Retur ({item.unit})
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={item.maxQty || 999}
                              value={item.quantity}
                              onChange={(e) => {
                                const q = parseInt(e.target.value) || 1;
                                const upd = [...srItems];
                                upd[idx] = { ...upd[idx], quantity: q };
                                setSrItems(upd);
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-center font-bold"
                            />
                          </div>

                          {/* Harga Satuan */}
                          <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                              Subtotal Refund
                            </label>
                            <div className="px-2 py-1.5 bg-stone-100 border border-stone-200 rounded-lg font-mono font-bold text-stone-800 text-right">
                              {formatRupiah(item.quantity * item.sellingPrice)}
                            </div>
                          </div>
                        </div>

                        {/* Kondisi & Alasan */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-stone-200">
                          <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                              Kondisi Barang
                            </label>
                            <select
                              value={item.condition}
                              onChange={(e) => {
                                const c = e.target.value as any;
                                const upd = [...srItems];
                                upd[idx] = {
                                  ...upd[idx],
                                  condition: c,
                                  restocked: c === 'good',
                                };
                                setSrItems(upd);
                              }}
                              className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg font-semibold"
                            >
                              <option value="good">Bagus / Layak Jual (Bisa Restock)</option>
                              <option value="damaged">Rusak / Kemasan Bocor (Afkir)</option>
                              <option value="expired">Kedaluwarsa / Basi (Afkir)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                              Alasan Pengembalian
                            </label>
                            <input
                              type="text"
                              value={item.reason}
                              onChange={(e) => {
                                const upd = [...srItems];
                                upd[idx] = { ...upd[idx], reason: e.target.value };
                                setSrItems(upd);
                              }}
                              placeholder="Cth: Salah varian, bocor..."
                              className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-3">
                            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-stone-700">
                              <input
                                type="checkbox"
                                checked={item.restocked}
                                onChange={(e) => {
                                  const upd = [...srItems];
                                  upd[idx] = { ...upd[idx], restocked: e.target.checked };
                                  setSrItems(upd);
                                }}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span>Masuk Stok Katalog</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => setSrItems(srItems.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Total & Notes */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs">
                  <span className="text-stone-500 block">Total Pengembalian:</span>
                  <span className="text-xl font-mono font-black text-blue-700">
                    {formatRupiah(srItems.reduce((sum, it) => sum + it.quantity * it.sellingPrice, 0))}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewSalesModalOpen(false)}
                    className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan & Selesaikan Retur</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: FORM RETUR PEMBELIAN (PURCHASE RETURN)                */}
      {/* ============================================================ */}
      {isNewPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-stone-200">
            <div className="px-5 py-4 bg-red-50 border-b border-red-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-red-700" />
                <h3 className="text-base font-bold text-stone-900">
                  Surat Jalan Retur Pembelian (Ke Suplier)
                </h3>
              </div>
              <button
                onClick={() => setIsNewPurchaseModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchaseReturn} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Header Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
                {/* Pemasok / Suplier */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Pilih Suplier / Pemasok
                  </label>
                  <select
                    value={prSupplierId}
                    onChange={(e) => setPrSupplierId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-semibold focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pilih PO / Faktur Beli Asli */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Berdasarkan Faktur Pembelian (Opsional)
                  </label>
                  <select
                    value={prSelectedPoId}
                    onChange={(e) => handleSelectPoForReturn(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-semibold focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- Retur Manual / Tanpa PO --</option>
                    {purchases.slice(0, 30).map((po) => (
                      <option key={po.id} value={po.purchaseNumber || po.id}>
                        {po.purchaseNumber} - {po.supplierName} ({formatRupiah(po.totalAmount)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bentuk Kompensasi Suplier */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Bentuk Kompensasi Suplier
                  </label>
                  <select
                    value={prResolutionType}
                    onChange={(e) => setPrResolutionType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-semibold focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  >
                    <option value="deduct_invoice">Potong Tagihan Faktur / Utang Tempo</option>
                    <option value="replacement">Klaim Ganti Barang Baru</option>
                    <option value="cash_refund">Pengembalian Dana Tunai / Transfer</option>
                  </select>
                </div>

                {/* Petugas Gudang */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Petugas Gudang</label>
                  <input
                    type="text"
                    value={prHandledBy}
                    onChange={(e) => setPrHandledBy(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-semibold focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">
                    Daftar Barang yang Dikembalikan ke Suplier ({prItems.length} item)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddManualPurchaseReturnItem}
                    className="px-2.5 py-1 bg-white hover:bg-stone-200 border border-stone-300 text-stone-700 rounded-lg text-xs font-bold transition-colors"
                  >
                    + Tambah Produk
                  </button>
                </div>

                <div className="p-3 space-y-3">
                  {prItems.length === 0 ? (
                    <p className="text-center py-4 text-xs text-stone-400">
                      Belum ada barang dipilih. Silakan pilih nomor PO di atas atau klik "+ Tambah Produk".
                    </p>
                  ) : (
                    prItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs space-y-2"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          {/* Produk */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                              Produk
                            </label>
                            <select
                              value={item.productId}
                              onChange={(e) => {
                                const p = products.find((prod) => prod.id === e.target.value);
                                if (p) {
                                  const upd = [...prItems];
                                  upd[idx] = {
                                    ...upd[idx],
                                    productId: p.id,
                                    productName: p.name,
                                    barcode: p.barcode || '',
                                    unit: p.unit || 'Pcs',
                                    costPrice: p.costPrice || Math.round(p.price * 0.75),
                                  };
                                  setPrItems(upd);
                                }
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg font-semibold"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (Stok saat ini: {p.stock || 0} {p.unit || 'Pcs'})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Qty */}
                          <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                              Qty Dikembalikan
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const q = parseInt(e.target.value) || 1;
                                const upd = [...prItems];
                                upd[idx] = { ...upd[idx], quantity: q };
                                setPrItems(upd);
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-center font-bold"
                            />
                          </div>

                          {/* Nilai HPP / Beli */}
                          <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                              Total Nilai Retur
                            </label>
                            <div className="px-2 py-1.5 bg-stone-100 border border-stone-200 rounded-lg font-mono font-bold text-stone-800 text-right">
                              {formatRupiah(item.quantity * item.costPrice)}
                            </div>
                          </div>
                        </div>

                        {/* Alasan */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-200">
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                              Alasan Pengembalian ke Suplier
                            </label>
                            <input
                              type="text"
                              value={item.reason}
                              onChange={(e) => {
                                const upd = [...prItems];
                                upd[idx] = { ...upd[idx], reason: e.target.value };
                                setPrItems(upd);
                              }}
                              placeholder="Cth: Kemasan rusak, mendekati expired, kelebihan kirim..."
                              className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => setPrItems(prItems.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 p-1 self-end mb-0.5"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Total & Submit */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs">
                  <span className="text-stone-500 block">Total Nilai Tagihan Retur:</span>
                  <span className="text-xl font-mono font-black text-red-700">
                    {formatRupiah(prItems.reduce((sum, it) => sum + it.quantity * it.costPrice, 0))}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewPurchaseModalOpen(false)}
                    className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Terbitkan Surat Retur & Kurangi Stok</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DETAIL RETUR PENJUALAN                                */}
      {/* ============================================================ */}
      {viewingSalesReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden border border-stone-200">
            <div className="px-5 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Rincian Retur Jual: {viewingSalesReturn.returnNumber}
                </h3>
                <p className="text-xs text-stone-500">
                  Tanggal: {viewingSalesReturn.date} • Pelanggan: {viewingSalesReturn.customerName}
                </p>
              </div>
              <button
                onClick={() => setViewingSalesReturn(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3 text-xs">
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Nama Produk</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Harga</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                      <th className="p-2.5">Alasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 font-medium">
                    {viewingSalesReturn.items.map((it) => (
                      <tr key={it.id}>
                        <td className="p-2.5 font-bold">{it.productName}</td>
                        <td className="p-2.5 text-center font-mono">{it.quantity} {it.unit}</td>
                        <td className="p-2.5 text-right font-mono">{formatRupiah(it.sellingPrice)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-blue-700">
                          {formatRupiah(it.subtotal)}
                        </td>
                        <td className="p-2.5 text-stone-500">{it.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-right pt-2">
                <span className="text-stone-500 block">Total Refund:</span>
                <span className="text-lg font-mono font-black text-blue-700">
                  {formatRupiah(viewingSalesReturn.totalAmount)}
                </span>
              </div>
            </div>

            <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Nota Retur</span>
              </button>
              <button
                onClick={() => setViewingSalesReturn(null)}
                className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DETAIL RETUR PEMBELIAN                                */}
      {/* ============================================================ */}
      {viewingPurchaseReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden border border-stone-200">
            <div className="px-5 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Surat Jalan Retur Beli: {viewingPurchaseReturn.returnNumber}
                </h3>
                <p className="text-xs text-stone-500">
                  Suplier: {viewingPurchaseReturn.supplierName} • Tanggal: {viewingPurchaseReturn.date}
                </p>
              </div>
              <button
                onClick={() => setViewingPurchaseReturn(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3 text-xs">
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Nama Produk</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Harga Modal</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                      <th className="p-2.5">Alasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 font-medium">
                    {viewingPurchaseReturn.items.map((it) => (
                      <tr key={it.id}>
                        <td className="p-2.5 font-bold">{it.productName}</td>
                        <td className="p-2.5 text-center font-mono">{it.quantity} {it.unit}</td>
                        <td className="p-2.5 text-right font-mono">{formatRupiah(it.costPrice)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-red-700">
                          {formatRupiah(it.subtotal)}
                        </td>
                        <td className="p-2.5 text-stone-500">{it.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-right pt-2">
                <span className="text-stone-500 block">Total Nilai Retur ke Suplier:</span>
                <span className="text-lg font-mono font-black text-red-700">
                  {formatRupiah(viewingPurchaseReturn.totalAmount)}
                </span>
              </div>
            </div>

            <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Surat Jalan</span>
              </button>
              <button
                onClick={() => setViewingPurchaseReturn(null)}
                className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
