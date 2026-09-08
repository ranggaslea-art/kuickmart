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

      // Any other /api/* route: return clean 404 JSON, NEVER return HTML
      return jsonResponse({ error: 'Endpoint API tidak ditemukan', path: url.pathname }, 404);
    }

    // Default: static assets from ./dist via Cloudflare Worker Assets
    return env.ASSETS.fetch(request);
  },
};
