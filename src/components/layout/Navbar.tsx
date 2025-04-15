import React from 'react';
import { Link } from 'react-router-dom';
import { ModeToggle } from '@/components/mode-toggle';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { SidebarTrigger, useSidebar } from "@/components/layout/SidebarContext";
import { Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import NavbarRefreshButton from './navbar/NavbarRefreshButton';
import NavbarLowStockAlert from './navbar/NavbarLowStockAlert';
import NavbarBranding from './navbar/NavbarBranding';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/use-local-storage';

const Navbar = () => {
  // Wrap in try/catch to debug sidebar context issues
  let sidebarContext = { isExpanded: true, isMobile: false };
  try {
    sidebarContext = useSidebar();
  } catch (error) {
    console.error("Error accessing sidebar context in Navbar:", error);
  }
  
  const { isExpanded, isMobile } = sidebarContext;
  
  // Add more detailed logging to debug context issues
  console.log("Navbar - Current sidebar state:", { isExpanded, isMobile });
    // Get RTL setting to apply correct direction
  const [rtl] = useLocalStorage('rtl-mode', true);
  
  return (
    <motion.header 
      className={cn(
        "fixed top-0 h-14 md:h-16 z-20 flex items-center justify-between",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "border-b border-border px-2 md:px-4",
        "transition-all duration-300",
        "w-full"
      )}
      initial={false}
      animate={rtl ? {
        left: !isMobile && isExpanded ? '16rem' : isMobile ? '0' : '4rem',
        right: 0
      } : {
        right: !isMobile && isExpanded ? '16rem' : isMobile ? '0' : '4rem',
        left: 0
      }}
      transition={{ 
        type: 'spring',
        stiffness: 300,
        damping: 30
      }}
    >
      <div className="flex items-center gap-2 md:gap-3">
        <SidebarTrigger className="md:hidden" />
        <NavbarBranding />
      </div>
      
      <div className="flex items-center gap-1 md:gap-3">
        <NavbarLowStockAlert />
        <NavbarRefreshButton />
        <NotificationPanel />
        
        <Button 
          variant="ghost" 
          size="icon"
          className="hidden md:flex hover:bg-muted/80 transition-colors"
          asChild
        >
          <Link to="/settings">
            <Settings className="h-5 w-5" />
            <span className="sr-only">الإعدادات</span>
          </Link>
        </Button>
        
        <Separator orientation="vertical" className="h-8" />
        
        <ModeToggle />
      </div>
    </motion.header>
  );
};

export default Navbar;
