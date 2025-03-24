
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Navbar from "./components/layout/Navbar";
import ModernSidebar from "./components/layout/ModernSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

// Pages
import Index from "./pages/Index";
import RawMaterials from "./pages/inventory/RawMaterials";
import SemiFinishedProducts from "./pages/inventory/SemiFinishedProducts";
import PackagingMaterials from "./pages/inventory/PackagingMaterials";
import FinishedProducts from "./pages/inventory/FinishedProducts";
import LowStockItems from "./pages/inventory/LowStockItems";
import ProductionOrders from "./pages/production/ProductionOrders";
import PackagingOrders from "./pages/production/PackagingOrders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SidebarProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen flex flex-col w-full bg-background/50 backdrop-blur-sm">
            <Navbar />
            <div className="flex flex-1 pt-16">
              <main className="flex-1 p-4 md:p-6 md:pl-6 md:mr-64 overflow-x-hidden transition-all duration-300">
                <AnimatePresence mode="wait">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    
                    {/* Inventory Routes */}
                    <Route path="/inventory/raw-materials" element={<RawMaterials />} />
                    <Route path="/inventory/semi-finished" element={<SemiFinishedProducts />} />
                    <Route path="/inventory/packaging" element={<PackagingMaterials />} />
                    <Route path="/inventory/finished-products" element={<FinishedProducts />} />
                    <Route path="/inventory/low-stock" element={<LowStockItems />} />
                    
                    {/* Production Routes */}
                    <Route path="/production/orders" element={<ProductionOrders />} />
                    <Route path="/production/packaging" element={<PackagingOrders />} />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AnimatePresence>
              </main>
              <ModernSidebar />
            </div>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </SidebarProvider>
  </QueryClientProvider>
);

export default App;
