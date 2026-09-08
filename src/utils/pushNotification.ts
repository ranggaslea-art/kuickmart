/**
 * KuickMart Express - Web Push Notification Utility (PWA & VAPID)
 * Memungkinkan pendaftaran token perangkat pelanggan dan penerimaan pesan promosi
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Cek apakah perangkat saat ini sudah berlangganan push notification
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.warn('[PushNotification] Error checking subscription:', err);
    return null;
  }
}

/**
 * Mendaftarkan perangkat pengguna ke Push Service & Backend KuickMart
 */
export async function subscribeUserToPush(customerName?: string): Promise<{
  success: boolean;
  subscription?: PushSubscription;
  error?: string;
}> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      error: 'Browser atau perangkat ini belum mendukung Web Push Notifications.',
    };
  }

  try {
    // 1. Minta izin notifikasi ke pengguna
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: permission === 'denied'
          ? 'Izin notifikasi ditolak di pengaturan browser Anda. Silakan izinkan melalui ikon gembok di bilah alamat.'
          : 'Izin notifikasi belum disetujui.',
      };
    }

    // 2. Ambil Public VAPID Key dari backend
    const configRes = await fetch('/api/push/config');
    const configData = await configRes.json();

    if (!configData.publicKey) {
      return {
        success: false,
        error: 'Public VAPID key belum siap dari server.',
      };
    }

    // 3. Daftarkan Service Worker dan buat Push Subscription
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(configData.publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });
    }

    // 4. Kirim data token perangkat ke backend KuickMart
    const userAgent = navigator.userAgent.toLowerCase();
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    let deviceType = 'Web Browser';
    if (isStandalone) {
      deviceType = 'PWA Terpasang di Layar Utama';
    } else if (/android/.test(userAgent)) {
      deviceType = 'Android Mobile';
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
      deviceType = 'iOS Safari Mobile';
    }

    const subJson = subscription.toJSON();
    const payload = {
      subscription: subJson,
      customerName: customerName || 'Pelanggan KuickMart',
      deviceType,
    };

    const saveRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!saveRes.ok) {
      const errorJson = await saveRes.json().catch(() => ({}));
      throw new Error(errorJson.error || 'Gagal menyimpan langganan ke server toko');
    }

    // Mainkan audio nada notifikasi ramah
    playNotificationChime();

    return {
      success: true,
      subscription,
    };
  } catch (err: any) {
    console.error('[PushNotification] Subscribe failed:', err);
    return {
      success: false,
      error: err.message || 'Gagal mengaktifkan notifikasi.',
    };
  }
}

/**
 * Berhenti menerima notifikasi push pada perangkat saat ini
 */
export async function unsubscribeUserFromPush(): Promise<{ success: boolean; error?: string }> {
  try {
    const subscription = await getCurrentPushSubscription();
    if (!subscription) {
      return { success: true };
    }

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    // Hapus dari database server
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal berhenti berlangganan' };
  }
}

/**
 * Memainkan nada bel/chime notifikasi ramah menggunakan Web Audio API
 */
export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Chord dua nada yang menyenangkan (E5 -> B5)
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.setValueAtTime(987.77, now + 0.12);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.48);
  } catch (e) {
    // Audio context may be restricted by browser policy
  }
}
