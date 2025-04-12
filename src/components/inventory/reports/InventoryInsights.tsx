import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface InventoryInsightsProps {
  inventoryType?: string;
  timeRange?: string;
}

interface InsightData {
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  icon: React.ReactNode;
}

export const InventoryInsights: React.FC<InventoryInsightsProps> = ({
  inventoryType = 'all',
  timeRange = 'month'
}) => {
  const { data: insights, isLoading } = useQuery({
    queryKey: ['inventory-insights', inventoryType, timeRange],
    queryFn: async () => {
      // في التطبيق الحقيقي، هنا سنقوم بإجراء استعلامات متقدمة لتحليل بيانات المخزون
      // والحصول على الملاحظات والاتجاهات
      // لكن في هذا المثال، سنقوم بإنشاء بعض الملاحظات التوضيحية
      
      try {
        // استعلام لمعرفة المواد الأكثر استهلاكاً
        const topConsumed = await supabase
          .from('inventory_movements')
          .select('item_id, item_type, quantity')
          .eq('item_type', inventoryType === 'all' ? 'raw' : inventoryType)
          .lt('quantity', 0)
          .order('quantity', { ascending: true })
          .limit(1);
            // استعلام للأصناف منخفضة المخزون
        let lowStockItems: { name: string, quantity: number }[] = [];
        
        if (inventoryType === 'all' || inventoryType === 'raw') {
          const { data: rawData } = await supabase
            .from('raw_materials')
            .select('code, quantity')
            .lt('quantity', 10)
            .gt('quantity', 0)
            .limit(5);
            
          if (rawData) {
            lowStockItems = [...lowStockItems, ...rawData.map(item => ({ 
              name: item.code, 
              quantity: item.quantity 
            }))];
          }
        }
        
        if (inventoryType === 'all' || inventoryType === 'packaging') {
          const { data: packagingData } = await supabase
            .from('packaging_materials')
            .select('code, quantity')
            .lt('quantity', 10)
            .gt('quantity', 0)
            .limit(5);
            
          if (packagingData) {
            lowStockItems = [...lowStockItems, ...packagingData.map(item => ({ 
              name: item.code, 
              quantity: item.quantity 
            }))];
          }
        }
        
        if (inventoryType === 'all' || inventoryType === 'semi') {
          const { data: semiFinishedData } = await supabase
            .from('semi_finished_products')
            .select('code, quantity')
            .lt('quantity', 10)
            .gt('quantity', 0)
            .limit(5);
            
          if (semiFinishedData) {
            lowStockItems = [...lowStockItems, ...semiFinishedData.map(item => ({ 
              name: item.code, 
              quantity: item.quantity 
            }))];
          }
        }
        
        if (inventoryType === 'all' || inventoryType === 'finished') {
          const { data: finishedData } = await supabase
            .from('finished_products')
            .select('code, quantity')
            .lt('quantity', 10)
            .gt('quantity', 0)
            .limit(5);
            
          if (finishedData) {
            lowStockItems = [...lowStockItems, ...finishedData.map(item => ({ 
              name: item.code, 
              quantity: item.quantity 
            }))];
          }
        }
        
        // اتجاهات التغير في المخزون
        const inventoryTrend = await supabase
          .from('inventory_movements')
          .select('quantity')
          .eq('item_type', inventoryType === 'all' ? 'raw' : inventoryType)
          .order('created_at', { ascending: false })
          .limit(10);
        
        // إنشاء المؤشرات والملاحظات بناء على البيانات
        const insightList: InsightData[] = [];
        
        // تقييم حركة المخزون
        const movementTrend = inventoryTrend.data?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
        if (movementTrend < -50) {
          insightList.push({
            message: `لاحظنا انخفاضًا كبيرًا في المخزون خلال الفترة الأخيرة. قد تحتاج لإعادة تقييم خطة الشراء.`,
            type: 'warning',
            icon: <TrendingDown className="h-5 w-5" />
          });
        } else if (movementTrend > 50) {
          insightList.push({
            message: `هناك زيادة ملحوظة في المخزون خلال الفترة الأخيرة. تحقق من معدلات الاستهلاك.`,
            type: 'info',
            icon: <TrendingUp className="h-5 w-5" />
          });
        }
          // إضافة ملاحظات حول المخزون المنخفض
        if (lowStockItems.length > 0) {
          insightList.push({
            message: `يوجد ${lowStockItems.length} صنف بكميات منخفضة، منها: ${lowStockItems.map(item => item.name).slice(0, 3).join('، ')}${lowStockItems.length > 3 ? ' وغيرها' : ''}`,
            type: 'warning',
            icon: <AlertCircle className="h-5 w-5" />
          });
        }
        
        // إضافة ملاحظات عامة
        insightList.push({
          message: `مؤشر كفاءة المخزون يشير إلى أداء جيد خلال ${getTimeRangeText(timeRange)}. استمر في مراقبة المواد الأكثر استهلاكًا.`,
          type: 'success',
          icon: <Info className="h-5 w-5" />
        });
        
        return insightList;
      } catch (error) {
        console.error("Error fetching inventory insights:", error);
        return [{
          message: "تعذر تحليل بيانات المخزون. يرجى المحاولة مرة أخرى لاحقًا.",
          type: 'error',
          icon: <AlertCircle className="h-5 w-5" />
        }];
      }
    },
    refetchInterval: 300000 // إعادة الاستعلام كل 5 دقائق
  });
  
  // دالة مساعدة للحصول على اسم الجدول بناء على نوع المخزون
  const getTableName = (type: string): string => {
    switch (type) {
      case 'raw': return 'raw_materials';
      case 'semi': return 'semi_finished_products';
      case 'packaging': return 'packaging_materials';
      case 'finished': return 'finished_products';
      default: return 'raw_materials';
    }
  };
  
  // دالة مساعدة للحصول على وصف الفترة الزمنية
  const getTimeRangeText = (range: string): string => {
    switch (range) {
      case 'week': return 'الأسبوع الماضي';
      case 'month': return 'الشهر الماضي';
      case 'quarter': return 'الربع الماضي';
      case 'year': return 'العام الماضي';
      default: return 'الفترة الماضية';
    }
  };
  
  // تحديد لون الخلفية بناء على نوع الملاحظة
  const getBackgroundColor = (type: string): string => {
    switch (type) {
      case 'info': return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'warning': return 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800';
      case 'success': return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'error': return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      default: return 'bg-slate-50 border-slate-200 dark:bg-slate-900/20 dark:border-slate-800';
    }
  };
  
  // تحديد لون النص بناء على نوع الملاحظة
  const getTextColor = (type: string): string => {
    switch (type) {
      case 'info': return 'text-blue-600 dark:text-blue-400';
      case 'warning': return 'text-amber-600 dark:text-amber-400';
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };
  
  // تحديد نص البادج بناء على نوع الملاحظة
  const getBadgeText = (type: string): string => {
    switch (type) {
      case 'info': return 'معلومة';
      case 'warning': return 'تنبيه';
      case 'success': return 'إيجابي';
      case 'error': return 'خطأ';
      default: return 'ملاحظة';
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4 space-y-3">
        <h3 className="text-base font-medium mb-2 flex items-center gap-1">
          <Info className="h-4 w-4" />
          <span>ملاحظات وتحليلات المخزون</span>
        </h3>
        {insights?.map((insight, index) => (
          <div 
            key={index}
            className={`p-3 border rounded-md flex items-start gap-3 ${getBackgroundColor(insight.type)}`}
          >
            <div className={`${getTextColor(insight.type)} mt-0.5`}>
              {insight.icon}
            </div>
            <div className="flex-1">
              <p className={`text-sm ${getTextColor(insight.type)}`}>{insight.message}</p>
            </div>
            <Badge variant="outline" className={getTextColor(insight.type)}>
              {getBadgeText(insight.type)}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default InventoryInsights;
