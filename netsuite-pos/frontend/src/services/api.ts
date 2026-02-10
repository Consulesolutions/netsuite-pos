import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse<unknown>>) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
          // Clear auth and redirect to login
          this.authToken = null;
          localStorage.removeItem('pos-auth');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Handle network errors
        if (!error.response) {
          const errorMessage = 'Network error. Please check your connection.';
          return Promise.reject(new Error(errorMessage));
        }

        // Handle API errors
        const apiError = error.response.data?.error || error.message;
        return Promise.reject(new Error(apiError));
      }
    );
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data;
  }
}

export const api = new ApiService();

// API endpoints
export const endpoints = {
  // Auth
  login: '/auth/login',
  logout: '/auth/logout',
  me: '/auth/me',
  refreshToken: '/auth/refresh',

  // Items
  items: '/items',
  itemById: (id: string) => `/items/${id}`,
  itemByBarcode: (barcode: string) => `/items/barcode/${barcode}`,
  itemsBySku: (sku: string) => `/items/sku/${sku}`,
  itemsSync: '/items/sync',

  // Categories
  categories: '/categories',

  // Customers
  customers: '/customers',
  customerById: (id: string) => `/customers/${id}`,
  customerSearch: '/customers/search',
  customerTransactions: (id: string) => `/customers/${id}/transactions`,
  customersSync: '/customers/sync',

  // Inventory
  inventory: (locationId: string) => `/inventory/${locationId}`,
  inventoryAdjust: '/inventory/adjust',
  inventorySync: '/inventory/sync',

  // Transactions
  transactions: '/transactions',
  transactionById: (id: string) => `/transactions/${id}`,
  transactionVoid: (id: string) => `/transactions/${id}/void`,
  transactionRefund: (id: string) => `/transactions/${id}/refund`,
  transactionsSync: '/transactions/sync',

  // Payments
  payments: '/payments',
  paymentProcess: '/payments/process',
  paymentRefund: (id: string) => `/payments/${id}/refund`,

  // Gift Cards
  giftCards: '/gift-cards',
  giftCardById: (id: string) => `/gift-cards/${id}`,
  giftCardByNumber: (number: string) => `/gift-cards/number/${number}`,
  giftCardActivate: '/gift-cards/activate',
  giftCardRedeem: '/gift-cards/redeem',

  // Shifts
  shifts: '/shifts',
  shiftOpen: '/shifts/open',
  shiftClose: (id: string) => `/shifts/${id}/close`,
  shiftCurrent: '/shifts/current',

  // Locations
  locations: '/locations',
  registers: (locationId: string) => `/locations/${locationId}/registers`,

  // Reports
  reportsDailySummary: '/reports/daily-summary',
  reportsPaymentBreakdown: '/reports/payment-breakdown',
  reportsTopItems: '/reports/top-items',
  reportsCashierSummary: '/reports/cashier-summary',
  reportsHourlySales: '/reports/hourly-sales',

  // NetSuite
  netsuiteStatus: '/netsuite/status',
  netsuiteSync: '/netsuite/sync',
};
