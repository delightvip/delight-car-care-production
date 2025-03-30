
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart
} from 'recharts';

interface MovementChartContentProps {
  chartData: any[];
  itemUnit: string;
}

const MovementChartContent: React.FC<MovementChartContentProps> = ({ chartData, itemUnit }) => {
  if (chartData.length === 0) {
    return (
      <div className="flex flex-col h-full justify-center items-center">
        <div className="text-lg font-medium">بيانات الرسم البياني</div>
        <div className="flex gap-6 my-4">
          <div className="flex gap-2 items-center">
            <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            <div>الوارد</div>
          </div>
          <div className="flex gap-2 items-center">
            <div className="h-3 w-3 bg-red-500 rounded-full"></div>
            <div>المنصرف</div>
          </div>
          <div className="flex gap-2 items-center">
            <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
            <div>الرصيد</div>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          لا توجد بيانات كافية لعرض الرسم البياني
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="periodFormatted" />
        <YAxis />
        <Tooltip 
          formatter={(value, name) => {
            const label = 
              name === 'in' ? 'الوارد' :
              name === 'out' ? 'المنصرف' : 'الرصيد';
            return [`${value} ${itemUnit}`, label];
          }}
          labelFormatter={(label) => `الفترة: ${label}`}
        />
        <Legend 
          formatter={(value) => {
            return value === 'in' ? 'الوارد' :
                   value === 'out' ? 'المنصرف' : 'الرصيد';
          }}
        />
        <Bar dataKey="in" fill="#22c55e" name="in" />
        <Bar dataKey="out" fill="#ef4444" name="out" />
        <Line type="monotone" dataKey="balance" stroke="#3b82f6" name="balance" />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default MovementChartContent;
