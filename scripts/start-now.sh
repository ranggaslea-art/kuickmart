#!/usr/bin/env bash
# ==============================================================================
# SCRIPT PENYELAMAT: NYALAKAN SERVER KUICKMART DALAM 5 DETIK
# Menghilangkan 502 Bad Gateway secara instan tanpa proses install ulang
# ==============================================================================

cd /var/www/kuickmart || exit 1

echo "🚀 Menyalakan Kuickmart & Menghilangkan 502 Bad Gateway..."

# 1. Pastikan server bundle sudah ada (hanya butuh 0.1 detik)
if [ ! -f "dist/server.cjs" ]; then
  echo "🔨 Mempersiapkan server binary (0.1 detik)..."
  npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs
fi

# 2. Pastikan file frontend dist ada
if [ ! -f "dist/index.html" ]; then
  echo "🔨 Membangun frontend (Vite build)..."
  npx vite build
fi

# 3. Hentikan sisa proses lama jika ada, lalu nyalakan PM2
echo "🔄 Menjalankan proses di Port 3000..."
pm2 delete kuickmart 2>/dev/null || true

if [ -f "ecosystem.config.cjs" ]; then
  NODE_ENV=production pm2 start ecosystem.config.cjs
else
  NODE_ENV=production pm2 start dist/server.cjs --name kuickmart
fi

pm2 save

# 4. Verifikasi apakah port 3000 sudah merespon
echo ""
echo "🧪 Mengecek respon port 3000..."
sleep 2

STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 || echo "000")

if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
  echo ""
  echo "=========================================================="
  echo "✅ SUKSES BESAR! Server sudah aktif normal (HTTP $STATUS)!"
  echo "🌐 Silakan REFRESH browser: https://toko-online.online"
  echo "=========================================================="
else
  echo ""
  echo "⚠️ Status respon HTTP: $STATUS. Menampilkan log PM2 terakhir:"
  pm2 logs kuickmart --lines 15 --nostream
fi

pm2 status
