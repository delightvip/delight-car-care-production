
import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import LoadingIndicator from '@/components/ui/LoadingIndicator';

// Flexible data type to handle different response formats
type ChartDataType = {
  month: string;
  production?: number;
  packaging?: number;
  production_count?: number;
  packaging_count?: number;
}

const ProductionChart: React.FC = () => {
  // Get production and packaging data
  const { data, isLoading, error } = useQuery({
    queryKey: ['monthlyProductionStats'],
    queryFn: async () => {
      // Try to get data from custom function first, fallback to manual query
      try {
        // Try direct function call
        const { data: functionData, error: functionError } = await supabase
          .from('production_orders')
          .select('date, count(*)')
          .group('date');
          
        if (functionError) throw functionError;
        
        // Transform function data
        return functionData.map((item: any) => ({
          month: new Date(item.date).toLocaleDateString('ar-EG', { month: 'short' }),
          production_count: parseInt(item.count || "0"),
          packaging_count: 0
        }));
      } catch (err) {
        console.error('Error fetching from function, using fallback:', err);
        
        // Fallback to direct query
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        
        // Format dates for SQL query
        const startDate = sixMonthsAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];
        
        // Get production orders
        const { data: productionData } = await supabase
          .from('production_orders')
          .select('date, count(*)')
          .gte('date', startDate)
          .lte('date', endDate)
          .group('date');
        
        // Get packaging orders
        const { data: packagingData } = await supabase
          .from('packaging_orders')
          .select('date, count(*)')
          .gte('date', startDate)
          .lte('date', endDate)
          .group('date');
        
        // Combine and format data
        const monthMap: Record<string, ChartDataType> = {};
        
        // Process production data
        (productionData || []).forEach((item: any) => {
          const month = new Date(item.date).toLocaleDateString('ar-EG', { month: 'short' });
          if (!monthMap[month]) {
            monthMap[month] = { month, production: 0, packaging: 0 };
          }
          monthMap[month].production = parseInt(item.count || "0");
        });
        
        // Process packaging data
        (packagingData || []).forEach((item: any) => {
          const month = new Date(item.date).toLocaleDateString('ar-EG', { month: 'short' });
          if (!monthMap[month]) {
            monthMap[month] = { month, production: 0, packaging: 0 };
          }
          monthMap[month].packaging = parseInt(item.count || "0");
        });
        
        // Sort by month
        return Object.values(monthMap);
      }
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Use normalized data regardless of the data format received
  const normalizedData = useMemo(() => {
    if (!data) return [];
    
    return data.map((item: ChartDataType) => ({
      month: item.month,
      production: item.production ?? item.production_count ?? 0,
      packaging: item.packaging ?? item.packaging_count ?? 0
    }));
  }, [data]);

  if (isLoading) return <LoadingIndicator text="جاري تحميل بيانات الإنتاج..." />;
  if (error) return <div className="text-red-500">خطأ في تحميل البيانات</div>;
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        لا توجد بيانات إنتاج متاحة
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={normalizedData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="production" name="أوامر الإنتاج" fill="#8884d8" />
        <Bar dataKey="packaging" name="أوامر التعبئة" fill="#82ca9d" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ProductionChart;
