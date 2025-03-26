
import React from 'react';
import TransactionForm from '@/components/financial/TransactionForm';
import { Card, CardContent } from '@/components/ui/card';

const TransactionPage: React.FC = () => {
  return (
    <div className="container mx-auto">
      <TransactionForm />
    </div>
  );
};

export default TransactionPage;
