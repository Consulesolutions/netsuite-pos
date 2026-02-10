import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: {
    locations: number;
    registers: number;
    users: number;
    items: number;
    offlineMode: boolean;
    advancedReports: boolean;
    netsuiteSync: boolean;
  };
}

interface Subscription {
  plan: string;
  planStartDate: string;
  planEndDate: string | null;
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export default function BillingPage() {
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        api.get('/billing/plans'),
        api.get('/billing/subscription'),
      ]);
      setPlans(plansRes.data.data.plans);
      setSubscription(subRes.data.data);
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setIsProcessing(true);
    try {
      const response = await api.post('/billing/checkout', { planId });
      const { url } = response.data.data;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManageBilling = async () => {
    setIsProcessing(true);
    try {
      const response = await api.post('/billing/portal');
      const { url } = response.data.data;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to create portal session:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Billing & Subscription</h1>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          Payment successful! Your subscription has been activated.
        </div>
      )}

      {canceled && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-6">
          Payment was canceled. You can try again when you're ready.
        </div>
      )}

      {/* Current Subscription */}
      {subscription && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-primary-600">
                {subscription.plan === 'TRIAL' ? 'Free Trial' : subscription.plan}
              </p>
              {subscription.subscription && (
                <p className="text-sm text-gray-600 mt-1">
                  {subscription.subscription.cancelAtPeriodEnd
                    ? `Cancels on ${new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}`
                    : `Renews on ${new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}`}
                </p>
              )}
              {subscription.plan === 'TRIAL' && subscription.planEndDate && (
                <p className="text-sm text-gray-600 mt-1">
                  Trial ends on {new Date(subscription.planEndDate).toLocaleDateString()}
                </p>
              )}
            </div>
            {subscription.subscription && (
              <button
                onClick={handleManageBilling}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Manage Billing
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plans */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = subscription?.plan === plan.id;
          const isPopular = plan.id === 'PROFESSIONAL';

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 relative ${
                isPopular ? 'border-primary-500' : 'border-gray-200'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-600">/month</span>
              </div>

              <ul className="mt-6 space-y-3">
                <li className="flex items-center text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {formatLimit(plan.features.locations)} Location{plan.features.locations !== 1 ? 's' : ''}
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {formatLimit(plan.features.registers)} Register{plan.features.registers !== 1 ? 's' : ''}
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {formatLimit(plan.features.users)} User{plan.features.users !== 1 ? 's' : ''}
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {formatLimit(plan.features.items)} Items
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <svg
                    className={`w-5 h-5 mr-2 ${plan.features.offlineMode ? 'text-green-500' : 'text-gray-300'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Offline Mode
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <svg
                    className={`w-5 h-5 mr-2 ${plan.features.advancedReports ? 'text-green-500' : 'text-gray-300'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Advanced Reports
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <svg
                    className={`w-5 h-5 mr-2 ${plan.features.netsuiteSync ? 'text-green-500' : 'text-gray-300'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  NetSuite Sync
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isCurrentPlan || isProcessing}
                className={`mt-6 w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
                  isCurrentPlan
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isPopular
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isCurrentPlan ? 'Current Plan' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center text-sm text-gray-600">
        <p>Need a custom plan for your enterprise? <a href="mailto:sales@yourpos.com" className="text-primary-600 hover:underline">Contact sales</a></p>
      </div>
    </div>
  );
}
