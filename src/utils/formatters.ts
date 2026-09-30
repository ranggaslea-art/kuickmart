export function formatRupiah(amount?: number | null): string {
  const safe = typeof amount === 'number' && !isNaN(amount) && isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
}

export function formatNumber(num?: number | null): string {
  const safe = typeof num === 'number' && !isNaN(num) && isFinite(num) ? num : 0;
  return new Intl.NumberFormat('id-ID').format(safe);
}

export function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `NM-${dateStr}-${randomStr}`;
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}
