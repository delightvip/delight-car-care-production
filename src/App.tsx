
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from 'sonner';
import Layout from '@/components/layout/Layout';
import NotificationProvider from '@/components/notifications/NotificationProvider';
import { QueryClient } from '@tanstack/react-query';

import {
  Index,
  NotFound,
  FinancialDashboard,
  TransactionPage,
  CategoriesPage as FinancialCategoriesPage,
  CashManagementPage,
} from './imports';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="factorial-ui-theme">
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Index />} />
                
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
