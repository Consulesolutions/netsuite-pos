import { useState, useEffect } from 'react';
import {
  CalendarIcon,
  ArrowPathIcon,
  BanknotesIcon,
  ShoppingCartIcon,
  UsersIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { api } from '../../services/api';
import type { DailySummary, PaymentMethod } from '../../types';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsDashboard() {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<DailySummary | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      let startDate: Date;

      switch (dateRange) {
        case 'today':
          startDate = startOfDay(today);
          break;
        case 'week':
          startDate = subDays(today, 7);
          break;
        case 'month':
          startDate = subDays(today, 30);
          break;
      }

      const response = await api.get('/reports/daily-summary', {
        startDate: startDate.toISOString(),
        endDate: endOfDay(today).toISOString(),
      });

      setSummary(response.data);
    } catch (error) {
      // Use mock data for demo
      setSummary(getMockData());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>No data available</p>
      </div>
    );
  }

  const paymentData = Object.entries(summary.paymentBreakdown).map(([method, amount]) => ({
    name: formatPaymentMethod(method as PaymentMethod),
    value: amount,
  }));

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Sales Reports</h1>

        <div className="flex items-center gap-4">
          {/* Date range selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['today', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-white shadow text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range === 'today' ? 'Today' : range === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <StatCard
          icon={BanknotesIcon}
          label="Total Sales"
          value={`$${summary.totalSales.toFixed(2)}`}
          color="bg-green-100 text-green-700"
        />
        <StatCard
          icon={ShoppingCartIcon}
          label="Transactions"
          value={summary.transactionCount.toString()}
          color="bg-blue-100 text-blue-700"
        />
        <StatCard
          icon={UsersIcon}
          label="Avg. Transaction"
          value={`$${summary.averageTransaction.toFixed(2)}`}
          color="bg-purple-100 text-purple-700"
        />
        <StatCard
          icon={CubeIcon}
          label="Items Sold"
          value={summary.topItems.reduce((sum, i) => sum + i.quantity, 0).toString()}
          color="bg-orange-100 text-orange-700"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Hourly sales chart */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Hourly Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summary.hourlyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="hour"
                tickFormatter={(hour) => `${hour}:00`}
              />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Sales']}
                labelFormatter={(hour) => `${hour}:00`}
              />
              <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment breakdown pie chart */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top items table */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4">Top Selling Items</h3>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                Rank
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                Item
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                Quantity
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                Revenue
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summary.topItems.map((item, index) => (
              <tr key={item.itemId} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                <td className="px-4 py-3 font-medium">{item.itemName}</td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right font-medium">
                  ${item.revenue.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: typeof BanknotesIcon;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function formatPaymentMethod(method: PaymentMethod): string {
  const names: Record<PaymentMethod, string> = {
    cash: 'Cash',
    card: 'Card',
    gift_card: 'Gift Card',
    store_credit: 'Store Credit',
    check: 'Check',
    other: 'Other',
  };
  return names[method] || method;
}

function getMockData(): DailySummary {
  return {
    date: format(new Date(), 'yyyy-MM-dd'),
    totalSales: 4532.50,
    transactionCount: 47,
    averageTransaction: 96.43,
    paymentBreakdown: {
      cash: 1245.00,
      card: 2987.50,
      gift_card: 200.00,
      store_credit: 100.00,
      check: 0,
      other: 0,
    },
    topItems: [
      { itemId: '1', itemName: 'Premium Coffee Blend', quantity: 42, revenue: 587.58 },
      { itemId: '2', itemName: 'Organic Green Tea', quantity: 35, revenue: 244.65 },
      { itemId: '3', itemName: 'Chocolate Croissant', quantity: 28, revenue: 139.72 },
      { itemId: '4', itemName: 'Fresh Baguette', quantity: 24, revenue: 95.76 },
      { itemId: '5', itemName: 'Almond Milk Latte', quantity: 22, revenue: 131.78 },
    ],
    hourlyBreakdown: [
      { hour: 8, sales: 245.50, count: 5 },
      { hour: 9, sales: 412.25, count: 8 },
      { hour: 10, sales: 567.80, count: 12 },
      { hour: 11, sales: 489.30, count: 10 },
      { hour: 12, sales: 678.45, count: 15 },
      { hour: 13, sales: 534.20, count: 11 },
      { hour: 14, sales: 398.60, count: 8 },
      { hour: 15, sales: 456.75, count: 9 },
      { hour: 16, sales: 345.90, count: 7 },
      { hour: 17, sales: 403.75, count: 8 },
    ],
  };
}
