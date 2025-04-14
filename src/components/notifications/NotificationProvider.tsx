import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [prevLowStockCounts, setPrevLowStockCounts] = useState({
    rawMaterials: 0,
    semiFinished: 0,
    packaging: 0,
    finished: 0,
    totalCount: 0
  });
  
  const { data: lowStockItems, refetch: refetchLowStock } = useQuery({
    queryKey: ['lowStockItems'],
    queryFn: fetchLowStockItems,
    refetchInterval: 30000, // كل 30 ثانية
    staleTime: 20000, // تعتبر البيانات قديمة بعد 20 ثانية
  });
  // دالة مساعدة لإنشاء معرف فريد متوافق مع جميع المتصفحات
  const generateUniqueId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  // إضافة إشعار جديد
  const addNotification = useCallback((notification: Omit<NotificationType, 'id' | 'date' | 'read'>) => {
    const newNotification = {
      ...notification,
      id: generateUniqueId(),
      date: new Date(),
      read: false,
    };
    
    setNotifications(prev => {
      // تجنب تكرار الإشعارات المتشابهة خلال فترة قصيرة
      const isDuplicate = prev.some(
        n => n.title === notification.title && 
        n.message === notification.message &&
        Date.now() - new Date(n.date).getTime() < 300000 // 5 دقائق
      );
      
      if (isDuplicate) {
        return prev;
      }
      
      return [newNotification, ...prev];
    });
    
    // عرض إشعار toast
    showToast(newNotification);
  }, []);

  // عرض إشعار toast
  const showToast = useCallback((notification: NotificationType) => {
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
  }, []);

  // تحديث حالة قراءة الإشعار
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(item => 
        item.id === id ? { ...item, read: true } : item
      )
    );
  }, []);

  // تحديث حالة قراءة كل الإشعارات
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(item => ({ ...item, read: true }))
    );
  }, []);

  // حذف إشعار
  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(item => item.id !== id));
  }, []);

  // حذف كل الإشعارات
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // حساب عدد الإشعارات غير المقروءة
  const unreadCount = notifications.filter(n => !n.read).length;

  // إعادة تحميل بيانات المخزون المنخفض
  const refreshLowStockData = useCallback(() => {
    refetchLowStock();
  }, [refetchLowStock]);

  // إضافة مستمع للتغييرات في قاعدة البيانات
  useEffect(() => {
    const setupRealtimeSubscriptions = async () => {
      // إعداد قناة Supabase الحقيقية للاستماع للتغييرات
      const channel = supabase
        .channel('db-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'raw_materials',
        }, () => refreshLowStockData())
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'semi_finished_products',
        }, () => refreshLowStockData())
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'packaging_materials',
        }, () => refreshLowStockData())
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'finished_products',
        }, () => refreshLowStockData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscriptions();
  }, [refreshLowStockData]);

  // مقارنة أعداد المخزون المنخفض بالأعداد السابقة وإظهار إشعارات إذا تغيرت
  useEffect(() => {
    if (!lowStockItems) return;

    // تحقق مما إذا كانت هناك تغييرات في عدد عناصر المخزون المنخفض
    const hasChanges = lowStockItems.counts.rawMaterials !== prevLowStockCounts.rawMaterials ||
                      lowStockItems.counts.semiFinished !== prevLowStockCounts.semiFinished ||
                      lowStockItems.counts.packaging !== prevLowStockCounts.packaging ||
                      lowStockItems.counts.finished !== prevLowStockCounts.finished;

    if (hasChanges) {
      // عرض إشعارات المخزون المنخفض للأقسام التي تغيرت
      if (lowStockItems.counts.rawMaterials > 0 && 
          lowStockItems.counts.rawMaterials !== prevLowStockCounts.rawMaterials) {
        addNotification({
          title: 'تنبيه المواد الأولية',
          message: `يوجد ${lowStockItems.counts.rawMaterials} من المواد الأولية بمخزون منخفض`,
          type: 'warning',
          link: '/inventory/low-stock'
        });
      }
      
      if (lowStockItems.counts.semiFinished > 0 && 
          lowStockItems.counts.semiFinished !== prevLowStockCounts.semiFinished) {
        addNotification({
          title: 'تنبيه المنتجات النصف مصنعة',
          message: `يوجد ${lowStockItems.counts.semiFinished} من المنتجات النصف مصنعة بمخزون منخفض`,
          type: 'warning',
          link: '/inventory/low-stock'
        });
      }
      
      if (lowStockItems.counts.packaging > 0 && 
          lowStockItems.counts.packaging !== prevLowStockCounts.packaging) {
        addNotification({
          title: 'تنبيه مستلزمات التعبئة',
          message: `يوجد ${lowStockItems.counts.packaging} من مستلزمات التعبئة بمخزون منخفض`,
          type: 'warning',
          link: '/inventory/low-stock'
        });
      }
      
      if (lowStockItems.counts.finished > 0 && 
          lowStockItems.counts.finished !== prevLowStockCounts.finished) {
        addNotification({
          title: 'تنبيه المنتجات النهائية',
          message: `يوجد ${lowStockItems.counts.finished} من المنتجات النهائية بمخزون منخفض`,
          type: 'warning',
          link: '/inventory/low-stock'
        });
      }
      
      // حفظ القيم الجديدة للمقارنة في المرة القادمة
      setPrevLowStockCounts({
        rawMaterials: lowStockItems.counts.rawMaterials,
        semiFinished: lowStockItems.counts.semiFinished,
        packaging: lowStockItems.counts.packaging,
        finished: lowStockItems.counts.finished,
        totalCount: lowStockItems.totalCount
      });
    }
  }, [lowStockItems, prevLowStockCounts, addNotification]);

  // مراقبة تحديثات وإضافات قاعدة البيانات لضمان ظهور الإشعارات
  useEffect(() => {
    // تنفيذ فحص أولي للمخزون المنخفض عند تحميل الصفحة
    refreshLowStockData();
    
    // فحص دوري كل دقيقة
    const interval = setInterval(refreshLowStockData, 60000);
    
    return () => clearInterval(interval);
  }, [refreshLowStockData]);

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
