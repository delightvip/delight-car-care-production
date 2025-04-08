
import React, { useState, useEffect } from 'react';
import TransactionForm from '@/components/financial/TransactionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import FinancialBalanceService from '@/services/financial/FinancialBalanceService';
import { Skeleton } from '@/components/ui/skeleton';

const TransactionPage: React.FC = () => {
  const financialBalanceService = FinancialBalanceService.getInstance();
  
  const { data: balance, isLoading } = useQuery({
    queryKey: ['financial-balance'],
    queryFn: () => financialBalanceService.getCurrentBalance(),
  });

  return (
    <div className="container mx-auto space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">رصيد النقدية</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-primary">
                {balance?.cash_balance?.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) || 'غير متاح'}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">رصيد البنك</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-primary">
                {balance?.bank_balance?.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) || 'غير متاح'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <TransactionForm />
    </div>
  );
};

export default TransactionPage;
