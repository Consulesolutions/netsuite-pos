import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UsersIcon,
  MapPinIcon,
  EnvelopeIcon,
  CurrencyDollarIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import SendInvitation from './SendInvitation';

interface CustomerDetails {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  plan: string;
  isActive: boolean;
  createdAt: string;
  planStartDate: string;
  planEndDate: string | null;
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
  }>;
  locations: Array<{
    id: string;
    name: string;
    isActive: boolean;
    _count: { registers: number };
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: string;
    expiresAt: string;
  }>;
  stats: {
    transactions: number;
    items: number;
    customers: number;
  };
}

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ plan: '', isActive: true });

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    try {
      const response = await api.get(`/admin/tenants/${id}`);
      const data = response.data.data;
      setCustomer(data);
      setEditData({
        plan: data.plan,
        isActive: data.isActive,
      });
    } catch (error) {
      toast.error('Failed to load customer details');
      navigate('/admin/customers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await api.patch(`/admin/tenants/${id}`, editData);
      toast.success('Customer updated');
      setIsEditing(false);
      loadCustomer();
    } catch (error) {
      toast.error('Failed to update customer');
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    try {
      await api.delete(`/admin/invitations/${invitationId}`);
      toast.success('Invitation revoked');
      loadCustomer();
    } catch (error) {
      toast.error('Failed to revoke invitation');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/admin/customers')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Customers
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
              <BuildingOfficeIcon className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
              <p className="text-gray-500">{customer.email}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <EnvelopeIcon className="w-5 h-5" />
          Send Invitation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Account Details</h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-primary-600 hover:text-primary-700"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                  <select
                    value={editData.plan}
                    onChange={(e) => setEditData({ ...editData, plan: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="TRIAL">Trial</option>
                    <option value="STARTER">Starter</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editData.isActive}
                      onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })}
                      className="rounded text-primary-600"
                    />
                    <span className="text-sm text-gray-700">Account Active</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleUpdate} className="btn-primary">Save</button>
                  <button onClick={() => setIsEditing(false)} className="btn-secondary">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Slug</span>
                  <p className="font-medium">{customer.slug}.yourpos.com</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Phone</span>
                  <p className="font-medium">{customer.phone || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Plan</span>
                  <p className="font-medium">{customer.plan}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Status</span>
                  <p className={`font-medium ${customer.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Created</span>
                  <p className="font-medium">{new Date(customer.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Plan End Date</span>
                  <p className="font-medium">
                    {customer.planEndDate ? new Date(customer.planEndDate).toLocaleDateString() : '-'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Users */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Users ({customer.users.length})</h2>
            <div className="space-y-3">
              {customer.users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-700 capitalize">{user.role.toLowerCase()}</span>
                    <p className="text-xs text-gray-500">
                      {user.lastLoginAt ? `Last login: ${new Date(user.lastLoginAt).toLocaleDateString()}` : 'Never logged in'}
                    </p>
                  </div>
                </div>
              ))}
              {customer.users.length === 0 && (
                <p className="text-gray-500 text-center py-4">No users yet</p>
              )}
            </div>
          </div>

          {/* Pending Invitations */}
          {customer.invitations.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Invitations</h2>
              <div className="space-y-3">
                {customer.invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-sm text-gray-500">
                        Role: {inv.role} | Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeInvitation(inv.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <UsersIcon className="w-5 h-5" />
                  <span>Users</span>
                </div>
                <span className="font-semibold">{customer.users.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPinIcon className="w-5 h-5" />
                  <span>Locations</span>
                </div>
                <span className="font-semibold">{customer.locations.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <CurrencyDollarIcon className="w-5 h-5" />
                  <span>Transactions</span>
                </div>
                <span className="font-semibold">{customer.stats.transactions}</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Locations</h2>
            <div className="space-y-2">
              {customer.locations.map((loc) => (
                <div key={loc.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{loc.name}</p>
                  <p className="text-sm text-gray-500">{loc._count.registers} registers</p>
                </div>
              ))}
              {customer.locations.length === 0 && (
                <p className="text-gray-500 text-center py-4">No locations yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <SendInvitation
          tenantId={customer.id}
          tenantName={customer.name}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            loadCustomer();
          }}
        />
      )}
    </div>
  );
}
