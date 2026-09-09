import React, { useState, useMemo } from 'react';
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
  Boxes
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

  // Items in current PO form
  const [formItems, setFormItems] = useState<PurchaseItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemUnit, setItemUnit] = useState<string>('Pcs');
  const [itemConversionMultiplier, setItemConversionMultiplier] = useState<number>(1);
  const [isCustomUnit, setIsCustomUnit] = useState<boolean>(false);
  const [itemQuantity, setItemQuantity] = useState<number>(10);
  const [itemCostPrice, setItemCostPrice] = useState<number>(0);

  // Currently selected product in the form
  const currentProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  // Unit options registered on the current product (Base unit + conversion tiers)
  const currentUnitOptions = useMemo(() => {
    if (!currentProduct) return [];
    return getProductUnitOptions(currentProduct);
  }, [currentProduct]);

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

  // Handle open create modal
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
    setFormItems([]);
    
    // Select first product
    if (products.length > 0) {
      const firstProd = products[0];
      setSelectedProductId(firstProd.id);
      const baseUnit = firstProd.unit || 'Pcs';
      setItemUnit(baseUnit);
      setItemConversionMultiplier(1);
      setIsCustomUnit(false);
      setItemQuantity(10);
      setItemCostPrice(firstProd.costPrice || Math.round(firstProd.price * 0.75));
    }

    setIsCreateModalOpen(true);
  };

  // When selected product changes in form, prefill its unit and cost price
  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      const baseUnit = prod.unit || 'Pcs';
      setItemUnit(baseUnit);
      setItemConversionMultiplier(1);
      setIsCustomUnit(false);
      setItemCostPrice(prod.costPrice || Math.round(prod.price * 0.75));
    }
  };

  // When unit changes in form, automatically set conversion multiplier
  const handleUnitChange = (newUnit: string) => {
    setItemUnit(newUnit);
    const matchedOpt = currentUnitOptions.find(o => o.unitName.toLowerCase() === newUnit.toLowerCase());
    if (matchedOpt) {
      setItemConversionMultiplier(matchedOpt.multiplier || 1);
    } else {
      const lower = newUnit.toLowerCase();
      if (lower === 'lusin') {
        setItemConversionMultiplier(12);
      } else if (lower === 'kodi') {
        setItemConversionMultiplier(20);
      } else if (lower === 'gross') {
        setItemConversionMultiplier(144);
      } else {
        setItemConversionMultiplier(1);
      }
    }
  };

  // Add item to PO draft
  const handleAddItemToForm = () => {
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;
    if (itemQuantity <= 0) {
      alert('Kuantitas barang harus lebih besar dari 0');
      return;
    }
    if (itemCostPrice < 0) {
      alert('Harga modal beli tidak boleh negatif');
      return;
    }

    const cleanUnit = itemUnit.trim() || prod.unit || 'Pcs';
    const baseUnit = prod.unit || 'Pcs';
    const multiplier = itemConversionMultiplier > 0 ? itemConversionMultiplier : 1;
    const baseQty = itemQuantity * multiplier;

    // Check if already in list with SAME unit
    const existingIndex = formItems.findIndex(i => i.productId === prod.id && i.unit.toLowerCase() === cleanUnit.toLowerCase());
    if (existingIndex >= 0) {
      const updated = [...formItems];
      updated[existingIndex].quantity += itemQuantity;
      updated[existingIndex].costPrice = itemCostPrice;
      updated[existingIndex].subtotal = updated[existingIndex].quantity * itemCostPrice;
      updated[existingIndex].baseQuantity = (updated[existingIndex].baseQuantity || 0) + baseQty;
      setFormItems(updated);
    } else {
      const newItem: PurchaseItem = {
        id: `pitem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        productId: prod.id,
        productName: prod.name,
        barcode: prod.barcode,
        unit: cleanUnit,
        quantity: itemQuantity,
        costPrice: itemCostPrice,
        subtotal: itemQuantity * itemCostPrice,
        sellingPrice: prod.price,
        conversionMultiplier: multiplier,
        baseUnit: baseUnit,
        baseQuantity: baseQty,
      };
      setFormItems([...formItems, newItem]);
    }

    // Reset qty
    setItemQuantity(10);
  };

  const handleRemoveFormItem = (index: number) => {
    setFormItems(formItems.filter((_, idx) => idx !== index));
  };

  // Save Purchase Order & Automatically Increase Stock!
  const handleSavePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (formItems.length === 0) {
      alert('Mohon tambahkan minimal 1 barang yang dibeli');
      return;
    }

    const sup = suppliers.find(s => s.id === supplierId);
    const targetStore = stores.find(st => st.id === storeId) || stores[0];

    const subtotal = formItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalQty = formItems.reduce((sum, item) => sum + item.quantity, 0);
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
      items: formItems,
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
        const matchingItems = formItems.filter(it => it.productId === prod.id);
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
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Faktur Pembelian Barang Masuk</h3>
                  <p className="text-xs text-stone-500">Stok barang di katalog fisik akan otomatis bertambah saat disimpan</p>
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

              {/* ITEM BUILDER SECTION */}
              <div className="border border-stone-200 rounded-2xl p-4 bg-emerald-50/40 space-y-3">
                <div className="font-bold text-stone-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <PackagePlus className="w-4 h-4 text-emerald-600" />
                    Pilih & Tambah Barang yang Dibeli
                  </span>
                  <span className="text-[11px] text-stone-500 font-normal">
                    Pilih produk dari katalog master
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  {/* 1. Pilih Produk */}
                  <div className="sm:col-span-4">
                    <label className="block font-semibold text-stone-700 mb-1">Pilih Produk *</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleSelectProduct(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white text-xs font-semibold text-stone-900 truncate"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stok: {p.stock || 0} {p.unit || 'Pcs'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Satuan Barang */}
                  <div className="sm:col-span-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-stone-700">Satuan Barang *</label>
                      <button
                        type="button"
                        onClick={() => setIsCustomUnit(!isCustomUnit)}
                        className="text-[10px] text-emerald-700 hover:underline font-bold"
                      >
                        {isCustomUnit ? 'Pilih Satuan' : '+ Ketik Baru'}
                      </button>
                    </div>

                    {isCustomUnit ? (
                      <input
                        type="text"
                        value={itemUnit}
                        onChange={(e) => setItemUnit(e.target.value)}
                        placeholder="Ketik satuan, misal: Karton, Bal..."
                        className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white text-xs font-bold text-indigo-700"
                      />
                    ) : (
                      <select
                        value={itemUnit}
                        onChange={(e) => handleUnitChange(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white text-xs font-bold text-indigo-700"
                      >
                        <optgroup label="Satuan Terdaftar Produk">
                          {currentUnitOptions.map(opt => (
                            <option key={opt.unitName} value={opt.unitName}>
                              {opt.unitName} {opt.multiplier > 1 ? `(= ${opt.multiplier} ${currentProduct?.unit || 'Pcs'})` : '(Satuan Dasar)'}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Satuan Grosir / Kulakan Umum">
                          {COMMON_SUPPLIER_UNITS.filter(u => !currentUnitOptions.some(o => o.unitName.toLowerCase() === u.toLowerCase())).map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </optgroup>
                      </select>
                    )}
                  </div>

                  {/* 3. Jumlah Qty */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-stone-700 mb-1">Jumlah Qty *</label>
                    <input
                      type="number"
                      min="1"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white font-bold text-center text-xs"
                    />
                  </div>

                  {/* 4. Harga Modal per Satuan */}
                  <div className="sm:col-span-3">
                    <label className="block font-semibold text-stone-700 mb-1 truncate" title={`Harga Modal / ${itemUnit || 'Satuan'}`}>
                      Harga Modal / {itemUnit || 'Satuan'} (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={itemCostPrice}
                      onChange={(e) => setItemCostPrice(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white font-bold text-emerald-700 text-xs"
                    />
                  </div>
                </div>

                {/* Konversi Satuan Masuk Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-stone-200 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Scale className="w-3.5 h-3.5 text-stone-400" />
                    <span className="text-stone-500 font-medium">Konversi Stok Fisik:</span>
                    <span className="font-bold text-stone-800">
                      1 {itemUnit || 'Satuan'} =
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={itemConversionMultiplier}
                      onChange={(e) => setItemConversionMultiplier(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 px-1.5 py-0.5 border border-stone-200 rounded-lg text-center font-bold text-emerald-700 bg-stone-50"
                    />
                    <span className="font-bold text-stone-700">
                      {currentProduct?.unit || 'Pcs'}
                    </span>
                    <span className="text-[11px] text-stone-400 ml-1">
                      (Total masuk: <strong className="text-emerald-700 font-bold">+{itemQuantity * (itemConversionMultiplier || 1)} {currentProduct?.unit || 'Pcs'}</strong>)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemToForm}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1 shadow-xs transition-colors ml-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Barang</span>
                  </button>
                </div>

                {/* Added Items Table */}
                {formItems.length > 0 ? (
                  <div className="border border-stone-200 rounded-xl bg-white overflow-hidden mt-3">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                        <tr>
                          <th className="px-3 py-2 text-center w-8">No</th>
                          <th className="px-3 py-2">Nama Produk & Barcode</th>
                          <th className="px-3 py-2 text-center">Jumlah Qty</th>
                          <th className="px-3 py-2 text-center">Satuan Barang</th>
                          <th className="px-3 py-2 text-center">Stok Masuk Fisik</th>
                          <th className="px-3 py-2 text-right">Harga Modal / Satuan</th>
                          <th className="px-3 py-2 text-right">Subtotal</th>
                          <th className="px-3 py-2 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {formItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-stone-50">
                            <td className="px-3 py-2 text-center text-stone-400 font-medium">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <div className="font-semibold text-stone-900">{item.productName}</div>
                              {item.barcode && <div className="text-[10px] text-stone-400 font-mono">{item.barcode}</div>}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-stone-900">
                              {item.quantity}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {item.unit}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center text-[11px] font-bold text-emerald-700">
                              +{item.baseQuantity || (item.quantity * (item.conversionMultiplier || 1))} {item.baseUnit || 'Pcs'}
                              {(item.conversionMultiplier || 1) > 1 && (
                                <span className="block text-[10px] text-stone-400 font-normal">
                                  (1 {item.unit} = {item.conversionMultiplier} {item.baseUnit})
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {formatRupiah(item.costPrice)} / {item.unit}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-stone-900">
                              {formatRupiah(item.subtotal)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveFormItem(idx)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded-md"
                                title="Hapus baris barang"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-stone-50 font-bold border-t border-stone-200">
                        <tr>
                          <td className="px-3 py-2.5" colSpan={2}>Total Belanja Barang</td>
                          <td className="px-3 py-2.5 text-center text-stone-900">
                            {formItems.reduce((sum, i) => sum + i.quantity, 0)}
                          </td>
                          <td className="px-3 py-2.5 text-center text-stone-500 text-[11px]">
                            {Array.from(new Set(formItems.map(i => i.unit))).join(', ')}
                          </td>
                          <td className="px-3 py-2.5 text-center text-emerald-700">
                            +{formItems.reduce((sum, i) => sum + (i.baseQuantity || (i.quantity * (i.conversionMultiplier || 1))), 0)} fisik
                          </td>
                          <td></td>
                          <td className="px-3 py-2.5 text-right text-stone-900 text-sm">
                            {formatRupiah(formItems.reduce((sum, i) => sum + i.subtotal, 0))}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-white/70 rounded-xl border border-dashed border-stone-300 text-stone-400 text-xs">
                    Belum ada barang dipilih. Silakan pilih produk di atas, tentukan satuan barang dan harga, lalu klik "+ Tambah Barang".
                  </div>
                )}
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
