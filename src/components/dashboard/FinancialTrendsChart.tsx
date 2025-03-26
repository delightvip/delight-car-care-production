
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { addMonths, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
  Chart,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

export function FinancialTrendsChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['financialTrends'],
    queryFn: async () => {
      try {
        // Calculate date ranges for the last 6 months
        const today = new Date();
        const months = [];
        const results = [];
        
        // Generate the last 6 months
        for (let i = 5; i >= 0; i--) {
          const month = subMonths(today, i);
          const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
          const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
          const monthLabel = format(month, 'MMM yyyy', { locale: ar });
          
          months.push({
            start: monthStart,
            end: monthEnd,
            label: monthLabel
          });
        }
        
        // Fetch sales data for each month
        for (const month of months) {
          // Get sales invoices
          const { data: sales, error: salesError } = await supabase
            .from('invoices')
            .select('total_amount')
            .eq('invoice_type', 'sale')
            .eq('status', 'confirmed')
            .gte('date', month.start)
            .lte('date', month.end);
            
          if (salesError) throw salesError;
          
          // Get purchase invoices
          const { data: purchases, error: purchasesError } = await supabase
            .from('invoices')
            .select('total_amount')
            .eq('invoice_type', 'purchase')
            .eq('status', 'confirmed')
            .gte('date', month.start)
            .lte('date', month.end);
            
          if (purchasesError) throw purchasesError;
          
          // Calculate totals
          const salesTotal = sales.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
          const purchasesTotal = purchases.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
          
          results.push({
            month: month.label,
            sales: salesTotal,
            purchases: purchasesTotal,
            profit: salesTotal - purchasesTotal
          });
        }
        
        return results;
      } catch (error) {
        console.error('Error fetching financial trends:', error);
        throw error;
      }
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const chartConfig = {
    sales: {
      label: 'المبيعات',
      color: '#10b981', // green-500
    },
    purchases: {
      label: 'المشتريات',
      color: '#ef4444', // red-500
    },
    profit: {
      label: 'الأرباح',
      color: '#3b82f6', // blue-500
    },
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>اتجاهات المبيعات والمشتريات</CardTitle>
        <CardDescription>
          مقارنة بين المبيعات والمشتريات والأرباح خلال الستة أشهر الماضية
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Skeleton className="h-[250px] w-full" />
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.2} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  tickMargin={10}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000)}k`}
                  tickMargin={8}
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <ChartTooltipContent className="bg-background/95 backdrop-blur-sm">
                          {payload.map((entry) => (
                            <div key={entry.dataKey} className="flex justify-between gap-2">
                              <span className="font-semibold capitalize">
                                {chartConfig[entry.dataKey as keyof typeof chartConfig]?.label}:
                              </span>
                              <span>{entry.value?.toLocaleString('ar-EG')} ج.م</span>
                            </div>
                          ))}
                        </ChartTooltipContent>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke={chartConfig.sales.color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="purchases"
                  stroke={chartConfig.purchases.color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke={chartConfig.profit.color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
