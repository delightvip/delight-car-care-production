
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { rpcFunctions } from '@/integrations/supabase/client';
import UsageChartContent from './ChartComponents/UsageChartContent';

interface InventoryUsageChartProps {
  itemId: string;
  itemType: string;
  timeRange: string;
  itemName: string;
}

export interface UsageData {
  reason: string;
  quantity: number;
  percentage: number;
}

export const InventoryUsageChart: React.FC<InventoryUsageChartProps> = ({
  itemId,
  itemType,
  timeRange,
  itemName,
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory-usage-chart', itemId, itemType, timeRange],
    queryFn: async () => {
      try {
        console.log(`Fetching usage data for item: ${itemId}, type: ${itemType}, range: ${timeRange}`);
        
        const { data, error } = await rpcFunctions.getInventoryUsageDistribution(itemId, itemType, timeRange);

        if (error) {
          console.error("Error fetching inventory usage stats:", error);
          throw error;
        }
        
        console.log("Received usage data:", data);
        return data as UsageData[];
      } catch (err) {
        console.error("Failed to fetch inventory usage data:", err);
        throw err;
      }
    }
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>توزيع الاستهلاك</CardTitle>
          <CardDescription>جاري تحميل البيانات...</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>توزيع الاستهلاك</CardTitle>
          <CardDescription className="text-destructive">
            {error ? 'حدث خطأ أثناء تحميل البيانات' : 'لا توجد بيانات للعرض'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center text-muted-foreground">
            لا توجد بيانات عن استهلاك هذا الصنف خلال الفترة المحددة
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // إذا كانت مصفوفة البيانات فارغة، نعرض حالة فارغة
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>توزيع استهلاك {itemName}</CardTitle>
          <CardDescription>
            تحليل توزيع استهلاك الصنف حسب أسباب الصرف
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center text-muted-foreground">
            لا توجد بيانات عن استهلاك هذا الصنف خلال الفترة المحددة
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // تحويل البيانات إلى الشكل المطلوب لمكون الرسم البياني
  const chartData = data.map(item => ({
    name: item.reason,
    value: Number(item.quantity),
    percentage: `${item.percentage.toFixed(1)}%`
  }));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>توزيع استهلاك {itemName}</CardTitle>
        <CardDescription>
          تحليل توزيع استهلاك الصنف حسب أسباب الصرف خلال الفترة المحددة
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 h-[350px]">
        <UsageChartContent chartData={chartData} />
      </CardContent>
    </Card>
  );
};

export default InventoryUsageChart;
