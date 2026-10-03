#!/usr/bin/env bash
# ==============================================================================
# SCRIPT OTOMATISASI PERBAIKAN & JALANKAN KUICKMART DI VPS
# Menghidupkan Port 3000 & Menghilangkan 502 Bad Gateway
# ==============================================================================

set -e

echo "🚀 [1/5] Masuk ke direktori web & menarik update..."
cd /var/www/kuickmart || exit 1
git fetch --all 2>/dev/null || true
git reset --hard origin/main 2>/dev/null || git pull origin main || git pull || true

echo "📦 [2/5] Memeriksa paket dependensi..."
npm install --prefer-offline --no-audit

echo "🔨 [3/5] Membangun bundle production (Vite + esbuild)..."
npm run build

echo "🔄 [4/5] Memulai ulang proses PM2 (kuickmart pada port 3000)..."
pm2 delete kuickmart 2>/dev/null || true
if [ -f "ecosystem.config.cjs" ]; then
  pm2 start ecosystem.config.cjs
else
  pm2 start dist/server.cjs --name kuickmart
fi
pm2 save

echo "🧪 [5/5] Menguji respon lokal server port 3000..."
sleep 2
if curl -sI http://127.0.0.1:3000 | grep -E "HTTP/|200|301|302|404"; then
  echo ""
  echo "=========================================================="
  echo "✅ SUKSES! Kuickmart sudah AKTIF di port 3000."
  echo "🌐 Silakan buka kembali https://toko-online.online"
  echo "=========================================================="
else
  echo ""
  echo "⚠️ Server belum merespon di port 3000. Memeriksa log error PM2:"
  pm2 logs kuickmart --lines 20 --nostream --err
fi

pm2 status
