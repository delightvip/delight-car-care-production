
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/dashboard/Dashboard';
import Settings from '@/pages/Settings';
import RawMaterials from '@/pages/inventory/RawMaterials';
import PackagingMaterials from '@/pages/inventory/PackagingMaterials';
import SemiFinishedProducts from '@/pages/inventory/SemiFinishedProducts';
import FinishedProducts from '@/pages/inventory/FinishedProducts';
import ProductionOrders from '@/pages/production/ProductionOrders';
import PackagingOrders from '@/pages/production/PackagingOrders';
import ProductDetails from '@/pages/inventory/ProductDetails';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';

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
              <Route path="inventory/raw-materials/:id" element={<ProductDetails />} />
              
              <Route path="inventory/packaging" element={<PackagingMaterials />} />
              <Route path="inventory/packaging/:id" element={<ProductDetails />} />
              
              <Route path="inventory/semi-finished" element={<SemiFinishedProducts />} />
              <Route path="inventory/semi-finished/:id" element={<ProductDetails />} />
              
              <Route path="inventory/finished-products" element={<FinishedProducts />} />
              <Route path="inventory/finished-products/:id" element={<ProductDetails />} />
              
              {/* Production Routes */}
              <Route path="production/production-orders" element={<ProductionOrders />} />
              <Route path="production/packaging-orders" element={<PackagingOrders />} />
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
