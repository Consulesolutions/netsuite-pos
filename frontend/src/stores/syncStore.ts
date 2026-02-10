import { create } from 'zustand';
import type { SyncStatus, SyncQueueItem } from '../types';
import { db } from '../services/offlineDb';
import { api } from '../services/api';

interface SyncState {
  status: SyncStatus;
  queue: SyncQueueItem[];
  errors: string[];
}

interface SyncActions {
  checkOnlineStatus: () => void;
  addToQueue: (item: Omit<SyncQueueItem, 'id' | 'attempts' | 'createdAt'>) => Promise<void>;
  processQueue: () => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  retryFailed: () => Promise<void>;
  clearErrors: () => void;
  syncItems: () => Promise<void>;
  syncCustomers: () => Promise<void>;
  syncInventory: () => Promise<void>;
  fullSync: () => Promise<void>;
}

export const useSyncStore = create<SyncState & SyncActions>((set, get) => ({
  status: {
    lastSync: null,
    isSyncing: false,
    pendingCount: 0,
    errorCount: 0,
    isOnline: navigator.onLine,
  },
  queue: [],
  errors: [],

  checkOnlineStatus: () => {
    const isOnline = navigator.onLine;
    set((state) => ({
      status: { ...state.status, isOnline },
    }));

    if (isOnline) {
      get().processQueue();
    }
  },

  addToQueue: async (item) => {
    const queueItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      attempts: 0,
      createdAt: new Date(),
    };

    await db.syncQueue.add(queueItem);

    set((state) => ({
      queue: [...state.queue, queueItem],
      status: {
        ...state.status,
        pendingCount: state.status.pendingCount + 1,
      },
    }));

    // Try to sync immediately if online
    if (get().status.isOnline) {
      get().processQueue();
    }
  },

  processQueue: async () => {
    const { status, queue } = get();

    if (!status.isOnline || status.isSyncing || queue.length === 0) {
      return;
    }

    set((state) => ({
      status: { ...state.status, isSyncing: true },
    }));

    try {
      const pendingItems = await db.syncQueue
        .where('attempts')
        .below(5)
        .toArray();

      for (const item of pendingItems) {
        try {
          switch (item.type) {
            case 'transaction':
              await api.post('/transactions/sync', item.data);
              break;
            case 'customer':
              await api.post('/customers/sync', item.data);
              break;
            case 'inventory_adjustment':
              await api.post('/inventory/sync', item.data);
              break;
          }

          await db.syncQueue.delete(item.id);
          set((state) => ({
            queue: state.queue.filter((q) => q.id !== item.id),
            status: {
              ...state.status,
              pendingCount: state.status.pendingCount - 1,
            },
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Sync failed';

          await db.syncQueue.update(item.id, {
            attempts: item.attempts + 1,
            lastAttempt: new Date(),
            error: errorMessage,
          });

          if (item.attempts + 1 >= 5) {
            set((state) => ({
              status: {
                ...state.status,
                errorCount: state.status.errorCount + 1,
              },
              errors: [...state.errors, `Failed to sync ${item.type}: ${errorMessage}`],
            }));
          }
        }
      }

      set((state) => ({
        status: {
          ...state.status,
          lastSync: new Date(),
          isSyncing: false,
        },
      }));
    } catch (error) {
      set((state) => ({
        status: { ...state.status, isSyncing: false },
        errors: [...state.errors, 'Sync process failed'],
      }));
    }
  },

  removeFromQueue: async (id: string) => {
    await db.syncQueue.delete(id);
    set((state) => ({
      queue: state.queue.filter((q) => q.id !== id),
      status: {
        ...state.status,
        pendingCount: Math.max(0, state.status.pendingCount - 1),
      },
    }));
  },

  retryFailed: async () => {
    const failedItems = await db.syncQueue
      .where('attempts')
      .aboveOrEqual(5)
      .toArray();

    for (const item of failedItems) {
      await db.syncQueue.update(item.id, { attempts: 0, error: undefined });
    }

    set((state) => ({
      status: { ...state.status, errorCount: 0 },
      errors: [],
    }));

    get().processQueue();
  },

  clearErrors: () => {
    set({ errors: [] });
  },

  syncItems: async () => {
    set((state) => ({
      status: { ...state.status, isSyncing: true },
    }));

    try {
      const response = await api.get('/items/sync');
      const items = response.data.items;

      await db.items.clear();
      await db.items.bulkAdd(items);

      set((state) => ({
        status: { ...state.status, isSyncing: false, lastSync: new Date() },
      }));
    } catch (error) {
      set((state) => ({
        status: { ...state.status, isSyncing: false },
        errors: [...state.errors, 'Failed to sync items'],
      }));
    }
  },

  syncCustomers: async () => {
    set((state) => ({
      status: { ...state.status, isSyncing: true },
    }));

    try {
      const response = await api.get('/customers/sync');
      const customers = response.data.customers;

      await db.customers.clear();
      await db.customers.bulkAdd(customers);

      set((state) => ({
        status: { ...state.status, isSyncing: false, lastSync: new Date() },
      }));
    } catch (error) {
      set((state) => ({
        status: { ...state.status, isSyncing: false },
        errors: [...state.errors, 'Failed to sync customers'],
      }));
    }
  },

  syncInventory: async () => {
    set((state) => ({
      status: { ...state.status, isSyncing: true },
    }));

    try {
      const response = await api.get('/inventory/sync');
      const inventory = response.data.inventory;

      await db.inventory.clear();
      await db.inventory.bulkAdd(inventory);

      set((state) => ({
        status: { ...state.status, isSyncing: false, lastSync: new Date() },
      }));
    } catch (error) {
      set((state) => ({
        status: { ...state.status, isSyncing: false },
        errors: [...state.errors, 'Failed to sync inventory'],
      }));
    }
  },

  fullSync: async () => {
    await get().syncItems();
    await get().syncCustomers();
    await get().syncInventory();
    await get().processQueue();
  },
}));

// Set up online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useSyncStore.getState().checkOnlineStatus();
  });

  window.addEventListener('offline', () => {
    useSyncStore.getState().checkOnlineStatus();
  });
}
