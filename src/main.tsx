
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { SidebarProvider } from './components/layout/SidebarContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from "sonner";
import NotificationProvider from './components/notifications/NotificationProvider'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <SidebarProvider>
        <NotificationProvider>
          <App />
          <Toaster position="top-center" richColors />
        </NotificationProvider>
      </SidebarProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
