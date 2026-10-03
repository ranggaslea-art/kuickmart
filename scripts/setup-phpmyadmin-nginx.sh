#!/usr/bin/env bash
# ==============================================================================
# SCRIPT PERBAIKAN PHPMYADMIN & ROUTING NGINX UNTUK KUICKMART DI DEBIAN 10 / VPS
# ==============================================================================

set -e

echo "🚀 [1/3] Mendeteksi file konfigurasi Nginx dan Socket PHP..."
PHP_SOCK=$(ls /run/php/php*-fpm.sock 2>/dev/null | head -n 1 || ls /var/run/php/php*-fpm.sock 2>/dev/null | head -n 1)
CONF_FILE=$(ls /etc/nginx/sites-enabled/* 2>/dev/null | head -n 1)
[ -z "$CONF_FILE" ] && CONF_FILE="/etc/nginx/sites-available/default"

echo "✅ Socket PHP: $PHP_SOCK"
echo "✅ File Nginx: $CONF_FILE"

echo "⚙️ [2/3] Menyisipkan routing /phpmyadmin ke Nginx..."
# Hapus jika pernah ada blok phpmyadmin sebelumnya
sed -i '/location \^\~ \/phpmyadmin/,/^[[:space:]]*}/d' "$CONF_FILE" 2>/dev/null || true

# Sisipkan blok phpmyadmin tepat sebelum location /
sed -i "/^[[:space:]]*location[[:space:]]*\/[[:space:]]*{/i \\
    location ^~ /phpmyadmin {\\
        alias /var/www/kuickmart/dist/phpmyadmin;\\
        index index.php index.html;\\
        try_files \$uri \$uri/ /phpmyadmin/index.php?\$args;\\
        location ~ \\.php\$ {\\
            include fastcgi_params;\\
            fastcgi_param SCRIPT_FILENAME \$request_filename;\\
            fastcgi_pass unix:$PHP_SOCK;\\
        }\\
    }" "$CONF_FILE"

echo "🔄 [3/3] Memeriksa sintaks Nginx dan memuat ulang service..."
systemctl restart php*-fpm 2>/dev/null || true
nginx -t
systemctl reload nginx

echo ""
echo "=================================================="
echo "🎉 BERHASIL! phpMyAdmin kini aktif."
echo "URL : https://toko-online.online/phpmyadmin/"
echo "User: kuickmart_user"
echo "Pass: Kuickmart2026Secure"
echo "=================================================="
