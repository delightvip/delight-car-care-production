
import React from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface ProductStatisticsProps {
  usageStats: any[];
  productUnit: string;
}

export const UsageBarChart: React.FC<ProductStatisticsProps> = ({ usageStats, productUnit }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>إحصائيات المخزون</CardTitle>
        <CardDescription>تحليل بيانات المخزون والاستهلاك</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={usageStats}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value} ${productUnit}`, 'الكمية']} />
            <Legend />
            <Bar dataKey="amount" name="الاستهلاك الشهري" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const UsageLineChart: React.FC<ProductStatisticsProps> = ({ usageStats, productUnit }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>معدلات الاستخدام</CardTitle>
        <CardDescription>تحليل معدلات استخدام المنتج</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={usageStats}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value} ${productUnit}`, 'الكمية']} />
            <Legend />
            <Line
              type="monotone"
              dataKey="amount"
              name="معدل الاستخدام"
              stroke="#10b981"
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
