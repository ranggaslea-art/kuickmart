-- ==============================================================================
-- SKEMA RESMI DATABASE MYSQL / MARIADB UNTUK KUICKMART & TOKO ONLINE
-- Kompatibel dengan MariaDB 10.x+ / MySQL 8.x+
-- Karakter Set: UTF8MB4 (Mendukung Emoji, Karakter Khusus & Simbol Mata Uang)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS kuickmart_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE kuickmart_db;

-- 1. TABEL TOKO / CABANG (STORES)
CREATE TABLE IF NOT EXISTS stores (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABEL KATEGORI PRODUK (CATEGORIES)
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  tenant_slug VARCHAR(64) NOT NULL DEFAULT 'default',
  slug VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  icon VARCHAR(50) DEFAULT 'Store',
  color VARCHAR(30) DEFAULT '#10B981',
  badge VARCHAR(50) DEFAULT NULL,
  image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cat_tenant (tenant_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABEL MEREK PRODUK (BRANDS)
CREATE TABLE IF NOT EXISTS brands (
  id VARCHAR(64) PRIMARY KEY,
  tenant_slug VARCHAR(64) NOT NULL DEFAULT 'default',
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) DEFAULT NULL,
  category_slug VARCHAR(100) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  logo TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_brand_tenant (tenant_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABEL PRODUK UTAMA (PRODUCTS) - MENDUKUNG 49 KOLOM LENGKAP
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  tenant_slug VARCHAR(64) NOT NULL DEFAULT 'default',
  item_code VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  brand VARCHAR(100),
  barcode VARCHAR(100),
  unit VARCHAR(50) DEFAULT 'Pcs',
  price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  cost_price DECIMAL(15,2) DEFAULT 0.00,
  stock INT DEFAULT 0,
  min_stock INT DEFAULT 5,
  item_type VARCHAR(50) DEFAULT 'Barang',
  shelf VARCHAR(100),
  warehouse_code VARCHAR(100) DEFAULT 'GUD-PUSAT',
  supplier_code VARCHAR(100),
  is_consignment CHAR(1) DEFAULT 'N',
  use_serial CHAR(1) DEFAULT 'N',
  tax_type VARCHAR(50) DEFAULT 'NON-PAJAK',
  tax_system VARCHAR(50) DEFAULT 'INCLUDE',
  image TEXT,
  description TEXT,
  point INT DEFAULT 0,
  commission DECIMAL(15,2) DEFAULT 0.00,
  sold_count INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 4.90,
  unit_conversions JSON,
  variants JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_prod_tenant (tenant_slug),
  INDEX idx_prod_barcode (barcode),
  INDEX idx_prod_item_code (item_code),
  INDEX idx_prod_cat (category),
  INDEX idx_prod_brand (brand)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABEL TRANSAKSI & PESANAN (ORDERS)
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  tenant_slug VARCHAR(64) NOT NULL DEFAULT 'default',
  order_number VARCHAR(100),
  customer_name VARCHAR(150),
  customer_phone VARCHAR(50),
  customer_address TEXT,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(15,2) DEFAULT 0.00,
  tax_amount DECIMAL(15,2) DEFAULT 0.00,
  final_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(50) DEFAULT 'CASH',
  payment_status VARCHAR(50) DEFAULT 'COMPLETED',
  order_status VARCHAR(50) DEFAULT 'COMPLETED',
  cashier_name VARCHAR(100),
  store_id VARCHAR(64),
  items JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order_tenant (tenant_slug),
  INDEX idx_order_created (created_at),
  INDEX idx_order_number (order_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABEL PELANGGAN (CUSTOMERS)
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  tenant_slug VARCHAR(64) NOT NULL DEFAULT 'default',
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(150),
  address TEXT,
  points INT DEFAULT 0,
  tier VARCHAR(50) DEFAULT 'Reguler',
  total_spend DECIMAL(15,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cust_tenant (tenant_slug),
  INDEX idx_cust_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABEL PENGGUNA STAF / KASIR / ADMIN (STAFF_USERS)
CREATE TABLE IF NOT EXISTS staff_users (
  id VARCHAR(64) PRIMARY KEY,
  tenant_slug VARCHAR(64) NOT NULL DEFAULT 'default',
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(150) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'CASHIER',
  store_id VARCHAR(64),
  permissions JSON,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tenant_username (tenant_slug, username),
  INDEX idx_staff_tenant (tenant_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABEL PENGATURAN STRUK (RECEIPT_CONFIGS)
CREATE TABLE IF NOT EXISTS receipt_configs (
  id VARCHAR(64) PRIMARY KEY,
  tenant_slug VARCHAR(64) NOT NULL DEFAULT 'default',
  store_name VARCHAR(150),
  address TEXT,
  phone VARCHAR(50),
  header_note TEXT,
  footer_note TEXT,
  printer_width VARCHAR(20) DEFAULT '58mm',
  show_logo TINYINT(1) DEFAULT 1,
  show_qr TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_receipt_tenant (tenant_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TABEL PROMO & VOUCHER (STORE_PROMOS)
CREATE TABLE IF NOT EXISTS store_promos (
  id VARCHAR(64) PRIMARY KEY,
  tenant_slug VARCHAR(64) NOT NULL DEFAULT 'default',
  code VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  discount_type VARCHAR(20) DEFAULT 'PERCENT',
  discount_value DECIMAL(15,2) DEFAULT 0.00,
  min_order DECIMAL(15,2) DEFAULT 0.00,
  max_discount DECIMAL(15,2) DEFAULT 0.00,
  order_seq INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  valid_until DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_promo_tenant (tenant_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TABEL KURIR & ARMADA (COURIERS)
CREATE TABLE IF NOT EXISTS couriers (
  id VARCHAR(64) PRIMARY KEY,
  tenant_slug VARCHAR(64) NOT NULL DEFAULT 'default',
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  base_rate DECIMAL(15,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_courier_tenant (tenant_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. TABEL SUPPLIER / PEMASOK (SUPPLIERS)
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(64) PRIMARY KEY,
  tenant_slug VARCHAR(64) NOT NULL DEFAULT 'default',
  code VARCHAR(50),
  name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  category VARCHAR(100),
  bank_account JSON,
  payment_terms VARCHAR(50) DEFAULT 'tempo_14',
  is_active TINYINT(1) DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_supplier_tenant (tenant_slug),
  INDEX idx_supplier_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TABEL PESANAN PEMBELIAN BARANG & STOK MASUK (PURCHASE_ORDERS)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(64) PRIMARY KEY,
  tenant_slug VARCHAR(64) NOT NULL DEFAULT 'default',
  purchase_number VARCHAR(100) NOT NULL,
  invoice_number VARCHAR(100),
  supplier_id VARCHAR(64),
  supplier_name VARCHAR(150),
  store_id VARCHAR(64),
  store_name VARCHAR(150),
  order_date DATE,
  received_date DATE,
  total_quantity INT DEFAULT 0,
  subtotal DECIMAL(15,2) DEFAULT 0.00,
  tax_amount DECIMAL(15,2) DEFAULT 0.00,
  discount_amount DECIMAL(15,2) DEFAULT 0.00,
  total_amount DECIMAL(15,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'received',
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  payment_method VARCHAR(50) DEFAULT 'tempo',
  due_date DATE,
  notes TEXT,
  stock_updated TINYINT(1) DEFAULT 1,
  received_by VARCHAR(100),
  items JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_po_tenant (tenant_slug),
  INDEX idx_po_number (purchase_number),
  INDEX idx_po_supplier (supplier_id),
  INDEX idx_po_order_date (order_date),
  INDEX idx_po_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

