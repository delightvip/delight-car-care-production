import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowDown, ArrowUp, CreditCard, DollarSign, Wallet, TrendingUp, ShoppingBag, Link as LinkIcon } from 'lucide-react';
import { FinancialSummary } from '@/services/financial/FinancialTypes';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FinancialSummaryCardsProps {
  summary: FinancialSummary;
  loading?: boolean;
}

const FinancialSummaryCards: React.FC<FinancialSummaryCardsProps> = ({
  summary,
  loading = false
}) => {
  // تنسيق المبالغ
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP'
    }).format(amount);
  };
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* بطاقة الإيرادات */}
      <Card className="lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
          <ArrowUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-[100px]" />
          ) : (
            <div className="text-2xl font-bold">{formatAmount(summary.totalIncome)}</div>
          )}
          <p className="text-xs text-muted-foreground">
            {summary.startDate && summary.endDate ? (
              `في الفترة من ${summary.startDate} إلى ${summary.endDate}`
            ) : (
              'كافة الفترات'
            )}
          </p>
        </CardContent>
      </Card>
      
      {/* بطاقة أرباح المبيعات (محدثة) - تعرض بيانات من خدمة الأرباح */}
      <Card className="lg:col-span-1 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">أرباح المبيعات</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-[100px]" />
          ) : (
            <div className="text-2xl font-bold">{formatAmount(summary.salesProfit || 0)}</div>
          )}
          
          {/* عرض تفاصيل إضافية من خدمة الأرباح */}
          {summary.salesProfitDetails && !loading && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">المبيعات: </span>
                {formatAmount(summary.salesProfitDetails.total_sales)}
              </div>
              <div>
                <span className="text-muted-foreground">التكلفة: </span>
                {formatAmount(summary.salesProfitDetails.total_cost)}
              </div>
              <div>
                <span className="text-muted-foreground">النسبة: </span>
                {summary.salesProfitDetails.average_profit_percentage.toFixed(1)}%
              </div>
              <div>
                <span className="text-muted-foreground">الفواتير: </span>
                {summary.salesProfitDetails.invoice_count}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="p-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                  <Link to="/commercial/profits" className="flex items-center justify-center gap-1">
                    <LinkIcon className="h-3 w-3" />
                    عرض تفاصيل الأرباح
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>الانتقال إلى صفحة إدارة الأرباح</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardFooter>
      </Card>
      
      {/* بطاقة المصروفات */}
      <Card className="lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
          <ArrowDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-[100px]" />
          ) : (
            <div className="text-2xl font-bold">{formatAmount(summary.totalExpense)}</div>
          )}
          <p className="text-xs text-muted-foreground">
            {summary.startDate && summary.endDate ? (
              `في الفترة من ${summary.startDate} إلى ${summary.endDate}`
            ) : (
              'كافة الفترات'
            )}
          </p>
        </CardContent>
      </Card>
      
      {/* بطاقة صافي الدخل */}
      <Card className="lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">صافي الدخل</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-[100px]" />
          ) : (
            <div className={`text-2xl font-bold ${(summary.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatAmount(summary.netProfit)}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            الفرق بين الإيرادات والمصروفات
          </p>
        </CardContent>
      </Card>
      
      {/* بطاقة الأرصدة */}
      <Card className="lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">إجمالي الأرصدة</CardTitle>
          <Wallet className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-[100px]" />
          ) : (
            <div className="text-2xl font-bold">{formatAmount(summary.totalBalance || 0)}</div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">نقدي: </span>
              {formatAmount(summary.cashBalance || 0)}
            </div>
            <div>
              <span className="text-muted-foreground">بنكي: </span>
              {formatAmount(summary.bankBalance || 0)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSummaryCards;
