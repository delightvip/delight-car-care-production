
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
import { getItemTypeIcon, getItemTypeBgColor } from '@/services/NotificationService';
import NotificationItem from './NotificationItem';

const NotificationPanel = () => {
  const { 
    notifications, 
    unreadCount, 
    lowStockItems, 
    markAllAsRead, 
    clearAllNotifications,
    refreshLowStockData
  } = useNotifications();
  
  const totalLowStock = lowStockItems?.totalCount || 0;

  const handleRefresh = () => {
    refreshLowStockData();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellRing className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel className="text-base">الإشعارات</DropdownMenuLabel>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              title="تحديث"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={markAllAsRead}
              title="تعليم الكل كمقروء"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clearAllNotifications}
              title="حذف الكل"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />
        
        <div className="max-h-[400px] overflow-y-auto p-1">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              لا توجد إشعارات جديدة
            </div>
          )}
        </div>
        
        {totalLowStock > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <div className="font-semibold flex items-center gap-2 text-destructive my-1">
                <AlertTriangle className="h-4 w-4" />
                <span>ملخص المخزون المنخفض</span>
              </div>
              
              {lowStockItems?.counts.rawMaterials ? (
                <DropdownMenuItem>
                  <div className="flex justify-between w-full">
                    <span>المواد الأولية</span>
                    <Badge variant="destructive">{lowStockItems.counts.rawMaterials}</Badge>
                  </div>
                </DropdownMenuItem>
              ) : null}
              
              {lowStockItems?.counts.semiFinished ? (
                <DropdownMenuItem>
                  <div className="flex justify-between w-full">
                    <span>منتجات نصف مصنعة</span>
                    <Badge variant="destructive">{lowStockItems.counts.semiFinished}</Badge>
                  </div>
                </DropdownMenuItem>
              ) : null}
              
              {lowStockItems?.counts.packaging ? (
                <DropdownMenuItem>
                  <div className="flex justify-between w-full">
                    <span>مستلزمات التعبئة</span>
                    <Badge variant="destructive">{lowStockItems.counts.packaging}</Badge>
                  </div>
                </DropdownMenuItem>
              ) : null}
              
              {lowStockItems?.counts.finished ? (
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
};

export default NotificationPanel;
