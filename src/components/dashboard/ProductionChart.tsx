
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
      try {
        // Get data using date aggregation
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        
        // Format dates for SQL query
        const startDate = sixMonthsAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];
        
        // استخراج البيانات حسب الشهر لتجميعها بعد ذلك
        const { data: productionOrders } = await supabase
          .from('production_orders')
          .select('date')
          .gte('date', startDate)
          .lte('date', endDate);
        
        const { data: packagingOrders } = await supabase
          .from('packaging_orders')
          .select('date')
          .gte('date', startDate)
          .lte('date', endDate);
        
        // استخدام Map لتجميع البيانات حسب الشهر
        const countsByMonth = new Map<string, { production: number, packaging: number }>();
        
        // إنشاء مفاتيح لجميع الأشهر الستة الماضية
        for (let i = 0; i <= 5; i++) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          
          // استخدم اسم الشهر بالعربية
          const monthName = date.toLocaleDateString('ar-EG', { month: 'short' });
          const monthKey = date.toLocaleDateString('ar-EG', { month: 'short' });
          
          countsByMonth.set(monthKey, { production: 0, packaging: 0 });
        }
        
        // Process production data
        productionOrders?.forEach((item: any) => {
          const date = new Date(item.date);
          const monthKey = date.toLocaleDateString('ar-EG', { month: 'short' });
          
          const currentValue = countsByMonth.get(monthKey) || { production: 0, packaging: 0 };
          countsByMonth.set(monthKey, { 
            ...currentValue, 
            production: currentValue.production + 1 
          });
        });
        
        // Process packaging data
        packagingOrders?.forEach((item: any) => {
          const date = new Date(item.date);
          const monthKey = date.toLocaleDateString('ar-EG', { month: 'short' });
          
          const currentValue = countsByMonth.get(monthKey) || { production: 0, packaging: 0 };
          countsByMonth.set(monthKey, { 
            ...currentValue, 
            packaging: currentValue.packaging + 1 
          });
        });
        
        // Convert Map to array for chart
        const result = Array.from(countsByMonth.entries()).map(([month, counts]) => ({
          month,
          production: counts.production,
          packaging: counts.packaging
        }));
        
        // Sort by month chronologically
        result.sort((a, b) => {
          // للترتيب من الأقدم للأحدث
          const months = Array.from(countsByMonth.keys());
          return months.indexOf(a.month) - months.indexOf(b.month);
        });
        
        return result;
      } catch (err) {
        console.error('Error fetching production data:', err);
        // Return empty data if error
        return [];
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
