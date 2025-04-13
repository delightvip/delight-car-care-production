
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryMovement } from '@/types/inventoryTypes';

interface SourceData {
  name: string;
  value: number;
}

interface InventorySourcesChartProps {
  movements: InventoryMovement[];
}

const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#F43F5E', '#14B8A6'];

const InventorySourcesChart: React.FC<InventorySourcesChartProps> = ({ movements }) => {
  // Analyze movement sources (reasons)
  const sourceData: SourceData[] = React.useMemo(() => {
    const sources: Record<string, number> = {};
    
    movements.forEach(movement => {
      const reason = movement.reason || 'غير محدد';
      if (!sources[reason]) {
        sources[reason] = 0;
      }
      sources[reason] += 1;
    });
    
    return Object.entries(sources)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 7); // Take top 7 reasons
  }, [movements]);

  const renderLabel = (entry: any) => {
    const percent = Math.round((entry.value / movements.length) * 100);
    return percent >= 5 ? `${percent}%` : '';
  };

  if (sourceData.length === 0) {
    return null;
  }

  return (
    <Card className="h-[400px]">
      <CardHeader>
        <CardTitle className="text-lg">مصادر حركة المخزون</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={sourceData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {sourceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} حركة`, 'العدد']}
              labelFormatter={(label) => `المصدر: ${label}`}
            />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default InventorySourcesChart;
