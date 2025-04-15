
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';
import Layout from './components/layout/Layout';
import { Toaster } from './components/ui/toaster';
import { ThemeProvider } from './components/theme-provider';
import { Toaster as SonnerToaster } from 'sonner';
import InventoryTrackingInitializer from './components/inventory/InventoryTrackingInitializer';

// إنشاء عميل الاستعلام
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="juzoor-factory-theme">
        <Toaster />
        <SonnerToaster position="top-center" richColors closeButton />
        <Layout />
        <InventoryTrackingInitializer />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
