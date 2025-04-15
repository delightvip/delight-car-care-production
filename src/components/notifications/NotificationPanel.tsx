import React from 'react';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BellRing, AlertTriangle, CheckCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useNotifications } from './NotificationProvider';

const NotificationPanel = () => {
  try {
    const { 
      notifications, 
      unreadCount, 
      lowStockItems, 
      markAllAsRead, 
      clearAllNotifications,
      refreshLowStockData
    } = useNotifications();
    
    // Add logging for debugging
    console.log("NotificationPanel - Notifications:", { 
      notificationCount: notifications?.length || 0, 
      unreadCount, 
      lowStockCount: lowStockItems?.totalCount || 0 
    });
    
    const totalLowStock = lowStockItems?.totalCount || 0;

    const handleRefresh = () => {
      refreshLowStockData();
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 p-1"
            title="الإشعارات"
          >
            <BellRing className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 px-1 min-w-[1.1rem] h-[1.1rem] text-[0.65rem]"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[280px] md:w-[350px]" align="end">
          <DropdownMenuLabel className="flex justify-between items-center">
            <span>الإشعارات</span>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={handleRefresh}
                title="تحديث الإشعارات"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              {notifications?.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-destructive" 
                  onClick={clearAllNotifications}
                  title="مسح الإشعارات"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <div className="max-h-[400px] overflow-y-auto p-1">
            {notifications && notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                لا توجد إشعارات جديدة
              </div>
            )}
          </div>
          
          {totalLowStock > 0 && lowStockItems && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <div className="font-semibold flex items-center gap-2 text-destructive my-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span>ملخص المخزون المنخفض</span>
                </div>
                
                {lowStockItems.counts.rawMaterials ? (
                  <DropdownMenuItem>
                    <div className="flex justify-between w-full">
                      <span>المواد الأولية</span>
                      <Badge variant="destructive">{lowStockItems.counts.rawMaterials}</Badge>
                    </div>
                  </DropdownMenuItem>
                ) : null}
                
                {lowStockItems.counts.semiFinished ? (
                  <DropdownMenuItem>
                    <div className="flex justify-between w-full">
                      <span>منتجات نصف مصنعة</span>
                      <Badge variant="destructive">{lowStockItems.counts.semiFinished}</Badge>
                    </div>
                  </DropdownMenuItem>
                ) : null}
                
                {lowStockItems.counts.packaging ? (
                  <DropdownMenuItem>
                    <div className="flex justify-between w-full">
                      <span>مستلزمات التعبئة</span>
                      <Badge variant="destructive">{lowStockItems.counts.packaging}</Badge>
                    </div>
                  </DropdownMenuItem>
                ) : null}
                
                {lowStockItems.counts.finished ? (
                  <DropdownMenuItem>
                    <div className="flex justify-between w-full">
                      <span>المنتجات النهائية</span>
                      <Badge variant="destructive">{lowStockItems.counts.finished}</Badge>
                    </div>
                  </DropdownMenuItem>
                ) : null}
              </div>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/inventory/low-stock" className="cursor-pointer flex justify-center text-primary font-semibold">
                  عرض كل المخزون المنخفض
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  } catch (error) {
    console.error("Error in NotificationPanel:", error);
    return (
      <Button variant="ghost" size="icon">
        <BellRing className="h-5 w-5" />
      </Button>
    );
  }
};

// Import at the top to avoid circular dependency
import NotificationItem from './NotificationItem';

export default NotificationPanel;
