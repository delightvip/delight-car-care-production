import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSidebar } from './SidebarContext';
import ModernSidebar from './ModernSidebar';
import Navbar from './Navbar';
import { useTheme } from '@/components/theme-provider';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { motion } from 'framer-motion';

export const Layout = () => {
  const { isExpanded, isMobile } = useSidebar();
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
    <div className="flex min-h-screen bg-background overflow-hidden">
      <ModernSidebar />
      <motion.div 
        className="flex-1 flex flex-col min-h-screen"
        initial={false}
        animate={{
          marginRight: !isMobile && isExpanded ? '16rem' : '4rem',
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }}
      >
        <Navbar />
        <main className="flex-1 container mx-auto px-4 pt-20 pb-6">
          <Outlet />
        </main>
      </motion.div>
    </div>
  );
};

export default Layout;
