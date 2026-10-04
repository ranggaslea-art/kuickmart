#!/usr/bin/env bash
# ==============================================================================
# SCRIPT PENAMBAH MEMORI SWAP (RAM VIRTUAL) UNTUK VPS LINUX
# Mencegah PuTTY macet / freeze / out-of-memory saat build atau npm install
# ==============================================================================

SWAP_SIZE="2G"

echo "🔍 Memeriksa status memori RAM dan Swap di server..."
free -h

CURRENT_SWAP=$(free -m | awk '/Swap:/ {print $2}')

if [ "$CURRENT_SWAP" -ge 1024 ]; then
  echo "✅ Swap sudah tersedia (${CURRENT_SWAP} MB). Tidak perlu membuat swap baru."
  exit 0
fi

echo "⚠️ Swap terdeteksi kecil atau 0 MB (${CURRENT_SWAP} MB)."
echo "🚀 Membuat file Swap sebesar ${SWAP_SIZE} untuk mempercepat proses & mencegah VPS freeze..."

if [ -f /swapfile ]; then
  swapoff /swapfile 2>/dev/null || true
  rm -f /swapfile
fi

if command -v fallocate >/dev/null 2>&1; then
  fallocate -l ${SWAP_SIZE} /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
else
  dd if=/dev/zero of=/swapfile bs=1M count=2048
fi

chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

if ! grep -q "/swapfile" /etc/fstab; then
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

# Optimasi swappiness agar swap hanya dipakai saat RAM hampir penuh
sysctl vm.swappiness=15 2>/dev/null || true
sysctl vm.vfs_cache_pressure=50 2>/dev/null || true

echo "✅ Swap berhasil diaktifkan!"
free -h
