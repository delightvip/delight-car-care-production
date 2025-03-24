
import React from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface InventoryStatsProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
}

const InventoryStats: React.FC<InventoryStatsProps> = ({ data }) => {
  return (
    <div className="glass-panel p-6 h-80">
      <h3 className="text-lg font-medium text-gray-900 mb-4">إحصائيات المخزون</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            formatter={(value: number) => [`${value}`, 'القيمة']}
            labelFormatter={(label) => `${label}`}
          />
          <Bar 
            dataKey="value" 
            radius={[4, 4, 0, 0]}
            barSize={40}
            fill="currentColor"
            className="fill-primary"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InventoryStats;
