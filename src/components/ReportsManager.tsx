import React, { useState, useMemo } from 'react';
import { Product, Order, Store, Category } from '../types';
import {
  BarChart3,
  Package,
  Receipt,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  Search,
  Download,
  Printer,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  ShoppingBag,
  Store as StoreIcon,
  Layers,
  Tag,
  RefreshCw,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface ReportsManagerProps {
  products: Product[];
  orders: Order[];
  stores: Store[];
  categories?: Category[];
  onUpdateProducts?: (products: Product[]) => void;
  canEdit?: boolean;
}

// Operational Expense Item structure for P&L
interface OperationalExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
}

export const ReportsManager: React.FC<ReportsManagerProps> = ({
  products,
  orders,
  stores,
  categories,
  onUpdateProducts,
  canEdit = true,
}) => {
  // Main Report Navigation: 1. info_barang, 2. penjualan_periode, 3. rugi_laba
  const [activeReportTab, setActiveReportTab] = useState<'info_barang' | 'penjualan_periode' | 'rugi_laba'>('info_barang');

  // Helper to safely get HPP (cost price)
  const getProductHpp = (prod: Product): number => {
    if (typeof prod.costPrice === 'number' && prod.costPrice > 0) {
      return prod.costPrice;
    }
    // Default retail fallback HPP ~75% of price
    return Math.round(prod.price * 0.75);
  };

  // -------------------------------------------------------------
  // TAB 1: LAPORAN INFO BARANG (STATE & LOGIC)
  // -------------------------------------------------------------
  const [itemCategoryFilter, setItemCategoryFilter] = useState<string>('all');
  const [itemBrandFilter, setItemBrandFilter] = useState<string>('all');
  const [itemStockFilter, setItemStockFilter] = useState<'all' | 'safe' | 'low' | 'out'>('all');
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');
  const [itemSortBy, setItemSortBy] = useState<'name_asc' | 'stock_asc' | 'stock_desc' | 'margin_desc' | 'asset_desc'>('asset_desc');

  // Quick HPP edit modal state
  const [editingHppProduct, setEditingHppProduct] = useState<Product | null>(null);
  const [tempHppValue, setTempHppValue] = useState<number>(0);

  // Available unique categories and brands
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  const uniqueBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered Products for Info Barang
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Category
      if (itemCategoryFilter !== 'all' && p.category !== itemCategoryFilter) return false;
      // Brand
      if (itemBrandFilter !== 'all' && p.brand !== itemBrandFilter) return false;
      // Stock Status
      if (itemStockFilter === 'safe' && p.stock < 10) return false;
      if (itemStockFilter === 'low' && (p.stock < 1 || p.stock >= 10)) return false;
      if (itemStockFilter === 'out' && p.stock > 0) return false;
      // Search
      if (itemSearchQuery.trim()) {
        const q = itemSearchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchBarcode = p.barcode?.toLowerCase().includes(q);
        const matchBrand = p.brand?.toLowerCase().includes(q);
        if (!matchName && !matchBarcode && !matchBrand) return false;
      }
      return true;
    }).sort((a, b) => {
      const hppA = getProductHpp(a);
      const hppB = getProductHpp(b);
      const marginA = ((a.price - hppA) / a.price) * 100;
      const marginB = ((b.price - hppB) / b.price) * 100;
      const assetA = a.stock * hppA;
      const assetB = b.stock * hppB;

      if (itemSortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (itemSortBy === 'stock_asc') return a.stock - b.stock;
      if (itemSortBy === 'stock_desc') return b.stock - a.stock;
      if (itemSortBy === 'margin_desc') return marginB - marginA;
      if (itemSortBy === 'asset_desc') return assetB - assetA;
      return 0;
    });
  }, [products, itemCategoryFilter, itemBrandFilter, itemStockFilter, itemSearchQuery, itemSortBy]);

  // Overall Info Barang Statistics
  const productSummaryStats = useMemo(() => {
    let totalStockUnits = 0;
    let totalCostAsset = 0;
    let totalSellingPotential = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach(p => {
      const hpp = getProductHpp(p);
      totalStockUnits += p.stock;
      totalCostAsset += p.stock * hpp;
      totalSellingPotential += p.stock * p.price;
      if (p.stock === 0) outOfStockCount++;
      else if (p.stock < 10) lowStockCount++;
    });

    const potentialGrossProfit = Math.max(0, totalSellingPotential - totalCostAsset);
    const avgMarginPercent = totalSellingPotential > 0 ? (potentialGrossProfit / totalSellingPotential) * 100 : 0;

    return {
      totalSku: products.length,
      totalStockUnits,
      totalCostAsset,
      totalSellingPotential,
      potentialGrossProfit,
      avgMarginPercent,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  // Handle saving edited HPP
  const handleSaveHpp = () => {
    if (!editingHppProduct || !onUpdateProducts) return;
    const updated = products.map(p => {
      if (p.id === editingHppProduct.id) {
        return { ...p, costPrice: Math.max(0, tempHppValue) };
      }
      return p;
    });
    onUpdateProducts(updated);
    setEditingHppProduct(null);
  };

  // -------------------------------------------------------------
  // TAB 2 & 3: PERIODE TANGGAL & FILTER UMUM PENJUALAN / LABA
  // -------------------------------------------------------------
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'last_month' | 'all' | 'custom'>('7days');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [salesStoreFilter, setSalesStoreFilter] = useState<string>('all');
  const [salesStatusFilter, setSalesStatusFilter] = useState<string>('completed'); // 'all', 'completed', etc.
  const [salesPayFilter, setSalesPayFilter] = useState<string>('all');
  const [salesViewMode, setSalesViewMode] = useState<'orders' | 'items' | 'categories' | 'brands' | 'daily'>('orders');

  // Selected Order for detail modal
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);

  // Calculate Date Range based on preset
  const activeDateRange = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (datePreset === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (datePreset === 'yesterday') {
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (datePreset === '7days') {
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (datePreset === '30days') {
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (datePreset === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (datePreset === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (datePreset === 'all') {
      start = new Date(2020, 0, 1);
      end = new Date(2030, 11, 31, 23, 59, 59, 999);
    } else if (datePreset === 'custom') {
      start = new Date(customStartDate + 'T00:00:00');
      end = new Date(customEndDate + 'T23:59:59');
    }

    return { start, end };
  }, [datePreset, customStartDate, customEndDate]);

  // Filtered Orders within Selected Period
  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      const ordDate = new Date(ord.createdAt);
      if (ordDate < activeDateRange.start || ordDate > activeDateRange.end) {
        return false;
      }
      // Store filter
      if (salesStoreFilter !== 'all' && ord.store?.id !== salesStoreFilter) {
        return false;
      }
      // Status filter
      if (salesStatusFilter === 'completed' && ord.status !== 'completed') {
        return false;
      } else if (salesStatusFilter !== 'all' && salesStatusFilter !== 'completed' && ord.status !== salesStatusFilter) {
        return false;
      }
      // Payment filter
      if (salesPayFilter !== 'all' && ord.paymentMethod !== salesPayFilter) {
        return false;
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, activeDateRange, salesStoreFilter, salesStatusFilter, salesPayFilter]);

  // Aggregated Metrics for Penjualan per Periode
  const salesSummary = useMemo(() => {
    let grossSubtotal = 0;
    let totalDiscount = 0;
    let totalDeliveryFee = 0;
    let netRevenue = 0;
    let totalItemsSold = 0;
    let totalHppCost = 0;

    filteredOrders.forEach(ord => {
      grossSubtotal += ord.subtotal || 0;
      totalDiscount += ord.discountAmount || 0;
      totalDeliveryFee += ord.deliveryFee || 0;
      netRevenue += ord.total || (ord.subtotal + ord.deliveryFee - ord.discountAmount);

      (ord.items || []).forEach(item => {
        totalItemsSold += item.quantity;
        const itemHpp = getProductHpp(item.product);
        totalHppCost += itemHpp * item.quantity;
      });
    });

    const orderCount = filteredOrders.length;
    const avgOrderValue = orderCount > 0 ? Math.round(netRevenue / orderCount) : 0;
    const grossProfit = Math.max(0, netRevenue - totalHppCost);
    const grossMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    return {
      orderCount,
      grossSubtotal,
      totalDiscount,
      totalDeliveryFee,
      netRevenue,
      totalItemsSold,
      totalHppCost,
      grossProfit,
      grossMarginPercent,
      avgOrderValue,
    };
  }, [filteredOrders]);

  // Aggregated Sales: By Product (Top Sellers)
  const salesByProduct = useMemo(() => {
    const map = new Map<string, {
      product: Product;
      qty: number;
      revenue: number;
      cost: number;
      profit: number;
    }>();

    filteredOrders.forEach(ord => {
      (ord.items || []).forEach(item => {
        const p = item.product;
        const hpp = getProductHpp(p);
        const itemRevenue = (item.unitPrice || p.price) * item.quantity;
        const itemCost = hpp * item.quantity;
        const itemProfit = itemRevenue - itemCost;

        if (!map.has(p.id)) {
          map.set(p.id, {
            product: p,
            qty: item.quantity,
            revenue: itemRevenue,
            cost: itemCost,
            profit: itemProfit,
          });
        } else {
          const curr = map.get(p.id)!;
          curr.qty += item.quantity;
          curr.revenue += itemRevenue;
          curr.cost += itemCost;
          curr.profit += itemProfit;
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  // Aggregated Sales: By Category
  const salesByCategory = useMemo(() => {
    const map = new Map<string, { category: string; qty: number; revenue: number; profit: number }>();

    salesByProduct.forEach(item => {
      const cat = item.product.category || 'Umum';
      if (!map.has(cat)) {
        map.set(cat, { category: cat, qty: item.qty, revenue: item.revenue, profit: item.profit });
      } else {
        const curr = map.get(cat)!;
        curr.qty += item.qty;
        curr.revenue += item.revenue;
        curr.profit += item.profit;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [salesByProduct]);

  // Aggregated Sales: By Brand
  const salesByBrand = useMemo(() => {
    const map = new Map<string, { brand: string; qty: number; revenue: number; profit: number }>();

    salesByProduct.forEach(item => {
      const brand = item.product.brand || 'Lainnya';
      if (!map.has(brand)) {
        map.set(brand, { brand, qty: item.qty, revenue: item.revenue, profit: item.profit });
      } else {
        const curr = map.get(brand)!;
        curr.qty += item.qty;
        curr.revenue += item.revenue;
        curr.profit += item.profit;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [salesByProduct]);

  // Aggregated Sales: Daily Breakdown
  const salesByDay = useMemo(() => {
    const map = new Map<string, { dateStr: string; date: Date; orderCount: number; netRevenue: number; hppCost: number; profit: number }>();

    filteredOrders.forEach(ord => {
      const d = new Date(ord.createdAt);
      const dateKey = d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

      let ordHpp = 0;
      (ord.items || []).forEach(it => {
        ordHpp += getProductHpp(it.product) * it.quantity;
      });
      const ordNet = ord.total || (ord.subtotal + ord.deliveryFee - ord.discountAmount);
      const ordProfit = ordNet - ordHpp;

      if (!map.has(dateKey)) {
        map.set(dateKey, {
          dateStr: dateKey,
          date: d,
          orderCount: 1,
          netRevenue: ordNet,
          hppCost: ordHpp,
          profit: ordProfit,
        });
      } else {
        const curr = map.get(dateKey)!;
        curr.orderCount += 1;
        curr.netRevenue += ordNet;
        curr.hppCost += ordHpp;
        curr.profit += ordProfit;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredOrders]);

  // -------------------------------------------------------------
  // TAB 3: LAPORAN RUGI LABA (EXPENSES & PROFIT/LOSS STATEMENT)
  // -------------------------------------------------------------
  const [operationalExpenses, setOperationalExpenses] = useState<OperationalExpense[]>([
    { id: 'exp_01', name: 'Kantong Plastik & Lakban Packing', amount: 35000, category: 'Kemasan' },
    { id: 'exp_02', name: 'Bahan Bakar Kurir Toko (Bensin)', amount: 65000, category: 'Transportasi' },
    { id: 'exp_03', name: 'Listrik Pendingin Minuman & Toko', amount: 120000, category: 'Utilitas' },
    { id: 'exp_04', name: 'MDR Payment Gateway & Admin QRIS', amount: 25000, category: 'Administrasi' },
  ]);

  const [newExpName, setNewExpName] = useState('');
  const [newExpAmount, setNewExpAmount] = useState<number>(0);
  const [newExpCategory, setNewExpCategory] = useState('Operasional');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const totalOperationalExpenses = useMemo(() => {
    return operationalExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }, [operationalExpenses]);

  const netProfit = useMemo(() => {
    return salesSummary.grossProfit - totalOperationalExpenses;
  }, [salesSummary.grossProfit, totalOperationalExpenses]);

  const netProfitMarginPercent = useMemo(() => {
    if (salesSummary.netRevenue <= 0) return 0;
    return (netProfit / salesSummary.netRevenue) * 100;
  }, [netProfit, salesSummary.netRevenue]);

  const handleAddExpense = () => {
    if (!newExpName.trim() || newExpAmount <= 0) return;
    const newExp: OperationalExpense = {
      id: `exp_${Date.now()}`,
      name: newExpName.trim(),
      amount: newExpAmount,
      category: newExpCategory || 'Operasional',
    };
    setOperationalExpenses([...operationalExpenses, newExp]);
    setNewExpName('');
    setNewExpAmount(0);
    setIsAddExpenseOpen(false);
  };

  const handleDeleteExpense = (id: string) => {
    setOperationalExpenses(operationalExpenses.filter(e => e.id !== id));
  };

  // -------------------------------------------------------------
  // EXPORT TO CSV / EXCEL HANDLERS
  // -------------------------------------------------------------
  const exportCsv = (filename: string, rows: (string | number)[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportProductsCsv = () => {
    const headers = ['Barcode', 'Nama Barang', 'Kategori', 'Brand', 'Satuan', 'Harga Modal (HPP)', 'Harga Jual', 'Margin (Rp)', 'Margin (%)', 'Stok Unit', 'Total Modal Aset (Rp)', 'Total Nilai Jual (Rp)', 'Terjual'];
    const rows = filteredProducts.map(p => {
      const hpp = getProductHpp(p);
      const marginRp = p.price - hpp;
      const marginPct = ((marginRp / p.price) * 100).toFixed(1) + '%';
      return [
        p.barcode || '-',
        p.name,
        p.category,
        p.brand,
        p.unit || 'Pcs',
        hpp,
        p.price,
        marginRp,
        marginPct,
        p.stock,
        p.stock * hpp,
        p.stock * p.price,
        p.soldCount || 0,
      ];
    });
    exportCsv(`Laporan_Info_Barang_KuickMart_${new Date().toISOString().split('T')[0]}.csv`, [headers, ...rows]);
  };

  const handleExportSalesCsv = () => {
    const headers = ['No Pesanan', 'Tanggal', 'Nama Pelanggan', 'Toko/Cabang', 'Status', 'Metode Bayar', 'Qty Item', 'Subtotal (Rp)', 'Diskon (Rp)', 'Ongkir (Rp)', 'Total Bayar (Rp)'];
    const rows = filteredOrders.map(ord => [
      ord.orderNumber,
      new Date(ord.createdAt).toLocaleString('id-ID'),
      ord.customerName || 'Pelanggan Umum',
      ord.store?.name || 'Toko Utama',
      ord.status,
      ord.paymentMethod,
      (ord.items || []).reduce((s, it) => s + it.quantity, 0),
      ord.subtotal,
      ord.discountAmount,
      ord.deliveryFee,
      ord.total,
    ]);
    exportCsv(`Laporan_Penjualan_KuickMart_${activeDateRange.start.toISOString().split('T')[0]}_sd_${activeDateRange.end.toISOString().split('T')[0]}.csv`, [headers, ...rows]);
  };

  const handleExportProfitLossCsv = () => {
    const rows: (string | number)[][] = [
      ['LAPORAN LABA RUGI KUICK MART PANGANDARAN'],
      ['Periode:', `${activeDateRange.start.toLocaleDateString('id-ID')} s/d ${activeDateRange.end.toLocaleDateString('id-ID')}`],
      [''],
      ['KOMPONEN', 'NOMINAL (RP)'],
      ['1. PENDAPATAN USAHA (REVENUE)'],
      ['Penjualan Kotor (Gross Sales)', salesSummary.grossSubtotal],
      ['Potongan Diskon & Voucher', -salesSummary.totalDiscount],
      ['Pendapatan Ongkir / Layanan', salesSummary.totalDeliveryFee],
      ['TOTAL PENDAPATAN BERSIH', salesSummary.netRevenue],
      [''],
      ['2. HARGA POKOK PENJUALAN (HPP / COGS)'],
      ['Total Modal Barang Terjual', -salesSummary.totalHppCost],
      [''],
      ['3. LABA KOTOR (GROSS PROFIT)', salesSummary.grossProfit],
      ['Gross Margin (%)', `${salesSummary.grossMarginPercent.toFixed(1)}%`],
      [''],
      ['4. BEBAN OPERASIONAL TOKO'],
      ...operationalExpenses.map(exp => [`- ${exp.name} (${exp.category})`, -exp.amount]),
      ['TOTAL BEBAN OPERASIONAL', -totalOperationalExpenses],
      [''],
      ['5. LABA BERSIH (NET PROFIT / LOSS)', netProfit],
      ['Net Margin (%)', `${netProfitMarginPercent.toFixed(1)}%`],
      ['Status Keuangan', netProfit >= 0 ? 'SURPLUS (LABA BERSIH)' : 'DEFISIT (RUGI)'],
    ];
    exportCsv(`Laporan_Laba_Rugi_KuickMart_${activeDateRange.start.toISOString().split('T')[0]}_sd_${activeDateRange.end.toISOString().split('T')[0]}.csv`, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* MODULE HEADER */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Laporan & Akuntansi Retail
              </span>
              <span className="text-xs text-stone-400">Terintegrasi Real-Time</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 mt-1">
              Pusat Laporan & Analisis Bisnis
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Laporan Info Barang, Laporan Penjualan per Periode, dan Laporan Laba Rugi Komprehensif.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Cetak Laporan ke Printer atau PDF"
            >
              <Printer className="w-4 h-4 text-stone-600" />
              <span>Cetak / PDF</span>
            </button>

            {activeReportTab === 'info_barang' && (
              <button
                onClick={handleExportProductsCsv}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor Excel (Info Barang)</span>
              </button>
            )}

            {activeReportTab === 'penjualan_periode' && (
              <button
                onClick={handleExportSalesCsv}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor Excel (Penjualan)</span>
              </button>
            )}

            {activeReportTab === 'rugi_laba' && (
              <button
                onClick={handleExportProfitLossCsv}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor Excel (Laba Rugi)</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 CORE REPORT TABS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5 pt-4 border-t border-stone-200">
          <button
            onClick={() => setActiveReportTab('info_barang')}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'info_barang'
                ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100/80'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
              activeReportTab === 'info_barang' ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'
            }`}>
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Modul 1</div>
              <div className="text-sm font-black text-stone-900">Laporan Info Barang</div>
              <div className="text-2xs text-stone-500">Master Stok, HPP & Aset Modal</div>
            </div>
          </button>

          <button
            onClick={() => setActiveReportTab('penjualan_periode')}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'penjualan_periode'
                ? 'bg-blue-50/80 border-blue-500 shadow-xs'
                : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100/80'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
              activeReportTab === 'penjualan_periode' ? 'bg-blue-600 text-white' : 'bg-stone-200 text-stone-700'
            }`}>
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Modul 2</div>
              <div className="text-sm font-black text-stone-900">Laporan Penjualan Periode</div>
              <div className="text-2xs text-stone-500">Omzet, Invoice, Item & Brand</div>
            </div>
          </button>

          <button
            onClick={() => setActiveReportTab('rugi_laba')}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'rugi_laba'
                ? 'bg-rose-50/80 border-rose-500 shadow-xs'
                : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100/80'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
              activeReportTab === 'rugi_laba' ? 'bg-rose-600 text-white' : 'bg-stone-200 text-stone-700'
            }`}>
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Modul 3</div>
              <div className="text-sm font-black text-stone-900">Laporan Rugi Laba</div>
              <div className="text-2xs text-stone-500">Pendapatan, HPP, Beban & Margin</div>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. LAPORAN INFO BARANG (TAB CONTENT)                      */}
      {/* ========================================================= */}
      {activeReportTab === 'info_barang' && (
        <div className="space-y-6">
          {/* KPI CARDS INFO BARANG */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                <span>Total Master Produk</span>
                <Package className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-stone-900 mt-2">
                {productSummaryStats.totalSku} <span className="text-xs font-normal text-stone-500">SKU</span>
              </div>
              <div className="text-2xs text-stone-500 mt-1">
                Fisik: {productSummaryStats.totalStockUnits.toLocaleString('id-ID')} unit barang
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                <span>Nilai Modal Stok (HPP)</span>
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 mt-2">
                Rp {productSummaryStats.totalCostAsset.toLocaleString('id-ID')}
              </div>
              <div className="text-2xs text-stone-500 mt-1">
                Modal pembelian inventori aktif
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                <span>Potensi Nilai Jual</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-700 mt-2">
                Rp {productSummaryStats.totalSellingPotential.toLocaleString('id-ID')}
              </div>
              <div className="text-2xs text-emerald-600 font-semibold mt-1">
                Potensi Margin: Rp {productSummaryStats.potentialGrossProfit.toLocaleString('id-ID')} ({productSummaryStats.avgMarginPercent.toFixed(1)}%)
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                <span>Peringatan Stok</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-rose-600">{productSummaryStats.lowStockCount}</span>
                <span className="text-xs text-stone-500 font-medium">Menipis (&lt;10)</span>
                <span className="text-xs font-bold text-stone-300">|</span>
                <span className="text-2xl font-black text-stone-900">{productSummaryStats.outOfStockCount}</span>
                <span className="text-xs text-stone-500 font-medium">Habis (0)</span>
              </div>
              <div className="text-2xs text-stone-500 mt-1">
                Perlu restock supplier segera
              </div>
            </div>
          </div>

          {/* FILTERS & SEARCH INFO BARANG */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama barang, barcode, atau merk..."
                  value={itemSearchQuery}
                  onChange={e => setItemSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
                {itemSearchQuery && (
                  <button
                    onClick={() => setItemSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500 font-medium whitespace-nowrap">Urutkan:</span>
                <select
                  value={itemSortBy}
                  onChange={e => setItemSortBy(e.target.value as any)}
                  className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="asset_desc">Nilai Modal Terbesar</option>
                  <option value="stock_desc">Stok Terbanyak</option>
                  <option value="stock_asc">Stok Paling Sedikit</option>
                  <option value="margin_desc">Margin (%) Tertinggi</option>
                  <option value="name_asc">Nama Produk (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Sub-Filters: Kategori, Brand, Status Stok */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <div className="flex items-center gap-1.5 shrink-0 text-stone-500 font-semibold mr-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Filter:</span>
              </div>

              {/* Kategori */}
              <select
                value={itemCategoryFilter}
                onChange={e => setItemCategoryFilter(e.target.value)}
                className="bg-stone-100 hover:bg-stone-200/70 border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Kategori ({uniqueCategories.length})</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Brand */}
              <select
                value={itemBrandFilter}
                onChange={e => setItemBrandFilter(e.target.value)}
                className="bg-stone-100 hover:bg-stone-200/70 border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Merk/Brand ({uniqueBrands.length})</option>
                {uniqueBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Status Stok */}
              <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 shrink-0">
                <button
                  onClick={() => setItemStockFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    itemStockFilter === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Semua Stok
                </button>
                <button
                  onClick={() => setItemStockFilter('safe')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    itemStockFilter === 'safe' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  Aman (&ge;10)
                </button>
                <button
                  onClick={() => setItemStockFilter('low')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    itemStockFilter === 'low' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-700 hover:text-amber-900'
                  }`}
                >
                  Menipis (&lt;10)
                </button>
                <button
                  onClick={() => setItemStockFilter('out')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    itemStockFilter === 'out' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  Habis (0)
                </button>
              </div>

              {(itemCategoryFilter !== 'all' || itemBrandFilter !== 'all' || itemStockFilter !== 'all' || itemSearchQuery) && (
                <button
                  onClick={() => {
                    setItemCategoryFilter('all');
                    setItemBrandFilter('all');
                    setItemStockFilter('all');
                    setItemSearchQuery('');
                  }}
                  className="text-2xs font-bold text-rose-600 hover:text-rose-800 underline shrink-0 px-2"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* TABEL MASTER INFO BARANG */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="text-xs font-bold text-stone-700">
                Menampilkan <span className="text-emerald-700 font-black">{filteredProducts.length}</span> dari total {products.length} SKU Barang
              </div>
              <div className="text-2xs text-stone-400">
                *Klik tombol edit pada HPP untuk menyesuaikan harga modal supplier
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100/75 text-stone-600 font-bold border-b border-stone-200 uppercase text-2xs tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 min-w-[220px]">Barang & Satuan</th>
                    <th className="py-3 px-4">Kategori & Merk</th>
                    <th className="py-3 px-4 text-right">HPP Modal</th>
                    <th className="py-3 px-4 text-right">Harga Jual</th>
                    <th className="py-3 px-4 text-right">Margin Untung</th>
                    <th className="py-3 px-4 text-center">Stok Fisik</th>
                    <th className="py-3 px-4 text-right">Total Modal Aset</th>
                    <th className="py-3 px-4 text-right">Potensi Jual</th>
                    <th className="py-3 px-4 text-center">Terjual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-stone-400">
                        Tidak ada barang yang cocok dengan filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod, idx) => {
                      const hpp = getProductHpp(prod);
                      const marginRp = prod.price - hpp;
                      const marginPercent = ((marginRp / prod.price) * 100).toFixed(1);
                      const totalCost = prod.stock * hpp;
                      const totalSelling = prod.stock * prod.price;

                      return (
                        <tr key={prod.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3 px-4 text-center text-stone-400 font-medium">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {prod.image ? (
                                <img
                                  src={prod.image}
                                  alt={prod.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-stone-900 leading-tight">{prod.name}</div>
                                <div className="text-2xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                                  <span className="font-mono bg-stone-100 px-1 rounded border border-stone-200">{prod.barcode || 'NO-BARCODE'}</span>
                                  <span>Satuan: <strong>{prod.unit || 'Pcs'}</strong></span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-stone-800 font-semibold">{prod.category}</div>
                            <div className="text-2xs text-stone-500 font-medium">{prod.brand || '-'}</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-mono font-bold text-stone-800">
                              Rp {hpp.toLocaleString('id-ID')}
                            </div>
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setEditingHppProduct(prod);
                                  setTempHppValue(hpp);
                                }}
                                className="text-2xs text-emerald-600 hover:text-emerald-800 underline flex items-center gap-0.5 ml-auto cursor-pointer"
                                title="Edit Harga Pokok Beli / HPP"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Ubah HPP</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                            Rp {prod.price.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-mono font-bold text-emerald-700">
                              +Rp {marginRp.toLocaleString('id-ID')}
                            </div>
                            <span className="inline-block px-1.5 py-0.2 rounded text-2xs font-bold bg-emerald-100 text-emerald-800">
                              {marginPercent}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-black ${
                              prod.stock === 0
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : prod.stock < 10
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {prod.stock} {prod.unit || 'pcs'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                            Rp {totalCost.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-blue-900">
                            Rp {totalSelling.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-stone-600">
                            {prod.soldCount || 0}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. LAPORAN PENJUALAN PER PERIODE (TAB CONTENT)            */}
      {/* ========================================================= */}
      {activeReportTab === 'penjualan_periode' && (
        <div className="space-y-6">
          {/* DATE RANGE FILTER TOOLBAR */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Pilih Periode Penjualan:</span>
                </div>
                {/* PRESETS BUTTONS */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {[
                    { id: 'today', label: 'Hari Ini' },
                    { id: 'yesterday', label: 'Kemarin' },
                    { id: '7days', label: '7 Hari Terakhir' },
                    { id: '30days', label: '30 Hari Terakhir' },
                    { id: 'this_month', label: 'Bulan Ini' },
                    { id: 'last_month', label: 'Bulan Lalu' },
                    { id: 'all', label: 'Semua Periode' },
                    { id: 'custom', label: 'Rentang Kustom' },
                  ].map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setDatePreset(preset.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        datePreset === preset.id
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECONDARY FILTERS: TOKO & STATUS */}
              <div className="flex items-center gap-2 flex-wrap">
                <div>
                  <label className="block text-2xs font-bold text-stone-500 mb-1">Cabang Toko:</label>
                  <select
                    value={salesStoreFilter}
                    onChange={e => setSalesStoreFilter(e.target.value)}
                    className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 font-medium text-stone-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">Semua Cabang Toko</option>
                    {stores.map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-500 mb-1">Status Pesanan:</label>
                  <select
                    value={salesStatusFilter}
                    onChange={e => setSalesStatusFilter(e.target.value)}
                    className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 font-medium text-stone-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">Semua Status</option>
                    <option value="completed">Selesai (Completed)</option>
                    <option value="processing">Sedang Diproses</option>
                    <option value="delivering">Dalam Pengiriman</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-500 mb-1">Metode Bayar:</label>
                  <select
                    value={salesPayFilter}
                    onChange={e => setSalesPayFilter(e.target.value)}
                    className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 font-medium text-stone-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">Semua Pembayaran</option>
                    <option value="qris">QRIS</option>
                    <option value="gopay">GoPay</option>
                    <option value="shopeepay">ShopeePay</option>
                    <option value="bca_va">BCA Virtual Account</option>
                    <option value="cod">Cash on Delivery (COD)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* CUSTOM DATE PICKERS (IF CUSTOM) */}
            {datePreset === 'custom' && (
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-900">Mulai:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-900">Sampai:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none"
                  />
                </div>
                <span className="text-2xs text-blue-700">
                  Data transaksi akan difilter otomatis sesuai rentang tanggal yang Anda tentukan.
                </span>
              </div>
            )}

            {/* ACTIVE PERIOD LABEL */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500">
              <div>
                Rentang Aktif: <strong className="text-stone-900">{activeDateRange.start.toLocaleDateString('id-ID', { dateStyle: 'medium' })}</strong> s/d <strong className="text-stone-900">{activeDateRange.end.toLocaleDateString('id-ID', { dateStyle: 'medium' })}</strong>
              </div>
              <div>
                Total Transaksi Terfilter: <strong className="text-blue-700">{filteredOrders.length} Pesanan</strong>
              </div>
            </div>
          </div>

          {/* KPI CARDS SALES SUMMARY */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                <span>Total Omzet Bersih</span>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-900 mt-2">
                Rp {salesSummary.netRevenue.toLocaleString('id-ID')}
              </div>
              <div className="text-2xs text-stone-500 mt-1">
                Kotor: Rp {salesSummary.grossSubtotal.toLocaleString('id-ID')} | Diskon: -Rp {salesSummary.totalDiscount.toLocaleString('id-ID')}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                <span>Volume Transaksi</span>
                <Receipt className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-800 mt-2">
                {salesSummary.orderCount} <span className="text-xs font-normal text-stone-500">Pesanan</span>
              </div>
              <div className="text-2xs text-stone-500 mt-1">
                Rata-rata: Rp {salesSummary.avgOrderValue.toLocaleString('id-ID')} / order
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                <span>Total Produk Terjual</span>
                <ShoppingBag className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-purple-900 mt-2">
                {salesSummary.totalItemsSold.toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-500">Pcs</span>
              </div>
              <div className="text-2xs text-stone-500 mt-1">
                Total item keluar dari inventori
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                <span>Laba Kotor Penjualan</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                Rp {salesSummary.grossProfit.toLocaleString('id-ID')}
              </div>
              <div className="text-2xs text-emerald-700 font-bold mt-1">
                Margin Kotor: {salesSummary.grossMarginPercent.toFixed(1)}% dari omzet
              </div>
            </div>
          </div>

          {/* VIEW SELECTOR: TRANSAKSI / PRODUK TERLARIS / KATEGORI / BRAND / HARIAN */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="flex border-b border-stone-200 px-4 bg-stone-50 overflow-x-auto">
              {[
                { id: 'orders', label: `Daftar Transaksi (${filteredOrders.length})`, icon: <Receipt className="w-4 h-4" /> },
                { id: 'items', label: `Item Terlaris (${salesByProduct.length})`, icon: <Package className="w-4 h-4" /> },
                { id: 'categories', label: `Per Kategori (${salesByCategory.length})`, icon: <Layers className="w-4 h-4" /> },
                { id: 'brands', label: `Per Merk/Brand (${salesByBrand.length})`, icon: <Tag className="w-4 h-4" /> },
                { id: 'daily', label: `Tren Harian (${salesByDay.length} Hari)`, icon: <Calendar className="w-4 h-4" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSalesViewMode(tab.id as any)}
                  className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    salesViewMode === tab.id
                      ? 'border-blue-600 text-blue-700 bg-white'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-5">
              {/* VIEW 1: TRANSAKSI INVOICE LIST */}
              {salesViewMode === 'orders' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-100/75 text-stone-600 font-bold border-b border-stone-200 uppercase text-2xs tracking-wider">
                        <th className="py-3 px-4">No Pesanan</th>
                        <th className="py-3 px-4">Waktu Transaksi</th>
                        <th className="py-3 px-4">Pelanggan</th>
                        <th className="py-3 px-4">Cabang Toko</th>
                        <th className="py-3 px-4 text-center">Metode Bayar</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Item</th>
                        <th className="py-3 px-4 text-right">Subtotal</th>
                        <th className="py-3 px-4 text-right">Diskon</th>
                        <th className="py-3 px-4 text-right">Total Bayar</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-stone-400">
                            Tidak ada data transaksi pada periode ini.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map(ord => {
                          const totalItems = (ord.items || []).reduce((s, it) => s + it.quantity, 0);
                          return (
                            <tr key={ord.id} className="hover:bg-stone-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-blue-900">
                                {ord.orderNumber}
                              </td>
                              <td className="py-3 px-4 text-stone-600">
                                <div>{new Date(ord.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                <div className="text-2xs text-stone-400">{new Date(ord.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-stone-900">{ord.customerName || 'Pelanggan Toko'}</div>
                                <div className="text-2xs text-stone-400">{ord.customerPhone || '-'}</div>
                              </td>
                              <td className="py-3 px-4 text-stone-700 font-medium">
                                {ord.store?.name || 'Kuick Mart Pangandaran'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-block px-2 py-0.5 rounded text-2xs font-bold uppercase bg-stone-100 text-stone-800 border border-stone-200">
                                  {ord.paymentMethod}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-2xs font-bold ${
                                  ord.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ord.status === 'cancelled'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {ord.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center font-bold text-stone-800">
                                {totalItems} pcs
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-stone-600">
                                Rp {ord.subtotal.toLocaleString('id-ID')}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-rose-600 font-medium">
                                {ord.discountAmount > 0 ? `-Rp ${ord.discountAmount.toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-black text-stone-900">
                                Rp {ord.total.toLocaleString('id-ID')}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => setSelectedOrderForDetail(ord)}
                                  className="px-2 py-1 text-2xs font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                                >
                                  Detail Item
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VIEW 2: ITEM TERLARIS (RANKING PRODUK) */}
              {salesViewMode === 'items' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-100/75 text-stone-600 font-bold border-b border-stone-200 uppercase text-2xs tracking-wider">
                        <th className="py-3 px-4 w-12 text-center">Peringkat</th>
                        <th className="py-3 px-4">Nama Produk & Barcode</th>
                        <th className="py-3 px-4">Kategori / Merk</th>
                        <th className="py-3 px-4 text-center">Qty Terjual</th>
                        <th className="py-3 px-4 text-right">Total Omzet Penjualan</th>
                        <th className="py-3 px-4 text-right">Estimasi Laba Kotor</th>
                        <th className="py-3 px-4 text-right">Kontribusi Omzet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {salesByProduct.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-stone-400">
                            Tidak ada produk terjual pada periode ini.
                          </td>
                        </tr>
                      ) : (
                        salesByProduct.map((item, idx) => {
                          const contributionPct = salesSummary.netRevenue > 0 ? ((item.revenue / salesSummary.netRevenue) * 100).toFixed(1) : '0';
                          return (
                            <tr key={item.product.id} className="hover:bg-stone-50/80 transition-colors">
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-2xs font-black ${
                                  idx === 0 ? 'bg-amber-400 text-stone-900' : idx === 1 ? 'bg-stone-300 text-stone-900' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-stone-100 text-stone-600'
                                }`}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-stone-900">{item.product.name}</div>
                                <div className="text-2xs text-stone-400 font-mono">{item.product.barcode || '-'}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-stone-800 font-semibold">{item.product.category}</div>
                                <div className="text-2xs text-stone-500">{item.product.brand}</div>
                              </td>
                              <td className="py-3 px-4 text-center font-black text-stone-900 text-sm">
                                {item.qty} <span className="text-2xs font-normal text-stone-500">{item.product.unit || 'pcs'}</span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-blue-900">
                                Rp {item.revenue.toLocaleString('id-ID')}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                                +Rp {item.profit.toLocaleString('id-ID')}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 bg-stone-200 h-2 rounded-full overflow-hidden">
                                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(100, Number(contributionPct))}%` }}></div>
                                  </div>
                                  <span className="font-bold text-stone-700">{contributionPct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VIEW 3: PER KATEGORI */}
              {salesViewMode === 'categories' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {salesByCategory.map(cat => {
                      const sharePct = salesSummary.netRevenue > 0 ? (cat.revenue / salesSummary.netRevenue) * 100 : 0;
                      return (
                        <div key={cat.category} className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-stone-100/70 transition-colors">
                          <div className="flex items-center justify-between font-bold text-sm text-stone-900">
                            <span className="capitalize">{cat.category}</span>
                            <span className="font-mono text-blue-900">Rp {cat.revenue.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex items-center justify-between text-2xs text-stone-500 mt-1">
                            <span>{cat.qty} pcs terjual</span>
                            <span className="text-emerald-700 font-semibold">Laba Kotor: Rp {cat.profit.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden mt-2.5">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(100, sharePct)}%` }}></div>
                          </div>
                          <div className="text-right text-2xs font-bold text-stone-500 mt-1">
                            {sharePct.toFixed(1)}% dari total omzet
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIEW 4: PER MERK / BRAND */}
              {salesViewMode === 'brands' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {salesByBrand.map(b => {
                      const sharePct = salesSummary.netRevenue > 0 ? (b.revenue / salesSummary.netRevenue) * 100 : 0;
                      return (
                        <div key={b.brand} className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-stone-100/70 transition-colors">
                          <div className="flex items-center justify-between font-bold text-sm text-stone-900">
                            <span>{b.brand}</span>
                            <span className="font-mono text-purple-900">Rp {b.revenue.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex items-center justify-between text-2xs text-stone-500 mt-1">
                            <span>{b.qty} pcs terjual</span>
                            <span className="text-emerald-700 font-semibold">Laba Kotor: Rp {b.profit.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden mt-2.5">
                            <div className="bg-purple-600 h-full rounded-full" style={{ width: `${Math.min(100, sharePct)}%` }}></div>
                          </div>
                          <div className="text-right text-2xs font-bold text-stone-500 mt-1">
                            {sharePct.toFixed(1)}% dari total omzet
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIEW 5: TREN HARIAN */}
              {salesViewMode === 'daily' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-100/75 text-stone-600 font-bold border-b border-stone-200 uppercase text-2xs tracking-wider">
                        <th className="py-3 px-4">Tanggal Transaksi</th>
                        <th className="py-3 px-4 text-center">Jumlah Pesanan</th>
                        <th className="py-3 px-4 text-right">Omzet Bersih</th>
                        <th className="py-3 px-4 text-right">Modal HPP</th>
                        <th className="py-3 px-4 text-right">Laba Kotor</th>
                        <th className="py-3 px-4 text-right">Margin (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {salesByDay.map(day => {
                        const margin = day.netRevenue > 0 ? ((day.profit / day.netRevenue) * 100).toFixed(1) : '0';
                        return (
                          <tr key={day.dateStr} className="hover:bg-stone-50/80 transition-colors">
                            <td className="py-3 px-4 font-bold text-stone-900">{day.dateStr}</td>
                            <td className="py-3 px-4 text-center font-bold text-stone-800">{day.orderCount} order</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-blue-900">Rp {day.netRevenue.toLocaleString('id-ID')}</td>
                            <td className="py-3 px-4 text-right font-mono text-stone-600">Rp {day.hppCost.toLocaleString('id-ID')}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">+Rp {day.profit.toLocaleString('id-ID')}</td>
                            <td className="py-3 px-4 text-right">
                              <span className="inline-block px-2 py-0.5 rounded text-2xs font-bold bg-emerald-100 text-emerald-800">
                                {margin}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. LAPORAN RUGI LABA (INCOME STATEMENT)                    */}
      {/* ========================================================= */}
      {activeReportTab === 'rugi_laba' && (
        <div className="space-y-6">
          {/* PERIODE SELECTION BANNER */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-600" />
              <span className="text-xs text-stone-500 font-bold">Periode Analisis Laba:</span>
              <strong className="text-xs text-stone-900 font-black">
                {activeDateRange.start.toLocaleDateString('id-ID', { dateStyle: 'medium' })} s/d {activeDateRange.end.toLocaleDateString('id-ID', { dateStyle: 'medium' })}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={datePreset}
                onChange={e => setDatePreset(e.target.value as any)}
                className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 font-bold text-stone-800 cursor-pointer focus:outline-none focus:border-rose-500"
              >
                <option value="today">Hari Ini</option>
                <option value="yesterday">Kemarin</option>
                <option value="7days">7 Hari Terakhir</option>
                <option value="30days">30 Hari Terakhir</option>
                <option value="this_month">Bulan Ini</option>
                <option value="last_month">Bulan Lalu</option>
                <option value="all">Semua Periode</option>
              </select>

              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Pos Beban Biaya</span>
              </button>
            </div>
          </div>

          {/* INCOME STATEMENT DOCUMENT (STANDAR LAPORAN KEUANGAN) */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-6 sm:p-8 space-y-6">
            {/* Header Document */}
            <div className="text-center border-b border-stone-200 pb-5">
              <div className="text-xs font-black tracking-widest uppercase text-stone-500">
                KUICK MART PANGANDARAN - LAPORAN KEUANGAN
              </div>
              <h3 className="text-2xl font-black text-stone-900 mt-1">
                Laporan Laba Rugi Komprehensif
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Periode: {activeDateRange.start.toLocaleDateString('id-ID', { dateStyle: 'long' })} s/d {activeDateRange.end.toLocaleDateString('id-ID', { dateStyle: 'long' })}
              </p>
            </div>

            {/* STATEMENT CONTENT */}
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* BAGIAN 1: PENDAPATAN USAHA */}
              <div className="space-y-2">
                <div className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>1. PENDAPATAN PENJUALAN (REVENUE)</span>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between text-stone-700">
                    <span>Penjualan Kotor Produk (Gross Sales)</span>
                    <span className="font-mono font-bold">Rp {salesSummary.grossSubtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Potongan Penjualan (Diskon & Voucher Promosi)</span>
                    <span className="font-mono font-bold">- Rp {salesSummary.totalDiscount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-stone-700">
                    <span>Pendapatan Pengiriman & Biaya Layanan</span>
                    <span className="font-mono font-bold">+ Rp {salesSummary.totalDeliveryFee.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="pt-2 border-t border-stone-200 flex justify-between font-black text-sm text-stone-900">
                    <span>TOTAL PENDAPATAN BERSIH (NET REVENUE)</span>
                    <span className="font-mono text-blue-900">Rp {salesSummary.netRevenue.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* BAGIAN 2: HARGA POKOK PENJUALAN (HPP / COGS) */}
              <div className="space-y-2">
                <div className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>2. HARGA POKOK PENJUALAN (HPP / COGS)</span>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between text-stone-700">
                    <span>Modal Pokok Barang Terjual ({salesSummary.totalItemsSold} pcs item)</span>
                    <span className="font-mono font-bold text-amber-900">Rp {salesSummary.totalHppCost.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="pt-2 border-t border-stone-200 flex justify-between font-black text-sm text-amber-950">
                    <span>TOTAL BEBAN HPP MODAL BARANG</span>
                    <span className="font-mono text-amber-800">- Rp {salesSummary.totalHppCost.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* BAGIAN 3: LABA KOTOR (GROSS PROFIT) */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">3. LABA KOTOR (GROSS PROFIT)</div>
                  <div className="text-2xs text-emerald-700 mt-0.5">Pendapatan Bersih dikurangi HPP Barang</div>
                </div>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-black text-emerald-800 font-mono">
                    Rp {salesSummary.grossProfit.toLocaleString('id-ID')}
                  </div>
                  <div className="text-xs font-bold text-emerald-700">
                    Gross Margin: {salesSummary.grossMarginPercent.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* BAGIAN 4: BEBAN OPERASIONAL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-rose-900 uppercase tracking-wider">
                  <span>4. BEBAN OPERASIONAL & BIAYA TOKO (OPERATING EXPENSES)</span>
                  <button
                    onClick={() => setIsAddExpenseOpen(true)}
                    className="text-2xs font-bold text-rose-600 hover:text-rose-800 underline lowercase first-letter:uppercase cursor-pointer"
                  >
                    + Tambah Beban
                  </button>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2.5 text-xs">
                  {operationalExpenses.map(exp => (
                    <div key={exp.id} className="flex items-center justify-between text-stone-700 group">
                      <div className="flex items-center gap-2">
                        <span className="text-stone-400">•</span>
                        <span className="font-medium">{exp.name}</span>
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-stone-200/70 text-stone-600">{exp.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-800">Rp {exp.amount.toLocaleString('id-ID')}</span>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="text-stone-400 hover:text-rose-600 opacity-60 group-hover:opacity-100 transition-opacity"
                            title="Hapus beban ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-stone-200 flex justify-between font-black text-sm text-stone-900">
                    <span>TOTAL BEBAN OPERASIONAL</span>
                    <span className="font-mono text-rose-700">- Rp {totalOperationalExpenses.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* BAGIAN 5: LABA BERSIH (NET PROFIT / LOSS) */}
              <div className={`p-5 rounded-2xl border-2 flex items-center justify-between ${
                netProfit >= 0
                  ? 'bg-emerald-100/70 border-emerald-500 text-emerald-950'
                  : 'bg-rose-100/70 border-rose-500 text-rose-950'
              }`}>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    {netProfit >= 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                    <span>5. LABA BERSIH (NET PROFIT / LOSS)</span>
                  </div>
                  <div className="text-xs font-medium mt-1">
                    Status: <strong className="font-black uppercase">{netProfit >= 0 ? 'SURPLUS (LABA BERSIH)' : 'DEFISIT (RUGI BERSIH)'}</strong>
                  </div>
                  <div className="text-2xs text-stone-600 mt-0.5">
                    Net Profit Margin: <strong>{netProfitMarginPercent.toFixed(1)}%</strong> dari total omzet
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-2xl sm:text-3xl font-black font-mono ${
                    netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
                  }`}>
                    {netProfit >= 0 ? '+' : ''}Rp {netProfit.toLocaleString('id-ID')}
                  </div>
                  <div className="text-2xs font-bold text-stone-500 mt-0.5">
                    Setelah HPP & Beban Operasional
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER AUDIT NOTES */}
            <div className="border-t border-stone-200 pt-4 text-2xs text-stone-400 text-center">
              Laporan Keuangan Kuick Mart Express • Digenerate otomatis berdasarkan data transaksi POS & sistem inventori cloud.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: EDIT HPP PRODUCT (INLINE)                        */}
      {/* ========================================================= */}
      {editingHppProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h4 className="font-black text-stone-900 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>Sesuaikan Harga Pokok Beli (HPP)</span>
              </h4>
              <button
                onClick={() => setEditingHppProduct(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="font-bold text-stone-900 text-sm">{editingHppProduct.name}</div>
                <div className="text-stone-500 mt-1 flex items-center justify-between">
                  <span>Kategori: {editingHppProduct.category}</span>
                  <span>Harga Jual: <strong>Rp {editingHppProduct.price.toLocaleString('id-ID')}</strong></span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Harga Beli / Modal Supplier (HPP) Baru (Rp):
                </label>
                <input
                  type="number"
                  value={tempHppValue}
                  onChange={e => setTempHppValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 font-mono font-bold focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              {tempHppValue > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1 text-2xs">
                  <div className="flex justify-between font-bold text-emerald-900">
                    <span>Estimasi Margin Satuan:</span>
                    <span>Rp {(editingHppProduct.price - tempHppValue).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>Persentase Margin:</span>
                    <span>{(((editingHppProduct.price - tempHppValue) / editingHppProduct.price) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                onClick={() => setEditingHppProduct(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveHpp}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-2xs"
              >
                Simpan Perubahan HPP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: DETAIL ITEM TRANSAKSI                            */}
      {/* ========================================================= */}
      {selectedOrderForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h4 className="font-black text-stone-900 text-sm">
                  Rincian Invoice: {selectedOrderForDetail.orderNumber}
                </h4>
                <div className="text-2xs text-stone-500">
                  {new Date(selectedOrderForDetail.createdAt).toLocaleString('id-ID')}
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForDetail(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              <div className="divide-y divide-stone-100 text-xs">
                {(selectedOrderForDetail.items || []).map((it, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-stone-900">{it.product.name}</div>
                      <div className="text-2xs text-stone-500">
                        {it.quantity} x Rp {(it.unitPrice || it.product.price).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-stone-900">
                      Rp {((it.unitPrice || it.product.price) * it.quantity).toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal Barang</span>
                  <span className="font-mono">Rp {selectedOrderForDetail.subtotal.toLocaleString('id-ID')}</span>
                </div>
                {selectedOrderForDetail.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Potongan Diskon</span>
                    <span className="font-mono">- Rp {selectedOrderForDetail.discountAmount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>Ongkos Kirim</span>
                  <span className="font-mono">Rp {selectedOrderForDetail.deliveryFee.toLocaleString('id-ID')}</span>
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between font-black text-stone-900 text-sm">
                  <span>Total Transaksi</span>
                  <span className="font-mono text-blue-900">Rp {selectedOrderForDetail.total.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-200">
              <button
                onClick={() => setSelectedOrderForDetail(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-stone-900 text-white hover:bg-stone-800 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: TAMBAH POS BEBAN OPERASIONAL                      */}
      {/* ========================================================= */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h4 className="font-black text-stone-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-600" />
                <span>Tambah Pos Beban Biaya Operasional</span>
              </h4>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nama Beban / Kebutuhan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Biaya Bensin Armada Kurir, Biaya Listrik, dll"
                  value={newExpName}
                  onChange={e => setNewExpName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Nominal Biaya (Rp):</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newExpAmount || ''}
                  onChange={e => setNewExpAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 font-mono font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Kategori Beban:</label>
                <select
                  value={newExpCategory}
                  onChange={e => setNewExpCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-800 focus:outline-none focus:border-rose-500"
                >
                  <option value="Operasional">Operasional Harian</option>
                  <option value="Kemasan">Kemasan & Plastik</option>
                  <option value="Transportasi">Transportasi & Kurir</option>
                  <option value="Utilitas">Utilitas (Listrik / Air / Internet)</option>
                  <option value="Administrasi">Administrasi & Biaya Gateway</option>
                  <option value="Promosi">Promosi & Iklan</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleAddExpense}
                disabled={!newExpName.trim() || newExpAmount <= 0}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                Simpan Beban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
