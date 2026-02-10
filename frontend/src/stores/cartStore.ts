import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Cart, CartItem, Item, Customer, Discount, Payment, PaymentMethod } from '../types';
import { db } from '../services/offlineDb';

interface CartState {
  cart: Cart;
  heldCarts: Cart[];
  payments: Payment[];
  discounts: Discount[];
}

interface CartActions {
  addItem: (item: Item, quantity?: number) => void;
  updateItemQuantity: (cartItemId: string, quantity: number) => void;
  removeItem: (cartItemId: string) => void;
  setItemDiscount: (cartItemId: string, discountType: 'percent' | 'fixed', value: number) => void;
  clearCart: () => void;
  setCustomer: (customer: Customer | null) => void;
  addDiscount: (discount: Discount) => void;
  removeDiscount: (discountId: string) => void;
  holdCart: (name?: string) => void;
  recallCart: (cartId: string) => void;
  deleteHeldCart: (cartId: string) => void;
  addPayment: (method: PaymentMethod, amount: number, reference?: string) => void;
  removePayment: (paymentId: string) => void;
  clearPayments: () => void;
  calculateTotals: () => void;
  getRemainingBalance: () => number;
  loadHeldCarts: () => Promise<void>;
}

const TAX_RATE = 0.0825; // 8.25% default tax rate

const createEmptyCart = (): Cart => ({
  id: uuid(),
  items: [],
  customerId: undefined,
  customer: undefined,
  subtotal: 0,
  discountTotal: 0,
  taxTotal: 0,
  total: 0,
  notes: undefined,
  onHold: false,
  holdName: undefined,
});

const calculateItemTotals = (cartItem: CartItem): CartItem => {
  const baseTotal = cartItem.quantity * cartItem.unitPrice;
  const discountAmount = cartItem.discountPercent > 0
    ? baseTotal * (cartItem.discountPercent / 100)
    : cartItem.discountAmount;
  const taxableAmount = baseTotal - discountAmount;
  const taxAmount = taxableAmount * TAX_RATE;
  const lineTotal = taxableAmount + taxAmount;

  return {
    ...cartItem,
    discountAmount,
    taxAmount,
    lineTotal,
  };
};

export const useCartStore = create<CartState & CartActions>((set, get) => ({
  cart: createEmptyCart(),
  heldCarts: [],
  payments: [],
  discounts: [],

  addItem: (item: Item, quantity = 1) => {
    set((state) => {
      const existingItemIndex = state.cart.items.findIndex(
        (ci) => ci.itemId === item.id
      );

      let newItems: CartItem[];

      if (existingItemIndex >= 0) {
        newItems = state.cart.items.map((ci, index) =>
          index === existingItemIndex
            ? calculateItemTotals({
                ...ci,
                quantity: ci.quantity + quantity,
              })
            : ci
        );
      } else {
        const newCartItem: CartItem = {
          id: uuid(),
          itemId: item.id,
          item,
          quantity,
          unitPrice: item.basePrice,
          discountAmount: 0,
          discountPercent: 0,
          taxAmount: 0,
          lineTotal: 0,
        };
        newItems = [...state.cart.items, calculateItemTotals(newCartItem)];
      }

      const subtotal = newItems.reduce(
        (sum, ci) => sum + ci.quantity * ci.unitPrice,
        0
      );
      const discountTotal = newItems.reduce(
        (sum, ci) => sum + ci.discountAmount,
        0
      );
      const taxTotal = newItems.reduce((sum, ci) => sum + ci.taxAmount, 0);
      const total = subtotal - discountTotal + taxTotal;

      return {
        cart: {
          ...state.cart,
          items: newItems,
          subtotal,
          discountTotal,
          taxTotal,
          total,
        },
      };
    });
  },

  updateItemQuantity: (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(cartItemId);
      return;
    }

    set((state) => {
      const newItems = state.cart.items.map((ci) =>
        ci.id === cartItemId
          ? calculateItemTotals({ ...ci, quantity })
          : ci
      );

      const subtotal = newItems.reduce(
        (sum, ci) => sum + ci.quantity * ci.unitPrice,
        0
      );
      const discountTotal = newItems.reduce(
        (sum, ci) => sum + ci.discountAmount,
        0
      );
      const taxTotal = newItems.reduce((sum, ci) => sum + ci.taxAmount, 0);
      const total = subtotal - discountTotal + taxTotal;

      return {
        cart: {
          ...state.cart,
          items: newItems,
          subtotal,
          discountTotal,
          taxTotal,
          total,
        },
      };
    });
  },

  removeItem: (cartItemId: string) => {
    set((state) => {
      const newItems = state.cart.items.filter((ci) => ci.id !== cartItemId);

      const subtotal = newItems.reduce(
        (sum, ci) => sum + ci.quantity * ci.unitPrice,
        0
      );
      const discountTotal = newItems.reduce(
        (sum, ci) => sum + ci.discountAmount,
        0
      );
      const taxTotal = newItems.reduce((sum, ci) => sum + ci.taxAmount, 0);
      const total = subtotal - discountTotal + taxTotal;

      return {
        cart: {
          ...state.cart,
          items: newItems,
          subtotal,
          discountTotal,
          taxTotal,
          total,
        },
      };
    });
  },

  setItemDiscount: (cartItemId: string, discountType: 'percent' | 'fixed', value: number) => {
    set((state) => {
      const newItems = state.cart.items.map((ci) => {
        if (ci.id !== cartItemId) return ci;

        const updatedItem: CartItem = {
          ...ci,
          discountPercent: discountType === 'percent' ? value : 0,
          discountAmount: discountType === 'fixed' ? value : 0,
        };

        return calculateItemTotals(updatedItem);
      });

      const subtotal = newItems.reduce(
        (sum, ci) => sum + ci.quantity * ci.unitPrice,
        0
      );
      const discountTotal = newItems.reduce(
        (sum, ci) => sum + ci.discountAmount,
        0
      );
      const taxTotal = newItems.reduce((sum, ci) => sum + ci.taxAmount, 0);
      const total = subtotal - discountTotal + taxTotal;

      return {
        cart: {
          ...state.cart,
          items: newItems,
          subtotal,
          discountTotal,
          taxTotal,
          total,
        },
      };
    });
  },

  clearCart: () => {
    set({
      cart: createEmptyCart(),
      payments: [],
      discounts: [],
    });
  },

  setCustomer: (customer: Customer | null) => {
    set((state) => ({
      cart: {
        ...state.cart,
        customerId: customer?.id,
        customer,
      },
    }));
  },

  addDiscount: (discount: Discount) => {
    set((state) => ({
      discounts: [...state.discounts, discount],
    }));
    get().calculateTotals();
  },

  removeDiscount: (discountId: string) => {
    set((state) => ({
      discounts: state.discounts.filter((d) => d.id !== discountId),
    }));
    get().calculateTotals();
  },

  holdCart: async (name?: string) => {
    const { cart } = get();
    if (cart.items.length === 0) return;

    const heldCart: Cart = {
      ...cart,
      onHold: true,
      holdName: name || `Hold ${new Date().toLocaleTimeString()}`,
    };

    await db.heldCarts.add(heldCart);

    set((state) => ({
      heldCarts: [...state.heldCarts, heldCart],
      cart: createEmptyCart(),
      payments: [],
      discounts: [],
    }));
  },

  recallCart: async (cartId: string) => {
    const { heldCarts, cart } = get();
    const cartToRecall = heldCarts.find((c) => c.id === cartId);

    if (!cartToRecall) return;

    // If current cart has items, hold it first
    if (cart.items.length > 0) {
      await get().holdCart();
    }

    await db.heldCarts.delete(cartId);

    set((state) => ({
      cart: { ...cartToRecall, onHold: false, holdName: undefined },
      heldCarts: state.heldCarts.filter((c) => c.id !== cartId),
    }));
  },

  deleteHeldCart: async (cartId: string) => {
    await db.heldCarts.delete(cartId);
    set((state) => ({
      heldCarts: state.heldCarts.filter((c) => c.id !== cartId),
    }));
  },

  addPayment: (method: PaymentMethod, amount: number, reference?: string) => {
    const payment: Payment = {
      id: uuid(),
      method,
      amount,
      reference,
      processedAt: new Date(),
      status: 'completed',
    };

    set((state) => ({
      payments: [...state.payments, payment],
    }));
  },

  removePayment: (paymentId: string) => {
    set((state) => ({
      payments: state.payments.filter((p) => p.id !== paymentId),
    }));
  },

  clearPayments: () => {
    set({ payments: [] });
  },

  calculateTotals: () => {
    set((state) => {
      const { items } = state.cart;
      const { discounts } = state;

      let subtotal = items.reduce(
        (sum, ci) => sum + ci.quantity * ci.unitPrice,
        0
      );

      // Apply item-level discounts
      let itemDiscountTotal = items.reduce(
        (sum, ci) => sum + ci.discountAmount,
        0
      );

      // Apply cart-level discounts
      let cartDiscountTotal = 0;
      discounts
        .filter((d) => d.appliedTo === 'cart')
        .forEach((d) => {
          if (d.type === 'percent') {
            cartDiscountTotal += subtotal * (d.value / 100);
          } else {
            cartDiscountTotal += d.value;
          }
        });

      const discountTotal = itemDiscountTotal + cartDiscountTotal;
      const taxableAmount = subtotal - discountTotal;
      const taxTotal = taxableAmount * TAX_RATE;
      const total = taxableAmount + taxTotal;

      return {
        cart: {
          ...state.cart,
          subtotal,
          discountTotal,
          taxTotal,
          total,
        },
      };
    });
  },

  getRemainingBalance: () => {
    const { cart, payments } = get();
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    return cart.total - totalPaid;
  },

  loadHeldCarts: async () => {
    const heldCarts = await db.heldCarts.toArray();
    set({ heldCarts });
  },
}));
