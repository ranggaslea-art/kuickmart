/**
 * Helper utility for WhatsApp messaging & calling actions
 * Mendukung pengiriman pesanan otomatis ke Nomor Telepon / WhatsApp Toko (Modul Cabang Toko)
 * baik pesanan yang diambil sendiri (pickup) maupun pesanan yang diantar oleh kurir (delivery).
 */

import { Order, Store } from '../types';
import { formatRupiah, formatDateTime } from './formatters';
import { loadStoreTenantConfig, getStoreSlugFromUrl, normalizeTenantSlug } from './tenantHelper';

export function cleanPhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  // Remove non-digit characters except leading plus
  let cleaned = rawPhone.trim().replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Indonesian local prefix: replace leading 0 with 62
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62') && (cleaned.startsWith('8') || cleaned.startsWith('9'))) {
    cleaned = '62' + cleaned;
  }

  return cleaned;
}

/**
 * Mengambil Nomor WhatsApp Kasir & CS resmi dari Modul "Identitas Toko & Toko Bebas".
 * Sesuai aturan: Pesanan masuk ke nomor yang ada di modul "Identitas Toko & Toko Bebas"
 * kolom "Nomor WhatsApp Kasir & CS". Ini berlaku di domain utama dan semua subdomain.
 */
export function getStoreOrderWhatsAppNumber(orderOrStore?: Order | Store | null): string {
  try {
    let targetSlug: string | undefined = undefined;

    if (orderOrStore) {
      if ('deliveryType' in orderOrStore) {
        // Objek berupa Order
        targetSlug = orderOrStore.store?.id || orderOrStore.store?.code;
      } else {
        // Objek berupa Store
        targetSlug = orderOrStore.id || orderOrStore.code;
      }
    }

    // 1. Cek konfigurasi tenant sesuai slug toko spesifik (jika ada)
    if (targetSlug) {
      const tenantForStore = loadStoreTenantConfig(normalizeTenantSlug(targetSlug));
      if (tenantForStore?.whatsapp && tenantForStore.whatsapp.trim()) {
        const cleaned = cleanPhoneNumber(tenantForStore.whatsapp);
        if (cleaned) return cleaned;
      }
    }

    // 2. Cek konfigurasi tenant aktif saat ini di URL / domain utama / subdomain
    const activeSlug = getStoreSlugFromUrl();
    const activeTenant = loadStoreTenantConfig(activeSlug);
    if (activeTenant?.whatsapp && activeTenant.whatsapp.trim()) {
      const cleaned = cleanPhoneNumber(activeTenant.whatsapp);
      if (cleaned) return cleaned;
    }

    // 3. Fallback jika ada whatsapp di objek store langsung
    if (orderOrStore) {
      const storeObj = ('deliveryType' in orderOrStore) ? orderOrStore.store : orderOrStore;
      if (storeObj?.whatsapp && storeObj.whatsapp.trim()) {
        const cleaned = cleanPhoneNumber(storeObj.whatsapp);
        if (cleaned) return cleaned;
      }
      if (storeObj?.phone && storeObj.phone.trim()) {
        const cleaned = cleanPhoneNumber(storeObj.phone);
        if (cleaned) return cleaned;
      }
    }
  } catch (err) {
    console.warn('[WhatsAppHelper] Gagal mengambil nomor WA dari modul Identitas Toko:', err);
  }

  return '6281234567890';
}

/**
 * Ekstraksi nomor WhatsApp dari input nomor telepon atau objek Store/Order.
 * Selalu mengutamakan "Nomor WhatsApp Kasir & CS" dari Modul Identitas Toko & Toko Bebas.
 */
export function extractWhatsAppNumber(rawPhoneOrStore?: string | Store | Order | null): string {
  if (!rawPhoneOrStore) {
    return getStoreOrderWhatsAppNumber(null);
  }

  if (typeof rawPhoneOrStore === 'object') {
    return getStoreOrderWhatsAppNumber(rawPhoneOrStore);
  }

  const rawString = String(rawPhoneOrStore).trim();
  if (!rawString) {
    return getStoreOrderWhatsAppNumber(null);
  }

  // Pisahkan jika ada pemisah slash, koma, garis tegak, atau enter
  const segments = rawString.split(/[/|,;\n]/).map(s => s.trim()).filter(Boolean);

  // Cari bagian yang merupakan nomor HP Indonesia (berawalan 08, +628, 628, atau 8)
  const mobileSegment = segments.find(s => {
    const digits = s.replace(/\D/g, '');
    return digits.startsWith('08') || digits.startsWith('628') || (digits.startsWith('8') && digits.length >= 9);
  });

  const chosen = mobileSegment || segments[0] || rawString;
  const cleaned = cleanPhoneNumber(chosen);

  return cleaned || getStoreOrderWhatsAppNumber(null);
}

/**
 * Membuat pesan WhatsApp resmi dan lengkap saat pesanan baru masuk ke Cabang Toko.
 * Digunakan untuk:
 * 1. Pesanan yang diambil sendiri di kasir toko (Pickup)
 * 2. Pesanan yang diantar oleh kurir ke rumah (Delivery)
 */
export function generateStoreOrderWhatsAppMessage(order: Order): string {
  const isDelivery = order.deliveryType === 'delivery';
  const isExpedition = order.deliveryType === 'expedition';
  const typeHeader = isDelivery
    ? '🛵 *PESANAN DIANTAR OLEH KURIR (EXPRESS DELIVERY)*'
    : isExpedition
    ? `📦 *PENGIRIMAN VIA EKSPEDISI (${order.selectedExpedition?.expeditionName || 'EKSPEDISI'} - ${order.selectedExpedition?.serviceName || 'REGULER'})*`
    : '🛍️ *PESANAN DIAMBIL SENDIRI DI TOKO (SELF PICKUP / CLICK & COLLECT)*';

  const orderTimeStr = order.createdAt ? formatDateTime(order.createdAt) : new Date().toLocaleString('id-ID');
  const storeName = order.store?.name || 'toko-online.online';
  const storeAddress = order.store?.address || '-';
  const targetWhatsApp = getStoreOrderWhatsAppNumber(order);
  const storePhone = targetWhatsApp || order.store?.whatsapp || order.store?.phone || '-';

  const lines: string[] = [
    `🔔 *PESANAN BARU MASUK!*`,
    `🏪 *Cabang Toko:* *${storeName}*`,
    `📍 *Alamat Toko:* ${storeAddress}`,
    `📞 *WhatsApp Kasir & CS:* ${storePhone}`,
    `========================================`,
    `🧾 *No. Pesanan:* *#${order.orderNumber || '-'}*`,
    `📅 *Waktu Pesanan:* ${orderTimeStr}`,
    `📦 *Tipe Layanan:* ${typeHeader}`,
    `========================================`,
  ];

  if (isExpedition) {
    lines.push(`📦 *DATA PENGIRIMAN EKSPEDISI (LENGKAP):*`);
    lines.push(`🚚 *Jasa Ekspedisi:* ${order.selectedExpedition?.expeditionName || 'Ekspedisi'} (${order.selectedExpedition?.serviceName || 'Layanan Reguler'})`);
    if (order.selectedExpedition?.etd) {
      lines.push(`⏱️ *Estimasi Tiba:* ${order.selectedExpedition.etd}`);
    }
    const recipient = order.address?.recipientName || order.customerName || 'Pelanggan';
    const phone = order.address?.phone || order.customerPhone || '-';
    lines.push(`👤 *Nama Penerima:* ${recipient}`);
    lines.push(`📞 *No. Telp / WhatsApp:* ${phone}`);
    if (order.address?.fullAddress) {
      lines.push(`🏠 *Alamat Lengkap Tujuan:* ${order.address.fullAddress}`);
    }
    if (order.address?.city) {
      lines.push(`🏙️ *Kota / Kab / Kec:* ${order.address.city}`);
    }
    if (order.address?.postalCode) {
      lines.push(`📮 *Kode Pos:* ${order.address.postalCode}`);
    }
    if (order.address?.detailNote) {
      lines.push(`📌 *Patokan / Petunjuk:* ${order.address.detailNote}`);
    }
  } else if (isDelivery) {
    lines.push(`🚚 *DATA PENGIRIMAN KURIR:*`);
    if (order.deliverySlot) {
      lines.push(`⏱️ *Jadwal Kirim:* ${order.deliverySlot}`);
    }
    const recipient = order.address?.recipientName || order.customerName || 'Pelanggan';
    const phone = order.address?.phone || order.customerPhone || '-';
    lines.push(`👤 *Penerima:* ${recipient} (${phone})`);
    if (order.address?.fullAddress) {
      lines.push(`🏠 *Alamat Tujuan:* ${order.address.fullAddress}`);
    }
    if (order.address?.detailNote) {
      lines.push(`📌 *Patokan / Petunjuk:* ${order.address.detailNote}`);
    }
    const mapsLink =
      order.customerLocation?.mapsUrl ||
      order.address?.mapsUrl ||
      (order.address?.latitude && order.address?.longitude
        ? `https://www.google.com/maps?q=${order.address.latitude},${order.address.longitude}`
        : '');
    if (mapsLink) {
      lines.push(`🗺️ *Titik Google Maps Rumah:* ${mapsLink}`);
    }
    if (order.driver) {
      lines.push(`🛵 *Kurir Ditugaskan:* ${order.driver.name || 'Kurir'} (${order.driver.phone || order.driver.whatsapp || '-'}) [Plat: ${order.driver.vehiclePlate || '-'}]`);
    }
  } else {
    lines.push(`🛍️ *DATA PENGAMBILAN DI TOKO:*`);
    if (order.pickupTime) {
      lines.push(`⏰ *Jadwal Siap Ambil:* ${order.pickupTime}`);
    }
    lines.push(`👤 *Nama Pelanggan:* ${order.customerName || 'Pelanggan'} (${order.customerPhone || '-'})`);
    lines.push(`ℹ️ *Petunjuk:* Pelanggan akan menunjukkan barcode / nomor #${order.orderNumber} saat tiba di kasir.`);
  }

  if (order.customerNotes) {
    lines.push(`📝 *Catatan Khusus Pelanggan:* "${order.customerNotes}"`);
  }

  lines.push(`========================================`);
  lines.push(`🛒 *RINCIAN DAFTAR BARANG:*`);

  if (order.items && order.items.length > 0) {
    order.items.forEach((item, idx) => {
      const qty = item.quantity;
      const unit = item.selectedUnit || item.product?.unit || 'pcs';
      const price = item.unitPrice || item.product?.price || 0;
      const subtotal = qty * price;
      const prodName = item.product?.name || 'Produk';
      let row = `${idx + 1}. *${prodName}*\n   ↳ Qty: *${qty} ${unit}* @ ${formatRupiah(price)} = *${formatRupiah(subtotal)}*`;
      if (item.conversionDescription) {
        row += `\n   📦 _(${item.conversionDescription})_`;
      }
      if (item.notes) {
        row += `\n   📝 Catatan item: _"${item.notes}"_`;
      }
      lines.push(row);
    });
  } else {
    lines.push(`(Tidak ada item dalam daftar pesanan)`);
  }

  lines.push(`========================================`);
  lines.push(`💰 *RINGKASAN PEMBAYARAN:*`);
  lines.push(`• Subtotal Barang: ${formatRupiah(order.subtotal || 0)}`);
  if (order.deliveryFee && order.deliveryFee > 0) {
    lines.push(`• Ongkos Kirim Kurir: ${formatRupiah(order.deliveryFee)}`);
  }
  if (order.discountAmount && order.discountAmount > 0) {
    lines.push(`• Diskon Voucher: -${formatRupiah(order.discountAmount)}`);
  }
  if (order.pointsUsed && order.pointsUsed > 0) {
    lines.push(`• Potongan Poin Member: -${formatRupiah(order.pointsUsed)}`);
  }
  lines.push(`• *TOTAL DIBAYAR:* *${formatRupiah(order.total || 0)}*`);
  lines.push(`• *Metode Bayar:* ${order.paymentMethod ? String(order.paymentMethod).toUpperCase() : 'QRIS'}`);
  lines.push(`• *Status Bayar:* ${order.paymentStatus === 'paid' ? '✅ LUNAS / TERVERIFIKASI' : '⏳ MENUNGGU / BAYAR DI TEMPAT'}`);
  lines.push(`========================================`);
  lines.push(`🙏 Mohon tim *${storeName}* segera memproses & menyiapkan pesanan ini. Terima kasih! 🛒✨`);

  return lines.join('\n');
}

/**
 * Menghasilkan link WhatsApp lengkap menuju Nomor WhatsApp Kasir & CS (Modul Identitas Toko & Toko Bebas)
 */
export function getStoreWhatsAppUrl(order: Order): string {
  if (!order) return '';
  const phone = getStoreOrderWhatsAppNumber(order);
  const message = generateStoreOrderWhatsAppMessage(order);
  return getWhatsAppChatUrl(phone, message);
}

/**
 * Membuka langsung WhatsApp ke Nomor WhatsApp Kasir & CS (Modul Identitas Toko & Toko Bebas)
 * Berlaku di domain utama dan semua subdomain untuk pesanan pickup & delivery.
 */
export function openStoreOrderWhatsApp(order: Order): boolean {
  if (!order) return false;
  const phone = getStoreOrderWhatsAppNumber(order);
  const message = generateStoreOrderWhatsAppMessage(order);
  const url = getWhatsAppChatUrl(phone, message);
  if (!url) {
    console.warn('Nomor WhatsApp Kasir & CS Toko tidak valid.');
    return false;
  }
  try {
    const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!openedWindow && typeof window !== 'undefined') {
      // Jika browser memblokir popup window.open, gunakan window.location.assign fallback
      window.location.assign(url);
    }
  } catch (err) {
    console.warn('Gagal membuka WhatsApp:', err);
    try {
      window.location.assign(url);
    } catch {}
  }
  return true;
}

export function generateOrderWhatsAppMessage(params: {
  driverName: string;
  orderNumber: string;
  storeName?: string;
  destinationAddress?: string;
  customerName?: string;
  isCallRequest?: boolean;
}): string {
  const { driverName, orderNumber, storeName, destinationAddress, customerName, isCallRequest } = params;

  if (isCallRequest) {
    return `Halo Kak ${driverName} (Kurir),
Saya pemesan No. Pesanan *${orderNumber}*${customerName ? ` (${customerName})` : ''}.
Saya ingin melakukan konfirmasi/panggilan telepon terkait posisi pengiriman paket belanja dari ${storeName || 'toko-online.online'}.
Mohon respons jika sudah aman di tepi jalan. Terima kasih! 🙏`;
  }

  return `Halo Kak ${driverName} (Kurir),
Saya pemesan dengan No. Pesanan *${orderNumber}*${customerName ? ` atas nama *${customerName}*` : ''}.
${storeName ? `Outlet Asal: ${storeName}\n` : ''}${destinationAddress ? `Alamat Tujuan: ${destinationAddress}\n` : ''}
Mohon info estimasi tiba dan update posisi terkini ya. Terima kasih banyak! 🛵📦`;
}

export function getWhatsAppChatUrl(phone: string, message?: string): string {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) return '';
  if (message) {
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${cleaned}`;
}

export function openWhatsAppDirect(phone: string, message?: string): void {
  const url = getWhatsAppChatUrl(phone, message);
  if (!url) {
    alert('Nomor telepon tidak valid.');
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
