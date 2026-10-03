#!/usr/bin/env bash
# ==============================================================================
# SCRIPT RESMI PERMANEN PHPMYADMIN & ROUTING NGINX KUICKMART
# Lokasi: /var/www/phpmyadmin (Aman permanen dari proses build Vite)
# ==============================================================================

set -e

echo "📦 [1/4] Memasang phpMyAdmin permanen di /var/www/phpmyadmin..."
mkdir -p /var/www/phpmyadmin
cd /tmp
wget -q https://files.phpmyadmin.net/phpMyAdmin/5.2.1/phpMyAdmin-5.2.1-all-languages.tar.gz -O pma.tar.gz
tar -xzf pma.tar.gz -C /var/www/phpmyadmin --strip-components=1
rm -f pma.tar.gz
mkdir -p /var/www/phpmyadmin/tmp
chmod -R 777 /var/www/phpmyadmin/tmp
chown -R www-data:www-data /var/www/phpmyadmin

# Buat blowfish secret
BLOWFISH=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
cp -n /var/www/phpmyadmin/config.sample.inc.php /var/www/phpmyadmin/config.inc.php 2>/dev/null || true
if [ -f /var/www/phpmyadmin/config.inc.php ]; then
  sed -i "s/\$cfg\['blowfish_secret'\] = '';/\$cfg\['blowfish_secret'\] = '$BLOWFISH';/" /var/www/phpmyadmin/config.inc.php || true
fi

echo "🔍 [2/4] Mendeteksi PHP Socket & Konfigurasi Nginx..."
PHP_SOCK=$(ls /run/php/php*-fpm.sock 2>/dev/null | head -n 1 || ls /var/run/php/php*-fpm.sock 2>/dev/null | head -n 1)
CONF_FILE=$(ls /etc/nginx/sites-enabled/* 2>/dev/null | head -n 1)
[ -z "$CONF_FILE" ] && CONF_FILE="/etc/nginx/sites-available/default"

echo "✅ PHP Socket : $PHP_SOCK"
echo "✅ File Nginx : $CONF_FILE"

echo "⚙️ [3/4] Mendaftarkan konfigurasi Nginx..."
# Hapus konfigurasi lama
sed -i '/location.*phpmyadmin/,/^[[:space:]]*}/d' "$CONF_FILE" 2>/dev/null || true

# Sisipkan blok konfigurasi sebelum location /
sed -i "/^[[:space:]]*location[[:space:]]*\/[[:space:]]*{/i \\
    location /phpmyadmin {\\
        root /var/www;\\
        index index.php index.html;\\
        try_files \$uri \$uri/ /phpmyadmin/index.php?\$args;\\
        location ~ \\.php\$ {\\
            include fastcgi_params;\\
            fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;\\
            fastcgi_pass unix:$PHP_SOCK;\\
        }\\
    }" "$CONF_FILE"

echo "🔄 [4/4] Memuat ulang service PHP-FPM dan Nginx..."
systemctl restart php*-fpm 2>/dev/null || true
nginx -t
systemctl reload nginx

echo ""
echo "=================================================="
echo "🎉 phpMyAdmin Berhasil Dipasang Permanen!"
echo "URL : https://toko-online.online/phpmyadmin/"
echo "User: kuickmart_user"
echo "Pass: Kuickmart2026Secure"
echo "=================================================="
