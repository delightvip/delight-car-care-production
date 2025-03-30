
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InventoryUsageChartProps {
  itemId: string;
  itemType: string;
  period?: 'month' | 'quarter' | 'year';
  title?: string;
}

export const InventoryUsageChart: React.FC<InventoryUsageChartProps> = ({ 
  itemId, 
  itemType,
  period = 'year',
  title = 'معدل استهلاك المخزون' 
}) => {
  const [timePeriod, setTimePeriod] = React.useState<'month' | 'quarter' | 'year'>(period);
  
  const { data: usageData, isLoading, error } = useQuery({
    queryKey: ['inventory-usage', itemType, itemId, timePeriod],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inventory_usage_stats', {
        p_item_id: itemId,
        p_item_type: itemType,
        p_period: timePeriod
      });
      
      if (error) throw error;
      
      return data || [];
    }
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-8">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-8 w-24" />
        </CardHeader>
        <CardContent className="h-80 pt-4">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !usageData || usageData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-60">
          <p className="text-center text-muted-foreground">
            {error ? 'حدث خطأ أثناء تحميل البيانات' : 'لا توجد بيانات كافية لعرض الرسم البياني'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const colorPalette = [
    '#3b82f6', // blue
    '#10b981', // green
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#ef4444', // red
    '#06b6d4', // cyan
  ];
  
  const chartData = usageData.map((item, index) => ({
    label: item.period_label,
    amount: item.usage_amount,
    color: colorPalette[index % colorPalette.length]
  }));
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-8">
        <CardTitle>{title}</CardTitle>
        <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as 'month' | 'quarter' | 'year')}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="الفترة الزمنية" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">شهري</SelectItem>
            <SelectItem value="quarter">ربع سنوي</SelectItem>
            <SelectItem value="year">سنوي</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="h-80 pt-4">
        <ChartContainer config={{}} className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="amount" name="الكمية">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
