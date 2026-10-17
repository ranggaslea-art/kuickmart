/**
 * Favicon & Address Bar Logo Helper
 * Mengatur logo yang muncul di address bar / tab browser secara dinamis
 * sesuai dengan pengaturan di modul "Header & Identitas Toko" dan "Identitas Toko & Toko Bebas".
 * Berlaku di domain utama (lapakoke.com) dan semua subdomain.
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
  const cleanText = (badgeText || 'LO').trim().slice(0, 3).toUpperCase();
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
 * Perbarui ikon favicon di address bar / tab browser secara komprehensif
 */
export function updateAddressBarFavicon(options: FaviconSyncOptions): string {
  if (typeof document === 'undefined') return '';

  const { imageUrl, text, storeName, primaryColor } = options;

  let targetFavicon = '';

  // 1. Prioritaskan gambar logo resmi jika ada
  if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0) {
    targetFavicon = imageUrl.trim();
  } else if (!text && !storeName) {
    // 2. Default resmi lapakoke.com adalah /logo.png
    targetFavicon = '/logo.png';
  } else {
    // 3. Generate SVG favicon dinamis dengan inisial dan warna toko
    const effectiveText = (text || (storeName ? storeName.slice(0, 2) : 'TO')).toUpperCase();
    if (effectiveText === 'TO' || effectiveText === 'KE') {
      targetFavicon = '/logo.png';
    } else {
      const effectiveColor = primaryColor || '#E51A24';
      targetFavicon = generateDynamicFaviconSvg(effectiveText, effectiveColor);
    }
  }

  // 4. Pasang ke SEMUA tag link icon yang ada di document.head (termasuk svg, png, apple-touch)
  const allIconLinks = document.querySelectorAll<HTMLLinkElement>(
    "link[rel*='icon'], link[rel='apple-touch-icon'], link[rel='shortcut icon']"
  );

  if (allIconLinks.length > 0) {
    allIconLinks.forEach((link) => {
      link.href = targetFavicon;
      if (targetFavicon.startsWith('data:image/svg+xml')) {
        link.type = 'image/svg+xml';
      } else if (targetFavicon.startsWith('data:image/png') || targetFavicon.endsWith('.png')) {
        link.type = 'image/png';
      } else if (targetFavicon.startsWith('data:image/jpeg') || targetFavicon.endsWith('.jpg') || targetFavicon.endsWith('.jpeg')) {
        link.type = 'image/jpeg';
      }
    });
  } else {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.id = 'app-favicon';
    link.href = targetFavicon;
    document.head.appendChild(link);
  }

  // 5. Simpan ke localStorage agar sebelum React hydrate, script index.html bisa langsung memasangnya
  try {
    localStorage.setItem('app_active_favicon_href', targetFavicon);
  } catch {}

  return targetFavicon;
}
