
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface InventoryDistributionProps {
  data: {
    name: string;
    value: number;
  }[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1'];

const InventoryDistribution: React.FC<InventoryDistributionProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            innerRadius={40}
            paddingAngle={5}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${value} (${((value / total) * 100).toFixed(1)}%)`, 'القيمة']}
            contentStyle={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InventoryDistribution;
