import React from 'react';
import { CostScenario } from './types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';

interface ChartsPanelProps {
  scenarios: CostScenario[];
}

export const ChartsPanel: React.FC<ChartsPanelProps> = ({ scenarios }) => {
  // تجهيز بيانات الرسم البياني
  const data = scenarios.map(s => ({
    name: s.name,
    production: s.resultingChanges.production,
    packaging: s.resultingChanges.packaging,
    operations: s.resultingChanges.operations,
    total: s.resultingChanges.total,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">الرسوم البيانية للسيناريوهات</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-72 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="production" fill="#36b37e" name="الإنتاج" />
              <Bar dataKey="packaging" fill="#00b8d9" name="التعبئة" />
              <Bar dataKey="operations" fill="#ffab00" name="العمليات" />
              <Bar dataKey="total" fill="#ff5630" name="الإجمالي" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="production" stroke="#36b37e" name="الإنتاج" />
              <Line type="monotone" dataKey="packaging" stroke="#00b8d9" name="التعبئة" />
              <Line type="monotone" dataKey="operations" stroke="#ffab00" name="العمليات" />
              <Line type="monotone" dataKey="total" stroke="#ff5630" name="الإجمالي" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
