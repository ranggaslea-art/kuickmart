import React, { useMemo } from 'react';
import { Order, PurchaseOrder, Product } from '../types';
import { formatRupiah } from '../utils/formatters';
import {
  ArrowUpDown,
  TrendingUp,
  ShoppingBag,
  Receipt,
  DollarSign,
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Printer,
} from 'lucide-react';

interface TradingCashflowViewProps {
  orders: Order[];
  purchases: PurchaseOrder[];
  products: Product[];
  activeDateRange: { start: Date; end: Date };
  onPrint?: () => void;
}

export const TradingCashflowView: React.FC<TradingCashflowViewProps> = ({
  orders,
  purchases,
  activeDateRange,
  onPrint,
}) => {
  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      const d = new Date(ord.createdAt);
      return d >= activeDateRange.start && d <= activeDateRange.end && ord.status === 'completed';
    });
  }, [orders, activeDateRange]);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(po => {
      const dateVal = po.receivedDate || po.orderDate || po.createdAt;
      const d = new Date(dateVal);
      return d >= activeDateRange.start && d <= activeDateRange.end && po.status !== 'cancelled';
    });
  }, [purchases, activeDateRange]);

  // Core Metrics
  const metrics = useMemo(() => {
    const totalSalesRevenue = filteredOrders.reduce((sum, ord) => sum + (ord.total || 0), 0);
    const totalSalesOrders = filteredOrders.length;

    const totalPurchasesCost = filteredPurchases.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
    const totalPurchasesCount = filteredPurchases.length;

    const netTradingCashflow = totalSalesRevenue - totalPurchasesCost;
    const purchaseToSalesRatio = totalSalesRevenue > 0 ? (totalPurchasesCost / totalSalesRevenue) * 100 : 0;

    return {
      totalSalesRevenue,
      totalSalesOrders,
      totalPurchasesCost,
      totalPurchasesCount,
      netTradingCashflow,
      purchaseToSalesRatio,
      isSurplus: netTradingCashflow >= 0,
    };
  }, [filteredOrders, filteredPurchases]);

  // Combined Daily Comparison Table
  const dailyTimeline = useMemo(() => {
    const map = new Map<string, {
      dateStr: string;
      date: Date;
      salesRevenue: number;
      salesCount: number;
      purchaseCost: number;
      purchaseCount: number;
    }>();

    filteredOrders.forEach(ord => {
      const d = new Date(ord.createdAt);
      const key = d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

      if (!map.has(key)) {
        map.set(key, {
          dateStr: key,
          date: d,
          salesRevenue: ord.total || 0,
          salesCount: 1,
          purchaseCost: 0,
          purchaseCount: 0,
        });
      } else {
        const curr = map.get(key)!;
        curr.salesRevenue += ord.total || 0;
        curr.salesCount += 1;
      }
    });

    filteredPurchases.forEach(po => {
      const d = new Date(po.receivedDate || po.orderDate || po.createdAt);
      const key = d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

      if (!map.has(key)) {
        map.set(key, {
          dateStr: key,
          date: d,
          salesRevenue: 0,
          salesCount: 0,
          purchaseCost: po.totalAmount || 0,
          purchaseCount: 1,
        });
      } else {
        const curr = map.get(key)!;
        curr.purchaseCost += po.totalAmount || 0;
        curr.purchaseCount += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredOrders, filteredPurchases]);

  const handleExportCsv = () => {
    const headers = ['Tanggal', 'Omzet Penjualan (Rp)', 'Jumlah Order Jual', 'Belanja Kulakan (Rp)', 'Jumlah PO Beli', 'Arus Kas Bersih (Rp)', 'Status Kas'];
    const rows = dailyTimeline.map(d => {
      const diff = d.salesRevenue - d.purchaseCost;
      return [
        d.dateStr,
        d.salesRevenue,
        d.salesCount,
        d.purchaseCost,
        d.purchaseCount,
        diff,
        diff >= 0 ? 'Surplus' : 'Defisit',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Komparasi_Penjualan_vs_Pembelian_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* KPI COMPARISON CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-blue-700">
            <span>Arus Kas Masuk (Penjualan)</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-900 mt-2">
            {formatRupiah(metrics.totalSalesRevenue)}
          </div>
          <div className="text-2xs text-stone-500 mt-1">
            Dari {metrics.totalSalesOrders} pesanan pelanggan selesai
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-teal-700">
            <span>Arus Kas Keluar (Kulakan)</span>
            <ShoppingBag className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-900 mt-2">
            {formatRupiah(metrics.totalPurchasesCost)}
          </div>
          <div className="text-2xs text-stone-500 mt-1">
            Dari {metrics.totalPurchasesCount} faktur pembelian supplier
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-2xs ${
          metrics.isSurplus ? 'bg-emerald-50/70 border-emerald-300' : 'bg-rose-50/70 border-rose-300'
        }`}>
          <div className={`flex items-center justify-between text-xs font-bold ${
            metrics.isSurplus ? 'text-emerald-800' : 'text-rose-800'
          }`}>
            <span>Selisih Kas Dagang (Net)</span>
            <ArrowUpDown className="w-4 h-4" />
          </div>
          <div className={`text-2xl font-black mt-2 ${
            metrics.isSurplus ? 'text-emerald-900' : 'text-rose-900'
          }`}>
            {metrics.netTradingCashflow >= 0 ? '+' : ''}{formatRupiah(metrics.netTradingCashflow)}
          </div>
          <div className="text-2xs mt-1 font-semibold">
            {metrics.isSurplus ? (
              <span className="text-emerald-700">Surplus Kas Perdagangan</span>
            ) : (
              <span className="text-rose-700">Defisit Sementara (Investasi Stok Baru)</span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-stone-600">
            <span>Rasio Belanja / Omzet</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 mt-2">
            {metrics.purchaseToSalesRatio.toFixed(1)}%
          </div>
          <div className="text-2xs text-stone-500 mt-1">
            Porsi modal kulakan dibanding pendapatan
          </div>
        </div>
      </div>

      {/* TIMELINE COMPARISON TABLE */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-stone-800">
              Komparasi Arus Kas Harian: Penjualan vs Pembelian
            </h4>
            <p className="text-2xs text-stone-500">
              Periode: {activeDateRange.start.toLocaleDateString('id-ID')} s/d {activeDateRange.end.toLocaleDateString('id-ID')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                title="Cetak Laporan Arus Dagang & Kas Resmi A4 ke Printer / PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Arus Kas (A4)</span>
              </button>
            )}
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-xl bg-stone-800 text-white hover:bg-stone-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Komparasi</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-100/75 text-stone-600 font-bold border-b border-stone-200 uppercase text-2xs tracking-wider">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4 text-right">Penjualan Bersih (Masuk)</th>
                <th className="py-3 px-4 text-center">Order Jual</th>
                <th className="py-3 px-4 text-right">Pembelian Stok (Keluar)</th>
                <th className="py-3 px-4 text-center">PO Beli</th>
                <th className="py-3 px-4 text-right">Selisih Kas Dagang</th>
                <th className="py-3 px-4 text-center">Status Arus Kas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {dailyTimeline.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    Tidak ada aktivitas perdagangan pada periode ini.
                  </td>
                </tr>
              ) : (
                dailyTimeline.map(row => {
                  const diff = row.salesRevenue - row.purchaseCost;
                  const isPositive = diff >= 0;

                  return (
                    <tr key={row.dateStr} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-stone-900">
                        {row.dateStr}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                        {formatRupiah(row.salesRevenue)}
                      </td>
                      <td className="py-3 px-4 text-center text-stone-600">
                        {row.salesCount > 0 ? `${row.salesCount}x` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-teal-700">
                        {formatRupiah(row.purchaseCost)}
                      </td>
                      <td className="py-3 px-4 text-center text-stone-600">
                        {row.purchaseCount > 0 ? `${row.purchaseCount}x` : '-'}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-black ${
                        isPositive ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {isPositive ? '+' : ''}{formatRupiah(diff)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                          isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isPositive ? 'Surplus' : 'Defisit (Restock)'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {dailyTimeline.length > 0 && (
              <tfoot className="bg-stone-50 border-t border-stone-200 font-bold">
                <tr>
                  <td className="py-3 px-4 text-stone-900">Total Periode:</td>
                  <td className="py-3 px-4 text-right font-mono font-black text-blue-900">{formatRupiah(metrics.totalSalesRevenue)}</td>
                  <td className="py-3 px-4 text-center text-stone-700">{metrics.totalSalesOrders}x</td>
                  <td className="py-3 px-4 text-right font-mono font-black text-teal-900">{formatRupiah(metrics.totalPurchasesCost)}</td>
                  <td className="py-3 px-4 text-center text-stone-700">{metrics.totalPurchasesCount}x</td>
                  <td className={`py-3 px-4 text-right font-mono font-black ${metrics.isSurplus ? 'text-emerald-900' : 'text-rose-900'}`}>
                    {metrics.isSurplus ? '+' : ''}{formatRupiah(metrics.netTradingCashflow)}
                  </td>
                  <td className="py-3 px-4 text-center font-bold">
                    {metrics.isSurplus ? 'SURPLUS' : 'DEFISIT'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
