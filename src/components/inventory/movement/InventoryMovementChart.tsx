
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import InventoryMovementTrackingService from '@/services/inventory/InventoryMovementTrackingService';
import InventoryMovementReportingService from '@/services/inventory/InventoryMovementReportingService';

// واجهة الخصائص
interface InventoryMovementChartProps {
  selectedCategory?: string;
  itemId?: string;
  itemType?: string;
}

const InventoryMovementChart: React.FC<InventoryMovementChartProps> = ({
  selectedCategory,
  itemId,
  itemType,
}) => {
  const [period, setPeriod] = useState<string>('month');
  const [chartType, setChartType] = useState<string>('movement');
  
  const trackingService = InventoryMovementTrackingService.getInstance();
  const reportingService = InventoryMovementReportingService.getInstance();

  // الحصول على بيانات الرسم البياني
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['inventory-chart-data', selectedCategory, itemId, itemType, period],
    queryFn: async () => {
      if (itemId && itemType) {
        return trackingService.getItemMovementsByTime(itemId, itemType, period);
      }
      
      // الحصول على الأصناف الأكثر حركة
      const mostActiveItems = await reportingService.getMostActiveItems(10);
      
      // تحويل البيانات لتناسب الرسم البياني
      return mostActiveItems.map(item => ({
        name: item.name,
        count: item.count,
        type: item.type,
        quantity: item.quantity
      }));
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تحليل حركة المخزون</CardTitle>
          <CardDescription>تحميل البيانات...</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تحليل حركة المخزون</CardTitle>
          <CardDescription>لا توجد بيانات كافية للعرض</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">لم يتم العثور على حركات مخزون كافية لعرض الرسم البياني</p>
        </CardContent>
      </Card>
    );
  }

  // معالجة البيانات للرسم البياني حسب النوع
  const processedData = itemId && itemType
    ? chartData // إذا كان هناك صنف محدد، استخدم بيانات هذا الصنف
    : chartData; // استخدم بيانات الأصناف الأكثر حركة

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <CardTitle>تحليل حركة المخزون</CardTitle>
            <CardDescription>
              {itemId && itemType
                ? 'حركة الصنف المحدد على مدار الفترة الزمنية'
                : 'تحليل الأصناف الأكثر حركة في المخزون'}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            {itemId && itemType ? (
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="اختر الفترة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">يومي</SelectItem>
                  <SelectItem value="week">أسبوعي</SelectItem>
                  <SelectItem value="month">شهري</SelectItem>
                  <SelectItem value="year">سنوي</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Tabs 
                value={chartType} 
                onValueChange={setChartType}
                className="w-[240px]"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="movement">الحركة</TabsTrigger>
                  <TabsTrigger value="quantity">الكمية</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[350px] w-full">
          {itemId && itemType ? (
            // رسم بياني لحركة صنف محدد
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={processedData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="in_quantity" 
                  name="الوارد" 
                  stackId="1"
                  stroke="#10b981" 
                  fill="#10b981" 
                />
                <Area 
                  type="monotone" 
                  dataKey="out_quantity" 
                  name="الصادر" 
                  stackId="2"
                  stroke="#ef4444" 
                  fill="#ef4444" 
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  name="الرصيد" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            // رسم بياني للأصناف الأكثر حركة
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={processedData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey={chartType === 'movement' ? 'count' : 'quantity'} 
                  name={chartType === 'movement' ? 'عدد الحركات' : 'الكمية'} 
                  fill="#3b82f6" 
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryMovementChart;
