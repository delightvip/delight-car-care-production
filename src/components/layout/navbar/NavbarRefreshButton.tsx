import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '@/components/notifications/NotificationProvider';

const NavbarRefreshButton = () => {
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  
  // Wrap in try/catch to debug notification context issues
  let refreshLowStockData;
  try {
    const notificationsContext = useNotifications();
    refreshLowStockData = notificationsContext.refreshLowStockData;
    
    // Add logging for debugging
    console.log("NavbarRefreshButton - Using refreshLowStockData:", !!refreshLowStockData);
  } catch (error) {
    console.error("Error accessing notification context in NavbarRefreshButton:", error);
  }
  
  const handleRefresh = async () => {
    setSyncing(true);
    toast.info('جاري تحديث البيانات...', { id: 'data-refresh' });
    
    try {
      // تحديث جميع استعلامات React Query
      await queryClient.invalidateQueries();
      
      // تحديث بيانات المخزون المنخفض
      if (refreshLowStockData) {
        await refreshLowStockData();
      }
      
      toast.success('تم تحديث البيانات بنجاح', { id: 'data-refresh' });
    } catch (error) {
      console.error('خطأ في تحديث البيانات:', error);
      toast.error('حدث خطأ أثناء تحديث البيانات', { id: 'data-refresh' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={handleRefresh}
      disabled={syncing}
      title="تحديث البيانات"
      className="hover:bg-muted/80 transition-colors h-8 w-8 p-1"
    >
      <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
      <span className="sr-only">تحديث البيانات</span>
    </Button>
  );
};

export default NavbarRefreshButton;
