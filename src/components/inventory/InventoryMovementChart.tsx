
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryMovement } from '@/types/inventoryTypes';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { addDays, format, isSameDay, subDays, isWithinInterval, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface InventoryMovementChartProps {
  movements: InventoryMovement[];
  selectedCategory: string;
}

const InventoryMovementChart: React.FC<InventoryMovementChartProps> = ({ movements, selectedCategory }) => {
  const [chartType, setChartType] = React.useState('daily');
  
  // Define the getCategoryName function at the beginning of the component
  const getCategoryName = (category: string) => {
    switch(category) {
      case 'raw_materials': return 'المواد الأولية';
      case 'semi_finished': return 'المنتجات النصف مصنعة';
      case 'packaging': return 'مستلزمات التعبئة';
      case 'finished_products': return 'المنتجات النهائية';
      default: return category;
    }
  };
  
  // Filter movements by the selected category
  const filteredMovements = useMemo(() => {
    if (selectedCategory === 'all') return movements;
    return movements.filter(m => m.category === selectedCategory);
  }, [movements, selectedCategory]);
  
  // Get category colors
  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'raw_materials': return '#3b82f6';
      case 'semi_finished': return '#10b981';
      case 'packaging': return '#f59e0b';
      case 'finished_products': return '#8b5cf6';
      default: return '#6b7280';
    }
  };
  
  // Prepare daily chart data
  const dailyChartData = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));
    
    return days.map(day => {
      const dayMovements = filteredMovements.filter(m => 
        m.date ? isSameDay(m.date, day) : false
      );
      
      const inCount = dayMovements
        .filter(m => m.type === 'in')
        .reduce((acc, curr) => acc + curr.quantity, 0);
        
      const outCount = dayMovements
        .filter(m => m.type === 'out')
        .reduce((acc, curr) => acc + curr.quantity, 0);
      
      return {
        date: format(day, 'yyyy/MM/dd'),
        day: format(day, 'E', { locale: ar }),
        in: inCount,
        out: outCount,
        total: inCount - outCount
      };
    });
  }, [filteredMovements]);
  
  // Prepare category chart data
  const categoryChartData = useMemo(() => {
    const categoryCounts = movements.reduce((acc, m) => {
      if (!m.category) return acc;
      const categoryName = getCategoryName(m.category);
      acc[categoryName] = (acc[categoryName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
  }, [movements]);
  
  // Prepare movement type chart data
  const typeChartData = useMemo(() => {
    const inMovements = filteredMovements.filter(m => m.type === 'in').length;
    const outMovements = filteredMovements.filter(m => m.type === 'out').length;
    
    return [
      { name: 'وارد', value: inMovements, fill: '#10b981' },
      { name: 'صادر', value: outMovements, fill: '#f59e0b' }
    ];
  }, [filteredMovements]);
  
  // Prepare quantity by category chart data
  const quantityByCategoryData = useMemo(() => {
    const categoryQuantities = filteredMovements.reduce((acc, m) => {
      if (!m.category) return acc;
      const categoryName = getCategoryName(m.category);
      const quantity = m.type === 'in' ? m.quantity : -m.quantity;
      acc[categoryName] = (acc[categoryName] || 0) + quantity;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categoryQuantities).map(([name, quantity]) => ({ 
      name, 
      quantity,
      fill: quantity > 0 ? '#10b981' : '#ef4444'
    }));
  }, [filteredMovements]);
  
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <CardTitle className="text-lg">تحليل حركة المخزون</CardTitle>
          <Tabs defaultValue="daily" value={chartType} onValueChange={setChartType}>
            <TabsList>
              <TabsTrigger value="daily">تحليل يومي</TabsTrigger>
              <TabsTrigger value="category">حسب الفئة</TabsTrigger>
              <TabsTrigger value="type">نوع الحركة</TabsTrigger>
              <TabsTrigger value="quantity">الكميات</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <TabsContent value="daily" className="mt-0">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyChartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    const nameMap = { in: 'وارد', out: 'صادر', total: 'الإجمالي' };
                    return [value, nameMap[name as keyof typeof nameMap]];
                  }}
                  labelFormatter={(label) => `التاريخ: ${label}`}
                />
                <Legend 
                  formatter={(value: string) => {
                    const nameMap = { in: 'وارد', out: 'صادر', total: 'الإجمالي' };
                    return nameMap[value as keyof typeof nameMap];
                  }}
                />
                <Bar dataKey="in" fill="#10b981" name="وارد" />
                <Bar dataKey="out" fill="#f59e0b" name="صادر" />
                <Line type="monotone" dataKey="total" stroke="#8884d8" name="الصافي" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-center text-muted-foreground mt-4">الحركات اليومية خلال آخر 7 أيام</p>
        </TabsContent>
        
        <TabsContent value="category" className="mt-0">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} حركة`, 'عدد الحركات']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-center text-muted-foreground mt-4">توزيع حركات المخزون حسب التصنيف</p>
        </TabsContent>
        
        <TabsContent value="type" className="mt-0">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} حركة`, 'عدد الحركات']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-center text-muted-foreground mt-4">توزيع حركات المخزون حسب نوع الحركة (وارد/صادر)</p>
        </TabsContent>
        
        <TabsContent value="quantity" className="mt-0">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={quantityByCategoryData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip
                  formatter={(value: number) => [`${value}`, 'الكمية']}
                />
                <Legend />
                <Bar dataKey="quantity" name="الكمية">
                  {quantityByCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-center text-muted-foreground mt-4">صافي الكميات حسب فئة المخزون (وارد - صادر)</p>
        </TabsContent>
      </CardContent>
    </Card>
  );
};

export default InventoryMovementChart;
