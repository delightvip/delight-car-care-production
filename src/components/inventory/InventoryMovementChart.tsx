
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { InventoryMovement } from '@/types/inventoryTypes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';

interface InventoryMovementChartProps {
  movements: InventoryMovement[];
  selectedCategory: string;
}

const InventoryMovementChart: React.FC<InventoryMovementChartProps> = ({ movements, selectedCategory }) => {
  const [timeRange, setTimeRange] = React.useState<'week' | 'month' | 'year'>('month');
  
  // Process data for charts
  const processData = () => {
    if (!movements || movements.length === 0) return [];
    
    // Group by date according to selected time range
    const now = new Date();
    let interval: Date[];
    
    if (timeRange === 'week') {
      // Last 7 days
      interval = eachDayOfInterval({
        start: subMonths(now, 1),
        end: now
      });
    } else if (timeRange === 'month') {
      // Current month by day
      interval = eachDayOfInterval({
        start: startOfMonth(now),
        end: endOfMonth(now)
      });
    } else {
      // Last 12 months
      interval = eachMonthOfInterval({
        start: subMonths(now, 11),
        end: now
      });
    }
    
    return interval.map(date => {
      const dateStr = format(date, timeRange === 'year' ? 'yyyy-MM' : 'yyyy-MM-dd');
      
      // Filter movements for this date
      const dateMovements = movements.filter(m => {
        if (!m.date && !m.created_at) return false;
        
        const movDate = m.date || parseISO(m.created_at);
        const formattedMovDate = format(movDate, timeRange === 'year' ? 'yyyy-MM' : 'yyyy-MM-dd');
        return formattedMovDate === dateStr;
      });
      
      // Calculate totals
      const inTotal = dateMovements
        .filter(m => m.type === 'in' || m.movement_type === 'in')
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0);
        
      const outTotal = dateMovements
        .filter(m => m.type === 'out' || m.movement_type === 'out')
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0);
      
      return {
        date: dateStr,
        dateFormatted: timeRange === 'year' 
          ? format(date, 'MMM yyyy', { locale: ar })
          : format(date, 'dd MMM', { locale: ar }),
        in: inTotal,
        out: outTotal,
        balance: inTotal - outTotal
      };
    });
  };
  
  const chartData = processData();
  
  const getCategoryName = (category: string) => {
    switch(category) {
      case 'raw_materials': return 'المواد الأولية';
      case 'semi_finished': return 'المنتجات النصف مصنعة';
      case 'packaging': return 'مستلزمات التعبئة';
      case 'finished_products': return 'المنتجات النهائية';
      case 'all': return 'جميع الأصناف';
      default: return category;
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">
          تحليل حركة المخزون {selectedCategory !== 'all' && `- ${getCategoryName(selectedCategory)}`}
        </CardTitle>
        
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)} className="w-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="week">أسبوع</TabsTrigger>
            <TabsTrigger value="month">شهر</TabsTrigger>
            <TabsTrigger value="year">سنة</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent className="pt-0">
        <Tabs defaultValue="line" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="line">خط بياني</TabsTrigger>
            <TabsTrigger value="bar">أعمدة</TabsTrigger>
            <TabsTrigger value="balance">الرصيد</TabsTrigger>
          </TabsList>
          
          <TabsContent value="line" className="pt-2">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="dateFormatted" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="in"
                    name="وارد"
                    stroke="#10b981"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="out"
                    name="صادر"
                    stroke="#f59e0b"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="bar" className="pt-2">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="dateFormatted" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="in" name="وارد" fill="#10b981" />
                  <Bar dataKey="out" name="صادر" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="balance" className="pt-2">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="dateFormatted" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="الرصيد"
                    stroke="#3b82f6"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default InventoryMovementChart;
