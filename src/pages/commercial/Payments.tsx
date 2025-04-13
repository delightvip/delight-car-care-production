import React, { useState, useEffect } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PaymentService from '@/services/commercial/payment/PaymentService';
import PartyService from '@/services/PartyService';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, FileDown } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { PaymentForm } from '@/components/commercial/PaymentForm';
import PaymentsList from '@/components/commercial/PaymentsList';
import FinancialBalanceSummary from '@/components/financial/FinancialBalanceSummary';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Payment } from '@/services/commercial/CommercialTypes';
import InvoiceService from '@/services/commercial/InvoiceService';

const Payments = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  const queryClient = useQueryClient();
  
  const paymentService = PaymentService.getInstance();
  const partyService = PartyService.getInstance();
  const invoiceService = InvoiceService.getInstance();
  
  const { data: payments, isLoading: isLoadingPayments, error: paymentsError, refetch } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const result = await paymentService.getPayments();
      return result;
    },
  });
  
  const { data: parties, isLoading: isLoadingParties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => partyService.getParties(),
  });
  
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoiceService.getInvoices(),
  });
  
  // تجهيز الفواتير لعرضها في نموذج المدفوعات مع حساب المبالغ المتبقية وحالة الدفع
  const preparedInvoices = React.useMemo(() => {
    if (!invoices) return [];
    
    return invoices.map(invoice => {
      // حساب المبلغ المتبقي للفاتورة (مثال بسيط، يمكن تطويره حسب منطق التطبيق)
      // في التطبيق الحقيقي، يفضل حساب هذه القيم في الخلفية وتخزينها في قاعدة البيانات
      let remainingAmount = invoice.total_amount;
      
      // يمكن استخدام البيانات من جدول المدفوعات لحساب المبلغ المدفوع بالفعل
      if (payments) {
        const relatedPayments = payments.filter(
          payment => payment.related_invoice_id === invoice.id && payment.payment_status === 'confirmed'
        );
        
        const totalPaid = relatedPayments.reduce((sum, payment) => sum + payment.amount, 0);
        remainingAmount = invoice.total_amount - totalPaid;
        
        // لضمان عدم وجود قيم سالبة (في حالة المدفوعات الزائدة)
        remainingAmount = Math.max(0, remainingAmount);
      }
      
      // تحديد حالة الدفع بناءً على المبلغ المتبقي
      let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      if (remainingAmount === 0) {
        status = 'paid';
      } else if (remainingAmount < invoice.total_amount) {
        status = 'partial';
      }
      
      return {
        ...invoice,
        remaining_amount: remainingAmount,
        status
      };
    });
  }, [invoices, payments]);
  
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['payments'] });
  }, [queryClient]);
  
  const filteredPayments = React.useMemo(() => {
    if (!payments) return [];
    
    let filtered = payments;
    
    if (activeTab !== 'all') {
      filtered = payments.filter(payment => payment.payment_type === activeTab);
    }
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.party_name?.toLowerCase().includes(query) ||
        payment.id.toLowerCase().includes(query) ||
        payment.amount.toString().includes(query)
      );
    }
    
    return filtered;
  }, [payments, activeTab, searchQuery]);
  
  const handleCreatePayment = async (paymentData: Omit<Payment, 'id' | 'created_at'>) => {
    try {
      const result = await paymentService.recordPayment(paymentData);
      
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      
      setIsAddDialogOpen(false);
      toast.success('تم تسجيل المعاملة بنجاح');
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('حدث خطأ أثناء تسجيل المعاملة');
    }
  };
  
  const handleUpdatePayment = async (paymentData: Omit<Payment, 'id' | 'created_at'>) => {
    if (!selectedPayment) return;
    
    try {
      const success = await paymentService.updatePayment(selectedPayment.id, paymentData);
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['payments'] });
        setIsEditDialogOpen(false);
        setSelectedPayment(null);
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('حدث خطأ أثناء تحديث المعاملة');
    }
  };
  
  const handleEditClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeletePayment = async () => {
    if (!selectedPayment) return;
    
    try {
      const success = await paymentService.deletePayment(selectedPayment.id);
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['payments'] });
        setIsDeleteDialogOpen(false);
        setSelectedPayment(null);
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('حدث خطأ أثناء حذف المعاملة');
    }
  };
  
  const handleConfirmClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsConfirmDialogOpen(true);
  };
  
  const confirmPayment = async () => {
    if (!selectedPayment) return;
    
    try {
      const success = await paymentService.confirmPayment(selectedPayment.id);
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['payments'] });
        queryClient.invalidateQueries({ queryKey: ['parties'] });
        queryClient.invalidateQueries({ queryKey: ['financial-balance'] });
        setIsConfirmDialogOpen(false);
        setSelectedPayment(null);
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('حدث خطأ أثناء تأكيد المعاملة');
    }
  };
  
  const handleCancelClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsCancelDialogOpen(true);
  };
  
  const cancelPayment = async () => {
    if (!selectedPayment) return;
    
    try {
      const success = await paymentService.cancelPayment(selectedPayment.id);
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['payments'] });
        queryClient.invalidateQueries({ queryKey: ['parties'] });
        queryClient.invalidateQueries({ queryKey: ['financial-balance'] });
        setIsCancelDialogOpen(false);
        setSelectedPayment(null);
      }
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast.error('حدث خطأ أثناء إلغاء المعاملة');
    }
  };
  
  const handleExportPayments = () => {
    try {
      if (!filteredPayments.length) {
        toast.warning('لا توجد معاملات للتصدير');
        return;
      }
      
      let csvContent = 'رقم المعاملة,النوع,الطرف,التاريخ,المبلغ,الطريقة,الحالة\n';
      
      filteredPayments.forEach(payment => {
        csvContent += `${payment.id},`;
        csvContent += `${payment.payment_type === 'collection' ? 'تحصيل' : 'دفع'},`;
        csvContent += `"${payment.party_name || ''}",`;
        csvContent += `${format(new Date(payment.date), 'yyyy-MM-dd')},`;
        csvContent += `${payment.amount.toFixed(2)},`;
        csvContent += `${payment.method},`;
        csvContent += `${payment.payment_status}\n`;
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `payments_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('تم تصدير المعاملات بنجاح');
    } catch (error) {
      console.error('Error exporting payments:', error);
      toast.error('حدث خطأ أثناء تصدير المعاملات');
    }
  };
  
  const isLoading = isLoadingPayments || isLoadingParties || isLoadingInvoices;
  
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex flex-row items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">المعاملات المالية</h1>
              <p className="text-muted-foreground">إدارة معاملات الدفع والتحصيل</p>
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </PageTransition>
    );
  }
  
  if (paymentsError) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">المعاملات المالية</h1>
          <div className="bg-destructive/10 p-4 rounded-md text-destructive">
            <p>حدث خطأ أثناء تحميل البيانات. الرجاء المحاولة مرة أخرى.</p>
            <p>{String(paymentsError)}</p>
          </div>
          <Button onClick={() => refetch()}>إعادة المحاولة</Button>
        </div>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المعاملات المالية</h1>
            <p className="text-muted-foreground">إدارة معاملات الدفع والتحصيل</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> تسجيل معاملة جديدة
          </Button>
        </div>
        
        <FinancialBalanceSummary className="mb-6" />
        
        <div className="flex mb-4">
          <Input
            placeholder="البحث عن معاملة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="collection">معاملات التحصيل</TabsTrigger>
            <TabsTrigger value="disbursement">معاملات الدفع</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <PaymentsList 
              payments={filteredPayments}
              onEditClick={handleEditClick}
              onDeleteClick={handleDeleteClick}
              onConfirmClick={handleConfirmClick}
              onCancelClick={handleCancelClick}
              activeTab={activeTab}
            />
          </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>تسجيل معاملة جديدة</DialogTitle>
            <DialogDescription>
              قم بإدخال بيانات المعاملة المالية.
            </DialogDescription>
          </DialogHeader>          {parties && (
            <PaymentForm 
              onSubmit={handleCreatePayment} 
              parties={parties}
              invoices={preparedInvoices}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>تعديل المعاملة</DialogTitle>
            <DialogDescription>
              قم بتعديل بيانات المعاملة المالية.
            </DialogDescription>
          </DialogHeader>          {selectedPayment && parties && (
            <PaymentForm 
              onSubmit={handleUpdatePayment} 
              parties={parties} 
              initialData={selectedPayment}
              isEditing={true}
              invoices={preparedInvoices}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف المعاملة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه المعاملة؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePayment} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد المعاملة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من تأكيد هذه المعاملة؟ سيتم تحديث رصيد الطرف المرتبط.
              <br />
              لا يمكن تعديل المعاملة بعد تأكيدها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPayment} className="bg-green-600 hover:bg-green-700">
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء المعاملة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إلغاء هذه المعاملة؟ سيتم إلغاء تأثيرها على رصيد الطرف المرتبط.
              <br />
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={cancelPayment} className="bg-red-600 hover:bg-red-700">
              تأكيد الإلغاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
};

export default Payments;
