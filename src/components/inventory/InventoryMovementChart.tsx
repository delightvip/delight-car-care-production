
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryMovementData } from '@/services/InventoryMovementService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { parseISO, format, subDays, eachDayOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';

interface InventoryMovementChartProps {
  movements: InventoryMovementData[];
  selectedCategory: string;
}

const InventoryMovementChart: React.FC<InventoryMovementChartProps> = ({ 
  movements, 
  selectedCategory 
}) => {
  const chartData = useMemo(() => {
    // Filter movements by category if not 'all'
    const filteredMovements = selectedCategory === 'all' 
      ? movements 
      : movements.filter(m => m.category === selectedCategory);
    
    if (filteredMovements.length === 0) {
      return [];
    }
    
    // Sort by date
    const sortedMovements = [...filteredMovements].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
    
    // Get date range
    const oldestDate = sortedMovements[0].date;
    const newestDate = sortedMovements[sortedMovements.length - 1].date;
    
    // Limit to last 14 days if range is large
    const startDate = subDays(newestDate, 14);
    const dateRange = {
      start: startDate > oldestDate ? startDate : oldestDate,
      end: newestDate
    };
    
    // Create an array of all days in the range
    const daysInRange = eachDayOfInterval({
      start: dateRange.start,
      end: dateRange.end
    });
    
    // Initialize data with zeros for all days
    const data = daysInRange.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return {
        date: dateStr,
        formattedDate: format(day, 'dd MMM', { locale: ar }),
        in: 0,
        out: 0
      };
    });
    
    // Fill in the actual movement data
    sortedMovements.forEach(movement => {
      const dateStr = format(movement.date, 'yyyy-MM-dd');
      const dayData = data.find(d => d.date === dateStr);
      
      if (dayData) {
        if (movement.type === 'in') {
          dayData.in += movement.quantity;
        } else if (movement.type === 'out') {
          dayData.out += movement.quantity;
        }
      }
    });
    
    return data;
  }, [movements, selectedCategory]);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dateObj = parseISO(label);
      
      return (
        <div className="bg-background shadow-md rounded-lg p-3 border">
          <p className="font-bold">{format(dateObj, 'PPPP', { locale: ar })}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} className="flex items-center mt-2">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: entry.color }}
              ></div>
              <span className="font-medium">
                {entry.name === 'in' ? 'وارد' : 'صادر'}: {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    
    return null;
  };
  
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>حركة المخزون خلال الفترة</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">لا توجد بيانات كافية لعرض الرسم البياني</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>حركة المخزون خلال الفترة</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 30, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="formattedDate" 
                angle={-45} 
                textAnchor="end" 
                height={60}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value) => value === 'in' ? 'وارد' : 'صادر'} 
                verticalAlign="top" 
                height={36}
              />
              <Bar 
                name="وارد" 
                dataKey="in" 
                stackId="a" 
                fill="#22c55e" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                name="صادر" 
                dataKey="out" 
                stackId="a" 
                fill="#ef4444" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryMovementChart;
