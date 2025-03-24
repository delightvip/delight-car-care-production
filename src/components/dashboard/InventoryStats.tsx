
import React, { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface InventoryStatsProps {
  data?: {
    name: string;
    value: number;
    color: string;
  }[];
}

const InventoryStats: React.FC<InventoryStatsProps> = ({ data: propData }) => {
  // استخدام React Query لجلب البيانات مباشرة من قاعدة البيانات
  const { data: databaseData, isLoading, error } = useQuery({
    queryKey: ['inventoryStats'],
    queryFn: async () => {
      try {
        // جلب بيانات المواد الأولية
        const { data: rawMaterialsData, error: rawMaterialsError } = await supabase
          .from('raw_materials')
          .select('quantity, unit_cost');
        
        if (rawMaterialsError) throw new Error(rawMaterialsError.message);
        
        // جلب بيانات المنتجات النصف مصنعة
        const { data: semiFinishedData, error: semiFinishedError } = await supabase
          .from('semi_finished_products')
          .select('quantity, unit_cost');
        
        if (semiFinishedError) throw new Error(semiFinishedError.message);
        
        // جلب بيانات مستلزمات التعبئة
        const { data: packagingData, error: packagingError } = await supabase
          .from('packaging_materials')
          .select('quantity, unit_cost');
        
        if (packagingError) throw new Error(packagingError.message);
        
        // جلب بيانات المنتجات النهائية
        const { data: finishedData, error: finishedError } = await supabase
          .from('finished_products')
          .select('quantity, unit_cost');
        
        if (finishedError) throw new Error(finishedError.message);
        
        // حساب القيم الإجمالية لكل نوع
        const rawMaterialsValue = rawMaterialsData.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
        const semiFinishedValue = semiFinishedData.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
        const packagingValue = packagingData.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
        const finishedValue = finishedData.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
        
        console.log("Inventory Stats Data:", {
          rawMaterialsValue,
          semiFinishedValue,
          packagingValue,
          finishedValue
        });
        
        // تنسيق البيانات للرسم البياني
        return [
          { name: 'المواد الأولية', value: rawMaterialsValue, color: '#3B82F6' },
          { name: 'المنتجات النصف مصنعة', value: semiFinishedValue, color: '#10B981' },
          { name: 'مواد التعبئة', value: packagingValue, color: '#F59E0B' },
          { name: 'المنتجات النهائية', value: finishedValue, color: '#6366F1' }
        ];
      } catch (error) {
        console.error("Error fetching inventory stats:", error);
        return [];
      }
    },
    // تحديث كل دقيقة
    refetchInterval: 60000,
  });
  
  // استخدام البيانات الخارجية إذا تم توفيرها، وإلا استخدام البيانات من قاعدة البيانات
  const displayData = useMemo(() => {
    if (propData) return propData;
    return databaseData || [];
  }, [propData, databaseData]);
  
  if (isLoading) {
    return (
      <div className="glass-panel p-6 h-80">
        <h3 className="text-lg font-medium text-gray-900 mb-4">إحصائيات المخزون</h3>
        <Skeleton className="w-full h-[85%]" />
      </div>
    );
  }
  
  if (error && !propData) {
    return (
      <div className="glass-panel p-6 h-80">
        <h3 className="text-lg font-medium text-gray-900 mb-4">إحصائيات المخزون</h3>
        <div className="w-full h-[85%] flex items-center justify-center">
          <p className="text-red-500 text-center">حدث خطأ أثناء تحميل البيانات</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="glass-panel p-6 h-80">
      <h3 className="text-lg font-medium text-gray-900 mb-4">إحصائيات المخزون</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={displayData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            formatter={(value: number) => [`${value.toLocaleString('ar-EG')} ج.م`, 'القيمة']}
            labelFormatter={(label) => `${label}`}
          />
          <Bar 
            dataKey="value" 
            radius={[4, 4, 0, 0]}
            barSize={40}
            fill="currentColor"
            className="fill-primary"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InventoryStats;
