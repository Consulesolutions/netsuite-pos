import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, UserIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface Invitation {
  id: string;
  email: string;
  role: string;
  acceptedAt: string | null;
}

interface StepInviteUsersProps {
  onNext: () => void;
}

export default function StepInviteUsers({ onNext }: StepInviteUsersProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'CASHIER' });

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const response = await api.get('/invitations/tenant/list');
      setInvitations(response.data || []);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!newInvite.email) {
      toast.error('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newInvite.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsAdding(true);
    try {
      const response = await api.post('/invitations/tenant/invite', newInvite);
      setInvitations([...invitations, response.data]);
      setNewInvite({ email: '', role: 'CASHIER' });
      toast.success('Invitation sent!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRevokeInvitation = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    try {
      await api.delete(`/invitations/tenant/${id}`);
      setInvitations(invitations.filter((i) => i.id !== id));
      toast.success('Invitation revoked');
    } catch (error) {
      toast.error('Failed to revoke invitation');
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Invite Your Team</h2>
        <p className="text-gray-500 mt-1">
          Send invitations to your staff members to join the POS system.
        </p>
      </div>

      {/* Role Descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h4 className="font-medium text-purple-900">Admin</h4>
          <p className="text-sm text-purple-700 mt-1">
            Full access to settings, inventory, reports, and POS
          </p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900">Manager</h4>
          <p className="text-sm text-blue-700 mt-1">
            POS access plus reports and limited settings
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900">Cashier</h4>
          <p className="text-sm text-gray-700 mt-1">
            POS-only access for processing sales
          </p>
        </div>
      </div>

      {/* Existing Invitations */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Pending Invitations</h3>
          {invitations.filter((i) => !i.acceptedAt).map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between p-4 border border-yellow-200 bg-yellow-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <EnvelopeIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{invitation.email}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeClass(invitation.role)}`}>
                    {invitation.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleRevokeInvitation(invitation.id)}
                className="p-2 text-gray-400 hover:text-red-600"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Accepted Members */}
      {invitations.filter((i) => i.acceptedAt).length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Team Members</h3>
          {invitations.filter((i) => i.acceptedAt).map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border border-green-200 bg-green-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{member.email}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeClass(member.role)}`}>
                    {member.role}
                  </span>
                </div>
              </div>
              <span className="text-sm text-green-600">Joined</span>
            </div>
          ))}
        </div>
      )}

      {/* Add New Invitation */}
      <div className="border border-dashed border-gray-300 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Invite Team Member
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={newInvite.email}
              onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="staff@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={newInvite.role}
              onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="CASHIER">Cashier</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleSendInvitation}
          disabled={isAdding}
          className="mt-4 btn-secondary"
        >
          {isAdding ? 'Sending...' : 'Send Invitation'}
        </button>
      </div>

      {/* Complete Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={onNext}
          className="btn-primary"
        >
          Complete Setup
        </button>
      </div>
    </div>
  );
}
