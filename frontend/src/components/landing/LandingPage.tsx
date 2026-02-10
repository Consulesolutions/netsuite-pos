import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CloudArrowUpIcon,
  ShieldCheckIcon,
  CubeIcon,
  DevicePhoneMobileIcon,
  ChartBarIcon,
  CreditCardIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  CheckIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

const navigation = [
  { name: 'Features', href: '#features' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'Testimonials', href: '#testimonials' },
  { name: 'FAQ', href: '#faq' },
];

const features = [
  {
    name: 'NetSuite Integration',
    description: 'Seamless two-way sync with NetSuite ERP. Items, customers, inventory, and transactions stay in perfect harmony.',
    icon: CloudArrowUpIcon,
  },
  {
    name: 'Offline Mode',
    description: 'Keep selling even when the internet goes down. All data syncs automatically when you\'re back online.',
    icon: DevicePhoneMobileIcon,
  },
  {
    name: 'Multi-Location',
    description: 'Manage multiple stores, warehouses, and subsidiaries from a single dashboard with real-time visibility.',
    icon: BuildingStorefrontIcon,
  },
  {
    name: 'Inventory Management',
    description: 'Real-time stock levels, low stock alerts, transfer orders, and inventory counts across all locations.',
    icon: CubeIcon,
  },
  {
    name: 'Advanced Reporting',
    description: 'Daily summaries, sales trends, top products, cashier performance, and custom reports at your fingertips.',
    icon: ChartBarIcon,
  },
  {
    name: 'Secure Payments',
    description: 'Accept cash, cards, gift cards, store credit, and split payments. PCI-compliant card processing.',
    icon: CreditCardIcon,
  },
  {
    name: 'Team Management',
    description: 'Role-based access control, shift management, cashier accountability, and performance tracking.',
    icon: UsersIcon,
  },
  {
    name: 'Enterprise Security',
    description: 'SOC 2 compliant, encrypted data, audit logs, and granular permissions to keep your business safe.',
    icon: ShieldCheckIcon,
  },
];

const plans = [
  {
    name: 'Starter',
    id: 'starter',
    price: 49,
    description: 'Perfect for small businesses getting started with modern POS.',
    features: [
      '1 Location',
      '2 Registers',
      '5 Team Members',
      '500 Products',
      'Basic Reports',
      'Email Support',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    id: 'professional',
    price: 99,
    description: 'For growing businesses that need more power and flexibility.',
    features: [
      '3 Locations',
      '10 Registers',
      '20 Team Members',
      '5,000 Products',
      'Advanced Reports',
      'Offline Mode',
      'Priority Support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    price: 249,
    description: 'Full power for large organizations with complex needs.',
    features: [
      'Unlimited Locations',
      'Unlimited Registers',
      'Unlimited Team Members',
      'Unlimited Products',
      'NetSuite Sync',
      'Custom Integrations',
      'Dedicated Support',
      'SLA Guarantee',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

const testimonials = [
  {
    content: 'Finally, a POS that actually works with NetSuite! We reduced our manual data entry by 90% and our inventory is always accurate now.',
    author: 'Sarah Chen',
    role: 'Operations Manager',
    company: 'Urban Outfitters Co.',
    rating: 5,
  },
  {
    content: 'The offline mode saved us during a network outage. We kept ringing up sales and everything synced perfectly when we got back online.',
    author: 'Michael Torres',
    role: 'Store Manager',
    company: 'Fresh Market Foods',
    rating: 5,
  },
  {
    content: 'Managing 12 locations used to be a nightmare. Now I can see real-time sales and inventory from anywhere. Game changer.',
    author: 'Jennifer Walsh',
    role: 'VP of Retail',
    company: 'StyleHouse Brands',
    rating: 5,
  },
];

const faqs = [
  {
    question: 'How does the NetSuite integration work?',
    answer: 'Our integration uses NetSuite\'s official REST API and custom SuiteScripts to provide real-time, two-way sync. Items, customers, inventory levels, and transactions are automatically synchronized. Setup takes about 30 minutes with our guided wizard.',
  },
  {
    question: 'What happens if my internet goes down?',
    answer: 'Our Progressive Web App stores all your product and customer data locally. You can continue processing sales offline, and everything automatically syncs when your connection is restored. No sales lost, ever.',
  },
  {
    question: 'Can I use my existing hardware?',
    answer: 'Yes! We support most receipt printers (Star, Epson, etc.), barcode scanners, cash drawers, and payment terminals. The system works on any device with a modern web browser - tablets, laptops, or dedicated POS hardware.',
  },
  {
    question: 'Is there a long-term contract?',
    answer: 'No contracts required. Pay month-to-month and cancel anytime. We also offer annual plans with 2 months free if you prefer to pay upfront.',
  },
  {
    question: 'How secure is my data?',
    answer: 'We take security seriously. All data is encrypted in transit and at rest. We\'re SOC 2 Type II compliant, PCI-DSS certified for payment processing, and perform regular security audits. Your data is backed up every hour.',
  },
  {
    question: 'Do you offer training and support?',
    answer: 'Absolutely! All plans include email support and access to our knowledge base. Professional and Enterprise plans include priority support with faster response times. Enterprise customers get a dedicated success manager and custom training.',
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="bg-white">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <nav className="flex items-center justify-between p-4 lg:px-8 max-w-7xl mx-auto">
          <div className="flex lg:flex-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">POS</span>
              </div>
              <span className="text-xl font-bold text-gray-900">NetSuite POS</span>
            </Link>
          </div>

          <div className="flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-gray-700"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>

          <div className="hidden lg:flex lg:gap-x-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                {item.name}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-700 hover:text-primary-600 px-4 py-2"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black/20" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <Link to="/" className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">POS</span>
                  </div>
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-lg font-medium text-gray-900 hover:text-primary-600"
                  >
                    {item.name}
                  </a>
                ))}
                <hr className="my-4" />
                <Link
                  to="/login"
                  className="block text-lg font-medium text-gray-900 hover:text-primary-600"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="block w-full text-center text-lg font-medium text-white bg-primary-600 hover:bg-primary-700 px-4 py-3 rounded-lg"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-blue-50" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNlMGU3ZmYiIGZpbGwtb3BhY2l0eT0iLjUiLz48L2c+PC9zdmc+')] opacity-40" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              Now with full NetSuite integration
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
              The Point of Sale
              <span className="block text-primary-600">Built for NetSuite</span>
            </h1>

            <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
              Enterprise-grade POS that syncs seamlessly with your NetSuite ERP.
              Real-time inventory, offline capability, and powerful reporting — all in one platform.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-lg shadow-primary-500/30 transition-all hover:shadow-xl hover:shadow-primary-500/40 hover:-translate-y-0.5"
              >
                Start Free 14-Day Trial
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 shadow-sm transition-all"
              >
                Watch Demo
              </a>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              No credit card required • Free 14-day trial • Cancel anytime
            </p>
          </div>

          {/* Hero Image */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-4 text-sm text-gray-400">NetSuite POS - Dashboard</span>
              </div>
              <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 aspect-[16/9] flex items-center justify-center">
                <div className="grid grid-cols-3 gap-4 w-full max-w-4xl">
                  {/* Mock POS Interface */}
                  <div className="col-span-2 bg-white rounded-xl shadow-lg p-4">
                    <div className="grid grid-cols-4 gap-2">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="w-8 h-8 bg-primary-100 rounded-lg" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-4 bg-gray-100 rounded w-1/2" />
                      <div className="h-4 bg-gray-100 rounded w-2/3" />
                      <div className="mt-4 h-10 bg-primary-500 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-500 mb-6">Trusted by leading retailers worldwide</p>
            <div className="flex flex-wrap justify-center gap-8 opacity-60 grayscale">
              {['Brand 1', 'Brand 2', 'Brand 3', 'Brand 4', 'Brand 5'].map((brand) => (
                <div key={brand} className="h-8 w-24 bg-gray-300 rounded flex items-center justify-center text-xs text-gray-500">
                  {brand}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Everything you need to run your retail business
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Powerful features that work together seamlessly to streamline your operations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="relative p-6 bg-gray-50 rounded-2xl hover:bg-primary-50 transition-colors group"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.name}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Seamless NetSuite Integration
              </h2>
              <p className="mt-4 text-xl text-gray-600">
                No more manual data entry or sync headaches. Our deep integration with NetSuite keeps everything in perfect harmony.
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  'Real-time item and inventory sync',
                  'Customer records stay up-to-date',
                  'Transactions post directly to NetSuite',
                  'Support for price levels and discounts',
                  'Multi-subsidiary support',
                  'Custom field mapping',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/signup"
                className="inline-flex items-center mt-8 text-primary-600 font-semibold hover:text-primary-700"
              >
                Learn more about our integration
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-blue-500 rounded-3xl transform rotate-3 opacity-10" />
              <div className="relative bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                      <span className="text-primary-600 font-bold">POS</span>
                    </div>
                    <div className="h-px w-12 bg-gray-200" />
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm text-gray-500">Syncing</span>
                    </div>
                    <div className="h-px w-12 bg-gray-200" />
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <span className="text-orange-600 font-bold text-xs">NS</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Items', count: '2,847', status: 'synced' },
                    { label: 'Customers', count: '12,493', status: 'synced' },
                    { label: 'Inventory', count: '45 locations', status: 'synced' },
                    { label: 'Transactions', count: '1,203 today', status: 'syncing' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm text-gray-500">{item.label}</p>
                        <p className="font-semibold text-gray-900">{item.count}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === 'synced'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Start free, upgrade when you're ready. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 ${
                  plan.popular
                    ? 'bg-primary-600 text-white ring-4 ring-primary-600 ring-offset-4'
                    : 'bg-gray-50 text-gray-900'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-5xl font-bold">${plan.price}</span>
                    <span className={plan.popular ? 'text-primary-200' : 'text-gray-500'}>/month</span>
                  </div>
                  <p className={`mt-2 text-sm ${plan.popular ? 'text-primary-200' : 'text-gray-600'}`}>
                    {plan.description}
                  </p>
                </div>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckIcon className={`w-5 h-5 flex-shrink-0 ${
                        plan.popular ? 'text-primary-200' : 'text-green-500'
                      }`} />
                      <span className={plan.popular ? 'text-white' : 'text-gray-700'}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.id === 'enterprise' ? '/contact' : '/signup'}
                  className={`mt-8 block w-full py-3 px-4 rounded-xl font-semibold text-center transition-colors ${
                    plan.popular
                      ? 'bg-white text-primary-600 hover:bg-gray-100'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-12 text-center text-gray-500">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Loved by retailers everywhere
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              See what our customers have to say about their experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6">"{testimonial.content}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}, {testimonial.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 lg:py-32 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 text-gray-600">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-primary-600 to-primary-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to transform your retail operations?
          </h2>
          <p className="mt-4 text-xl text-primary-100">
            Join thousands of retailers who've already made the switch. Start your free trial today.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-primary-600 bg-white hover:bg-gray-100 rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
            >
              Start Free Trial
            </Link>
            <a
              href="mailto:sales@yourpos.com"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 hover:border-white/50 rounded-xl transition-all"
            >
              Talk to Sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">POS</span>
                </div>
                <span className="text-xl font-bold text-white">NetSuite POS</span>
              </div>
              <p className="text-sm">
                Enterprise-grade Point of Sale system with full NetSuite ERP integration.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Hardware</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              &copy; {new Date().getFullYear()} NetSuite POS. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
