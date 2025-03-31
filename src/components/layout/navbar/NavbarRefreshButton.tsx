
import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '@/components/notifications/NotificationProvider';

const NavbarRefreshButton = () => {
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { refreshLowStockData } = useNotifications();
  
  // Add logging for debugging
  console.log("NavbarRefreshButton - Using refreshLowStockData:", !!refreshLowStockData);
  
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
    <Button 
      variant="ghost" 
      size="icon"
      onClick={handleRefresh}
      disabled={syncing}
      title="تحديث البيانات"
      className="hover:bg-muted/80 transition-colors"
    >
      <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
      <span className="sr-only">تحديث البيانات</span>
    </Button>
  );
};

export default NavbarRefreshButton;
