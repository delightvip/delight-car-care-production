
import React, { Suspense } from 'react';
import { useAuth } from './hooks/useAuth';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Loading from './components/ui/Loading';
import LoginPage from './pages/auth/LoginPage';

// Main pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Settings = React.lazy(() => import('./pages/Settings'));
const NoMatch = React.lazy(() => import('./pages/NoMatch'));

// Inventory pages
const RawMaterials = React.lazy(() => import('./pages/inventory/RawMaterialsPage'));
const SemiFinishedProducts = React.lazy(() => import('./pages/inventory/SemiFinishedPage'));
const PackagingMaterials = React.lazy(() => import('./pages/inventory/PackagingMaterialsPage'));
const FinishedProducts = React.lazy(() => import('./pages/inventory/FinishedProductsPage'));
const InventoryReports = React.lazy(() => import('./pages/inventory/InventoryReportsPage'));

// Production pages
const ProductionOrders = React.lazy(() => import('./pages/production/ProductionOrdersPage'));
const PackagingOrders = React.lazy(() => import('./pages/production/PackagingOrdersPage'));

// Commercial pages
const Customers = React.lazy(() => import('./pages/commercial/Customers'));
const Suppliers = React.lazy(() => import('./pages/commercial/Suppliers'));
const Payments = React.lazy(() => import('./pages/commercial/Payments'));
const Ledger = React.lazy(() => import('./pages/commercial/LedgerPage'));

// Financial pages
const TransactionPage = React.lazy(() => import('./pages/financial/TransactionPage'));
const FinancialPaymentsPage = React.lazy(() => import('./pages/financial/FinancialPaymentsPage'));

function App() {
  const { authenticated, authLoading } = useAuth();

  if (authLoading) {
    return <Loading />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          authenticated ? <Navigate to="/" /> : <LoginPage />
        } />
        
        <Route path="/" element={
          authenticated ? <AppLayout /> : <Navigate to="/login" />
        }>
          <Route index element={
            <Suspense fallback={<Loading />}>
              <Dashboard />
            </Suspense>
          } />
          
          {/* Inventory routes */}
          <Route path="inventory/raw-materials" element={
            <Suspense fallback={<Loading />}>
              <RawMaterials />
            </Suspense>
          } />
          <Route path="inventory/semi-finished" element={
            <Suspense fallback={<Loading />}>
              <SemiFinishedProducts />
            </Suspense>
          } />
          <Route path="inventory/packaging-materials" element={
            <Suspense fallback={<Loading />}>
              <PackagingMaterials />
            </Suspense>
          } />
          <Route path="inventory/finished-products" element={
            <Suspense fallback={<Loading />}>
              <FinishedProducts />
            </Suspense>
          } />
          <Route path="inventory/reports" element={
            <Suspense fallback={<Loading />}>
              <InventoryReports />
            </Suspense>
          } />
          
          {/* Production routes */}
          <Route path="production/orders" element={
            <Suspense fallback={<Loading />}>
              <ProductionOrders />
            </Suspense>
          } />
          <Route path="production/packaging" element={
            <Suspense fallback={<Loading />}>
              <PackagingOrders />
            </Suspense>
          } />
          
          {/* Commercial routes */}
          <Route path="commercial/parties/customers" element={
            <Suspense fallback={<Loading />}>
              <Customers />
            </Suspense>
          } />
          <Route path="commercial/parties/suppliers" element={
            <Suspense fallback={<Loading />}>
              <Suppliers />
            </Suspense>
          } />
          <Route path="commercial/payments" element={
            <Suspense fallback={<Loading />}>
              <Payments />
            </Suspense>
          } />
          <Route path="commercial/ledger" element={
            <Suspense fallback={<Loading />}>
              <Ledger />
            </Suspense>
          } />
          
          {/* Financial routes */}
          <Route path="financial" element={
            <Suspense fallback={<Loading />}>
              <TransactionPage />
            </Suspense>
          } />
          <Route path="financial/payments" element={
            <Suspense fallback={<Loading />}>
              <FinancialPaymentsPage />
            </Suspense>
          } />
          
          {/* Settings */}
          <Route path="settings" element={
            <Suspense fallback={<Loading />}>
              <Settings />
            </Suspense>
          } />
          
          {/* 404 */}
          <Route path="*" element={
            <Suspense fallback={<Loading />}>
              <NoMatch />
            </Suspense>
          } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
