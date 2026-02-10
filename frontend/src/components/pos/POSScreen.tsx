import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  Bars3Icon,
  PauseIcon,
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useCartStore } from '../../stores/cartStore';
import { useItemStore } from '../../stores/itemStore';
import { useHardwareStore } from '../../stores/hardwareStore';
import { useAuthStore } from '../../stores/authStore';
import ProductGrid from './ProductGrid';
import Cart from './Cart';
import Checkout from './Checkout';
import CustomerSearch from './CustomerSearch';
import HeldCarts from './HeldCarts';
import toast from 'react-hot-toast';

type ViewMode = 'grid' | 'checkout' | 'held';

interface POSScreenProps {
  fullScreen?: boolean;
}

export default function POSScreen({ fullScreen = false }: POSScreenProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const { cart, addItem, holdCart, loadHeldCarts, heldCarts } = useCartStore();
  const { items, loadItems, loadCategories, searchItems, getItemByBarcode } = useItemStore();
  const { lastBarcode, clearBarcode } = useHardwareStore();
  const { user, tenant, location, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      toast.error('Please close your shift before logging out');
    }
  };

  // Load initial data
  useEffect(() => {
    loadItems();
    loadCategories();
    loadHeldCarts();
  }, [loadItems, loadCategories, loadHeldCarts]);

  // Handle barcode scanning
  useEffect(() => {
    if (lastBarcode) {
      const item = getItemByBarcode(lastBarcode);
      if (item) {
        addItem(item);
        toast.success(`Added ${item.name}`);
      } else {
        toast.error(`Item not found: ${lastBarcode}`);
      }
      clearBarcode();
    }
  }, [lastBarcode, getItemByBarcode, addItem, clearBarcode]);

  // Handle search
  useEffect(() => {
    searchItems(searchQuery);
  }, [searchQuery, searchItems]);

  const handleHoldCart = useCallback(() => {
    if (cart.items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    holdCart();
    toast.success('Cart held');
  }, [cart.items.length, holdCart]);

  const handleViewHeld = useCallback(() => {
    setViewMode('held');
  }, []);

  const handleCheckout = useCallback(() => {
    if (cart.items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setViewMode('checkout');
  }, [cart.items.length]);

  const handleBackToGrid = useCallback(() => {
    setViewMode('grid');
  }, []);

  return (
    <div className={fullScreen ? 'h-screen flex flex-col' : 'h-[calc(100vh-3.5rem)] flex flex-col'}>
      {/* Full screen header for POS users */}
      {fullScreen && (
        <header className="h-14 bg-primary-900 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-primary-900 font-bold text-sm">POS</span>
            </div>
            <div className="text-white">
              <span className="font-medium">{tenant?.name}</span>
              {location && (
                <span className="text-primary-300 text-sm ml-2">
                  {location.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-white">
              <div className="text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-primary-300 capitalize">{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-primary-300 hover:text-white hover:bg-primary-800 rounded-lg transition-colors"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Products or Checkout */}
        <div className="flex-1 flex flex-col bg-gray-50">
        {viewMode === 'checkout' ? (
          <Checkout onBack={handleBackToGrid} />
        ) : viewMode === 'held' ? (
          <HeldCarts onBack={handleBackToGrid} />
        ) : (
          <>
            {/* Search bar */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products by name, SKU, or barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input pl-10"
                    autoFocus
                  />
                </div>
                <button className="btn-secondary">
                  <Bars3Icon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Product grid */}
            <ProductGrid />
          </>
        )}
      </div>

      {/* Right panel - Cart */}
      <div className="w-96 flex flex-col bg-white border-l border-gray-200">
        {/* Cart header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Current Sale</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleHoldCart}
                disabled={cart.items.length === 0}
                className="btn-ghost p-2"
                title="Hold Cart"
              >
                <PauseIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleViewHeld}
                className="btn-ghost p-2 relative"
                title="View Held Carts"
              >
                <ArrowPathIcon className="w-5 h-5" />
                {heldCarts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                    {heldCarts.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Customer selection */}
          <button
            onClick={() => setShowCustomerSearch(true)}
            className="w-full mt-3 p-3 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors text-left"
          >
            {cart.customer ? (
              <div>
                <span className="font-medium">
                  {cart.customer.firstName} {cart.customer.lastName}
                </span>
                {cart.customer.loyaltyPoints > 0 && (
                  <span className="ml-2 text-sm text-primary-600">
                    {cart.customer.loyaltyPoints} pts
                  </span>
                )}
              </div>
            ) : (
              '+ Add Customer'
            )}
          </button>
        </div>

        {/* Cart items */}
        <Cart />

        {/* Checkout button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleCheckout}
            disabled={cart.items.length === 0}
            className="btn-success w-full py-4 text-lg"
          >
            Checkout ${cart.total.toFixed(2)}
          </button>
        </div>
      </div>
      </div>

      {/* Customer search modal */}
      {showCustomerSearch && (
        <CustomerSearch onClose={() => setShowCustomerSearch(false)} />
      )}
    </div>
  );
}
