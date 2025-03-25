
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  AlertTriangle, Package, Beaker, Box, 
  ShoppingBag, Bell, InfoIcon, CheckCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { fetchLowStockItems } from '@/services/NotificationService';

interface NotificationType {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  date: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: NotificationType[];
  unreadCount: number;
  lowStockItems: {
    totalCount: number;
    counts: {
      rawMaterials: number;
      semiFinished: number;
      packaging: number;
      finished: number;
    };
    items: any[];
  } | null;
  addNotification: (notification: Omit<NotificationType, 'id' | 'date' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  refreshLowStockData: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  
  const { data: lowStockItems, refetch: refetchLowStock } = useQuery({
    queryKey: ['lowStockItems'],
    queryFn: fetchLowStockItems,
    refetchInterval: 60000, // كل دقيقة
  });

  // إضافة إشعار جديد
  const addNotification = (notification: Omit<NotificationType, 'id' | 'date' | 'read'>) => {
    const newNotification = {
      ...notification,
      id: crypto.randomUUID(),
      date: new Date(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // عرض إشعار toast
    showToast(newNotification);
  };

  // عرض إشعار toast
  const showToast = (notification: NotificationType) => {
    const getIconByType = () => {
      switch (notification.type) {
        case 'info': return <InfoIcon size={18} />;
        case 'success': return <CheckCircle size={18} />;
        case 'warning': return <AlertTriangle size={18} />;
        case 'error': return <AlertTriangle size={18} />;
        default: return <Bell size={18} />;
      }
    };
    
    toast(notification.title, {
      description: notification.message,
      icon: getIconByType(),
      duration: 5000,
      action: notification.link ? {
        label: 'فتح',
        onClick: () => window.location.href = notification.link as string,
      } : undefined,
    });
  };

  // تحديث حالة قراءة الإشعار
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(item => 
        item.id === id ? { ...item, read: true } : item
      )
    );
  };

  // تحديث حالة قراءة كل الإشعارات
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(item => ({ ...item, read: true }))
    );
  };

  // حذف إشعار
  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(item => item.id !== id));
  };

  // حذف كل الإشعارات
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // حساب عدد الإشعارات غير المقروءة
  const unreadCount = notifications.filter(n => !n.read).length;

  // إعادة تحميل بيانات المخزون المنخفض
  const refreshLowStockData = () => {
    refetchLowStock();
  };

  // إضافة إشعارات المخزون المنخفض عند تغير البيانات
  useEffect(() => {
    if (lowStockItems && lowStockItems.totalCount > 0) {
      // عرض إشعارات لكل نوع من المخزون المنخفض
      if (lowStockItems.counts.rawMaterials > 0) {
        addNotification({
          title: 'تنبيه المواد الأولية',
          message: `يوجد ${lowStockItems.counts.rawMaterials} من المواد الأولية بمخزون منخفض`,
          type: 'warning',
          link: '/inventory/low-stock'
        });
      }
      
      if (lowStockItems.counts.semiFinished > 0) {
        addNotification({
          title: 'تنبيه المنتجات النصف مصنعة',
          message: `يوجد ${lowStockItems.counts.semiFinished} من المنتجات النصف مصنعة بمخزون منخفض`,
          type: 'warning',
          link: '/inventory/low-stock'
        });
      }
      
      if (lowStockItems.counts.packaging > 0) {
        addNotification({
          title: 'تنبيه مستلزمات التعبئة',
          message: `يوجد ${lowStockItems.counts.packaging} من مستلزمات التعبئة بمخزون منخفض`,
          type: 'warning',
          link: '/inventory/low-stock'
        });
      }
      
      if (lowStockItems.counts.finished > 0) {
        addNotification({
          title: 'تنبيه المنتجات النهائية',
          message: `يوجد ${lowStockItems.counts.finished} من المنتجات النهائية بمخزون منخفض`,
          type: 'warning',
          link: '/inventory/low-stock'
        });
      }
    }
  // استخدمت lowStockItems.totalCount لتجنب التكرار المستمر للإشعارات
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowStockItems?.totalCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        lowStockItems,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        refreshLowStockData
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
