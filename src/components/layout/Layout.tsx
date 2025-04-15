import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSidebar } from './SidebarContext';
import ModernSidebar from './ModernSidebar';
import Navbar from './Navbar';
import { useTheme } from '@/components/theme-provider';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { motion } from 'framer-motion';
import { AppNewsTicker } from '@/components/AppNewsTicker';

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
      <ModernSidebar />      <motion.div 
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
        <Navbar />        <main className="flex-1 w-full h-full py-4 md:py-6 overflow-hidden">
          <div className="container mx-auto px-3 md:px-4 pt-14 md:pt-14 h-full overflow-x-auto overflow-y-auto"
           style={{ maxWidth: isMobile ? '100%' : '1400px' }}>
            <div className="min-w-fit pb-6"> 
              <Outlet />
            </div>
          </div>
        </main>
        <div className="fixed bottom-0 left-0 right-0 z-40">
          <AppNewsTicker />
        </div>
      </motion.div>
    </div>
  );
};

export default Layout;
