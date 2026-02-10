import { ArrowLeftIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '../../stores/cartStore';
import type { Cart } from '../../types';
import toast from 'react-hot-toast';

interface HeldCartsProps {
  onBack: () => void;
}

export default function HeldCarts({ onBack }: HeldCartsProps) {
  const { heldCarts, recallCart, deleteHeldCart } = useCartStore();

  const handleRecall = async (cart: Cart) => {
    await recallCart(cart.id);
    toast.success('Cart recalled');
    onBack();
  };

  const handleDelete = async (cartId: string) => {
    if (confirm('Delete this held cart?')) {
      await deleteHeldCart(cartId);
      toast.success('Cart deleted');
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-4">
        <button onClick={onBack} className="btn-ghost p-2">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">Held Carts ({heldCarts.length})</h2>
      </div>

      {/* Held carts list */}
      <div className="flex-1 overflow-auto p-4">
        {heldCarts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <ArrowPathIcon className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">No held carts</p>
            <p className="text-sm">Hold a cart to save it for later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {heldCarts.map((cart) => (
              <HeldCartCard
                key={cart.id}
                cart={cart}
                onRecall={() => handleRecall(cart)}
                onDelete={() => handleDelete(cart.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface HeldCartCardProps {
  cart: Cart;
  onRecall: () => void;
  onDelete: () => void;
}

function HeldCartCard({ cart, onRecall, onDelete }: HeldCartCardProps) {
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold">{cart.holdName || 'Held Cart'}</h3>
          {cart.customer && (
            <p className="text-sm text-gray-600">
              {cart.customer.firstName} {cart.customer.lastName}
            </p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="btn-ghost p-1 text-red-600 hover:bg-red-50"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {cart.items.slice(0, 3).map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-600 truncate flex-1">
              {item.quantity}x {item.item.name}
            </span>
            <span className="font-medium">${item.lineTotal.toFixed(2)}</span>
          </div>
        ))}
        {cart.items.length > 3 && (
          <p className="text-sm text-gray-500">
            +{cart.items.length - 3} more items
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div>
          <p className="text-sm text-gray-600">{itemCount} items</p>
          <p className="font-semibold">${cart.total.toFixed(2)}</p>
        </div>
        <button onClick={onRecall} className="btn-primary">
          Recall
        </button>
      </div>
    </div>
  );
}
