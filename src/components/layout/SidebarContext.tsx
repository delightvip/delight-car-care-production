
import React, { createContext, useState, useContext } from 'react';

type SidebarContextType = {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
};

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  toggle: () => {},
  open: () => {},
  close: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(prev => !prev);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </SidebarContext.Provider>
  );
};
