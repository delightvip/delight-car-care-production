import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  addMonths, format, startOfMonth, endOfMonth, subMonths, 
  subWeeks, startOfWeek, endOfWeek, differenceInCalendarDays, addDays,
  isWithinInterval 
} from 'date-fns';
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
import { 
  Line, LineChart, XAxis, YAxis, CartesianGrid, 
  ResponsiveContainer, Tooltip, Legend, Area, AreaChart, 
  Bar, BarChart, ComposedChart
} from 'recharts';
import { Button } from '@/components/ui/button';
import { 
  RefreshCcw, CalendarIcon, BarChartIcon, LineChartIcon, 
  TrendingUpIcon, ArrowUpIcon, ArrowDownIcon, CircleDollarSign
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FinancialTrendsChartProps {
  variant?: 'default' | 'compact';
  title?: string;
  description?: string;
  height?: number;
  showLegend?: boolean;
  className?: string;
}

// تعريف أنواع البيانات المالية
type TimeFrame = 'weekly' | 'monthly';
type ChartType = 'line' | 'bar' | 'area' | 'composed';

// تعريف بنية البيانات المالية 
interface FinancialDataPoint {
  label: string;         // للعرض في الرسم
  period: string;        // للتصفية والفرز
  periodStart: string;   // تاريخ بداية الفترة
  periodEnd: string;     // تاريخ نهاية الفترة
  sales: number;
  purchases: number;
  profit: number;
  invoiceCount: number;  // عدد الفواتير
  topProducts?: {        // المنتجات الأكثر مبيعًا
    name: string;
    amount: number;
  }[];
  profitMargin?: number;  // نسبة الربح
  growth?: number;        // نسبة النمو عن الفترة السابقة
}

export function FinancialTrendsChart({
  variant = 'default',
  title = 'اتجاهات المبيعات والمشتريات',
  description = 'مقارنة بين المبيعات والمشتريات والأرباح',
  height = 350,
  showLegend = true,
  className,
}: FinancialTrendsChartProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // حالة عرض البيانات
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('monthly');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [period, setPeriod] = useState<number>(6); // عدد الأشهر/الأسابيع
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['financialTrends', timeFrame, period],
    queryFn: async () => {
      try {
        const today = new Date();
        const periods: {
          start: string;
          end: string;
          label: string;
          period: string;
        }[] = [];
        const results: FinancialDataPoint[] = [];
        
        // تحديد فترات الزمن حسب الاختيار
        if (timeFrame === 'monthly') {
          // الأشهر
          for (let i = period - 1; i >= 0; i--) {
            const month = subMonths(today, i);
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);
            const monthStartStr = format(monthStart, 'yyyy-MM-dd');
            const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
            const monthLabel = format(month, 'MMM yyyy', { locale: ar });
            const monthPeriod = format(month, 'yyyy-MM');
            
            periods.push({
              start: monthStartStr,
              end: monthEndStr,
              label: monthLabel,
              period: monthPeriod
            });
          }
        } else {
          // الأسابيع
          for (let i = period - 1; i >= 0; i--) {
            const week = subWeeks(today, i);
            const weekStart = startOfWeek(week, { weekStartsOn: 6 }); // السبت
            const weekEnd = endOfWeek(week, { weekStartsOn: 6 }); // الجمعة
            const weekStartStr = format(weekStart, 'yyyy-MM-dd');
            const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
            // تنسيق تاريخ مختصر للأسبوع مثلاً "12-18 أبريل"
            const weekLabel = `${format(weekStart, 'd', { locale: ar })}-${format(weekEnd, 'd MMM', { locale: ar })}`;
            const weekPeriod = format(weekStart, 'yyyy-ww'); // رقم السنة والأسبوع
            
            periods.push({
              start: weekStartStr,
              end: weekEndStr,
              label: weekLabel,
              period: weekPeriod
            });
          }
        }
        
        console.log(`جاري جلب بيانات الاتجاهات المالية لـ ${period} ${timeFrame === 'monthly' ? 'شهر' : 'أسبوع'}`);
        
        // استعلامات متوازية لتسريع جلب البيانات
        const [invoicesResponse, profitsSummaryResponse] = await Promise.all([
          // استعلام الفواتير
          supabase
            .from('invoices')
            .select('*, invoice_items(*)')
            .in('status', ['confirmed', 'completed', 'paid', 'delivered', 'done'])
            .gte('date', periods[0].start)
            .lte('date', periods[periods.length - 1].end),
          
          // استعلام بيانات الأرباح
          Promise.all(periods.map(async period => {
            // استعلام ملخص الأرباح لكل فترة
            const { data, error } = await supabase
              .from('profits')
              .select(`
                *,
                invoices!inner (date, invoice_type)
              `)
              .eq('invoices.invoice_type', 'sale')
              .gte('invoices.date', period.start)
              .lte('invoices.date', period.end);
              
            if (error) throw error;
            
            // حساب القيم الإجمالية
            const totalSales = data.reduce((sum, profit) => sum + profit.total_sales, 0);
            const totalCost = data.reduce((sum, profit) => sum + profit.total_cost, 0);
            const totalProfit = data.reduce((sum, profit) => sum + profit.profit_amount, 0);
            
            return {
              total_sales: totalSales,
              total_cost: totalCost,
              total_profit: totalProfit,
              average_profit_percentage: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
              profit_trend: 0
            };
          }))
        ]);
        
        // التحقق من نجاح استعلام الفواتير
        if (invoicesResponse.error) {
          console.error(`خطأ في جلب الفواتير:`, invoicesResponse.error);
          throw invoicesResponse.error;
        }
        
        const allInvoices = invoicesResponse.data || [];
        console.log(`تم العثور على ${allInvoices.length || 0} فاتورة للفترة المحددة`);
        
        // معالجة البيانات لكل فترة
        for (let i = 0; i < periods.length; i++) {
          const period = periods[i];
          const prevPeriod = i > 0 ? periods[i-1] : null;
          
          // فلترة الفواتير للفترة الحالية
          const periodInvoices = allInvoices?.filter(invoice => {
            const invoiceDate = invoice.date;
            return invoiceDate >= period.start && invoiceDate <= period.end;
          }) || [];
          
          // فصل المبيعات والمشتريات
          const sales = periodInvoices.filter(invoice => 
            invoice.invoice_type === 'sale' || invoice.invoice_type === 'sales'
          );
          
          const purchases = periodInvoices.filter(invoice => 
            invoice.invoice_type === 'purchase' || invoice.invoice_type === 'purchases'
          );
          
          // حساب الإجماليات
          const salesTotal = calculateTotal(sales);
          const purchasesTotal = calculateTotal(purchases);
          
          // الحصول على الأرباح من نظام حساب الأرباح
          const periodProfits = profitsSummaryResponse[i];
          // استخدام بيانات الأرباح من الخدمة المخصصة
          const profitTotal = periodProfits.total_profit;
          
          // تجميع بيانات المنتجات الأكثر مبيعاً
          const productSales = new Map<string, number>();
          sales.forEach(invoice => {
            (invoice.invoice_items || []).forEach((item: any) => {
              const productName = item.product_name || item.name || 'منتج غير معروف';
              const amount = extractAmount(item);
              productSales.set(
                productName, 
                (productSales.get(productName) || 0) + amount
              );
            });
          });
          
          // ترتيب المنتجات حسب المبيعات
          const sortedProducts = Array.from(productSales.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5) // أعلى 5 منتجات
            .map(([name, amount]) => ({ name, amount }));
          
          // حساب نسبة الربح
          const profitMargin = salesTotal > 0 ? (profitTotal / salesTotal) * 100 : 0;
          
          // حساب نسبة النمو (مقارنة بالفترة السابقة)
          let growth = 0;
          if (prevPeriod && i > 0) {
            // العثور على بيانات الفترة السابقة
            const prevSales = results[i-1]?.sales || 0;
            if (prevSales > 0) {
              growth = ((salesTotal - prevSales) / prevSales) * 100;
            }
          }
          
          results.push({
            label: period.label,
            period: period.period,
            periodStart: period.start,
            periodEnd: period.end,
            sales: salesTotal,
            purchases: purchasesTotal,
            profit: profitTotal,
            invoiceCount: sales.length,
            topProducts: sortedProducts,
            profitMargin: profitMargin,
            growth: growth
          });
          
          console.log(`${period.label}: المبيعات=${salesTotal}, المشتريات=${purchasesTotal}, الأرباح=${profitTotal}, عدد الفواتير=${sales.length}`);
        }
        
        return results;
      } catch (error) {
        console.error('خطأ في جلب بيانات الاتجاهات المالية:', error);
        throw error;
      }
    },
    refetchInterval: 600000, // إعادة الجلب كل 10 دقائق
    staleTime: 300000, // اعتبار البيانات قديمة بعد 5 دقائق
  });
  
  // دالة مساعدة لحساب الإجمالي مع معالجة مختلف أشكال البيانات
  function calculateTotal(invoices: any[]) {
    return invoices.reduce((sum, invoice) => {
      let amount = 0;
      
      // محاولة استخراج المبلغ من مختلف الحقول المحتملة
      if (typeof invoice.total_amount === 'number') {
        amount = invoice.total_amount;
      } else if (typeof invoice.total === 'number') {
        amount = invoice.total;
      } else if (typeof invoice.amount === 'number') {
        amount = invoice.amount;
      } else if (typeof invoice.total_amount === 'string') {
        amount = parseFloat(invoice.total_amount) || 0;
      } else if (typeof invoice.total === 'string') {
        amount = parseFloat(invoice.total) || 0;
      } else if (typeof invoice.amount === 'string') {
        amount = parseFloat(invoice.amount) || 0;
      }
      
      return sum + amount;
    }, 0);
  }
  
  // دالة مساعدة لاستخراج قيمة بند الفاتورة
  function extractAmount(item: any) {
    let amount = 0;
    
    // محاولة استخراج المبلغ من مختلف الحقول المحتملة
    if (typeof item.total === 'number') {
      amount = item.total;
    } else if (typeof item.amount === 'number') {
      amount = item.amount;
    } else if (typeof item.price === 'number' && typeof item.quantity === 'number') {
      amount = item.price * item.quantity;
    } else if (typeof item.total === 'string') {
      amount = parseFloat(item.total) || 0;
    } else if (typeof item.amount === 'string') {
      amount = parseFloat(item.amount) || 0;
    }
    
    return amount;
  }
  
  if (error) {
    console.error("خطأ في تحميل رسم الاتجاهات المالية:", error);
  }

  // تعريف الألوان
  const colors = {
    sales: isDarkMode ? '#60A5FA' : '#3B82F6',
    salesFill: isDarkMode ? 'rgba(96, 165, 250, 0.2)' : 'rgba(59, 130, 246, 0.1)',
    purchases: isDarkMode ? '#F87171' : '#EF4444',
    purchasesFill: isDarkMode ? 'rgba(248, 113, 113, 0.2)' : 'rgba(239, 68, 68, 0.1)',
    profit: isDarkMode ? '#34D399' : '#10B981',
    profitFill: isDarkMode ? 'rgba(52, 211, 153, 0.2)' : 'rgba(16, 185, 129, 0.1)',
    positive: isDarkMode ? '#34D399' : '#10B981',
    negative: isDarkMode ? '#F87171' : '#EF4444'
  };

  const margin = variant === 'compact' 
    ? { top: 10, right: 10, left: 0, bottom: 10 }
    : { top: 20, right: 20, left: 0, bottom: 20 };
    
  // مكون تلميح مخصص للرسم البياني
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // البحث عن البيانات الكاملة للنقطة المحددة
      const pointData = data?.find(d => d.label === label);
      
      if (!pointData) return null;
      
      const { sales, purchases, profit, invoiceCount, profitMargin, growth, topProducts } = pointData;
      
      const formatCurrency = (value: number) => {
        return value.toLocaleString('ar-EG');
      };

      return (
        <div className="bg-background border rounded-md shadow-md p-4 w-64">
          <p className="text-md font-bold mb-3 text-foreground border-b pb-1">{label}</p>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.sales }} />
                <span className="text-muted-foreground">المبيعات:</span>
              </div>
              <span className="font-bold text-foreground">
                {formatCurrency(sales)} ج.م
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.purchases }} />
                <span className="text-muted-foreground">المشتريات:</span>
              </div>
              <span className="font-bold text-foreground">
                {formatCurrency(purchases)} ج.م
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.profit }} />
                <span className="text-muted-foreground">الأرباح:</span>
              </div>
              <span className="font-bold text-foreground">
                {formatCurrency(profit)} ج.م
              </span>
            </div>
            
            <div className="h-px bg-border my-2"></div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">عدد الفواتير:</span>
              <span className="font-medium text-foreground">{invoiceCount}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">هامش الربح:</span>
              <span className={`font-medium ${profitMargin >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {profitMargin.toFixed(1)}%
              </span>
            </div>
            
            {growth !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">نسبة النمو:</span>
                <span className={`font-medium flex items-center ${growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {growth >= 0 ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
                  {Math.abs(growth).toFixed(1)}%
                </span>
              </div>
            )}
            
            {topProducts && topProducts.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">أكثر المنتجات مبيعاً:</p>
                <div className="space-y-1">
                  {topProducts.slice(0, 3).map((product, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="truncate text-foreground">{product.name}</span>
                      <span className="text-muted-foreground">{formatCurrency(product.amount)} ج.م</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // رسم بياني مركب للبيانات المالية
  const renderComposedChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
        <XAxis 
          dataKey="label" 
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
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar 
          dataKey="sales" 
          name="المبيعات" 
          fill={colors.sales} 
          radius={[4, 4, 0, 0]} 
          barSize={20}
        />
        <Bar 
          dataKey="purchases" 
          name="المشتريات" 
          fill={colors.purchases} 
          radius={[4, 4, 0, 0]} 
          barSize={20}
        />
        <Line
          type="monotone"
          dataKey="profit"
          name="الأرباح"
          stroke={colors.profit}
          strokeWidth={3}
          dot={{ fill: colors.profit, r: 5 }}
          activeDot={{ r: 7 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
  
  // رسم بياني خ��ي للبيانات المالية
  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
        <XAxis 
          dataKey="label" 
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
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="sales"
          name="المبيعات"
          stroke={colors.sales}
          strokeWidth={3}
          dot={{ fill: colors.sales, r: 5 }}
          activeDot={{ r: 7 }}
        />
        <Line
          type="monotone"
          dataKey="purchases"
          name="المشتريات"
          stroke={colors.purchases}
          strokeWidth={3}
          dot={{ fill: colors.purchases, r: 5 }}
          activeDot={{ r: 7 }}
        />
        <Line
          type="monotone"
          dataKey="profit"
          name="الأرباح"
          stroke={colors.profit}
          strokeWidth={3}
          dot={{ fill: colors.profit, r: 5 }}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  // رسم بياني مساحي للبيانات المالية
  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
        <XAxis 
          dataKey="label" 
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
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="sales"
          name="المبيعات"
          stroke={colors.sales}
          fill={colors.salesFill}
          strokeWidth={2}
          dot={{ fill: colors.sales, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Area
          type="monotone"
          dataKey="purchases"
          name="المشتريات"
          stroke={colors.purchases}
          fill={colors.purchasesFill}
          strokeWidth={2}
          dot={{ fill: colors.purchases, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Area
          type="monotone"
          dataKey="profit"
          name="الأرباح"
          stroke={colors.profit}
          fill={colors.profitFill}
          strokeWidth={2}
          dot={{ fill: colors.profit, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
  
  // رسم بياني شريطي للبيانات المالية
  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
        <XAxis 
          dataKey="label" 
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
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="sales" name="المبيعات" fill={colors.sales} radius={[4, 4, 0, 0]} />
        <Bar dataKey="purchases" name="المشتريات" fill={colors.purchases} radius={[4, 4, 0, 0]} />
        <Bar dataKey="profit" name="الأرباح" fill={colors.profit} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
  
  // اختيار نوع الرسم البياني المناسب
  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return renderBarChart();
      case 'area':
        return renderAreaChart();
      case 'composed':
        return renderComposedChart();
      case 'line':
      default:
        return renderLineChart();
    }
  };

  // معالجة حالة التحميل
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

  // معالجة حالة عدم وجود بيانات
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

  // حساب المؤشرات المالية
  const totalSales = data.reduce((sum, item) => sum + item.sales, 0);
  const totalPurchases = data.reduce((sum, item) => sum + item.purchases, 0);
  const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
  
  // حساب نسبة النمو الإجمالية
  const firstPeriodSales = data[0]?.sales || 0;
  const lastPeriodSales = data[data.length - 1]?.sales || 0;
  const overallGrowth = firstPeriodSales > 0 ? 
    ((lastPeriodSales - firstPeriodSales) / firstPeriodSales) * 100 : 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        
        <div className="flex items-center gap-2">
          {/* اختيار الفترة الزمنية */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                {timeFrame === 'monthly' ? 'شهري' : 'أسبوعي'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuRadioGroup 
                value={timeFrame} 
                onValueChange={(value) => setTimeFrame(value as TimeFrame)}
              >
                <DropdownMenuRadioItem value="monthly">شهري</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="weekly">أسبوعي</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* اختيار نوع الرسم البياني */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                {chartType === 'line' && <LineChartIcon className="h-3.5 w-3.5" />}
                {chartType === 'area' && <TrendingUpIcon className="h-3.5 w-3.5" />}
                {chartType === 'bar' && <BarChartIcon className="h-3.5 w-3.5" />}
                {chartType === 'composed' && <CircleDollarSign className="h-3.5 w-3.5" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup 
                value={chartType} 
                onValueChange={(value) => setChartType(value as ChartType)}
              >
                <DropdownMenuRadioItem value="line">خطي</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="area">مساحي</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="bar">شريطي</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="composed">مركب</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* زر التحديث */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => refetch()}
            className="h-8 w-8"
            title="تحديث البيانات"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* بطاقات المؤشرات */}
        {variant !== 'compact' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-background p-3 border rounded-lg">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
                <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ backgroundColor: `${colors.salesFill}` }}>
                  <ArrowUpIcon className="h-4 w-4" style={{ color: colors.sales }} />
                </div>
              </div>
              <p className="text-2xl font-bold mt-1">{totalSales.toLocaleString('ar-EG')} ج.م</p>
              <div className={`text-xs mt-1 ${overallGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'} flex items-center`}>
                {overallGrowth >= 0 ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
                <span>{Math.abs(overallGrowth).toFixed(1)}% </span>
                <span className="text-muted-foreground mr-1">خلال الفت��ة</span>
              </div>
            </div>
            <div className="bg-background p-3 border rounded-lg">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
                <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ backgroundColor: `${colors.purchasesFill}` }}>
                  <ArrowDownIcon className="h-4 w-4" style={{ color: colors.purchases }} />
                </div>
              </div>
              <p className="text-2xl font-bold mt-1">{totalPurchases.toLocaleString('ar-EG')} ج.م</p>
              <div className="text-xs mt-1 text-muted-foreground">
                <span>{data.reduce((sum, item) => sum + (item.invoiceCount || 0), 0)} فاتورة</span>
              </div>
            </div>
            <div className="bg-background p-3 border rounded-lg">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">صافي الأرباح</p>
                <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ backgroundColor: `${colors.profitFill}` }}>
                  <CircleDollarSign className="h-4 w-4" style={{ color: colors.profit }} />
                </div>
              </div>
              <p className="text-2xl font-bold mt-1">{totalProfit.toLocaleString('ar-EG')} ج.م</p>
              <div className="text-xs mt-1 text-muted-foreground">
                <span>هامش الربح: </span>
                <span className={totalSales > 0 ? (totalProfit > 0 ? 'text-emerald-500' : 'text-red-500') : ''}>
                  {totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* الرسم البياني */}
        {renderChart()}
        
        {/* علامات تفسيرية */}
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
