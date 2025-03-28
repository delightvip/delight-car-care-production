import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronUp, ArrowRight, Check, AlertCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format } from 'date-fns';
import { Payment, Invoice } from '@/services/commercial/CommercialTypes';
import { Transaction } from '@/services/financial/FinancialTypes';
import FinancialService from '@/services/financial/FinancialService';
import { toast } from 'sonner';

interface CommercialFinancialLinkageProps {
  commercialType: 'invoice' | 'payment';
  commercialId: string;
  commercialData: Invoice | Payment;
  onLinkCreated?: () => void;
}

const CommercialFinancialLinkage: React.FC<CommercialFinancialLinkageProps> = ({
  commercialType,
  commercialId,
  commercialData,
  onLinkCreated
}) => {
  const [expanded, setExpanded] = useState(false);
  const financialService = FinancialService.getInstance();
  
  const { data: linkedTransactions, isLoading, error, refetch } = useQuery({
    queryKey: ['financial-links', commercialId],
    queryFn: () => financialService.findLinkedFinancialTransactions(commercialId),
    enabled: !!commercialId
  });
  
  const getCommercialInfo = () => {
    if (commercialType === 'invoice') {
      const invoice = commercialData as Invoice;
      return {
        title: `فاتورة ${invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'}`,
        date: invoice.date,
        status: invoice.payment_status,
        amount: invoice.total_amount,
        party: invoice.party_name,
        type: invoice.invoice_type
      };
    } else {
      const payment = commercialData as Payment;
      return {
        title: `دفعة ${payment.payment_type === 'collection' ? 'محصلة' : 'مدفوعة'}`,
        date: payment.date,
        status: payment.payment_status,
        amount: payment.amount,
        party: payment.party_name,
        type: payment.payment_type
      };
    }
  };
  
  const commercialInfo = getCommercialInfo();
  
  const handleCreateLink = async () => {
    try {
      let success = false;
      
      if (commercialType === 'invoice') {
        const invoice = commercialData as Invoice;
        success = await financialService.handleInvoiceConfirmation(invoice);
      } else {
        const payment = commercialData as Payment;
        success = await financialService.handlePaymentConfirmation(payment);
      }
      
      if (success) {
        toast.success('تم إنشاء الارتباط المالي بنجاح');
        refetch();
        if (onLinkCreated) {
          onLinkCreated();
        }
      }
    } catch (error) {
      console.error('Error creating financial link:', error);
      toast.error('حدث خطأ أثناء إنشاء الارتباط المالي');
    }
  };
  
  const formatTransaction = (transaction: Transaction) => {
    return {
      date: format(new Date(transaction.date), 'yyyy-MM-dd'),
      type: transaction.type === 'income' ? 'إيراد' : 'مصروف',
      typeClass: transaction.type === 'income' ? 'success' : 'destructive',
      category: transaction.category_name,
      method: transaction.payment_method === 'cash' ? 'نقدي' : 'بنكي',
      amount: new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(transaction.amount),
      notes: transaction.notes
    };
  };
  
  const hasLinkedTransactions = linkedTransactions && linkedTransactions.length > 0;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">الارتباط المالي</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
        </div>
        <CardDescription>
          {hasLinkedTransactions 
            ? `يوجد ${linkedTransactions.length} معاملة مالية مرتبطة` 
            : 'لا يوجد معاملات مالية مرتبطة'}
        </CardDescription>
      </CardHeader>
      
      {expanded && (
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">{commercialInfo.title}</h3>
                <Badge variant={commercialInfo.status === 'confirmed' ? 'success' : 'outline'}>
                  {commercialInfo.status === 'confirmed' ? 'مؤكدة' : 'مسودة'}
                </Badge>
              </div>
              <div className="mt-2 text-sm grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">الطرف:</span> {commercialInfo.party}</div>
                <div><span className="text-muted-foreground">التاريخ:</span> {format(new Date(commercialInfo.date), 'yyyy-MM-dd')}</div>
                <div><span className="text-muted-foreground">المبلغ:</span> {new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(commercialInfo.amount)}</div>
                <div>
                  <span className="text-muted-foreground">النوع:</span> 
                  <Badge variant={commercialInfo.type === 'sale' || commercialInfo.type === 'collection' ? 'success' : 'default'} className="mr-2">
                    {commercialInfo.type === 'sale' ? 'مبيعات' : 
                     commercialInfo.type === 'purchase' ? 'مشتريات' : 
                     commercialInfo.type === 'collection' ? 'تحصيل' : 'صرف'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {isLoading ? (
              <div className="text-center py-4">جاري تحميل المعاملات المالية المرتبطة...</div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">حدث خطأ أثناء تحميل المعاملات المالية المرتبطة</div>
            ) : hasLinkedTransactions ? (
              <Accordion type="single" collapsible className="w-full">
                {linkedTransactions.map((transaction: Transaction, index) => {
                  const formattedTx = formatTransaction(transaction);
                  return (
                    <AccordionItem key={transaction.id} value={transaction.id}>
                      <AccordionTrigger className="py-2">
                        <div className="flex justify-between items-center w-full pr-2">
                          <div className="flex items-center">
                            <Badge variant="info">
                              {transaction.reference_type}: {transaction.reference_id}
                            </Badge>
                            <span>{formattedTx.date}</span>
                          </div>
                          <span className="font-medium">{formattedTx.amount}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="p-2 bg-muted rounded-md text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div><span className="text-muted-foreground">الفئة:</span> {formattedTx.category}</div>
                            <div><span className="text-muted-foreground">طريقة الدفع:</span> {formattedTx.method}</div>
                          </div>
                          {formattedTx.notes && (
                            <div className="mt-2">
                              <span className="text-muted-foreground">ملاحظات:</span> {formattedTx.notes}
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <AlertCircle className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">لا توجد معاملات مالية مرتبطة بهذه المعاملة التجارية</p>
                {commercialInfo.status === 'confirmed' && (
                  <Button onClick={handleCreateLink}>
                    <ArrowRight className="h-4 w-4 ml-2" />
                    إنشاء معاملة مالية مرتبطة
                  </Button>
                )}
              </div>
            )}
            
            {hasLinkedTransactions && commercialInfo.status === 'confirmed' && (
              <div className="flex justify-end mt-4">
                <Button onClick={handleCreateLink} variant="outline">
                  <Check className="h-4 w-4 ml-2" />
                  إنشاء ارتباط مالي إضافي
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default CommercialFinancialLinkage;
