import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useSidebar } from '@/components/layout/SidebarContext';
import { useLocalStorage } from '@/hooks/use-local-storage';

// تعريف أنواع البيانات لسياق المخزن
interface InventoryContextType {
  activeView: 'raw-materials' | 'finished-products' | 'low-stock' | 'statistics';
  setActiveView: (view: 'raw-materials' | 'finished-products' | 'low-stock' | 'statistics') => void;
  filterType: 'all' | 'low-stock' | 'high-value' | 'high-importance';
  setFilterType: (filter: 'all' | 'low-stock' | 'high-value' | 'high-importance') => void;
  isFiltersPanelOpen: boolean;
  toggleFiltersPanel: () => void;
  isSidebarAdjusted: boolean;
}

// إنشاء سياق المخزن
const InventoryContext = createContext<InventoryContextType | null>(null);

// Hook لاستخدام سياق المخزن
export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

interface InventoryProviderProps {
  children: ReactNode;
}

// مزود سياق المخزن
export const InventoryProvider: React.FC<InventoryProviderProps> = ({ children }) => {
  // استخدام سياق القائمة الجانبية للتفاعل معها
  const { isOpen: isSidebarOpen } = useSidebar();
  
  // حفظ إعدادات المستخدم في التخزين المحلي
  const [activeView, setActiveView] = useLocalStorage<'raw-materials' | 'finished-products' | 'low-stock' | 'statistics'>('inventory-active-view', 'raw-materials');
  const [filterType, setFilterType] = useLocalStorage<'all' | 'low-stock' | 'high-value' | 'high-importance'>('inventory-filter-type', 'all');
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useLocalStorage('inventory-filters-panel-open', false);
  
  // متابعة حالة تعديل القائمة الجانبية
  const [isSidebarAdjusted, setIsSidebarAdjusted] = useState(false);
  
  // تبديل حالة لوحة التصفية
  const toggleFiltersPanel = useCallback(() => {
    setIsFiltersPanelOpen((prevOpen) => !prevOpen);
  }, [setIsFiltersPanelOpen]);
  
  // مراقبة تغيرات حالة القائمة الجانبية
  useEffect(() => {
    // نعدل التخطيط عند تغير حالة القائمة الجانبية
    setIsSidebarAdjusted(true);
    const timer = setTimeout(() => {
      setIsSidebarAdjusted(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [isSidebarOpen]);
  
  return (
    <InventoryContext.Provider
      value={{
        activeView,
        setActiveView,
        filterType,
        setFilterType,
        isFiltersPanelOpen,
        toggleFiltersPanel,
        isSidebarAdjusted
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};