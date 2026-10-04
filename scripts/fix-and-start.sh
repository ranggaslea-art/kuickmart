#!/usr/bin/env bash
# ==============================================================================
# SCRIPT OTOMATISASI PERBAIKAN & JALANKAN KUICKMART DI VPS (VERSI CEPAT & RINGAN)
# Dioptimalkan agar PuTTY TIDAK PERNAH MACET / FREEZE / LOADING PARAH
# ==============================================================================

set -e

APP_DIR="/var/www/kuickmart"
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
fi

echo "=========================================================="
echo "⚡ MEMULAI UPDATE & OPTIMASI SERVER KUICKMART"
echo "=========================================================="

# 1. Pastikan Swap memori aktif (Pencegah utama PuTTY freeze & OOM)
CURRENT_SWAP=$(free -m | awk '/Swap:/ {print $2}' 2>/dev/null || echo "0")
if [ -z "$CURRENT_SWAP" ] || [ "$CURRENT_SWAP" -lt 512 ]; then
  echo "⚠️ Swap rendah atau tidak ada (${CURRENT_SWAP} MB). Menyiapkan Swap..."
  if [ -f "scripts/setup-swap.sh" ]; then
    bash scripts/setup-swap.sh || true
  fi
fi

# 2. Tarik kode terbaru dari Git
echo ""
echo "🚀 [1/3] Menarik update repository terbaru..."
git fetch --all 2>/dev/null || true
git reset --hard origin/main 2>/dev/null || git pull origin main || git pull || true

# 3. Cek dependensi: JIKA SUDAH ADA, JANGAN INSTALL ULANG (Bikin lama/stuck di PuTTY)
echo ""
echo "📦 [2/3] Memeriksa paket dependensi..."
if [ -d "node_modules/express" ] && [ -d "node_modules/vite" ]; then
  echo "✅ Paket node_modules sudah lengkap! Melewati npm install (Instan)."
else
  echo "📦 Paket belum lengkap, memasang dependensi (mode cepat & hening)..."
  npm install --progress=false --no-audit --no-fund --prefer-offline --loglevel=error
fi

# 4. Bangun bundle production
echo ""
echo "🔨 [3/3] Membangun bundle Vite & Server..."
npm run build

# 5. Restart PM2
echo ""
echo "🔄 Memulai ulang proses PM2 (port 3000)..."
pm2 delete kuickmart 2>/dev/null || true
if [ -f "ecosystem.config.cjs" ]; then
  pm2 start ecosystem.config.cjs
else
  pm2 start dist/server.cjs --name kuickmart
fi
pm2 save

echo ""
echo "🧪 Menguji respon port 3000..."
sleep 2
if curl -sI http://127.0.0.1:3000 | grep -E "HTTP/|200|301|302|404"; then
  echo ""
  echo "=========================================================="
  echo "✅ SUKSES! Kuickmart sudah AKTIF di port 3000."
  echo "🌐 Silakan buka kembali https://toko-online.online"
  echo "=========================================================="
else
  echo ""
  echo "⚠️ Menunggu respon server..."
  sleep 2
  curl -sI http://127.0.0.1:3000 | head -n 5 || true
fi

pm2 status
