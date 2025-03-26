
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/dashboard/Dashboard';
import Settings from '@/pages/settings/Settings';
import RawMaterials from '@/pages/inventory/RawMaterials';
import PackagingMaterials from '@/pages/inventory/PackagingMaterials';
import SemiFinishedProducts from '@/pages/inventory/SemiFinishedProducts';
import FinishedProducts from '@/pages/inventory/FinishedProducts';
import ProductionOrders from '@/pages/production/ProductionOrders';
import PackagingOrders from '@/pages/production/PackagingOrders';
import AddRawMaterial from '@/pages/inventory/AddRawMaterial';
import EditRawMaterial from '@/pages/inventory/EditRawMaterial';
import AddPackagingMaterial from '@/pages/inventory/AddPackagingMaterial';
import EditPackagingMaterial from '@/pages/inventory/EditPackagingMaterial';
import AddSemiFinishedProduct from '@/pages/inventory/AddSemiFinishedProduct';
import EditSemiFinishedProduct from '@/pages/inventory/EditSemiFinishedProduct';
import AddFinishedProduct from '@/pages/inventory/AddFinishedProduct';
import EditFinishedProduct from '@/pages/inventory/EditFinishedProduct';
import AddProductionOrder from '@/pages/production/AddProductionOrder';
import EditProductionOrder from '@/pages/production/EditProductionOrder';
import ProductionOrderDetails from '@/pages/production/ProductionOrderDetails';
import AddPackagingOrder from '@/pages/production/AddPackagingOrder';
import EditPackagingOrder from '@/pages/production/EditPackagingOrder';
import PackagingOrderDetails from '@/pages/production/PackagingOrderDetails';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import LowStockReport from '@/pages/reports/LowStockReport';
import InventoryMovements from '@/pages/reports/InventoryMovements';
import ProductionReport from '@/pages/reports/ProductionReport';
import PackagingReport from '@/pages/reports/PackagingReport';
import StockAdjustment from '@/pages/inventory/StockAdjustment';
import Parties from '@/pages/parties/Parties';
import PartyDetails from '@/pages/parties/PartyDetails';
import AddParty from '@/pages/parties/AddParty';
import EditParty from '@/pages/parties/EditParty';
import Invoices from '@/pages/commercial/Invoices';
import AddInvoice from '@/pages/commercial/AddInvoice';
import EditInvoice from '@/pages/commercial/EditInvoice';
import InvoiceDetails from '@/pages/commercial/InvoiceDetails';
import Payments from '@/pages/commercial/Payments';
import AddPayment from '@/pages/commercial/AddPayment';
import Returns from '@/pages/commercial/Returns';
import FinancialReports from '@/pages/reports/FinancialReports';
import CommercialReports from '@/pages/reports/CommercialReports';
import ProductDetails from '@/pages/inventory/ProductDetails';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="settings" element={<Settings />} />
              
              {/* Inventory Routes */}
              <Route path="inventory/raw-materials" element={<RawMaterials />} />
              <Route path="inventory/raw-materials/add" element={<AddRawMaterial />} />
              <Route path="inventory/raw-materials/edit/:id" element={<EditRawMaterial />} />
              <Route path="inventory/raw-materials/:id" element={<ProductDetails />} />
              
              <Route path="inventory/packaging" element={<PackagingMaterials />} />
              <Route path="inventory/packaging/add" element={<AddPackagingMaterial />} />
              <Route path="inventory/packaging/edit/:id" element={<EditPackagingMaterial />} />
              <Route path="inventory/packaging/:id" element={<ProductDetails />} />
              
              <Route path="inventory/semi-finished" element={<SemiFinishedProducts />} />
              <Route path="inventory/semi-finished/add" element={<AddSemiFinishedProduct />} />
              <Route path="inventory/semi-finished/edit/:id" element={<EditSemiFinishedProduct />} />
              <Route path="inventory/semi-finished/:id" element={<ProductDetails />} />
              
              <Route path="inventory/finished-products" element={<FinishedProducts />} />
              <Route path="inventory/finished-products/add" element={<AddFinishedProduct />} />
              <Route path="inventory/finished-products/edit/:id" element={<EditFinishedProduct />} />
              <Route path="inventory/finished-products/:id" element={<ProductDetails />} />
              
              <Route path="inventory/adjustment" element={<StockAdjustment />} />
              
              {/* Production Routes */}
              <Route path="production/production-orders" element={<ProductionOrders />} />
              <Route path="production/production-orders/add" element={<AddProductionOrder />} />
              <Route path="production/production-orders/edit/:id" element={<EditProductionOrder />} />
              <Route path="production/production-orders/:id" element={<ProductionOrderDetails />} />
              
              <Route path="production/packaging-orders" element={<PackagingOrders />} />
              <Route path="production/packaging-orders/add" element={<AddPackagingOrder />} />
              <Route path="production/packaging-orders/edit/:id" element={<EditPackagingOrder />} />
              <Route path="production/packaging-orders/:id" element={<PackagingOrderDetails />} />
              
              {/* Report Routes */}
              <Route path="reports/low-stock" element={<LowStockReport />} />
              <Route path="reports/inventory-movements" element={<InventoryMovements />} />
              <Route path="reports/production" element={<ProductionReport />} />
              <Route path="reports/packaging" element={<PackagingReport />} />
              <Route path="reports/financial" element={<FinancialReports />} />
              <Route path="reports/commercial" element={<CommercialReports />} />
              
              {/* Parties Routes */}
              <Route path="parties" element={<Parties />} />
              <Route path="parties/add" element={<AddParty />} />
              <Route path="parties/edit/:id" element={<EditParty />} />
              <Route path="parties/:id" element={<PartyDetails />} />
              
              {/* Commercial Routes */}
              <Route path="commercial/invoices" element={<Invoices />} />
              <Route path="commercial/invoices/add" element={<AddInvoice />} />
              <Route path="commercial/invoices/edit/:id" element={<EditInvoice />} />
              <Route path="commercial/invoices/:id" element={<InvoiceDetails />} />
              
              <Route path="commercial/payments" element={<Payments />} />
              <Route path="commercial/payments/add" element={<AddPayment />} />
              
              <Route path="commercial/returns" element={<Returns />} />
            </Route>
          </Routes>
        </Router>
        <SonnerToaster position="top-center" dir="rtl" />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
