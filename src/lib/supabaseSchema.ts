export const SUPABASE_SQL_SCHEMA = `-- ==========================================================
-- KUICKMART / E-GROCERY SUPABASE DATABASE SCHEMA
-- Compatible with Klik Indomaret & Alfagift Architecture
-- ==========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Stores Table (Toko Minimarket)
CREATE TABLE IF NOT EXISTS public.stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    distance_km NUMERIC(4, 2) DEFAULT 1.0,
    is_24_hours BOOLEAN DEFAULT TRUE,
    is_open BOOLEAN DEFAULT TRUE,
    open_hours TEXT DEFAULT '24 Jam Nonstop',
    phone TEXT,
    ready_for_pickup BOOLEAN DEFAULT TRUE,
    ready_for_delivery BOOLEAN DEFAULT TRUE,
    delivery_fee NUMERIC(10, 2) DEFAULT 6000,
    min_order NUMERIC(10, 2) DEFAULT 15000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    badge TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Products Table (Katalog Barang Minimarket)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category_slug TEXT NOT NULL,
    subcategory TEXT,
    price NUMERIC(12, 2) NOT NULL,
    original_price NUMERIC(12, 2),
    discount_percent INT DEFAULT 0,
    unit TEXT NOT NULL,
    image TEXT NOT NULL,
    stock INT DEFAULT 100,
    rating NUMERIC(3, 2) DEFAULT 4.9,
    sold_count INT DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    description TEXT,
    barcode TEXT,
    is_popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Member Profiles (Loyalty Ponta/Indomaret Poin & Stamps)
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    member_number TEXT NOT NULL UNIQUE,
    barcode TEXT NOT NULL,
    points INT DEFAULT 0,
    stamps INT DEFAULT 0,
    tier TEXT DEFAULT 'Bronze',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Vouchers Table (Promo & Kupon Belanja)
CREATE TABLE IF NOT EXISTS public.vouchers (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    discount_amount NUMERIC(12, 2) NOT NULL,
    type TEXT NOT NULL, -- 'percentage', 'fixed', 'free_shipping'
    min_spend NUMERIC(12, 2) DEFAULT 0,
    max_discount NUMERIC(12, 2),
    valid_until TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Orders Table (Pemesanan Barang)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    member_id TEXT,
    store_id TEXT REFERENCES public.stores(id),
    delivery_type TEXT NOT NULL, -- 'delivery' | 'pickup'
    delivery_slot TEXT,
    pickup_time TEXT,
    address_json JSONB,
    customer_location JSONB,
    status TEXT NOT NULL, -- 'pending_payment', 'processing', 'picking', 'delivering', 'ready_for_pickup', 'completed', 'cancelled'
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'paid',
    subtotal NUMERIC(12, 2) NOT NULL,
    delivery_fee NUMERIC(12, 2) DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    points_used INT DEFAULT 0,
    points_earned INT DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL,
    applied_voucher_code TEXT,
    customer_notes TEXT,
    driver_json JSONB,
    tracking_steps JSONB DEFAULT '[]'::jsonb,
    items_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    quantity INT NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    notes TEXT
);

-- 9. Brand & Header-Footer Configuration Table
CREATE TABLE IF NOT EXISTS public.brand_configs (
    id TEXT PRIMARY KEY DEFAULT 'default',
    config_json JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Receipt Configurations Table (Struk Toko & Kasir)
CREATE TABLE IF NOT EXISTS public.receipt_configs (
    id TEXT PRIMARY KEY,
    store_id TEXT,
    profile_name TEXT NOT NULL,
    header_brand TEXT NOT NULL,
    sub_header TEXT,
    store_name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT,
    phone TEXT NOT NULL,
    tax_id_or_npwp TEXT,
    website_or_social TEXT,
    cashier_name TEXT,
    footer_message1 TEXT NOT NULL,
    footer_message2 TEXT,
    cs_hotline TEXT,
    show_barcode BOOLEAN DEFAULT true,
    show_store_logo BOOLEAN DEFAULT true,
    paper_width TEXT DEFAULT '58mm',
    is_default BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Store Promos & Discount Info Table (Banner & Flash Sale)
CREATE TABLE IF NOT EXISTS public.store_promos (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'banner', 'flash_sale', 'announcement_bar', 'perk_card'
    title TEXT NOT NULL,
    subtitle TEXT,
    badge_text TEXT,
    badge_color TEXT,
    cta_text TEXT,
    target_category TEXT,
    discount_value TEXT,
    bg_gradient TEXT,
    image_url TEXT,
    flash_hours INT DEFAULT 0,
    flash_minutes INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    order_seq INT DEFAULT 0,
    valid_until TEXT,
    store_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Couriers & Fleet Management Table (Kurir & Armada Pengantaran)
CREATE TABLE IF NOT EXISTS public.couriers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    vehicle_type TEXT NOT NULL, -- 'motor', 'mobil', 'sepeda_listrik'
    vehicle_plate TEXT NOT NULL,
    photo TEXT,
    is_verified BOOLEAN DEFAULT true,
    status TEXT NOT NULL DEFAULT 'available', -- 'available', 'delivering', 'off'
    rating NUMERIC(3, 2) DEFAULT 4.9,
    total_deliveries INT DEFAULT 0,
    store_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Staff Users Management Table (Admin, Supervisor, Kasir, Gudang)
CREATE TABLE IF NOT EXISTS public.staff_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'admin', 'supervisor', 'kasir', 'gudang'
    pin TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    store_id TEXT,
    store_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE
);

-- 14. Row Level Security (RLS) Policies
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;

-- Drop previous policies to avoid duplicates
DROP POLICY IF EXISTS "Allow public read/write on stores" ON public.stores;
DROP POLICY IF EXISTS "Allow public read/write on products" ON public.products;
DROP POLICY IF EXISTS "Allow public read/write on categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public read/write on vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Allow public read/write on members" ON public.members;
DROP POLICY IF EXISTS "Allow public read/write on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read/write on order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public read/write on brand_configs" ON public.brand_configs;
DROP POLICY IF EXISTS "Allow public read/write on receipt_configs" ON public.receipt_configs;
DROP POLICY IF EXISTS "Allow public read/write on store_promos" ON public.store_promos;
DROP POLICY IF EXISTS "Allow public read/write on couriers" ON public.couriers;
DROP POLICY IF EXISTS "Allow public read/write on staff_users" ON public.staff_users;

-- Allow Public Read & Write Access across all devices
CREATE POLICY "Allow public read/write on stores" ON public.stores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on vouchers" ON public.vouchers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on members" ON public.members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on brand_configs" ON public.brand_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on receipt_configs" ON public.receipt_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on store_promos" ON public.store_promos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on couriers" ON public.couriers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on staff_users" ON public.staff_users FOR ALL USING (true) WITH CHECK (true);
`;

export const SUPABASE_RLS_FIX_SQL = `-- ==========================================================
-- SCRIPT PERBAIKAN & PENAMBAHAN TABEL LENGKAP SUPABASE
-- Eksekusi ini di menu SQL Editor Supabase untuk memastikan
-- seluruh data (Brand, Struk, Promo, Kurir, User, Voucher)
-- tersimpan dan tersinkronisasi di semua HP, Tablet, dan Laptop
-- ==========================================================

-- 1. Buat tabel-tabel baru jika belum ada
CREATE TABLE IF NOT EXISTS public.brand_configs (
    id TEXT PRIMARY KEY DEFAULT 'default',
    config_json JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.receipt_configs (
    id TEXT PRIMARY KEY,
    store_id TEXT,
    profile_name TEXT NOT NULL,
    header_brand TEXT NOT NULL,
    sub_header TEXT,
    store_name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT,
    phone TEXT NOT NULL,
    tax_id_or_npwp TEXT,
    website_or_social TEXT,
    cashier_name TEXT,
    footer_message1 TEXT NOT NULL,
    footer_message2 TEXT,
    cs_hotline TEXT,
    show_barcode BOOLEAN DEFAULT true,
    show_store_logo BOOLEAN DEFAULT true,
    paper_width TEXT DEFAULT '58mm',
    is_default BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.store_promos (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    badge_text TEXT,
    badge_color TEXT,
    cta_text TEXT,
    target_category TEXT,
    discount_value TEXT,
    bg_gradient TEXT,
    image_url TEXT,
    flash_hours INT DEFAULT 0,
    flash_minutes INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    order_seq INT DEFAULT 0,
    valid_until TEXT,
    store_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.couriers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    vehicle_type TEXT NOT NULL,
    vehicle_plate TEXT NOT NULL,
    photo TEXT,
    is_verified BOOLEAN DEFAULT true,
    status TEXT NOT NULL DEFAULT 'available',
    rating NUMERIC(3, 2) DEFAULT 4.9,
    total_deliveries INT DEFAULT 0,
    store_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.staff_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    pin TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    store_id TEXT,
    store_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE
);

-- 2. Pastikan RLS diaktifkan & diberi izin Read/Write publik
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read/write on stores" ON public.stores;
CREATE POLICY "Allow public read/write on stores" ON public.stores FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on products" ON public.products;
CREATE POLICY "Allow public read/write on products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on categories" ON public.categories;
CREATE POLICY "Allow public read/write on categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on vouchers" ON public.vouchers;
CREATE POLICY "Allow public read/write on vouchers" ON public.vouchers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on members" ON public.members;
CREATE POLICY "Allow public read/write on members" ON public.members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on orders" ON public.orders;
CREATE POLICY "Allow public read/write on orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on order_items" ON public.order_items;
CREATE POLICY "Allow public read/write on order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on brand_configs" ON public.brand_configs;
CREATE POLICY "Allow public read/write on brand_configs" ON public.brand_configs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on receipt_configs" ON public.receipt_configs;
CREATE POLICY "Allow public read/write on receipt_configs" ON public.receipt_configs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on store_promos" ON public.store_promos;
CREATE POLICY "Allow public read/write on store_promos" ON public.store_promos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on couriers" ON public.couriers;
CREATE POLICY "Allow public read/write on couriers" ON public.couriers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on staff_users" ON public.staff_users;
CREATE POLICY "Allow public read/write on staff_users" ON public.staff_users FOR ALL USING (true) WITH CHECK (true);

-- 3. Pastikan kolom orders lengkap
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_location JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_json JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_steps JSONB DEFAULT '[]'::jsonb;
`;
