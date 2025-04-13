
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryMovement } from '@/types/inventoryTypes';
import { format, parseISO, startOfDay, endOfDay, eachDayOfInterval, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  Label
} from 'recharts';

interface InventoryMovementChartProps {
  movements: InventoryMovement[];
  selectedCategory: string;
}

const InventoryMovementChart: React.FC<InventoryMovementChartProps> = ({ movements, selectedCategory }) => {
  // Get movements from the last 7 days
  const today = new Date();
  const startDate = startOfDay(addDays(today, -6));
  
  // Create data structure for chart
  const chartData = React.useMemo(() => {
    // Create array of last 7 days
    const days = eachDayOfInterval({
      start: startDate,
      end: endOfDay(today)
    });
    
    // Initialize data structure
    const data = days.map(day => ({
      date: format(day, 'yyyy-MM-dd'),
      in: 0,
      out: 0,
      adjustment: 0,
      day: format(day, 'EEE', { locale: ar })
    }));
    
    // Fill data with movements
    movements.forEach(movement => {
      if (!movement.date && movement.created_at) {
        movement.date = parseISO(movement.created_at);
      }
      
      if (movement.date) {
        const dateStr = format(movement.date, 'yyyy-MM-dd');
        const dayData = data.find(d => d.date === dateStr);
        
        if (dayData) {
          if (movement.type === 'in') {
            dayData.in += Math.abs(movement.quantity);
          } else if (movement.type === 'out') {
            dayData.out += Math.abs(movement.quantity);
          } else if (movement.type === 'adjustment') {
            dayData.adjustment += Math.abs(movement.quantity);
          }
        }
      }
    });
    
    return data;
  }, [movements, startDate, today]);
  
  // Calculate statistics
  const stats = React.useMemo(() => {
    const inTotal = movements.filter(m => m.type === 'in').reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    const outTotal = movements.filter(m => m.type === 'out').reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    const adjustmentTotal = movements.filter(m => m.type === 'adjustment').reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    
    return {
      inTotal,
      outTotal,
      adjustmentTotal,
      total: inTotal + outTotal + adjustmentTotal
    };
  }, [movements]);
  
  const getCategoryLabel = () => {
    switch (selectedCategory) {
      case 'raw_materials':
        return 'المواد الأولية';
      case 'semi_finished':
        return 'المنتجات النصف مصنعة';
      case 'packaging':
        return 'مستلزمات التعبئة';
      case 'finished_products':
        return 'المنتجات النهائية';
      default:
        return 'جميع الأصناف';
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">
          رسم بياني لحركة المخزون {selectedCategory !== 'all' && `(${getCategoryLabel()})`}
        </CardTitle>
        <CardDescription>حركة المخزون خلال الأيام السبعة الماضية</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap justify-around mb-6 gap-4">
          <div className="text-center">
            <p className="text-lg font-medium">إجمالي الوارد</p>
            <p className="text-2xl font-bold text-green-600">{stats.inTotal.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">إجمالي الصادر</p>
            <p className="text-2xl font-bold text-red-600">{stats.outTotal.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">إجمالي التسويات</p>
            <p className="text-2xl font-bold text-blue-600">{stats.adjustmentTotal.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 30,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(value) => [parseFloat(value).toFixed(2), '']} />
              <Legend />
              <Bar name="وارد" dataKey="in" fill="#22c55e" />
              <Bar name="صادر" dataKey="out" fill="#ef4444" />
              <Bar name="تسوية" dataKey="adjustment" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryMovementChart;
