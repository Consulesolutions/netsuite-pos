import { useState } from 'react';
import { Tab } from '@headlessui/react';
import { Link } from 'react-router-dom';
import {
  PrinterIcon,
  CreditCardIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  CloudArrowDownIcon,
  ArrowPathIcon,
  TrashIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { useHardwareStore } from '../../stores/hardwareStore';
import { useSyncStore } from '../../stores/syncStore';
import { useAuthStore } from '../../stores/authStore';
import { dbUtils } from '../../services/offlineDb';
import toast from 'react-hot-toast';

const tabs = [
  { name: 'General', icon: BuildingStorefrontIcon },
  { name: 'Hardware', icon: PrinterIcon },
  { name: 'Payments', icon: CreditCardIcon },
  { name: 'Users', icon: UserGroupIcon },
  { name: 'Sync', icon: CloudArrowDownIcon },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function SettingsPage() {
  return (
    <div className="p-6">
      <Tab.Group>
        <div className="flex gap-6">
          {/* Sidebar tabs */}
          <Tab.List className="w-48 flex flex-col gap-1">
            {tabs.map((tab) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  classNames(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                    selected
                      ? 'bg-primary-100 text-primary-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  )
                }
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </Tab>
            ))}
          </Tab.List>

          {/* Tab panels */}
          <Tab.Panels className="flex-1">
            <Tab.Panel>
              <GeneralSettings />
            </Tab.Panel>
            <Tab.Panel>
              <HardwareSettings />
            </Tab.Panel>
            <Tab.Panel>
              <PaymentSettings />
            </Tab.Panel>
            <Tab.Panel>
              <UserSettings />
            </Tab.Panel>
            <Tab.Panel>
              <SyncSettings />
            </Tab.Panel>
          </Tab.Panels>
        </div>
      </Tab.Group>
    </div>
  );
}

function GeneralSettings() {
  const { location, register, tenant } = useAuthStore();

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold mb-6">General Settings</h2>

      <div className="space-y-6">
        {/* Subscription */}
        {tenant && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Subscription</h3>
            <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium">{tenant.name}</p>
                <p className="text-sm text-gray-500">
                  Plan: <span className="font-medium">{tenant.plan}</span>
                </p>
              </div>
              <Link
                to="/app/settings/billing"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Manage Billing
              </Link>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Location</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium">{location?.name || 'Not selected'}</p>
            <p className="text-sm text-gray-500">{location?.subsidiary}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Register</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium">{register?.name || 'Not selected'}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Receipt Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Store Name</label>
              <input type="text" className="input" placeholder="Store Name" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Store Address</label>
              <textarea className="input" rows={2} placeholder="Store Address" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Receipt Footer</label>
              <input type="text" className="input" placeholder="Thank you for your purchase!" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HardwareSettings() {
  const {
    status,
    printerConfig,
    connectPrinter,
    disconnectPrinter,
    openCashDrawer,
  } = useHardwareStore();

  const handleConnectPrinter = async () => {
    try {
      await connectPrinter();
      toast.success('Printer connected');
    } catch (error) {
      toast.error('Failed to connect printer');
    }
  };

  const handleTestCashDrawer = async () => {
    try {
      await openCashDrawer();
      toast.success('Cash drawer opened');
    } catch (error) {
      toast.error('Failed to open cash drawer');
    }
  };

  return (
    <div className="space-y-6">
      {/* Printer */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Receipt Printer</h2>
          <span
            className={classNames(
              'badge',
              status.printer === 'connected' ? 'badge-success' : 'badge-danger'
            )}
          >
            {status.printer}
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Connection Type</label>
              <select className="input">
                <option value="usb">USB</option>
                <option value="network">Network</option>
                <option value="bluetooth">Bluetooth</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Paper Width</label>
              <select className="input">
                <option value="80">80mm</option>
                <option value="58">58mm</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            {status.printer === 'connected' ? (
              <>
                <button onClick={disconnectPrinter} className="btn-secondary">
                  Disconnect
                </button>
                <button onClick={handleTestCashDrawer} className="btn-secondary">
                  Test Cash Drawer
                </button>
              </>
            ) : (
              <button onClick={handleConnectPrinter} className="btn-primary">
                Connect Printer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barcode Scanner */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Barcode Scanner</h2>
          <span className="badge badge-info">Auto-detect</span>
        </div>
        <p className="text-sm text-gray-600">
          Barcode scanners are automatically detected when they send keyboard input.
          Connect your USB or Bluetooth barcode scanner and start scanning.
        </p>
      </div>

      {/* Scale */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Weight Scale</h2>
          <span
            className={classNames(
              'badge',
              status.scale === 'connected' ? 'badge-success' : 'badge-danger'
            )}
          >
            {status.scale}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Connection Type</label>
            <select className="input">
              <option value="serial">Serial Port</option>
              <option value="usb">USB</option>
            </select>
          </div>

          <button className="btn-primary">Connect Scale</button>
        </div>
      </div>
    </div>
  );
}

function PaymentSettings() {
  const { cardTerminalConfig, status, setCardTerminalConfig } = useHardwareStore();

  return (
    <div className="space-y-6">
      {/* Card Terminal */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Card Terminal</h2>
          <span
            className={classNames(
              'badge',
              status.cardTerminal === 'connected' ? 'badge-success' : 'badge-danger'
            )}
          >
            {status.cardTerminal}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Provider</label>
            <select className="input">
              <option value="stripe">Stripe Terminal</option>
              <option value="square">Square</option>
              <option value="manual">Manual Entry</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Connection Type</label>
            <select className="input">
              <option value="bluetooth">Bluetooth</option>
              <option value="usb">USB</option>
              <option value="network">Network</option>
            </select>
          </div>

          <button className="btn-primary">Connect Terminal</button>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Payment Methods</h2>

        <div className="space-y-3">
          {['Cash', 'Credit/Debit Card', 'Gift Card', 'Store Credit', 'Check'].map(
            (method) => (
              <label key={method} className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span>{method}</span>
              </label>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function UserSettings() {
  const { user } = useAuthStore();

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold mb-6">User Management</h2>

      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Current User</h3>
        <div className="p-4 bg-gray-50 rounded-lg flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium text-lg">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          <div>
            <p className="font-medium">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        User management is handled through NetSuite. Contact your administrator to
        add or modify users.
      </p>
    </div>
  );
}

function SyncSettings() {
  const { status, fullSync, retryFailed, clearErrors } = useSyncStore();
  const [dbStats, setDbStats] = useState<{
    items: number;
    customers: number;
    transactions: number;
    heldCarts: number;
    pendingSync: number;
  } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const loadStats = async () => {
    const stats = await dbUtils.getStats();
    setDbStats(stats);
  };

  useState(() => {
    loadStats();
  });

  const handleFullSync = async () => {
    try {
      await fullSync();
      await loadStats();
      toast.success('Sync completed');
    } catch {
      toast.error('Sync failed');
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      await dbUtils.clearAll();
      await loadStats();
      toast.success('Local data cleared');
    } catch {
      toast.error('Failed to clear data');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sync Status */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Sync Status</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Last Sync</p>
            <p className="font-medium">
              {status.lastSync
                ? new Date(status.lastSync).toLocaleString()
                : 'Never'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Connection</p>
            <p
              className={classNames(
                'font-medium',
                status.isOnline ? 'text-green-600' : 'text-red-600'
              )}
            >
              {status.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Pending Items</p>
            <p className="font-medium">{status.pendingCount}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Errors</p>
            <p
              className={classNames(
                'font-medium',
                status.errorCount > 0 ? 'text-red-600' : ''
              )}
            >
              {status.errorCount}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleFullSync}
            disabled={status.isSyncing || !status.isOnline}
            className="btn-primary flex items-center gap-2"
          >
            <ArrowPathIcon
              className={classNames('w-5 h-5', status.isSyncing ? 'animate-spin' : '')}
            />
            {status.isSyncing ? 'Syncing...' : 'Full Sync'}
          </button>

          {status.errorCount > 0 && (
            <button onClick={retryFailed} className="btn-secondary">
              Retry Failed
            </button>
          )}
        </div>
      </div>

      {/* Local Database */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Local Database</h2>

        {dbStats && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Items</p>
              <p className="font-medium">{dbStats.items}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Customers</p>
              <p className="font-medium">{dbStats.customers}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="font-medium">{dbStats.transactions}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Held Carts</p>
              <p className="font-medium">{dbStats.heldCarts}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={loadStats} className="btn-secondary">
            Refresh Stats
          </button>
          <button
            onClick={handleClearData}
            disabled={isClearing}
            className="btn-danger flex items-center gap-2"
          >
            <TrashIcon className="w-5 h-5" />
            Clear Local Data
          </button>
        </div>
      </div>
    </div>
  );
}
