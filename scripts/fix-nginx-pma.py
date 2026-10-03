import glob
import os
import re
import subprocess
import sys

conf = "/etc/nginx/sites-enabled/kuickmart"
if not os.path.exists(conf):
    confs = glob.glob("/etc/nginx/sites-enabled/*")
    conf = confs[0] if confs else "/etc/nginx/sites-available/default"

print(f"Memperbaiki file: {conf}")

with open(conf, "r") as f:
    lines = f.readlines()

# 1. Hapus semua baris yang mengandung phpmyadmin atau sisa blok yang salah
cleaned_lines = []
skip = False
for line in lines:
    if "location /phpmyadmin" in line or "location ^~ /phpmyadmin" in line:
        skip = True
        continue
    if skip:
        if line.strip() == "}":
            # Cek apakah ini penutup blok luar
            skip = False
        continue
    cleaned_lines.append(line)

content = "".join(cleaned_lines)

# 2. Deteksi socket PHP-FPM
socks = glob.glob("/run/php/php*-fpm.sock") + glob.glob("/var/run/php/php*-fpm.sock")
sock = socks[0] if socks else "/run/php/php7.3-fpm.sock"
print(f"PHP Socket: {sock}")

pma_block = f"""
    # PHPMYADMIN ROUTING KUICKMART
    location /phpmyadmin {{
        root /var/www;
        index index.php index.html;
        try_files $uri $uri/ /phpmyadmin/index.php?$args;
        location ~ \\.php$ {{
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            fastcgi_pass unix:{sock};
        }}
    }}
"""

# 3. Sisipkan di dalam blok server (tepat setelah baris server_name)
if "server_name" in content:
    # Sisipkan setelah kemunculan server_name terakhir (biasanya blok SSL 443)
    idx = content.rfind("server_name")
    end_of_line = content.find(";", idx)
    if end_of_line != -1:
        content = content[:end_of_line + 1] + "\n" + pma_block + "\n" + content[end_of_line + 1:]
else:
    # Fallback: sisipkan tepat setelah server {
    idx = content.rfind("server {")
    if idx != -1:
        content = content[:idx + 8] + "\n" + pma_block + "\n" + content[idx + 8:]

with open(conf, "w") as f:
    f.write(content)

print("Konfigurasi Nginx berhasil diperbarui!")
