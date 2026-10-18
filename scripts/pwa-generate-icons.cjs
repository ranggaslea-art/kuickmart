/**
 * Pure Node.js PWA Assets & Manifest Generator (Zero NPM Dependencies)
 * Generates true PNG icons (192x192, 512x512, maskable) & screenshots using Node's built-in zlib.
 * Does NOT require sharp or any external packages.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

// Determine directories to update
const dirsToUpdate = [
  path.join(process.cwd(), 'public'),
  path.join(process.cwd(), 'dist'),
  '/var/www/kuickmart/public',
  '/var/www/kuickmart/dist'
].filter((d, idx, arr) => arr.indexOf(d) === idx && (fs.existsSync(d) || d.includes('public') || d.includes('dist')));

// Ensure directories exist
for (const dir of dirsToUpdate) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (_) {}
}

// CRC32 implementation
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, t, data, crc]);
}

function createPng(width, height, drawFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rowLen = width * 4 + 1;
  const raw = Buffer.alloc(rowLen * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    raw[rowOffset] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const p = rowOffset + 1 + x * 4;
      const pixel = drawFn(x, y, width, height);
      raw[p] = pixel[0];
      raw[p + 1] = pixel[1];
      raw[p + 2] = pixel[2];
      raw[p + 3] = pixel[3];
    }
  }

  const idatChunk = makeChunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// 1. Icon Drawer: Toko Alda Emblem (Red gradient, rounded shield, white letter 'A')
function drawTokoAldaIcon(isMaskable) {
  return function(x, y, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const padding = isMaskable ? 0.38 : 0.46;
    const dx = Math.abs(x - cx) / (w * padding);
    const dy = Math.abs(y - cy) / (h * padding);
    const dist = Math.pow(dx, 4) + Math.pow(dy, 4);

    if (dist <= 1.0) {
      // White inner ring border
      const ringDist = Math.abs(dist - 0.88);
      if (ringDist < 0.05) {
        return [255, 255, 255, 230];
      }

      // Draw Letter 'A' (bold white)
      const scale = w / 512;
      const nx = (x - cx) / scale;
      const ny = (y - cy) / scale; // roughly -250 to +250

      // Letter 'A' coordinates (apex at ny = -90, bottom legs at ny = +75, legs at +/- 65)
      let isLetter = false;
      if (ny >= -90 && ny <= 75) {
        const t = (ny - (-90)) / 165; // 0 to 1
        const legX = 65 * t;
        // Check left leg or right leg
        if (Math.abs(Math.abs(nx) - legX) <= 15) {
          isLetter = true;
        }
        // Crossbar
        if (ny >= 5 && ny <= 30 && Math.abs(nx) <= 45) {
          isLetter = true;
        }
      }
      // Top tip cap of 'A'
      if (ny >= -95 && ny <= -85 && Math.abs(nx) <= 15) {
        isLetter = true;
      }
      // Underline bar for 'ALDA'
      if (ny >= 105 && ny <= 125 && Math.abs(nx) <= 80) {
        isLetter = true;
      }

      if (isLetter) {
        return [255, 255, 255, 255];
      }

      // Red brand gradient
      const grad = 0.82 + 0.28 * (1 - y / h);
      return [
        Math.min(255, Math.round(229 * grad)),
        Math.min(255, Math.round(26 * grad)),
        Math.min(255, Math.round(36 * grad)),
        255
      ];
    }

    if (isMaskable) {
      return [229, 26, 36, 255]; // Maskable fills corners with brand red
    }
    return [0, 0, 0, 0];
  };
}

// 2. Screenshot Drawer (Clean mockup with brand header)
function drawScreenshot(isNarrow) {
  return function(x, y, w, h) {
    // Header bar (Red brand #E51A24)
    if (y < h * 0.12) {
      return [229, 26, 36, 255];
    }
    // Search bar mockup
    if (y > h * 0.14 && y < h * 0.19 && x > w * 0.08 && x < w * 0.92) {
      return [241, 245, 249, 255];
    }
    // Banner carousel mockup (Toko Alda Promo)
    if (y > h * 0.21 && y < h * 0.38 && x > w * 0.05 && x < w * 0.95) {
      const grad = 0.9 + 0.1 * (x / w);
      return [Math.round(229 * grad), 40, 50, 255];
    }
    // Product grid lines
    if (y > h * 0.42) {
      const colWidth = w / (isNarrow ? 2 : 4);
      const rowHeight = h * 0.18;
      const relX = (x % colWidth) / colWidth;
      const relY = ((y - h * 0.42) % rowHeight) / rowHeight;
      if (relX > 0.05 && relX < 0.95 && relY > 0.05 && relY < 0.95) {
        return [255, 255, 255, 255]; // product card
      }
      return [248, 250, 252, 255]; // background
    }
    return [248, 250, 252, 255];
  };
}

console.log('Generating True PNG Icons & Screenshots for Toko Alda...');

const pwa192 = createPng(192, 192, drawTokoAldaIcon(false));
const pwa512 = createPng(512, 512, drawTokoAldaIcon(false));
const maskable512 = createPng(512, 512, drawTokoAldaIcon(true));
const screenMobile = createPng(1080, 1920, drawScreenshot(true));
const screenDesktop = createPng(1920, 1080, drawScreenshot(false));

const manifest = {
  id: '/?store=tokoalda',
  name: 'Toko Alda - LapakOke',
  short_name: 'Toko Alda',
  description: 'Aplikasi belanja sembako dan kebutuhan harian Toko Alda lapakoke.com hemat dan cepat',
  start_url: '/?store=tokoalda',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait-primary',
  background_color: '#ffffff',
  theme_color: '#E51A24',
  lang: 'id',
  dir: 'ltr',
  categories: ['shopping', 'business', 'lifestyle'],
  prefer_related_applications: false,
  icons: [
    {
      src: '/pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/pwa-maskable-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable'
    }
  ],
  screenshots: [
    {
      src: '/screenshot-mobile.png',
      sizes: '1080x1920',
      type: 'image/png',
      form_factor: 'narrow',
      label: 'Tampilan Aplikasi Mobile Toko Alda'
    },
    {
      src: '/screenshot-desktop.png',
      sizes: '1920x1080',
      type: 'image/png',
      form_factor: 'wide',
      label: 'Tampilan Belanja Desktop Toko Alda'
    }
  ],
  shortcuts: [
    {
      name: 'Katalog Promo',
      short_name: 'Promo',
      description: 'Promo sembako Toko Alda',
      url: '/?store=tokoalda&tab=promo',
      icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
    },
    {
      name: 'Keranjang Belanja',
      short_name: 'Keranjang',
      description: 'Keranjang pesanan',
      url: '/?store=tokoalda&open_cart=true',
      icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
    }
  ]
};

const manifestJson = JSON.stringify(manifest, null, 2);

// Write to all target folders
for (const targetDir of dirsToUpdate) {
  try {
    fs.writeFileSync(path.join(targetDir, 'pwa-192x192.png'), pwa192);
    fs.writeFileSync(path.join(targetDir, 'pwa-512x512.png'), pwa512);
    fs.writeFileSync(path.join(targetDir, 'pwa-maskable-512x512.png'), maskable512);
    fs.writeFileSync(path.join(targetDir, 'apple-touch-icon.png'), pwa192);
    fs.writeFileSync(path.join(targetDir, 'favicon.png'), createPng(64, 64, drawTokoAldaIcon(false)));
    fs.writeFileSync(path.join(targetDir, 'screenshot-mobile.png'), screenMobile);
    fs.writeFileSync(path.join(targetDir, 'screenshot-desktop.png'), screenDesktop);
    fs.writeFileSync(path.join(targetDir, 'manifest.json'), manifestJson, 'utf8');
    fs.writeFileSync(path.join(targetDir, 'manifest.webmanifest'), manifestJson, 'utf8');
    console.log(`✔ Synced PWA assets to: ${targetDir}`);
  } catch (err) {
    console.warn(`Could not write to ${targetDir}:`, err.message);
  }
}

console.log('\nAll PWA Assets Ready for PWABuilder!');
