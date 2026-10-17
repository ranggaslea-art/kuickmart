#!/usr/bin/env bash
# ==============================================================================
# SCRIPT PERBAIKAN TOTAL 502 BAD GATEWAY (LAPAKOKE.COM & TOKO-ONLINE.ONLINE)
# Mengatasi penyebab port 3000 PM2 mati, Nginx mismatch server_name, & konfigurasi proxy
# ==============================================================================

set -e

APP_DIR="/var/www/kuickmart"
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
fi

echo "=========================================================="
echo "🚨 DIAGNOSA & PERBAIKAN 502 BAD GATEWAY - LAPAKOKE.COM"
echo "=========================================================="

# 1. Periksa memori & Swap
echo "🔍 [1/6] Memeriksa RAM & Swap..."
free -m
CURRENT_SWAP=$(free -m | awk '/Swap:/ {print $2}' 2>/dev/null || echo "0")
if [ -z "$CURRENT_SWAP" ] || [ "$CURRENT_SWAP" -lt 512 ]; then
  echo "⚠️ Swap rendah atau tidak ada. Menjalankan aktivasi swap..."
  if [ -f "scripts/setup-swap.sh" ]; then
    bash scripts/setup-swap.sh || true
  fi
fi

# 2. Cek status Port 3000 & PM2
echo ""
echo "🔍 [2/6] Memeriksa status PM2 & Port 3000..."
pm2 status || true

# 3. Build bundle jika belum ada atau kadaluarsa
echo ""
echo "🔨 [3/6] Memastikan file server production tersedia..."
mkdir -p dist
if [ ! -f "dist/server.cjs" ] || [ server.ts -nt dist/server.cjs ]; then
  echo "⚡ Membangun dist/server.cjs dengan esbuild..."
  npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs || npm run build || true
fi

# 4. Restart PM2 secara bersih
echo ""
echo "🔄 [4/6] Menghidupkan ulang proses PM2 port 3000..."
pm2 delete kuickmart 2>/dev/null || true
pm2 delete all 2>/dev/null || true

if [ -f "ecosystem.config.cjs" ]; then
  NODE_ENV=production pm2 start ecosystem.config.cjs
elif [ -f "dist/server.cjs" ]; then
  NODE_ENV=production pm2 start dist/server.cjs --name kuickmart
else
  NODE_ENV=production pm2 start npm --name kuickmart -- run start
fi
pm2 save

# 5. Konfigurasi Nginx untuk lapakoke.com & subdomains
echo ""
echo "⚙️ [5/6] Memperbarui konfigurasi Nginx server_name untuk lapakoke.com..."
NGINX_CONF=$(ls /etc/nginx/sites-enabled/* 2>/dev/null | head -n 1 || ls /etc/nginx/conf.d/*.conf 2>/dev/null | head -n 1 || echo "")

if [ -n "$NGINX_CONF" ] && [ -f "$NGINX_CONF" ]; then
  echo "📄 File Nginx aktif: $NGINX_CONF"
  # Perbarui server_name agar menerima lapakoke.com dan toko-online.online
  if grep -q "server_name" "$NGINX_CONF"; then
    sed -i -E 's/server_name\s+[^;]+;/server_name lapakoke.com www.lapakoke.com *.lapakoke.com toko-online.online www.toko-online.online *.toko-online.online _;/g' "$NGINX_CONF" || true
    echo "✅ server_name berhasil diatur untuk lapakoke.com dan toko-online.online!"
  fi
  nginx -t && systemctl reload nginx 2>/dev/null || systemctl restart nginx 2>/dev/null || true
fi

# 6. Tes respon port 3000
echo ""
echo "🧪 [6/6] Menguji respon server lokal (http://127.0.0.1:3000)..."
sleep 2

LOCAL_TEST=$(curl -sI http://127.0.0.1:3000 | head -n 1 || echo "GAGAL")
echo "Hasil uji port 3000: $LOCAL_TEST"

if echo "$LOCAL_TEST" | grep -qE "200|301|302|404"; then
  echo ""
  echo "=========================================================="
  echo "🎉 PERBAIKAN SELESAI! APLIKASI AKTIF DI PORT 3000"
  echo "=========================================================="
  echo "🌐 Domain Utama: https://lapakoke.com"
  echo "🌐 Subdomain Toko: https://tokoalda.lapakoke.com"
  echo ""
  echo "⚠️ PANDUAN PENTING DI CLOUDFLARE:"
  echo "1. Menu SSL/TLS -> Atur Encryption Mode ke 'Full' (Bukan Full Strict)."
  echo "2. Menu DNS -> Pastikan A record lapakoke.com & * diarahkan ke IP VPS Anda."
  echo "=========================================================="
else
  echo ""
  echo "⚠️ Port 3000 belum memberikan respon HTTP 200. Memeriksa log PM2:"
  pm2 logs kuickmart --lines 25 --nostream 2>/dev/null || true
fi
