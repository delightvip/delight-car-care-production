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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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

    const [open, setOpen] = React.useState(false);

    return (
      <>
        {/* زر الجرس (يفتح الشيت على الجوال) */}
        <div className="block md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 p-1"
                title="الإشعارات"
                onClick={() => setOpen(true)}
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
            </SheetTrigger>
            <SheetContent side="bottom" scrollable className="max-h-[85vh] rounded-t-xl">
              <SheetHeader>
                <SheetTitle>الإشعارات</SheetTitle>
              </SheetHeader>
              <div className="flex gap-2 justify-end my-2">
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
              <div className="max-h-[60vh] overflow-y-auto p-1">
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
                  <div className="border-t my-2 pt-2">
                    <div className="font-semibold flex items-center gap-2 text-destructive my-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span>ملخص المخزون المنخفض</span>
                    </div>
                    {lowStockItems.counts.rawMaterials ? (
                      <div className="flex justify-between w-full text-sm my-1">
                        <span>المواد الأولية</span>
                        <Badge variant="destructive">{lowStockItems.counts.rawMaterials}</Badge>
                      </div>
                    ) : null}
                    {lowStockItems.counts.semiFinished ? (
                      <div className="flex justify-between w-full text-sm my-1">
                        <span>منتجات نصف مصنعة</span>
                        <Badge variant="destructive">{lowStockItems.counts.semiFinished}</Badge>
                      </div>
                    ) : null}
                    {lowStockItems.counts.packaging ? (
                      <div className="flex justify-between w-full text-sm my-1">
                        <span>مستلزمات التعبئة</span>
                        <Badge variant="destructive">{lowStockItems.counts.packaging}</Badge>
                      </div>
                    ) : null}
                    {lowStockItems.counts.finished ? (
                      <div className="flex justify-between w-full text-sm my-1">
                        <span>المنتجات النهائية</span>
                        <Badge variant="destructive">{lowStockItems.counts.finished}</Badge>
                      </div>
                    ) : null}
                  </div>
                  <Button asChild variant="link" className="w-full mt-2" onClick={() => setOpen(false)}>
                    <Link to="/inventory/low-stock">عرض كل المخزون المنخفض</Link>
                  </Button>
                </>
              )}
            </SheetContent>
          </Sheet>
        </div>
        {/* القائمة المنسدلة (ديسكتوب) */}
        <div className="hidden md:block">
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
            <DropdownMenuContent className="w-[280px] md:w-[350px] bg-background border border-border shadow-lg dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-black/40 backdrop-blur-sm transition-colors duration-200" align="end">
              <DropdownMenuLabel className="flex justify-between items-center text-foreground dark:text-white">
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
              <DropdownMenuSeparator className="bg-border dark:bg-neutral-700" />
              <div className="max-h-[400px] overflow-y-auto p-1">
                {notifications && notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground dark:text-neutral-400">
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
        </div>
        {/* === MODERN FLOATING LOW STOCK TOAST === */}
        {false && totalLowStock > 0 && lowStockItems && (
          <div
            className="fixed z-[99] bottom-6 right-6 animate-in fade-in slide-in-from-bottom-4 w-[92vw] max-w-xs md:max-w-sm lg:max-w-md rounded-2xl bg-gradient-to-br from-white/90 via-blue-50/80 to-blue-100/90 dark:from-neutral-900/90 dark:via-neutral-800/80 dark:to-neutral-900/90 border border-blue-200 dark:border-blue-900 shadow-2xl backdrop-blur-lg flex flex-col gap-1 px-4 py-3 transition-all group hover:scale-105 hover:shadow-3xl"
            style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center rounded-full bg-gradient-to-tr from-blue-200 to-blue-400 text-white p-2 shadow-sm">
                <AlertTriangle className="h-5 w-5 text-blue-700 dark:text-yellow-300 animate-pulse" />
              </div>
              <div className="flex-1">
                <span className="font-bold text-base text-blue-900 dark:text-blue-100">تنبيه مخزون منخفض</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40" onClick={handleRefresh} title="تحديث">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 justify-between items-center text-xs font-medium text-blue-800 dark:text-blue-200">
              {lowStockItems.counts.rawMaterials ? (
                <div className="flex items-center gap-1 bg-blue-100/80 dark:bg-blue-900/40 rounded px-2 py-0.5">
                  <span>مواد أولية</span>
                  <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200">{lowStockItems.counts.rawMaterials}</Badge>
                </div>
              ) : null}
              {lowStockItems.counts.semiFinished ? (
                <div className="flex items-center gap-1 bg-blue-100/80 dark:bg-blue-900/40 rounded px-2 py-0.5">
                  <span>نصف مصنعة</span>
                  <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200">{lowStockItems.counts.semiFinished}</Badge>
                </div>
              ) : null}
              {lowStockItems.counts.packaging ? (
                <div className="flex items-center gap-1 bg-blue-100/80 dark:bg-blue-900/40 rounded px-2 py-0.5">
                  <span>تعبئة</span>
                  <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200">{lowStockItems.counts.packaging}</Badge>
                </div>
              ) : null}
              {lowStockItems.counts.finished ? (
                <div className="flex items-center gap-1 bg-blue-100/80 dark:bg-blue-900/40 rounded px-2 py-0.5">
                  <span>نهائية</span>
                  <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200">{lowStockItems.counts.finished}</Badge>
                </div>
              ) : null}
            </div>
            <Button asChild variant="link" size="sm" className="mt-2 w-full text-blue-700 dark:text-blue-200 font-semibold underline underline-offset-4 hover:text-blue-900 dark:hover:text-blue-100 transition-colors">
              <Link to="/inventory/low-stock">عرض التفاصيل</Link>
            </Button>
          </div>
        )}
      </>
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
