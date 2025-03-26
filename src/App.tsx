
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import Layout from '@/components/layout/Layout';
import PlaceholderPage from '@/components/PlaceholderPage';
import RawMaterials from '@/pages/inventory/RawMaterials';
import PackagingMaterials from '@/pages/inventory/PackagingMaterials';
import SemiFinishedProducts from '@/pages/inventory/SemiFinishedProducts';
import FinishedProducts from '@/pages/inventory/FinishedProducts';
import ProductionOrders from '@/pages/production/ProductionOrders';
import PackagingOrders from '@/pages/production/PackagingOrders';
import ProductDetails from '@/pages/inventory/ProductDetails';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import Invoices from '@/pages/commercial/Invoices';
import InvoiceDetails from '@/pages/commercial/InvoiceDetails';
import Payments from '@/pages/commercial/Payments';
import Returns from '@/pages/commercial/Returns';
import NotFound from '@/pages/NotFound';
import Settings from '@/pages/Settings';
import Parties from '@/pages/commercial/Parties';
import PartyDetails from '@/pages/commercial/PartyDetails';

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
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<PlaceholderPage title="لوحة التحكم" />} />
            <Route path="settings" element={<Settings />} />
            
            {/* Inventory Routes */}
            <Route path="inventory/raw-materials" element={<RawMaterials />} />
            <Route path="inventory/raw-materials/add" element={<PlaceholderPage title="إضافة مادة خام" />} />
            <Route path="inventory/raw-materials/edit/:id" element={<PlaceholderPage title="تعديل مادة خام" />} />
            <Route path="inventory/raw-materials/:id" element={<ProductDetails />} />
            
            <Route path="inventory/packaging" element={<PackagingMaterials />} />
            <Route path="inventory/packaging/add" element={<PlaceholderPage title="إضافة مواد تعبئة" />} />
            <Route path="inventory/packaging/edit/:id" element={<PlaceholderPage title="تعديل مواد تعبئة" />} />
            <Route path="inventory/packaging/:id" element={<ProductDetails />} />
            
            <Route path="inventory/semi-finished" element={<SemiFinishedProducts />} />
            <Route path="inventory/semi-finished/add" element={<PlaceholderPage title="إضافة منتج نصف مصنع" />} />
            <Route path="inventory/semi-finished/edit/:id" element={<PlaceholderPage title="تعديل منتج نصف مصنع" />} />
            <Route path="inventory/semi-finished/:id" element={<ProductDetails />} />
            
            <Route path="inventory/finished-products" element={<FinishedProducts />} />
            <Route path="inventory/finished-products/add" element={<PlaceholderPage title="إضافة منتج نهائي" />} />
            <Route path="inventory/finished-products/edit/:id" element={<PlaceholderPage title="تعديل منتج نهائي" />} />
            <Route path="inventory/finished-products/:id" element={<ProductDetails />} />
            
            <Route path="inventory/adjustment" element={<PlaceholderPage title="تعديل المخزون" />} />
            
            {/* Production Routes */}
            <Route path="production/production-orders" element={<ProductionOrders />} />
            <Route path="production/production-orders/add" element={<PlaceholderPage title="إضافة أمر إنتاج" />} />
            <Route path="production/production-orders/edit/:id" element={<PlaceholderPage title="تعديل أمر إنتاج" />} />
            <Route path="production/production-orders/:id" element={<PlaceholderPage title="تفاصيل أمر الإنتاج" />} />
            
            <Route path="production/packaging-orders" element={<PackagingOrders />} />
            <Route path="production/packaging-orders/add" element={<PlaceholderPage title="إضافة أمر تعبئة" />} />
            <Route path="production/packaging-orders/edit/:id" element={<PlaceholderPage title="تعديل أمر تعبئة" />} />
            <Route path="production/packaging-orders/:id" element={<PlaceholderPage title="تفاصيل أمر التعبئة" />} />
            
            {/* Report Routes */}
            <Route path="reports/low-stock" element={<PlaceholderPage title="تقرير المخزون المنخفض" />} />
            <Route path="reports/inventory-movements" element={<PlaceholderPage title="تقرير حركة المخزون" />} />
            <Route path="reports/production" element={<PlaceholderPage title="تقرير الإنتاج" />} />
            <Route path="reports/packaging" element={<PlaceholderPage title="تقرير التعبئة" />} />
            <Route path="reports/financial" element={<PlaceholderPage title="التقارير المالية" />} />
            <Route path="reports/commercial" element={<PlaceholderPage title="التقارير التجارية" />} />
            
            {/* Parties Routes */}
            <Route path="parties" element={<Parties />} />
            <Route path="parties/add" element={<PlaceholderPage title="إضافة عميل/مورد" />} />
            <Route path="parties/edit/:id" element={<PlaceholderPage title="تعديل عميل/مورد" />} />
            <Route path="parties/:id" element={<PartyDetails />} />
            
            {/* Commercial Routes */}
            <Route path="commercial/invoices" element={<Invoices />} />
            <Route path="commercial/invoices/add" element={<PlaceholderPage title="إضافة فاتورة" />} />
            <Route path="commercial/invoices/edit/:id" element={<PlaceholderPage title="تعديل فاتورة" />} />
            <Route path="commercial/invoices/:id" element={<InvoiceDetails />} />
            
            <Route path="commercial/payments" element={<Payments />} />
            <Route path="commercial/payments/add" element={<PlaceholderPage title="إضافة دفعة" />} />
            
            <Route path="commercial/returns" element={<Returns />} />
          </Route>
          <Route path="*" element={<NotFound />} /> 
        </Routes>
        <SonnerToaster position="top-center" dir="rtl" />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
