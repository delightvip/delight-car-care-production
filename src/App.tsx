import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Layout from './components/layout/Layout';
import Index from './pages/Index';
import RawMaterials from './pages/inventory/RawMaterials';
import SemiFinishedProducts from './pages/inventory/SemiFinishedProducts';
import PackagingMaterials from './pages/inventory/PackagingMaterials';
import FinishedProducts from './pages/inventory/FinishedProducts';
import InventoryTracking from './pages/inventory/InventoryTracking';
import LowStockItems from './pages/inventory/LowStockItems';
import InventoryReports from './pages/inventory/InventoryReports';
import ProductionOrders from './pages/production/ProductionOrders';
import PackagingOrders from './pages/production/PackagingOrders';
import CommercialDashboard from './pages/commercial/CommercialDashboard';
import Invoices from './pages/commercial/Invoices';
import InvoiceDetails from './pages/commercial/InvoiceDetails';
import Parties from './pages/commercial/Parties';
import PartyDetails from './pages/commercial/PartyDetails';
import Payments from './pages/commercial/Payments';
import Returns from './pages/commercial/Returns';
import CommercialLedger from './pages/commercial/CommercialLedger';
import AccountStatements from './pages/commercial/AccountStatements';
import FinancialDashboard from './pages/financial/FinancialDashboard';
import TransactionPage from './pages/financial/TransactionPage';
import CategoriesPage from './pages/financial/CategoriesPage';
import Analytics from './pages/analytics/Analytics';
import InventoryDistributionPage from './pages/analytics/InventoryDistributionPage';
import Settings from './pages/settings/Settings';
import NotFound from './pages/NotFound';
import Profits from './pages/commercial/Profits';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <div className="App">
      <Toaster />
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Index />} />
            <Route path="inventory" element={<Navigate replace to="/inventory/raw-materials" />} />
            <Route path="inventory/raw-materials" element={<RawMaterials />} />
            <Route path="inventory/semi-finished" element={<SemiFinishedProducts />} />
            <Route path="inventory/packaging" element={<PackagingMaterials />} />
            <Route path="inventory/finished" element={<FinishedProducts />} />
            <Route path="inventory/tracking" element={<InventoryTracking />} />
            <Route path="inventory/low-stock" element={<LowStockItems />} />
            <Route path="inventory/reports" element={<InventoryReports />} />
            
            <Route path="production" element={<Navigate replace to="/production/orders" />} />
            <Route path="production/orders" element={<ProductionOrders />} />
            <Route path="production/packaging-orders" element={<PackagingOrders />} />
            
            <Route path="commercial" element={<CommercialDashboard />} />
            <Route path="commercial/invoices" element={<Invoices />} />
            <Route path="commercial/invoices/:id" element={<InvoiceDetails />} />
            <Route path="commercial/parties" element={<Parties />} />
            <Route path="commercial/parties/:id" element={<PartyDetails />} />
            <Route path="commercial/payments" element={<Payments />} />
            <Route path="commercial/profits" element={<Profits />} />
            <Route path="commercial/returns" element={<Returns />} />
            <Route path="commercial/ledger" element={<CommercialLedger />} />
            <Route path="commercial/statements" element={<AccountStatements />} />
            
            <Route path="financial" element={<FinancialDashboard />} />
            <Route path="financial/transactions" element={<TransactionPage />} />
            <Route path="financial/categories" element={<CategoriesPage />} />
            
            <Route path="analytics" element={<Analytics />} />
            <Route path="analytics/inventory-distribution" element={<InventoryDistributionPage />} />
            
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </QueryClientProvider>
    </div>
  );
}

export default App;
