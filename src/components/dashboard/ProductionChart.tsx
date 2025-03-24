
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Factory, Layers } from 'lucide-react';

interface ProductionChartProps {
  data: {
    month: string;
    production_count?: number;
    packaging_count?: number;
    production?: number;
    packaging?: number;
  }[];
}

const ProductionChart: React.FC<ProductionChartProps> = ({ data }) => {
  // Transform the data to match the format expected by the chart
  const chartData = data.map(item => ({
    month: item.month,
    production: item.production_count ?? item.production ?? 0,
    packaging: item.packaging_count ?? item.packaging ?? 0
  }));

  // Custom tooltip to enhance visual appearance
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
          <p className="font-medium text-sm text-gray-700 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center gap-2 py-1">
              <div className="w-3 h-3" style={{ backgroundColor: entry.color }}></div>
              <span className="text-xs font-medium">{entry.name}: </span>
              <span className="text-xs">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom legend to enhance visual appearance with icons
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex justify-center gap-8 mt-2">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2">
            {entry.value === 'production' ? (
              <Factory size={16} className="text-blue-600" />
            ) : (
              <Layers size={16} className="text-emerald-600" />
            )}
            <span className="text-sm">{entry.value === 'production' ? 'أوامر الإنتاج' : 'أوامر التعبئة'}</span>
          </div>
        ))}
      </div>
    );
  };

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
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            content={<CustomLegend />}
            wrapperStyle={{ paddingTop: '10px' }}
          />
          <Bar dataKey="production" name="أوامر الإنتاج" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="packaging" name="أوامر التعبئة" fill="#10B981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProductionChart;
