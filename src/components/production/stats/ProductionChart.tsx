
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthlyProductionStats } from '@/services/production/ProductionTypes';
import { motion } from 'framer-motion';

interface ProductionChartProps {
  data: MonthlyProductionStats[];
  isLoading: boolean;
}

const ProductionChart = ({ data, isLoading }: ProductionChartProps) => {
  if (isLoading) {
    return (
      <div className="w-full h-[300px] rounded-md border p-4">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[300px] rounded-md border flex items-center justify-center p-4">
        <p className="text-muted-foreground">لا توجد بيانات متاحة للعرض</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="w-full h-[300px] rounded-md border p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <h3 className="font-medium mb-4">إحصائيات الإنتاج الشهرية</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="productionCount" name="أوامر الإنتاج" fill="#8884d8" />
          <Bar dataKey="packagingCount" name="أوامر التعبئة" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default ProductionChart;
