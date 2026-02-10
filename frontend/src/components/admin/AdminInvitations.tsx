import { useState, useEffect } from 'react';
import { EnvelopeIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  } | null;
  createdBy: {
    firstName: string;
    lastName: string;
  };
}

export default function AdminInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [status, setStatus] = useState('pending');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInvitations();
  }, [status]);

  const loadInvitations = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/admin/invitations?status=${status}`);
      setInvitations(response.data.data);
    } catch (error) {
      toast.error('Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    try {
      await api.delete(`/admin/invitations/${id}`);
      toast.success('Invitation revoked');
      loadInvitations();
    } catch (error) {
      toast.error('Failed to revoke invitation');
    }
  };

  const getStatusBadge = (inv: Invitation) => {
    if (inv.acceptedAt) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
          <CheckCircleIcon className="w-3 h-3" />
          Accepted
        </span>
      );
    }
    if (new Date(inv.expiresAt) < new Date()) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
          <XCircleIcon className="w-3 h-3" />
          Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
        <ClockIcon className="w-3 h-3" />
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invitations</h1>
        <p className="text-gray-500 mt-1">Manage all platform invitations</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['pending', 'accepted', 'expired'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              status === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
          </div>
        ) : invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <EnvelopeIcon className="w-12 h-12 mb-4" />
            <p>No {status} invitations</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <EnvelopeIcon className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="font-medium text-gray-900">{inv.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {inv.tenant?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="capitalize text-gray-600">{inv.role.toLowerCase()}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(inv)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {inv.createdBy.firstName} {inv.createdBy.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {!inv.acceptedAt && new Date(inv.expiresAt) > new Date() && (
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
