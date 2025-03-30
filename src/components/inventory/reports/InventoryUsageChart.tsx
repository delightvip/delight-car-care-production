
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

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

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#6366f1', '#84cc16'];

export const InventoryUsageChart: React.FC<InventoryUsageChartProps> = ({
  itemId,
  itemType,
  timeRange,
  itemName,
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory-usage-chart', itemId, itemType, timeRange],
    queryFn: async () => {
      // Simulate API call for usage data
      // In a real app, this would use the RPC function
      
      // Generate sample categories and usage data
      const categories = [
        'الإنتاج',
        'التالف',
        'البيع المباشر',
        'النقل الداخلي',
        'تجارب الإنتاج',
        'أخرى'
      ];
      
      const sampleData = categories.map(category => ({
        category,
        usage_amount: Math.floor(Math.random() * 100) + 5
      }));
      
      return sampleData;
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
  
  if (error || !data || data.length === 0) {
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
  
  const total = data.reduce((acc, item) => acc + item.usage_amount, 0);
  
  const chartData = data.map(item => ({
    name: item.category,
    value: item.usage_amount,
    percentage: ((item.usage_amount / total) * 100).toFixed(1)
  }));
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return percent > 0.05 ? (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>توزيع استهلاك {itemName}</CardTitle>
        <CardDescription>
          تحليل توزيع استهلاك الصنف حسب أسباب الصرف خلال الفترة المحددة
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, name]}
              contentStyle={{ direction: 'rtl', textAlign: 'right' }}
            />
            <Legend 
              layout="horizontal" 
              verticalAlign="bottom" 
              align="center" 
              formatter={(value, entry, index) => (
                <span style={{ color: 'var(--foreground)', marginRight: 10 }}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default InventoryUsageChart;
