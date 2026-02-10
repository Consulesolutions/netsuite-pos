// Shared types between frontend and backend

// ============== User & Auth ==============

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  locationId?: string;
  registerId?: string;
}

export type UserRole = 'admin' | 'manager' | 'cashier';

export interface AuthResponse {
  user: User;
  token: string;
  location?: Location;
  register?: Register;
  shift?: Shift;
}

// ============== Location & Register ==============

export interface Location {
  id: string;
  netsuiteId: string;
  name: string;
  subsidiary: string;
  address?: string;
  isActive: boolean;
}

export interface Register {
  id: string;
  name: string;
  locationId: string;
  isActive: boolean;
}

export interface Shift {
  id: string;
  registerId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  openingBalance: number;
  closingBalance?: number;
  expectedCash?: number;
  variance?: number;
  status: ShiftStatus;
}

export type ShiftStatus = 'open' | 'closed';

// ============== Items & Inventory ==============

export interface Item {
  id: string;
  netsuiteId: string;
  sku: string;
  name: string;
  description?: string;
  barcode?: string;
  category?: string;
  basePrice: number;
  cost?: number;
  taxRate?: number;
  trackInventory: boolean;
  isActive: boolean;
  imageUrl?: string;
  unit?: string;
  requiresWeight?: boolean;
}

export interface InventoryLevel {
  itemId: string;
  locationId: string;
  quantityOnHand: number;
  quantityAvailable: number;
  quantityCommitted: number;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  color?: string;
  imageUrl?: string;
  sortOrder: number;
}

// ============== Customers ==============

export interface Customer {
  id: string;
  netsuiteId?: string;
  email?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  priceLevel?: string;
  creditLimit?: number;
  balance: number;
  loyaltyPoints: number;
  taxExempt?: boolean;
  notes?: string;
}

// ============== Cart ==============

export interface CartItem {
  id: string;
  itemId: string;
  item: Item;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  lineTotal: number;
  notes?: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  customerId?: string;
  customer?: Customer;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  notes?: string;
  onHold: boolean;
  holdName?: string;
}

// ============== Transactions ==============

export interface Transaction {
  id: string;
  netsuiteId?: string;
  type: TransactionType;
  status: TransactionStatus;
  registerId: string;
  locationId: string;
  userId: string;
  customerId?: string;
  customer?: Customer;
  items: TransactionItem[];
  payments: Payment[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  notes?: string;
  receiptNumber: string;
  createdAt: Date;
  syncedAt?: Date;
}

export type TransactionType = 'sale' | 'return' | 'exchange';
export type TransactionStatus = 'pending' | 'completed' | 'voided' | 'synced';

export interface TransactionItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

// ============== Payments ==============

export interface Payment {
  id: string;
  transactionId?: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  cardLast4?: string;
  cardBrand?: string;
  giftCardNumber?: string;
  changeAmount?: number;
  processedAt: Date;
  status: PaymentStatus;
}

export type PaymentMethod = 'cash' | 'card' | 'gift_card' | 'store_credit' | 'check' | 'other';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// ============== Gift Cards ==============

export interface GiftCard {
  id: string;
  number: string;
  balance: number;
  originalAmount: number;
  expiresAt?: Date;
  isActive: boolean;
  customerId?: string;
}

// ============== Sync ==============

export interface SyncStatus {
  lastSync: Date | null;
  isSyncing: boolean;
  pendingCount: number;
  errorCount: number;
  isOnline: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: 'transaction' | 'customer' | 'inventory_adjustment';
  action: 'create' | 'update' | 'delete';
  data: unknown;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  createdAt: Date;
}

// ============== Reports ==============

export interface DailySummary {
  date: string;
  totalSales: number;
  transactionCount: number;
  averageTransaction: number;
  paymentBreakdown: Record<PaymentMethod, number>;
  topItems: TopItem[];
  hourlyBreakdown: HourlySales[];
}

export interface TopItem {
  itemId: string;
  itemName: string;
  quantity: number;
  revenue: number;
}

export interface HourlySales {
  hour: number;
  sales: number;
  count: number;
}

export interface CashierSummary {
  userId: string;
  userName: string;
  transactionCount: number;
  totalSales: number;
  voidCount: number;
  refundCount: number;
}

// ============== Hardware ==============

export interface PrinterConfig {
  type: 'usb' | 'network' | 'bluetooth';
  vendorId?: number;
  productId?: number;
  ipAddress?: string;
  port?: number;
  name: string;
  paperWidth: 58 | 80;
}

export interface CardTerminalConfig {
  provider: 'stripe' | 'square' | 'manual';
  connectionType: 'bluetooth' | 'usb' | 'network';
  deviceId?: string;
}

export interface HardwareStatus {
  printer: 'connected' | 'disconnected' | 'error';
  scanner: 'connected' | 'disconnected';
  cashDrawer: 'connected' | 'disconnected';
  cardTerminal: 'connected' | 'disconnected' | 'error';
  scale: 'connected' | 'disconnected';
}

// ============== API ==============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============== NetSuite ==============

export interface NetSuiteConfig {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
  restletUrl: string;
}

export interface NetSuiteTransaction {
  internalId: string;
  tranId: string;
  type: string;
  status: string;
  entity?: string;
  total: number;
  tranDate: string;
}
