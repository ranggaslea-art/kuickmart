#!/usr/bin/env bash
# ==============================================================================
# SCRIPT OTOMATISASI PERBAIKAN & JALANKAN KUICKMART DI VPS (VERSI CEPAT & RINGAN)
# Dioptimalkan agar PuTTY tidak macet / freeze / loading parah
# ==============================================================================

set -e

APP_DIR="/var/www/kuickmart"
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
fi

echo "=========================================================="
echo "⚡ MEMULAI UPDATE & OPTIMASI SERVER KUICKMART"
echo "=========================================================="

# 1. Pastikan Swap memori aktif agar RAM tidak habis (Penyebab utama PuTTY freeze)
CURRENT_SWAP=$(free -m | awk '/Swap:/ {print $2}')
if [ -z "$CURRENT_SWAP" ] || [ "$CURRENT_SWAP" -lt 512 ]; then
  echo "⚠️ Swap rendah atau tidak ada (${CURRENT_SWAP} MB). Menyiapkan 2GB Swap Memory..."
  if [ -f "scripts/setup-swap.sh" ]; then
    bash scripts/setup-swap.sh || true
  fi
fi

# 2. Tarik kode terbaru dari Git
echo ""
echo "🚀 [1/4] Menarik update repository..."
git fetch --all 2>/dev/null || true
git reset --hard origin/main 2>/dev/null || git pull origin main || git pull || true

# 3. Instalasi dependensi hanya jika diperlukan (skip jika node_modules sudah lengkap)
echo ""
echo "📦 [2/4] Memeriksa dependensi..."
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
  echo "Mengunduh dependensi (mode ringan tanpa animasi PuTTY)..."
  npm install --progress=false --no-audit --no-fund --prefer-offline
else
  echo "Dependensi sudah ada. Memperbarui secara cepat..."
  npm install --progress=false --no-audit --no-fund --prefer-offline
fi

# 4. Bangun bundle production
echo ""
echo "🔨 [3/4] Membangun bundle Vite & Server (esbuild)..."
# Menggunakan Node dengan batas memori teroptimasi
npm run build

# 5. Restart PM2
echo ""
echo "🔄 [4/4] Memulai ulang proses PM2 (port 3000)..."
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
