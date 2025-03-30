
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface UsageChartContentProps {
  chartData: any[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#6366f1', '#84cc16'];

const UsageChartContent: React.FC<UsageChartContentProps> = ({ chartData }) => {
  if (chartData.length === 0) {
    return (
      <div className="text-center text-muted-foreground h-full flex flex-col justify-center items-center">
        <p>لا توجد بيانات عن استهلاك هذا الصنف خلال الفترة المحددة</p>
      </div>
    );
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return percent > 0.05 ? (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, name]}
          contentStyle={{ direction: 'rtl', textAlign: 'right' }}
        />
        <Legend 
          layout="horizontal" 
          verticalAlign="bottom" 
          align="center" 
          formatter={(value) => (
            <span style={{ color: 'var(--foreground)', marginRight: 10 }}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default UsageChartContent;
