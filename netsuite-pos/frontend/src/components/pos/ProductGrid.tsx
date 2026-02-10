import { useState } from 'react';
import { useItemStore } from '../../stores/itemStore';
import { useCartStore } from '../../stores/cartStore';
import { CubeIcon } from '@heroicons/react/24/outline';
import type { Item } from '../../types';
import toast from 'react-hot-toast';

export default function ProductGrid() {
  const { categories, selectedCategory, setCategory, getFilteredItems, isLoading } =
    useItemStore();
  const { addItem } = useCartStore();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const items = getFilteredItems();

  const handleItemClick = (item: Item) => {
    if (item.requiresWeight) {
      setSelectedItem(item);
    } else {
      addItem(item);
      toast.success(`Added ${item.name}`, { duration: 1500 });
    }
  };

  const handleAddWithQuantity = (item: Item, quantity: number) => {
    addItem(item, quantity);
    setSelectedItem(null);
    toast.success(`Added ${quantity}x ${item.name}`, { duration: 1500 });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Category tabs */}
      <div className="flex gap-2 p-4 bg-white border-b border-gray-200 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setCategory(null)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            selectedCategory === null
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Items
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setCategory(category.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === category.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-auto p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <CubeIcon className="w-16 h-16 mb-4" />
            <p className="text-lg">No products found</p>
            <p className="text-sm">Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onClick={() => handleItemClick(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quantity modal for weight items */}
      {selectedItem && (
        <QuantityModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onConfirm={(qty) => handleAddWithQuantity(selectedItem, qty)}
        />
      )}
    </div>
  );
}

interface ProductCardProps {
  item: Item;
  onClick: () => void;
}

function ProductCard({ item, onClick }: ProductCardProps) {
  const { getInventoryLevel } = useItemStore();
  const inventory = getInventoryLevel(item.id);
  const isLowStock = inventory && inventory.quantityAvailable < 10;
  const isOutOfStock = inventory && inventory.quantityAvailable <= 0;

  return (
    <button
      onClick={onClick}
      disabled={isOutOfStock}
      className={`pos-product-card h-32 ${
        isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-12 h-12 object-contain mb-2"
        />
      ) : (
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
          <CubeIcon className="w-6 h-6 text-gray-400" />
        </div>
      )}

      <p className="text-sm font-medium text-center line-clamp-2 mb-1">
        {item.name}
      </p>

      <p className="text-primary-600 font-semibold">
        ${item.basePrice.toFixed(2)}
      </p>

      {isOutOfStock && (
        <span className="badge badge-danger text-xs mt-1">Out of Stock</span>
      )}
      {isLowStock && !isOutOfStock && (
        <span className="badge badge-warning text-xs mt-1">Low Stock</span>
      )}
    </button>
  );
}

interface QuantityModalProps {
  item: Item;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

function QuantityModal({ item, onClose, onConfirm }: QuantityModalProps) {
  const [quantity, setQuantity] = useState('1');

  const handleConfirm = () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Invalid quantity');
      return;
    }
    onConfirm(qty);
  };

  const handleNumpad = (value: string) => {
    if (value === 'C') {
      setQuantity('1');
    } else if (value === '.') {
      if (!quantity.includes('.')) {
        setQuantity(quantity + '.');
      }
    } else if (value === 'DEL') {
      setQuantity(quantity.length > 1 ? quantity.slice(0, -1) : '1');
    } else {
      setQuantity(quantity === '1' ? value : quantity + value);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-80">
        <h3 className="text-lg font-semibold mb-4">{item.name}</h3>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">
            Quantity {item.unit ? `(${item.unit})` : ''}
          </label>
          <input
            type="text"
            value={quantity}
            readOnly
            className="input text-2xl text-center font-mono"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'DEL'].map(
            (key) => (
              <button
                key={key}
                onClick={() => handleNumpad(key)}
                className="pos-numpad-btn"
              >
                {key}
              </button>
            )
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={handleConfirm} className="btn-primary flex-1">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
