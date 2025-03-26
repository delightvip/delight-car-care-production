
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { PanelLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

interface SidebarContextType {
  isOpen: boolean;
  isMobile: boolean;
  openMobile: boolean;
  isExpanded: boolean; // Added isExpanded property
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(true);
  const [openMobile, setOpenMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true); // Added state for isExpanded

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile((open) => !open);
    } else {
      setIsOpen((open) => !open);
      setIsExpanded((expanded) => !expanded); // Toggle isExpanded when sidebar is toggled
    }
  }, [isMobile]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'b' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isMobile,
        openMobile,
        isExpanded, // Provide isExpanded to the context
        setOpenMobile,
        toggleSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const SidebarTrigger: React.FC<React.ComponentPropsWithoutRef<typeof Button>> = ({ 
  className, 
  onClick, 
  ...props 
}) => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
};
