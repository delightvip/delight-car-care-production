
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { rpcFunctions } from '@/integrations/supabase/client';
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
  Cell
} from 'recharts';
import { Package } from 'lucide-react';

interface MostActiveItemsChartProps {
  timeRange: string;
  limit?: number;
}

export interface ActiveItemData {
  item_id: string;
  item_type: string;
  item_name: string;
  total_movements: number;
  total_in: number;
  total_out: number;
  current_quantity: number;
}

const getItemTypeColor = (type: string) => {
  switch (type) {
    case 'raw':
      return '#3b82f6'; // آزرق
    case 'semi':
      return '#8b5cf6'; // بنفسجي
    case 'packaging':
      return '#f59e0b'; // برتقالي
    case 'finished':
      return '#10b981'; // أخضر
    default:
      return '#64748b'; // رمادي
  }
};

const getItemTypeName = (type: string) => {
  switch (type) {
    case 'raw':
      return 'مواد خام';
    case 'semi':
      return 'نصف مصنعة';
    case 'packaging':
      return 'مواد تعبئة';
    case 'finished':
      return 'منتجات نهائية';
    default:
      return 'غير معروف';
  }
};

const MostActiveItemsChart: React.FC<MostActiveItemsChartProps> = ({
  timeRange,
  limit = 10
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['most-active-items', timeRange, limit],
    queryFn: async () => {
      try {
        console.log(`Fetching most active items for range: ${timeRange}, limit: ${limit}`);
        
        const { data, error } = await rpcFunctions.getMostActiveInventoryItems(limit, timeRange);

        if (error) {
          console.error("Error fetching most active items:", error);
          throw error;
        }
        
        console.log("Received most active items data:", data);
        return data as ActiveItemData[];
      } catch (err) {
        console.error("Failed to fetch most active items data:", err);
        throw err;
      }
    }
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>الأصناف الأكثر حركة</CardTitle>
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
          <CardTitle>الأصناف الأكثر حركة</CardTitle>
          <CardDescription className="text-destructive">
            {error ? 'حدث خطأ أثناء تحميل البيانات' : 'لا توجد بيانات كافية لعرض الأصناف الأكثر حركة'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center text-muted-foreground">
            لا توجد بيانات كافية عن حركات المخزون خلال الفترة المحددة
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // تهيئة البيانات للرسم البياني
  const chartData = data.map(item => ({
    ...item,
    itemDisplayName: item.item_name.length > 15 ? `${item.item_name.substring(0, 15)}...` : item.item_name,
    typeName: getItemTypeName(item.item_type)
  }));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package size={20} className="text-primary" />
          الأصناف الأكثر حركة في المخزون
        </CardTitle>
        <CardDescription>
          ترتيب الأصناف حسب عدد الحركات خلال الفترة المحددة
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 20,
              right: 30,
              left: 100,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="itemDisplayName" 
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'total_movements') {
                  return [value, 'عدد الحركات'];
                }
                if (name === 'total_in') {
                  return [value, 'إجمالي الوارد'];
                }
                if (name === 'total_out') {
                  return [value, 'إجمالي المنصرف'];
                }
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  const item = payload[0].payload;
                  return `${item.item_name} (${item.typeName})`;
                }
                return label;
              }}
            />
            <Legend 
              formatter={(value) => {
                if (value === 'total_movements') return 'عدد الحركات';
                if (value === 'total_in') return 'إجمالي الوارد';
                if (value === 'total_out') return 'إجمالي المنصرف';
                return value;
              }}
            />
            <Bar 
              dataKey="total_movements" 
              name="total_movements"
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getItemTypeColor(entry.item_type)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default MostActiveItemsChart;
