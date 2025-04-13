
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, subMonths, parseISO, isAfter, isBefore } from 'date-fns';
import { ar } from 'date-fns/locale';

// Define the interface for movements
interface InventoryMovement {
  id?: string;
  item_id: string;
  item_type: string;
  quantity: number;
  movement_type: string;
  reason?: string;
  balance_after?: number;
  date: Date | string;
  category?: string;
  type?: 'in' | 'out';
  note?: string;
  item_name?: string;
}

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
    // Filter movements based on selected category
    const categoryFiltered = selectedCategory === 'all' 
      ? movements 
      : movements.filter(m => m.category === selectedCategory);
    
    const startDate = getTimeRangeDate();
    
    // Filter movements based on time range
    const timeFiltered = categoryFiltered.filter(m => {
      // Convert date string to Date object if needed
      let moveDate: Date;
      if (typeof m.date === 'string') {
        moveDate = new Date(m.date);
      } else {
        moveDate = m.date;
      }
      return isAfter(moveDate, startDate);
    });
    
    // Aggregate movements by day/month
    const aggregated: Record<string, { in: number; out: number; date: Date }> = {};
    
    timeFiltered.forEach(m => {
      // Convert date string to Date object if needed
      let moveDate: Date;
      if (typeof m.date === 'string') {
        moveDate = new Date(m.date);
      } else {
        moveDate = m.date;
      }
      
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
    
    // Convert data to array and sort it
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
