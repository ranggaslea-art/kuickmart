import React, { useMemo } from 'react';
import { Product, PurchaseOrder, Order, Supplier } from '../types';
import { formatRupiah } from '../utils/formatters';
import { getProductUnitOptions, formatStockBreakdown } from '../utils/unitConversion';
import {
  Info,
  X,
  History,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  ShoppingCart,
  Boxes,
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Barcode,
  Layers,
  Building2,
  Percent,
  Check,
} from 'lucide-react';

interface ProductPurchaseHistoryModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  purchases?: PurchaseOrder[];
  orders?: Order[];
  suppliers?: Supplier[];
  /**
   * Callback when user accepts the recommended order quantity
   * to immediately populate into the purchase order form.
   */
  onApplyRecommendation?: (params: {
    productId: string;
    productName: string;
    barcode: string;
    unit: string;
    conversionMultiplier: number;
    quantity: number;
    costPrice: number;
  }) => void;
}

export const ProductPurchaseHistoryModal: React.FC<ProductPurchaseHistoryModalProps> = ({
  product,
  isOpen,
  onClose,
  purchases = [],
  orders = [],
  suppliers = [],
  onApplyRecommendation,
}) => {
  if (!isOpen || !product) return null;

  // 1. Available Unit Options (Pcs, Dus, Karton, etc.)
  const unitOptions = useMemo(() => {
    return getProductUnitOptions(product);
  }, [product]);

  const dusOption = useMemo(() => {
    return unitOptions.find(o => !o.isBase && (
      o.unitName.toLowerCase().includes('dus') ||
      o.unitName.toLowerCase().includes('karton') ||
      o.unitName.toLowerCase().includes('box') ||
      o.unitName.toLowerCase().includes('pak') ||
      o.multiplier > 1
    ));
  }, [unitOptions]);

  // 2. Sales History Calculations
  const salesHistory = useMemo(() => {
    const matchingSales: {
      orderId: string;
      orderNumber: string;
      date: string;
      customerName: string;
      quantity: number;
      unit: string;
      baseQuantity: number;
      price: number;
      total: number;
    }[] = [];

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let sold7Days = 0;
    let sold30Days = 0;
    let totalSoldFromOrders = 0;

    orders.forEach(ord => {
      (ord.items || []).forEach(ci => {
        if (ci.product?.id === product.id) {
          const mult = ci.conversionMultiplier || 1;
          const baseQty = (ci.quantity || 1) * mult;
          const ordDate = new Date(ord.createdAt);

          totalSoldFromOrders += baseQty;
          if (ordDate >= sevenDaysAgo) sold7Days += baseQty;
          if (ordDate >= thirtyDaysAgo) sold30Days += baseQty;

          matchingSales.push({
            orderId: ord.id,
            orderNumber: ord.orderNumber || ord.id.slice(0, 8),
            date: ord.createdAt ? ord.createdAt.slice(0, 10) : '-',
            customerName: ord.customerName || 'Pelanggan Kasir POS',
            quantity: ci.quantity,
            unit: ci.selectedUnit || product.unit || 'Pcs',
            baseQuantity: baseQty,
            price: ci.unitPrice || product.price,
            total: (ci.unitPrice || product.price) * ci.quantity,
          });
        }
      });
    });

    // Sort recent sales first
    matchingSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Daily average sales (velocity)
    // If no recent order records, estimate based on product.soldCount
    const dailyVelocity = sold30Days > 0 
      ? Number((sold30Days / 30).toFixed(1))
      : product.soldCount > 0 
        ? Number((product.soldCount / 60).toFixed(1)) 
        : 1;

    return {
      matchingSales: matchingSales.slice(0, 6),
      sold7Days: sold7Days > 0 ? sold7Days : Math.round(dailyVelocity * 7),
      sold30Days: sold30Days > 0 ? sold30Days : Math.round(dailyVelocity * 30),
      totalSold: (product.soldCount || 0) + totalSoldFromOrders,
      dailyVelocity: Math.max(0.5, dailyVelocity),
    };
  }, [product, orders]);

  // 3. Purchase History Calculations from Suppliers
  const purchaseHistory = useMemo(() => {
    const matchingPurchases: {
      poId: string;
      purchaseNumber: string;
      invoiceNumber?: string;
      date: string;
      supplierName: string;
      supplierId: string;
      quantity: number;
      unit: string;
      baseQuantity: number;
      costPrice: number;
      subtotal: number;
      status: string;
    }[] = [];

    let totalPurchasedUnits = 0;
    let totalPurchasedSpend = 0;

    purchases.forEach(po => {
      (po.items || []).forEach(it => {
        if (it.productId === product.id) {
          const mult = it.conversionMultiplier || 1;
          const baseQty = it.baseQuantity || (it.quantity * mult);
          totalPurchasedUnits += baseQty;
          totalPurchasedSpend += it.subtotal || 0;

          matchingPurchases.push({
            poId: po.id,
            purchaseNumber: po.purchaseNumber,
            invoiceNumber: po.invoiceNumber,
            date: po.receivedDate || po.orderDate || po.createdAt?.slice(0, 10) || '-',
            supplierName: po.supplierName,
            supplierId: po.supplierId,
            quantity: it.quantity,
            unit: it.unit || 'Pcs',
            baseQuantity: baseQty,
            costPrice: it.costPrice,
            subtotal: it.subtotal,
            status: po.status,
          });
        }
      });
    });

    // Sort by recent purchase date
    matchingPurchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const lastPurchase = matchingPurchases[0];
    const previousPurchase = matchingPurchases[1];

    let priceTrend: 'up' | 'down' | 'same' | 'none' = 'none';
    let priceDiffPercent = 0;

    if (lastPurchase && previousPurchase && previousPurchase.costPrice > 0) {
      const diff = lastPurchase.costPrice - previousPurchase.costPrice;
      priceDiffPercent = Math.round((Math.abs(diff) / previousPurchase.costPrice) * 100);
      if (diff > 0) priceTrend = 'up';
      else if (diff < 0) priceTrend = 'down';
      else priceTrend = 'same';
    }

    return {
      matchingPurchases: matchingPurchases.slice(0, 6),
      totalPurchasesCount: matchingPurchases.length,
      totalPurchasedUnits,
      totalPurchasedSpend,
      lastPurchase,
      priceTrend,
      priceDiffPercent,
    };
  }, [product, purchases]);

  // 4. Inventory Health & Smart Reorder Advisor
  const inventoryHealth = useMemo(() => {
    const currentStock = typeof product.stock === 'number' ? product.stock : 0;
    const minStock = typeof product.minStock === 'number' && product.minStock > 0 ? product.minStock : 10;
    const dailyVelocity = salesHistory.dailyVelocity;

    // Days of inventory remaining
    const daysRemaining = dailyVelocity > 0 ? Math.round(currentStock / dailyVelocity) : 999;

    let status: 'critical' | 'low' | 'good' = 'good';
    if (currentStock <= 0) {
      status = 'critical';
    } else if (currentStock <= minStock || daysRemaining <= 3) {
      status = 'low';
    }

    // Recommended order quantity for a 14-day safety buffer
    const targetBufferDays = 14;
    const targetStock = Math.ceil(dailyVelocity * targetBufferDays) + minStock;
    const neededBaseQty = Math.max(1, targetStock - currentStock);

    // If product has a wholesale unit (Dus/Karton), convert suggestion into DUS!
    let suggestedQty = neededBaseQty;
    let suggestedUnit = product.unit || 'Pcs';
    let suggestedMultiplier = 1;
    let suggestedCostPrice = product.costPrice || Math.round(product.price * 0.75);
    let suggestionText = '';

    if (dusOption && dusOption.multiplier > 1) {
      const dusMultiplier = dusOption.multiplier;
      const numDus = Math.ceil(neededBaseQty / dusMultiplier);
      suggestedQty = Math.max(1, numDus);
      suggestedUnit = dusOption.unitName;
      suggestedMultiplier = dusMultiplier;
      suggestedCostPrice = dusOption.price || (product.costPrice ? product.costPrice * dusMultiplier : Math.round(product.price * 0.75 * dusMultiplier));
      suggestionText = `${suggestedQty} ${dusOption.unitName} (= +${suggestedQty * dusMultiplier} ${product.unit || 'Pcs'} fisik)`;
    } else {
      suggestionText = `${suggestedQty} ${product.unit || 'Pcs'}`;
    }

    return {
      currentStock,
      minStock,
      daysRemaining,
      status,
      suggestedQty,
      suggestedUnit,
      suggestedMultiplier,
      suggestedCostPrice,
      suggestionText,
      totalPhysicalAfterOrder: currentStock + (suggestedQty * suggestedMultiplier),
    };
  }, [product, salesHistory, dusOption]);

  const stockBreakdown = formatStockBreakdown(product.stock, product.unit, product.unitConversions);

  // Handle Apply recommendation
  const handleApply = () => {
    if (onApplyRecommendation) {
      // Find matching barcode for the suggested unit
      const matchedUnitOpt = unitOptions.find(u => u.unitName.toLowerCase() === inventoryHealth.suggestedUnit.toLowerCase());
      const barcodeToUse = matchedUnitOpt?.barcode || product.barcode || '';

      onApplyRecommendation({
        productId: product.id,
        productName: product.name,
        barcode: barcodeToUse,
        unit: inventoryHealth.suggestedUnit,
        conversionMultiplier: inventoryHealth.suggestedMultiplier,
        quantity: inventoryHealth.suggestedQty,
        costPrice: inventoryHealth.suggestedCostPrice,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-70 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-5 my-6 max-h-[94vh] overflow-y-auto">
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-2xs overflow-hidden shrink-0">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                  {product.category || 'Barang'}
                </span>
                {product.brand && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                    Merk: {product.brand}
                  </span>
                )}
                {product.shelf && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                    Rak: {product.shelf}
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-stone-900 text-base sm:text-lg mt-0.5">
                {product.name}
              </h3>
              <div className="flex items-center gap-3 text-xs text-stone-500 font-mono mt-0.5">
                <span>Barcode Pcs: <strong className="text-stone-800">{product.barcode || '-'}</strong></span>
                {dusOption?.barcode && dusOption.barcode !== product.barcode && (
                  <span>Barcode {dusOption.unitName}: <strong className="text-indigo-700">{dusOption.barcode}</strong></span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SMART ORDER ADVISOR & STOCK HEALTH BANNER */}
        <div className={`p-4 rounded-2xl border transition-all ${
          inventoryHealth.status === 'critical'
            ? 'bg-rose-50/90 border-rose-200'
            : inventoryHealth.status === 'low'
              ? 'bg-amber-50/90 border-amber-200'
              : 'bg-emerald-50/80 border-emerald-200'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                  inventoryHealth.status === 'critical'
                    ? 'bg-rose-600 text-white'
                    : inventoryHealth.status === 'low'
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                }`}>
                  {inventoryHealth.status === 'critical' && <AlertTriangle className="w-3.5 h-3.5" />}
                  {inventoryHealth.status === 'low' && <Clock className="w-3.5 h-3.5" />}
                  {inventoryHealth.status === 'good' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {inventoryHealth.status === 'critical' ? '🔴 Stok Habis / Kritis' : inventoryHealth.status === 'low' ? '🟡 Stok Menipis' : '🟢 Stok Masih Aman'}
                </span>
                <span className="text-xs text-stone-600 font-medium">
                  Sisa Fisik: <strong className="text-stone-900 text-sm font-black">{inventoryHealth.currentStock} {product.unit || 'Pcs'}</strong>
                  {stockBreakdown.breakdown.length > 1 && ` (~ ${stockBreakdown.compact})`}
                </span>
              </div>

              <p className="text-xs text-stone-700">
                Penjualan rata-rata: <strong className="text-stone-900">{salesHistory.dailyVelocity} {product.unit || 'Pcs'}/hari</strong>. 
                {inventoryHealth.status !== 'critical' ? (
                  <> Sisa stok diperkirakan habis dalam <strong className="text-indigo-700">{inventoryHealth.daysRemaining} hari</strong> lagi (Batas buffer: {inventoryHealth.minStock} {product.unit}).</>
                ) : (
                  <> Stok sudah kosong di rak! Segera lakukan order ke supplier.</>
                )}
              </p>

              <div className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5 pt-0.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Rekomendasi Kulakan: <strong className="font-extrabold text-sm text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-300">{inventoryHealth.suggestionText}</strong></span>
              </div>
            </div>

            {onApplyRecommendation && (
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>+ Terapkan Rekomendasi ke Order ({inventoryHealth.suggestedQty} {inventoryHealth.suggestedUnit})</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 SUMMARY STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Stok Saat Ini */}
          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
            <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
              <Boxes className="w-3.5 h-3.5 text-stone-400" />
              <span>Stok Fisik Saat Ini</span>
            </div>
            <div className="text-xl font-black text-stone-900 mt-1">
              {inventoryHealth.currentStock} <span className="text-xs font-normal text-stone-500">{product.unit || 'Pcs'}</span>
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">
              Batas minimum: {inventoryHealth.minStock} {product.unit || 'Pcs'}
            </div>
          </div>

          {/* Card 2: Laju Penjualan */}
          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
            <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Penjualan 30 Hari</span>
            </div>
            <div className="text-xl font-black text-emerald-700 mt-1">
              {salesHistory.sold30Days} <span className="text-xs font-normal text-stone-500">{product.unit || 'Pcs'}</span>
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">
              7 Hari: {salesHistory.sold7Days} {product.unit || 'Pcs'} | Total: {salesHistory.totalSold}
            </div>
          </div>

          {/* Card 3: Terakhir Beli Modal (HPP) */}
          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
            <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
              <span>Harga Modal Beli (HPP)</span>
            </div>
            <div className="text-xl font-black text-indigo-700 mt-1">
              {formatRupiah(product.costPrice || Math.round(product.price * 0.75))}
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5 flex items-center gap-1">
              <span>Jual: {formatRupiah(product.price)}</span>
              <span className="font-bold text-emerald-600">
                (Margin {Math.round(((product.price - (product.costPrice || Math.round(product.price * 0.75))) / product.price) * 100)}%)
              </span>
            </div>
          </div>

          {/* Card 4: Kulakan Terakhir */}
          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
            <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-amber-600" />
              <span>Terakhir Kulakan</span>
            </div>
            <div className="text-sm font-black text-stone-900 mt-1 truncate">
              {purchaseHistory.lastPurchase ? purchaseHistory.lastPurchase.date : 'Belum Pernah'}
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5 truncate">
              {purchaseHistory.lastPurchase 
                ? `${purchaseHistory.lastPurchase.supplierName} (${purchaseHistory.lastPurchase.quantity} ${purchaseHistory.lastPurchase.unit})`
                : 'Belum ada data PO'}
            </div>
          </div>
        </div>

        {/* MULTI-SATUAN & BARCODE DUSAN / PCS */}
        <div className="bg-stone-50/70 p-3.5 rounded-2xl border border-stone-200 space-y-2">
          <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Pilihan Satuan Order & Barcode Tersedia:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {unitOptions.map((opt, idx) => (
              <div 
                key={idx}
                className="bg-white p-2.5 rounded-xl border border-stone-200/80 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      {opt.unitName}
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium">
                      {opt.isBase ? 'Satuan Eceran' : `1 ${opt.unitName} = ${opt.multiplier} ${product.unit}`}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-stone-500 text-[11px]">Est. Modal:</span>
                    <strong className="text-emerald-700">
                      {formatRupiah(product.costPrice ? product.costPrice * opt.multiplier : Math.round(product.price * 0.75 * opt.multiplier))}
                    </strong>
                  </div>

                  {opt.barcode && (
                    <div className="text-[10px] font-mono text-stone-500 mt-1 flex items-center gap-1">
                      <Barcode className="w-3 h-3 text-stone-400" />
                      <span>{opt.barcode}</span>
                    </div>
                  )}
                </div>

                {onApplyRecommendation && (
                  <button
                    type="button"
                    onClick={() => {
                      const cost = product.costPrice ? product.costPrice * opt.multiplier : Math.round(product.price * 0.75 * opt.multiplier);
                      onApplyRecommendation({
                        productId: product.id,
                        productName: product.name,
                        barcode: opt.barcode || product.barcode || '',
                        unit: opt.unitName,
                        conversionMultiplier: opt.multiplier,
                        quantity: 1,
                        costPrice: cost,
                      });
                      onClose();
                    }}
                    className="mt-2 w-full py-1 text-center bg-stone-100 hover:bg-indigo-50 hover:text-indigo-700 text-stone-700 text-[11px] font-bold rounded-lg transition-colors"
                  >
                    + Masukkan Satuan Ini ke PO
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* DUAL TABLES: PURCHASE HISTORY & SALES HISTORY */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* TABEL RIWAYAT PEMBELIAN KE SUPPLIER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <span>Riwayat Pembelian ke Supplier ({purchaseHistory.matchingPurchases.length})</span>
              </h4>
              <span className="text-[10px] text-stone-400">Terakhir dibeli</span>
            </div>

            <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2">Tgl / No PO</th>
                    <th className="px-3 py-2">Supplier</th>
                    <th className="px-3 py-2 text-center">Qty Beli</th>
                    <th className="px-3 py-2 text-right">Harga Beli</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {purchaseHistory.matchingPurchases.map((ph, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/60">
                      <td className="px-3 py-2">
                        <div className="font-bold text-stone-900">{ph.date}</div>
                        <div className="text-[10px] text-stone-400 font-mono">{ph.purchaseNumber}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-stone-800">{ph.supplierName}</div>
                        <div className="text-[10px] text-stone-400">{ph.status === 'received' ? '✓ Diterima' : 'Dipesan'}</div>
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-indigo-700">
                        {ph.quantity} {ph.unit}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-stone-900">
                        {formatRupiah(ph.costPrice)}
                      </td>
                    </tr>
                  ))}
                  {purchaseHistory.matchingPurchases.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-stone-400 text-xs">
                        Belum ada riwayat faktur pembelian untuk produk ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABEL RIWAYAT PENJUALAN KE PELANGGAN / POS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span>Riwayat Penjualan Terakhir ({salesHistory.matchingSales.length})</span>
              </h4>
              <span className="text-[10px] text-stone-400">Laju konsumsi kasir</span>
            </div>

            <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2">Tgl / Nota</th>
                    <th className="px-3 py-2">Pelanggan / POS</th>
                    <th className="px-3 py-2 text-center">Qty Terjual</th>
                    <th className="px-3 py-2 text-right">Nilai Jual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {salesHistory.matchingSales.map((sh, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/60">
                      <td className="px-3 py-2">
                        <div className="font-bold text-stone-900">{sh.date}</div>
                        <div className="text-[10px] text-stone-400 font-mono">#{sh.orderNumber}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-stone-800">{sh.customerName}</div>
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-emerald-700">
                        {sh.quantity} {sh.unit}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-stone-900">
                        {formatRupiah(sh.total)}
                      </td>
                    </tr>
                  ))}
                  {salesHistory.matchingSales.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-stone-400 text-xs">
                        Belum ada data penjualan tercatat untuk produk ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
          <div className="text-[11px] text-stone-500">
            Data history ini dihitung dari pesanan supplier dan transaksi POS kasir secara langsung.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl transition-colors"
            >
              Tutup
            </button>
            {onApplyRecommendation && (
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Gunakan Qty Rekomendasi ({inventoryHealth.suggestedQty} {inventoryHealth.suggestedUnit})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
