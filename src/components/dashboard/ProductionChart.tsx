
import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import LoadingIndicator from '../ui/LoadingIndicator';
import EmptyState from '../ui/EmptyState';

interface ProductionChartProps {
  data?: {
    month: string; 
    production?: number;
    packaging?: number;
    production_count?: number;
    packaging_count?: number;
  }[];
}

const ProductionChart: React.FC<ProductionChartProps> = ({ data: propData }) => {
  const { data: fetchedData, isLoading, error } = useQuery({
    queryKey: ['monthlyProductionStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_production_stats');
      
      if (error) throw new Error(error.message);
      
      return data;
    },
    refetchInterval: 60000 // Refresh every minute
  });
  
  const chartData = propData || fetchedData || [];
  
  if (isLoading && !propData) {
    return <LoadingIndicator className="h-60" />;
  }
  
  if (error && !propData) {
    return (
      <EmptyState 
        title="تعذر تحميل البيانات" 
        description="حدث خطأ أثناء تحميل بيانات الإنتاج." 
      />
    );
  }
  
  if (chartData.length === 0) {
    return (
      <EmptyState 
        title="لا توجد بيانات" 
        description="لا توجد بيانات إنتاج متاحة حالياً." 
      />
    );
  }
  
  // Map the data to ensure we have consistent property names
  const normalizedData = chartData.map(item => ({
    month: item.month,
    production: item.production || item.production_count || 0,
    packaging: item.packaging || item.packaging_count || 0
  }));
  
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={normalizedData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        barSize={20}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: 'none',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            textAlign: 'right',
            direction: 'rtl'
          }}
          formatter={(value: number) => [`${value} وحدة`, '']}
          labelFormatter={(label) => `شهر ${label}`}
        />
        <Bar
          dataKey="production"
          name="الإنتاج"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="packaging"
          name="التعبئة"
          fill="#10b981"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ProductionChart;
