import Dexie, { Table } from 'dexie';
import type {
  Item,
  Category,
  Customer,
  Transaction,
  Cart,
  InventoryLevel,
  SyncQueueItem,
  GiftCard,
} from '../types';

class POSDatabase extends Dexie {
  items!: Table<Item, string>;
  categories!: Table<Category, string>;
  customers!: Table<Customer, string>;
  transactions!: Table<Transaction, string>;
  heldCarts!: Table<Cart, string>;
  inventory!: Table<InventoryLevel, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  giftCards!: Table<GiftCard, string>;

  constructor() {
    super('NetSuitePOS');

    this.version(1).stores({
      items: 'id, netsuiteId, sku, barcode, category, name, isActive',
      categories: 'id, name, parentId, sortOrder',
      customers: 'id, netsuiteId, email, phone, [firstName+lastName]',
      transactions: 'id, netsuiteId, type, status, customerId, createdAt, registerId, locationId',
      heldCarts: 'id, holdName, createdAt',
      inventory: '[itemId+locationId], itemId, locationId',
      syncQueue: 'id, type, action, attempts, createdAt',
      giftCards: 'id, number, customerId, isActive',
    });
  }
}

export const db = new POSDatabase();

// Database utility functions
export const dbUtils = {
  // Items
  async getItemByBarcode(barcode: string): Promise<Item | undefined> {
    return db.items.where('barcode').equals(barcode).first();
  },

  async getItemBySku(sku: string): Promise<Item | undefined> {
    return db.items.where('sku').equalsIgnoreCase(sku).first();
  },

  async searchItems(query: string): Promise<Item[]> {
    const lowerQuery = query.toLowerCase();
    return db.items
      .filter(
        (item) =>
          item.name.toLowerCase().includes(lowerQuery) ||
          item.sku.toLowerCase().includes(lowerQuery) ||
          item.barcode?.toLowerCase().includes(lowerQuery) ||
          false
      )
      .limit(50)
      .toArray();
  },

  async getItemsByCategory(categoryId: string): Promise<Item[]> {
    return db.items.where('category').equals(categoryId).toArray();
  },

  // Customers
  async searchCustomers(query: string): Promise<Customer[]> {
    const lowerQuery = query.toLowerCase();
    return db.customers
      .filter(
        (customer) =>
          customer.firstName.toLowerCase().includes(lowerQuery) ||
          customer.lastName.toLowerCase().includes(lowerQuery) ||
          customer.email?.toLowerCase().includes(lowerQuery) ||
          customer.phone?.includes(query) ||
          false
      )
      .limit(20)
      .toArray();
  },

  async getCustomerById(id: string): Promise<Customer | undefined> {
    return db.customers.get(id);
  },

  // Transactions
  async getRecentTransactions(limit = 50): Promise<Transaction[]> {
    return db.transactions
      .orderBy('createdAt')
      .reverse()
      .limit(limit)
      .toArray();
  },

  async getTransactionsByDate(startDate: Date, endDate: Date): Promise<Transaction[]> {
    return db.transactions
      .where('createdAt')
      .between(startDate, endDate)
      .toArray();
  },

  async getUnsyncedTransactions(): Promise<Transaction[]> {
    return db.transactions
      .where('status')
      .equals('completed')
      .filter((t) => !t.syncedAt)
      .toArray();
  },

  // Inventory
  async getInventoryLevel(itemId: string, locationId: string): Promise<InventoryLevel | undefined> {
    return db.inventory.get([itemId, locationId]);
  },

  async updateInventoryLevel(
    itemId: string,
    locationId: string,
    quantityChange: number
  ): Promise<void> {
    await db.inventory
      .where('[itemId+locationId]')
      .equals([itemId, locationId])
      .modify((level) => {
        level.quantityOnHand += quantityChange;
        level.quantityAvailable += quantityChange;
      });
  },

  // Sync Queue
  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    return db.syncQueue
      .where('attempts')
      .below(5)
      .toArray();
  },

  async getFailedSyncItems(): Promise<SyncQueueItem[]> {
    return db.syncQueue
      .where('attempts')
      .aboveOrEqual(5)
      .toArray();
  },

  // Held Carts
  async getHeldCarts(): Promise<Cart[]> {
    return db.heldCarts.toArray();
  },

  // Gift Cards
  async getGiftCardByNumber(number: string): Promise<GiftCard | undefined> {
    return db.giftCards.where('number').equals(number).first();
  },

  // Clear all data (for logout or reset)
  async clearAll(): Promise<void> {
    await Promise.all([
      db.items.clear(),
      db.categories.clear(),
      db.customers.clear(),
      db.transactions.clear(),
      db.heldCarts.clear(),
      db.inventory.clear(),
      db.giftCards.clear(),
    ]);
  },

  // Get database stats
  async getStats(): Promise<{
    items: number;
    customers: number;
    transactions: number;
    heldCarts: number;
    pendingSync: number;
  }> {
    const [items, customers, transactions, heldCarts, pendingSync] = await Promise.all([
      db.items.count(),
      db.customers.count(),
      db.transactions.count(),
      db.heldCarts.count(),
      db.syncQueue.where('attempts').below(5).count(),
    ]);

    return { items, customers, transactions, heldCarts, pendingSync };
  },

  // Export database for backup
  async exportData(): Promise<string> {
    const data = {
      items: await db.items.toArray(),
      categories: await db.categories.toArray(),
      customers: await db.customers.toArray(),
      transactions: await db.transactions.toArray(),
      heldCarts: await db.heldCarts.toArray(),
      inventory: await db.inventory.toArray(),
      syncQueue: await db.syncQueue.toArray(),
      giftCards: await db.giftCards.toArray(),
    };

    return JSON.stringify(data);
  },

  // Import database from backup
  async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);

    await db.transaction('rw', [db.items, db.categories, db.customers, db.transactions, db.heldCarts, db.inventory, db.syncQueue, db.giftCards], async () => {
      await this.clearAll();

      if (data.items) await db.items.bulkAdd(data.items);
      if (data.categories) await db.categories.bulkAdd(data.categories);
      if (data.customers) await db.customers.bulkAdd(data.customers);
      if (data.transactions) await db.transactions.bulkAdd(data.transactions);
      if (data.heldCarts) await db.heldCarts.bulkAdd(data.heldCarts);
      if (data.inventory) await db.inventory.bulkAdd(data.inventory);
      if (data.syncQueue) await db.syncQueue.bulkAdd(data.syncQueue);
      if (data.giftCards) await db.giftCards.bulkAdd(data.giftCards);
    });
  },
};
