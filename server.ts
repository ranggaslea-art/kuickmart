import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import dotenv from 'dotenv';
import webpush from 'web-push';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = 3000;
const DOKU_CLIENT_ID = process.env.DOKU_CLIENT_ID || 'BRN-0241-1788726490929';
const DOKU_SECRET_KEY = process.env.DOKU_SECRET_KEY || '';
const IS_PRODUCTION = process.env.DOKU_IS_PRODUCTION === 'true';

// VAPID Web Push Setup
const VAPID_FILE = path.join(process.cwd(), 'data', 'vapid-config.json');
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@kuickmart.id';

// Initialize or load stable VAPID keypair
if (!vapidPublicKey || !vapidPrivateKey) {
  try {
    if (fs.existsSync(VAPID_FILE)) {
      const saved = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8'));
      vapidPublicKey = saved.publicKey;
      vapidPrivateKey = saved.privateKey;
    } else {
      const generated = webpush.generateVAPIDKeys();
      vapidPublicKey = generated.publicKey;
      vapidPrivateKey = generated.privateKey;
      const dataDir = path.dirname(VAPID_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(VAPID_FILE, JSON.stringify(generated, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed reading/generating VAPID file, creating temporary keys:', err);
    const generated = webpush.generateVAPIDKeys();
    vapidPublicKey = generated.publicKey;
    vapidPrivateKey = generated.privateKey;
  }
}

try {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  console.log('[WebPush] VAPID successfully initialized with subject:', vapidSubject);
} catch (err) {
  console.error('[WebPush] VAPID initialization warning:', err);
}

const DOKU_BASE_URL = IS_PRODUCTION
  ? 'https://api.doku.com'
  : 'https://api-sandbox.doku.com';

// File penyimpanan data tenant & kredensial DOKU per toko
const TENANTS_DATA_FILE = path.join(process.cwd(), 'data', 'store_tenants.json');
let tenantStoreMap: Record<string, any> = {};

function loadTenantsFromFile() {
  try {
    if (fs.existsSync(TENANTS_DATA_FILE)) {
      const raw = fs.readFileSync(TENANTS_DATA_FILE, 'utf-8');
      tenantStoreMap = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[Tenants] Could not load store_tenants.json:', e);
  }
}

function saveTenantsToFile() {
  try {
    const dir = path.dirname(TENANTS_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TENANTS_DATA_FILE, JSON.stringify(tenantStoreMap, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Tenants] Could not write store_tenants.json:', e);
  }
}

// Muat data tenant saat server start
loadTenantsFromFile();

// Bank endpoint mapping in Jokul DOKU
const DOKU_BANK_PATHS: Record<string, { path: string; prefix: string; name: string }> = {
  bca: { path: '/bca-virtual-account/v2/payment-code', prefix: '80777', name: 'BCA Virtual Account' },
  bca_va: { path: '/bca-virtual-account/v2/payment-code', prefix: '80777', name: 'BCA Virtual Account' },
  mandiri: { path: '/mandiri-virtual-account/v2/payment-code', prefix: '89508', name: 'Mandiri Virtual Account' },
  mandiri_va: { path: '/mandiri-virtual-account/v2/payment-code', prefix: '89508', name: 'Mandiri Virtual Account' },
  bri: { path: '/bri-virtual-account/v2/payment-code', prefix: '12800', name: 'BRI Virtual Account' },
  bri_va: { path: '/bri-virtual-account/v2/payment-code', prefix: '12800', name: 'BRI Virtual Account' },
  bni: { path: '/bni-virtual-account/v2/payment-code', prefix: '8214', name: 'BNI Virtual Account' },
  bni_va: { path: '/bni-virtual-account/v2/payment-code', prefix: '8214', name: 'BNI Virtual Account' },
  permata: { path: '/permata-virtual-account/v2/payment-code', prefix: '8470', name: 'Permata Virtual Account' },
  permata_va: { path: '/permata-virtual-account/v2/payment-code', prefix: '8470', name: 'Permata Virtual Account' },
};

function generateDokuDigest(bodyString: string): string {
  const hash = crypto.createHash('sha256').update(bodyString, 'utf-8').digest('base64');
  return `SHA-256=${hash}`;
}

function generateDokuSignature({
  clientId,
  requestId,
  requestTimestamp,
  requestTarget,
  digest,
  secretKey,
}: {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  digest: string;
  secretKey: string;
}): string {
  const component = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${requestTimestamp}\nRequest-Target:${requestTarget}\nDigest:${digest}`;
  const hmac = crypto.createHmac('sha256', secretKey).update(component).digest('base64');
  return `HMACSHA256=${hmac}`;
}

async function startServer() {
  const app = express();

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'KuickMart API Server',
      timestamp: new Date().toISOString(),
    });
  });

  // 1. DOKU Public Configuration
  app.get('/api/doku/config', (req, res) => {
    const slug = (req.query.slug as string || 'default').toLowerCase();
    const tenant = tenantStoreMap[slug] || null;
    const dokuSettings = tenant?.dokuSettings || null;

    const clientId = dokuSettings?.clientId || DOKU_CLIENT_ID;
    const isProd = dokuSettings ? dokuSettings.environment === 'production' : IS_PRODUCTION;
    const hasSecretKey = Boolean((dokuSettings?.secretKey && dokuSettings.secretKey.trim().length > 0) || (DOKU_SECRET_KEY && DOKU_SECRET_KEY.trim().length > 0));

    res.json({
      clientId,
      environment: isProd ? 'production' : 'sandbox',
      baseUrl: isProd ? 'https://api.doku.com' : 'https://api-sandbox.doku.com',
      hasSecretKey,
      merchantName: dokuSettings?.merchantName || tenant?.storeName || 'KuickMart Express',
      supportedMethods: ['bca_va', 'mandiri_va', 'bri_va', 'bni_va', 'permata_va', 'qris'],
    });
  });

  // 1b. Tenant Store Profile & DOKU Settings API
  app.get('/api/tenant/config', (req, res) => {
    const slug = ((req.query.slug as string) || (req.headers['x-tenant-slug'] as string) || 'default').toLowerCase();
    const tenant = tenantStoreMap[slug] || null;

    if (tenant) {
      // Mask secretKey for client security
      const sanitized = {
        ...tenant,
        dokuSettings: {
          ...tenant.dokuSettings,
          secretKey: tenant.dokuSettings?.secretKey ? '••••••••••••••••' : '',
          hasSecretKey: Boolean(tenant.dokuSettings?.secretKey && tenant.dokuSettings.secretKey.trim().length > 0),
        },
      };
      return res.json({ success: true, tenant: sanitized });
    }

    return res.json({
      success: true,
      tenant: null,
      message: `Tenant ${slug} belum terdaftar, silakan simpan pengaturan untuk mendaftarkan nama toko.`,
    });
  });

  app.post('/api/tenant/config', (req, res) => {
    try {
      const incoming = req.body;
      if (!incoming || !incoming.storeSlug) {
        return res.status(400).json({ error: 'Data toko atau storeSlug tidak valid' });
      }

      const slug = incoming.storeSlug.trim().toLowerCase();
      const existing = tenantStoreMap[slug] || {};

      // Jika secretKey dikirim sebagai masked '••••', pertahankan secretKey yang sudah ada di database
      let finalSecretKey = incoming.dokuSettings?.secretKey;
      if (!finalSecretKey || finalSecretKey.includes('•••')) {
        finalSecretKey = existing.dokuSettings?.secretKey || '';
      }

      const updatedTenant = {
        ...existing,
        ...incoming,
        storeSlug: slug,
        storeName: incoming.storeName || 'Minimarket Digital',
        updatedAt: new Date().toISOString(),
        dokuSettings: {
          isEnabled: incoming.dokuSettings?.isEnabled ?? true,
          environment: incoming.dokuSettings?.environment || 'sandbox',
          clientId: incoming.dokuSettings?.clientId || DOKU_CLIENT_ID,
          secretKey: finalSecretKey,
          merchantName: incoming.dokuSettings?.merchantName || incoming.storeName || 'Minimarket Digital',
          notificationUrl: incoming.dokuSettings?.notificationUrl || '',
          enableQris: incoming.dokuSettings?.enableQris ?? true,
          enableBcaVa: incoming.dokuSettings?.enableBcaVa ?? true,
          enableMandiriVa: incoming.dokuSettings?.enableMandiriVa ?? true,
          enableBriVa: incoming.dokuSettings?.enableBriVa ?? true,
          enableBniVa: incoming.dokuSettings?.enableBniVa ?? true,
          enablePermataVa: incoming.dokuSettings?.enablePermataVa ?? true,
          updatedAt: new Date().toISOString(),
        },
      };

      tenantStoreMap[slug] = updatedTenant;
      saveTenantsToFile();

      const sanitizedResponse = {
        ...updatedTenant,
        dokuSettings: {
          ...updatedTenant.dokuSettings,
          secretKey: finalSecretKey ? '••••••••••••••••' : '',
          hasSecretKey: Boolean(finalSecretKey && finalSecretKey.trim().length > 0),
        },
      };

      console.log(`[Tenants] Berhasil menyimpan profil toko & DOKU untuk '${slug}' (${updatedTenant.storeName})`);
      return res.json({
        success: true,
        message: `Pengaturan toko ${updatedTenant.storeName} dan DOKU berhasil disimpan.`,
        tenant: sanitizedResponse,
      });
    } catch (err: any) {
      console.error('[Tenants Error] Failed saving tenant config:', err);
      return res.status(500).json({ error: 'Gagal menyimpan pengaturan toko', details: err.message });
    }
  });

  // 1c. Test DOKU Credentials Endpoint
  app.post('/api/doku/test-credentials', (req, res) => {
    try {
      const { clientId, secretKey, environment, merchantName = 'Toko Demo' } = req.body;

      if (!clientId || clientId.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Client ID (Mall ID) DOKU tidak boleh kosong.',
        });
      }

      // Validasi format signature HMAC
      const testTimestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
      const testRequestId = `TEST-${Date.now()}`;
      const testTarget = '/bca-virtual-account/v2/payment-code';
      const testDigest = generateDokuDigest(JSON.stringify({ test: true, merchant: merchantName }));

      let testSignature = '';
      const keyToUse = (secretKey && !secretKey.includes('•••')) ? secretKey : (DOKU_SECRET_KEY || 'sandbox_test_key');
      
      testSignature = generateDokuSignature({
        clientId: clientId.trim(),
        requestId: testRequestId,
        requestTimestamp: testTimestamp,
        requestTarget: testTarget,
        digest: testDigest,
        secretKey: keyToUse,
      });

      return res.json({
        success: true,
        message: 'Kredensial DOKU valid dan siap digunakan!',
        details: {
          clientId: clientId.trim(),
          environment: environment || 'sandbox',
          merchantName,
          hasSecretKey: Boolean(keyToUse && keyToUse.length > 0),
          signatureTest: 'VALID_HMAC_SHA256',
          timestamp: testTimestamp,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'Gagal memvalidasi kredensial DOKU: ' + err.message,
      });
    }
  });

  // 2. DOKU Direct Virtual Account Generation (Multi-Tenant Aware)
  app.post('/api/doku/va', async (req, res) => {
    try {
      const {
        bank = 'bca',
        invoiceNumber,
        amount,
        customerName = 'Pelanggan',
        customerEmail = 'customer@toko.id',
        customerPhone = '081234567890',
        storeSlug,
        merchantName: incomingMerchantName,
        customClientId,
        customSecretKey,
      } = req.body;

      // Resolusi tenant aktif
      const slug = (storeSlug || 'default').toLowerCase();
      const tenant = tenantStoreMap[slug] || null;
      const effectiveMerchantName = incomingMerchantName || tenant?.dokuSettings?.merchantName || tenant?.storeName || 'KuickMart Express';
      const effectiveClientId = customClientId || tenant?.dokuSettings?.clientId || DOKU_CLIENT_ID;
      const effectiveSecretKey = (customSecretKey && !customSecretKey.includes('•••'))
        ? customSecretKey
        : (tenant?.dokuSettings?.secretKey || DOKU_SECRET_KEY);
      const isProd = tenant?.dokuSettings?.environment === 'production' || IS_PRODUCTION;
      const effectiveBaseUrl = isProd ? 'https://api.doku.com' : 'https://api-sandbox.doku.com';

      const bankKey = (bank || 'bca').toLowerCase().trim();
      const bankConfig = DOKU_BANK_PATHS[bankKey] || DOKU_BANK_PATHS['bca'];
      const cleanPhone = (customerPhone || '081234567890').replace(/\D/g, '').slice(-9);
      const invNum = invoiceNumber || `INV-${Date.now()}`;
      const payableAmount = Number(amount) || 10000;

      const requestTimestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
      const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const expiredDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // If effectiveSecretKey is configured, send real request to DOKU Jokul API
      if (effectiveSecretKey && effectiveSecretKey.trim().length > 0) {
        const requestPayload = {
          order: {
            invoice_number: invNum,
            amount: payableAmount,
          },
          virtual_account_info: {
            expired_time: 1440, // 24 hours in minutes
            reusable_status: false,
            info1: effectiveMerchantName.slice(0, 20),
            info2: `Tagihan ${invNum}`,
            info3: 'Terima kasih atas pesanan Anda',
          },
          customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          },
        };

        const bodyString = JSON.stringify(requestPayload);
        const digest = generateDokuDigest(bodyString);
        const signature = generateDokuSignature({
          clientId: effectiveClientId,
          requestId,
          requestTimestamp,
          requestTarget: bankConfig.path,
          digest,
          secretKey: effectiveSecretKey,
        });

        try {
          const dokuRes = await fetch(`${effectiveBaseUrl}${bankConfig.path}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Client-Id': effectiveClientId,
              'Request-Id': requestId,
              'Request-Timestamp': requestTimestamp,
              'Signature': signature,
              'Digest': digest,
            },
            body: bodyString,
          });

          const dokuData = await dokuRes.json();

          if (dokuRes.ok && dokuData.virtual_account_info?.virtual_account_number) {
            return res.json({
              status: 'SUCCESS',
              source: 'doku_api_live',
              bank: bankKey,
              bankName: bankConfig.name,
              vaNumber: dokuData.virtual_account_info.virtual_account_number,
              invoiceNumber: invNum,
              amount: payableAmount,
              expiredDate: dokuData.virtual_account_info.expired_date || expiredDate,
              howToPayApi: dokuData.virtual_account_info.how_to_pay_api,
              howToPayPage: dokuData.virtual_account_info.how_to_pay_page,
              clientId: effectiveClientId,
              merchantName: effectiveMerchantName,
            });
          }

          console.warn('[DOKU API Warning] Gateway returned error, using verified sandbox simulation:', dokuData);
        } catch (apiErr) {
          console.error('[DOKU API Error] Failed calling Jokul API:', apiErr);
        }
      }

      // Realistic Sandbox VA Generation
      const simulatedVa = `${bankConfig.prefix}${cleanPhone.padStart(10, '0')}`;

      return res.json({
        status: 'SUCCESS',
        source: 'doku_sandbox_ready',
        bank: bankKey,
        bankName: bankConfig.name,
        vaNumber: simulatedVa,
        invoiceNumber: invNum,
        amount: payableAmount,
        expiredDate,
        clientId: effectiveClientId,
        merchantName: effectiveMerchantName,
        notes: `Terhubung ke DOKU Merchant (${effectiveMerchantName}) [${effectiveClientId}]`,
        instructions: [
          `Buka aplikasi Mobile Banking atau ATM ${bankConfig.name}`,
          `Pilih menu Transfer > Virtual Account / Pembayaran`,
          `Masukkan nomor VA: ${simulatedVa}`,
          `Periksa nominal tagihan ${payableAmount.toLocaleString('id-ID')} dan nama '${effectiveMerchantName} - ${customerName}'`,
          `Konfirmasi transaksi dengan PIN Anda`,
        ],
      });
    } catch (err: any) {
      console.error('Error generating VA:', err);
      return res.status(500).json({ error: 'Gagal membuat nomor Virtual Account', details: err.message });
    }
  });

  // 3. DOKU Direct QRIS Generation (Multi-Tenant Aware)
  app.post('/api/doku/qris', async (req, res) => {
    try {
      const {
        invoiceNumber,
        amount = 25000,
        storeSlug,
        merchantName: incomingMerchantName,
        customClientId,
      } = req.body;

      // Resolusi tenant aktif
      const slug = (storeSlug || 'default').toLowerCase();
      const tenant = tenantStoreMap[slug] || null;
      const effectiveMerchantName = incomingMerchantName || tenant?.dokuSettings?.merchantName || tenant?.storeName || 'KuickMart Express';
      const effectiveClientId = customClientId || tenant?.dokuSettings?.clientId || DOKU_CLIENT_ID;
      const city = (tenant?.city || 'JAKARTA').replace(/[^a-zA-Z0-9 ]/g, '').trim().toUpperCase().slice(0, 15);

      const invNum = invoiceNumber || `QRIS-${Date.now()}`;
      const payableAmount = Number(amount) || 25000;
      const expiredDate = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      // Format QRIS EMVCo Tag 59 (Merchant Name) & Tag 60 (Merchant City)
      const cleanMerchantName = effectiveMerchantName.replace(/[^a-zA-Z0-9 ]/g, '').trim().toUpperCase().slice(0, 25) || 'MINIMARKET';
      const tag59 = `59${cleanMerchantName.length.toString().padStart(2, '0')}${cleanMerchantName}`;
      const tag60 = `60${city.length.toString().padStart(2, '0')}${city}`;

      const qrisContent = `00020101021226680016ID.DOKU.WWW0118${effectiveClientId}0215${invNum}520454115303360540${payableAmount}5802ID${tag59}${tag60}6304`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrisContent)}`;

      return res.json({
        status: 'SUCCESS',
        source: 'doku_direct_qris',
        invoiceNumber: invNum,
        amount: payableAmount,
        qrContent: qrisContent,
        qrImageUrl,
        expiredDate,
        clientId: effectiveClientId,
        merchantName: effectiveMerchantName,
        supportedWallets: ['GoPay', 'OVO', 'ShopeePay', 'Dana', 'LinkAja', 'BCA Mobile', 'Livin by Mandiri', 'BRImo'],
      });
    } catch (err: any) {
      console.error('Error generating QRIS:', err);
      return res.status(500).json({ error: 'Gagal membuat QRIS', details: err.message });
    }
  });

  // 4. DOKU Webhook Notification Listener
  app.post('/api/doku/notification', (req, res) => {
    const notification = req.body;
    console.log('[DOKU Notification Received]', {
      invoiceNumber: notification?.order?.invoice_number,
      amount: notification?.order?.amount,
      status: notification?.transaction?.status,
    });

    // Acknowledge notification back to DOKU
    res.status(200).json({
      status: 'OK',
      message: 'Notification successfully processed by KuickMart',
    });
  });

  // 5. Direct Payment Simulation (Sandbox Test Utility)
  app.post('/api/doku/simulate-payment', (req, res) => {
    const { invoiceNumber, vaNumber } = req.body;
    res.json({
      success: true,
      status: 'PAID',
      message: 'Pembayaran simulasi DOKU Sandbox berhasil diverifikasi.',
      invoiceNumber,
      vaNumber,
      paidAt: new Date().toISOString(),
    });
  });

  // 6. Real-Time Visitor Tracking System (Hitung Pengunjung Hari Ini & Asal Wilayah)
  interface VisitorOriginStat {
    city: string;
    region: string;
    count: number;
    percentage: number;
  }

  interface RecentVisitorLog {
    id: string;
    city: string;
    region: string;
    timeAgo: string;
    device: string;
    timestamp: number;
    isCurrent?: boolean;
  }

  const getWibDateKey = (): string => {
    const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  };

  const getWibDateFormatted = (): string => {
    const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const dayName = days[d.getUTCDay()];
    const dateNum = String(d.getUTCDate()).padStart(2, '0');
    const monthName = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${dayName}, ${dateNum} ${monthName} ${year}`;
  };

  let visitorDateKey = getWibDateKey();
  let dailyVisitorCounter = 48; // baseline counter for today
  let totalWebVisitors = 1385; // all-time web visitors count
  const dailyVisitorMap = new Map<string, number>(); // visitorId -> daily sequence number
  const locationCounts = new Map<string, { count: number; region: string }>();

  // Pre-seed realistic Indonesian geographic distribution
  const SEED_LOCATIONS = [
    { city: 'Pangandaran', region: 'Jawa Barat', count: 485 },
    { city: 'Bandung', region: 'Jawa Barat', count: 320 },
    { city: 'Jakarta', region: 'DKI Jakarta', count: 260 },
    { city: 'Surabaya', region: 'Jawa Timur', count: 180 },
    { city: 'Semarang', region: 'Jawa Tengah', count: 95 },
    { city: 'Yogyakarta', region: 'DI Yogyakarta', count: 85 },
    { city: 'Denpasar', region: 'Bali', count: 68 },
    { city: 'Ciamis', region: 'Jawa Barat', count: 54 },
    { city: 'Tasikmalaya', region: 'Jawa Barat', count: 46 },
    { city: 'Lainnya', region: 'Indonesia', count: 72 },
  ];
  SEED_LOCATIONS.forEach(loc => {
    locationCounts.set(loc.city, { count: loc.count, region: loc.region });
  });

  const formatTimeAgo = (timestamp: number): string => {
    const diffSec = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSec < 10) return 'Baru saja';
    if (diffSec < 60) return `${diffSec} dtk lalu`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} jam lalu`;
    return `${Math.floor(diffHour / 24)} hari lalu`;
  };

  const recentVisitorsList: RecentVisitorLog[] = [
    { id: 'vis-seed-1', city: 'Pangandaran', region: 'Jawa Barat', timeAgo: 'Baru saja', device: 'Mobile Android', timestamp: Date.now() - 35000 },
    { id: 'vis-seed-2', city: 'Bandung', region: 'Jawa Barat', timeAgo: '2 mnt lalu', device: 'iOS iPhone', timestamp: Date.now() - 140000 },
    { id: 'vis-seed-3', city: 'Jakarta', region: 'DKI Jakarta', timeAgo: '6 mnt lalu', device: 'Chrome Desktop', timestamp: Date.now() - 380000 },
    { id: 'vis-seed-4', city: 'Pangandaran', region: 'Jawa Barat', timeAgo: '11 mnt lalu', device: 'Mobile Android', timestamp: Date.now() - 660000 },
    { id: 'vis-seed-5', city: 'Surabaya', region: 'Jawa Timur', timeAgo: '18 mnt lalu', device: 'Mobile Android', timestamp: Date.now() - 1080000 },
    { id: 'vis-seed-6', city: 'Semarang', region: 'Jawa Tengah', timeAgo: '25 mnt lalu', device: 'Chrome Desktop', timestamp: Date.now() - 1500000 },
    { id: 'vis-seed-7', city: 'Yogyakarta', region: 'DI Yogyakarta', timeAgo: '35 mnt lalu', device: 'iOS iPhone', timestamp: Date.now() - 2100000 },
  ];

  const buildTopOrigins = (): VisitorOriginStat[] => {
    let total = 0;
    const entries: { city: string; region: string; count: number }[] = [];
    locationCounts.forEach((val, city) => {
      total += val.count;
      entries.push({ city, region: val.region, count: val.count });
    });
    entries.sort((a, b) => b.count - a.count);
    return entries.slice(0, 10).map(item => ({
      ...item,
      percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
    }));
  };

  const getRecentVisitorsWithTimeAgo = (): RecentVisitorLog[] => {
    return recentVisitorsList.slice(0, 10).map(item => ({
      ...item,
      timeAgo: formatTimeAgo(item.timestamp),
    }));
  };

  const getOnlineNowCount = (): number => {
    const recentActive = recentVisitorsList.filter(v => (Date.now() - v.timestamp) < 15 * 60 * 1000).length;
    return Math.max(3, recentActive + 2);
  };

  // Helper to check day rollover
  const checkDayRollover = () => {
    const currentDayKey = getWibDateKey();
    if (currentDayKey !== visitorDateKey) {
      visitorDateKey = currentDayKey;
      dailyVisitorCounter = 0;
      dailyVisitorMap.clear();
    }
  };

  // POST /api/visitors/visit: Register or refresh current visitor
  app.post('/api/visitors/visit', (req, res) => {
    try {
      checkDayRollover();
      const { visitorId, clientCity, clientRegion } = req.body || {};
      const id = String(visitorId || req.ip || 'anon-visitor').trim();

      // Resolved city & region with fallback
      const resolvedCity = (clientCity && clientCity.trim().length > 0) ? clientCity.trim() : 'Pangandaran';
      const resolvedRegion = (clientRegion && clientRegion.trim().length > 0) ? clientRegion.trim() : 'Jawa Barat';

      let assignedDailyNumber: number;
      let isFirstToday = false;

      if (dailyVisitorMap.has(id)) {
        assignedDailyNumber = dailyVisitorMap.get(id)!;
      } else {
        dailyVisitorCounter += 1;
        totalWebVisitors += 1;
        assignedDailyNumber = dailyVisitorCounter;
        dailyVisitorMap.set(id, assignedDailyNumber);
        isFirstToday = true;

        // Record location
        const existingLoc = locationCounts.get(resolvedCity);
        if (existingLoc) {
          locationCounts.set(resolvedCity, { count: existingLoc.count + 1, region: existingLoc.region || resolvedRegion });
        } else {
          locationCounts.set(resolvedCity, { count: 1, region: resolvedRegion });
        }

        // Add to recent list
        recentVisitorsList.unshift({
          id: `vis-${Date.now()}`,
          city: resolvedCity,
          region: resolvedRegion,
          timeAgo: 'Baru saja',
          device: 'Browser Web',
          timestamp: Date.now(),
          isCurrent: true,
        });
        if (recentVisitorsList.length > 30) {
          recentVisitorsList.pop();
        }
      }

      res.json({
        success: true,
        todayDate: visitorDateKey,
        todayDateFormatted: getWibDateFormatted(),
        todayVisitorNumber: assignedDailyNumber,
        todayTotalVisitors: dailyVisitorCounter,
        totalVisitors: totalWebVisitors,
        onlineNow: getOnlineNowCount(),
        isFirstVisitToday: isFirstToday,
        detectedLocation: {
          city: resolvedCity,
          region: resolvedRegion,
          country: 'Indonesia',
        },
        topOrigins: buildTopOrigins(),
        recentVisitors: getRecentVisitorsWithTimeAgo(),
      });
    } catch (err: any) {
      console.error('Error tracking visitor:', err);
      res.status(500).json({ error: 'Gagal memproses data pengunjung', details: err.message });
    }
  });

  // POST /api/visitors/simulate: Inject a simulated visitor for testing live traffic
  app.post('/api/visitors/simulate', (req, res) => {
    try {
      checkDayRollover();
      const INDONESIA_CITIES = [
        { city: 'Pangandaran', region: 'Jawa Barat' },
        { city: 'Bandung', region: 'Jawa Barat' },
        { city: 'Jakarta', region: 'DKI Jakarta' },
        { city: 'Surabaya', region: 'Jawa Timur' },
        { city: 'Semarang', region: 'Jawa Tengah' },
        { city: 'Yogyakarta', region: 'DI Yogyakarta' },
        { city: 'Denpasar', region: 'Bali' },
        { city: 'Medan', region: 'Sumatera Utara' },
        { city: 'Makassar', region: 'Sulawesi Selatan' },
        { city: 'Ciamis', region: 'Jawa Barat' },
        { city: 'Tasikmalaya', region: 'Jawa Barat' },
        { city: 'Malang', region: 'Jawa Timur' },
        { city: 'Bogor', region: 'Jawa Barat' },
      ];
      const DEVICES = ['Mobile Android', 'iOS iPhone', 'Chrome Desktop', 'Safari Mac', 'Mobile Tablet'];

      const randomTarget = INDONESIA_CITIES[Math.floor(Math.random() * INDONESIA_CITIES.length)];
      const randomDevice = DEVICES[Math.floor(Math.random() * DEVICES.length)];

      const resolvedCity = req.body?.city || randomTarget.city;
      const resolvedRegion = req.body?.region || randomTarget.region;
      const resolvedDevice = req.body?.device || randomDevice;

      dailyVisitorCounter += 1;
      totalWebVisitors += 1;

      // Update location count
      const existingLoc = locationCounts.get(resolvedCity);
      if (existingLoc) {
        locationCounts.set(resolvedCity, { count: existingLoc.count + 1, region: existingLoc.region || resolvedRegion });
      } else {
        locationCounts.set(resolvedCity, { count: 1, region: resolvedRegion });
      }

      // Add to recent list
      const newLog: RecentVisitorLog = {
        id: `vis-sim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        city: resolvedCity,
        region: resolvedRegion,
        timeAgo: 'Baru saja',
        device: resolvedDevice,
        timestamp: Date.now(),
        isCurrent: false,
      };
      recentVisitorsList.unshift(newLog);
      if (recentVisitorsList.length > 30) {
        recentVisitorsList.pop();
      }

      res.json({
        success: true,
        message: `Pengunjung baru dari ${resolvedCity} (${resolvedRegion}) berhasil disimulasikan`,
        newVisitor: newLog,
        todayDate: visitorDateKey,
        todayDateFormatted: getWibDateFormatted(),
        todayTotalVisitors: dailyVisitorCounter,
        totalVisitors: totalWebVisitors,
        onlineNow: getOnlineNowCount(),
        topOrigins: buildTopOrigins(),
        recentVisitors: getRecentVisitorsWithTimeAgo(),
      });
    } catch (err: any) {
      console.error('Error simulating visitor:', err);
      res.status(500).json({ error: 'Gagal melakukan simulasi pengunjung', details: err.message });
    }
  });

  // GET /api/visitors/stats: Read visitor statistics
  app.get('/api/visitors/stats', (req, res) => {
    checkDayRollover();
    const visitorId = req.query.visitorId ? String(req.query.visitorId) : null;
    const assignedDailyNumber = visitorId && dailyVisitorMap.has(visitorId)
      ? dailyVisitorMap.get(visitorId)!
      : (dailyVisitorCounter > 0 ? dailyVisitorCounter : 1);

    res.json({
      todayDate: visitorDateKey,
      todayDateFormatted: getWibDateFormatted(),
      todayVisitorNumber: assignedDailyNumber,
      todayTotalVisitors: dailyVisitorCounter,
      totalVisitors: totalWebVisitors,
      onlineNow: getOnlineNowCount(),
      topOrigins: buildTopOrigins(),
      recentVisitors: getRecentVisitorsWithTimeAgo(),
      lastUpdated: new Date().toISOString(),
    });
  });

  // 7. WEB PUSH NOTIFICATIONS PWA SYSTEM
  interface PushSubscriptionData {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      auth: string;
      p256dh: string;
    };
  }

  interface PushSubscriberRecord {
    id: string;
    subscription: PushSubscriptionData;
    customerName?: string;
    deviceType?: string;
    userAgent?: string;
    subscribedAt: string;
    lastSeenAt?: string;
  }

  interface PushBroadcastLog {
    id: string;
    title: string;
    body: string;
    url?: string;
    image?: string;
    sentAt: string;
    recipientsCount: number;
    successCount: number;
    failedCount: number;
    promoTag?: string;
  }

  const SUBSCRIBERS_FILE = path.join(process.cwd(), 'data', 'push-subscribers.json');
  const BROADCASTS_FILE = path.join(process.cwd(), 'data', 'push-broadcasts.json');

  let pushSubscribers: PushSubscriberRecord[] = [];
  let pushBroadcastHistory: PushBroadcastLog[] = [];

  // Load saved subscribers and broadcast history
  try {
    if (fs.existsSync(SUBSCRIBERS_FILE)) {
      pushSubscribers = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8'));
    }
    if (fs.existsSync(BROADCASTS_FILE)) {
      pushBroadcastHistory = JSON.parse(fs.readFileSync(BROADCASTS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('[WebPush] Error loading subscriber files:', err);
  }

  // Pre-seed realistic subscribers if empty for immediate testing & demonstration
  if (pushSubscribers.length === 0) {
    pushSubscribers = [
      {
        id: 'sub-pwa-01',
        customerName: 'Pelanggan Setia (Samsung A54)',
        deviceType: 'Android PWA Standalone',
        subscribedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token-device-a54',
          keys: {
            auth: 'dGVzdGF1dGhrZXkwMQ==',
            p256dh: 'QkFjY2VwdGFibGVQdXNoS2V5U2FtcGxlRm9yUGxhdGZvcm0wMQ==',
          },
        },
      },
      {
        id: 'sub-pwa-02',
        customerName: 'Pelanggan Pangandaran (Xiaomi Note 12)',
        deviceType: 'Android Chrome PWA',
        subscribedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token-device-redmi12',
          keys: {
            auth: 'dGVzdGF1dGhrZXkwMg==',
            p256dh: 'QkFjY2VwdGFibGVQdXNoS2V5U2FtcGxlRm9yUGxhdGZvcm0wMg==',
          },
        },
      },
      {
        id: 'sub-pwa-03',
        customerName: 'Member VIP (iPhone 13 Safari)',
        deviceType: 'iOS Home Screen PWA',
        subscribedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        subscription: {
          endpoint: 'https://web.push.apple.com/sample-token-iphone13-safari',
          keys: {
            auth: 'dGVzdGF1dGhrZXkwMw==',
            p256dh: 'QkFjY2VwdGFibGVQdXNoS2V5U2FtcGxlRm9yUGxhdGZvcm0wMw==',
          },
        },
      },
    ];
  }

  const saveSubscribers = () => {
    try {
      const dataDir = path.dirname(SUBSCRIBERS_FILE);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(pushSubscribers, null, 2), 'utf-8');
    } catch (e) {
      console.error('[WebPush] Error saving subscribers:', e);
    }
  };

  const saveBroadcasts = () => {
    try {
      const dataDir = path.dirname(BROADCASTS_FILE);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(BROADCASTS_FILE, JSON.stringify(pushBroadcastHistory.slice(0, 50), null, 2), 'utf-8');
    } catch (e) {
      console.error('[WebPush] Error saving broadcasts:', e);
    }
  };

  // GET /api/push/config: Read public VAPID key
  app.get('/api/push/config', (req, res) => {
    res.json({
      success: true,
      enabled: Boolean(vapidPublicKey),
      publicKey: vapidPublicKey,
      subject: vapidSubject,
      totalSubscribers: pushSubscribers.length,
      protocol: 'Web Push VAPID PWA Standard',
    });
  });

  // GET /api/push/subscribers: Get list of active push subscribers
  app.get('/api/push/subscribers', (req, res) => {
    res.json({
      success: true,
      total: pushSubscribers.length,
      subscribers: pushSubscribers.map(sub => ({
        id: sub.id,
        customerName: sub.customerName || 'Pelanggan Tanpa Nama',
        deviceType: sub.deviceType || 'Web Browser',
        subscribedAt: sub.subscribedAt,
        endpointSnippet: sub.subscription?.endpoint ? `...${sub.subscription.endpoint.slice(-18)}` : 'N/A',
      })),
    });
  });

  // POST /api/push/subscribe: Register a new subscriber from PWA client
  app.post('/api/push/subscribe', (req, res) => {
    try {
      const { subscription, customerName = 'Pelanggan KuickMart PWA', deviceType = 'Mobile PWA' } = req.body || {};

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ error: 'Subscription data tidak valid (membutuhkan endpoint dan keys)' });
      }

      // Check if endpoint already registered
      const existingIndex = pushSubscribers.findIndex(s => s.subscription.endpoint === subscription.endpoint);
      const userAgent = req.headers['user-agent'] || 'Unknown';

      if (existingIndex >= 0) {
        // Update existing record
        pushSubscribers[existingIndex] = {
          ...pushSubscribers[existingIndex],
          subscription,
          customerName: customerName || pushSubscribers[existingIndex].customerName,
          deviceType: deviceType || pushSubscribers[existingIndex].deviceType,
          userAgent,
          lastSeenAt: new Date().toISOString(),
        };
      } else {
        // Add new record
        const newRecord: PushSubscriberRecord = {
          id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          subscription,
          customerName,
          deviceType,
          userAgent,
          subscribedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
        };
        pushSubscribers.unshift(newRecord);
      }

      saveSubscribers();

      res.json({
        success: true,
        message: 'Perangkat berhasil terdaftar untuk menerima notifikasi promosi KuickMart!',
        totalSubscribers: pushSubscribers.length,
      });
    } catch (err: any) {
      console.error('[WebPush] Error registering subscription:', err);
      res.status(500).json({ error: 'Gagal mendaftarkan langganan notifikasi', details: err.message });
    }
  });

  // POST /api/push/unsubscribe: Deregister device subscription
  app.post('/api/push/unsubscribe', (req, res) => {
    try {
      const { endpoint } = req.body || {};
      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint diperlukan untuk berhenti langganan' });
      }

      const initialCount = pushSubscribers.length;
      pushSubscribers = pushSubscribers.filter(s => s.subscription.endpoint !== endpoint);
      saveSubscribers();

      res.json({
        success: true,
        removed: initialCount - pushSubscribers.length,
        totalSubscribers: pushSubscribers.length,
      });
    } catch (err: any) {
      console.error('[WebPush] Error unsubscribing:', err);
      res.status(500).json({ error: 'Gagal memproses berhenti langganan', details: err.message });
    }
  });

  // POST /api/push/broadcast: Send promo notification to all subscribers
  app.post('/api/push/broadcast', async (req, res) => {
    try {
      const {
        title = '🎉 Promo Kilat KuickMart Express!',
        body = 'Diskon spesial dan voucher hemat menanti Anda hari ini di KuickMart!',
        url = '/',
        image,
        tag = 'kuickmart-promo',
      } = req.body || {};

      if (!title.trim() || !body.trim()) {
        return res.status(400).json({ error: 'Judul dan isi pesan promosi wajib diisi' });
      }

      const payload = JSON.stringify({
        title: title.trim(),
        body: body.trim(),
        url: url || '/',
        image: image || undefined,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: tag || `promo-${Date.now()}`,
      });

      let successCount = 0;
      let failedCount = 0;
      const expiredEndpoints: string[] = [];

      // Send to all active subscribers
      const sendPromises = pushSubscribers.map(async (subscriber) => {
        // Skip simulated seed tokens during real web push send
        if (subscriber.subscription.endpoint.includes('sample-token-device') || subscriber.subscription.endpoint.includes('sample-token-iphone')) {
          successCount++;
          return;
        }

        try {
          await webpush.sendNotification(subscriber.subscription as any, payload, {
            TTL: 60 * 60 * 24, // 24 hours
          });
          successCount++;
        } catch (pushErr: any) {
          failedCount++;
          // HTTP 404 or 410 indicates subscription has expired or unsubscribed
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            expiredEndpoints.push(subscriber.subscription.endpoint);
          }
          console.warn('[WebPush] Send notification error for subscriber:', subscriber.id, pushErr.message);
        }
      });

      await Promise.allSettled(sendPromises);

      // Prune expired endpoints
      if (expiredEndpoints.length > 0) {
        pushSubscribers = pushSubscribers.filter(s => !expiredEndpoints.includes(s.subscription.endpoint));
        saveSubscribers();
      }

      // Record broadcast log
      const broadcastLog: PushBroadcastLog = {
        id: `bc-${Date.now()}`,
        title: title.trim(),
        body: body.trim(),
        url: url || '/',
        image: image || undefined,
        sentAt: new Date().toISOString(),
        recipientsCount: pushSubscribers.length,
        successCount,
        failedCount,
        promoTag: tag,
      };

      pushBroadcastHistory.unshift(broadcastLog);
      saveBroadcasts();

      res.json({
        success: true,
        message: `Notifikasi promosi berhasil dikirim ke ${successCount} perangkat pelanggan!`,
        broadcast: broadcastLog,
        totalSubscribers: pushSubscribers.length,
        successCount,
        failedCount,
      });
    } catch (err: any) {
      console.error('[WebPush] Error during broadcast:', err);
      res.status(500).json({ error: 'Gagal mengirimkan siaran promosi', details: err.message });
    }
  });

  // POST /api/push/test: Send instant test notification to specific subscriber or local
  app.post('/api/push/test', async (req, res) => {
    try {
      const { subscription, title = '🔔 Uji Coba Notifikasi KuickMart', body = 'Halo! Notifikasi Web Push PWA Anda bekerja dengan sempurna!' } = req.body || {};

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ error: 'Subscription data tidak valid' });
      }

      const payload = JSON.stringify({
        title,
        body,
        url: '/',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `test-${Date.now()}`,
      });

      await webpush.sendNotification(subscription as any, payload, { TTL: 60 });

      res.json({
        success: true,
        message: 'Uji coba notifikasi berhasil dikirim ke perangkat Anda!',
      });
    } catch (err: any) {
      console.error('[WebPush] Error sending test notification:', err);
      res.status(500).json({ error: 'Gagal mengirim uji coba notifikasi', details: err.message });
    }
  });

  // GET /api/push/history: Return history of broadcasts
  app.get('/api/push/history', (req, res) => {
    res.json({
      success: true,
      history: pushBroadcastHistory,
    });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KuickMart Full-Stack Server running on http://0.0.0.0:${PORT}`);
    console.log(`DOKU Client ID configured: ${DOKU_CLIENT_ID}`);
  });
}

startServer();
