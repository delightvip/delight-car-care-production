
import React from 'react';
import { Link } from 'react-router-dom';
import { ModeToggle } from '@/components/mode-toggle';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from "@/components/layout/SidebarContext";
import { Settings, BellRing, AlertTriangle } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from '@/components/notifications/NotificationProvider';
import NotificationPanel from '@/components/notifications/NotificationPanel';

const Navbar = () => {
  const { unreadCount, lowStockItems } = useNotifications();
  const totalLowStock = lowStockItems?.totalCount || 0;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-20 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <Link to="/" className="text-xl font-bold">
          <span className="text-primary">ديلايت</span>
          <span className="text-muted-foreground">مصنع</span>
        </Link>
      </div>
      
      <div className="flex items-center gap-3">
        <NotificationPanel />
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
        <Separator orientation="vertical" className="h-8" />
        <ModeToggle />
      </div>
    </header>
  );
};

export default Navbar;
