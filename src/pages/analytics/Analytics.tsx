
import React from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InventoryDistribution from '@/components/dashboard/InventoryDistribution';
import ProductionChart from '@/components/dashboard/ProductionChart';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const Analytics = () => {
  const { data: inventoryStats, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventoryStats'],
    queryFn: async () => {
      try {
        // جلب إحصائيات المخزون
        const { data: rawMaterialsResponse, error: rawMaterialsError } = await supabase
          .from('raw_materials')
          .select('quantity, unit_cost');
          
        const { data: semiFinishedResponse, error: semiFinishedError } = await supabase
          .from('semi_finished_products')
          .select('quantity, unit_cost');
          
        const { data: packagingResponse, error: packagingError } = await supabase
          .from('packaging_materials')
          .select('quantity, unit_cost');
          
        const { data: finishedResponse, error: finishedError } = await supabase
          .from('finished_products')
          .select('quantity, unit_cost');
        
        // Check for errors
        if (rawMaterialsError) throw rawMaterialsError;
        if (semiFinishedError) throw semiFinishedError;
        if (packagingError) throw packagingError;
        if (finishedError) throw finishedError;
        
        // Safely handle empty or null data with default values
        const rawMaterialsData = rawMaterialsResponse || [];
        const semiFinishedData = semiFinishedResponse || [];
        const packagingData = packagingResponse || [];
        const finishedData = finishedResponse || [];
        
        // حساب إجمالي القيمة لكل نوع
        const rawMaterialsValue = rawMaterialsData.reduce(
          (sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0
        );
        
        const semiFinishedValue = semiFinishedData.reduce(
          (sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0
        );
        
        const packagingValue = packagingData.reduce(
          (sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0
        );
        
        const finishedValue = finishedData.reduce(
          (sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0
        );
        
        const totalValue = rawMaterialsValue + semiFinishedValue + packagingValue + finishedValue;
        
        // استخراج عدد العناصر
        const rawMaterialsCount = rawMaterialsData.length || 0;
        const semiFinishedCount = semiFinishedData.length || 0;
        const packagingCount = packagingData.length || 0;
        const finishedCount = finishedData.length || 0;
        
        console.log("Inventory Stats Data:", {
          rawMaterialsValue,
          semiFinishedValue,
          packagingValue,
          finishedValue
        });
        
        return {
          values: {
            rawMaterials: rawMaterialsValue,
            semiFinished: semiFinishedValue,
            packaging: packagingValue,
            finished: finishedValue,
            total: totalValue
          },
          counts: {
            rawMaterials: rawMaterialsCount,
            semiFinished: semiFinishedCount,
            packaging: packagingCount,
            finished: finishedCount,
            total: rawMaterialsCount + semiFinishedCount + packagingCount + finishedCount
          }
        };
      } catch (error) {
        console.error("Error fetching inventory stats:", error);
        // Return default values structure instead of throwing to prevent component crash
        return {
          values: {
            rawMaterials: 0,
            semiFinished: 0,
            packaging: 0,
            finished: 0,
            total: 0
          },
          counts: {
            rawMaterials: 0,
            semiFinished: 0,
            packaging: 0,
            finished: 0,
            total: 0
          }
        };
      }
    },
    refetchInterval: 60000
  });
  
  // بيانات توزيع المخزون للتمريرها إلى مكون الرسم البياني
  const distributionData = React.useMemo(() => {
    if (!inventoryStats) return [];
    
    return [
      { name: 'المواد الأولية', value: inventoryStats.values.rawMaterials },
      { name: 'المنتجات النصف مصنعة', value: inventoryStats.values.semiFinished },
      { name: 'مواد التعبئة', value: inventoryStats.values.packaging },
      { name: 'المنتجات النهائية', value: inventoryStats.values.finished }
    ];
  }, [inventoryStats]);
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">التحليلات والإحصائيات</h1>
          <p className="text-muted-foreground mt-1">تحليل أداء المصنع والمخزون</p>
        </div>
        
        <Tabs defaultValue="inventory" dir="rtl" className="w-full">
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-2">
            <TabsTrigger value="inventory">تحليل المخزون</TabsTrigger>
            <TabsTrigger value="production">تحليل الإنتاج</TabsTrigger>
          </TabsList>
          
          <TabsContent value="inventory" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>إحصائيات المخزون</CardTitle>
                  <CardDescription>
                    إجمالي قيمة وعدد عناصر المخزون حسب النوع
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {inventoryLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="border rounded-md p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">المواد الأولية</span>
                          <span className="text-blue-600 font-medium">{inventoryStats?.counts?.rawMaterials || 0} عنصر</span>
                        </div>
                        <div className="text-lg font-bold">
                          {(inventoryStats?.values?.rawMaterials || 0).toLocaleString('ar-EG')} ج.م
                        </div>
                      </div>
                      
                      <div className="border rounded-md p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">المنتجات النصف مصنعة</span>
                          <span className="text-purple-600 font-medium">{inventoryStats?.counts?.semiFinished || 0} عنصر</span>
                        </div>
                        <div className="text-lg font-bold">
                          {(inventoryStats?.values?.semiFinished || 0).toLocaleString('ar-EG')} ج.م
                        </div>
                      </div>
                      
                      <div className="border rounded-md p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">مستلزمات التعبئة</span>
                          <span className="text-green-600 font-medium">{inventoryStats?.counts?.packaging || 0} عنصر</span>
                        </div>
                        <div className="text-lg font-bold">
                          {(inventoryStats?.values?.packaging || 0).toLocaleString('ar-EG')} ج.م
                        </div>
                      </div>
                      
                      <div className="border rounded-md p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">المنتجات النهائية</span>
                          <span className="text-amber-600 font-medium">{inventoryStats?.counts?.finished || 0} عنصر</span>
                        </div>
                        <div className="text-lg font-bold">
                          {(inventoryStats?.values?.finished || 0).toLocaleString('ar-EG')} ج.م
                        </div>
                      </div>
                      
                      <div className="bg-muted rounded-md p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">القيمة الإجمالية</span>
                          <span className="text-primary font-medium">{inventoryStats?.counts?.total || 0} عنصر</span>
                        </div>
                        <div className="text-xl font-bold text-primary">
                          {(inventoryStats?.values?.total || 0).toLocaleString('ar-EG')} ج.م
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>توزيع المخزون</CardTitle>
                  <CardDescription>
                    توزيع قيمة المخزون حسب نوع العناصر
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InventoryDistribution data={distributionData} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="production" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>تحليل الإنتاج</CardTitle>
                <CardDescription>
                  إحصائيات الإنتاج على مدار الأشهر
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ProductionChart />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default Analytics;
