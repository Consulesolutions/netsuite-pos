import { create } from 'zustand';
import type { Item, Category, InventoryLevel } from '../types';
import { db } from '../services/offlineDb';
import { api } from '../services/api';

interface ItemState {
  items: Item[];
  categories: Category[];
  inventory: Map<string, InventoryLevel>;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: string | null;
}

interface ItemActions {
  loadItems: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadInventory: (locationId: string) => Promise<void>;
  searchItems: (query: string) => void;
  setCategory: (categoryId: string | null) => void;
  getFilteredItems: () => Item[];
  getItemByBarcode: (barcode: string) => Item | undefined;
  getItemBySku: (sku: string) => Item | undefined;
  getInventoryLevel: (itemId: string) => InventoryLevel | undefined;
  refreshItems: () => Promise<void>;
}

export const useItemStore = create<ItemState & ItemActions>((set, get) => ({
  items: [],
  categories: [],
  inventory: new Map(),
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedCategory: null,

  loadItems: async () => {
    set({ isLoading: true, error: null });

    try {
      // First try to load from IndexedDB
      let items = await db.items.toArray();

      if (items.length === 0) {
        // If no local items, fetch from API
        const response = await api.get('/items');
        items = response.data.items;
        await db.items.bulkPut(items);
      }

      set({ items, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load items',
        isLoading: false,
      });
    }
  },

  loadCategories: async () => {
    try {
      let categories = await db.categories.toArray();

      if (categories.length === 0) {
        const response = await api.get('/categories');
        categories = response.data.categories;
        await db.categories.bulkPut(categories);
      }

      set({ categories });
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  },

  loadInventory: async (locationId: string) => {
    try {
      const response = await api.get(`/inventory/${locationId}`);
      const inventoryLevels: InventoryLevel[] = response.data.inventory;

      const inventoryMap = new Map<string, InventoryLevel>();
      inventoryLevels.forEach((level) => {
        inventoryMap.set(level.itemId, level);
      });

      await db.inventory.bulkPut(inventoryLevels);
      set({ inventory: inventoryMap });
    } catch (error) {
      // Load from local DB on failure
      const localInventory = await db.inventory
        .where('locationId')
        .equals(locationId)
        .toArray();

      const inventoryMap = new Map<string, InventoryLevel>();
      localInventory.forEach((level) => {
        inventoryMap.set(level.itemId, level);
      });

      set({ inventory: inventoryMap });
    }
  },

  searchItems: (query: string) => {
    set({ searchQuery: query.toLowerCase() });
  },

  setCategory: (categoryId: string | null) => {
    set({ selectedCategory: categoryId });
  },

  getFilteredItems: () => {
    const { items, searchQuery, selectedCategory } = get();

    return items.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery) ||
        item.sku.toLowerCase().includes(searchQuery) ||
        item.barcode?.toLowerCase().includes(searchQuery);

      const matchesCategory =
        !selectedCategory || item.category === selectedCategory;

      return matchesSearch && matchesCategory && item.isActive;
    });
  },

  getItemByBarcode: (barcode: string) => {
    const { items } = get();
    return items.find(
      (item) => item.barcode?.toLowerCase() === barcode.toLowerCase()
    );
  },

  getItemBySku: (sku: string) => {
    const { items } = get();
    return items.find(
      (item) => item.sku.toLowerCase() === sku.toLowerCase()
    );
  },

  getInventoryLevel: (itemId: string) => {
    const { inventory } = get();
    return inventory.get(itemId);
  },

  refreshItems: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get('/items');
      const items = response.data.items;

      await db.items.clear();
      await db.items.bulkPut(items);

      set({ items, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to refresh items',
        isLoading: false,
      });
    }
  },
}));
