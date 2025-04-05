
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MonthlyProductionStats } from '@/services/production/ProductionTypes';

type ProductionChartProps = {
  data: MonthlyProductionStats[];
  isLoading: boolean;
};

const ProductionChart = ({ data, isLoading }: ProductionChartProps) => {
  const chartData = data.map(item => ({
    name: item.month,
    إنتاج: item.productionCount,
    تعبئة: item.packagingCount
  }));

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>إحصائيات الإنتاج الشهرية</CardTitle>
        <CardDescription>
          مقارنة بين عمليات الإنتاج والتعبئة خلال الأشهر الماضية
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        {isLoading ? (
          <div className="w-full h-full bg-muted/50 animate-pulse rounded-md flex items-center justify-center">
            <p className="text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '8px',
                  border: '1px solid #eaeaea',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="إنتاج" fill="#8884d8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="تعبئة" fill="#82ca9d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductionChart;
