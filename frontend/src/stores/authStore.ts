import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Location, Register, Shift } from '../types';
import { api } from '../services/api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  location: Location | null;
  register: Register | null;
  shift: Shift | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (token: string, user: User, tenant?: Tenant) => void;
  setLocation: (location: Location) => void;
  setRegister: (register: Register) => void;
  openShift: (openingBalance: number) => Promise<void>;
  closeShift: (closingBalance: number) => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      token: null,
      location: null,
      register: null,
      shift: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, token, tenant, location, register, shift } = response.data;

          set({
            user,
            tenant,
            token,
            location,
            register,
            shift,
            isAuthenticated: true,
            isLoading: false,
          });

          api.setAuthToken(token);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      setAuth: (token: string, user: User, tenant?: Tenant) => {
        set({
          token,
          user,
          tenant: tenant || null,
          isAuthenticated: true,
          isLoading: false,
        });
        api.setAuthToken(token);
      },

      logout: async () => {
        const { shift } = get();
        if (shift?.status === 'open') {
          throw new Error('Please close your shift before logging out');
        }

        try {
          await api.post('/auth/logout');
        } catch {
          // Ignore logout errors
        }

        set({
          user: null,
          tenant: null,
          token: null,
          location: null,
          register: null,
          shift: null,
          isAuthenticated: false,
          isLoading: false,
        });

        api.setAuthToken(null);
      },

      setLocation: (location: Location) => {
        set({ location });
      },

      setRegister: (register: Register) => {
        set({ register });
      },

      openShift: async (openingBalance: number) => {
        const { register, user } = get();
        if (!register || !user) {
          throw new Error('Register not selected');
        }

        try {
          const response = await api.post('/shifts/open', {
            registerId: register.id,
            openingBalance,
          });

          set({ shift: response.data });
        } catch (error) {
          throw error;
        }
      },

      closeShift: async (closingBalance: number) => {
        const { shift } = get();
        if (!shift) {
          throw new Error('No open shift');
        }

        try {
          const response = await api.post(`/shifts/${shift.id}/close`, {
            closingBalance,
          });

          set({ shift: response.data });
        } catch (error) {
          throw error;
        }
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isLoading: false });
          return;
        }

        try {
          api.setAuthToken(token);
          const response = await api.get('/auth/me');
          const { user, tenant, location, register, shift } = response.data;

          set({
            user,
            tenant,
            location,
            register,
            shift,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          set({
            user: null,
            tenant: null,
            token: null,
            location: null,
            register: null,
            shift: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'pos-auth',
      partialize: (state) => ({
        token: state.token,
        tenant: state.tenant,
        location: state.location,
        register: state.register,
      }),
    }
  )
);
