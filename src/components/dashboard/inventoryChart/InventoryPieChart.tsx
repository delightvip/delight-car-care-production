
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { InventoryDistributionData, CHART_COLORS } from './InventoryChartUtils';
import { motion } from 'framer-motion';

interface InventoryPieChartProps {
  data: InventoryDistributionData[];
  height?: string | number;
}

const InventoryPieChart: React.FC<InventoryPieChartProps> = ({
  data,
  height = '16rem',
}) => {
  // Calculate the total to derive percentages
  const total = data?.reduce((sum, item) => sum + (item?.value || 0), 0) || 0;
  
  // Custom tooltip formatter
  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length && payload[0]?.payload) {
      const item = payload[0].payload;
      const percentage = ((item.value / total) * 100).toFixed(1);
      
      return (
        <div className="p-3 bg-background border rounded-md shadow-md">
          <p className="font-medium">{item.name}</p>
          <p className="text-muted-foreground">
            {item.value.toLocaleString('ar-EG')} ج.م ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };
  
  // Custom legend
  const renderLegend = (props: any) => {
    const { payload } = props;
    
    if (!payload || !Array.isArray(payload)) return null;
    
    return (
      <ul className="flex flex-wrap justify-center gap-4 text-sm mt-4">
        {payload.map((entry: any, index: number) => {
          if (!entry?.payload?.value) return null;
          
          const percentage = ((entry.payload.value / total) * 100).toFixed(1);
          
          return (
            <motion.li 
              key={`item-${index}`} 
              className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent transition-colors"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.value} ({percentage}%)</span>
            </motion.li>
          );
        })}
      </ul>
    );
  };
  
  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-muted-foreground">لا توجد بيانات لعرضها</p>
      </div>
    );
  }
  
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={5}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            labelLine={false}
            animationBegin={0}
            animationDuration={1000}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={customTooltip} />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InventoryPieChart;
