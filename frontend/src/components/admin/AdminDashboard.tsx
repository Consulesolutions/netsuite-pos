import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  ArrowTrendingUpIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface Stats {
  tenants: {
    total: number;
    active: number;
    byPlan: Record<string, number>;
    newLast30Days: number;
  };
  users: {
    total: number;
  };
  transactions: {
    total: number;
    last30Days: number;
  };
  invitations: {
    pending: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data.data);
    } catch (error) {
      toast.error('Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Customers',
      value: stats?.tenants.total || 0,
      subtitle: `${stats?.tenants.active || 0} active`,
      icon: BuildingOfficeIcon,
      color: 'bg-blue-500',
      link: '/admin/customers',
    },
    {
      title: 'Total Users',
      value: stats?.users.total || 0,
      subtitle: 'Across all tenants',
      icon: UsersIcon,
      color: 'bg-green-500',
    },
    {
      title: 'Transactions',
      value: stats?.transactions.total || 0,
      subtitle: `${stats?.transactions.last30Days || 0} last 30 days`,
      icon: CurrencyDollarIcon,
      color: 'bg-purple-500',
    },
    {
      title: 'Pending Invitations',
      value: stats?.invitations.pending || 0,
      subtitle: 'Awaiting acceptance',
      icon: EnvelopeIcon,
      color: 'bg-orange-500',
      link: '/admin/invitations',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your POS platform</p>
        </div>
        <Link
          to="/admin/customers/new"
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Customer
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.title} className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            {stat.link && (
              <Link
                to={stat.link}
                className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
              >
                View all
                <ArrowTrendingUpIcon className="w-4 h-4" />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Plans Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customers by Plan</h2>
          <div className="space-y-4">
            {Object.entries(stats?.tenants.byPlan || {}).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${
                    plan === 'ENTERPRISE' ? 'bg-purple-500' :
                    plan === 'PROFESSIONAL' ? 'bg-blue-500' :
                    plan === 'STARTER' ? 'bg-green-500' :
                    'bg-gray-400'
                  }`} />
                  <span className="font-medium text-gray-700 capitalize">
                    {plan.toLowerCase()}
                  </span>
                </div>
                <span className="text-gray-900 font-semibold">{count}</span>
              </div>
            ))}
            {Object.keys(stats?.tenants.byPlan || {}).length === 0 && (
              <p className="text-gray-500 text-sm">No customers yet</p>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/admin/customers/new"
              className="block p-4 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <BuildingOfficeIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Add New Customer</p>
                  <p className="text-sm text-gray-500">Create a new tenant account</p>
                </div>
              </div>
            </Link>
            <Link
              to="/admin/invitations"
              className="block p-4 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <EnvelopeIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Manage Invitations</p>
                  <p className="text-sm text-gray-500">View pending invitations</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Growth</h2>
        <div className="flex items-center gap-2 text-gray-600">
          <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
          <span>
            <strong className="text-gray-900">{stats?.tenants.newLast30Days || 0}</strong> new customers in the last 30 days
          </span>
        </div>
      </div>
    </div>
  );
}
