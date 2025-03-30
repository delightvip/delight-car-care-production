
import React from 'react';
import TransactionForm from '@/components/financial/TransactionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FinancialBalanceDisplay from '@/components/financial/FinancialBalanceDisplay';

const TransactionPage: React.FC = () => {
  return (
    <div className="container mx-auto space-y-6">
      <FinancialBalanceDisplay />
      <TransactionForm />
    </div>
  );
};

export default TransactionPage;
