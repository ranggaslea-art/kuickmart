import {
  Product,
  Order,
  PurchaseOrder,
  StockOpnameRecord,
  SalesReturn,
  PurchaseReturn,
  StockMutation,
  StockMovementEntry,
  StockMovementType,
  StockAdjustmentRecord,
  StockSummaryReportItem,
} from '../types';
import { getTenantStorageKey } from './tenantHelper';

export const INITIAL_STOCK_ADJUSTMENTS: StockAdjustmentRecord[] = [
  {
    id: 'adj_001',
    adjustmentNumber: 'ADJ-202609-001',
    date: '2026-09-06',
    productId: 'prod_1',
    productName: 'Indomie Goreng Spesial 85g',
    barcode: '8998866200111',
    unit: 'Pcs',
    storeId: 'store_1',
    storeName: 'toko-online.online Flagship Menteng',
    type: 'out',
    quantity: 2,
    costPrice: 2800,
    reason: 'damaged',
    reasonLabel: 'Kemasan Sobek / Rusak',
    notes: 'Karton terjatuh saat penataan rak display.',
    handledBy: 'Budi Santoso',
    createdAt: '2026-09-06T09:15:00Z',
  },
  {
    id: 'adj_002',
    adjustmentNumber: 'ADJ-202609-002',
    date: '2026-09-09',
    productId: 'prod_3',
    productName: 'Aqua Air Mineral 600ml',
    barcode: '8992775111001',
    unit: 'Botol',
    storeId: 'store_1',
    storeName: 'toko-online.online Flagship Menteng',
    type: 'in',
    quantity: 6,
    costPrice: 2900,
    reason: 'bonus',
    reasonLabel: 'Bonus Sampel dari Distributor',
    notes: 'Bonus display promo produk distributor Danone.',
    handledBy: 'Ahmad Fauzi',
    createdAt: '2026-09-09T11:40:00Z',
  },
  {
    id: 'adj_003',
    adjustmentNumber: 'ADJ-202609-003',
    date: '2026-09-12',
    productId: 'prod_4',
    productName: 'Susu Ultra Milk Cokelat 1000ml',
    barcode: '8998009010202',
    unit: 'Kotak',
    storeId: 'store_1',
    storeName: 'toko-online.online Flagship Menteng',
    type: 'out',
    quantity: 1,
    costPrice: 17500,
    reason: 'sample',
    reasonLabel: 'Tester / Icip Sampel Pelanggan',
    notes: 'Digunakan untuk tester promo akhir pekan di gerai kasir.',
    handledBy: 'Siti Rahma',
    createdAt: '2026-09-12T14:30:00Z',
  },
];

/**
 * Mendapatkan daftar penyesuaian manual stok dari storage tenant
 */
export function getStoredStockAdjustments(slug?: string): StockAdjustmentRecord[] {
  try {
    const key = getTenantStorageKey('toko_online_stock_adjustments', slug);
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    return INITIAL_STOCK_ADJUSTMENTS;
  } catch {
    return INITIAL_STOCK_ADJUSTMENTS;
  }
}

/**
 * Menyimpan daftar penyesuaian manual stok ke storage tenant
 */
export function saveStoredStockAdjustments(records: StockAdjustmentRecord[], slug?: string): void {
  try {
    const key = getTenantStorageKey('toko_online_stock_adjustments', slug);
    localStorage.setItem(key, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save stock adjustments:', e);
  }
}

export interface StockMovementSourceData {
  products: Product[];
  orders: Order[];
  purchases: PurchaseOrder[];
  stockOpnames: StockOpnameRecord[];
  salesReturns: SalesReturn[];
  purchaseReturns: PurchaseReturn[];
  stockMutations: StockMutation[];
  stockAdjustments: StockAdjustmentRecord[];
}

export function formatStockMovementTypeLabel(type: StockMovementType): {
  label: string;
  badgeClass: string;
  category: 'in' | 'out' | 'initial';
} {
  switch (type) {
    case 'purchase_in':
      return {
        label: 'Pembelian Supplier (Masuk)',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        category: 'in',
      };
    case 'sale_out':
      return {
        label: 'Penjualan Kasir (Keluar)',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        category: 'out',
      };
    case 'opname_in':
      return {
        label: 'Opname Fisik Lebih (+)',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
        category: 'in',
      };
    case 'opname_out':
      return {
        label: 'Opname Fisik Kurang (-)',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        category: 'out',
      };
    case 'sales_return_in':
      return {
        label: 'Retur Jual Konsumen (+)',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        category: 'in',
      };
    case 'purchase_return_out':
      return {
        label: 'Retur Beli Supplier (-)',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        category: 'out',
      };
    case 'mutation_in':
      return {
        label: 'Mutasi Masuk Cabang (+)',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        category: 'in',
      };
    case 'mutation_out':
      return {
        label: 'Mutasi Keluar Cabang (-)',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
        category: 'out',
      };
    case 'adjustment_in':
      return {
        label: 'Koreksi Manual Masuk (+)',
        badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        category: 'in',
      };
    case 'adjustment_out':
      return {
        label: 'Koreksi Manual Keluar (-)',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        category: 'out',
      };
    case 'initial_balance':
    default:
      return {
        label: 'Saldo Awal Periode',
        badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
        category: 'initial',
      };
  }
}

/**
 * Mengumpulkan seluruh transaksi dari berbagai sumber (pembelian, kasir, opname, retur, mutasi, penyesuaian)
 * menjadi satu deret data mutasi terpadu.
 */
export function collectAllStockMovements(
  data: StockMovementSourceData,
  selectedStoreId?: string
): StockMovementEntry[] {
  const {
    products,
    orders,
    purchases,
    stockOpnames,
    salesReturns,
    purchaseReturns,
    stockMutations,
    stockAdjustments,
  } = data;

  const productMap = new Map<string, Product>();
  products.forEach((p) => productMap.set(p.id, p));

  const movements: StockMovementEntry[] = [];

  // 1. Pembelian dari Suplier (Barang Masuk / PO)
  purchases.forEach((po) => {
    if (po.status === 'cancelled') return;
    if (selectedStoreId && selectedStoreId !== 'all' && po.storeId && po.storeId !== selectedStoreId) {
      return;
    }

    const isoDate = po.receivedDate || po.createdAt || `${po.orderDate}T08:00:00Z`;
    const dateObj = new Date(isoDate);
    const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().slice(0, 10) : po.orderDate;
    const timeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('id-ID', { hour12: false }) : '08:00:00';

    po.items?.forEach((item, idx) => {
      const prod = productMap.get(item.productId);
      const cost = item.costPrice || prod?.costPrice || (prod ? Math.round(prod.price * 0.75) : 0);

      movements.push({
        id: `po_in_${po.id}_${idx}`,
        timestamp: isoDate,
        date: dateStr,
        time: timeStr,
        productId: item.productId,
        productName: item.productName || prod?.name || 'Produk',
        barcode: item.barcode || prod?.barcode || '-',
        category: prod?.category || 'Umum',
        unit: item.unit || prod?.unit || 'Pcs',
        storeId: po.storeId,
        storeName: po.storeName,
        type: 'purchase_in',
        typeLabel: 'Faktur Pembelian Supplier',
        direction: 'in',
        referenceNumber: po.purchaseNumber || po.id,
        referenceId: po.id,
        qtyIn: item.quantity,
        qtyOut: 0,
        costPrice: cost,
        sellingPrice: prod?.price,
        totalAmount: item.quantity * cost,
        previousBalance: 0,
        runningBalance: 0,
        partnerName: po.supplierName || 'Pemasok / Vendor',
        notes: po.notes || 'Penerimaan barang dari supplier',
        operatorName: po.receivedBy || 'Staff Gudang',
      });
    });
  });

  // 2. Penjualan Kasir POS / Order (Barang Keluar)
  orders.forEach((ord) => {
    if (ord.status === 'cancelled') return;
    if (selectedStoreId && selectedStoreId !== 'all' && ord.store?.id && ord.store.id !== selectedStoreId) {
      return;
    }

    const isoDate = ord.createdAt || new Date().toISOString();
    const dateObj = new Date(isoDate);
    const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().slice(0, 10) : '';
    const timeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('id-ID', { hour12: false }) : '10:00:00';

    ord.items?.forEach((item, idx) => {
      const prod = item.product || productMap.get(item.product?.id);
      const prodId = prod?.id || item.product?.id;
      if (!prodId) return;

      const cost = prod?.costPrice || Math.round((prod?.price || 0) * 0.75);
      const sellPrice = prod?.price || 0;

      movements.push({
        id: `ord_out_${ord.id}_${idx}`,
        timestamp: isoDate,
        date: dateStr,
        time: timeStr,
        productId: prodId,
        productName: prod?.name || 'Produk',
        barcode: prod?.barcode || '-',
        category: prod?.category || 'Umum',
        unit: item.selectedUnit || prod?.unit || 'Pcs',
        storeId: ord.store?.id,
        storeName: ord.store?.name,
        type: 'sale_out',
        typeLabel: ord.deliveryType === 'pickup' ? 'Penjualan Kasir POS' : 'Pesanan Pengantaran Toko',
        direction: 'out',
        referenceNumber: ord.orderNumber || ord.id,
        referenceId: ord.id,
        qtyIn: 0,
        qtyOut: item.quantity,
        costPrice: cost,
        sellingPrice: sellPrice,
        totalAmount: item.quantity * cost,
        previousBalance: 0,
        runningBalance: 0,
        partnerName: ord.customerName ? `Pelanggan: ${ord.customerName}` : 'Konsumen Tunai / Kasir',
        notes: `Penjualan ${ord.paymentMethod ? String(ord.paymentMethod).toUpperCase() : 'Kasir'}`,
        operatorName: 'Kasir Toko',
      });
    });
  });

  // 3. Opname Stok Fisik (Audit Selisih Surplus/Defisit)
  stockOpnames.forEach((opn) => {
    if (opn.status === 'draft') return;
    if (selectedStoreId && selectedStoreId !== 'all' && opn.storeId && opn.storeId !== selectedStoreId) {
      return;
    }

    const isoDate = opn.postedAt || opn.createdAt || `${opn.date}T10:00:00Z`;
    const dateObj = new Date(isoDate);
    const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().slice(0, 10) : opn.date;
    const timeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('id-ID', { hour12: false }) : '11:00:00';

    opn.items?.forEach((item, idx) => {
      if (!item.differenceQty || item.differenceQty === 0) return;

      const prod = productMap.get(item.productId);
      const isSurplus = item.differenceQty > 0;
      const absQty = Math.abs(item.differenceQty);
      const cost = item.costPrice || prod?.costPrice || (prod ? Math.round(prod.price * 0.75) : 0);

      movements.push({
        id: `opn_${opn.id}_${idx}`,
        timestamp: isoDate,
        date: dateStr,
        time: timeStr,
        productId: item.productId,
        productName: item.productName || prod?.name || 'Produk',
        barcode: item.barcode || prod?.barcode || '-',
        category: item.category || prod?.category || 'Umum',
        unit: item.unit || prod?.unit || 'Pcs',
        storeId: opn.storeId,
        storeName: opn.storeName,
        type: isSurplus ? 'opname_in' : 'opname_out',
        typeLabel: isSurplus ? 'Penyesuaian Opname (Surplus Fisik)' : 'Penyesuaian Opname (Defisit Fisik)',
        direction: isSurplus ? 'in' : 'out',
        referenceNumber: opn.opnameNumber || opn.id,
        referenceId: opn.id,
        qtyIn: isSurplus ? absQty : 0,
        qtyOut: !isSurplus ? absQty : 0,
        costPrice: cost,
        sellingPrice: prod?.price,
        totalAmount: absQty * cost,
        previousBalance: 0,
        runningBalance: 0,
        partnerName: `Auditor: ${opn.auditorName || 'Tim Stok'}`,
        notes: item.notes || opn.notes || (isSurplus ? 'Stok fisik nyata lebih banyak dari buku' : 'Stok fisik nyata kurang/hilang'),
        operatorName: opn.auditorName || 'Auditor',
      });
    });
  });

  // 4. Retur Penjualan (Kembali dari Pembeli ke Stok)
  salesReturns.forEach((sr) => {
    if (sr.status === 'cancelled') return;
    if (selectedStoreId && selectedStoreId !== 'all' && sr.storeId && sr.storeId !== selectedStoreId) {
      return;
    }

    const isoDate = sr.createdAt || `${sr.date}T13:00:00Z`;
    const dateObj = new Date(isoDate);
    const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().slice(0, 10) : sr.date;
    const timeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('id-ID', { hour12: false }) : '13:00:00';

    sr.items?.forEach((item, idx) => {
      // Hanya barang yang dikembalikan ke stok rak fisik (restocked atau condition 'good') yang menambah stok
      if (!item.restocked && item.condition !== 'good') return;

      const prod = productMap.get(item.productId);
      const cost = prod?.costPrice || Math.round((item.sellingPrice || 0) * 0.75);

      movements.push({
        id: `sr_in_${sr.id}_${idx}`,
        timestamp: isoDate,
        date: dateStr,
        time: timeStr,
        productId: item.productId,
        productName: item.productName || prod?.name || 'Produk',
        barcode: item.barcode || prod?.barcode || '-',
        category: prod?.category || 'Umum',
        unit: item.unit || prod?.unit || 'Pcs',
        storeId: sr.storeId,
        storeName: sr.storeName,
        type: 'sales_return_in',
        typeLabel: 'Retur Penjualan (Restock Rak)',
        direction: 'in',
        referenceNumber: sr.returnNumber || sr.id,
        referenceId: sr.id,
        qtyIn: item.quantity,
        qtyOut: 0,
        costPrice: cost,
        sellingPrice: item.sellingPrice,
        totalAmount: item.quantity * cost,
        previousBalance: 0,
        runningBalance: 0,
        partnerName: `Pelanggan: ${sr.customerName || 'Konsumen'}`,
        notes: item.reason || sr.notes || 'Pengembalian barang dari pembeli ke persediaan',
        operatorName: sr.cashierName || 'Kasir / CS',
      });
    });
  });

  // 5. Retur Pembelian (Pengembalian Barang Rusak/Expired ke Supplier)
  purchaseReturns.forEach((pr) => {
    if (pr.status === 'cancelled') return;
    if (selectedStoreId && selectedStoreId !== 'all' && pr.storeId && pr.storeId !== selectedStoreId) {
      return;
    }

    const isoDate = pr.createdAt || `${pr.date}T14:00:00Z`;
    const dateObj = new Date(isoDate);
    const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().slice(0, 10) : pr.date;
    const timeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('id-ID', { hour12: false }) : '14:00:00';

    pr.items?.forEach((item, idx) => {
      const prod = productMap.get(item.productId);
      const cost = item.costPrice || prod?.costPrice || (prod ? Math.round(prod.price * 0.75) : 0);

      movements.push({
        id: `pr_out_${pr.id}_${idx}`,
        timestamp: isoDate,
        date: dateStr,
        time: timeStr,
        productId: item.productId,
        productName: item.productName || prod?.name || 'Produk',
        barcode: item.barcode || prod?.barcode || '-',
        category: prod?.category || 'Umum',
        unit: item.unit || prod?.unit || 'Pcs',
        storeId: pr.storeId,
        storeName: pr.storeName,
        type: 'purchase_return_out',
        typeLabel: 'Retur Pembelian ke Supplier',
        direction: 'out',
        referenceNumber: pr.returnNumber || pr.id,
        referenceId: pr.id,
        qtyIn: 0,
        qtyOut: item.quantity,
        costPrice: cost,
        sellingPrice: prod?.price,
        totalAmount: item.quantity * cost,
        previousBalance: 0,
        runningBalance: 0,
        partnerName: `Supplier: ${pr.supplierName || 'Pemasok'}`,
        notes: item.reason || pr.notes || 'Pengembalian barang cacat/expired ke vendor',
        operatorName: pr.handledBy || 'Staff Gudang',
      });
    });
  });

  // 6. Mutasi Stok Antar Cabang
  stockMutations.forEach((mut) => {
    if (mut.status === 'cancelled' || mut.status === 'draft') return;

    const isoDate = mut.completedAt || mut.createdAt || `${mut.date}T15:00:00Z`;
    const dateObj = new Date(isoDate);
    const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().slice(0, 10) : mut.date;
    const timeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('id-ID', { hour12: false }) : '15:00:00';

    mut.items?.forEach((item, idx) => {
      const prod = productMap.get(item.productId);
      const cost = prod?.costPrice || (prod ? Math.round(prod.price * 0.75) : 0);

      // Mutasi KELUAR dari cabang asal
      if (!selectedStoreId || selectedStoreId === 'all' || selectedStoreId === mut.sourceStoreId) {
        movements.push({
          id: `mut_out_${mut.id}_${idx}`,
          timestamp: isoDate,
          date: dateStr,
          time: timeStr,
          productId: item.productId,
          productName: item.productName || prod?.name || 'Produk',
          barcode: item.barcode || prod?.barcode || '-',
          category: prod?.category || 'Umum',
          unit: item.unit || prod?.unit || 'Pcs',
          storeId: mut.sourceStoreId,
          storeName: mut.sourceStoreName,
          type: 'mutation_out',
          typeLabel: 'Mutasi Keluar Antar Cabang',
          direction: 'out',
          referenceNumber: mut.mutationNumber || mut.id,
          referenceId: mut.id,
          qtyIn: 0,
          qtyOut: item.quantity,
          costPrice: cost,
          sellingPrice: prod?.price,
          totalAmount: item.quantity * cost,
          previousBalance: 0,
          runningBalance: 0,
          partnerName: `Tujuan: ${mut.destStoreName || 'Cabang Tujuan'}`,
          notes: item.notes || mut.shippingNotes || 'Transfer kirim barang antar cabang',
          operatorName: mut.transferredBy || 'Staff Gudang',
        });
      }

      // Mutasi MASUK di cabang tujuan (hanya jika mutasi sudah completed)
      if (mut.status === 'completed') {
        if (!selectedStoreId || selectedStoreId === 'all' || selectedStoreId === mut.destStoreId) {
          movements.push({
            id: `mut_in_${mut.id}_${idx}`,
            timestamp: isoDate,
            date: dateStr,
            time: timeStr,
            productId: item.productId,
            productName: item.productName || prod?.name || 'Produk',
            barcode: item.barcode || prod?.barcode || '-',
            category: prod?.category || 'Umum',
            unit: item.unit || prod?.unit || 'Pcs',
            storeId: mut.destStoreId,
            storeName: mut.destStoreName,
            type: 'mutation_in',
            typeLabel: 'Mutasi Masuk Antar Cabang',
            direction: 'in',
            referenceNumber: mut.mutationNumber || mut.id,
            referenceId: mut.id,
            qtyIn: item.quantity,
            qtyOut: 0,
            costPrice: cost,
            sellingPrice: prod?.price,
            totalAmount: item.quantity * cost,
            previousBalance: 0,
            runningBalance: 0,
            partnerName: `Dari: ${mut.sourceStoreName || 'Cabang Asal'}`,
            notes: item.notes || mut.shippingNotes || 'Penerimaan transfer stok cabang',
            operatorName: mut.receivedBy || mut.transferredBy || 'Staff Penerima',
          });
        }
      }
    });
  });

  // 7. Penyesuaian Manual Stok (Koreksi Rusak, Expired, Sample, Bonus)
  stockAdjustments.forEach((adj) => {
    if (selectedStoreId && selectedStoreId !== 'all' && adj.storeId && adj.storeId !== selectedStoreId) {
      return;
    }

    const isoDate = adj.createdAt || `${adj.date}T16:00:00Z`;
    const dateObj = new Date(isoDate);
    const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().slice(0, 10) : adj.date;
    const timeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('id-ID', { hour12: false }) : '16:00:00';

    const prod = productMap.get(adj.productId);
    const cost = adj.costPrice || prod?.costPrice || (prod ? Math.round(prod.price * 0.75) : 0);

    movements.push({
      id: `adj_${adj.id}`,
      timestamp: isoDate,
      date: dateStr,
      time: timeStr,
      productId: adj.productId,
      productName: adj.productName || prod?.name || 'Produk',
      barcode: adj.barcode || prod?.barcode || '-',
      category: prod?.category || 'Umum',
      unit: adj.unit || prod?.unit || 'Pcs',
      storeId: adj.storeId,
      storeName: adj.storeName,
      type: adj.type === 'in' ? 'adjustment_in' : 'adjustment_out',
      typeLabel: `Penyesuaian Manual (${adj.reasonLabel})`,
      direction: adj.type,
      referenceNumber: adj.adjustmentNumber || adj.id,
      referenceId: adj.id,
      qtyIn: adj.type === 'in' ? adj.quantity : 0,
      qtyOut: adj.type === 'out' ? adj.quantity : 0,
      costPrice: cost,
      sellingPrice: prod?.price,
      totalAmount: adj.quantity * cost,
      previousBalance: 0,
      runningBalance: 0,
      partnerName: `Alasan: ${adj.reasonLabel}`,
      notes: adj.notes || 'Penyesuaian stok internal',
      operatorName: adj.handledBy || 'Supervisor / Admin',
    });
  });

  // Urutkan transaksi secara kronologis dari waktu terlama ke terbaru
  movements.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return movements;
}

export interface ProductStockLedgerResult {
  product: Product;
  startDate: string;
  endDate: string;
  initialStock: number;
  totalIn: number;
  totalOut: number;
  finalStock: number;
  totalValueIn: number;
  totalValueOut: number;
  finalValuation: number;
  entries: StockMovementEntry[];
}

/**
 * Menghitung Kartu Stok Kronologis Lengkap untuk 1 Produk Tertentu
 */
export function calculateProductStockLedger(
  product: Product,
  allMovements: StockMovementEntry[],
  dateRange: { startDate: string; endDate: string }
): ProductStockLedgerResult {
  const { startDate, endDate } = dateRange;

  // Filter pergerakan hanya untuk produk ini
  const productMovements = allMovements.filter((m) => m.productId === product.id);

  // Pisahkan mutasi sebelum periode dan mutasi di dalam periode
  const startDateTime = new Date(`${startDate}T00:00:00`).getTime();
  const endDateTime = new Date(`${endDate}T23:59:59.999`).getTime();

  // Hitung total alur keluar-masuk sesudah tanggal mulai s/d sekarang
  // Berdasarkan rumus kontinuitas persediaan:
  // Stok Sekarang = Saldo Awal(T0) + Masuk(T0->Now) - Keluar(T0->Now)
  // Maka: Saldo Awal(T0) = Stok Sekarang - Masuk(T0->Now) + Keluar(T0->Now)
  let netChangeAfterStart = 0;
  productMovements.forEach((m) => {
    const t = new Date(m.timestamp).getTime();
    if (t >= startDateTime) {
      netChangeAfterStart += m.qtyIn - m.qtyOut;
    }
  });

  let calculatedInitialStock = product.stock - netChangeAfterStart;
  if (calculatedInitialStock < 0) {
    calculatedInitialStock = 0;
  }

  // Filter pergerakan yang jatuh di dalam rentang periode yang diminta
  const periodMovements = productMovements.filter((m) => {
    const t = new Date(m.timestamp).getTime();
    return t >= startDateTime && t <= endDateTime;
  });

  // Jalankan perhitungan Saldo Berjalan (Running Balance) baris per baris
  let currentBalance = calculatedInitialStock;
  let totalIn = 0;
  let totalOut = 0;
  let totalValueIn = 0;
  let totalValueOut = 0;

  const cost = product.costPrice || Math.round(product.price * 0.75);

  const entriesWithBalance: StockMovementEntry[] = periodMovements.map((m) => {
    const prev = currentBalance;
    currentBalance = currentBalance + m.qtyIn - m.qtyOut;

    totalIn += m.qtyIn;
    totalOut += m.qtyOut;
    totalValueIn += m.qtyIn * (m.costPrice || cost);
    totalValueOut += m.qtyOut * (m.costPrice || cost);

    return {
      ...m,
      previousBalance: prev,
      runningBalance: currentBalance,
    };
  });

  return {
    product,
    startDate,
    endDate,
    initialStock: calculatedInitialStock,
    totalIn,
    totalOut,
    finalStock: currentBalance,
    totalValueIn,
    totalValueOut,
    finalValuation: currentBalance * cost,
    entries: entriesWithBalance,
  };
}

/**
 * Menghasilkan Laporan Rekapitulasi Mutasi Seluruh Produk Toko untuk Periode Tertentu
 */
export function calculateStockSummaryReport(
  products: Product[],
  allMovements: StockMovementEntry[],
  dateRange: { startDate: string; endDate: string }
): StockSummaryReportItem[] {
  return products.map((prod) => {
    const ledger = calculateProductStockLedger(prod, allMovements, dateRange);
    const cost = prod.costPrice || Math.round(prod.price * 0.75);

    let status: StockSummaryReportItem['status'] = 'safe';
    if (ledger.finalStock < 0) {
      status = 'negative';
    } else if (ledger.finalStock === 0) {
      status = 'out_of_stock';
    } else if (ledger.finalStock <= 5) {
      status = 'low';
    }

    return {
      productId: prod.id,
      productName: prod.name,
      barcode: prod.barcode || '-',
      category: prod.category || 'Umum',
      brand: prod.brand || '-',
      unit: prod.unit || 'Pcs',
      costPrice: cost,
      sellingPrice: prod.price,
      initialStock: ledger.initialStock,
      totalIn: ledger.totalIn,
      totalOut: ledger.totalOut,
      finalStock: ledger.finalStock,
      finalValuation: ledger.finalStock * cost,
      status,
    };
  });
}

/**
 * Fungsi helper untuk mengekspor Kartu Stok 1 Barang ke format file CSV (Excel compatible)
 */
export function exportStockCardToCSV(ledger: ProductStockLedgerResult, storeName: string): void {
  const headers = [
    'No',
    'Tanggal & Waktu',
    'No Dokumen / Ref',
    'Jenis Mutasi',
    'Pihak Terkait / Rekanan',
    'Masuk (In)',
    'Keluar (Out)',
    'Saldo Berjalan',
    'Satuan',
    'HPP Satuan (Rp)',
    'Total Nilai (Rp)',
    'Petugas / Kasir',
    'Keterangan',
  ];

  const rows: string[][] = [];

  // Baris Saldo Awal
  rows.push([
    '0',
    `${ledger.startDate} 00:00`,
    'SALDO-AWAL',
    'Saldo Awal Periode',
    'Saldo Buku Sistem',
    '0',
    '0',
    String(ledger.initialStock),
    ledger.product.unit || 'Pcs',
    String(ledger.product.costPrice || 0),
    '0',
    'Sistem',
    'Saldo persediaan sebelum periode',
  ]);

  // Baris Tiap Transaksi
  ledger.entries.forEach((entry, idx) => {
    rows.push([
      String(idx + 1),
      `${entry.date} ${entry.time}`,
      entry.referenceNumber,
      entry.typeLabel,
      entry.partnerName || '-',
      String(entry.qtyIn),
      String(entry.qtyOut),
      String(entry.runningBalance),
      entry.unit,
      String(entry.costPrice),
      String(entry.totalAmount),
      entry.operatorName || '-',
      `"${(entry.notes || '').replace(/"/g, '""')}"`,
    ]);
  });

  const metadataRows = [
    [`KARTU STOK BARANG - ${storeName}`],
    [`Nama Produk: ${ledger.product.name} | Barcode: ${ledger.product.barcode || '-'}`],
    [`Kategori: ${ledger.product.category} | Satuan: ${ledger.product.unit || 'Pcs'}`],
    [`Periode: ${ledger.startDate} s/d ${ledger.endDate}`],
    [`Saldo Awal: ${ledger.initialStock} | Total Masuk: +${ledger.totalIn} | Total Keluar: -${ledger.totalOut} | Saldo Akhir: ${ledger.finalStock}`],
    [''],
  ];

  const csvContent =
    metadataRows.map((r) => r.join(',')).join('\n') +
    '\n' +
    headers.join(',') +
    '\n' +
    rows.map((r) => r.join(',')).join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `kartu_stok_${ledger.product.barcode || ledger.product.id}_${ledger.startDate}_${ledger.endDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Fungsi helper untuk mengekspor Laporan Rekapitulasi Stok Semua Barang ke CSV
 */
export function exportStockSummaryToCSV(
  items: StockSummaryReportItem[],
  dateRange: { startDate: string; endDate: string },
  storeName: string
): void {
  const headers = [
    'No',
    'Barcode',
    'Nama Produk',
    'Kategori',
    'Merk',
    'Satuan',
    'HPP Modal (Rp)',
    'Harga Jual (Rp)',
    'Saldo Awal',
    'Total Masuk (+)',
    'Total Keluar (-)',
    'Saldo Akhir (=)',
    'Nilai Valuasi Akhir (Rp)',
    'Status Stok',
  ];

  const rows = items.map((item, idx) => {
    let statusLabel = 'Aman';
    if (item.status === 'out_of_stock') statusLabel = 'Habis (0)';
    else if (item.status === 'low') statusLabel = 'Menipis (<=5)';
    else if (item.status === 'negative') statusLabel = 'Minus / Selisih';

    return [
      String(idx + 1),
      `"${item.barcode}"`,
      `"${item.productName.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      `"${item.brand}"`,
      item.unit,
      String(item.costPrice),
      String(item.sellingPrice),
      String(item.initialStock),
      String(item.totalIn),
      String(item.totalOut),
      String(item.finalStock),
      String(item.finalValuation),
      statusLabel,
    ];
  });

  const metadataRows = [
    [`LAPORAN REKAPITULASI MUTASI PERSSEDIAAN BARANG - ${storeName}`],
    [`Periode: ${dateRange.startDate} s/d ${dateRange.endDate}`],
    [`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`],
    [''],
  ];

  const csvContent =
    metadataRows.map((r) => r.join(',')).join('\n') +
    '\n' +
    headers.join(',') +
    '\n' +
    rows.map((r) => r.join(',')).join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `rekap_mutasi_stok_${dateRange.startDate}_${dateRange.endDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
