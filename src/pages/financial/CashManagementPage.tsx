
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FinancialBalanceSummary from '@/components/financial/FinancialBalanceSummary';
import CashDepositForm from '@/components/financial/cash-management/CashDepositForm';
import CashWithdrawalForm from '@/components/financial/cash-management/CashWithdrawalForm';
import CashTransferForm from '@/components/financial/cash-management/CashTransferForm';

const CashManagementPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">إدارة الخزينة</h1>
      
      <FinancialBalanceSummary className="mb-6" />
      
      <Tabs defaultValue="deposit" dir="rtl">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="deposit">إيداع</TabsTrigger>
          <TabsTrigger value="withdrawal">سحب</TabsTrigger>
          <TabsTrigger value="transfer">تحويل بين الحسابات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="deposit">
          <Card>
            <CardHeader>
              <CardTitle>إيداع</CardTitle>
            </CardHeader>
            <CardContent>
              <CashDepositForm />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="withdrawal">
          <Card>
            <CardHeader>
              <CardTitle>سحب</CardTitle>
            </CardHeader>
            <CardContent>
              <CashWithdrawalForm />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle>تحويل بين الحسابات</CardTitle>
            </CardHeader>
            <CardContent>
              <CashTransferForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CashManagementPage;
