#!/usr/bin/env bash
# ==============================================================================
# SCRIPT RESET PASSWORD & HAK AKSES KUICKMART USER UNTUK PHPMYADMIN & NODE.JS
# ==============================================================================

set -e

echo "🔐 [1/3] Menyetel ulang user & password database MySQL/MariaDB..."

# Eksekusi sebagai root mysql
mysql -u root << 'EOF'
CREATE DATABASE IF NOT EXISTS kuickmart_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Hapus user lama jika ada residu atau password berbeda
DROP USER IF EXISTS 'kuickmart_user'@'localhost';
DROP USER IF EXISTS 'kuickmart_user'@'127.0.0.1';
DROP USER IF EXISTS 'kuickmart_user'@'%';

-- Buat ulang user dengan password resmi
CREATE USER 'kuickmart_user'@'localhost' IDENTIFIED BY 'Kuickmart2026Secure';
CREATE USER 'kuickmart_user'@'127.0.0.1' IDENTIFIED BY 'Kuickmart2026Secure';
CREATE USER 'kuickmart_user'@'%' IDENTIFIED BY 'Kuickmart2026Secure';

-- Berikan seluruh hak akses
GRANT ALL PRIVILEGES ON *.* TO 'kuickmart_user'@'localhost' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'kuickmart_user'@'127.0.0.1' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'kuickmart_user'@'%' WITH GRANT OPTION;

FLUSH PRIVILEGES;
EOF

echo "🧪 [2/3] Menguji autentikasi user kuickmart_user..."
if mysql -u kuickmart_user -pKuickmart2026Secure -e "SELECT 'Koneksi Berhasil!' AS Status, USER() AS User;" 2>/dev/null; then
  echo ""
  echo "=========================================================="
  echo "✅ SUKSES! User database berhasil direset & diuji."
  echo "🔑 Username : kuickmart_user"
  echo "🔒 Password : Kuickmart2026Secure"
  echo "🌐 Silakan login di: https://toko-online.online/phpmyadmin"
  echo "=========================================================="
else
  echo "⚠️ Autentikasi langsung gagal, mencoba penyesuaian plugin auth native..."
  mysql -u root << 'EOF'
ALTER USER 'kuickmart_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Kuickmart2026Secure';
ALTER USER 'kuickmart_user'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY 'Kuickmart2026Secure';
FLUSH PRIVILEGES;
EOF
  mysql -u kuickmart_user -pKuickmart2026Secure -e "SELECT 'Koneksi Native Sukses!' AS Status;"
fi

echo "🔄 [3/3] Memastikan service database & web server aktif..."
systemctl restart mariadb 2>/dev/null || systemctl restart mysql 2>/dev/null || true
systemctl restart php*-fpm 2>/dev/null || true
systemctl reload nginx 2>/dev/null || true

echo "🎉 Selesai! Silakan buka kembali phpMyAdmin dan login."
