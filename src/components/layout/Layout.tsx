
import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSidebar } from './SidebarContext';
import ModernSidebar from './ModernSidebar';
import Navbar from './Navbar';
import { useTheme } from '@/components/theme-provider';
import { useLocalStorage } from '@/hooks/use-local-storage';

export const Layout = () => {
  const { isOpen } = useSidebar();
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

  return (
    <div className="flex min-h-screen bg-background">
      <ModernSidebar />
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out`}>
        <Navbar />
        <main className="flex-1 container mx-auto px-4 pt-20 pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
