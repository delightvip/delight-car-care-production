
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SidebarProvider } from "@/components/layout/SidebarContext";
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
import Parties from '@/pages/commercial/Parties';
import PartyDetails from '@/pages/commercial/PartyDetails';
import Invoices from '@/pages/commercial/Invoices';
import InvoiceDetails from '@/pages/commercial/InvoiceDetails';
import Returns from '@/pages/commercial/Returns';
import Payments from '@/pages/commercial/Payments';
import AccountStatements from '@/pages/commercial/AccountStatements';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/ModernSidebar';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotificationProvider from '@/components/notifications/NotificationProvider';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import NotFound from '@/pages/NotFound';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import InventoryDistributionPage from '@/pages/analytics/InventoryDistributionPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="delight-ui-theme">
        <TooltipProvider>
          <Router>
            <SidebarProvider>
              <NotificationProvider>
                <div className="min-h-screen flex w-full">
                  <div className="min-h-screen flex w-full group/sidebar-wrapper">
                    <Navbar />
                    <Sidebar />
                    <div className="flex-1 pt-16 md:pl-0 md:pr-64">
                      <div className="container px-4 py-8 mx-auto">
                        <Breadcrumbs />
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/analytics" element={<Analytics />} />
                          <Route path="/analytics/distribution" element={<InventoryDistributionPage />} />
                          <Route path="/inventory/raw-materials" element={<InventoryRawMaterials />} />
                          <Route path="/inventory/semi-finished" element={<InventorySemiFinished />} />
                          <Route path="/inventory/packaging" element={<InventoryPackaging />} />
                          <Route path="/inventory/finished-products" element={<InventoryFinishedProducts />} />
                          <Route path="/inventory/low-stock" element={<InventoryLowStock />} />
                          <Route path="/inventory/tracking" element={<InventoryTracking />} />
                          <Route path="/production/orders" element={<ProductionOrders />} />
                          <Route path="/production/packaging" element={<ProductionPackaging />} />
                          <Route path="/production/planning" element={<ProductionPlanning />} />
                          <Route path="/commercial/parties" element={<Parties />} />
                          <Route path="/commercial/parties/:id" element={<PartyDetails />} />
                          <Route path="/commercial/invoices" element={<Invoices />} />
                          <Route path="/commercial/invoices/:id" element={<InvoiceDetails />} />
                          <Route path="/commercial/returns" element={<Returns />} />
                          <Route path="/commercial/payments" element={<Payments />} />
                          <Route path="/commercial/collections" element={<Payments />} />
                          <Route path="/commercial/accounts" element={<AccountStatements />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </div>
                    </div>
                    <Toaster />
                    <SonnerToaster position="top-left" dir="rtl" />
                  </div>
                </div>
              </NotificationProvider>
            </SidebarProvider>
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
