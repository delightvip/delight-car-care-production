
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppSidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const AppSidebarContext = createContext<AppSidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);

  useEffect(() => {
    // أغلق القائمة الجانبية تلقائيًا في وضع الجوال
    if (isMobile) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [isMobile]);

  const toggle = () => setIsOpen(prev => !prev);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <AppSidebarContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </AppSidebarContext.Provider>
  );
};

export const useAppSidebar = (): AppSidebarContextType => {
  const context = useContext(AppSidebarContext);
  if (context === undefined) {
    throw new Error('useAppSidebar must be used within a SidebarProvider');
  }
  return context;
};
