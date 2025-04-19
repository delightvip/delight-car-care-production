import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface PriceHistoryEntry {
  date: string; // ISO
  price: number;
  reason?: string;
}

interface PriceTrendChartProps {
  data: PriceHistoryEntry[];
  isLoading?: boolean;
  materialName?: string;
}

const PriceTrendChart: React.FC<PriceTrendChartProps> = ({ data, isLoading, materialName }) => {
  if (isLoading) {
    return <Skeleton className="h-60 w-full" />;
  }
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">لا توجد بيانات سعرية كافية لهذا الصنف</div>;
  }
  return (
    <div className="w-full">
      <h3 className="text-lg font-bold mb-2 text-center">تغيرات سعر {materialName || ''}</h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={d => d.slice(0, 10)} />
          <YAxis />
          <Tooltip formatter={(value: any, name: any, props: any) => [`${value} ج.م`, 'السعر']} />
          <Legend />
          <Line type="monotone" dataKey="price" stroke="#0088FE" name="سعر الوحدة" activeDot={{ r: 7 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceTrendChart;
