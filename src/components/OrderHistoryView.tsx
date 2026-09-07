import React, { useState } from 'react';
import { 
  Receipt, 
  ChevronRight, 
  RotateCcw, 
  ShoppingBag, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Truck,
  ArrowLeft,
  Navigation
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { formatRupiah, formatDateTime } from '../utils/formatters';
import { formatImageUrl, getProductFallbackImage } from '../utils/imageHelper';

interface OrderHistoryViewProps {
  orders: Order[];
  onBackToShopping: () => void;
  onTrackOrder: (order: Order) => void;
  onReorder: (order: Order) => void;
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({
  orders,
  onBackToShopping,
  onTrackOrder,
  onReorder,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const filteredOrders = orders.filter((order) => {
    if (filter === 'active') return order.status !== 'completed' && order.status !== 'cancelled';
    if (filter === 'completed') return order.status === 'completed';
    return true;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Selesai</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1"><XCircle className="w-3 h-3" /> Dibatalkan</span>;
      default:
        return <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse"><Clock className="w-3 h-3" /> Sedang Diproses</span>;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToShopping}
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-stone-900">Riwayat Pesanan & Belanja</h2>
            <p className="text-xs text-stone-500">Pantau transaksi dan status pengiriman barang Anda</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'all' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-600'}`}
          >
            Semua ({orders.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'active' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-600'}`}
          >
            Aktif
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'completed' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-600'}`}
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mx-auto mb-3">
            <Receipt className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base text-stone-800 mb-1">Belum Ada Riwayat Pesanan</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
            Kamu belum melakukan transaksi dengan filter ini. Mulai pesan kebutuhan harianmu sekarang!
          </p>
          <button
            onClick={onBackToShopping}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-xs"
          >
            Belanja Sekarang
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-stone-200 hover:border-blue-200 rounded-2xl p-4 sm:p-5 shadow-2xs transition-all"
            >
              {/* Top Order Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
                    {order.orderNumber}
                  </span>
                  <span className="text-xs text-stone-400">•</span>
                  <span className="text-xs text-stone-500">{formatDateTime(order.createdAt)}</span>
                </div>
                <div>{getStatusBadge(order.status)}</div>
              </div>

              {/* Middle Row: Items preview & Store */}
              <div className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3 overflow-hidden shrink-0">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <img
                        key={idx}
                        src={formatImageUrl(item.product.image)}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = getProductFallbackImage(item.product.name, item.product.category);
                        }}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-white bg-stone-100"
                      />
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-12 h-12 rounded-xl bg-stone-200 border-2 border-white flex items-center justify-center text-xs font-bold text-stone-600">
                        +{order.items.length - 3}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">
                      {order.items[0]?.product.name}
                      {order.items.length > 1 && ` + ${order.items.length - 1} produk lainnya`}
                    </h4>
                    <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      {order.store.name} • {order.deliveryType === 'delivery' ? 'Antar Kurir' : 'Ambil di Toko'}
                    </p>
                    {(order.customerLocation || order.address?.latitude) && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                        <Navigation className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Titik Maps: {(order.customerLocation?.latitude || order.address?.latitude)?.toFixed(4)}, {(order.customerLocation?.longitude || order.address?.longitude)?.toFixed(4)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-stone-400 block">Total Pembayaran</span>
                  <span className="text-base font-black text-blue-900">{formatRupiah(order.total)}</span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onReorder(order)}
                  className="text-xs font-bold text-stone-700 hover:text-blue-700 flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Beli Lagi</span>
                </button>

                <button
                  onClick={() => onTrackOrder(order)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1 shadow-2xs transition-transform active:scale-95"
                >
                  <span>Lacak & Lihat Struk</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
