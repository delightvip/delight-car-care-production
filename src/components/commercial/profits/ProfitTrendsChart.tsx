
import { ProfitData } from '@/services/commercial/profit/ProfitService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { TrendingUpIcon } from 'lucide-react';

interface ProfitTrendsChartProps {
  profits: ProfitData[];
}

const ProfitTrendsChart = ({ profits }: ProfitTrendsChartProps) => {
  // Group profits by date for trends chart
  const profitsByDate = profits.reduce((acc, profit) => {
    const date = profit.invoice_date;
    
    // Check if we already have this date in the accumulator
    const existingDate = acc.find(item => item.date === date);
    
    if (existingDate) {
      existingDate.sales += profit.total_sales;
      existingDate.cost += profit.total_cost;
      existingDate.profit += profit.profit_amount;
      existingDate.count += 1;
    } else {
      acc.push({
        date,
        dateFormatted: format(new Date(date), 'dd MMM', { locale: ar }),
        sales: profit.total_sales,
        cost: profit.total_cost,
        profit: profit.profit_amount,
        count: 1
      });
    }
    
    return acc;
  }, [] as Array<{ date: string; dateFormatted: string; sales: number; cost: number; profit: number; count: number }>);
  
  // Sort by date
  profitsByDate.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (profits.length === 0 || profitsByDate.length < 2) {
    return (
      <Card className="shadow-sm border-border/40 h-[400px] flex items-center justify-center">
        <div className="text-center p-4">
          <TrendingUpIcon className="h-16 w-16 text-muted-foreground opacity-30 mx-auto mb-2" />
          <h3 className="text-lg font-medium">لا توجد بيانات كافية</h3>
          <p className="text-sm text-muted-foreground">قم بتحديد نطاق زمني أكبر لعرض اتجاهات الأرباح</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-sm border-border/40 h-[400px]">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUpIcon className="h-5 w-5" />
          اتجاهات المبيعات والأرباح
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={profitsByDate}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="dateFormatted"
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => [`${value.toLocaleString('ar-SA')} ر.س`, '']}
              labelFormatter={(label) => `التاريخ: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="sales" 
              name="المبيعات" 
              stroke="#8884d8" 
              activeDot={{ r: 8 }} 
            />
            <Line 
              type="monotone" 
              dataKey="cost" 
              name="التكلفة" 
              stroke="#82ca9d" 
            />
            <Line 
              type="monotone" 
              dataKey="profit" 
              name="الأرباح" 
              stroke="#ff7300" 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ProfitTrendsChart;
