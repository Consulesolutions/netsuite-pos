import { create } from 'zustand';
import type { Customer, Transaction } from '../types';
import { db } from '../services/offlineDb';
import { api } from '../services/api';

interface CustomerState {
  customers: Customer[];
  selectedCustomer: Customer | null;
  customerHistory: Transaction[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
}

interface CustomerActions {
  loadCustomers: () => Promise<void>;
  searchCustomers: (query: string) => Promise<Customer[]>;
  selectCustomer: (customer: Customer | null) => void;
  loadCustomerHistory: (customerId: string) => Promise<void>;
  createCustomer: (customer: Omit<Customer, 'id' | 'balance' | 'loyaltyPoints'>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<Customer>;
  getCustomerById: (id: string) => Customer | undefined;
  addLoyaltyPoints: (customerId: string, points: number) => Promise<void>;
  redeemLoyaltyPoints: (customerId: string, points: number) => Promise<void>;
  refreshCustomers: () => Promise<void>;
}

export const useCustomerStore = create<CustomerState & CustomerActions>((set, get) => ({
  customers: [],
  selectedCustomer: null,
  customerHistory: [],
  isLoading: false,
  error: null,
  searchQuery: '',

  loadCustomers: async () => {
    set({ isLoading: true, error: null });

    try {
      let customers = await db.customers.toArray();

      if (customers.length === 0) {
        const response = await api.get<{ customers: Customer[] }>('/customers');
        customers = response.data?.customers || [];
        await db.customers.bulkPut(customers);
      }

      set({ customers, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load customers',
        isLoading: false,
      });
    }
  },

  searchCustomers: async (query: string) => {
    set({ searchQuery: query.toLowerCase() });

    if (!query || query.length < 2) {
      return [];
    }

    const { customers } = get();
    const lowerQuery = query.toLowerCase();

    // First search local
    let results = customers.filter(
      (c) =>
        c.firstName.toLowerCase().includes(lowerQuery) ||
        c.lastName.toLowerCase().includes(lowerQuery) ||
        c.email?.toLowerCase().includes(lowerQuery) ||
        c.phone?.includes(query)
    );

    // If online and few results, also search API
    if (results.length < 5 && navigator.onLine) {
      try {
        const response = await api.get<{ customers: Customer[] }>(`/customers/search?q=${encodeURIComponent(query)}`);
        const apiResults = response.data?.customers || [];

        // Merge and deduplicate
        const existingIds = new Set(results.map((c) => c.id));
        apiResults.forEach((c: Customer) => {
          if (!existingIds.has(c.id)) {
            results.push(c);
          }
        });

        // Update local DB with new customers
        await db.customers.bulkPut(apiResults);
      } catch {
        // Ignore API errors, use local results
      }
    }

    return results.slice(0, 20);
  },

  selectCustomer: (customer: Customer | null) => {
    set({ selectedCustomer: customer });

    if (customer) {
      get().loadCustomerHistory(customer.id);
    } else {
      set({ customerHistory: [] });
    }
  },

  loadCustomerHistory: async (customerId: string) => {
    try {
      const response = await api.get<{ transactions: Transaction[] }>(`/customers/${customerId}/transactions`);
      set({ customerHistory: response.data?.transactions || [] });
    } catch {
      // Load from local if available
      const transactions = await db.transactions
        .where('customerId')
        .equals(customerId)
        .reverse()
        .limit(20)
        .toArray();

      set({ customerHistory: transactions });
    }
  },

  createCustomer: async (customerData) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.post<{ customer: Customer }>('/customers', customerData);
      const newCustomer = response.data!.customer;

      await db.customers.add(newCustomer);

      set((state) => ({
        customers: [...state.customers, newCustomer],
        isLoading: false,
      }));

      return newCustomer;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create customer',
        isLoading: false,
      });
      throw error;
    }
  },

  updateCustomer: async (id: string, data: Partial<Customer>) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.put<{ customer: Customer }>(`/customers/${id}`, data);
      const updatedCustomer = response.data!.customer;

      await db.customers.put(updatedCustomer);

      set((state) => ({
        customers: state.customers.map((c) =>
          c.id === id ? updatedCustomer : c
        ),
        selectedCustomer:
          state.selectedCustomer?.id === id
            ? updatedCustomer
            : state.selectedCustomer,
        isLoading: false,
      }));

      return updatedCustomer;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update customer',
        isLoading: false,
      });
      throw error;
    }
  },

  getCustomerById: (id: string) => {
    const { customers } = get();
    return customers.find((c) => c.id === id);
  },

  addLoyaltyPoints: async (customerId: string, points: number) => {
    const customer = get().getCustomerById(customerId);
    if (!customer) return;

    await get().updateCustomer(customerId, {
      loyaltyPoints: customer.loyaltyPoints + points,
    });
  },

  redeemLoyaltyPoints: async (customerId: string, points: number) => {
    const customer = get().getCustomerById(customerId);
    if (!customer || customer.loyaltyPoints < points) {
      throw new Error('Insufficient loyalty points');
    }

    await get().updateCustomer(customerId, {
      loyaltyPoints: customer.loyaltyPoints - points,
    });
  },

  refreshCustomers: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get<{ customers: Customer[] }>('/customers');
      const customers = response.data?.customers || [];

      await db.customers.clear();
      await db.customers.bulkPut(customers);

      set({ customers, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to refresh customers',
        isLoading: false,
      });
    }
  },
}));
