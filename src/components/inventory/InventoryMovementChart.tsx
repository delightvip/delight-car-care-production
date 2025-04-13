
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryMovement } from '@/services/InventoryMovementService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, subMonths, parseISO, isAfter, isBefore } from 'date-fns';
import { ar } from 'date-fns/locale';

interface InventoryMovementChartProps {
  movements: InventoryMovement[];
  selectedCategory: string;
}

const InventoryMovementChart: React.FC<InventoryMovementChartProps> = ({ movements, selectedCategory }) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  
  const getTimeRangeDate = () => {
    const now = new Date();
    switch (timeRange) {
      case 'week': return subDays(now, 7);
      case 'month': return subMonths(now, 1);
      case 'quarter': return subMonths(now, 3);
      case 'year': return subMonths(now, 12);
      default: return subMonths(now, 1);
    }
  };
  
  const formatChartDate = (date: Date) => {
    switch (timeRange) {
      case 'week': return format(date, 'EEE', { locale: ar });
      case 'month': return format(date, 'd MMM', { locale: ar });
      case 'quarter': return format(date, 'MMM', { locale: ar });
      case 'year': return format(date, 'MMM', { locale: ar });
      default: return format(date, 'd MMM', { locale: ar });
    }
  };
  
  const getAggregationKey = (date: Date) => {
    switch (timeRange) {
      case 'week': return format(date, 'yyyy-MM-dd');
      case 'month': return format(date, 'yyyy-MM-dd');
      case 'quarter': return format(date, 'yyyy-MM');
      case 'year': return format(date, 'yyyy-MM');
      default: return format(date, 'yyyy-MM-dd');
    }
  };
  
  const chartData = useMemo(() => {
    // فلترة الحركات على أساس التصنيف المحدد
    const categoryFiltered = selectedCategory === 'all' 
      ? movements 
      : movements.filter(m => m.category === selectedCategory);
    
    const startDate = getTimeRangeDate();
    
    // فلترة الحركات على أساس الفترة الزمنية
    const timeFiltered = categoryFiltered.filter(m => {
      // Make sure date is a Date object
      const moveDate = m.date instanceof Date ? m.date : new Date(m.date as string);
      return isAfter(moveDate, startDate);
    });
    
    // تجميع الحركات على أساس اليوم/الشهر
    const aggregated: Record<string, { in: number; out: number; date: Date }> = {};
    
    timeFiltered.forEach(m => {
      // Make sure date is a Date object
      const moveDate = m.date instanceof Date ? m.date : new Date(m.date as string);
      const key = getAggregationKey(moveDate);
      
      if (!aggregated[key]) {
        aggregated[key] = { in: 0, out: 0, date: moveDate };
      }
      
      // Ensure quantity is a number for numeric operations
      const quantity = Number(m.quantity);
      if (!isNaN(quantity)) {
        if (quantity > 0) {
          aggregated[key].in += quantity;
        } else {
          aggregated[key].out += Math.abs(quantity);
        }
      }
    });
    
    // تحويل البيانات إلى مصفوفة مرتبة
    return Object.entries(aggregated)
      .map(([key, value]) => ({
        date: key,
        in: value.in,
        out: value.out,
        net: value.in - value.out,
        displayDate: formatChartDate(value.date)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [movements, selectedCategory, timeRange]);
  
  const chartColors = {
    in: "#22c55e",
    out: "#f97316",
    net: "#3b82f6"
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">حركة المخزون</CardTitle>
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <TabsList className="grid grid-cols-4 w-[300px]">
              <TabsTrigger value="week">أسبوع</TabsTrigger>
              <TabsTrigger value="month">شهر</TabsTrigger>
              <TabsTrigger value="quarter">ربع سنة</TabsTrigger>
              <TabsTrigger value="year">سنة</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayDate" />
                <YAxis />
                <Tooltip formatter={(value) => value.toLocaleString('ar-EG')} />
                <Legend />
                <Bar 
                  dataKey="in" 
                  name="وارد" 
                  fill={chartColors.in} 
                  stackId="a" 
                />
                <Bar 
                  dataKey="out" 
                  name="صادر" 
                  fill={chartColors.out} 
                  stackId="b" 
                />
                <Bar 
                  dataKey="net" 
                  name="صافي" 
                  fill={chartColors.net} 
                  stackId="c" 
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              لا توجد بيانات كافية لعرض الرسم البياني
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryMovementChart;
