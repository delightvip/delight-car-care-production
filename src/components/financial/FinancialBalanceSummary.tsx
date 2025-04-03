
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import FinancialBalanceService from '@/services/financial/FinancialBalanceService';
import { Cash, CreditCard } from 'lucide-react';

interface FinancialBalanceSummaryProps {
  className?: string;
}

const FinancialBalanceSummary: React.FC<FinancialBalanceSummaryProps> = ({ className }) => {
  const financialBalanceService = FinancialBalanceService.getInstance();
  
  const { data: balance, isLoading } = useQuery({
    queryKey: ['financial-balance'],
    queryFn: () => financialBalanceService.getCurrentBalance(),
  });

  return (
    <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${className}`}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">رصيد النقدية</CardTitle>
          <Cash className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-6 w-28" />
          ) : (
            <div className="text-xl font-bold">
              {balance?.cash_balance?.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) || 'غير متاح'}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">رصيد البنك</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-6 w-28" />
          ) : (
            <div className="text-xl font-bold">
              {balance?.bank_balance?.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) || 'غير متاح'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialBalanceSummary;
