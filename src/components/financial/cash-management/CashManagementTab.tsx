
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FinancialBalanceSummary from '@/components/financial/FinancialBalanceSummary';
import CashDepositForm from './CashDepositForm';
import CashWithdrawalForm from './CashWithdrawalForm';
import CashTransferForm from './CashTransferForm';
import { RecentCashOperations } from './RecentCashOperations';

interface CashManagementTabProps {
  onSuccess: () => void;
}

const CashManagementTab: React.FC<CashManagementTabProps> = ({ onSuccess }) => {
  const [activeTab, setActiveTab] = useState('deposit');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>أرصدة الخزينة</CardTitle>
          <CardDescription>الأرصدة الحالية للخزينة النقدية والبنكية</CardDescription>
        </CardHeader>
        <CardContent>
          <FinancialBalanceSummary className="mb-6" />
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-[400px] mb-4">
              <TabsTrigger value="deposit">إيداع</TabsTrigger>
              <TabsTrigger value="withdraw">سحب</TabsTrigger>
              <TabsTrigger value="transfer">تحويل</TabsTrigger>
            </TabsList>
            
            <TabsContent value="deposit">
              <CashDepositForm onSuccess={onSuccess} />
            </TabsContent>
            
            <TabsContent value="withdraw">
              <CashWithdrawalForm onSuccess={onSuccess} />
            </TabsContent>
            
            <TabsContent value="transfer">
              <CashTransferForm onSuccess={onSuccess} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>آخر عمليات الخزينة</CardTitle>
          <CardDescription>سجل العمليات الأخيرة على الخزينة</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentCashOperations />
        </CardContent>
      </Card>
    </div>
  );
};

export default CashManagementTab;
