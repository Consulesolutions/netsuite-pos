import { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useCustomerStore } from '../../stores/customerStore';
import { useCartStore } from '../../stores/cartStore';
import type { Customer } from '../../types';
import toast from 'react-hot-toast';

interface CustomerSearchProps {
  onClose: () => void;
}

export default function CustomerSearch({ onClose }: CustomerSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const { searchCustomers, createCustomer } = useCustomerStore();
  const { setCustomer, cart } = useCartStore();

  const handleSearch = useCallback(async () => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const customers = await searchCustomers(query);
      setResults(customers);
    } catch {
      toast.error('Search failed');
    } finally {
      setIsLoading(false);
    }
  }, [query, searchCustomers]);

  useEffect(() => {
    const debounce = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounce);
  }, [handleSearch]);

  const handleSelectCustomer = (customer: Customer) => {
    setCustomer(customer);
    toast.success(`Customer: ${customer.firstName} ${customer.lastName}`);
    onClose();
  };

  const handleRemoveCustomer = () => {
    setCustomer(null);
    toast.success('Customer removed');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {showNewCustomer ? 'New Customer' : 'Select Customer'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {showNewCustomer ? (
          <NewCustomerForm
            onBack={() => setShowNewCustomer(false)}
            onCreated={(customer) => {
              handleSelectCustomer(customer);
            }}
          />
        ) : (
          <>
            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="input pl-10"
                  autoFocus
                />
              </div>
            </div>

            {/* Current customer */}
            {cart.customer && (
              <div className="px-4 pb-4">
                <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium text-primary-900">
                      {cart.customer.firstName} {cart.customer.lastName}
                    </p>
                    <p className="text-sm text-primary-700">{cart.customer.email}</p>
                  </div>
                  <button
                    onClick={handleRemoveCustomer}
                    className="text-primary-600 hover:text-primary-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* Results */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
                </div>
              ) : results.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {results.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
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
                          <span className="badge badge-info">
                            {customer.loyaltyPoints} pts
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : query.length >= 2 ? (
                <div className="py-8 text-center text-gray-500">
                  <p>No customers found</p>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <p>Enter at least 2 characters to search</p>
                </div>
              )}
            </div>

            {/* New customer button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowNewCustomer(true)}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                New Customer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface NewCustomerFormProps {
  onBack: () => void;
  onCreated: (customer: Customer) => void;
}

function NewCustomerForm({ onBack, onCreated }: NewCustomerFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
        <button type="button" onClick={onBack} className="btn-secondary flex-1">
          Back
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
  );
}
