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
  isManualOfflineMode,
  setManualOfflineMode,
} from '../lib/offlineSync';

export interface OfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  isManualOffline: boolean;
  setManualOffline: (enabled: boolean) => void;
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
  const [isManualOffline, setIsManualOffline] = useState<boolean>(() => isManualOfflineMode());
  const [queue, setQueue] = useState<OfflineSyncItem[]>(() => getOfflineQueue());
  const [lastSyncTime, setLastSync] = useState<string | null>(() => getLastSyncTime());

  // Initialize event listeners once
  useEffect(() => {
    initOfflineSyncListeners();

    const handleNetworkChange = () => {
      setIsOnline(isBrowserOnline());
      setIsManualOffline(isManualOfflineMode());
    };

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    // Subscribe to internal offline sync events
    const unsubscribe = subscribeToOfflineSync(() => {
      setIsOnline(isBrowserOnline());
      setIsSyncing(isCurrentlySyncing());
      setIsManualOffline(isManualOfflineMode());
      setQueue(getOfflineQueue());
      setLastSync(getLastSyncTime());
    });

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
      unsubscribe();
    };
  }, []);

  const setManualOffline = useCallback((enabled: boolean) => {
    setManualOfflineMode(enabled);
    setIsManualOffline(enabled);
    setIsOnline(isBrowserOnline());
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
    isManualOffline,
    setManualOffline,
    pendingCount: queue.length,
    queue,
    lastSyncTime,
    triggerSyncNow,
    clearQueue,
    removeItem,
  };
}
