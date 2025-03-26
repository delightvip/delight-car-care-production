
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SidebarProvider } from './components/layout/SidebarContext';
import NotificationProvider from './components/notifications/NotificationProvider';

createRoot(document.getElementById("root")!).render(
  <SidebarProvider>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </SidebarProvider>
);
