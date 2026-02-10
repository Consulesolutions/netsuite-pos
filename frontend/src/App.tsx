import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Common components
import Layout from './components/common/Layout';
import LoginPage from './components/common/LoginPage';
import BillingPage from './components/common/BillingPage';
import SettingsPage from './components/common/SettingsPage';

// POS components
import POSScreen from './components/pos/POSScreen';
import InventoryManagement from './components/inventory/InventoryManagement';
import CustomerManagement from './components/customers/CustomerManagement';
import ReportsDashboard from './components/reports/ReportsDashboard';

// Admin components
import AdminLayout from './components/admin/AdminLayout';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import CustomerList from './components/admin/CustomerList';
import CustomerForm from './components/admin/CustomerForm';
import CustomerDetails from './components/admin/CustomerDetails';
import AdminInvitations from './components/admin/AdminInvitations';

// Onboarding components
import AcceptInvitation from './components/onboarding/AcceptInvitation';
import OnboardingWizard from './components/onboarding/OnboardingWizard';

// Initialize auth on app load
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
    </div>
  );
}

// Super Admin protected route
function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated || user?.role !== 'super_admin') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

// Customer Admin protected route (OWNER/ADMIN roles)
function CustomerAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Super admin should not access customer routes
  if (user?.role === 'super_admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Check if user needs onboarding
  if (user?.role === 'owner' && user?.onboardingComplete === false) {
    return <Navigate to="/app/onboarding" replace />;
  }

  return <>{children}</>;
}

// POS User protected route (CASHIER/MANAGER)
function POSUserRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'super_admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}

// General protected route - redirects based on role
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'super_admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}

// Public route - redirects authenticated users
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    // Redirect based on role
    if (user?.role === 'super_admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (['cashier', 'manager'].includes(user?.role || '')) {
      return <Navigate to="/pos" replace />;
    }
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

// Role-based redirect from root
function RoleBasedRedirect() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else if (user?.role === 'super_admin') {
        navigate('/admin/dashboard');
      } else if (['cashier', 'manager'].includes(user?.role || '')) {
        navigate('/pos');
      } else if (user?.role === 'owner' && !user?.onboardingComplete) {
        navigate('/app/onboarding');
      } else {
        navigate('/app');
      }
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  return <LoadingSpinner />;
}

// Admin login route wrapper - handles redirect for authenticated super admins
function AdminLoginRoute() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated && user?.role === 'super_admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // If authenticated but not super admin, redirect to appropriate place
  if (isAuthenticated) {
    if (['cashier', 'manager'].includes(user?.role || '')) {
      return <Navigate to="/pos" replace />;
    }
    return <Navigate to="/app" replace />;
  }

  return <AdminLogin />;
}

function App() {
  return (
    <AuthInitializer>
      <Routes>
        {/* Super Admin login - exact match only */}
        <Route path="/admin" element={<AdminLoginRoute />} />

        {/* Super Admin dashboard routes */}
        <Route
          path="/admin/*"
          element={
            <SuperAdminRoute>
              <AdminLayout />
            </SuperAdminRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/new" element={<CustomerForm />} />
          <Route path="customers/:id" element={<CustomerDetails />} />
          <Route path="invitations" element={<AdminInvitations />} />
        </Route>

        {/* Invitation acceptance */}
        <Route path="/invite/:token" element={<AcceptInvitation />} />

        {/* Public login */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

        {/* Onboarding for new Customer Admins */}
        <Route
          path="/app/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingWizard />
            </ProtectedRoute>
          }
        />

        {/* Customer Admin routes - full app with sidebar */}
        <Route
          path="/app"
          element={
            <CustomerAdminRoute>
              <Layout />
            </CustomerAdminRoute>
          }
        >
          <Route index element={<Navigate to="/app/pos" replace />} />
          <Route path="pos" element={<POSScreen />} />
          <Route path="inventory" element={<InventoryManagement />} />
          <Route path="customers" element={<CustomerManagement />} />
          <Route path="reports" element={<ReportsDashboard />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/billing" element={<BillingPage />} />
        </Route>

        {/* POS-only route for cashiers/managers */}
        <Route
          path="/pos"
          element={
            <POSUserRoute>
              <POSScreen fullScreen />
            </POSUserRoute>
          }
        />

        {/* Role-based redirect from root */}
        <Route path="/" element={<RoleBasedRedirect />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthInitializer>
  );
}

export default App;
