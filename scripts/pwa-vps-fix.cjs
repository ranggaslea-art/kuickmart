/**
 * pwa-vps-fix.cjs
 * Script mandiri untuk langsung memperbaiki PWA Builder & Ikon Toko Alda di VPS
 */

const fs = require('fs');
const path = require('path');

async function fixPwa() {
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'public');

  console.log('🔧 [1/5] Memperbarui manifest.json di', publicDir);

  const manifestContent = {
    "id": "/?store=tokoalda",
    "name": "Toko Alda - LapakOke",
    "short_name": "Toko Alda",
    "description": "Aplikasi belanja minimarket online & kasir pintar Toko Alda lapakoke.com dengan pengiriman cepat dan hemat.",
    "start_url": "/?store=tokoalda",
    "scope": "/",
    "display": "standalone",
    "orientation": "portrait-primary",
    "background_color": "#ffffff",
    "theme_color": "#E51A24",
    "lang": "id",
    "dir": "ltr",
    "categories": ["shopping", "business", "lifestyle"],
    "prefer_related_applications": false,
    "icons": [
      {
        "src": "/pwa-192x192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "any"
      },
      {
        "src": "/pwa-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any"
      },
      {
        "src": "/pwa-maskable-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "maskable"
      }
    ],
    "screenshots": [
      {
        "src": "/screenshot-mobile.png",
        "sizes": "1080x1920",
        "type": "image/png",
        "form_factor": "narrow",
        "label": "Tampilan Aplikasi Mobile Toko Alda"
      },
      {
        "src": "/screenshot-desktop.png",
        "sizes": "1920x1080",
        "type": "image/png",
        "form_factor": "wide",
        "label": "Tampilan Belanja Minimarket Desktop Toko Alda"
      }
    ],
    "shortcuts": [
      {
        "name": "Katalog Promo",
        "short_name": "Promo",
        "description": "Promo diskon sembako hemat di Toko Alda",
        "url": "/?store=tokoalda&tab=promo",
        "icons": [{ "src": "/pwa-192x192.png", "sizes": "192x192", "type": "image/png" }]
      },
      {
        "name": "Keranjang Belanja",
        "short_name": "Keranjang",
        "description": "Lihat keranjang pesanan Toko Alda",
        "url": "/?store=tokoalda&open_cart=true",
        "icons": [{ "src": "/pwa-192x192.png", "sizes": "192x192", "type": "image/png" }]
      }
    ]
  };

  fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifestContent, null, 2), 'utf-8');
  console.log('✅ manifest.json berhasil diperbarui!');

  // Generate PNG icons using sharp
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.log('📦 Menginstall modul sharp...');
    const { execSync } = require('child_process');
    execSync('npm install sharp --save', { stdio: 'inherit' });
    sharp = require('sharp');
  }

  console.log('🎨 [2/5] Menghasilkan Ikon Resmi Toko Alda (192x192, 512x512, Maskable)...');

  // SVG badge khusus Toko Alda dengan styling 3D Glossy merah elegan
  const tokoAldaSvg = `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="aldaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E51A24" />
        <stop offset="60%" stop-color="#B91C1C" />
        <stop offset="100%" stop-color="#831843" />
      </linearGradient>
      <linearGradient id="shine" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4" />
        <stop offset="50%" stop-color="#ffffff" stop-opacity="0" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" flood-opacity="0.35" />
      </filter>
    </defs>
    <rect x="24" y="24" width="464" height="464" rx="120" fill="url(#aldaGrad)" filter="url(#shadow)" />
    <rect x="24" y="24" width="464" height="232" rx="120" fill="url(#shine)" />
    <circle cx="256" cy="256" r="190" fill="none" stroke="#ffffff" stroke-width="6" stroke-opacity="0.25" stroke-dasharray="14 14" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="190" letter-spacing="-3px">TA</text>
    <text x="50%" y="78%" dominant-baseline="middle" text-anchor="middle" fill="#FFE4E6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="32" letter-spacing="2px">TOKO ALDA</text>
  </svg>
  `;

  const svgBuf = Buffer.from(tokoAldaSvg);

  // 192x192 PNG
  await sharp(svgBuf)
    .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 512x512 PNG
  await sharp(svgBuf)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 512x512 Maskable PNG with safe padding
  const innerLogo = await sharp(svgBuf)
    .resize(400, 400, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: innerLogo, gravity: 'center' }])
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // apple-touch-icon.png (180x180)
  await sharp(svgBuf)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // favicon.png (64x64)
  await sharp(svgBuf)
    .resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'favicon.png'));

  console.log('✅ Seluruh ikon PNG Toko Alda berhasil dibuat dengan resolusi presisi!');

  // [3/5] Ensure screenshots exist
  console.log('📸 [3/5] Memastikan screenshot mobile & desktop tersedia...');
  if (fs.existsSync(path.join(rootDir, 'scripts', 'generate-pwa-assets.js'))) {
    const { execSync } = require('child_process');
    try {
      execSync('node scripts/generate-pwa-assets.js', { stdio: 'inherit' });
    } catch (_) {}
  }

  // [4/5] Fix dist/server.cjs so /pwa-192x192.png is NEVER returned as image/jpeg
  console.log('⚡ [4/5] Memastikan rute server melayani file icon murni PNG...');
  const serverCjsPath = path.join(rootDir, 'dist', 'server.cjs');
  if (fs.existsSync(serverCjsPath)) {
    let serverCode = fs.readFileSync(serverCjsPath, 'utf-8');
    // Ganti pwa-192x192.png dari array hijacking favicon jika ada
    if (serverCode.includes("'/pwa-192x192.png'")) {
      serverCode = serverCode.replace("'/pwa-192x192.png',", "").replace(", '/pwa-192x192.png'", "").replace("'/pwa-192x192.png'", "");
      fs.writeFileSync(serverCjsPath, serverCode, 'utf-8');
      console.log('✅ dist/server.cjs diperbarui agar icon pwa selalu dilayani static PNG!');
    }
  }

  // [5/5] Restart PM2
  console.log('🔄 [5/5] Merestart service PM2 kuickmart...');
  const { execSync } = require('child_process');
  try {
    execSync('pm2 restart kuickmart || pm2 restart all', { stdio: 'inherit' });
    console.log('✅ PM2 berhasil direstart!');
  } catch (e) {
    console.warn('⚠️ Gagal restart PM2 otomatis:', e.message);
  }

  console.log('\n==========================================================');
  console.log('🎉 SUKSES! Ikon Toko Alda & PWA Builder siap diuji kembali!');
  console.log('🌐 Buka kembali PWABuilder dan klik Reload:');
  console.log('   https://www.pwabuilder.com/reportcard?site=https://tokoalda.lapakoke.com');
  console.log('==========================================================\n');
}

fixPwa().catch(err => {
  console.error('Error fixing PWA:', err);
  process.exit(1);
});
