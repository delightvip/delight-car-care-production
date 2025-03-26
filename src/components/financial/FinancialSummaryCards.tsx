
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FinancialSummary } from '@/services/financial/FinancialService';
import { ArrowDown, ArrowUp, CreditCard, DollarSign, PieChart, Wallet } from 'lucide-react';

interface FinancialSummaryCardsProps {
  summary: FinancialSummary;
  loading: boolean;
}

const FinancialSummaryCards: React.FC<FinancialSummaryCardsProps> = ({ summary, loading }) => {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center text-blue-700 dark:text-blue-400">
            <DollarSign className="h-4 w-4 ml-2" />
            إجمالي الإيرادات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatAmount(summary.total_income)}</div>
          <p className="text-xs text-muted-foreground">إجمالي جميع الإيرادات</p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center text-red-700 dark:text-red-400">
            <ArrowDown className="h-4 w-4 ml-2" />
            إجمالي المصروفات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">{formatAmount(summary.total_expenses)}</div>
          <p className="text-xs text-muted-foreground">إجمالي جميع المصروفات</p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center text-green-700 dark:text-green-400">
            <ArrowUp className="h-4 w-4 ml-2" />
            صافي الربح
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">{formatAmount(summary.net_profit)}</div>
          <p className="text-xs text-muted-foreground">الإيرادات - المصروفات</p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center text-purple-700 dark:text-purple-400">
            <PieChart className="h-4 w-4 ml-2" />
            ربح المبيعات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{formatAmount(summary.sales_profit)}</div>
          <p className="text-xs text-muted-foreground">الربح من البيع (المبيعات - التكلفة)</p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center text-amber-700 dark:text-amber-400">
            <Wallet className="h-4 w-4 ml-2" />
            رصيد الخزنة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{formatAmount(summary.cash_balance)}</div>
          <p className="text-xs text-muted-foreground">الرصيد النقدي المتاح</p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center text-cyan-700 dark:text-cyan-400">
            <CreditCard className="h-4 w-4 ml-2" />
            رصيد البنك
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-400">{formatAmount(summary.bank_balance)}</div>
          <p className="text-xs text-muted-foreground">رصيد الحسابات البنكية</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSummaryCards;
