
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingDown, TrendingUp, Clock, Activity } from 'lucide-react';
import { calculateRemainingDays, calculateConfidenceLevel } from '@/utils/inventoryAnalytics';

interface InventoryForecastProps {
  inventoryType?: string;
  selectedItems?: string[];
  timeRange?: string;
}

const InventoryForecast: React.FC<InventoryForecastProps> = ({
  inventoryType = 'all',
  selectedItems = [],
  timeRange = 'month'
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-forecast', inventoryType, JSON.stringify(selectedItems), timeRange],
    queryFn: async () => {
      try {
        // الحصول على حركات المخزون للتحليل
        const { data: movementsData, error: movementsError } = await supabase
          .from('inventory_movements')
          .select('*')
          .in('item_type', inventoryType === 'all' ? ['raw', 'packaging', 'semi', 'finished'] : [inventoryType])
          .order('created_at', { ascending: false })
          .limit(500);
        
        if (movementsError) throw movementsError;
        
        // الحصول على بيانات المخزون الحالية
        let inventoryItems: any[] = [];
        
        if (inventoryType === 'all' || inventoryType === 'raw') {
          const { data: rawMaterials } = await supabase
            .from('raw_materials')
            .select('id, code, name, quantity, min_stock, unit, unit_cost')
            .in('id', selectedItems.length > 0 ? selectedItems.map(id => parseInt(id)) : selectedItems);
          
          if (rawMaterials) {
            inventoryItems = [...inventoryItems, ...rawMaterials.map(item => ({ ...item, type: 'raw' }))];
          }
        }
        
        if (inventoryType === 'all' || inventoryType === 'packaging') {
          const { data: packagingMaterials } = await supabase
            .from('packaging_materials')
            .select('id, code, name, quantity, min_stock, unit, unit_cost')
            .in('id', selectedItems.length > 0 ? selectedItems.map(id => parseInt(id)) : selectedItems);
          
          if (packagingMaterials) {
            inventoryItems = [...inventoryItems, ...packagingMaterials.map(item => ({ ...item, type: 'packaging' }))];
          }
        }
        
        if (inventoryType === 'all' || inventoryType === 'semi') {
          const { data: semiFinishedProducts } = await supabase
            .from('semi_finished_products')
            .select('id, code, name, quantity, min_stock, unit, unit_cost')
            .in('id', selectedItems.length > 0 ? selectedItems.map(id => parseInt(id)) : selectedItems);
          
          if (semiFinishedProducts) {
            inventoryItems = [...inventoryItems, ...semiFinishedProducts.map(item => ({ ...item, type: 'semi' }))];
          }
        }
        
        if (inventoryType === 'all' || inventoryType === 'finished') {
          const { data: finishedProducts } = await supabase
            .from('finished_products')
            .select('id, code, name, quantity, min_stock, unit, unit_cost')
            .in('id', selectedItems.length > 0 ? selectedItems.map(id => parseInt(id)) : selectedItems);
          
          if (finishedProducts) {
            inventoryItems = [...inventoryItems, ...finishedProducts.map(item => ({ ...item, type: 'finished' }))];
          }
        }
        
        // حساب معدل الاستهلاك ومؤشرات التنبؤ لكل عنصر
        const forecastData = inventoryItems.map(item => {
          // استخراج حركات المخزون لهذا العنصر
          const itemMovements = movementsData?.filter(m => 
            m.item_id === item.id.toString() && m.item_type === item.type) || [];
          
          // حساب معدل الاستهلاك اليومي (المعدل المتحرك المرجح)
          const consumptionRates = calculateConsumptionRates(itemMovements, timeRange);
          
          // حساب الأيام المتبقية حتى نفاد المخزون
          const daysRemaining = calculateRemainingDays(item.quantity, consumptionRates.dailyRate);
          
          // تحديد مستوى الثقة في التنبؤ
          const confidenceLevel = calculateConfidenceLevel(itemMovements.length, consumptionRates.variability);
          
          return {
            id: item.id,
            code: item.code,
            name: item.name,
            type: item.type,
            currentStock: item.quantity,
            minStock: item.min_stock,
            unit: item.unit,
            unitCost: item.unit_cost,
            consumptionRate: consumptionRates.dailyRate,
            daysRemaining: daysRemaining,
            confidence: confidenceLevel,
            trend: consumptionRates.trend,
            needsRestock: daysRemaining < 14 && item.quantity > 0, // إعادة التخزين إذا كان المخزون سينفد خلال أسبوعين
            criticalLevel: daysRemaining <= 7 && item.quantity > 0, // مستوى حرج إذا كان سينفد خلال أسبوع
            outOfStock: item.quantity <= 0
          };
        });
        
        // ترتيب العناصر حسب الأولوية (انتهاء المخزون قريبًا)
        return forecastData.sort((a, b) => {
          if (a.outOfStock && !b.outOfStock) return 1;
          if (!a.outOfStock && b.outOfStock) return -1;
          if (a.criticalLevel && !b.criticalLevel) return -1;
          if (!a.criticalLevel && b.criticalLevel) return 1;
          return a.daysRemaining - b.daysRemaining;
        });
      } catch (error) {
        console.error("Error fetching inventory forecast data:", error);
        return [];
      }
    },
    refetchInterval: 600000 // إعادة الاستعلام كل 10 دقائق
  });
  
  // استخراج العناصر التي تحتاج إلى إعادة تخزين
  const itemsNeedingRestock = useMemo(() => {
    return data?.filter(item => item.needsRestock || item.outOfStock) || [];
  }, [data]);
  
  // حساب معدل الاستهلاك المتحرك المرجح
  const calculateConsumptionRates = (movements: any[], timeRange: string) => {
    // استخراج حركات السحب (الاستهلاك) فقط
    const consumptionMovements = movements
      .filter(m => m.quantity < 0)
      .map(m => ({
        ...m,
        quantity: Math.abs(m.quantity),
        date: new Date(m.created_at)
      }));
    
    if (consumptionMovements.length === 0) {
      return { dailyRate: 0, variability: 0, trend: 'flat' };
    }
    
    // تحديد فترة البيانات المستخدمة في التحليل
    const maxDays = timeRange === 'week' ? 7 : 
                    timeRange === 'month' ? 30 : 
                    timeRange === 'quarter' ? 90 : 365;
    
    // حساب الفترة الزمنية التي تغطيها البيانات
    const now = new Date();
    const oldestDate = consumptionMovements.reduce(
      (oldest, current) => current.date < oldest ? current.date : oldest, 
      now
    );
    
    const daysCovered = Math.min(
      Math.ceil((now.getTime() - oldestDate.getTime()) / (24 * 60 * 60 * 1000)), 
      maxDays
    );
    
    // حساب إجمالي الاستهلاك مع الترجيح للبيانات الأحدث
    let totalWeightedConsumption = 0;
    let totalWeight = 0;
    
    consumptionMovements.forEach(movement => {
      // الحركات الأقدم لها وزن أقل
      const daysAgo = Math.ceil((now.getTime() - movement.date.getTime()) / (24 * 60 * 60 * 1000));
      
      // تجاهل الحركات الأقدم من فترة التحليل
      if (daysAgo <= maxDays) {
        // معادلة الترجيح: وزن أكبر للبيانات الأحدث
        const weight = Math.max(0, (maxDays - daysAgo) / maxDays);
        totalWeightedConsumption += movement.quantity * weight;
        totalWeight += weight;
      }
    });
    
    // حساب متوسط الاستهلاك اليومي المرجح
    const weightedAvgConsumption = totalWeight > 0 ? totalWeightedConsumption / totalWeight : 0;
    const dailyRate = weightedAvgConsumption / daysCovered;
    
    // حساب تباين معدل الاستهلاك (للثقة في التنبؤ)
    const consumptionVariability = calculateConsumptionVariability(consumptionMovements, dailyRate);
    
    // تحديد اتجاه الاستهلاك (متزايد أم متناقص)
    const trend = determineTrend(consumptionMovements);
    
    return { 
      dailyRate: dailyRate,
      variability: consumptionVariability,
      trend: trend
    };
  };
  
  // حساب تباين معدل الاستهلاك
  const calculateConsumptionVariability = (movements: any[], avgDailyRate: number) => {
    if (movements.length < 2 || avgDailyRate === 0) return 0;
    
    // إعداد البيانات اليومية
    const consumptionByDay: Record<string, number> = {};
    
    movements.forEach(m => {
      const dateStr = m.date.toISOString().split('T')[0];
      consumptionByDay[dateStr] = (consumptionByDay[dateStr] || 0) + m.quantity;
    });
    
    // حساب الانحراف المعياري
    const dailyRates = Object.values(consumptionByDay);
    const meanRate = dailyRates.reduce((sum, rate) => sum + rate, 0) / dailyRates.length;
    
    const variance = dailyRates.reduce((sum, rate) => sum + Math.pow(rate - meanRate, 2), 0) / dailyRates.length;
    const stdDev = Math.sqrt(variance);
    
    // معامل الاختلاف = الانحراف المعياري / المتوسط
    return meanRate > 0 ? stdDev / meanRate : 0;
  };
  
  // تحديد اتجاه الاستهلاك (متزايد، متناقص، ثابت)
  const determineTrend = (movements: any[]) => {
    if (movements.length < 5) return 'flat';
    
    // ترتيب الحركات حسب التاريخ
    const sortedMovements = [...movements].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // تقسيم البيانات إلى نصفين (فترة سابقة وفترة حالية)
    const midpoint = Math.floor(sortedMovements.length / 2);
    const olderMovements = sortedMovements.slice(0, midpoint);
    const newerMovements = sortedMovements.slice(midpoint);
    
    // حساب متوسط الاستهلاك في كل فترة
    const olderTotal = olderMovements.reduce((sum, m) => sum + m.quantity, 0);
    const newerTotal = newerMovements.reduce((sum, m) => sum + m.quantity, 0);
    
    const olderAvg = olderTotal / olderMovements.length;
    const newerAvg = newerTotal / newerMovements.length;
    
    // تحديد الاتجاه بناءً على نسبة التغير
    const changeRate = (newerAvg - olderAvg) / olderAvg;
    
    if (changeRate > 0.1) return 'increasing';
    if (changeRate < -0.1) return 'decreasing';
    return 'flat';
  };
  
  // تحديد مستوى الإلحاح للتنبيه
  const getAlertLevel = (item: any) => {
    if (item.outOfStock) return 'error';
    if (item.criticalLevel) return 'warning';
    if (item.needsRestock) return 'info';
    return 'success';
  };
  
  // تحديد نص التنبيه المناسب
  const getAlertText = (item: any) => {
    if (item.outOfStock) {
      return 'نفاد المخزون';
    }
    if (item.criticalLevel) {
      return `مستوى حرج (${Math.round(item.daysRemaining)} يوم)`;
    }
    if (item.needsRestock) {
      return `يحتاج تجديد (${Math.round(item.daysRemaining)} يوم)`;
    }
    return `مستوى آمن (${Math.round(item.daysRemaining)} يوم)`;
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تحليل وتنبؤات المخزون</CardTitle>
          <CardDescription>توقعات استهلاك المخزون وتنبيهات إعادة التخزين</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <span>تحليل وتنبؤات المخزون</span>
        </CardTitle>
        <CardDescription>
          توقعات استهلاك المخزون وتنبيهات إعادة التخزين بناءً على تحليل معدلات الاستهلاك المرجحة
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-base font-medium mb-2">
                {itemsNeedingRestock.length > 0 ? (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    يوجد {itemsNeedingRestock.length} عنصر يحتاج إلى إعادة تخزين
                  </span>
                ) : (
                  <span className="text-green-600">مستويات المخزون جيدة</span>
                )}
              </h3>
            </div>
            
            <div className="space-y-3">
              {data.slice(0, 6).map((item) => (
                <div 
                  key={`${item.type}-${item.id}`}
                  className={`border rounded-md p-3 ${
                    item.outOfStock ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                    item.criticalLevel ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' :
                    item.needsRestock ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' :
                    'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{item.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.code}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>المخزون الحالي: {item.currentStock} {item.unit}</span>
                        <span className="text-xs">•</span>
                        <span>الحد الأدنى: {item.minStock} {item.unit}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <Badge 
                            variant={
                              item.outOfStock ? "destructive" : 
                              item.criticalLevel ? "outline" : 
                              item.needsRestock ? "secondary" : 
                              "outline"
                            }
                            className={
                              item.outOfStock ? "border-red-200 text-red-600" : 
                              item.criticalLevel ? "border-amber-200 text-amber-600" : 
                              item.needsRestock ? "border-blue-200 text-blue-600" : 
                              "border-green-200 text-green-600"
                            }
                          >
                            {getAlertText(item)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {item.outOfStock ? 'نفاد المخزون' : `معدل الاستهلاك: ${item.consumptionRate.toFixed(2)} / يوم`}
                          </Badge>
                          
                          {item.trend === 'increasing' ? (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              اتجاه متزايد
                            </Badge>
                          ) : item.trend === 'decreasing' ? (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              اتجاه متناقص
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {data.length > 6 && (
                <div className="text-center text-sm text-muted-foreground mt-2">
                  تم عرض 6 عناصر من أصل {data.length}
                </div>
              )}
              
              {data.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  لا توجد بيانات كافية للتنبؤ
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-6">
            لا توجد بيانات كافية للتحليل. يرجى التأكد من وجود بيانات حركة المخزون.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryForecast;
