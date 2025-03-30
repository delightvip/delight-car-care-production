
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Line } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ar } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

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
      // Instead of using RPC, we'll simulate the data for now
      // In a real app, this would use the RPC function
      
      // Simulate API call to get data for the chart
      const currentDate = new Date();
      const startDate = new Date();
      
      const periods = timeRange === 'week' ? 7 : 
                     timeRange === 'month' ? 30 : 
                     timeRange === 'quarter' ? 12 : 12;
                     
      // Generate sample data for the chart
      const sampleData = Array.from({ length: periods }).map((_, index) => {
        let date: Date;
        let periodFormat: string;
        
        if (timeRange === 'week') {
          date = new Date(currentDate);
          date.setDate(date.getDate() - (periods - index - 1));
          periodFormat = 'yyyy-MM-dd';
        } else if (timeRange === 'month') {
          date = new Date(currentDate);
          date.setDate(date.getDate() - (periods - index - 1));
          periodFormat = 'yyyy-MM-dd';
        } else if (timeRange === 'quarter') {
          date = new Date(currentDate);
          date.setDate(1);
          date.setMonth(date.getMonth() - (periods - index - 1));
          periodFormat = 'yyyy-MM';
        } else {
          date = new Date(currentDate);
          date.setDate(1);
          date.setMonth(date.getMonth() - (periods - index - 1));
          periodFormat = 'yyyy-MM';
        }
        
        // Generate random data
        const inQuantity = Math.floor(Math.random() * 50);
        const outQuantity = Math.floor(Math.random() * 30);
        
        return {
          period: format(date, periodFormat),
          in_quantity: inQuantity,
          out_quantity: outQuantity,
          balance: (index > 0 ? (sampleData[index - 1]?.balance || 100) : 100) + inQuantity - outQuantity
        };
      });
      
      return sampleData;
    }
  });
  
  const formatPeriod = (period: string): string => {
    // Format the period based on the timeRange
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
      return period;
    }
  };
  
  const chartData = data?.map(item => ({
    period: item.period,
    periodFormatted: formatPeriod(item.period),
    in: item.in_quantity,
    out: item.out_quantity,
    balance: item.balance
  })) || [];
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>حركة المخزون</CardTitle>
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
          <CardTitle>حركة المخزون</CardTitle>
          <CardDescription className="text-destructive">حدث خطأ أثناء تحميل البيانات</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center text-muted-foreground">
            تعذر تحميل البيانات. يرجى المحاولة مرة أخرى.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const seriesConfig = {
    in: { 
      label: "الوارد", 
      theme: { light: "#22c55e", dark: "#22c55e" } 
    },
    out: { 
      label: "المنصرف", 
      theme: { light: "#ef4444", dark: "#ef4444" } 
    },
    balance: { 
      label: "الرصيد", 
      theme: { light: "#3b82f6", dark: "#60a5fa" } 
    }
  };
  
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
          <ChartContainer
            data={chartData}
            xAxisKey="periodFormatted"
            series={[
              { key: "in", label: "الوارد", type: "bar", color: "#22c55e" },
              { key: "out", label: "المنصرف", type: "bar", color: "#ef4444" },
              { key: "balance", label: "الرصيد", type: "line", color: "#3b82f6" }
            ]}
            strategy="discreet"
            tooltip={(data) => {
              if (!data?.payload?.[0]?.payload) return null;
              const payload = data.payload[0].payload;
              
              return (
                <ChartTooltip>
                  <ChartTooltipContent>
                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-muted-foreground">{payload.periodFormatted}</div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <div>الوارد: {payload.in} {itemUnit}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                        <div>المنصرف: {payload.out} {itemUnit}</div>
                      </div>
                      <div className="flex items-center gap-2 font-medium">
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        <div>الرصيد: {payload.balance} {itemUnit}</div>
                      </div>
                    </div>
                  </ChartTooltipContent>
                </ChartTooltip>
              );
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryMovementChart;
