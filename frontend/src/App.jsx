import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider } from './components/Navbar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminTickets from './pages/admin/AdminTickets';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerNewOrder from './pages/customer/CustomerNewOrder';
import CustomerOrders from './pages/customer/CustomerOrders';
import CustomerProfile from './pages/customer/CustomerProfile';

// Loading screen component
const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loading-spinner-lg" />
    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Memuat aplikasi...</p>
  </div>
);

// Protected Route
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/customer" replace />;
  if (!adminOnly && user.role === 'admin') return <Navigate to="/admin" replace />;
  return children;
};

// Public route (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/customer'} replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth Routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute adminOnly><AdminOrders /></ProtectedRoute>} />
      <Route path="/admin/products" element={<ProtectedRoute adminOnly><AdminProducts /></ProtectedRoute>} />
      <Route path="/admin/customers" element={<ProtectedRoute adminOnly><AdminCustomers /></ProtectedRoute>} />
      <Route path="/admin/coupons" element={<ProtectedRoute adminOnly><AdminCoupons /></ProtectedRoute>} />
      <Route path="/admin/tickets" element={<ProtectedRoute adminOnly><AdminTickets /></ProtectedRoute>} />

      {/* Customer Routes */}
      <Route path="/customer" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
      <Route path="/customer/new-order" element={<ProtectedRoute><CustomerNewOrder /></ProtectedRoute>} />
      <Route path="/customer/orders" element={<ProtectedRoute><CustomerOrders /></ProtectedRoute>} />
      <Route path="/customer/profile" element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SidebarProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1F2937',
                color: '#F9FAFB',
                border: '1px solid rgba(108,99,255,0.3)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#10B981', secondary: '#F9FAFB' } },
              error: { iconTheme: { primary: '#EF4444', secondary: '#F9FAFB' } },
            }}
          />
          <AppRoutes />
        </SidebarProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
