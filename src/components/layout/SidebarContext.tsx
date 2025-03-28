import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { PanelLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/use-local-storage';

interface SidebarContextType {
  isOpen: boolean;
  isMobile: boolean;
  openMobile: boolean;
  isExpanded: boolean;
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
  isPinned: boolean;
  togglePin: () => void;
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
  const [isOpen, setIsOpen] = useLocalStorage('sidebar-open', true);
  const [openMobile, setOpenMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useLocalStorage('sidebar-expanded', true);
  const [isPinned, setPinned] = useLocalStorage('sidebar-pinned', false);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile((open) => !open);
    } else {
      setIsOpen((prevOpen) => !prevOpen);
      setIsExpanded((prevExpanded) => !prevExpanded);
    }
  }, [isMobile, setIsOpen, setIsExpanded]);

  const togglePin = useCallback(() => {
    setPinned((prevPinned) => !prevPinned);
  }, [setPinned]);

  // Keyboard shortcut handler
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
        isExpanded,
        setOpenMobile,
        toggleSidebar,
        isPinned,
        togglePin,
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
