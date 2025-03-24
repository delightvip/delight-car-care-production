
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import Index from '@/pages/Index';
import Analytics from '@/pages/Analytics';
import InventoryRawMaterials from '@/pages/inventory/InventoryRawMaterials';
import InventorySemiFinished from '@/pages/inventory/InventorySemiFinished';
import InventoryPackaging from '@/pages/inventory/InventoryPackaging';
import InventoryFinishedProducts from '@/pages/inventory/InventoryFinishedProducts';
import InventoryLowStock from '@/pages/inventory/LowStockItems';
import InventoryTracking from '@/pages/inventory/InventoryTracking';
import ProductionOrders from '@/pages/production/ProductionOrders';
import ProductionPackaging from '@/pages/production/ProductionPackaging';
import ProductionPlanning from '@/pages/production/ProductionPlanning';
import Navbar from '@/components/layout/Navbar';
import ModernSidebar from '@/components/layout/ModernSidebar';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import LowStockNotifier from '@/components/notifications/LowStockNotifier';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="delight-ui-theme">
        <TooltipProvider>
          {/* 
            Important: SidebarProvider must wrap the entire app content,
            including any components that use useSidebar, like Navbar or ModernSidebar
          */}
          <SidebarProvider>
            <Router>
              <div className="min-h-screen flex w-full">
                <Navbar />
                <ModernSidebar />
                <div className="flex-1 pt-16">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/inventory/raw-materials" element={<InventoryRawMaterials />} />
                    <Route path="/inventory/semi-finished" element={<InventorySemiFinished />} />
                    <Route path="/inventory/packaging" element={<InventoryPackaging />} />
                    <Route path="/inventory/finished-products" element={<InventoryFinishedProducts />} />
                    <Route path="/inventory/low-stock" element={<InventoryLowStock />} />
                    <Route path="/inventory/tracking" element={<InventoryTracking />} />
                    <Route path="/production/orders" element={<ProductionOrders />} />
                    <Route path="/production/packaging" element={<ProductionPackaging />} />
                    <Route path="/production/planning" element={<ProductionPlanning />} />
                  </Routes>
                </div>
                <Toaster />
                <LowStockNotifier />
              </div>
            </Router>
          </SidebarProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
