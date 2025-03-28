import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { addMonths, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

// نوع الخاصية لتحديد طريقة العرض
interface FinancialTrendsChartProps {
  variant?: 'default' | 'compact';
  title?: string;
  description?: string;
  height?: number;
  showLegend?: boolean;
  className?: string;
}

export function FinancialTrendsChart({
  variant = 'default',
  title = 'اتجاهات المبيعات والمشتريات',
  description = 'مقارنة بين المبيعات والمشتريات والأرباح خلال الستة أشهر الماضية',
  height = 300,
  showLegend = true,
  className,
}: FinancialTrendsChartProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // استخدام refetch لإعادة جلب البيانات
  const { data, isLoading, refetch } = useQuery({
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
          const profit = salesTotal - purchasesTotal;
          
          results.push({
            month: month.label,
            sales: salesTotal,
            purchases: purchasesTotal,
            profit: profit
          });
        }
        
        return results;
      } catch (error) {
        console.error('Error fetching financial trends data:', error);
        throw error;
      }
    },
    refetchInterval: 600000,
    staleTime: 600000,
  });
  
  // الألوان المستخدمة في الرسم البياني
  const colors = {
    sales: isDarkMode ? '#60A5FA' : '#3B82F6',      // أزرق
    purchases: isDarkMode ? '#F87171' : '#EF4444',  // أحمر
    profit: isDarkMode ? '#34D399' : '#10B981'      // أخضر
  };
  
  // خاصية للهامش بناءً على الحجم المختار
  const margin = variant === 'compact' 
    ? { top: 10, right: 10, left: 0, bottom: 10 }
    : { top: 20, right: 20, left: 0, bottom: 20 };

  // عنصر الرسم البياني الفعلي
  const renderChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
        <XAxis 
          dataKey="month" 
          className="text-muted-foreground text-xs" 
          tickLine={false}
          axisLine={{ strokeWidth: 1, className: 'stroke-muted-foreground/20' }}
        />
        <YAxis 
          className="text-muted-foreground text-xs" 
          tickLine={false}
          axisLine={{ strokeWidth: 1, className: 'stroke-muted-foreground/20' }}
          tickFormatter={(value) => `${(value / 1000)}ك`}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-background border rounded-md shadow-md p-3">
                  <p className="text-sm font-medium mb-1 text-foreground">{label}</p>
                  {payload.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span className="text-muted-foreground">
                        {item.name === 'sales' ? 'المبيعات' : 
                         item.name === 'purchases' ? 'المشتريات' : 'الأرباح'}:
                      </span>
                      <span className="font-medium text-foreground">
                        {item.value.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          }}
        />
        <Line
          type="monotone"
          dataKey="sales"
          name="المبيعات"
          stroke={colors.sales}
          strokeWidth={2}
          dot={{ fill: colors.sales, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="purchases"
          name="المشتريات"
          stroke={colors.purchases}
          strokeWidth={2}
          dot={{ fill: colors.purchases, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="profit"
          name="الأرباح"
          stroke={colors.profit}
          strokeWidth={2}
          dot={{ fill: colors.profit, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
  
  // إظهار حالة التحميل
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[300px] flex items-center justify-center">
            <Skeleton className="w-full h-[250px] rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // إظهار حالة عدم وجود بيانات
  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">لا توجد بيانات لعرضها</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // عرض الرسم البياني النهائي
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => refetch()}
          className="h-8 w-8"
          title="تحديث البيانات"
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {renderChart()}
        
        {showLegend && variant !== 'compact' && (
          <div className="flex flex-wrap justify-center items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.sales }} />
              <span>المبيعات</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.purchases }} />
              <span>المشتريات</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.profit }} />
              <span>الأرباح</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
