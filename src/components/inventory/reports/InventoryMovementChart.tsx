
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import MovementChartContent from './ChartComponents/MovementChartContent';
import MovementChartLoading from './ChartComponents/MovementChartLoading';
import MovementChartError from './ChartComponents/MovementChartError';

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
        
        const { data, error } = await supabase.rpc('get_inventory_movements_by_time', {
          p_item_id: itemId,
          p_item_type: itemType,
          p_period: timeRange
        });

        if (error) {
          console.error("Error fetching inventory movements:", error);
          throw error;
        }
        
        console.log("Received movement data:", data);
        return data as MovementData[];
      } catch (err) {
        console.error("Failed to fetch inventory movements data:", err);
        throw err;
      }
    }
  });
  
  const formatPeriod = (period: string): string => {
    try {
      if (timeRange === 'week' || timeRange === 'day') {
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
  
  if (error || !data) {
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
