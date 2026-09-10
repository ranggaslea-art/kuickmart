import { useState, useEffect, useCallback } from 'react';
import {
  getOfflineQueue,
  getLastSyncTime,
  isBrowserOnline,
  isCurrentlySyncing,
  processOfflineSyncQueue,
  subscribeToOfflineSync,
  clearOfflineQueue,
  removeFromOfflineQueue,
  initOfflineSyncListeners,
  OfflineSyncItem,
} from '../lib/offlineSync';

export interface OfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  queue: OfflineSyncItem[];
  lastSyncTime: string | null;
  triggerSyncNow: () => Promise<{ total: number; succeeded: number; failed: number; stoppedDueToOffline: boolean }>;
  clearQueue: () => void;
  removeItem: (id: string) => void;
}

export function useOfflineSync(): OfflineSyncStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => isBrowserOnline());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => isCurrentlySyncing());
  const [queue, setQueue] = useState<OfflineSyncItem[]>(() => getOfflineQueue());
  const [lastSyncTime, setLastSync] = useState<string | null>(() => getLastSyncTime());

  // Initialize event listeners once
  useEffect(() => {
    initOfflineSyncListeners();

    const handleNetworkChange = () => {
      setIsOnline(isBrowserOnline());
    };

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    // Subscribe to internal offline sync events
    const unsubscribe = subscribeToOfflineSync(() => {
      setIsOnline(isBrowserOnline());
      setIsSyncing(isCurrentlySyncing());
      setQueue(getOfflineQueue());
      setLastSync(getLastSyncTime());
    });

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
      unsubscribe();
    };
  }, []);

  const triggerSyncNow = useCallback(async () => {
    return await processOfflineSyncQueue();
  }, []);

  const clearQueue = useCallback(() => {
    clearOfflineQueue();
  }, []);

  const removeItem = useCallback((id: string) => {
    removeFromOfflineQueue(id);
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount: queue.length,
    queue,
    lastSyncTime,
    triggerSyncNow,
    clearQueue,
    removeItem,
  };
}
