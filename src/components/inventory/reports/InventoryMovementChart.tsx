
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface InventoryMovementChartProps {
  itemId: string;
  itemType: string;
  timeRange: string;
  itemName: string;
  itemUnit: string;
}

interface MovementData {
  period: string;
  in_quantity: number;
  out_quantity: number;
  balance: number;
}

export const InventoryMovementChart: React.FC<InventoryMovementChartProps> = ({
  itemId,
  itemType,
  timeRange,
  itemName,
  itemUnit,
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory-movement-chart', itemId, itemType, timeRange],
    queryFn: async () => {
      // Instead of using RPC, we'll simulate the data for now
      // In a real app, this would use the RPC function
      
      // Simulate API call to get data for the chart
      const currentDate = new Date();
      const startDate = new Date();
      
      const periods = timeRange === 'week' ? 7 : 
                     timeRange === 'month' ? 30 : 
                     timeRange === 'quarter' ? 12 : 12;
                     
      // Generate sample data for the chart
      const sampleData: MovementData[] = [];
      
      for (let i = 0; i < periods; i++) {
        let date: Date;
        let periodFormat: string;
        
        if (timeRange === 'week') {
          date = new Date(currentDate);
          date.setDate(date.getDate() - (periods - i - 1));
          periodFormat = 'yyyy-MM-dd';
        } else if (timeRange === 'month') {
          date = new Date(currentDate);
          date.setDate(date.getDate() - (periods - i - 1));
          periodFormat = 'yyyy-MM-dd';
        } else if (timeRange === 'quarter') {
          date = new Date(currentDate);
          date.setDate(1);
          date.setMonth(date.getMonth() - (periods - i - 1));
          periodFormat = 'yyyy-MM';
        } else {
          date = new Date(currentDate);
          date.setDate(1);
          date.setMonth(date.getMonth() - (periods - i - 1));
          periodFormat = 'yyyy-MM';
        }
        
        // Generate random data
        const inQuantity = Math.floor(Math.random() * 50);
        const outQuantity = Math.floor(Math.random() * 30);
        const previousBalance = i > 0 ? sampleData[i - 1].balance : 100;
        
        sampleData.push({
          period: format(date, periodFormat),
          in_quantity: inQuantity,
          out_quantity: outQuantity,
          balance: previousBalance + inQuantity - outQuantity
        });
      }
      
      return sampleData;
    }
  });
  
  const formatPeriod = (period: string): string => {
    // Format the period based on the timeRange
    try {
      if (timeRange === 'week' || timeRange === 'month') {
        // If format is yyyy-MM-dd
        const date = new Date(period);
        return format(date, 'dd MMM', { locale: ar });
      } else {
        // If format is yyyy-MM
        const [year, month] = period.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return format(date, 'MMM yyyy', { locale: ar });
      }
    } catch (error) {
      return period;
    }
  };
  
  const chartData = data?.map(item => ({
    period: item.period,
    periodFormatted: formatPeriod(item.period),
    in: item.in_quantity,
    out: item.out_quantity,
    balance: item.balance
  })) || [];
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>حركة المخزون</CardTitle>
          <CardDescription>جاري تحميل البيانات...</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>حركة المخزون</CardTitle>
          <CardDescription className="text-destructive">حدث خطأ أثناء تحميل البيانات</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center text-muted-foreground">
            تعذر تحميل البيانات. يرجى المحاولة مرة أخرى.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>حركة المخزون - {itemName}</CardTitle>
        <CardDescription>
          تحليل حركة الوارد والمنصرف والرصيد خلال الفترة المحددة
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[350px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodFormatted" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => {
                    const label = 
                      name === 'in' ? 'الوارد' :
                      name === 'out' ? 'المنصرف' : 'الرصيد';
                    return [`${value} ${itemUnit}`, label];
                  }}
                  labelFormatter={(label) => `الفترة: ${label}`}
                />
                <Legend 
                  formatter={(value) => {
                    return value === 'in' ? 'الوارد' :
                           value === 'out' ? 'المنصرف' : 'الرصيد';
                  }}
                />
                <Bar dataKey="in" fill="#22c55e" name="in" />
                <Bar dataKey="out" fill="#ef4444" name="out" />
                <Line type="monotone" dataKey="balance" stroke="#3b82f6" name="balance" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col h-full justify-center items-center">
              <div className="text-lg font-medium">بيانات الرسم البياني</div>
              <div className="flex gap-6 my-4">
                <div className="flex gap-2 items-center">
                  <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  <div>الوارد</div>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                  <div>المنصرف</div>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                  <div>الرصيد</div>
                </div>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                لا توجد بيانات كافية لعرض الرسم البياني
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryMovementChart;
