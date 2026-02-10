import { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { useCustomerStore } from '../../stores/customerStore';
import type { Customer, Transaction } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function CustomerManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const {
    customers,
    selectedCustomer,
    customerHistory,
    loadCustomers,
    searchCustomers,
    selectCustomer,
    refreshCustomers,
    isLoading,
  } = useCustomerStore();

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSearch = useCallback(async () => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchCustomers(searchQuery);
      setSearchResults(results);
    } catch {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchCustomers]);

  useEffect(() => {
    const debounce = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounce);
  }, [handleSearch]);

  const handleRefresh = async () => {
    try {
      await refreshCustomers();
      toast.success('Customers refreshed');
    } catch {
      toast.error('Failed to refresh');
    }
  };

  const displayedCustomers = searchQuery.length >= 2 ? searchResults : customers.slice(0, 50);

  return (
    <div className="h-full flex">
      {/* Customer list */}
      <div className="w-96 flex flex-col border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Customers</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewCustomer(true)}
                className="btn-primary p-2"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="btn-secondary p-2"
              >
                <ArrowPathIcon
                  className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>

          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Customer list */}
        <div className="flex-1 overflow-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
            </div>
          ) : displayedCustomers.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <UserIcon className="w-12 h-12 mx-auto mb-2" />
              <p>No customers found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayedCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => selectCustomer(customer)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedCustomer?.id === customer.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {customer.email || customer.phone || 'No contact info'}
                      </p>
                    </div>
                    {customer.loyaltyPoints > 0 && (
                      <span className="badge badge-info flex items-center gap-1">
                        <StarIcon className="w-3 h-3" />
                        {customer.loyaltyPoints}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customer details */}
      <div className="flex-1 overflow-auto">
        {selectedCustomer ? (
          <CustomerDetails
            customer={selectedCustomer}
            history={customerHistory}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <UserIcon className="w-16 h-16 mb-4" />
            <p className="text-lg">Select a customer to view details</p>
          </div>
        )}
      </div>

      {/* New customer modal */}
      {showNewCustomer && (
        <NewCustomerModal
          onClose={() => setShowNewCustomer(false)}
          onCreated={(customer) => {
            selectCustomer(customer);
            setShowNewCustomer(false);
          }}
        />
      )}
    </div>
  );
}

interface CustomerDetailsProps {
  customer: Customer;
  history: Transaction[];
}

function CustomerDetails({ customer, history }: CustomerDetailsProps) {
  const { updateCustomer } = useCustomerStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email || '',
    phone: customer.phone || '',
  });

  useEffect(() => {
    setEditData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email || '',
      phone: customer.phone || '',
    });
  }, [customer]);

  const handleSave = async () => {
    try {
      await updateCustomer(customer.id, editData);
      toast.success('Customer updated');
      setIsEditing(false);
    } catch {
      toast.error('Failed to update customer');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-semibold text-primary-700">
              {customer.firstName[0]}
              {customer.lastName[0]}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {customer.firstName} {customer.lastName}
            </h2>
            {customer.company && (
              <p className="text-gray-600">{customer.company}</p>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="btn-secondary"
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center">
          <StarIcon className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{customer.loyaltyPoints}</p>
          <p className="text-sm text-gray-600">Loyalty Points</p>
        </div>
        <div className="card p-4 text-center">
          <CurrencyDollarIcon className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">${customer.balance.toFixed(2)}</p>
          <p className="text-sm text-gray-600">Store Credit</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold">{history.length}</p>
          <p className="text-sm text-gray-600">Total Orders</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold">
            $
            {history
              .reduce((sum, t) => sum + t.total, 0)
              .toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">Total Spent</p>
        </div>
      </div>

      {/* Contact info / Edit form */}
      <div className="card p-6 mb-6">
        <h3 className="font-semibold mb-4">Contact Information</h3>

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={editData.firstName}
                  onChange={(e) =>
                    setEditData({ ...editData, firstName: e.target.value })
                  }
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={editData.lastName}
                  onChange={(e) =>
                    setEditData({ ...editData, lastName: e.target.value })
                  }
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={editData.email}
                onChange={(e) =>
                  setEditData({ ...editData, email: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phone</label>
              <input
                type="tel"
                value={editData.phone}
                onChange={(e) =>
                  setEditData({ ...editData, phone: e.target.value })
                }
                className="input"
              />
            </div>
            <button onClick={handleSave} className="btn-primary">
              Save Changes
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="w-5 h-5 text-gray-400" />
              <span>{customer.email || 'No email'}</span>
            </div>
            <div className="flex items-center gap-3">
              <PhoneIcon className="w-5 h-5 text-gray-400" />
              <span>{customer.phone || 'No phone'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Transaction history */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4">Transaction History</h3>

        {history.length === 0 ? (
          <p className="text-gray-500">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Receipt
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Items
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                    Total
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">
                      {transaction.receiptNumber}
                    </td>
                    <td className="px-4 py-3">
                      {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">{transaction.items.length}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      ${transaction.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`badge ${
                          transaction.status === 'completed'
                            ? 'badge-success'
                            : transaction.status === 'voided'
                            ? 'badge-danger'
                            : 'badge-info'
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

interface NewCustomerModalProps {
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}

function NewCustomerModal({ onClose, onCreated }: NewCustomerModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createCustomer } = useCustomerStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName || !lastName) {
      toast.error('First and last name are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const customer = await createCustomer({
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        company: company || undefined,
      });
      toast.success('Customer created');
      onCreated(customer);
    } catch {
      toast.error('Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-6">New Customer</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
