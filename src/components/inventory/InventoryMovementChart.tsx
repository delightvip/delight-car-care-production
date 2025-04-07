
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InventoryMovementData } from '@/services/InventoryMovementService';
import { format, subDays, isSameDay, parseISO, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface InventoryMovementChartProps {
  movements: InventoryMovementData[];
  selectedCategory: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b'];

const InventoryMovementChart: React.FC<InventoryMovementChartProps> = ({ 
  movements,
  selectedCategory
}) => {
  const [timeframe, setTimeframe] = React.useState('week');
  const [chartType, setChartType] = React.useState('bar');
  
  // Prepare chart data
  const chartData = React.useMemo(() => {
    // Define the start date based on timeframe
    let startDate = new Date();
    if (timeframe === 'week') {
      startDate = subDays(new Date(), 7);
    } else if (timeframe === 'month') {
      startDate = subDays(new Date(), 30);
    } else if (timeframe === 'year') {
      startDate = subMonths(new Date(), 12);
    }
    
    // Filter movements by category and timeframe
    const filteredMovements = movements.filter(m => {
      const isAfterStartDate = m.date >= startDate;
      const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
      return isAfterStartDate && matchesCategory;
    });
    
    // For the pie chart, aggregate by type
    const pieData = [
      { name: 'وارد', value: filteredMovements.filter(m => m.type === 'in').length },
      { name: 'صادر', value: filteredMovements.filter(m => m.type === 'out').length },
      { name: 'تعديل', value: filteredMovements.filter(m => m.type === 'adjustment').length },
    ].filter(item => item.value > 0);
    
    // For bar/line charts, aggregate by day
    const byDay = new Map();
    
    // Initialize all days in the period
    const endDate = new Date();
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const key = format(currentDate, 'yyyy-MM-dd');
      byDay.set(key, { date: key, in: 0, out: 0, adjustment: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Fill in actual data
    filteredMovements.forEach(m => {
      const dateKey = format(m.date, 'yyyy-MM-dd');
      if (!byDay.has(dateKey)) {
        byDay.set(dateKey, { date: dateKey, in: 0, out: 0, adjustment: 0 });
      }
      
      const entry = byDay.get(dateKey);
      if (m.type === 'in') {
        entry.in += m.quantity;
      } else if (m.type === 'out') {
        entry.out += m.quantity;
      } else if (m.type === 'adjustment') {
        entry.adjustment += Math.abs(m.quantity);
      }
    });
    
    // Convert to array and sort by date
    const timeSeriesData = Array.from(byDay.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => ({
        ...item,
        displayDate: format(parseISO(item.date), 'MM/dd') // Shorter format for display
      }));
    
    return {
      pieData,
      timeSeriesData
    };
  }, [movements, selectedCategory, timeframe]);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle>تحليل حركة المخزون</CardTitle>
            <CardDescription>
              {selectedCategory === 'all' 
                ? 'جميع أنواع المخزون' 
                : selectedCategory === 'raw' 
                  ? 'المواد الأولية' 
                  : selectedCategory === 'semi' 
                    ? 'المنتجات النصف مصنعة' 
                    : selectedCategory === 'packaging' 
                      ? 'مستلزمات التعبئة' 
                      : 'المنتجات النهائية'}
            </CardDescription>
          </div>
          
          <div className="flex gap-3">
            <Select 
              value={timeframe} 
              onValueChange={setTimeframe}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="الفترة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">أسبوع</SelectItem>
                <SelectItem value="month">شهر</SelectItem>
                <SelectItem value="year">سنة</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={chartType} 
              onValueChange={setChartType}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="نوع الرسم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">رسم شريطي</SelectItem>
                <SelectItem value="line">رسم خطي</SelectItem>
                <SelectItem value="pie">رسم دائري</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {chartData.timeSeriesData.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            لا توجد بيانات كافية لعرض الرسم البياني
          </div>
        ) : (
          <div className="h-[400px]">
            {chartType === 'bar' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayDate" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      return [value, name === 'in' ? 'وارد' : name === 'out' ? 'صادر' : 'تعديل'];
                    }}
                    labelFormatter={(label) => `التاريخ: ${label}`}
                  />
                  <Legend formatter={(value) => value === 'in' ? 'وارد' : value === 'out' ? 'صادر' : 'تعديل'} />
                  <Bar dataKey="in" fill="#3b82f6" name="in" />
                  <Bar dataKey="out" fill="#ef4444" name="out" />
                  <Bar dataKey="adjustment" fill="#f59e0b" name="adjustment" />
                </BarChart>
              </ResponsiveContainer>
            )}
            
            {chartType === 'line' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayDate" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      return [value, name === 'in' ? 'وارد' : name === 'out' ? 'صادر' : 'تعديل'];
                    }}
                    labelFormatter={(label) => `التاريخ: ${label}`}
                  />
                  <Legend formatter={(value) => value === 'in' ? 'وارد' : value === 'out' ? 'صادر' : 'تعديل'} />
                  <Line type="monotone" dataKey="in" stroke="#3b82f6" name="in" />
                  <Line type="monotone" dataKey="out" stroke="#ef4444" name="out" />
                  <Line type="monotone" dataKey="adjustment" stroke="#f59e0b" name="adjustment" />
                </LineChart>
              </ResponsiveContainer>
            )}
            
            {chartType === 'pie' && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryMovementChart;
