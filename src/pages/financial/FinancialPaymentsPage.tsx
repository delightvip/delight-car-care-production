
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PageTransition from '@/components/ui/PageTransition';

const FinancialPaymentsPage: React.FC = () => {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['financial-transactions-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories (name, type)
        `)
        .or('reference_type.eq.payment,reference_type.eq.payment_cancellation')
        .order('date', { ascending: false });
        
      if (error) throw error;
      return data;
    }
  });
  
  if (isLoading) {
    return (
      <PageTransition>
        <div className="container mx-auto space-y-6">
          <h1 className="text-3xl font-bold">التحصيلات والمدفوعات</h1>
          <Skeleton className="h-[500px] w-full" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto space-y-6">
        <h1 className="text-3xl font-bold">التحصيلات والمدفوعات</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>سجل التحصيلات والمدفوعات</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions && transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{format(new Date(transaction.date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>
                        {transaction.reference_type === 'payment_cancellation' ? 'إلغاء ' : ''}
                        {transaction.type === 'income' ? 'تحصيل' : 'تسديد'}
                      </TableCell>
                      <TableCell>
                        {transaction.payment_method === 'cash' ? 'نقدي' : 
                         transaction.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                         transaction.payment_method === 'check' ? 'شيك' : 'أخرى'}
                      </TableCell>
                      <TableCell className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.amount.toLocaleString('ar-EG')} ج.م
                      </TableCell>
                      <TableCell>{transaction.notes}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">لا توجد معاملات مالية</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default FinancialPaymentsPage;
