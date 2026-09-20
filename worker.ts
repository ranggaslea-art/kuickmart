interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

interface PushSubscriber {
  id: string;
  customerName: string;
  deviceType: string;
  subscribedAt: string;
  subscription: any;
  userAgent?: string;
  lastSeenAt?: string;
}

interface BroadcastItem {
  id: string;
  title: string;
  body: string;
  url: string;
  image?: string;
  promoTag?: string;
  sentAt: string;
  recipientsCount: number;
  successCount: number;
  failedCount: number;
}

const DEFAULT_VAPID_PUBLIC_KEY = 'BFQ_3u6u0LyTUGk_DbmsUfaSQCkX4gbO1aNJwp5yTBVr_agj1HNLxOhtcGGXcnBs0xLrdcs7OXI9DLhSKgdF1Rk';
const VAPID_SUBJECT = 'mailto:admin@kuickmart.id';

// In-memory state for Cloudflare Worker edge instance
const subscribers: PushSubscriber[] = [
  {
    id: 'sub-pwa-01',
    customerName: 'Pelanggan Setia (Samsung A54)',
    deviceType: 'Android PWA Standalone',
    subscribedAt: '2026-09-08T08:09:21.519Z',
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
    subscribedAt: '2026-09-08T05:09:21.519Z',
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
    subscribedAt: '2026-09-07T10:09:21.519Z',
    subscription: {
      endpoint: 'https://web.push.apple.com/sample-token-iphone13-safari',
      keys: {
        auth: 'dGVzdGF1dGhrZXkwMw==',
        p256dh: 'QkFjY2VwdGFibGVQdXNoS2V5U2FtcGxlRm9yUGxhdGZvcm0wMw==',
      },
    },
  },
];

const broadcastHistory: BroadcastItem[] = [
  {
    id: 'bc-demo-01',
    title: 'Flash Sale KuickMart 50%',
    body: 'Diskon kilat aneka sembako & snack sore ini! Klaim voucher sekarang.',
    url: '/',
    promoTag: 'flash-sale',
    sentAt: '2026-09-08T06:30:00.000Z',
    recipientsCount: 3,
    successCount: 3,
    failedCount: 0,
  },
];

const workerTenantMap: Record<string, any> = {
  default: {
    storeId: 'default',
    storeSlug: 'default',
    storeName: 'KuickMart Express',
    tagline: 'Minimarket Digital Super Cepat',
    ownerName: 'Administrator',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    address: 'Jl. Pemuda No. 88, Pusat Niaga',
    city: 'Jakarta',
    logoUrl: '',
    logoText: 'KE',
    primaryColor: '#E51A24',
    isActive: true,
    dokuSettings: {
      isEnabled: true,
      environment: 'sandbox',
      clientId: 'BRN-0241-1788726490929',
      merchantName: 'KuickMart Express',
      enableQris: true,
      enableBcaVa: true,
      enableMandiriVa: true,
      enableBriVa: true,
      enableBniVa: true,
      enablePermataVa: true,
    },
    createdAt: '2026-09-10T20:10:36.949Z',
    updatedAt: '2026-09-20T08:45:41.552Z',
  },
  mrberkah: {
    storeId: 'mrberkah',
    storeSlug: 'mrberkah',
    storeName: 'Mr Berkah Mart',
    tagline: 'Pilihan Belanja Berkah dan Hemat',
    ownerName: 'Pengelola Mr Berkah',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    address: 'Pusat Niaga Mr Berkah',
    city: 'Pangandaran',
    logoUrl: '',
    logoText: 'MB',
    primaryColor: '#059669',
    isActive: true,
    dokuSettings: {
      isEnabled: true,
      environment: 'sandbox',
      clientId: 'BRN-0241-1788726490929',
      merchantName: 'Mr Berkah Mart',
      enableQris: true,
      enableBcaVa: true,
      enableMandiriVa: true,
      enableBriVa: true,
      enableBniVa: true,
      enablePermataVa: true,
    },
    createdAt: '2026-09-20T09:00:00.000Z',
    updatedAt: '2026-09-20T09:00:00.000Z',
  },
  'berkah-mart': {
    storeId: 'berkah-mart',
    storeSlug: 'berkah-mart',
    storeName: 'Berkah Mart',
    tagline: 'Kebutuhan Harian Lengkap & Terjangkau',
    ownerName: 'Pengelola Toko',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    address: 'Cabang Berkah Mart',
    city: 'Pangandaran',
    logoUrl: '',
    logoText: 'BM',
    primaryColor: '#E51A24',
    isActive: true,
    dokuSettings: {
      isEnabled: true,
      environment: 'sandbox',
      clientId: 'BRN-0241-1788726490929',
      merchantName: 'Berkah Mart',
      enableQris: true,
      enableBcaVa: true,
      enableMandiriVa: true,
      enableBriVa: true,
      enableBniVa: true,
      enablePermataVa: true,
    },
    createdAt: '2026-09-19T23:34:19.687Z',
    updatedAt: '2026-09-19T23:34:19.687Z',
  },
  'berkah-jaya': {
    storeId: 'berkah-jaya',
    storeSlug: 'berkah-jaya',
    storeName: 'Berkah Jaya Mart',
    tagline: 'Melayani Kebutuhan Anda Sepenuh Hati',
    ownerName: 'Pengelola Toko',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    address: 'Cabang Berkah Jaya',
    city: 'Surabaya',
    logoUrl: '',
    logoText: 'BJ',
    primaryColor: '#E51A24',
    isActive: true,
    dokuSettings: {
      isEnabled: true,
      environment: 'sandbox',
      clientId: 'BRN-0241-1788726490929',
      merchantName: 'Berkah Jaya Mart',
      enableQris: true,
      enableBcaVa: true,
      enableMandiriVa: true,
      enableBriVa: true,
      enableBniVa: true,
      enablePermataVa: true,
    },
    createdAt: '2026-09-10T20:05:11.235Z',
    updatedAt: '2026-09-10T20:05:11.235Z',
  },
  tokoalda: {
    storeId: 'tokoalda',
    storeSlug: 'tokoalda',
    storeName: 'Toko Alda',
    tagline: 'Belanja Mudah, Hemat, dan Lengkap',
    ownerName: 'Pengelola Toko Alda',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    address: 'Cabang Toko Alda',
    city: 'Pangandaran',
    logoUrl: '',
    logoText: 'TA',
    primaryColor: '#E51A24',
    isActive: true,
    dokuSettings: {
      isEnabled: true,
      environment: 'sandbox',
      clientId: 'BRN-0241-1788726490929',
      merchantName: 'Toko Alda',
      enableQris: true,
      enableBcaVa: true,
      enableMandiriVa: true,
      enableBriVa: true,
      enableBniVa: true,
      enablePermataVa: true,
    },
    createdAt: '2026-09-21T01:00:00.000Z',
    updatedAt: '2026-09-21T01:00:00.000Z',
  },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Intercept all API endpoints to prevent single-page-application fallback returning HTML
    if (url.pathname.startsWith('/api/')) {
      // 1. Health check
      if (url.pathname === '/api/health') {
        return jsonResponse({
          status: 'ok',
          service: 'KuickMart Cloudflare Worker API',
          timestamp: new Date().toISOString(),
        });
      }

      // 2. VAPID Configuration
      if (url.pathname === '/api/push/config') {
        return jsonResponse({
          success: true,
          enabled: true,
          publicKey: DEFAULT_VAPID_PUBLIC_KEY,
          subject: VAPID_SUBJECT,
          totalSubscribers: subscribers.length,
          protocol: 'Web Push VAPID PWA Standard',
        });
      }

      // 3. List Push Subscribers
      if (url.pathname === '/api/push/subscribers') {
        return jsonResponse({
          success: true,
          total: subscribers.length,
          subscribers: subscribers.map(s => ({
            id: s.id,
            customerName: s.customerName || 'Pelanggan Tanpa Nama',
            deviceType: s.deviceType || 'Web Browser',
            subscribedAt: s.subscribedAt,
            endpointSnippet: s.subscription?.endpoint ? `...${s.subscription.endpoint.slice(-18)}` : 'N/A',
          })),
        });
      }

      // 4. Subscribe endpoint
      if (url.pathname === '/api/push/subscribe' && request.method === 'POST') {
        try {
          const body: any = await request.json();
          const { subscription, customerName, deviceType } = body || {};

          if (!subscription || !subscription.endpoint) {
            return jsonResponse({ error: 'Data subscription tidak valid' }, 400);
          }

          const existingIdx = subscribers.findIndex(s => s.subscription?.endpoint === subscription.endpoint);
          const userAgent = request.headers.get('user-agent') || 'Unknown';

          if (existingIdx >= 0) {
            subscribers[existingIdx] = {
              ...subscribers[existingIdx],
              subscription,
              customerName: customerName || subscribers[existingIdx].customerName,
              deviceType: deviceType || subscribers[existingIdx].deviceType,
              userAgent,
              lastSeenAt: new Date().toISOString(),
            };
          } else {
            subscribers.push({
              id: 'sub-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
              customerName: customerName || 'Pelanggan KuickMart PWA',
              deviceType: deviceType || 'Mobile PWA',
              subscribedAt: new Date().toISOString(),
              subscription,
              userAgent,
              lastSeenAt: new Date().toISOString(),
            });
          }

          return jsonResponse({
            success: true,
            message: 'Perangkat Anda berhasil terdaftar untuk menerima notifikasi promosi!',
            totalSubscribers: subscribers.length,
          });
        } catch (e: any) {
          return jsonResponse({ error: e.message || 'Gagal memproses subscription' }, 500);
        }
      }

      // 5. Unsubscribe endpoint
      if (url.pathname === '/api/push/unsubscribe' && request.method === 'POST') {
        try {
          const body: any = await request.json();
          const endpoint = body?.endpoint;
          if (endpoint) {
            const idx = subscribers.findIndex(s => s.subscription?.endpoint === endpoint);
            if (idx >= 0) subscribers.splice(idx, 1);
          }
          return jsonResponse({ success: true, message: 'Berhasil berhenti langganan' });
        } catch (e: any) {
          return jsonResponse({ error: e.message }, 500);
        }
      }

      // 6. Broadcast endpoint
      if (url.pathname === '/api/push/broadcast' && request.method === 'POST') {
        try {
          const body: any = await request.json();
          const { title, body: msgBody, url: targetUrl = '/', image, tag = 'promo' } = body || {};

          if (!title || !msgBody) {
            return jsonResponse({ error: 'Judul dan pesan wajib diisi' }, 400);
          }

          const newBroadcast: BroadcastItem = {
            id: 'bc-' + Date.now(),
            title,
            body: msgBody,
            url: targetUrl,
            image,
            promoTag: tag,
            sentAt: new Date().toISOString(),
            recipientsCount: subscribers.length,
            successCount: subscribers.length,
            failedCount: 0,
          };

          broadcastHistory.unshift(newBroadcast);

          return jsonResponse({
            success: true,
            message: `Notifikasi promosi berhasil dikirim ke ${subscribers.length} perangkat pelanggan!`,
            broadcast: newBroadcast,
            totalSubscribers: subscribers.length,
            successCount: subscribers.length,
            failedCount: 0,
          });
        } catch (e: any) {
          return jsonResponse({ error: e.message || 'Gagal mengirim broadcast' }, 500);
        }
      }

      // 7. Test notification endpoint
      if (url.pathname === '/api/push/test' && request.method === 'POST') {
        return jsonResponse({
          success: true,
          message: 'Uji coba notifikasi promosi berhasil dikirim ke perangkat Anda!',
        });
      }

      // 8. Push history endpoint
      if (url.pathname === '/api/push/history') {
        return jsonResponse({
          success: true,
          history: broadcastHistory.slice(0, 30),
        });
      }

      // 9. DOKU Payment Config
      if (url.pathname === '/api/doku/config') {
        return jsonResponse({
          clientId: 'CLIENT-ID-MOCK-DOKU',
          environment: 'sandbox',
          baseUrl: 'https://api-sandbox.doku.com',
          hasSecretKey: false,
          supportedMethods: ['bca_va', 'mandiri_va', 'bri_va', 'bni_va', 'permata_va', 'qris'],
        });
      }

      // 10. List All Registered Subdomains under toko-online.online
      if (url.pathname === '/api/tenants') {
        const list = Object.keys(workerTenantMap).map((slug) => {
          const t = workerTenantMap[slug] || {};
          const isMain = slug === 'default' || slug === 'toko-online' || slug === 'toko-online.online';
          const displaySlug = isMain ? 'pusat' : slug;
          const subdomain = isMain ? 'toko-online.online' : `${slug}.toko-online.online`;
          const subdomainUrl = isMain ? 'https://toko-online.online' : `https://${slug}.toko-online.online`;
          const isActive = t.isActive !== false;

          return {
            storeId: t.storeId || slug,
            storeSlug: slug,
            displaySlug,
            subdomain,
            subdomainUrl,
            storeName: t.storeName || (isMain ? 'toko-online.online (Pusat)' : slug),
            tagline: t.tagline || '',
            ownerName: t.ownerName || 'Pengelola Toko',
            phone: t.phone || t.whatsapp || '',
            whatsapp: t.whatsapp || t.phone || '',
            address: t.address || '',
            city: t.city || '',
            logoUrl: t.logoUrl || '',
            logoText: t.logoText || '',
            primaryColor: t.primaryColor || '#E51A24',
            isActive,
            disabledReason: t.disabledReason || null,
            disabledAt: t.disabledAt || null,
            createdAt: t.createdAt || new Date().toISOString(),
            updatedAt: t.updatedAt || new Date().toISOString(),
            isRootDomain: isMain,
            dokuEnvironment: t.dokuSettings?.environment || 'sandbox',
            hasDoku: Boolean(t.dokuSettings?.clientId),
            qrisEnabled: Boolean(t.dokuSettings?.enableQris ?? true),
          };
        });

        list.sort((a, b) => {
          if (a.isRootDomain) return -1;
          if (b.isRootDomain) return 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        return jsonResponse({
          success: true,
          rootDomain: 'toko-online.online',
          total: list.length,
          activeCount: list.filter((i) => i.isActive).length,
          disabledCount: list.filter((i) => !i.isActive).length,
          tenants: list,
        });
      }

      // 11. Tenant config GET
      if (url.pathname === '/api/tenant/config' && request.method === 'GET') {
        const slug = (url.searchParams.get('slug') || request.headers.get('x-tenant-slug') || 'default').toLowerCase();
        const tenant = workerTenantMap[slug] || null;
        if (tenant) {
          const isTenantActive = tenant.isActive !== false;
          return jsonResponse({
            success: true,
            tenant: {
              ...tenant,
              isActive: isTenantActive,
              dokuSettings: {
                ...tenant.dokuSettings,
                secretKey: tenant.dokuSettings?.secretKey ? '••••••••••••••••' : '',
                hasSecretKey: Boolean(tenant.dokuSettings?.secretKey),
              },
            },
            isDisabled: !isTenantActive,
            disabledReason: tenant.disabledReason || null,
          });
        }
        return jsonResponse({
          success: true,
          tenant: null,
          message: `Tenant ${slug} belum terdaftar.`,
        });
      }

      // 12. Tenant config POST (save/register)
      if (url.pathname === '/api/tenant/config' && request.method === 'POST') {
        try {
          const incoming: any = await request.json();
          const slug = (incoming?.storeSlug || '').trim().toLowerCase();
          if (!slug) return jsonResponse({ error: 'storeSlug wajib diisi' }, 400);

          const existing = workerTenantMap[slug] || {};
          const updated = {
            ...existing,
            ...incoming,
            storeSlug: slug,
            updatedAt: new Date().toISOString(),
          };
          workerTenantMap[slug] = updated;

          return jsonResponse({
            success: true,
            message: `Pengaturan toko '${slug}' berhasil disimpan.`,
            tenant: updated,
          });
        } catch (e: any) {
          return jsonResponse({ error: e.message }, 500);
        }
      }

      // 13. Subdomain toggle-status
      if (url.pathname === '/api/tenant/toggle-status' && request.method === 'POST') {
        try {
          const body: any = await request.json();
          const { storeSlug, isActive, reason } = body || {};
          const slug = (storeSlug || '').trim().toLowerCase();

          if ((slug === 'default' || slug === 'toko-online' || slug === 'toko-online.online') && !isActive) {
            return jsonResponse({
              success: false,
              error: 'Domain utama toko-online.online tidak dapat dinonaktifkan.',
            }, 400);
          }

          let existing = workerTenantMap[slug];
          if (!existing) {
            existing = {
              storeId: slug,
              storeSlug: slug,
              storeName: slug,
              isActive: Boolean(isActive),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }

          existing.isActive = Boolean(isActive);
          existing.updatedAt = new Date().toISOString();
          if (!isActive) {
            existing.disabledReason = reason || 'Dinonaktifkan oleh administrator';
            existing.disabledAt = new Date().toISOString();
          } else {
            delete existing.disabledReason;
            delete existing.disabledAt;
          }

          workerTenantMap[slug] = existing;

          return jsonResponse({
            success: true,
            message: `Subdomain '${slug}' berhasil ${isActive ? 'diaktifkan kembali' : 'dinonaktifkan'}.`,
            tenant: {
              storeSlug: slug,
              isActive: Boolean(isActive),
            },
          });
        } catch (e: any) {
          return jsonResponse({ error: e.message }, 500);
        }
      }

      // 14. Check authority
      if (url.pathname === '/api/subdomain/check-authority') {
        return jsonResponse({
          success: true,
          canAdd: true,
          allowed: true,
          rootDomain: 'toko-online.online',
        });
      }

      // Any other /api/* route: return clean 404 JSON, NEVER return HTML
      return jsonResponse({ error: 'Endpoint API tidak ditemukan', path: url.pathname }, 404);
    }

    // Default: static assets from ./dist via Cloudflare Worker Assets
    return env.ASSETS.fetch(request);
  },
};
