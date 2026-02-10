import { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  AdjustmentsHorizontalIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { useItemStore } from '../../stores/itemStore';
import { useAuthStore } from '../../stores/authStore';
import type { Item, InventoryLevel } from '../../types';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

type ViewMode = 'list' | 'adjust' | 'transfer';

export default function InventoryManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const { items, loadItems, loadInventory, refreshItems, isLoading, getInventoryLevel } =
    useItemStore();
  const { location } = useAuthStore();

  useEffect(() => {
    loadItems();
    if (location) {
      loadInventory(location.id);
    }
  }, [loadItems, loadInventory, location]);

  const handleRefresh = async () => {
    try {
      await refreshItems();
      if (location) {
        await loadInventory(location.id);
      }
      toast.success('Inventory refreshed');
    } catch {
      toast.error('Failed to refresh inventory');
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode?.toLowerCase().includes(searchQuery.toLowerCase());

    if (showLowStock) {
      const inventory = getInventoryLevel(item.id);
      return matchesSearch && inventory && inventory.quantityAvailable < 10;
    }

    return matchesSearch;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Inventory Management</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('adjust')}
              className={`btn-secondary flex items-center gap-2 ${
                viewMode === 'adjust' ? 'bg-primary-100' : ''
              }`}
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
              Adjust
            </button>
            <button
              onClick={() => setViewMode('transfer')}
              className={`btn-secondary flex items-center gap-2 ${
                viewMode === 'transfer' ? 'bg-primary-100' : ''
              }`}
            >
              <ArrowsRightLeftIcon className="w-5 h-5" />
              Transfer
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="btn-primary flex items-center gap-2"
            >
              <ArrowPathIcon
                className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
              />
              Sync
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className={`btn-secondary flex items-center gap-2 ${
              showLowStock ? 'bg-yellow-100 border-yellow-300' : ''
            }`}
          >
            <ExclamationTriangleIcon className="w-5 h-5" />
            Low Stock
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'list' && (
          <InventoryList
            items={filteredItems}
            getInventoryLevel={getInventoryLevel}
            onSelectItem={setSelectedItem}
          />
        )}
        {viewMode === 'adjust' && (
          <InventoryAdjust
            items={filteredItems}
            getInventoryLevel={getInventoryLevel}
            onComplete={() => {
              setViewMode('list');
              handleRefresh();
            }}
          />
        )}
        {viewMode === 'transfer' && (
          <InventoryTransfer
            items={filteredItems}
            getInventoryLevel={getInventoryLevel}
            onComplete={() => {
              setViewMode('list');
              handleRefresh();
            }}
          />
        )}
      </div>
    </div>
  );
}

interface InventoryListProps {
  items: Item[];
  getInventoryLevel: (itemId: string) => InventoryLevel | undefined;
  onSelectItem: (item: Item) => void;
}

function InventoryList({ items, getInventoryLevel, onSelectItem }: InventoryListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p className="text-lg">No items found</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Item
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              SKU
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Barcode
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
              On Hand
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
              Available
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
              Committed
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const inventory = getInventoryLevel(item.id);
            const isLowStock = inventory && inventory.quantityAvailable < 10;
            const isOutOfStock = inventory && inventory.quantityAvailable <= 0;

            return (
              <tr
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.category}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{item.sku}</td>
                <td className="px-4 py-3 text-gray-600 font-mono text-sm">
                  {item.barcode || '-'}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {inventory?.quantityOnHand ?? '-'}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {inventory?.quantityAvailable ?? '-'}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {inventory?.quantityCommitted ?? '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  {isOutOfStock ? (
                    <span className="badge badge-danger">Out of Stock</span>
                  ) : isLowStock ? (
                    <span className="badge badge-warning">Low Stock</span>
                  ) : (
                    <span className="badge badge-success">In Stock</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface InventoryAdjustProps {
  items: Item[];
  getInventoryLevel: (itemId: string) => InventoryLevel | undefined;
  onComplete: () => void;
}

function InventoryAdjust({ items, getInventoryLevel, onComplete }: InventoryAdjustProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'set'>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedItem || !quantity) {
      toast.error('Select an item and enter a quantity');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/inventory/adjust', {
        itemId: selectedItem.id,
        adjustmentType,
        quantity: qty,
        reason,
      });

      toast.success('Inventory adjusted');
      setSelectedItem(null);
      setQuantity('');
      setReason('');
      onComplete();
    } catch {
      toast.error('Failed to adjust inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-6">Inventory Adjustment</h2>

        <div className="space-y-6">
          {/* Item selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Item
            </label>
            <select
              value={selectedItem?.id || ''}
              onChange={(e) =>
                setSelectedItem(items.find((i) => i.id === e.target.value) || null)
              }
              className="input"
            >
              <option value="">Choose an item...</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku})
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <>
              {/* Current stock */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Current Stock</p>
                <p className="text-2xl font-bold">
                  {getInventoryLevel(selectedItem.id)?.quantityOnHand ?? 0}
                </p>
              </div>

              {/* Adjustment type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adjustment Type
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'add', label: 'Add Stock' },
                    { value: 'remove', label: 'Remove Stock' },
                    { value: 'set', label: 'Set Stock' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() =>
                        setAdjustmentType(type.value as 'add' | 'remove' | 'set')
                      }
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                        adjustmentType === type.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input"
                  min="1"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input"
                >
                  <option value="">Select a reason...</option>
                  <option value="count">Physical Count</option>
                  <option value="damage">Damaged Goods</option>
                  <option value="theft">Theft/Loss</option>
                  <option value="received">Stock Received</option>
                  <option value="correction">Correction</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-primary w-full py-3"
              >
                {isSubmitting ? 'Adjusting...' : 'Apply Adjustment'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface InventoryTransferProps {
  items: Item[];
  getInventoryLevel: (itemId: string) => InventoryLevel | undefined;
  onComplete: () => void;
}

function InventoryTransfer({ items, getInventoryLevel, onComplete }: InventoryTransferProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [destinationLocation, setDestinationLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { location } = useAuthStore();

  const handleSubmit = async () => {
    if (!selectedItem || !destinationLocation || !quantity) {
      toast.error('Fill in all fields');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }

    const currentQty = getInventoryLevel(selectedItem.id)?.quantityAvailable ?? 0;
    if (qty > currentQty) {
      toast.error('Insufficient stock');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/inventory/transfer', {
        itemId: selectedItem.id,
        fromLocationId: location?.id,
        toLocationId: destinationLocation,
        quantity: qty,
      });

      toast.success('Transfer order created');
      onComplete();
    } catch {
      toast.error('Failed to create transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-6">Inventory Transfer</h2>

        <div className="space-y-6">
          {/* From location */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">From Location</p>
            <p className="font-medium">{location?.name}</p>
          </div>

          {/* Destination location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Location
            </label>
            <select
              value={destinationLocation}
              onChange={(e) => setDestinationLocation(e.target.value)}
              className="input"
            >
              <option value="">Select destination...</option>
              <option value="loc_2">Warehouse</option>
              <option value="loc_3">Store #2</option>
            </select>
          </div>

          {/* Item selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item
            </label>
            <select
              value={selectedItem?.id || ''}
              onChange={(e) =>
                setSelectedItem(items.find((i) => i.id === e.target.value) || null)
              }
              className="input"
            >
              <option value="">Choose an item...</option>
              {items.map((item) => {
                const inv = getInventoryLevel(item.id);
                return (
                  <option key={item.id} value={item.id}>
                    {item.name} (Available: {inv?.quantityAvailable ?? 0})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity to Transfer
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input"
              min="1"
              max={
                selectedItem
                  ? getInventoryLevel(selectedItem.id)?.quantityAvailable
                  : undefined
              }
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary w-full py-3"
          >
            {isSubmitting ? 'Creating Transfer...' : 'Create Transfer Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
