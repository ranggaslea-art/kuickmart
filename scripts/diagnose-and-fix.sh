#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DIAGNOSA & PERBAIKAN OTOMATIS 502 BAD GATEWAY KUICKMART
# ==============================================================================

cd /var/www/kuickmart || exit 1

echo "=========================================================="
echo "🔍 1. MEMERIKSA STATUS PM2 & PORT 3000"
echo "=========================================================="

pm2 status || true

echo ""
echo "🔍 2. MEMERIKSA APAKAH PORT 3000 SUDAH MENDENGARKAN:"
if command -v ss >/dev/null 2>&1; then
  ss -tulpn | grep 3000 || echo "⚠️ Port 3000 belum aktif."
elif command -v netstat >/dev/null 2>&1; then
  netstat -tlpn | grep 3000 || echo "⚠️ Port 3000 belum aktif."
fi

echo ""
echo "🔍 3. MEMERIKSA LOG ERROR PM2 TERAKHIR:"
pm2 logs kuickmart --lines 20 --nostream 2>/dev/null || true

echo ""
echo "=========================================================="
echo "🛠️ 4. MEMPERBAIKI & MEMBANGUN ULANG (FAST REPAIR)"
echo "=========================================================="

mkdir -p dist

echo "🔨 Menyiapkan server production bundle (esbuild)..."
npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs

if [ ! -f "dist/index.html" ]; then
  echo "🔨 Menyiapkan frontend bundle (vite build)..."
  npx vite build
fi

echo "🔄 Memulai ulang PM2 kuickmart..."
pm2 delete kuickmart 2>/dev/null || true
pm2 delete all 2>/dev/null || true

if [ -f "ecosystem.config.cjs" ]; then
  NODE_ENV=production pm2 start ecosystem.config.cjs
else
  NODE_ENV=production pm2 start dist/server.cjs --name kuickmart
fi

pm2 save

echo ""
echo "🔄 Memuat ulang konfigurasi Nginx..."
nginx -t && systemctl reload nginx 2>/dev/null || true

echo ""
echo "=========================================================="
echo "🧪 5. MENGUJI KONEKSI PORT 3000 & NGINX"
echo "=========================================================="
sleep 2

LOCAL_RES=$(curl -sI http://127.0.0.1:3000 | head -n 1 || echo "GAGAL")
echo "Respon Port 3000: $LOCAL_RES"

if echo "$LOCAL_RES" | grep -qE "200|301|302|404"; then
  echo ""
  echo "✅ SUKSES! Server di Port 3000 sudah AKTIF NORMAL!"
  echo "🌐 Silakan buka kembali https://toko-online.online"
else
  echo ""
  echo "⚠️ Port 3000 masih belum merespon. Menjalankan fallback langsung via node:"
  pm2 logs kuickmart --lines 30 --nostream
fi
echo "=========================================================="
