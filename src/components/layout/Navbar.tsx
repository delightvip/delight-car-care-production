
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ModeToggle } from '@/components/mode-toggle';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from "@/components/layout/SidebarContext";
import { Settings, BellRing, AlertTriangle, RefreshCw } from 'lucide-react';
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
import DatabaseSyncService from '@/services/DatabaseSyncService';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const Navbar = () => {
  const { unreadCount, lowStockItems, refreshLowStockData } = useNotifications();
  const totalLowStock = lowStockItems?.totalCount || 0;
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  
  const handleRefresh = async () => {
    setSyncing(true);
    toast.info('جاري تحديث البيانات...', { id: 'data-refresh' });
    
    try {
      // تحديث جميع استعلامات React Query
      await queryClient.invalidateQueries();
      
      // تحديث بيانات المخزون المنخفض
      await refreshLowStockData();
      
      toast.success('تم تحديث البيانات بنجاح', { id: 'data-refresh' });
    } catch (error) {
      console.error('خطأ في تحديث البيانات:', error);
      toast.error('حدث خطأ أثناء تحديث البيانات', { id: 'data-refresh' });
    } finally {
      setSyncing(false);
    }
  };

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
        {totalLowStock > 0 && (
          <Button variant="outline" size="sm" className="mr-2 text-destructive" asChild>
            <Link to="/inventory/low-stock" className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              <span>المخزون المنخفض</span>
              <Badge variant="destructive" className="ml-1">{totalLowStock}</Badge>
            </Link>
          </Button>
        )}
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleRefresh}
          disabled={syncing}
          title="تحديث البيانات"
        >
          <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
        </Button>
        
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
