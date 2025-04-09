
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import UsageChartContent from './ChartComponents/UsageChartContent';
import { enhancedToast } from '@/components/ui/enhanced-toast';

interface InventoryUsageChartProps {
  itemId: string;
  itemType: string;
  timeRange: string;
  itemName: string;
}

interface UsageData {
  category: string;
  usage_amount: number;
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
        
        // Set up start date based on time range
        let startDate = new Date();
        switch (timeRange) {
          case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          default:
            startDate.setMonth(startDate.getMonth() - 1);
        }
        
        // Query inventory_movements table to get outgoing movements with their reasons
        const { data: movementData, error: movementError } = await supabase
          .from('inventory_movements')
          .select('reason, quantity')
          .eq('item_id', itemId)
          .eq('item_type', itemType)
          .lt('quantity', 0) // Only outgoing movements
          .gte('created_at', startDate.toISOString());

        if (movementError) {
          console.error("Error fetching inventory usage data:", movementError);
          throw movementError;
        }
        
        // Process the movement data to get usage by category
        const usageByCategory: Record<string, number> = {};
        
        (movementData || []).forEach(movement => {
          const category = movement.reason || 'أخرى';
          const amount = Math.abs(movement.quantity);
          
          if (usageByCategory[category]) {
            usageByCategory[category] += amount;
          } else {
            usageByCategory[category] = amount;
          }
        });
        
        // Convert to array format
        const usageData = Object.entries(usageByCategory).map(([category, amount]) => ({
          category,
          usage_amount: amount
        }));
        
        // Sort by usage amount (descending)
        usageData.sort((a, b) => b.usage_amount - a.usage_amount);
        
        console.log("Processed usage data:", usageData);
        
        // If no data, add at least one dummy category
        if (usageData.length === 0) {
          usageData.push({ category: 'لا يوجد استهلاك', usage_amount: 0 });
        }
        
        return usageData;
      } catch (err) {
        console.error("Failed to fetch inventory usage data:", err);
        enhancedToast.error("حدث خطأ أثناء جلب بيانات استهلاك المخزون");
        
        // Return a fallback with a clear message
        return [{ category: 'خطأ في البيانات', usage_amount: 0 }] as UsageData[];
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
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>توزيع الاستهلاك</CardTitle>
          <CardDescription className="text-destructive">
            حدث خطأ أثناء تحميل البيانات
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
  
  // If data array is empty or only has the "no consumption" entry
  if (!data || data.length === 0 || (data.length === 1 && data[0].usage_amount === 0)) {
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
  
  const total = data.reduce((acc, item) => acc + Number(item.usage_amount), 0);
  
  const chartData = data.map(item => ({
    name: item.category,
    value: Number(item.usage_amount),
    percentage: ((Number(item.usage_amount) / total) * 100).toFixed(1)
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
