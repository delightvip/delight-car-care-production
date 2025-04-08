
import React from 'react';
import TransactionForm from '@/components/financial/TransactionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FinancialBalanceSummary from '@/components/financial/FinancialBalanceSummary';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BanknoteIcon } from 'lucide-react';

const TransactionPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold">إضافة معاملة مالية</h1>
        
        <Button 
          variant="outline" 
          onClick={() => navigate('/financial/cash-management')}
        >
          <BanknoteIcon className="h-4 w-4 ml-2" />
          إدارة الخزينة
        </Button>
      </div>
      
      <FinancialBalanceSummary />
      
      <TransactionForm />
    </div>
  );
};

export default TransactionPage;
