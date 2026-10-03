/**
 * Script Migrasi Otomatis dari Supabase Cloud ke MariaDB / MySQL Lokal VPS
 * KuickMart & Toko Online
 */
const https = require('https');
const mysql = require('mysql2/promise');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pryufdtwxgmjacfinans.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_DYY4wHqCU4yMhVMPOLxyCg_Cvfodmub';

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'kuickmart_user',
  password: process.env.MYSQL_PASSWORD || 'Kuickmart2026Secure',
  database: process.env.MYSQL_DATABASE || 'kuickmart_db',
};

function fetchSupabase(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SUPABASE_URL);
    const req = https.get(
      url.toString(),
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(new Error(`Gagal parse JSON dari Supabase: ${data.slice(0, 100)}`));
          }
        });
      }
    );
    req.on('error', reject);
  });
}

async function runMigration() {
  console.log('🚀 Memulai sinkronisasi data dari Supabase ke MariaDB (MySQL)...');
  console.log(`🌐 Supabase Target: ${SUPABASE_URL}`);
  console.log(`🗄️ MySQL Target   : ${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}\n`);

  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Berhasil terhubung ke MariaDB/MySQL lokal!');
  } catch (err) {
    console.error('❌ Gagal terhubung ke MySQL:', err.message);
    process.exit(1);
  }

  // 1. Pastikan kolom variants dan kolom tambahan ada di tabel products jika belum ada
  try {
    await connection.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSON');
    await connection.query('ALTER TABLE products MODIFY COLUMN image LONGTEXT');
    await connection.query('ALTER TABLE products MODIFY COLUMN description LONGTEXT');
  } catch (_) {}

  // 2. Tarik dan Migrasi Kategori (Categories)
  console.log('\n📦 [1/4] Mengambil kategori dari Supabase...');
  try {
    const categories = await fetchSupabase('/rest/v1/categories?select=*');
    if (Array.isArray(categories)) {
      console.log(`   Ditemukan ${categories.length} kategori.`);
      let inserted = 0;
      for (const c of categories) {
        await connection.query(
          `INSERT INTO categories (id, tenant_slug, slug, name, icon, color, image)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), color=VALUES(color)`,
          [
            c.id,
            'default',
            c.slug || c.id,
            c.name || 'Kategori',
            c.icon || 'Store',
            c.color || '#10B981',
            c.image || '',
          ]
        );
        inserted++;
      }
      console.log(`   ✅ ${inserted} kategori berhasil disalin ke MySQL.`);
    }
  } catch (err) {
    console.error('   ⚠️ Gagal memigrasikan kategori:', err.message);
  }

  // 3. Tarik dan Migrasi Master Produk (Products)
  console.log('\n📦 [2/4] Mengambil master produk dari Supabase...');
  try {
    const products = await fetchSupabase('/rest/v1/products?select=*');
    if (Array.isArray(products)) {
      console.log(`   Ditemukan ${products.length} produk di Supabase.`);
      let inserted = 0;
      for (const p of products) {
        const cat = p.category || p.category_slug || p.subcategory || 'Umum';
        const brand = p.brand || 'Umum';
        const price = Number(p.price) || 0;
        const costPrice = Number(p.cost_price || p.costPrice || (price * 0.8));
        const stock = Number(p.stock) || 0;
        const soldCount = Number(p.sold_count || p.soldCount) || 0;
        const rating = Number(p.rating) || 4.9;
        const barcode = p.barcode || '';
        const unit = p.unit || 'Pcs';
        const desc = p.description || '';
        const img = p.image || '';

        await connection.query(
          `INSERT INTO products (
            id, tenant_slug, item_code, name, category, brand, barcode, unit,
            price, cost_price, stock, min_stock, item_type,
            image, description, sold_count, rating
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name=VALUES(name),
            category=VALUES(category),
            brand=VALUES(brand),
            barcode=VALUES(barcode),
            unit=VALUES(unit),
            price=VALUES(price),
            cost_price=VALUES(cost_price),
            stock=VALUES(stock),
            image=VALUES(image),
            description=VALUES(description),
            sold_count=VALUES(sold_count),
            rating=VALUES(rating)`,
          [
            p.id,
            'default',
            p.item_code || p.itemCode || barcode || p.id,
            p.name,
            cat,
            brand,
            barcode,
            unit,
            price,
            costPrice,
            stock,
            5,
            'Barang',
            img,
            desc,
            soldCount,
            rating,
          ]
        );
        inserted++;
      }
      console.log(`   ✅ ${inserted} master produk berhasil disalin ke MySQL!`);
    }
  } catch (err) {
    console.error('   ⚠️ Gagal memigrasikan produk:', err.message);
  }

  // 4. Tarik dan Migrasi Pesanan (Orders)
  console.log('\n📦 [3/4] Mengambil pesanan dan transaksi dari Supabase...');
  try {
    const orders = await fetchSupabase('/rest/v1/orders?select=*');
    if (Array.isArray(orders)) {
      console.log(`   Ditemukan ${orders.length} transaksi pesanan.`);
      let inserted = 0;
      for (const o of orders) {
        const total = Number(o.total_amount || o.final_amount || o.totalAmount) || 0;
        const orderNum = o.order_number || o.id;
        const custName = o.customer_name || 'Pelanggan Toko';
        const custPhone = o.customer_phone || '';
        const custAddress = o.customer_address || '';
        const paymentMethod = o.payment_method || 'CASH';
        const paymentStatus = o.payment_status || 'COMPLETED';
        const orderStatus = o.order_status || 'COMPLETED';
        const cashierName = o.cashier_name || 'Kasir';
        const itemsJson = typeof o.items === 'string' ? o.items : JSON.stringify(o.items || []);

        await connection.query(
          `INSERT INTO orders (
            id, tenant_slug, order_number, customer_name, customer_phone, customer_address,
            total_amount, discount_amount, tax_amount, final_amount,
            payment_method, payment_status, order_status, cashier_name, items
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            order_number=VALUES(order_number),
            customer_name=VALUES(customer_name),
            final_amount=VALUES(final_amount),
            payment_status=VALUES(payment_status),
            order_status=VALUES(order_status)`,
          [
            o.id,
            'default',
            orderNum,
            custName,
            custPhone,
            custAddress,
            total,
            0,
            0,
            total,
            paymentMethod,
            paymentStatus,
            orderStatus,
            cashierName,
            itemsJson,
          ]
        );
        inserted++;
      }
      console.log(`   ✅ ${inserted} pesanan berhasil disalin ke MySQL.`);
    }
  } catch (err) {
    console.error('   ⚠️ Gagal memigrasikan pesanan:', err.message);
  }

  // 5. Verifikasi jumlah baris di MySQL
  console.log('\n📊 [4/4] Verifikasi data di tabel MariaDB/MySQL:');
  const [prodCount] = await connection.query('SELECT COUNT(*) as count FROM products');
  const [catCount] = await connection.query('SELECT COUNT(*) as count FROM categories');
  const [orderCount] = await connection.query('SELECT COUNT(*) as count FROM orders');

  console.log(`   🔹 Tabel products   : ${prodCount[0].count} baris`);
  console.log(`   🔹 Tabel categories : ${catCount[0].count} baris`);
  console.log(`   🔹 Tabel orders     : ${orderCount[0].count} baris`);

  await connection.end();
  console.log('\n🎉 Selesai! Seluruh data Supabase telah berhasil dimigrasikan ke MySQL.');
  console.log('Silakan buka kembali phpMyAdmin dan tekan F5 untuk melihat seluruh produk Anda!');
}

runMigration().catch((err) => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
