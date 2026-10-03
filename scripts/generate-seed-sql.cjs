const https = require("https");
const fs = require("fs");

const url = "https://pryufdtwxgmjacfinans.supabase.co/rest/v1/";
const key = "sb_publishable_DYY4wHqCU4yMhVMPOLxyCg_Cvfodmub";

function get(path) {
  return new Promise((resolve, reject) => {
    https.get(url + path, { headers: { apikey: key, Authorization: "Bearer " + key } }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

function esc(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return val;
  const s = String(val)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
  return `'${s}'`;
}

async function run() {
  console.log("Fetching from Supabase...");
  const categories = await get("categories?select=*");
  const products = await get("products?select=*");
  const orders = await get("orders?select=*");

  let sql = "USE kuickmart_db;\n\n";

  // Categories
  if (Array.isArray(categories) && categories.length > 0) {
    sql += `-- SEED CATEGORIES (${categories.length} rows)\n`;
    for (const c of categories) {
      sql += `INSERT INTO categories (id, tenant_slug, slug, name, icon, color, image) VALUES (${esc(c.id)}, ${esc("default")}, ${esc(c.slug || c.id)}, ${esc(c.name)}, ${esc(c.icon || "Store")}, ${esc(c.color || "#10B981")}, ${esc(c.image || "")}) ON DUPLICATE KEY UPDATE name=VALUES(name);\n`;
    }
    sql += "\n";
  }

  // Products
  if (Array.isArray(products) && products.length > 0) {
    sql += `-- SEED PRODUCTS (${products.length} rows)\n`;
    for (const p of products) {
      const cat = p.category || p.category_slug || p.subcategory || "Umum";
      const brand = p.brand || "Umum";
      const price = Number(p.price) || 0;
      const costPrice = Number(p.cost_price || (price * 0.8));
      const stock = Number(p.stock) || 0;
      const sold = Number(p.sold_count) || 0;
      const rating = Number(p.rating) || 4.9;
      const itemCode = p.item_code || p.barcode || p.id;

      sql += `INSERT INTO products (id, tenant_slug, item_code, name, category, brand, barcode, unit, price, cost_price, stock, min_stock, item_type, image, description, sold_count, rating) VALUES (${esc(p.id)}, ${esc("default")}, ${esc(itemCode)}, ${esc(p.name)}, ${esc(cat)}, ${esc(brand)}, ${esc(p.barcode || "")}, ${esc(p.unit || "Pcs")}, ${price}, ${costPrice}, ${stock}, 5, ${esc("Barang")}, ${esc(p.image || "")}, ${esc(p.description || "")}, ${sold}, ${rating}) ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), stock=VALUES(stock);\n`;
    }
    sql += "\n";
  }

  // Orders
  if (Array.isArray(orders) && orders.length > 0) {
    sql += `-- SEED ORDERS (${orders.length} rows)\n`;
    for (const o of orders) {
      const total = Number(o.total_amount || o.final_amount) || 0;
      const itemsStr = typeof o.items === "string" ? o.items : JSON.stringify(o.items || []);
      sql += `INSERT INTO orders (id, tenant_slug, order_number, customer_name, customer_phone, customer_address, total_amount, discount_amount, tax_amount, final_amount, payment_method, payment_status, order_status, cashier_name, items) VALUES (${esc(o.id)}, ${esc("default")}, ${esc(o.order_number || o.id)}, ${esc(o.customer_name || "Pelanggan Toko")}, ${esc(o.customer_phone || "")}, ${esc(o.customer_address || "")}, ${total}, 0, 0, ${total}, ${esc(o.payment_method || "CASH")}, ${esc(o.payment_status || "COMPLETED")}, ${esc(o.order_status || "COMPLETED")}, ${esc(o.cashier_name || "Kasir")}, ${esc(itemsStr)}) ON DUPLICATE KEY UPDATE order_number=VALUES(order_number);\n`;
    }
  }

  fs.writeFileSync("scripts/seed_supabase_data.sql", sql);
  console.log(`✅ File generated: ${products.length} products, ${categories.length} categories, ${orders.length} orders!`);
}

run().catch(console.error);
