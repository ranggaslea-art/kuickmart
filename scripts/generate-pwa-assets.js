import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generatePwaAssets() {
  const publicDir = path.join(process.cwd(), 'public');
  const svgLogoPath = path.join(publicDir, 'lapakoke-logo-3d.svg');

  if (!fs.existsSync(svgLogoPath)) {
    console.error('lapakoke-logo-3d.svg not found in public!');
    return;
  }

  const svgBuffer = fs.readFileSync(svgLogoPath);

  console.log('Generating PWA Icons with sharp...');

  // 1. pwa-192x192.png (Exact 192x192 PNG)
  await sharp(svgBuffer)
    .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Generated pwa-192x192.png (192x192)');

  // 2. pwa-512x512.png (Exact 512x512 PNG)
  await sharp(svgBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Generated pwa-512x512.png (512x512)');

  // 3. pwa-maskable-512x512.png (512x512 with 15% safe padding and crisp white/gradient background)
  // Inner logo size: 400x400 centered inside 512x512 with #ffffff background
  const innerLogo = await sharp(svgBuffer)
    .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
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
  console.log('Generated pwa-maskable-512x512.png (512x512 maskable with safe margin)');

  // 4. apple-touch-icon.png (Exact 180x180 for iOS Safari)
  const iosInner = await sharp(svgBuffer)
    .resize(150, 150, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: iosInner, gravity: 'center' }])
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png (180x180)');

  // 5. favicon.png (64x64)
  await sharp(svgBuffer)
    .resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Generated favicon.png (64x64)');

  // 6. logo.png (512x512)
  await sharp(svgBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'logo.png'));
  console.log('Generated logo.png (512x512)');

  // 7. screenshots for PWABuilder App Store Showcase
  // Narrow / Mobile: 1080x1920
  const mobileSvg = `
  <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="40%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#bg)" />
    <!-- Top Bar -->
    <rect x="0" y="0" width="1080" height="140" fill="#dc2626" />
    <text x="60" y="90" font-family="sans-serif" font-weight="900" font-size="44" fill="#ffffff">LapakOke</text>
    <text x="280" y="90" font-family="sans-serif" font-size="32" fill="#fed7aa">• Belanja Sembako Cepat &amp; Hemat</text>

    <!-- Hero Card -->
    <rect x="60" y="200" width="960" height="420" rx="40" fill="#ffffff" />
    <text x="120" y="320" font-family="sans-serif" font-weight="900" font-size="52" fill="#0f172a">Minimarket Digital Terlengkap</text>
    <text x="120" y="380" font-family="sans-serif" font-size="34" fill="#64748b">Pesan sembako, beras, minyak &amp; bumbu dapur</text>
    <rect x="120" y="440" width="340" height="100" rx="24" fill="#dc2626" />
    <text x="180" y="505" font-family="sans-serif" font-weight="bold" font-size="36" fill="#ffffff">Belanja Sekarang</text>

    <!-- Product Grid Demo -->
    <rect x="60" y="670" width="455" height="560" rx="32" fill="#ffffff" />
    <rect x="90" y="700" width="395" height="340" rx="24" fill="#f1f5f9" />
    <text x="100" y="1090" font-family="sans-serif" font-weight="bold" font-size="36" fill="#0f172a">Minyak Goreng 2L</text>
    <text x="100" y="1150" font-family="sans-serif" font-weight="900" font-size="40" fill="#dc2626">Rp 34.500</text>

    <rect x="565" y="670" width="455" height="560" rx="32" fill="#ffffff" />
    <rect x="595" y="700" width="395" height="340" rx="24" fill="#f1f5f9" />
    <text x="605" y="1090" font-family="sans-serif" font-weight="bold" font-size="36" fill="#0f172a">Beras Premium 5kg</text>
    <text x="605" y="1150" font-family="sans-serif" font-weight="900" font-size="40" fill="#dc2626">Rp 74.000</text>

    <!-- Subdomain Multi-Store Feature Highlight -->
    <rect x="60" y="1280" width="960" height="480" rx="36" fill="#1e1b4b" stroke="#4338ca" stroke-width="4" />
    <text x="120" y="1370" font-family="sans-serif" font-weight="900" font-size="46" fill="#ffffff">Multi-Store &amp; Subdomain Resmi</text>
    <text x="120" y="1440" font-family="sans-serif" font-size="34" fill="#a5b4fc">Dukungan outlet cabang: tokoalda.lapakoke.com</text>
    <text x="120" y="1500" font-family="sans-serif" font-size="32" fill="#cbd5e1">✓ Kasir POS Cloud &amp; Stok Real-time</text>
    <text x="120" y="1550" font-family="sans-serif" font-size="32" fill="#cbd5e1">✓ Pembayaran QRIS &amp; Virtual Account DOKU</text>
    <text x="120" y="1600" font-family="sans-serif" font-size="32" fill="#cbd5e1">✓ Kurir Pengiriman Cepat Antar Langsung</text>
  </svg>
  `;

  await sharp(Buffer.from(mobileSvg))
    .png({ quality: 90 })
    .toFile(path.join(publicDir, 'screenshot-mobile.png'));
  console.log('Generated screenshot-mobile.png (1080x1920)');

  // Wide / Desktop: 1920x1080
  const desktopSvg = `
  <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgDesk" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="50%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="#0369a1" />
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#bgDesk)" />

    <!-- Navigation Header -->
    <rect x="0" y="0" width="1920" height="90" fill="#ffffff" />
    <text x="80" y="58" font-family="sans-serif" font-weight="900" font-size="36" fill="#dc2626">LapakOke</text>
    <text x="260" y="56" font-family="sans-serif" font-size="20" fill="#64748b">lapakoke.com • Minimarket Online Multi-Cabang</text>
    <rect x="1450" y="22" width="380" height="46" rx="14" fill="#f1f5f9" />
    <text x="1480" y="52" font-family="sans-serif" font-size="18" fill="#64748b">🔍 Cari kebutuhan harian...</text>

    <!-- Main Content Area -->
    <rect x="80" y="140" width="1760" height="380" rx="28" fill="#ffffff" />
    <text x="150" y="240" font-family="sans-serif" font-weight="900" font-size="52" fill="#0f172a">Platform E-Commerce Minimarket &amp; POS Terpadu</text>
    <text x="150" y="300" font-family="sans-serif" font-size="26" fill="#475569">Belanja sembako hemat, pembayaran digital otomatis QRIS &amp; VA DOKU, pengiriman kilat ke rumah.</text>
    <rect x="150" y="360" width="280" height="70" rx="16" fill="#dc2626" />
    <text x="200" y="405" font-family="sans-serif" font-weight="bold" font-size="24" fill="#ffffff">Mulai Belanja 🛍️</text>

    <!-- Bottom Showcase Columns -->
    <rect x="80" y="560" width="560" height="440" rx="24" fill="#ffffff" />
    <text x="120" y="630" font-family="sans-serif" font-weight="bold" font-size="28" fill="#0f172a">Multi-Subdomain Cabang</text>
    <text x="120" y="680" font-family="sans-serif" font-size="20" fill="#64748b">Setiap cabang memiliki subdomain unik:</text>
    <rect x="120" y="710" width="480" height="50" rx="12" fill="#e0f2fe" />
    <text x="140" y="742" font-family="monospace" font-weight="bold" font-size="18" fill="#0369a1">https://tokoalda.lapakoke.com</text>
    <text x="120" y="800" font-family="sans-serif" font-size="18" fill="#334155">✓ Pengaturan katalog produk per toko</text>
    <text x="120" y="840" font-family="sans-serif" font-size="18" fill="#334155">✓ Manajemen kasir POS shift terpisah</text>
    <text x="120" y="880" font-family="sans-serif" font-size="18" fill="#334155">✓ WhatsApp CS otomatis ke kasir cabang</text>

    <rect x="680" y="560" width="560" height="440" rx="24" fill="#ffffff" />
    <text x="720" y="630" font-family="sans-serif" font-weight="bold" font-size="28" fill="#0f172a">Payment Gateway DOKU</text>
    <text x="720" y="680" font-family="sans-serif" font-size="20" fill="#64748b">Integrasi pembayaran aman &amp; otomatis:</text>
    <text x="720" y="740" font-family="sans-serif" font-size="18" fill="#334155">✓ QRIS Real-time Auto-Check</text>
    <text x="720" y="780" font-family="sans-serif" font-size="18" fill="#334155">✓ Virtual Account BCA, Mandiri, BRI, BNI</text>
    <text x="720" y="820" font-family="sans-serif" font-size="18" fill="#334155">✓ Notifikasi Webhook otomatis</text>
    <text x="720" y="860" font-family="sans-serif" font-size="18" fill="#334155">✓ Rekonsiliasi &amp; struk pembayaran</text>

    <rect x="1280" y="560" width="560" height="440" rx="24" fill="#ffffff" />
    <text x="1320" y="630" font-family="sans-serif" font-weight="bold" font-size="28" fill="#0f172a">PWA &amp; Mobile Ready</text>
    <text x="1320" y="680" font-family="sans-serif" font-size="20" fill="#64748b">Instalasi aplikasi ringan tanpa store:</text>
    <text x="1320" y="740" font-family="sans-serif" font-size="18" fill="#334155">✓ Bisa diinstal di Android &amp; iOS</text>
    <text x="1320" y="780" font-family="sans-serif" font-size="18" fill="#334155">✓ Akses offline &amp; cache cerdas</text>
    <text x="1320" y="820" font-family="sans-serif" font-size="18" fill="#334155">✓ Push Notifikasi promo gajian</text>
    <text x="1320" y="860" font-family="sans-serif" font-size="18" fill="#334155">✓ Siap dipaketkan ke Google Play Store</text>
  </svg>
  `;

  await sharp(Buffer.from(desktopSvg))
    .png({ quality: 90 })
    .toFile(path.join(publicDir, 'screenshot-desktop.png'));
  console.log('Generated screenshot-desktop.png (1920x1080)');

  console.log('All PWA assets generated successfully!');
}

generatePwaAssets().catch(err => {
  console.error('Failed generating PWA assets:', err);
  process.exit(1);
});
