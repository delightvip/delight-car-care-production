
import { ProfitData } from '@/services/commercial/profit/ProfitService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { PieChartIcon } from 'lucide-react';

interface ProfitDistributionChartProps {
  profits: ProfitData[];
}

const ProfitDistributionChart = ({ profits }: ProfitDistributionChartProps) => {
  // Group profits by party for distribution chart
  const profitsByParty = profits.reduce((acc, profit) => {
    const existingParty = acc.find(p => p.id === profit.party_id);
    if (existingParty) {
      existingParty.value += profit.profit_amount;
    } else {
      acc.push({
        id: profit.party_id,
        name: profit.party_name,
        value: profit.profit_amount
      });
    }
    return acc;
  }, [] as Array<{ id: string; name: string; value: number }>);
  
  // Sort by value and limit to top 5 + Others
  const sortedProfits = [...profitsByParty].sort((a, b) => b.value - a.value);
  const top5 = sortedProfits.slice(0, 5);
  
  if (sortedProfits.length > 5) {
    const others = sortedProfits.slice(5).reduce((acc, item) => acc + item.value, 0);
    if (others > 0) {
      top5.push({
        id: 'others',
        name: 'عملاء آخرين',
        value: others
      });
    }
  }
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  if (profits.length === 0) {
    return (
      <Card className="shadow-sm border-border/40 h-[400px] flex items-center justify-center">
        <div className="text-center p-4">
          <PieChartIcon className="h-16 w-16 text-muted-foreground opacity-30 mx-auto mb-2" />
          <h3 className="text-lg font-medium">لا توجد بيانات كافية</h3>
          <p className="text-sm text-muted-foreground">قم بتحديد نطاق زمني لعرض بيانات توزيع الأرباح</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-sm border-border/40 h-[400px]">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          توزيع الأرباح حسب العملاء
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={top5}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {top5.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value.toLocaleString('ar-SA')} ر.س`, 'الربح']}
            />
            <Legend 
              layout="horizontal" 
              verticalAlign="bottom" 
              align="center" 
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ProfitDistributionChart;
