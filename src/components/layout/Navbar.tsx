
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
import DatabaseSyncService from '@/services/DatabaseSyncService';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';

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
          <motion.span 
            className="text-primary"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            ديلايت
          </motion.span>
          <motion.span 
            className="text-muted-foreground"
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            مصنع
          </motion.span>
        </Link>
      </div>
      
      <div className="flex items-center gap-3">
        {totalLowStock > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Button variant="outline" size="sm" className="mr-2 text-destructive hover:bg-destructive/10" asChild>
              <Link to="/inventory/low-stock" className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                <span>المخزون المنخفض</span>
                <Badge variant="destructive" className="ml-1">{totalLowStock}</Badge>
              </Link>
            </Button>
          </motion.div>
        )}
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleRefresh}
          disabled={syncing}
          title="تحديث البيانات"
          className="hover:bg-muted/80 transition-colors"
        >
          <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
        </Button>
        
        <NotificationPanel />
        
        <Button 
          variant="ghost" 
          size="icon"
          className="hover:bg-muted/80 transition-colors"
        >
          <Settings className="h-5 w-5" />
        </Button>
        
        <Separator orientation="vertical" className="h-8" />
        
        <ModeToggle />
      </div>
    </header>
  );
};

export default Navbar;
