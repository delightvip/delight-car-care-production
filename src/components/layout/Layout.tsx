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
    <div className="flex min-h-screen bg-background">
      {/* 
        إزالة خاصية overflow-hidden من الحاوية الرئيسية
        لمنع قص محتوى الصفحة على الشاشات الصغيرة
      */}
      <ModernSidebar />
      <motion.div 
        className="flex-1 flex flex-col min-h-screen w-full relative"
        initial={false}
        animate={{
          marginRight: !isMobile && isExpanded ? '16rem' : '4rem'
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }}
      >
        <Navbar />
        <main className="flex-1 w-full h-full py-6 overflow-hidden">
          {/* 
            إضافة حاوية داخلية مع خصائص التمرير المناسبة
            لإتاحة التمرير الأفقي والرأسي للمحتوى عند الحاجة
          */}
          <div className="container mx-auto px-4 pt-14 h-full overflow-x-auto overflow-y-auto">
            <div className="min-w-fit pb-6"> 
              <Outlet />
            </div>
          </div>
        </main>
      </motion.div>
    </div>
  );
};

export default Layout;
