
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import Layout from '@/components/layout/Layout';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import Settings from '@/pages/settings/Settings';

// Lazy loaded pages
const Dashboard = lazy(() => import('@/pages/Index'));
const AnalyticsPage = lazy(() => import('@/pages/analytics/Analytics'));
const InventoryRawMaterials = lazy(() => import('@/pages/inventory/InventoryRawMaterials'));
const SemiFinishedProducts = lazy(() => import('@/pages/inventory/SemiFinishedProducts'));
const PackagingMaterials = lazy(() => import('@/pages/inventory/PackagingMaterials'));
const FinishedProducts = lazy(() => import('@/pages/inventory/FinishedProducts'));
const ProductDetailsContainer = lazy(() => import('@/pages/inventory/ProductDetailsContainer'));
const LowStockItems = lazy(() => import('@/pages/inventory/LowStockItems'));
const InventoryReports = lazy(() => import('@/pages/inventory/InventoryReports'));
const InventoryTracking = lazy(() => import('@/pages/inventory/InventoryTracking'));
const ProductionOrders = lazy(() => import('@/pages/production/ProductionOrders'));
const PackagingOrders = lazy(() => import('@/pages/production/PackagingOrders'));
const ProductionPlanning = lazy(() => import('@/pages/production/ProductionPlanning'));
const InventoryDistributionPage = lazy(() => import('@/pages/analytics/InventoryDistributionPage'));
const Parties = lazy(() => import('@/pages/commercial/Parties'));
const Invoices = lazy(() => import('@/pages/commercial/Invoices'));
const InvoiceDetails = lazy(() => import('@/pages/commercial/InvoiceDetails'));
const Payments = lazy(() => import('@/pages/commercial/Payments'));
const PartyDetails = lazy(() => import('@/pages/commercial/PartyDetails'));
const Returns = lazy(() => import('@/pages/commercial/Returns'));
const Profits = lazy(() => import('@/pages/commercial/Profits'));
const AccountStatements = lazy(() => import('@/pages/commercial/AccountStatements'));
const CommercialLedger = lazy(() => import('@/pages/commercial/CommercialLedger'));
const CommercialDashboard = lazy(() => import('@/pages/commercial/CommercialDashboard'));

// Financial pages
const FinancialDashboard = lazy(() => import('@/pages/financial/FinancialDashboard'));
const TransactionPage = lazy(() => import('@/pages/financial/TransactionPage'));
const CategoriesPage = lazy(() => import('@/pages/financial/CategoriesPage'));
const CategoryForm = lazy(() => import('@/components/financial/CategoryForm'));

function App() {
  return (
    <HelmetProvider>
      <Helmet>
        <title>النظام المتكامل</title>
        <meta name="description" content="نظام متكامل لإدارة الأعمال" />
      </Helmet>
      <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center">جاري التحميل...</div>}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Index />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="analytics/inventory-distribution" element={<InventoryDistributionPage />} />
            
            {/* Inventory Routes */}
            <Route path="inventory">
              <Route path="raw-materials" element={<InventoryRawMaterials />} />
              <Route path="raw-materials/:id" element={<ProductDetailsContainer />} />
              <Route path="semi-finished" element={<SemiFinishedProducts />} />
              <Route path="semi-finished/:id" element={<ProductDetailsContainer />} />
              <Route path="packaging-materials" element={<PackagingMaterials />} />
              <Route path="packaging-materials/:id" element={<ProductDetailsContainer />} />
              <Route path="finished-products" element={<FinishedProducts />} />
              <Route path="finished-products/:id" element={<ProductDetailsContainer />} />
              <Route path="low-stock" element={<LowStockItems />} />
              <Route path="reports" element={<InventoryReports />} />
              <Route path="tracking" element={<InventoryTracking />} />
            </Route>
            
            {/* Production Routes */}
            <Route path="production">
              <Route path="orders" element={<ProductionOrders />} />
              <Route path="packaging" element={<PackagingOrders />} />
              <Route path="planning" element={<ProductionPlanning />} />
            </Route>
            
            {/* Commercial Routes */}
            <Route path="commercial">
              <Route index element={<CommercialDashboard />} />
              <Route path="parties" element={<Parties />} />
              <Route path="parties/:id" element={<PartyDetails />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="invoices/:id" element={<InvoiceDetails />} />
              <Route path="payments" element={<Payments />} />
              <Route path="returns" element={<Returns />} />
              <Route path="profits" element={<Profits />} />
              <Route path="account-statements" element={<AccountStatements />} />
              <Route path="ledger" element={<CommercialLedger />} />
            </Route>
            
            {/* Financial Routes */}
            <Route path="financial">
              <Route index element={<FinancialDashboard />} />
              <Route path="transactions" element={<TransactionPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="categories/new" element={<CategoryForm />} />
              <Route path="categories/edit/:id" element={<CategoryForm />} />
            </Route>
            
            {/* Settings */}
            <Route path="settings" element={<Settings />} />
            
            {/* Catch all unmatched routes */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      <SonnerToaster position="top-left" dir="rtl" />
      <Toaster />
    </HelmetProvider>
  );
}

export default App;
