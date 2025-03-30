
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Loading from './components/ui/Loading';
import Layout from './components/layout/Layout';

// For now, let's create minimal version of these components to resolve errors
const useAuth = () => ({ authenticated: true, authLoading: false });
const LoginPage = () => <div>Login Page</div>;

// Main pages
const Dashboard = React.lazy(() => import('./pages/financial/TransactionPage')); // Temporary fallback
const Settings = () => <div>Settings Page</div>;
const NoMatch = () => <div>404 Not Found</div>;

// Import the LowStockItems page
const LowStockItems = React.lazy(() => import('./pages/inventory/LowStockItems'));

// For now, we'll use the financial pages we already have
const FinancialTransactionPage = React.lazy(() => import('./pages/financial/TransactionPage'));
const FinancialPaymentsPage = React.lazy(() => import('./pages/financial/FinancialPaymentsPage'));

// Temporary placeholder components
const PlaceholderPage = () => <div>This page is not implemented yet</div>;

// Use PlaceholderPage for all missing routes
const RawMaterials = PlaceholderPage;
const SemiFinishedProducts = PlaceholderPage;
const PackagingMaterials = PlaceholderPage;
const FinishedProducts = PlaceholderPage;
const InventoryReports = PlaceholderPage;
const ProductionOrders = PlaceholderPage;
const PackagingOrders = PlaceholderPage;
const Customers = PlaceholderPage;
const Suppliers = PlaceholderPage;
const Payments = PlaceholderPage;
const Ledger = PlaceholderPage;

function App() {
  const { authenticated, authLoading } = useAuth();

  if (authLoading) {
    return <Loading />;
  }

  return (
    <Routes>
      <Route path="/login" element={
        authenticated ? <Navigate to="/" /> : <LoginPage />
      } />
      
      <Route path="/" element={
        authenticated ? <Layout /> : <Navigate to="/login" />
      }>
        <Route index element={
          <Suspense fallback={<Loading />}>
            <Dashboard />
          </Suspense>
        } />
        
        {/* Financial routes - these should work */}
        <Route path="financial" element={
          <Suspense fallback={<Loading />}>
            <FinancialTransactionPage />
          </Suspense>
        } />
        <Route path="financial/payments" element={
          <Suspense fallback={<Loading />}>
            <FinancialPaymentsPage />
          </Suspense>
        } />
        
        {/* Inventory routes */}
        <Route path="inventory/low-stock" element={
          <Suspense fallback={<Loading />}>
            <LowStockItems />
          </Suspense>
        } />
        
        {/* Placeholder routes for other sections */}
        <Route path="inventory/*" element={<PlaceholderPage />} />
        <Route path="production/*" element={<PlaceholderPage />} />
        <Route path="commercial/*" element={<PlaceholderPage />} />
        <Route path="settings" element={<Settings />} />
        
        {/* 404 */}
        <Route path="*" element={<NoMatch />} />
      </Route>
    </Routes>
  );
}

export default App;
