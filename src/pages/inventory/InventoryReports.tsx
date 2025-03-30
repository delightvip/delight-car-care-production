
import React, { useState } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileDown, BarChart3, PieChart, ActivitySquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Define item types for inventory
type ItemType = 'raw' | 'semi' | 'packaging' | 'finished';

// Define item category interface
interface ItemCategory {
  id: string;
  name: string;
  type: ItemType;
  itemCount: number;
}

// Define item interface
interface InventoryItem {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
}

const inventoryTables = [
  { id: 'raw', name: 'المواد الخام', table: 'raw_materials' },
  { id: 'semi', name: 'المنتجات النصف مصنعة', table: 'semi_finished_products' },
  { id: 'packaging', name: 'مواد التعبئة', table: 'packaging_materials' },
  { id: 'finished', name: 'المنتجات النهائية', table: 'finished_products' }
];

const InventoryReports = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('raw');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [reportType, setReportType] = useState<string>('movement');
  const [timeRange, setTimeRange] = useState<string>('month');
  
  // Get item categories
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const result: ItemCategory[] = [];
      
      for (const type of inventoryTables) {
        const { data, error } = await supabase
          .from(type.table)
          .select('count')
          .count();
          
        if (error) throw error;
        
        result.push({
          id: type.id,
          name: type.name,
          type: type.id as ItemType,
          itemCount: data?.[0]?.count || 0
        });
      }
      
      return result;
    }
  });
  
  // Get items for selected category
  const { data: items, isLoading: isLoadingItems } = useQuery({
    queryKey: ['inventory-items', selectedCategory],
    queryFn: async () => {
      const selectedTable = inventoryTables.find(t => t.id === selectedCategory)?.table;
      
      if (!selectedTable) return [];
      
      const { data, error } = await supabase
        .from(selectedTable)
        .select('id, code, name, quantity, unit')
        .order('name');
        
      if (error) throw error;
      
      return data as InventoryItem[];
    },
    enabled: !!selectedCategory
  });
  
  // Get selected item details
  const { data: selectedItemDetails, isLoading: isLoadingItemDetails } = useQuery({
    queryKey: ['inventory-item-details', selectedCategory, selectedItem],
    queryFn: async () => {
      if (!selectedItem) return null;
      
      const selectedTable = inventoryTables.find(t => t.id === selectedCategory)?.table;
      
      if (!selectedTable) return null;
      
      const { data, error } = await supabase
        .from(selectedTable)
        .select('*')
        .eq('id', selectedItem)
        .single();
        
      if (error) throw error;
      
      return data as InventoryItem;
    },
    enabled: !!selectedItem
  });
  
  // Set the first item as selected when items load
  React.useEffect(() => {
    if (items && items.length > 0 && !selectedItem) {
      setSelectedItem(items[0].id);
    }
  }, [items, selectedItem]);

  // Render appropriate report component based on selected report type
  const renderReport = () => {
    if (!selectedItem || !selectedCategory) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          يرجى اختيار صنف للعرض
        </div>
      );
    }
    
    if (isLoadingItemDetails) {
      return (
        <div className="p-8 space-y-4">
          <Skeleton className="h-[300px] w-full" />
        </div>
      );
    }
    
    // Import the report components dynamically to avoid circular dependencies
    const InventoryMovementChart = React.lazy(() => import('@/components/inventory/reports/InventoryMovementChart'));
    const InventoryUsageChart = React.lazy(() => import('@/components/inventory/reports/InventoryUsageChart'));
    const InventorySummaryStats = React.lazy(() => import('@/components/inventory/reports/InventorySummaryStats'));
    
    return (
      <React.Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
        <div className="space-y-6">
          {/* Summary statistics */}
          <InventorySummaryStats itemId={selectedItem} itemType={selectedCategory} />
          
          {/* Main report content */}
          {reportType === 'movement' && (
            <InventoryMovementChart 
              itemId={selectedItem} 
              itemType={selectedCategory} 
              timeRange={timeRange} 
              itemName={selectedItemDetails?.name || ''} 
              itemUnit={selectedItemDetails?.unit || ''}
            />
          )}
          
          {reportType === 'usage' && (
            <InventoryUsageChart 
              itemId={selectedItem} 
              itemType={selectedCategory} 
              timeRange={timeRange} 
              itemName={selectedItemDetails?.name || ''}
            />
          )}
        </div>
      </React.Suspense>
    );
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">تقارير المخزون</h1>
            <p className="text-muted-foreground mt-1">تحليل وإحصائيات حركة المخزون</p>
          </div>
          <Button variant="outline" className="gap-2">
            <FileDown size={16} />
            تصدير التقرير
          </Button>
        </div>
        
        {/* Filter and controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category selection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">نوع الصنف</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع المخزون" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingCategories ? (
                    <div className="p-2">
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : (
                    categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name} ({category.itemCount})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          {/* Item selection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">الصنف</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedItem || ''} onValueChange={setSelectedItem}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الصنف" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingItems ? (
                    <div className="p-2">
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : items?.length === 0 ? (
                    <SelectItem value="none" disabled>
                      لا توجد أصناف
                    </SelectItem>
                  ) : (
                    items?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.code})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          {/* Report type selection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">نوع التقرير</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع التقرير" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movement">
                    <div className="flex items-center gap-2">
                      <ActivitySquare size={14} />
                      <span>حركة المخزون</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="usage">
                    <div className="flex items-center gap-2">
                      <PieChart size={14} />
                      <span>توزيع الاستهلاك</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          {/* Time range selection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">الفترة الزمنية</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفترة الزمنية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">أسبوع</SelectItem>
                  <SelectItem value="month">شهر</SelectItem>
                  <SelectItem value="quarter">ربع سنوي</SelectItem>
                  <SelectItem value="year">سنوي</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
        
        {/* Report content */}
        <div className="bg-muted/50 rounded-lg p-6 border">
          {renderReport()}
        </div>
      </div>
    </PageTransition>
  );
};

export default InventoryReports;
