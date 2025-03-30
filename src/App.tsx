
import { useState } from 'react';
import './App.css';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ThemeProvider } from './components/theme-provider';
import NotificationProvider from './components/notifications/NotificationProvider';
import { Toaster } from '@/components/ui/sonner';

// Pages
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';

// Inventory Pages
import InventoryRawMaterials from './pages/inventory/InventoryRawMaterials';
import InventoryPackaging from './pages/inventory/InventoryPackaging';
import InventorySemiFinished from './pages/inventory/InventorySemiFinished';
import InventoryFinishedProducts from './pages/inventory/InventoryFinishedProducts';
import LowStockItems from './pages/inventory/LowStockItems';
import InventoryTracking from './pages/inventory/InventoryTracking';
import ProductDetails from './pages/inventory/ProductDetails';
import InventoryReports from './pages/inventory/InventoryReports';

// Production Pages
import ProductionOrders from './pages/production/ProductionOrders';
import ProductionPackaging from './pages/production/ProductionPackaging';
import ProductionPlanning from './pages/production/ProductionPlanning';

// Commercial Pages
import Parties from './pages/commercial/Parties';
import PartyDetails from './pages/commercial/PartyDetails';
import Invoices from './pages/commercial/Invoices';
import InvoiceDetails from './pages/commercial/InvoiceDetails';
import Payments from './pages/commercial/Payments';
import Returns from './pages/commercial/Returns';
import AccountStatements from './pages/commercial/AccountStatements';
import CommercialDashboard from './pages/commercial/CommercialDashboard';

// Analytics
import Analytics from './pages/Analytics';
import InventoryDistributionPage from './pages/analytics/InventoryDistributionPage';

// Financial Pages
import FinancialDashboard from './pages/financial/FinancialDashboard';
import TransactionPage from './pages/financial/TransactionPage';
import CategoriesPage from './pages/financial/CategoriesPage';
import CategoryForm from './components/financial/CategoryForm';

// Export the components for use in the main App.tsx
export {
  FinancialDashboard,
  TransactionPage,
  CategoriesPage,
  CategoryForm
};

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <NotificationProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Dashboard */}
            <Route index element={<Index />} />
            
            {/* Inventory Routes */}
            <Route path="inventory/raw-materials" element={<InventoryRawMaterials />} />
            <Route path="inventory/packaging" element={<InventoryPackaging />} />
            <Route path="inventory/semi-finished" element={<InventorySemiFinished />} />
            <Route path="inventory/finished-products" element={<InventoryFinishedProducts />} />
            <Route path="inventory/low-stock" element={<LowStockItems />} />
            <Route path="inventory/tracking" element={<InventoryTracking />} />
            <Route path="inventory/:type/:id" element={<ProductDetails />} />
            <Route path="inventory/:type/:id/reports" element={<InventoryReports />} />
            
            {/* Production Routes */}
            <Route path="production/orders" element={<ProductionOrders />} />
            <Route path="production/packaging" element={<ProductionPackaging />} />
            <Route path="production/planning" element={<ProductionPlanning />} />
            
            {/* Commercial Routes */}
            <Route path="commercial" element={<CommercialDashboard />} />
            <Route path="commercial/parties" element={<Parties />} />
            <Route path="commercial/parties/:id" element={<PartyDetails />} />
            <Route path="commercial/invoices" element={<Invoices />} />
            <Route path="commercial/invoices/:id" element={<InvoiceDetails />} />
            <Route path="commercial/payments" element={<Payments />} />
            <Route path="commercial/returns" element={<Returns />} />
            <Route path="commercial/statements" element={<AccountStatements />} />
            
            {/* Analytics Routes */}
            <Route path="analytics" element={<Analytics />} />
            <Route path="analytics/inventory-distribution" element={<InventoryDistributionPage />} />
            
            {/* Financial Routes */}
            <Route path="financial" element={<FinancialDashboard />} />
            <Route path="financial/transactions/new" element={<TransactionPage />} />
            <Route path="financial/transactions/edit/:id" element={<TransactionPage />} />
            <Route path="financial/categories" element={<CategoriesPage />} />
            <Route path="financial/categories/new" element={<CategoryForm />} />
            <Route path="financial/categories/edit/:id" element={<CategoryForm />} />
            
            {/* Settings */}
            <Route path="settings" element={<Settings />} />
            
            {/* 404 - Not Found */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        <Toaster position="top-left" dir="rtl" />
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
