import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/common/Layout';
import LandingPage from './components/landing/LandingPage';
import LoginPage from './components/common/LoginPage';
import SignupPage from './components/common/SignupPage';
import BillingPage from './components/common/BillingPage';
import POSScreen from './components/pos/POSScreen';
import InventoryManagement from './components/inventory/InventoryManagement';
import CustomerManagement from './components/customers/CustomerManagement';
import ReportsDashboard from './components/reports/ReportsDashboard';
import SettingsPage from './components/common/SettingsPage';

// Initialize auth on app load
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  // Redirect authenticated users to the app
  if (isAuthenticated) {
    return <Navigate to="/app/pos" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthInitializer>
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

      {/* Protected app routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </AuthInitializer>
  );
}

export default App;
