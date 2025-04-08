import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from 'sonner';

import {
  Index,
  NotFound,
  Layout,
  NotificationProvider,
  queryClient,
  SettingsPage,
  UsersPage,
  RolesPage,
  PermissionsPage,
  ProductsPage,
  CategoriesPage as ProductsCategoriesPage,
  NewProductPage,
  EditProductPage,
  CustomersPage,
  NewCustomerPage,
  EditCustomerPage,
  SuppliersPage,
  NewSupplierPage,
  EditSupplierPage,
  InvoicesPage,
  NewInvoicePage,
  EditInvoicePage,
  ReceiptsPage,
  NewReceiptPage,
  EditReceiptPage,
  QuotationsPage,
  NewQuotationPage,
  EditQuotationPage,
  PurchaseOrdersPage,
  NewPurchaseOrderPage,
  EditPurchaseOrderPage,
  StockAdjustmentsPage,
  NewStockAdjustmentPage,
  EditStockAdjustmentPage,
  StockTransfersPage,
  NewStockTransferPage,
  EditStockTransferPage,
  BrandsPage,
  UnitsPage,
  TaxesPage,
  CurrenciesPage,
  FinancialDashboard,
  TransactionPage,
  CategoriesPage as FinancialCategoriesPage,
  CashManagementPage,
} from './imports';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="factorial-ui-theme">
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Index />} />
                
                {/* System Pages */}
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/permissions" element={<PermissionsPage />} />
                
                {/* Commercial Pages */}
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/new" element={<NewProductPage />} />
                <Route path="/products/:id/edit" element={<EditProductPage />} />
                <Route path="/products/categories" element={<ProductsCategoriesPage />} />
                
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/new" element={<NewCustomerPage />} />
                <Route path="/customers/:id/edit" element={<EditCustomerPage />} />
                
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/suppliers/new" element={<NewSupplierPage />} />
                <Route path="/suppliers/:id/edit" element={<EditSupplierPage />} />
                
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/invoices/new" element={<NewInvoicePage />} />
                <Route path="/invoices/:id/edit" element={<EditInvoicePage />} />
                
                <Route path="/receipts" element={<ReceiptsPage />} />
                <Route path="/receipts/new" element={<NewReceiptPage />} />
                <Route path="/receipts/:id/edit" element={<EditReceiptPage />} />
                
                <Route path="/quotations" element={<QuotationsPage />} />
                <Route path="/quotations/new" element={<NewQuotationPage />} />
                <Route path="/quotations/:id/edit" element={<EditQuotationPage />} />
                
                <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                <Route path="/purchase-orders/new" element={<NewPurchaseOrderPage />} />
                <Route path="/purchase-orders/:id/edit" element={<EditPurchaseOrderPage />} />
                
                <Route path="/stock-adjustments" element={<StockAdjustmentsPage />} />
                <Route path="/stock-adjustments/new" element={<NewStockAdjustmentPage />} />
                <Route path="/stock-adjustments/:id/edit" element={<EditStockAdjustmentPage />} />
                
                <Route path="/stock-transfers" element={<StockTransfersPage />} />
                <Route path="/stock-transfers/new" element={<NewStockTransferPage />} />
                <Route path="/stock-transfers/:id/edit" element={<EditStockTransferPage />} />
                
                <Route path="/brands" element={<BrandsPage />} />
                <Route path="/units" element={<UnitsPage />} />
                <Route path="/taxes" element={<TaxesPage />} />
                <Route path="/currencies" element={<CurrenciesPage />} />
                
                {/* صفحات الإدارة المالية */}
                <Route path="/financial" element={<FinancialDashboard />} />
                <Route path="/financial/transactions/new" element={<TransactionPage />} />
                <Route path="/financial/categories" element={<FinancialCategoriesPage />} />
                <Route path="/financial/cash-management" element={<CashManagementPage />} />
                
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            <Toaster richColors />
          </NotificationProvider>
        </HelmetProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
