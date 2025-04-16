
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import InventoryMovementTrackingService from '@/services/inventory/InventoryMovementTrackingService';

interface InventoryMovementChartProps {
  itemId?: string;
  itemType?: string;
  selectedCategory?: string;
  period?: 'day' | 'week' | 'month' | 'year';
}

const InventoryMovementChart: React.FC<InventoryMovementChartProps> = ({
  itemId,
  itemType,
  selectedCategory,
  period = 'month'
}) => {
  const trackingService = InventoryMovementTrackingService.getInstance();
  
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['inventory-movement-chart', itemId, itemType, selectedCategory, period],
    queryFn: async () => {
      // إذا كان هناك معرف صنف ونوع محدد، قم بجلب بيانات هذا الصنف
      if (itemId && itemType) {
        return trackingService.getItemMovementsByTime(itemId, itemType, period);
      }
      
      // في حالة عدم وجود بيانات محددة، يمكن إضافة منطق بديل هنا
      return [];
    },
    enabled: !!(itemId && itemType) || !!selectedCategory,
  });
  
  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }
  
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] bg-muted/20 rounded-lg">
        <p className="text-muted-foreground">لا توجد بيانات كافية لعرض الرسم البياني</p>
      </div>
    );
  }
  
  // إذا كان لدينا معرف وحده، قم بعرض رسم بياني للوارد والصادر
  if (itemId && itemType) {
    return (
      <Card className="h-[400px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">حركة المخزون عبر الوقت</CardTitle>
        </CardHeader>
        <CardContent className="h-[330px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`${value}`, '']}
                labelFormatter={(label) => `الفترة: ${label}`} 
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="in_quantity" 
                name="وارد"
                stackId="1" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="out_quantity" 
                name="صادر"
                stackId="2" 
                stroke="#ef4444" 
                fill="#ef4444" 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                name="الرصيد"
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }
  
  // في حالة عدم وجود معرف محدد، يمكن عرض شكل بياني آخر
  return (
    <Card className="h-[400px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">إحصائيات المخزون</CardTitle>
      </CardHeader>
      <CardContent className="h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="in_quantity" name="وارد" fill="#10b981" />
            <Bar dataKey="out_quantity" name="صادر" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default InventoryMovementChart;
