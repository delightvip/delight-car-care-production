
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowUp, CreditCard, DollarSign, Wallet } from 'lucide-react';
import { FinancialSummary } from '@/services/financial/FinancialTypes';
import { Skeleton } from '@/components/ui/skeleton';

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* بطاقة الإيرادات */}
      <Card>
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
      
      {/* بطاقة المصروفات */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
          <ArrowDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-[100px]" />
          ) : (
            <div className="text-2xl font-bold">{formatAmount(summary.totalExpenses)}</div>
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">صافي الدخل</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-[100px]" />
          ) : (
            <div className={`text-2xl font-bold ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatAmount(summary.netIncome)}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            الفرق بين الإيرادات والمصروفات
          </p>
        </CardContent>
      </Card>
      
      {/* بطاقة الأرصدة */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">إجمالي الأرصدة</CardTitle>
          <Wallet className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-[100px]" />
          ) : (
            <div className="text-2xl font-bold">{formatAmount(summary.totalBalance)}</div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">نقدي: </span>
              {formatAmount(summary.cashBalance)}
            </div>
            <div>
              <span className="text-muted-foreground">بنكي: </span>
              {formatAmount(summary.bankBalance)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSummaryCards;
