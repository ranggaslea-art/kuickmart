import { Order, CartItem, Product, Store } from '../types';
import { PRODUCTS, INITIAL_STORES } from './mockData';

// Helper to create cart item with appropriate HPP
function makeItem(prodIndex: number, qty: number): CartItem {
  const prod = PRODUCTS[prodIndex % PRODUCTS.length];
  return {
    cartItemId: `ci_${prod.id}_${Math.random().toString(36).substring(2, 7)}`,
    product: {
      ...prod,
      costPrice: prod.costPrice || Math.round(prod.price * 0.74),
    },
    quantity: qty,
    unitPrice: prod.price,
  };
}

// Helper to build realistic orders over past 14 days
export function generateSampleOrders(): Order[] {
  const stores = INITIAL_STORES;
  const storePangandaran = stores[0] || {
    id: 'store_pangandaran',
    name: 'Kuick Mart Pangandaran Central',
    address: 'Jl. Merdeka No. 45, Pangandaran',
    phone: '0812-3456-7890',
    isActive: true,
  };
  const storeCijulang = stores[1] || storePangandaran;

  const now = new Date();
  const makeDate = (daysAgo: number, hour: number, minute: number): string => {
    const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const sampleConfigs = [
    // Today
    { daysAgo: 0, hour: 10, min: 15, store: storePangandaran, cust: 'Ibu Ratna Dewi', phone: '081234567801', items: [[0, 2], [1, 1], [3, 3]], status: 'completed', pay: 'qris', deliveryType: 'delivery', fee: 5000, disc: 5000 },
    { daysAgo: 0, hour: 14, min: 30, store: storePangandaran, cust: 'Bpk. Hendra Gunawan', phone: '081234567802', items: [[4, 4], [7, 2], [10, 1]], status: 'completed', pay: 'gopay', deliveryType: 'pickup', fee: 0, disc: 0 },
    { daysAgo: 0, hour: 18, min: 45, store: storeCijulang, cust: 'Siti Nurhaliza', phone: '081234567803', items: [[2, 2], [5, 5], [8, 2]], status: 'processing', pay: 'bca_va', deliveryType: 'delivery', fee: 6000, disc: 10000 },

    // Yesterday
    { daysAgo: 1, hour: 9, min: 20, store: storePangandaran, cust: 'Ahmad Fauzi', phone: '081234567804', items: [[0, 1], [2, 1], [6, 2], [12, 1]], status: 'completed', pay: 'qris', deliveryType: 'delivery', fee: 5000, disc: 0 },
    { daysAgo: 1, hour: 13, min: 10, store: storeCijulang, cust: 'Dewi Lestari', phone: '081234567805', items: [[1, 2], [9, 3], [11, 2]], status: 'completed', pay: 'cod', deliveryType: 'delivery', fee: 7000, disc: 5000 },
    { daysAgo: 1, hour: 17, min: 50, store: storePangandaran, cust: 'Bambang Sudiro', phone: '081234567806', items: [[3, 2], [4, 2], [15, 4]], status: 'completed', pay: 'shopeepay', deliveryType: 'pickup', fee: 0, disc: 0 },

    // 2 days ago
    { daysAgo: 2, hour: 11, min: 0, store: storePangandaran, cust: 'Ibu Hj. Mariam', phone: '081234567807', items: [[0, 3], [1, 2], [2, 2], [5, 6]], status: 'completed', pay: 'transfer' as any, deliveryType: 'delivery', fee: 5000, disc: 15000 },
    { daysAgo: 2, hour: 16, min: 25, store: storeCijulang, cust: 'Yudi Pratama', phone: '081234567808', items: [[7, 3], [8, 3], [14, 2]], status: 'completed', pay: 'qris', deliveryType: 'delivery', fee: 5000, disc: 0 },

    // 3 days ago
    { daysAgo: 3, hour: 10, min: 40, store: storePangandaran, cust: 'Rina Kusuma', phone: '081234567809', items: [[10, 2], [13, 2], [16, 2]], status: 'completed', pay: 'bca_va', deliveryType: 'pickup', fee: 0, disc: 5000 },
    { daysAgo: 3, hour: 15, min: 15, store: storePangandaran, cust: 'Dedi Kurniawan', phone: '081234567810', items: [[0, 1], [3, 2], [6, 3]], status: 'completed', pay: 'gopay', deliveryType: 'delivery', fee: 5000, disc: 0 },

    // 4 days ago
    { daysAgo: 4, hour: 12, min: 30, store: storeCijulang, cust: 'Wulan Guritno', phone: '081234567811', items: [[2, 1], [4, 3], [5, 4]], status: 'completed', pay: 'qris', deliveryType: 'delivery', fee: 6000, disc: 0 },

    // 5 days ago
    { daysAgo: 5, hour: 9, min: 15, store: storePangandaran, cust: 'Eko Prasetyo', phone: '081234567812', items: [[1, 1], [7, 2], [9, 2], [12, 2]], status: 'completed', pay: 'cod', deliveryType: 'delivery', fee: 5000, disc: 5000 },
    { daysAgo: 5, hour: 18, min: 0, store: storeCijulang, cust: 'Tuti Alawiyah', phone: '081234567813', items: [[0, 2], [8, 2], [11, 3]], status: 'completed', pay: 'bni_va', deliveryType: 'delivery', fee: 6000, disc: 0 },

    // 7 days ago
    { daysAgo: 7, hour: 11, min: 20, store: storePangandaran, cust: 'Fajar Nugraha', phone: '081234567814', items: [[3, 4], [5, 6], [14, 3]], status: 'completed', pay: 'qris', deliveryType: 'delivery', fee: 5000, disc: 10000 },

    // 10 days ago
    { daysAgo: 10, hour: 14, min: 10, store: storePangandaran, cust: 'Maya Anggraini', phone: '081234567815', items: [[0, 1], [2, 2], [6, 2], [10, 2]], status: 'completed', pay: 'shopeepay', deliveryType: 'pickup', fee: 0, disc: 0 },

    // 12 days ago
    { daysAgo: 12, hour: 16, min: 45, store: storeCijulang, cust: 'Agus Salim', phone: '081234567816', items: [[1, 2], [4, 4], [7, 3]], status: 'completed', pay: 'cod', deliveryType: 'delivery', fee: 7000, disc: 5000 },
  ];

  return sampleConfigs.map((cfg, idx) => {
    const items: CartItem[] = cfg.items.map(([prodIdx, qty]) => makeItem(prodIdx, qty));
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice || item.product.price) * item.quantity, 0);
    const total = Math.max(0, subtotal + cfg.fee - cfg.disc);
    const orderNum = `KM-${new Date(makeDate(cfg.daysAgo, 0, 0)).getFullYear()}${String(new Date(makeDate(cfg.daysAgo, 0, 0)).getMonth() + 1).padStart(2, '0')}-${String(1001 + idx)}`;

    return {
      id: `ord_sample_${idx + 1}`,
      orderNumber: orderNum,
      createdAt: makeDate(cfg.daysAgo, cfg.hour, cfg.min),
      items,
      store: cfg.store as Store,
      deliveryType: cfg.deliveryType as 'delivery' | 'pickup',
      customerName: cfg.cust,
      customerPhone: cfg.phone,
      status: cfg.status as any,
      paymentMethod: cfg.pay as any,
      paymentStatus: 'paid',
      subtotal,
      deliveryFee: cfg.fee,
      discountAmount: cfg.disc,
      pointsUsed: 0,
      pointsEarned: Math.round(total / 1000),
      total,
      customerNotes: 'Pesanan sample demo laporan otomatis',
      trackingSteps: [
        {
          status: 'pending_payment' as const,
          title: 'Pesanan Dibuat',
          description: 'Menunggu konfirmasi pembayaran',
          timestamp: makeDate(cfg.daysAgo, cfg.hour, cfg.min),
          isCompleted: true,
        },
        {
          status: 'processing' as const,
          title: 'Diproses Toko',
          description: 'Barang sedang disiapkan',
          timestamp: makeDate(cfg.daysAgo, cfg.hour, cfg.min + 5),
          isCompleted: true,
        },
        {
          status: cfg.status as any,
          title: cfg.status === 'completed' ? 'Pesanan Selesai' : 'Dalam Pengantaran',
          description: 'Transaksi berhasil diselesaikan',
          timestamp: makeDate(cfg.daysAgo, cfg.hour, cfg.min + 20),
          isCompleted: cfg.status === 'completed',
        },
      ],
    };
  });
}

export const INITIAL_SAMPLE_ORDERS: Order[] = generateSampleOrders();
