/**
 * Image helper utilities for KuickMart Express:
 * - Smart URL normalization (Google Drive, Dropbox, OneDrive, Postimg, etc.)
 * - Contextual fallback images based on product name/category
 * - File upload to compressed Base64 image
 * - Common product image presets
 */

export const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60';

export interface ImagePreset {
  label: string;
  category: string;
  url: string;
}

export const COMMON_IMAGE_PRESETS: ImagePreset[] = [
  {
    label: 'Minyak Goreng (Minyakita/Pouch)',
    category: 'sembako',
    url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=60',
  },
  {
    label: 'Beras Premium (Karung)',
    category: 'sembako',
    url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60',
  },
  {
    label: 'Gula Pasir (Bungkus)',
    category: 'sembako',
    url: 'https://images.unsplash.com/photo-1622484212850-eb596d769edc?w=500&auto=format&fit=crop&q=60',
  },
  {
    label: 'Telur Ayam Segar',
    category: 'sembako',
    url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&auto=format&fit=crop&q=60',
  },
  {
    label: 'Mie Instan',
    category: 'makanan-ringan',
    url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=60',
  },
  {
    label: 'Susu UHT / Kemasan',
    category: 'susu-olahan',
    url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=60',
  },
  {
    label: 'Kopi / Minuman Teh',
    category: 'minuman',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60',
  },
  {
    label: 'Buah Segar (Apel / Pisang)',
    category: 'sayur-buah',
    url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=500&auto=format&fit=crop&q=60',
  },
  {
    label: 'Deterjen & Pembersih',
    category: 'kebersihan',
    url: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=500&auto=format&fit=crop&q=60',
  },
];

/**
 * Check if a URL is from Google Drive
 */
export function isGoogleDriveUrl(url?: string): boolean {
  if (!url) return false;
  return /drive\.google\.com|docs\.google\.com/i.test(url);
}

/**
 * Extract Google Drive file ID if present
 */
export function getGoogleDriveFileId(url?: string): string | null {
  if (!url) return null;
  const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
                      url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  return fileIdMatch ? fileIdMatch[1] : null;
}

/**
 * Format any image URL (including Google Drive, Dropbox, etc.) into an embeddable image URL.
 */
export function formatImageUrl(url?: string): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return DEFAULT_PRODUCT_IMAGE;
  }

  const cleanUrl = url.trim();

  // Data URLs (Base64 uploads)
  if (cleanUrl.startsWith('data:image/')) {
    return cleanUrl;
  }

  // Google Drive URLs
  const driveId = getGoogleDriveFileId(cleanUrl);
  if (driveId) {
    // Google Drive direct thumbnail endpoint - high compatibility
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
  }

  // Dropbox URLs
  if (/dropbox\.com/i.test(cleanUrl)) {
    if (cleanUrl.includes('dl=0')) {
      return cleanUrl.replace('dl=0', 'raw=1');
    }
    if (!cleanUrl.includes('raw=1')) {
      return cleanUrl + (cleanUrl.includes('?') ? '&raw=1' : '?raw=1');
    }
    return cleanUrl;
  }

  return cleanUrl;
}

/**
 * Get a high quality contextual fallback image based on product name or category
 */
export function getProductFallbackImage(name?: string, category?: string): string {
  const q = `${name || ''} ${category || ''}`.toLowerCase();

  if (q.includes('minyak') || q.includes('bimoli') || q.includes('filma') || q.includes('sunco') || q.includes('sania')) {
    return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=60';
  }
  if (q.includes('beras') || q.includes('rice') || q.includes('sembako')) {
    return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60';
  }
  if (q.includes('gula') || q.includes('gulaku') || q.includes('sugar')) {
    return 'https://images.unsplash.com/photo-1622484212850-eb596d769edc?w=500&auto=format&fit=crop&q=60';
  }
  if (q.includes('telur') || q.includes('egg')) {
    return 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&auto=format&fit=crop&q=60';
  }
  if (q.includes('mie') || q.includes('indomie') || q.includes('sedap') || q.includes('noodle')) {
    return 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=60';
  }
  if (q.includes('susu') || q.includes('milk') || q.includes('dairy') || q.includes('keju')) {
    return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=60';
  }
  if (q.includes('kopi') || q.includes('coffee') || q.includes('teh') || q.includes('tea') || q.includes('minum')) {
    return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60';
  }
  if (q.includes('buah') || q.includes('sayur') || q.includes('apel') || q.includes('pisang')) {
    return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=500&auto=format&fit=crop&q=60';
  }
  if (q.includes('sabun') || q.includes('deterjen') || q.includes('sampo') || q.includes('bersih')) {
    return 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=500&auto=format&fit=crop&q=60';
  }

  return DEFAULT_PRODUCT_IMAGE;
}

/**
 * Compress an uploaded image file into a lightweight base64 JPEG
 */
export function compressImageFile(file: File, maxDim = 600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error('Gagal memproses file gambar'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.readAsDataURL(file);
  });
}
