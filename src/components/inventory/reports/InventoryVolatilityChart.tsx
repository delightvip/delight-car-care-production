
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Percent } from 'lucide-react';

interface InventoryVolatilityChartProps {
  itemId: string;
  itemType: string;
  timeRange: string;
  itemName: string;
  itemUnit: string;
}

interface VolatilityData {
  period: string;
  start_balance: number;
  end_balance: number;
  change_amount: number;
  change_percentage: number;
}

const InventoryVolatilityChart: React.FC<InventoryVolatilityChartProps> = ({
  itemId,
  itemType,
  timeRange,
  itemName,
  itemUnit
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory-volatility', itemId, itemType, timeRange],
    queryFn: async () => {
      try {
        console.log(`Fetching volatility data for item: ${itemId}, type: ${itemType}, range: ${timeRange}`);
        
        // تحديد عدد الفترات الزمنية حسب النطاق المطلوب
        const periodsCount = timeRange === 'week' ? 8 : 
                             timeRange === 'month' ? 6 : 
                             timeRange === 'quarter' ? 4 : 
                             timeRange === 'year' ? 3 : 6;
        
        const { data, error } = await supabase.rpc('get_inventory_volatility', {
          p_item_id: itemId,
          p_item_type: itemType,
          p_period: timeRange,
          p_periods_count: periodsCount
        });

        if (error) {
          console.error("Error fetching inventory volatility data:", error);
          throw error;
        }
        
        console.log("Received volatility data:", data);
        return data as VolatilityData[];
      } catch (err) {
        console.error("Failed to fetch inventory volatility data:", err);
        throw err;
      }
    }
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تقلبات المخزون</CardTitle>
          <CardDescription>جاري تحميل البيانات...</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تقلبات المخزون</CardTitle>
          <CardDescription className="text-destructive">
            {error ? 'حدث خطأ أثناء تحميل البيانات' : 'لا توجد بيانات كافية لعرض تقلبات المخزون'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center text-muted-foreground">
            لا توجد بيانات كافية عن تقلبات هذا الصنف خلال الفترة المحددة
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // تهيئة البيانات للرسم البياني
  const chartData = data.map(item => ({
    ...item,
    formattedPercentage: `${item.change_percentage > 0 ? '+' : ''}${item.change_percentage.toFixed(2)}%`,
    color: item.change_percentage > 0 ? '#22c55e' : (item.change_percentage < 0 ? '#ef4444' : '#3b82f6')
  }));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          تقلبات مخزون {itemName}
          <span className="text-lg text-muted-foreground">
            {chartData.length > 0 && chartData[chartData.length - 1].change_percentage > 0 ? (
              <TrendingUp className="inline ml-2 text-green-500" size={20} />
            ) : (
              <TrendingDown className="inline ml-2 text-red-500" size={20} />
            )}
          </span>
        </CardTitle>
        <CardDescription>
          تحليل نسب التغير في الرصيد خلال الفترات الزمنية السابقة
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis tickFormatter={(value) => `${value}%`} domain={['auto', 'auto']} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'change_percentage') {
                  return [`${value}%`, 'نسبة التغير'];
                }
                if (name === 'start_balance') {
                  return [`${value} ${itemUnit}`, 'الرصيد الأول'];
                }
                if (name === 'end_balance') {
                  return [`${value} ${itemUnit}`, 'الرصيد الأخير'];
                }
                return [value, name];
              }}
              labelFormatter={(label) => `الفترة: ${label}`}
            />
            <Legend 
              verticalAlign="bottom"
              formatter={(value) => {
                if (value === 'change_percentage') return 'نسبة التغير';
                if (value === 'start_balance') return 'الرصيد الأول';
                if (value === 'end_balance') return 'الرصيد الأخير';
                return value;
              }}
            />
            <ReferenceLine y={0} stroke="#000" />
            <Bar 
              dataKey="change_percentage" 
              name="change_percentage"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
            <Bar 
              dataKey="start_balance" 
              name="start_balance"
              fill="#3b82f6" 
              style={{ opacity: 0.2 }}
              hide
            />
            <Bar 
              dataKey="end_balance" 
              name="end_balance"
              fill="#8b5cf6" 
              style={{ opacity: 0.2 }}
              hide
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default InventoryVolatilityChart;
