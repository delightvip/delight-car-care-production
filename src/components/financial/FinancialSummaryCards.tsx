
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FinancialSummary } from '@/services/financial/FinancialService';
import { ArrowDown, ArrowUp, Wallet, Landmark, Calculator } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FinancialSummaryCardsProps {
  summary: FinancialSummary;
  loading: boolean;
}

const FinancialSummaryCards: React.FC<FinancialSummaryCardsProps> = ({ summary, loading }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  };
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-4/5 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-green-700 dark:text-green-400">
            <ArrowUp className="h-4 w-4 mr-2" />
            الإيرادات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">
            {formatCurrency(summary.totalIncome)}
          </div>
          <p className="text-xs text-green-600 dark:text-green-500 mt-1">
            إجمالي الإيرادات
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-red-700 dark:text-red-400">
            <ArrowDown className="h-4 w-4 mr-2" />
            المصروفات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">
            {formatCurrency(summary.totalExpenses)}
          </div>
          <p className="text-xs text-red-600 dark:text-red-500 mt-1">
            إجمالي المصروفات
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-blue-700 dark:text-blue-400">
            <Calculator className="h-4 w-4 mr-2" />
            صافي الربح
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            summary.netProfit >= 0 
              ? 'text-blue-700 dark:text-blue-400' 
              : 'text-red-700 dark:text-red-400'
          }`}>
            {formatCurrency(summary.netProfit)}
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
            الإيرادات - المصروفات
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-amber-700 dark:text-amber-400">
            <Wallet className="h-4 w-4 mr-2" />
            رصيد الخزنة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            {formatCurrency(summary.balance.cash_balance)}
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
            الرصيد النقدي الحالي
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-purple-700 dark:text-purple-400">
            <Landmark className="h-4 w-4 mr-2" />
            رصيد البنك
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
            {formatCurrency(summary.balance.bank_balance)}
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
            الرصيد البنكي الحالي
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSummaryCards;
