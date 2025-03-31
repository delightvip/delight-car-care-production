import React, { Suspense, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

import Layout from './components/layout/Layout';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';

// Inventory pages
import InventoryRawMaterials from './pages/inventory/InventoryRawMaterials';
import InventoryPackaging from './pages/inventory/InventoryPackaging';
import InventorySemiFinished from './pages/inventory/InventorySemiFinished';
import InventoryFinishedProducts from './pages/inventory/InventoryFinishedProducts';
import LowStockItems from './pages/inventory/LowStockItems';
import InventoryReports from './pages/inventory/InventoryReports';
import ProductDetailsContainer from './pages/inventory/ProductDetailsContainer';
import InventoryTracking from './pages/inventory/InventoryTracking';

// Production pages
import ProductionPlanning from './pages/production/ProductionPlanning';
import ProductionOrders from './pages/production/ProductionOrders';
import ProductionPackaging from './pages/production/ProductionPackaging';
import PackagingOrders from './pages/production/PackagingOrders';

// Commercial pages
import CommercialDashboard from './pages/commercial/CommercialDashboard';
import Invoices from './pages/commercial/Invoices';
import InvoiceDetails from './pages/commercial/InvoiceDetails';
import Parties from './pages/commercial/Parties';
import PartyDetails from './pages/commercial/PartyDetails';
import Payments from './pages/commercial/Payments';
import Returns from './pages/commercial/Returns';
import CommercialLedger from './pages/commercial/CommercialLedger';
import AccountStatements from './pages/commercial/AccountStatements';
import Profits from './pages/commercial/Profits';

// Financial pages
import FinancialDashboard from './pages/financial/FinancialDashboard';
import TransactionPage from './pages/financial/TransactionPage';
import CategoriesPage from './pages/financial/CategoriesPage';

// Analytics pages
import InventoryDistributionPage from './pages/analytics/InventoryDistributionPage';
import Analytics from './pages/Analytics';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // default: true
    },
  },
});

function App() {
  const [isDarkTheme, setIsDarkTheme] = React.useState(
    localStorage.getItem('darkTheme') === 'true'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkTheme);
    localStorage.setItem('darkTheme', isDarkTheme.toString());
  }, [isDarkTheme]);

  return (
    <div className="app">
      <QueryClientProvider client={queryClient}>
        <Router>
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Index />} />
                <Route path="inventory">
                  <Route index element={<InventoryRawMaterials />} />
                  <Route path="raw-materials" element={<InventoryRawMaterials />} />
                  <Route path="packaging" element={<InventoryPackaging />} />
                  <Route path="semi-finished" element={<InventorySemiFinished />} />
                  <Route path="finished-products" element={<InventoryFinishedProducts />} />
                  <Route path="low-stock" element={<LowStockItems />} />
                  <Route path="reports" element={<InventoryReports />} />
                  <Route path="tracking" element={<InventoryTracking />} />
                  <Route path="products/:type/:id" element={<ProductDetailsContainer />} />
                </Route>
                <Route path="production">
                  <Route index element={<ProductionPlanning />} />
                  <Route path="planning" element={<ProductionPlanning />} />
                  <Route path="orders" element={<ProductionOrders />} />
                  <Route path="packaging" element={<ProductionPackaging />} />
                  <Route path="packaging-orders" element={<PackagingOrders />} />
                </Route>
                <Route path="commercial">
                  <Route index element={<CommercialDashboard />} />
                  <Route path="invoices" element={<Invoices />} />
                  <Route path="invoices/:id" element={<InvoiceDetails />} />
                  <Route path="parties" element={<Parties />} />
                  <Route path="parties/:id" element={<PartyDetails />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="returns" element={<Returns />} />
                  <Route path="ledger" element={<CommercialLedger />} />
                  <Route path="statements" element={<AccountStatements />} />
                  <Route path="profits" element={<Profits />} />
                </Route>
                <Route path="financial">
                  <Route index element={<FinancialDashboard />} />
                  <Route path="transactions" element={<TransactionPage />} />
                  <Route path="categories" element={<CategoriesPage />} />
                </Route>
                <Route path="analytics">
                  <Route index element={<Analytics />} />
                  <Route path="inventory-distribution" element={<InventoryDistributionPage />} />
                </Route>
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </div>
  );
}

export default App;
