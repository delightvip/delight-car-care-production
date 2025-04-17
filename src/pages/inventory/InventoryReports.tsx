
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Info, Package, Boxes } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import ReportFilterCard from '@/components/inventory/reports/ReportFilterCard';
import InventoryAnalyticsDashboard from '@/components/inventory/reports/InventoryAnalyticsDashboard';
import InventoryDashboardSummary from '@/components/inventory/reports/InventoryDashboardSummary';
import InventoryInsights from '@/components/inventory/reports/InventoryInsights';
import MostActiveItemsChart from '@/components/inventory/reports/MostActiveItemsChart';

// تعريف أنواع البيانات لعناصر المخزون والفئات
export interface InventoryItem {
  id: string;
  name: string;
  code: string;
  unit: string;
  quantity: number;
  min_stock: number;
}

export interface ItemCategory {
  id: string;
  name: string;
  itemCount: number;
}

const InventoryReports: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('raw');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('analytics');

  const { data: itemsData, isLoading: isLoadingItems } = useQuery({
    queryKey: ['items', selectedCategory],
    queryFn: async () => {
      let tableName = '';
      
      switch (selectedCategory) {
        case 'raw':
          tableName = 'raw_materials';
          break;
        case 'semi':
          tableName = 'semi_finished_products';
          break;
        case 'packaging':
          tableName = 'packaging_materials';
          break;
        case 'finished':
          tableName = 'finished_products';
          break;
        default:
          tableName = 'raw_materials';
      }
      
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('id, name, code, unit, quantity, min_stock')
          .order('name');
          
        if (error) {
          console.error("Error fetching items:", error);
          throw error;
        }
        
        return data as InventoryItem[];
      } catch (err) {
        console.error("Error fetching items:", err);
        return [] as InventoryItem[];
      }
    }
  });

  const { data: selectedItemDetails, isLoading: isLoadingItemDetails } = useQuery({
    queryKey: ['item-details', selectedCategory, selectedItem],
    queryFn: async () => {
      if (!selectedItem) return null;
      
      let tableName = '';
      
      switch (selectedCategory) {
        case 'raw':
          tableName = 'raw_materials';
          break;
        case 'semi':
          tableName = 'semi_finished_products';
          break;
        case 'packaging':
          tableName = 'packaging_materials';
          break;
        case 'finished':
          tableName = 'finished_products';
          break;
        default:
          tableName = 'raw_materials';
      }
      
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', selectedItem)
          .single();
          
        if (error) {
          console.error("Error fetching item details:", error);
          throw error;
        }
        
        return data as InventoryItem;
      } catch (err) {
        console.error("Error fetching item details:", err);
        return null;
      }
    },
    enabled: !!selectedItem
  });

  // الحصول على قائمة الفئات مع عدد العناصر
  const { data: categories } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const categoryData: ItemCategory[] = [
        { id: 'raw', name: 'مواد أولية', itemCount: 0 },
        { id: 'semi', name: 'نصف مصنعة', itemCount: 0 },
        { id: 'packaging', name: 'مواد تعبئة', itemCount: 0 },
        { id: 'finished', name: 'منتجات نهائية', itemCount: 0 }
      ];
      
      // الحصول على عدد العناصر لكل فئة
      for (const category of categoryData) {
        let tableName = '';
        switch (category.id) {
          case 'raw': tableName = 'raw_materials'; break;
          case 'semi': tableName = 'semi_finished_products'; break;
          case 'packaging': tableName = 'packaging_materials'; break;
          case 'finished': tableName = 'finished_products'; break;
        }
        
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
            
          if (!error && count !== null) {
            category.itemCount = count;
          }
        } catch (err) {
          console.error(`Error fetching count for ${category.name}:`, err);
        }
      }
      
      return categoryData;
    }
  });

  // تعيين العنصر الأول كقيمة افتراضية عند تغيير الفئة
  useEffect(() => {
    if (itemsData && itemsData.length > 0) {
      setSelectedItem(itemsData[0].id.toString());
    } else {
      setSelectedItem(null);
    }
  }, [itemsData]);

  return (
    <div className="container px-4 py-8 mx-auto">
      <Helmet>
        <title>تقارير المخزون | نظام إدارة المخزون</title>
      </Helmet>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">تقارير المخزون</h1>
          <p className="text-muted-foreground mt-1">
            تحليلات وتقارير تفصيلية عن حركة المخزون وأداء الأصناف
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <InventoryDashboardSummary />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="col-span-1 space-y-6">
          <ReportFilterCard 
            selectedCategory={selectedCategory} 
            setSelectedCategory={setSelectedCategory}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            categories={categories}
            items={itemsData}
            isLoadingCategories={false}
            isLoadingItems={isLoadingItems}
            isItemReport={false}
          />
          
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info size={16} className="text-muted-foreground" />
                نظرة سريعة
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <InventoryInsights />
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-1 md:col-span-3">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl flex items-center gap-2">
                    {activeTab === 'analytics' ? (
                      <>
                        <Package size={20} className="text-primary" />
                        تحليلات المخزون
                      </>
                    ) : (
                      <>
                        <Boxes size={20} className="text-primary" />
                        أداء الأصناف
                      </>
                    )}
                  </CardTitle>
                  
                  <TabsList>
                    <TabsTrigger value="analytics">تحليلات</TabsTrigger>
                    <TabsTrigger value="performance">أداء</TabsTrigger>
                  </TabsList>
                </div>
              </Tabs>
            </CardHeader>
            
            <Separator className="mb-0" />
            
            <CardContent className="pt-6">
              <TabsContent value="analytics" className="mt-0">
                <InventoryAnalyticsDashboard 
                  selectedItem={selectedItem}
                  selectedCategory={selectedCategory}
                  isLoadingItemDetails={isLoadingItemDetails}
                  selectedItemDetails={selectedItemDetails}
                />
              </TabsContent>
              
              <TabsContent value="performance" className="mt-0">
                {isLoadingItemDetails ? (
                  <div className="space-y-4">
                    <Skeleton className="h-[300px] w-full" />
                  </div>
                ) : !selectedItem ? (
                  <div className="p-8 text-center text-muted-foreground">
                    يرجى اختيار صنف للعرض
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <MostActiveItemsChart timeRange="month" limit={5} />
                    </div>
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InventoryReports;
