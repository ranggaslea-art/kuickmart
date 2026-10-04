#!/usr/bin/env bash
# ==============================================================================
# SCRIPT RESTART CEPAT KUICKMART (1-2 DETIK)
# Menggunakan build yang sudah ada tanpa kompilasi ulang yang memakan waktu
# ==============================================================================

cd /var/www/kuickmart || exit 1

echo "⚡ Merestart Kuickmart PM2..."
pm2 restart kuickmart || pm2 start ecosystem.config.cjs

echo "🧪 Mengecek status..."
sleep 1
pm2 status kuickmart
curl -sI http://127.0.0.1:3000 | head -n 3
echo "✅ Server siap!"
