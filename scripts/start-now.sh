#!/usr/bin/env bash
# ==============================================================================
# SCRIPT PENYELAMAT & UPDATE PWA: NYALAKAN SERVER LAPAKOKE.COM
# Menjalankan build terbaru, aset PWA (192x192, 512x512 PNG), & PM2
# ==============================================================================

cd /var/www/kuickmart || exit 1

echo "🚀 Mempersiapkan LapakOke & Update PWA Assets..."

# 1. Pastikan dependencies sharp dan web-push terinstall
if [ ! -d "node_modules/sharp" ]; then
  echo "📦 Menginstall modul sharp..."
  npm install sharp --save
fi

# 2. Hasilkan aset PWA lengkap (192x192, 512x512, maskable, screenshot)
if [ -f "scripts/generate-pwa-assets.js" ]; then
  echo "🎨 Menghasilkan icon PWA & Screenshot Store..."
  node scripts/generate-pwa-assets.js
fi

# 3. Compile server binary terbaru
echo "🔨 Membangun server binary (esbuild)..."
npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs

# 4. Pastikan file frontend dist ada
if [ ! -f "dist/index.html" ]; then
  echo "🔨 Membangun frontend (Vite build)..."
  npx vite build
fi

# 5. Hentikan sisa proses lama jika ada, lalu nyalakan PM2
echo "🔄 Menjalankan proses di Port 3000..."
pm2 delete kuickmart 2>/dev/null || true

if [ -f "ecosystem.config.cjs" ]; then
  NODE_ENV=production pm2 start ecosystem.config.cjs
else
  NODE_ENV=production pm2 start dist/server.cjs --name kuickmart
fi

pm2 save

# 6. Verifikasi apakah port 3000 sudah merespon
echo ""
echo "🧪 Mengecek respon port 3000..."
sleep 2

STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 || echo "000")

if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
  echo ""
  echo "=========================================================="
  echo "✅ SUKSES BESAR! Server LapakOke sudah aktif normal (HTTP $STATUS)!"
  echo "🌐 Domain Utama: https://lapakoke.com"
  echo "🌐 Subdomain Toko: https://tokoalda.lapakoke.com"
  echo "📱 PWA Builder siap digunakan untuk Download / Package For Stores!"
  echo "=========================================================="
else
  echo ""
  echo "⚠️ Status respon HTTP: $STATUS. Menampilkan log PM2 terakhir:"
  pm2 logs kuickmart --lines 15 --nostream
fi

pm2 status
