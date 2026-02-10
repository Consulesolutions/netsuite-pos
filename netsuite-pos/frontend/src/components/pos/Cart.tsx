import { useState } from 'react';
import {
  TrashIcon,
  MinusIcon,
  PlusIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import { useCartStore } from '../../stores/cartStore';
import type { CartItem } from '../../types';
import toast from 'react-hot-toast';

export default function Cart() {
  const { cart, updateItemQuantity, removeItem, setItemDiscount, clearCart } =
    useCartStore();
  const [editingItem, setEditingItem] = useState<string | null>(null);

  if (cart.items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
        <ReceiptPercentIcon className="w-16 h-16 mb-4" />
        <p className="text-lg font-medium">Cart is empty</p>
        <p className="text-sm">Add items to start a sale</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Cart items */}
      <div className="flex-1 overflow-auto">
        {cart.items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onQuantityChange={(qty) => updateItemQuantity(item.id, qty)}
            onRemove={() => removeItem(item.id)}
            onDiscount={(type, value) => setItemDiscount(item.id, type, value)}
            isEditing={editingItem === item.id}
            onEdit={() => setEditingItem(editingItem === item.id ? null : item.id)}
          />
        ))}
      </div>

      {/* Totals */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span>${cart.subtotal.toFixed(2)}</span>
          </div>

          {cart.discountTotal > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-${cart.discountTotal.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-gray-600">Tax</span>
            <span>${cart.taxTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>${cart.total.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={() => {
            if (confirm('Clear all items from cart?')) {
              clearCart();
              toast.success('Cart cleared');
            }
          }}
          className="w-full mt-4 btn-ghost text-red-600 hover:bg-red-50"
        >
          Clear Cart
        </button>
      </div>
    </div>
  );
}

interface CartItemRowProps {
  item: CartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onDiscount: (type: 'percent' | 'fixed', value: number) => void;
  isEditing: boolean;
  onEdit: () => void;
}

function CartItemRow({
  item,
  onQuantityChange,
  onRemove,
  onDiscount,
  isEditing,
  onEdit,
}: CartItemRowProps) {
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');

  const handleApplyDiscount = () => {
    const value = parseFloat(discountValue);
    if (isNaN(value) || value < 0) {
      toast.error('Invalid discount');
      return;
    }
    if (discountType === 'percent' && value > 100) {
      toast.error('Discount cannot exceed 100%');
      return;
    }
    onDiscount(discountType, value);
    setDiscountValue('');
    onEdit();
    toast.success('Discount applied');
  };

  const handleRemoveDiscount = () => {
    onDiscount('fixed', 0);
    toast.success('Discount removed');
  };

  return (
    <div className="border-b border-gray-100">
      <div
        className="pos-cart-item cursor-pointer"
        onClick={onEdit}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{item.item.name}</p>
          <p className="text-sm text-gray-500">
            ${item.unitPrice.toFixed(2)} x {item.quantity}
          </p>
          {item.discountAmount > 0 && (
            <p className="text-sm text-green-600">
              -{discountType === 'percent'
                ? `${item.discountPercent}%`
                : `$${item.discountAmount.toFixed(2)}`}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="font-semibold">${item.lineTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Expanded edit view */}
      {isEditing && (
        <div className="p-4 bg-gray-50 space-y-4">
          {/* Quantity controls */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">Quantity</label>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuantityChange(item.quantity - 1);
                }}
                className="btn-secondary p-2"
              >
                <MinusIcon className="w-4 h-4" />
              </button>

              <input
                type="number"
                value={item.quantity}
                onChange={(e) => onQuantityChange(parseInt(e.target.value) || 0)}
                onClick={(e) => e.stopPropagation()}
                className="input w-20 text-center"
                min="1"
              />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuantityChange(item.quantity + 1);
                }}
                className="btn-secondary p-2"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Discount controls */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">Discount</label>
            <div className="flex gap-2">
              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as 'percent' | 'fixed')
                }
                onClick={(e) => e.stopPropagation()}
                className="input w-24"
              >
                <option value="percent">%</option>
                <option value="fixed">$</option>
              </select>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="0"
                className="input flex-1"
                min="0"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApplyDiscount();
                }}
                className="btn-primary"
              >
                Apply
              </button>
            </div>

            {item.discountAmount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveDiscount();
                }}
                className="mt-2 text-sm text-red-600 hover:underline"
              >
                Remove discount
              </button>
            )}
          </div>

          {/* Remove button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
              toast.success('Item removed');
            }}
            className="btn-danger w-full flex items-center justify-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            Remove Item
          </button>
        </div>
      )}
    </div>
  );
}
