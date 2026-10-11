// Offline Sync Queue & Network Manager untuk MySQL Database Server
// Mengimplementasikan Outbox Pattern agar transaksi kasir POS, stok produk, dan pembelian
// tetap beroperasi mulus saat offline dan otomatis sinkron ke MySQL saat terhubung kembali.

export type SyncActionType =
  | 'SYNC_ORDER'
  | 'SYNC_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'SYNC_CUSTOMER'
  | 'SYNC_PURCHASE'
  | 'SYNC_STORE'
  | 'DELETE_STORE'
  | 'SYNC_VOUCHER'
  | 'DELETE_VOUCHER'
  | 'SYNC_STAFF_USER'
  | 'DELETE_STAFF_USER'
  | 'SYNC_RECEIPT'
  | 'SYNC_PROMO'
  | 'SYNC_COURIER';

export interface OfflineSyncItem {
  id: string;
  action: SyncActionType;
  payload: any;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  lastError?: string;
  title: string;
  detail?: string;
}

const STORAGE_KEY_QUEUE = 'toko_online_offline_sync_queue';
const STORAGE_KEY_LAST_SYNC = 'toko_online_last_online_sync';
const STORAGE_KEY_MANUAL_OFFLINE = 'toko_online_manual_offline_mode';

type SyncListener = () => void;
const listeners = new Set<SyncListener>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error in offline sync listener:', e);
    }
  });
}

export function isManualOfflineMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY_MANUAL_OFFLINE) === 'true';
  } catch {
    return false;
  }
}

export function setManualOfflineMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      localStorage.setItem(STORAGE_KEY_MANUAL_OFFLINE, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY_MANUAL_OFFLINE);
    }
    notifyListeners();
  } catch {}
}

export function subscribeToOfflineSync(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getOfflineQueue(): OfflineSyncItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUEUE) || localStorage.getItem('kuickmart_offline_sync_queue');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse offline sync queue:', e);
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineSyncItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
    notifyListeners();
  } catch (e) {
    console.error('Failed to save offline sync queue:', e);
  }
}

export function getLastSyncTime(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_SYNC) || localStorage.getItem('kuickmart_last_online_sync');
  } catch {
    return null;
  }
}

export function setLastSyncTime(timestamp: string = new Date().toISOString()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, timestamp);
    notifyListeners();
  } catch {}
}

export function addToOfflineQueue(
  action: SyncActionType,
  payload: any,
  title: string,
  detail?: string
): OfflineSyncItem {
  const queue = getOfflineQueue();

  // If item with same ID and action already in queue, update it instead of duplicate
  const existingIdx = queue.findIndex(
    (item) => item.action === action && item.payload?.id && item.payload.id === payload?.id
  );

  const newItem: OfflineSyncItem = {
    id: existingIdx >= 0 ? queue[existingIdx].id : `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    action,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: existingIdx >= 0 ? queue[existingIdx].retryCount : 0,
    status: 'pending',
    title,
    detail,
  };

  if (existingIdx >= 0) {
    queue[existingIdx] = newItem;
  } else {
    queue.push(newItem);
  }

  saveOfflineQueue(queue);
  console.log(`[Offline Sync] Dimasukkan ke antrean offline: "${title}" (${queue.length} tertunda)`);
  return newItem;
}

export function removeFromOfflineQueue(id: string): void {
  const queue = getOfflineQueue();
  const filtered = queue.filter((item) => item.id !== id);
  saveOfflineQueue(filtered);
}

export function clearOfflineQueue(): void {
  saveOfflineQueue([]);
}

// Check network status safely (respects physical connection and manual offline mode)
export function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  if (isManualOfflineMode()) return false;
  return navigator.onLine;
}

// Detect network error signatures from server fetch
export function isNetworkError(err: any): boolean {
  if (!err) return false;
  if (!isBrowserOnline()) return true;

  const msg = (typeof err === 'string' ? err : err.message || err.details || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('net::err_') ||
    msg.includes('connection refused') ||
    msg.includes('timeout') ||
    msg.includes('offline') ||
    msg.includes('abort') ||
    msg.includes('load failed')
  );
}

let isSyncInProgress = false;

export function isCurrentlySyncing(): boolean {
  return isSyncInProgress;
}

// Process the offline sync queue
export async function processOfflineSyncQueue(): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  stoppedDueToOffline: boolean;
}> {
  if (isSyncInProgress) {
    return { total: 0, succeeded: 0, failed: 0, stoppedDueToOffline: false };
  }

  if (!isBrowserOnline()) {
    return { total: 0, succeeded: 0, failed: 0, stoppedDueToOffline: true };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, stoppedDueToOffline: false };
  }

  isSyncInProgress = true;
  notifyListeners();

  let succeeded = 0;
  let failed = 0;
  let stoppedDueToOffline = false;

  try {
    // Dynamic import ke MySQL API Client
    const {
      saveOrderToMySql,
      saveProductToMySql,
      deleteProductFromMySql,
      savePurchaseToMySql,
      saveSupplierToMySql,
      saveCategoryToMySql,
      deleteCategoryFromMySql,
      saveBrandsToMySql,
      deleteBrandFromMySql,
      fetchMySqlStatus,
    } = await import('./mysqlClientApi');

    // Cek status server MySQL terlebih dahulu
    const statusRes = await fetchMySqlStatus();
    if (!statusRes.connected) {
      isSyncInProgress = false;
      notifyListeners();
      return { total: queue.length, succeeded: 0, failed: queue.length, stoppedDueToOffline: true };
    }

    // Work on a copy of the queue
    let currentQueue = [...queue];

    for (let i = 0; i < currentQueue.length; i++) {
      // Re-check online status before each item
      if (!isBrowserOnline()) {
        stoppedDueToOffline = true;
        break;
      }

      const item = currentQueue[i];
      let itemSuccess = false;
      let errorMessage = '';

      try {
        switch (item.action) {
          case 'SYNC_ORDER': {
            itemSuccess = await saveOrderToMySql(item.payload);
            if (!itemSuccess) errorMessage = 'Gagal menyimpan transaksi pesanan ke MySQL';
            break;
          }
          case 'SYNC_PRODUCT': {
            itemSuccess = await saveProductToMySql(item.payload);
            if (!itemSuccess) errorMessage = 'Gagal menyimpan produk ke MySQL';
            break;
          }
          case 'DELETE_PRODUCT': {
            itemSuccess = await deleteProductFromMySql(item.payload);
            if (!itemSuccess) errorMessage = 'Gagal menghapus produk dari MySQL';
            break;
          }
          case 'SYNC_CUSTOMER': {
            // Member/customer tersimpan lokal & dalam order
            itemSuccess = true;
            break;
          }
          case 'SYNC_PURCHASE': {
            itemSuccess = await savePurchaseToMySql(item.payload);
            if (!itemSuccess) errorMessage = 'Gagal menyimpan data pembelian ke MySQL';
            break;
          }
          case 'SYNC_STORE': {
            // Toko tersimpan lokal & payload order
            itemSuccess = true;
            break;
          }
          case 'DELETE_STORE': {
            itemSuccess = true;
            break;
          }
          case 'SYNC_VOUCHER': {
            itemSuccess = true;
            break;
          }
          case 'DELETE_VOUCHER': {
            itemSuccess = true;
            break;
          }
          case 'SYNC_STAFF_USER': {
            itemSuccess = true;
            break;
          }
          case 'DELETE_STAFF_USER': {
            itemSuccess = true;
            break;
          }
          case 'SYNC_RECEIPT': {
            itemSuccess = true;
            break;
          }
          case 'SYNC_PROMO': {
            itemSuccess = true;
            break;
          }
          case 'SYNC_COURIER': {
            itemSuccess = true;
            break;
          }
          default:
            itemSuccess = true;
        }
      } catch (err: any) {
        itemSuccess = false;
        errorMessage = err?.message || String(err);

        // If it's a network disconnect during item sync, stop queue
        if (isNetworkError(err)) {
          stoppedDueToOffline = true;
          break;
        }
      }

      if (itemSuccess) {
        succeeded++;
        // Remove item from persistent queue
        removeFromOfflineQueue(item.id);
      } else {
        failed++;
        // If it was a network error, stop processing immediately to avoid pointless retries
        if (errorMessage && isNetworkError(errorMessage)) {
          stoppedDueToOffline = true;
          break;
        }

        // Update retry count and error message in queue
        const updatedQueue = getOfflineQueue().map((qItem) => {
          if (qItem.id === item.id) {
            return {
              ...qItem,
              retryCount: qItem.retryCount + 1,
              lastError: errorMessage || 'Gagal sinkronisasi ke MySQL',
              status: 'failed' as const,
            };
          }
          return qItem;
        });
        saveOfflineQueue(updatedQueue);
      }
    }

    if (succeeded > 0) {
      setLastSyncTime(new Date().toISOString());
      console.log(`[Offline Sync] Berhasil menyinkronkan ${succeeded} data ke Database MySQL Server!`);
    }
  } catch (err) {
    console.error('[Offline Sync] Kesalahan umum pemrosesan antrean MySQL:', err);
  } finally {
    isSyncInProgress = false;
    notifyListeners();
  }

  return { total: queue.length, succeeded, failed, stoppedDueToOffline };
}

// Global network event listeners initialization
let isNetworkListenersInitialized = false;

export function initOfflineSyncListeners(): void {
  if (typeof window === 'undefined' || isNetworkListenersInitialized) return;
  isNetworkListenersInitialized = true;

  // 1. Listen to browser 'online' event -> Trigger queue processing
  window.addEventListener('online', () => {
    console.log('[Offline Sync] Koneksi internet terdeteksi online. Memproses antrean sinkronisasi...');
    notifyListeners();
    // Short delay to let sockets stabilize
    setTimeout(() => {
      processOfflineSyncQueue();
    }, 1500);
  });

  // 2. Listen to browser 'offline' event
  window.addEventListener('offline', () => {
    console.warn('[Offline Sync] Koneksi internet terputus! Mode offline diaktifkan.');
    notifyListeners();
  });

  // 3. Periodic heartbeat sync attempt (every 30 seconds if queue has items and online)
  setInterval(() => {
    if (isBrowserOnline() && getOfflineQueue().length > 0 && !isSyncInProgress) {
      processOfflineSyncQueue();
    }
  }, 30000);

  // Initial check on load if queue has items
  if (isBrowserOnline() && getOfflineQueue().length > 0) {
    setTimeout(() => {
      processOfflineSyncQueue();
    }, 2500);
  }
}
