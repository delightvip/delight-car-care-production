
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import NotificationPanel from './NotificationPanel';

type NotificationContextType = {
  isOpen: boolean;
  toggleNotifications: () => void;
  closeNotifications: () => void;
  notificationCount: number;
  lowStockData: {
    totalCount: number;
    counts: {
      rawMaterials: number;
      semiFinished: number;
      packaging: number;
      finished: number;
    };
    items: any[];
  };
  refreshLowStockData: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [lowStockData, setLowStockData] = useState<{
    totalCount: number;
    counts: {
      rawMaterials: number;
      semiFinished: number;
      packaging: number;
      finished: number;
    };
    items: any[];
  }>({
    totalCount: 0,
    counts: {
      rawMaterials: 0,
      semiFinished: 0,
      packaging: 0,
      finished: 0,
    },
    items: [],
  });

  const { data, refetch } = useQuery({
    queryKey: ['lowStockItems'],
    queryFn: async () => {
      try {
        // Raw Materials
        const rawMaterialsResponse = await supabase
          .from('raw_materials')
          .select('*')
          .lte('quantity', 'min_stock')
          .gt('min_stock', 0);

        // Semi-finished Products
        const semiFinishedResponse = await supabase
          .from('semi_finished_products')
          .select('*')
          .lte('quantity', 'min_stock')
          .gt('min_stock', 0);

        // Packaging Materials
        const packagingResponse = await supabase
          .from('packaging_materials')
          .select('*')
          .lte('quantity', 'min_stock')
          .gt('min_stock', 0);

        // Finished Products
        const finishedResponse = await supabase
          .from('finished_products')
          .select('*')
          .lte('quantity', 'min_stock')
          .gt('min_stock', 0);

        const rawMaterials = rawMaterialsResponse.data || [];
        const semiFinished = semiFinishedResponse.data || [];
        const packaging = packagingResponse.data || [];
        const finished = finishedResponse.data || [];

        // Format data for display
        const rawMaterialsFormatted = rawMaterials.map(item => ({
          id: item.id,
          name: item.name,
          type: 'raw_materials',
          typeName: 'مواد خام',
          code: item.code,
          quantity: item.quantity,
          min_stock: item.min_stock,
          unit: item.unit,
          unit_cost: item.unit_cost
        }));

        const semiFinishedFormatted = semiFinished.map(item => ({
          id: item.id,
          name: item.name,
          type: 'semi_finished_products',
          typeName: 'منتجات نصف مصنعة',
          code: item.code,
          quantity: item.quantity,
          min_stock: item.min_stock,
          unit: item.unit,
          unit_cost: item.unit_cost
        }));

        const packagingFormatted = packaging.map(item => ({
          id: item.id,
          name: item.name,
          type: 'packaging_materials',
          typeName: 'مواد تعبئة',
          code: item.code,
          quantity: item.quantity,
          min_stock: item.min_stock,
          unit: item.unit,
          unit_cost: item.unit_cost
        }));

        const finishedFormatted = finished.map(item => ({
          id: item.id,
          name: item.name,
          type: 'finished_products',
          typeName: 'منتجات نهائية',
          code: item.code,
          quantity: item.quantity,
          min_stock: item.min_stock,
          unit: item.unit,
          unit_cost: item.unit_cost
        }));

        // Combine all items
        const allItems = [
          ...rawMaterialsFormatted,
          ...semiFinishedFormatted,
          ...packagingFormatted,
          ...finishedFormatted
        ];

        // Sort by most critical (lowest quantity relative to min_stock) to highest
        allItems.sort((a, b) => {
          const ratioA = a.quantity / a.min_stock;
          const ratioB = b.quantity / b.min_stock;
          return ratioA - ratioB;
        });

        return {
          totalCount: allItems.length,
          items: allItems,
          counts: {
            rawMaterials: rawMaterials.length,
            semiFinished: semiFinished.length,
            packaging: packaging.length,
            finished: finished.length
          }
        };
      } catch (error) {
        console.error('Error fetching low stock items:', error);
        return {
          totalCount: 0,
          items: [],
          counts: {
            rawMaterials: 0,
            semiFinished: 0,
            packaging: 0,
            finished: 0
          }
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update notification count
  useEffect(() => {
    if (data) {
      setLowStockData({
        totalCount: data.totalCount,
        counts: {
          rawMaterials: data.counts.rawMaterials,
          semiFinished: data.counts.semiFinished,
          packaging: data.counts.packaging,
          finished: data.counts.finished
        },
        items: data.items
      });
      setNotificationCount(data.totalCount);
    } else {
      setLowStockData({
        totalCount: 0,
        counts: {
          rawMaterials: 0,
          semiFinished: 0,
          packaging: 0,
          finished: 0
        },
        items: []
      });
      setNotificationCount(0);
    }
  }, [data]);

  const toggleNotifications = () => {
    setIsOpen(!isOpen);
  };

  const closeNotifications = () => {
    setIsOpen(false);
  };

  const refreshLowStockData = () => {
    refetch();
  };

  return (
    <NotificationContext.Provider
      value={{
        isOpen,
        toggleNotifications,
        closeNotifications,
        notificationCount,
        lowStockData,
        refreshLowStockData,
      }}
    >
      {children}
      <NotificationPanel />
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
