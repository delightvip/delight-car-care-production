
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProductionChartProps {
  data: {
    month: string;
    production_count: number;
    packaging_count: number;
  }[];
}

const ProductionChart: React.FC<ProductionChartProps> = ({ data }) => {
  // Transform the data to match the format expected by the chart
  const chartData = data.map(item => ({
    month: item.month,
    production: item.production_count,
    packaging: item.packaging_count
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => {
              return value === 'production' ? 'أوامر الإنتاج' : 'أوامر التعبئة';
            }}
          />
          <Bar dataKey="production" name="أوامر الإنتاج" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="packaging" name="أوامر التعبئة" fill="#10B981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProductionChart;
