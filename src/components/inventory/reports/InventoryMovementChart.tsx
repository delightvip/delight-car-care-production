
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import MovementChartContent from './ChartComponents/MovementChartContent';
import MovementChartLoading from './ChartComponents/MovementChartLoading';
import MovementChartError from './ChartComponents/MovementChartError';
import { enhancedToast } from '@/components/ui/enhanced-toast';

interface InventoryMovementChartProps {
  itemId: string;
  itemType: string;
  timeRange: string;
  itemName: string;
  itemUnit: string;
}

interface MovementData {
  period: string;
  in_quantity: number;
  out_quantity: number;
  balance: number;
}

export const InventoryMovementChart: React.FC<InventoryMovementChartProps> = ({
  itemId,
  itemType,
  timeRange,
  itemName,
  itemUnit,
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory-movement-chart', itemId, itemType, timeRange],
    queryFn: async () => {
      try {
        console.log(`Fetching movements for item: ${itemId}, type: ${itemType}, range: ${timeRange}`);
        
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
        
        // Using RPC call but with modified approach to handle the error
        const { data, error } = await supabase
          .from('inventory_movements')
          .select('created_at, quantity')
          .eq('item_id', itemId)
          .eq('item_type', itemType)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (error) {
          console.error("Error fetching inventory movements:", error);
          enhancedToast.error("حدث خطأ أثناء جلب بيانات حركة المخزون");
          throw error;
        }
        
        console.log("Received movement data:", data);
        
        if (!data || data.length === 0) {
          // If no data, generate dummy data for display purposes
          const periods = timeRange === 'week' || timeRange === 'month' ? 7 : 6;
          const dummyData = [];
          
          let currentDate = new Date();
          let runningBalance = 0;
          
          for (let i = periods; i >= 0; i--) {
            const period = timeRange === 'week' || timeRange === 'month'
              ? format(currentDate, 'yyyy-MM-dd')
              : format(currentDate, 'yyyy-MM');
              
            const inQty = 0;
            const outQty = 0;
            
            dummyData.push({
              period,
              in_quantity: inQty,
              out_quantity: outQty,
              balance: runningBalance
            });
            
            if (timeRange === 'week') {
              currentDate.setDate(currentDate.getDate() - 1);
            } else if (timeRange === 'month') {
              currentDate.setDate(currentDate.getDate() - 4);
            } else {
              currentDate.setMonth(currentDate.getMonth() - 1);
            }
          }
          
          return dummyData.reverse();
        }
        
        // Process the data manually instead of using the RPC function
        // Group by period (date)
        const groupedData: Record<string, { in_qty: number; out_qty: number }> = {};
        
        // Format the date based on the time range
        data.forEach(movement => {
          const date = new Date(movement.created_at);
          const period = timeRange === 'week' || timeRange === 'month'
            ? format(date, 'yyyy-MM-dd')
            : format(date, 'yyyy-MM');
          
          if (!groupedData[period]) {
            groupedData[period] = { in_qty: 0, out_qty: 0 };
          }
          
          // Categorize as in or out based on quantity
          if (movement.quantity > 0) {
            groupedData[period].in_qty += Number(movement.quantity);
          } else if (movement.quantity < 0) {
            groupedData[period].out_qty += Math.abs(Number(movement.quantity));
          }
        });
        
        // Convert to array and calculate running balance
        const result: MovementData[] = [];
        let runningBalance = 0;
        
        Object.entries(groupedData)
          .sort(([a], [b]) => a.localeCompare(b)) // Sort by date
          .forEach(([period, values]) => {
            runningBalance += values.in_qty - values.out_qty;
            result.push({
              period,
              in_quantity: values.in_qty,
              out_quantity: values.out_qty,
              balance: runningBalance
            });
          });
        
        return result;
      } catch (err) {
        console.error("Failed to fetch inventory movements data:", err);
        throw err;
      }
    }
  });
  
  const formatPeriod = (period: string): string => {
    try {
      if (timeRange === 'week' || timeRange === 'month') {
        // If format is yyyy-MM-dd
        const date = new Date(period);
        return format(date, 'dd MMM', { locale: ar });
      } else {
        // If format is yyyy-MM
        const [year, month] = period.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return format(date, 'MMM yyyy', { locale: ar });
      }
    } catch (error) {
      console.warn("Error formatting period:", error);
      return period;
    }
  };
  
  const chartData = data?.map(item => ({
    period: item.period,
    periodFormatted: formatPeriod(item.period),
    in: Number(item.in_quantity),
    out: Number(item.out_quantity),
    balance: Number(item.balance)
  })) || [];
  
  if (isLoading) {
    return <MovementChartLoading />;
  }
  
  if (error) {
    const errorMessage = error ? `${(error as Error).message}` : "تعذر تحميل البيانات";
    return <MovementChartError message={errorMessage} />;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>حركة المخزون - {itemName}</CardTitle>
        <CardDescription>
          تحليل حركة الوارد والمنصرف والرصيد خلال الفترة المحددة
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[350px] w-full">
          <MovementChartContent chartData={chartData} itemUnit={itemUnit} />
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryMovementChart;
