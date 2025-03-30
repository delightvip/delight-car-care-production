
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InventoryMovement {
  date: string;
  movementIn: number;
  movementOut: number;
  balance: number;
}

interface InventoryMovementChartProps {
  itemId: string;
  itemType: string;
  title?: string;
}

export const InventoryMovementChart: React.FC<InventoryMovementChartProps> = ({ 
  itemId, 
  itemType,
  title = 'حركة المخزون عبر الوقت'
}) => {
  const [chartType, setChartType] = React.useState<'line' | 'bar'>('line');
  const [timeframe, setTimeframe] = React.useState<'day' | 'week' | 'month'>('month');

  // Fetch movement data from the database
  const { data: movements, isLoading, error } = useQuery({
    queryKey: ['inventory-movement-chart', itemType, itemId, timeframe],
    queryFn: async () => {
      // Get inventory movements grouped by date
      const { data, error } = await supabase.rpc('get_inventory_movements_by_time', {
        p_item_id: itemId,
        p_item_type: itemType,
        p_timeframe: timeframe
      });
      
      if (error) throw error;
      
      // Process data for the chart
      const processedData = (data || []).map((item: any) => ({
        date: new Date(item.movement_date).toLocaleDateString('ar-EG'),
        movementIn: item.movement_in || 0,
        movementOut: item.movement_out || 0,
        balance: item.closing_balance || 0
      }));
      
      return processedData as InventoryMovement[];
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
  
  if (error || !movements || movements.length === 0) {
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
  
  const config = {
    movementIn: {
      label: 'وارد',
      color: '#10b981', // green
      theme: { light: '#10b981', dark: '#10b981' }
    },
    movementOut: {
      label: 'صادر',
      color: '#ef4444', // red
      theme: { light: '#ef4444', dark: '#ef4444' }
    },
    balance: {
      label: 'الرصيد',
      color: '#3b82f6', // blue
      theme: { light: '#3b82f6', dark: '#3b82f6' }
    },
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-8">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={chartType} onValueChange={(value) => setChartType(value as 'line' | 'bar')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="نوع الرسم" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">خط بياني</SelectItem>
              <SelectItem value="bar">رسم شريطي</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as 'day' | 'week' | 'month')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="الفترة الزمنية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">يومي</SelectItem>
              <SelectItem value="week">أسبوعي</SelectItem>
              <SelectItem value="month">شهري</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="h-80 pt-4">
        <ChartContainer config={config} className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={movements}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  padding={{ left: 10, right: 10 }} 
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--color-balance)"
                  strokeWidth={2}
                  name={config.balance.label}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="movementIn"
                  stroke="var(--color-movementIn)"
                  strokeWidth={2}
                  name={config.movementIn.label}
                />
                <Line
                  type="monotone"
                  dataKey="movementOut"
                  stroke="var(--color-movementOut)"
                  strokeWidth={2}
                  name={config.movementOut.label}
                />
              </LineChart>
            ) : (
              <BarChart data={movements}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  padding={{ left: 10, right: 10 }} 
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="movementIn"
                  fill="var(--color-movementIn)"
                  name={config.movementIn.label}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="movementOut"
                  fill="var(--color-movementOut)"
                  name={config.movementOut.label}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--color-balance)"
                  strokeWidth={2}
                  name={config.balance.label}
                  dot={{ r: 4 }}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
