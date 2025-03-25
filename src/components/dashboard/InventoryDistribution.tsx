
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1'];

interface InventoryDistributionProps {
  data?: { name: string; value: number }[];
}

const InventoryDistribution: React.FC<InventoryDistributionProps> = ({ data: propData }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);
  
  // استخدام React Query لجلب البيانات مباشرة من قاعدة البيانات
  const { data: databaseData, isLoading, error } = useQuery({
    queryKey: ['inventoryDistribution'],
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
        
        console.log("Inventory distribution data:", {
          rawMaterialsValue,
          semiFinishedValue,
          packagingValue,
          finishedValue
        });
        
        // تنسيق البيانات للرسم البياني
        return [
          { name: 'المواد الأولية', value: rawMaterialsValue },
          { name: 'المنتجات النصف مصنعة', value: semiFinishedValue },
          { name: 'مواد التعبئة', value: packagingValue },
          { name: 'المنتجات النهائية', value: finishedValue }
        ];
      } catch (error) {
        console.error("Error fetching inventory distribution data:", error);
        throw error;
      }
    },
    // تحديث كل دقيقة
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });
  
  // تحديث البيانات عندما تتغير البيانات الخارجية أو بيانات قاعدة البيانات
  useEffect(() => {
    const data = propData || databaseData;
    if (data && data.length > 0) {
      // استبعاد العناصر التي قيمتها صفر
      const filteredData = data.filter(item => item.value > 0);
      setChartData(filteredData);
    }
  }, [propData, databaseData]);
  
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(null);
  };
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    const isActive = index === activeIndex;
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className={`font-medium transition-all duration-300 ${isActive ? 'font-bold text-lg' : ''}`}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  if (isLoading && !propData) {
    return (
      <div className="h-72 w-full flex items-center justify-center">
        <Skeleton className="h-56 w-56 rounded-full" />
      </div>
    );
  }
  
  if (error && !propData) {
    return (
      <Alert variant="destructive" className="h-72 flex flex-col justify-center">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>خطأ</AlertTitle>
        <AlertDescription>
          حدث خطأ أثناء تحميل بيانات توزيع المخزون
        </AlertDescription>
      </Alert>
    );
  }
  
  if (chartData.length === 0) {
    return (
      <Alert className="h-72 flex flex-col justify-center">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>لا توجد بيانات</AlertTitle>
        <AlertDescription>
          لا توجد بيانات مخزون لعرضها. قم بإضافة عناصر للمخزون أولاً.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <motion.g
            animate={{ 
              rotate: [0, 5, 0],
              scale: [0.9, 1]
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              innerRadius={40}
              paddingAngle={5}
              dataKey="value"
              label={renderCustomizedLabel}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  strokeWidth={index === activeIndex ? 2 : 1}
                  stroke={index === activeIndex ? '#fff' : 'none'}
                />
              ))}
            </Pie>
          </motion.g>
          <Tooltip
            formatter={(value: number) => [`${value.toLocaleString('ar-EG')} ج.م (${((value / total) * 100).toFixed(1)}%)`, 'القيمة']}
            contentStyle={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => {
              const itemData = chartData.find(item => item.name === value);
              const percentage = itemData ? ((itemData.value / total) * 100).toFixed(1) : '0';
              return (
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <span className="text-sm font-medium cursor-pointer">
                      {value}
                    </span>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-48">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{value}</p>
                      <p className="text-sm text-muted-foreground">
                        {itemData?.value.toLocaleString('ar-EG')} ج.م ({percentage}%)
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InventoryDistribution;
