import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  ShoppingCartIcon,
  CubeIcon,
  UsersIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  WifiIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { useSyncStore } from '../../stores/syncStore';

const navItems = [
  { to: '/app/pos', icon: ShoppingCartIcon, label: 'POS' },
  { to: '/app/inventory', icon: CubeIcon, label: 'Inventory' },
  { to: '/app/customers', icon: UsersIcon, label: 'Customers' },
  { to: '/app/reports', icon: ChartBarIcon, label: 'Reports' },
  { to: '/app/settings', icon: Cog6ToothIcon, label: 'Settings' },
];

export default function Layout() {
  const location = useLocation();
  const { user, tenant, location: posLocation, register, logout } = useAuthStore();
  const { status } = useSyncStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-20 bg-primary-900 flex flex-col items-center py-4">
        {/* Logo */}
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-8">
          <span className="text-primary-900 font-bold text-xl">POS</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `w-14 h-14 flex flex-col items-center justify-center rounded-xl transition-colors ${
                  isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-300 hover:bg-primary-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-primary-700 rounded-full flex items-center justify-center text-white font-medium">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          <button
            onClick={handleLogout}
            className="w-14 h-14 flex flex-col items-center justify-center rounded-xl text-primary-300 hover:bg-primary-800 hover:text-white transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {tenant && (
              <span className="text-sm font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">
                {tenant.name}
              </span>
            )}
            <h1 className="text-lg font-semibold text-gray-900">
              {navItems.find((n) => n.to === location.pathname)?.label || 'POS'}
            </h1>
            {posLocation && (
              <span className="text-sm text-gray-500">
                {posLocation.name} • {register?.name || 'No Register'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Sync status */}
            <div className="flex items-center gap-2">
              {status.isOnline ? (
                <WifiIcon className="w-5 h-5 text-green-500" />
              ) : (
                <WifiIcon className="w-5 h-5 text-red-500" />
              )}
              {status.pendingCount > 0 && (
                <span className="badge badge-warning">
                  {status.pendingCount} pending
                </span>
              )}
              {status.errorCount > 0 && (
                <span className="badge badge-danger flex items-center gap-1">
                  <ExclamationCircleIcon className="w-4 h-4" />
                  {status.errorCount} errors
                </span>
              )}
              {status.isSyncing && (
                <div className="flex items-center gap-1 text-primary-600">
                  <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Syncing...</span>
                </div>
              )}
            </div>

            {/* User info */}
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
