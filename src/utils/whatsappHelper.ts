/**
 * Helper utility for WhatsApp messaging & calling actions
 */

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
    return `Halo Kak ${driverName} (Kurir NusaMart),
Saya pemesan No. Pesanan *${orderNumber}*${customerName ? ` (${customerName})` : ''}.
Saya ingin melakukan konfirmasi/panggilan telepon terkait posisi pengiriman paket belanja dari ${storeName || 'KuickMart'}.
Mohon respons jika sudah aman di tepi jalan. Terima kasih! 🙏`;
  }

  return `Halo Kak ${driverName} (Kurir NusaMart),
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
    alert('Nomor telepon kurir tidak valid.');
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
