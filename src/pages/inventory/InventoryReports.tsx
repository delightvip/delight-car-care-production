
import React, { useState, useEffect } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileDown, BarChart3, PieChart, ActivitySquare, Download, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

type ItemType = 'raw' | 'semi' | 'packaging' | 'finished';

interface ItemCategory {
  id: string;
  name: string;
  type: ItemType;
  itemCount: number;
}

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
}

const inventoryTables = [
  { id: 'raw', name: 'المواد الخام', table: 'raw_materials' as const },
  { id: 'semi', name: 'المنتجات النصف مصنعة', table: 'semi_finished_products' as const },
  { id: 'packaging', name: 'مواد التعبئة', table: 'packaging_materials' as const },
  { id: 'finished', name: 'المنتجات النهائية', table: 'finished_products' as const }
];

const InventoryReports = () => {
  const params = useParams<{ type?: string; id?: string }>();
  const isItemReport = !!params.type && !!params.id;

  const [selectedCategory, setSelectedCategory] = useState<string>(params.type || 'raw');
  const [selectedItem, setSelectedItem] = useState<string | null>(params.id || null);
  const [reportType, setReportType] = useState<string>('movement');
  const [timeRange, setTimeRange] = useState<string>('month');
  
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const result: ItemCategory[] = [];
      
      for (const type of inventoryTables) {
        const { count, error } = await supabase
          .from(type.table)
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.error(`Error fetching count for ${type.table}:`, error);
        }
          
        result.push({
          id: type.id,
          name: type.name,
          type: type.id as ItemType,
          itemCount: count || 0
        });
      }
      
      return result;
    }
  });
  
  const { data: items, isLoading: isLoadingItems } = useQuery({
    queryKey: ['inventory-items', selectedCategory],
    queryFn: async () => {
      const selectedTableInfo = inventoryTables.find(t => t.id === selectedCategory);
      
      if (!selectedTableInfo) return [];
      
      const { data, error } = await supabase
        .from(selectedTableInfo.table)
        .select('id, code, name, quantity, unit');
        
      if (error) {
        console.error(`Error fetching items from ${selectedTableInfo.table}:`, error);
        return [];
      }
        
      return data.map(item => ({
        id: String(item.id),
        code: String(item.code),
        name: String(item.name),
        quantity: Number(item.quantity),
        unit: String(item.unit)
      })) as InventoryItem[];
    },
    enabled: !!selectedCategory
  });
  
  const { data: selectedItemDetails, isLoading: isLoadingItemDetails } = useQuery({
    queryKey: ['inventory-item-details', selectedCategory, selectedItem],
    queryFn: async () => {
      if (!selectedItem) return null;
      
      const selectedTableInfo = inventoryTables.find(t => t.id === selectedCategory);
      
      if (!selectedTableInfo) return null;
      
      const { data, error } = await supabase
        .from(selectedTableInfo.table)
        .select('id, code, name, quantity, unit')
        .eq('id', parseInt(selectedItem))
        .single();
        
      if (error) {
        console.error(`Error fetching item details:`, error);
        return null;
      }
        
      return {
        id: String(data.id),
        code: String(data.code),
        name: String(data.name),
        quantity: Number(data.quantity),
        unit: String(data.unit)
      } as InventoryItem;
    },
    enabled: !!selectedItem && !!selectedCategory
  });
  
  useEffect(() => {
    if (items && items.length > 0 && !selectedItem) {
      setSelectedItem(items[0].id);
    }
  }, [items, selectedItem]);

  const handleExportReport = () => {
    toast.info("جاري تحضير التقرير للتنزيل...");
    
    setTimeout(() => {
      toast.success("تم تحضير التقرير بنجاح، جاري التنزيل");
    }, 1500);
  };

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
    
    const InventoryMovementChart = React.lazy(() => import('@/components/inventory/reports/InventoryMovementChart'));
    const InventoryUsageChart = React.lazy(() => import('@/components/inventory/reports/InventoryUsageChart'));
    const InventorySummaryStats = React.lazy(() => import('@/components/inventory/reports/InventorySummaryStats'));
    
    return (
      <React.Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
        <div className="space-y-6">
          <InventorySummaryStats 
            itemId={selectedItem} 
            itemType={selectedCategory} 
          />
          
          <Tabs defaultValue={reportType} value={reportType} onValueChange={setReportType} className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList className="grid grid-cols-2 w-[400px]">
                <TabsTrigger value="movement" className="flex items-center gap-2">
                  <ActivitySquare size={16} />
                  <span>حركة المخزون</span>
                </TabsTrigger>
                <TabsTrigger value="usage" className="flex items-center gap-2">
                  <PieChart size={16} />
                  <span>توزيع الاستهلاك</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-muted-foreground" />
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="اختر الفترة الزمنية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">أسبوع</SelectItem>
                    <SelectItem value="month">شهر</SelectItem>
                    <SelectItem value="quarter">ربع سنوي</SelectItem>
                    <SelectItem value="year">سنوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Card className="border-border/40">
              <CardContent className="p-4">
                <TabsContent value="movement" className="mt-0">
                  <div className="h-[400px]">
                    <InventoryMovementChart 
                      itemId={selectedItem} 
                      itemType={selectedCategory} 
                      timeRange={timeRange} 
                      itemName={selectedItemDetails?.name || ''} 
                      itemUnit={selectedItemDetails?.unit || ''}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="usage" className="mt-0">
                  <div className="h-[400px]">
                    <InventoryUsageChart 
                      itemId={selectedItem} 
                      itemType={selectedCategory} 
                      timeRange={timeRange} 
                      itemName={selectedItemDetails?.name || ''}
                    />
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
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
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleExportReport}
          >
            <Download size={16} />
            تصدير التقرير
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">نوع الصنف</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedCategory} 
                onValueChange={setSelectedCategory}
                disabled={isItemReport}
              >
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
          
          <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">الصنف</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedItem || ''} 
                onValueChange={setSelectedItem}
                disabled={isItemReport}
              >
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
          
          <Card className="border-border/40 bg-card/60 backdrop-blur-sm col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">معلومات التقرير</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                {selectedItemDetails ? (
                  <div>
                    <p className="font-medium">{selectedItemDetails.name}</p>
                    <p className="text-sm text-muted-foreground">
                      كود: {selectedItemDetails.code} | الوحدة: {selectedItemDetails.unit}
                    </p>
                  </div>
                ) : (
                  <Skeleton className="h-10 w-[200px]" />
                )}
                
                <div className="flex gap-4 items-center">
                  <div className="text-sm text-right">
                    <span className="block font-medium">آخر تحديث:</span>
                    <span className="block text-muted-foreground">
                      {new Date().toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="bg-muted/30 rounded-lg p-6 border border-border/40 shadow-sm">
          {renderReport()}
        </div>
      </div>
    </PageTransition>
  );
};

export default InventoryReports;
