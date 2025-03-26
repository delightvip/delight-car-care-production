
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ModeToggle } from '@/components/mode-toggle';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from "@/components/layout/SidebarContext";
import { Settings, BellRing, AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useNotifications } from '@/components/notifications/NotificationProvider';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import NavbarRefreshButton from './navbar/NavbarRefreshButton';
import NavbarLowStockAlert from './navbar/NavbarLowStockAlert';
import NavbarBranding from './navbar/NavbarBranding';

const Navbar = () => {
  const { unreadCount } = useNotifications();
  
  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-20 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <NavbarBranding />
      </div>
      
      <div className="flex items-center gap-3">
        <NavbarLowStockAlert />
        <NavbarRefreshButton />
        <NotificationPanel />
        
        <Button 
          variant="ghost" 
          size="icon"
          className="hover:bg-muted/80 transition-colors"
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
    </header>
  );
};

export default Navbar;
