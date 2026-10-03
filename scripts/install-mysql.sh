#!/usr/bin/env bash
# ==============================================================================
# SCRIPT OTOMATISASI INSTALASI MARIADB (MYSQL) + PHP-FPM + PHPMYADMIN DI VPS
# Untuk KuickMart & Toko Online (Kompatibel dengan Debian 10/11/12 & Ubuntu)
# ==============================================================================

set -e

echo "🚀 [1/6] Memperbarui repositori paket server..."
apt-get update -y

echo "📦 [2/6] Menginstal MariaDB Server, PHP-FPM, dan ekstensi pendukung..."
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  mariadb-server \
  php-fpm \
  php-mysql \
  php-mbstring \
  php-zip \
  php-gd \
  php-curl \
  wget \
  curl \
  tar

echo "🔄 [3/6] Memastikan service MariaDB berjalan..."
systemctl enable mariadb 2>/dev/null || systemctl enable mysql 2>/dev/null || true
systemctl restart mariadb 2>/dev/null || systemctl restart mysql 2>/dev/null || true

echo "⚙️ [4/6] Mengonfigurasi database kuickmart_db & user akses..."
mysql -e "
CREATE DATABASE IF NOT EXISTS kuickmart_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'kuickmart_user'@'localhost' IDENTIFIED BY 'Kuickmart2026Secure';
GRANT ALL PRIVILEGES ON kuickmart_db.* TO 'kuickmart_user'@'localhost';
FLUSH PRIVILEGES;
"

echo "📥 [5/6] Mengunduh paket phpMyAdmin resmi..."
PMA_TARGET="/var/www/kuickmart/dist/phpmyadmin"
mkdir -p /tmp/pma_install
cd /tmp/pma_install
wget -q -O pma.tar.gz https://files.phpmyadmin.net/phpMyAdmin/5.2.1/phpMyAdmin-5.2.1-all-languages.tar.gz || \
wget -q -O pma.tar.gz https://www.phpmyadmin.net/downloads/phpMyAdmin-latest-all-languages.tar.gz

rm -rf "$PMA_TARGET"
mkdir -p "$PMA_TARGET"
tar -xzf pma.tar.gz -C "$PMA_TARGET" --strip-components=1
rm -rf /tmp/pma_install

# Buat direktori tmp dengan izin write untuk phpMyAdmin
mkdir -p "$PMA_TARGET/tmp"
chmod 777 "$PMA_TARGET/tmp"

# Buat blowfish secret otomatis jika config.inc.php diperlukan
BLOWFISH=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
cp -n "$PMA_TARGET/config.sample.inc.php" "$PMA_TARGET/config.inc.php" || true
if [ -f "$PMA_TARGET/config.inc.php" ]; then
  sed -i "s/\$cfg\['blowfish_secret'\] = '';/\$cfg\['blowfish_secret'\] = '$BLOWFISH';/" "$PMA_TARGET/config.inc.php" || true
fi

echo "🔄 [6/6] Menyiapkan integrasi Nginx & PHP-FPM..."
PHP_SOCK=$(find /var/run/php/ -name "*fpm.sock" 2>/dev/null | head -n 1 || echo "")
PHP_FPM_SVC=$(systemctl list-unit-files | grep -o 'php[0-9.]*-fpm' | head -n 1 || echo "php-fpm")

if [ -n "$PHP_FPM_SVC" ]; then
  systemctl enable "$PHP_FPM_SVC" 2>/dev/null || true
  systemctl restart "$PHP_FPM_SVC" 2>/dev/null || true
fi

# Periksa apakah Nginx perlu blok phpmyadmin
NGINX_CONF="/etc/nginx/sites-available/default"
if [ -f "$NGINX_CONF" ] && ! grep -q "phpmyadmin" "$NGINX_CONF" && [ -n "$PHP_SOCK" ]; then
  sed -i "/server_name/a \
    location /phpmyadmin { \
        root /var/www/kuickmart/dist; \
        index index.php index.html; \
        location ~ \\.php\$ { \
            include snippets/fastcgi-php.conf; \
            fastcgi_pass unix:$PHP_SOCK; \
        } \
    }" "$NGINX_CONF" 2>/dev/null || true
fi

systemctl restart nginx 2>/dev/null || true

echo "✅ Selesai! MariaDB dan phpMyAdmin telah berhasil terinstal di server VPS Anda."
echo "--------------------------------------------------------------------------------"
echo "📌 Rincian Koneksi Database:"
echo "Host     : 127.0.0.1 (localhost)"
echo "Port     : 3306"
echo "Database : kuickmart_db"
echo "User     : kuickmart_user"
echo "Password : Kuickmart2026Secure"
echo "phpMyAdmin : https://toko-online.online/phpmyadmin"
echo "--------------------------------------------------------------------------------"
