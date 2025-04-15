
import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useSidebar } from './SidebarContext';
import ModernSidebar from './ModernSidebar';
import Navbar from './Navbar';
import { useTheme } from '@/components/theme-provider';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { motion } from 'framer-motion';

// Import pages
import Index from '@/pages/Index';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';
import CommercialDashboard from '@/pages/commercial/CommercialDashboard';
import Invoices from '@/pages/commercial/Invoices';
import InvoiceDetails from '@/pages/commercial/InvoiceDetails';
import Parties from '@/pages/commercial/Parties';
import PartyDetails from '@/pages/commercial/PartyDetails';
import Payments from '@/pages/commercial/Payments';
import Profits from '@/pages/commercial/Profits';
import Returns from '@/pages/commercial/Returns';
import AccountStatements from '@/pages/commercial/AccountStatements';
import FinancialDashboard from '@/pages/financial/FinancialDashboard';
import TransactionPage from '@/pages/financial/TransactionPage';
import CategoriesPage from '@/pages/financial/CategoriesPage';
import InventoryRawMaterials from '@/pages/inventory/InventoryRawMaterials';
import InventorySemiFinished from '@/pages/inventory/InventorySemiFinished';
import PackagingMaterials from '@/pages/inventory/PackagingMaterials';
import FinishedProducts from '@/pages/inventory/FinishedProducts';
import LowStockItems from '@/pages/inventory/LowStockItems';
import InventoryTracking from '@/pages/inventory/InventoryTracking';
import InventoryReports from '@/pages/inventory/InventoryReports';
import ProductDetailsContainer from '@/pages/inventory/ProductDetailsContainer';
import ProductionOrders from '@/pages/production/ProductionOrders';
import PackagingOrders from '@/pages/production/PackagingOrders';
import ProductionPlanning from '@/pages/production/ProductionPlanning';
import InventoryAnalytics from '@/pages/analytics/InventoryAnalytics';
import InventoryDistributionPage from '@/pages/analytics/InventoryDistributionPage';

export const Layout = () => {
  // Wrap in try/catch to debug sidebar context issues
  let sidebarContext = { isExpanded: true, isMobile: false };
  try {
    sidebarContext = useSidebar();
  } catch (error) {
    console.error("Error accessing sidebar context in Layout:", error);
  }
  
  const { isExpanded, isMobile } = sidebarContext;
  const { theme } = useTheme();
  const [rtl] = useLocalStorage('rtl-mode', true);
  
  // Apply RTL setting
  useEffect(() => {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  }, [rtl]);
  
  // Apply dark/light mode class
  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Add detailed logging to debug context issues
  console.log("Layout - Current sidebar state:", { isExpanded, isMobile });
  console.log("Layout - Current theme:", theme);

  return (
    <div className="flex min-h-screen bg-background">
      <ModernSidebar />
      <motion.div 
        className="flex-1 flex flex-col min-h-screen w-full relative"
        initial={false}
        animate={{
          [rtl ? 'marginRight' : 'marginLeft']: !isMobile && isExpanded ? '16rem' : isMobile ? '0' : '4rem'
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }}
      >
        <Navbar />
        <main className="flex-1 w-full h-full py-4 md:py-6 overflow-hidden">
          <div className="container mx-auto px-3 md:px-4 pt-14 md:pt-14 h-full overflow-x-auto overflow-y-auto"
           style={{ maxWidth: isMobile ? '100%' : '1400px' }}>
            <div className="min-w-fit pb-6">
              <Routes>
                {/* الصفحة الرئيسية */}
                <Route path="/" element={<Index />} />
                
                {/* مسارات المبيعات التجارية */}
                <Route path="/commercial" element={<CommercialDashboard />} />
                <Route path="/commercial/invoices" element={<Invoices />} />
                <Route path="/commercial/invoices/:id" element={<InvoiceDetails />} />
                <Route path="/commercial/parties" element={<Parties />} />
                <Route path="/commercial/parties/:id" element={<PartyDetails />} />
                <Route path="/commercial/payments" element={<Payments />} />
                <Route path="/commercial/profits" element={<Profits />} />
                <Route path="/commercial/returns" element={<Returns />} />
                <Route path="/commercial/statements" element={<AccountStatements />} />
                
                {/* مسارات المخزون */}
                <Route path="/inventory/raw-materials" element={<InventoryRawMaterials />} />
                <Route path="/inventory/raw-materials/:id" element={<ProductDetailsContainer type="raw" />} />
                <Route path="/inventory/semi-finished" element={<InventorySemiFinished />} />
                <Route path="/inventory/semi-finished/:id" element={<ProductDetailsContainer type="semi" />} />
                <Route path="/inventory/packaging" element={<PackagingMaterials />} />
                <Route path="/inventory/packaging/:id" element={<ProductDetailsContainer type="packaging" />} />
                <Route path="/inventory/finished-products" element={<FinishedProducts />} />
                <Route path="/inventory/finished-products/:id" element={<ProductDetailsContainer type="finished" />} />
                <Route path="/inventory/low-stock" element={<LowStockItems />} />
                <Route path="/inventory/tracking" element={<InventoryTracking />} />
                <Route path="/inventory/reports" element={<InventoryReports />} />
                
                {/* مسارات الإنتاج */}
                <Route path="/production/orders" element={<ProductionOrders />} />
                <Route path="/production/packaging-orders" element={<PackagingOrders />} />
                <Route path="/production/planning" element={<ProductionPlanning />} />
                
                {/* مسارات المالية */}
                <Route path="/financial" element={<FinancialDashboard />} />
                <Route path="/financial/transactions/new" element={<TransactionPage />} />
                <Route path="/financial/categories" element={<CategoriesPage />} />
                
                {/* مسارات التحليلات */}
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/analytics/inventory-analytics" element={<InventoryAnalytics />} />
                <Route path="/analytics/inventory-distribution" element={<InventoryDistributionPage />} />
                
                {/* الإعدادات */}
                <Route path="/settings" element={<Settings />} />
                
                {/* صفحة 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </div>
        </main>
      </motion.div>
    </div>
  );
};

export default Layout;
