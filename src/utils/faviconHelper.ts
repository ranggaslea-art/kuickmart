/**
 * Favicon & Address Bar Logo Helper
 * Mengatur logo yang muncul di address bar / tab browser secara dinamis
 * sesuai dengan pengaturan di modul "Header & Identitas Toko" dan "Identitas Toko & Toko Bebas".
 */

export interface FaviconSyncOptions {
  imageUrl?: string | null;
  text?: string | null;
  storeName?: string | null;
  primaryColor?: string | null;
  gradient?: string | null;
}

/**
 * Hasilkan SVG data URI untuk icon address bar jika belum ada gambar yang diunggah
 */
export function generateDynamicFaviconSvg(
  badgeText: string,
  primaryColor = '#E51A24'
): string {
  const cleanText = (badgeText || 'KM').trim().slice(0, 3).toUpperCase();
  const fontSize = cleanText.length > 2 ? '22' : '26';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <defs>
      <linearGradient id="favGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${primaryColor}" />
        <stop offset="100%" stop-color="#831843" />
      </linearGradient>
      <filter id="favShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3" />
      </filter>
    </defs>
    <rect width="64" height="64" rx="16" fill="url(#favGradient)" filter="url(#favShadow)" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="${fontSize}" letter-spacing="-0.5px">${cleanText}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Perbarui ikon favicon di address bar / tab browser
 */
export function updateAddressBarFavicon(options: FaviconSyncOptions): string {
  if (typeof document === 'undefined') return '';

  const { imageUrl, text, storeName, primaryColor } = options;

  let targetFavicon = '';

  // 1. Prioritaskan gambar logo resmi jika ada
  if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0) {
    targetFavicon = imageUrl.trim();
  } else {
    // 2. Generate SVG favicon dinamis dengan inisial dan warna toko
    const effectiveText = (text || (storeName ? storeName.slice(0, 2) : 'KM')).toUpperCase();
    const effectiveColor = primaryColor || '#E51A24';
    targetFavicon = generateDynamicFaviconSvg(effectiveText, effectiveColor);
  }

  // 3. Pasang ke semua tag link rel icon yang relevan di document.head
  const relTypes = ['icon', 'shortcut icon', 'apple-touch-icon'];
  relTypes.forEach((rel) => {
    let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.href = targetFavicon;
    if (targetFavicon.startsWith('data:image/svg+xml')) {
      link.type = 'image/svg+xml';
    } else if (targetFavicon.startsWith('data:image/png') || targetFavicon.endsWith('.png')) {
      link.type = 'image/png';
    } else if (targetFavicon.startsWith('data:image/jpeg') || targetFavicon.endsWith('.jpg') || targetFavicon.endsWith('.jpeg')) {
      link.type = 'image/jpeg';
    }
  });

  // 4. Simpan ke localStorage agar sebelum React hydrate, script index.html bisa langsung memasangnya
  try {
    localStorage.setItem('app_active_favicon_href', targetFavicon);
  } catch {}

  return targetFavicon;
}
