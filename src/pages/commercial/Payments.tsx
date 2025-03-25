
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CommercialService, { Payment } from '@/services/CommercialService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PageTransition from '@/components/ui/PageTransition';
import { PaymentForm, PaymentFormValues } from '@/components/commercial/PaymentForm';
import { toast } from 'sonner';
import PaymentsList from '@/components/commercial/PaymentsList';

const Payments = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  
  const commercialService = CommercialService.getInstance();
  
  const { data: payments, isLoading, refetch } = useQuery({
    queryKey: ['payments'],
    queryFn: () => commercialService.getPayments(),
  });
  
  const filteredPayments = React.useMemo(() => {
    if (!payments) return [];
    
    let filtered = payments;
    
    if (activeTab !== 'all') {
      filtered = payments.filter(p => p.payment_type === activeTab);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.party_name?.toLowerCase().includes(query) ||
        p.amount.toString().includes(query) ||
        (p.notes && p.notes.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [payments, activeTab, searchQuery]);

  const handleAddPayment = async (paymentData: PaymentFormValues & { party_id: string }) => {
    try {
      const payment = {
        party_id: paymentData.party_id,
        date: paymentData.date,
        amount: paymentData.amount,
        payment_type: paymentData.payment_type,
        method: paymentData.method,
        related_invoice_id: paymentData.related_invoice_id || "",
        notes: paymentData.notes || ""
      };
      
      await commercialService.recordPayment(payment);
      refetch();
      setIsFormOpen(false);
      toast.success('تم تسجيل المعاملة بنجاح');
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('حدث خطأ أثناء تسجيل المعاملة');
    }
  };

  const handleEditPayment = async (paymentData: PaymentFormValues & { party_id: string }) => {
    if (!selectedPayment || !selectedPayment.id) return;
    
    try {
      const payment = {
        party_id: paymentData.party_id,
        date: paymentData.date,
        amount: paymentData.amount,
        payment_type: paymentData.payment_type,
        method: paymentData.method,
        related_invoice_id: paymentData.related_invoice_id || "",
        notes: paymentData.notes || ""
      };
      
      await commercialService.updatePayment(selectedPayment.id, payment);
      refetch();
      setIsFormOpen(false);
      setSelectedPayment(null);
      setIsEditMode(false);
      toast.success('تم تعديل المعاملة بنجاح');
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('حدث خطأ أثناء تعديل المعاملة');
    }
  };
  
  const handleEditClick = (payment: Payment) => {
    const formData = {
      payment_type: payment.payment_type as "collection" | "disbursement",
      amount: payment.amount,
      date: new Date(payment.date),
      method: payment.method as "cash" | "check" | "bank_transfer" | "other",
      related_invoice_id: payment.related_invoice_id,
      notes: payment.notes
    };
    
    setSelectedPayment(payment);
    setIsEditMode(true);
    setIsFormOpen(true);
  };
  
  const handleDeleteClick = (payment: Payment) => {
    setPaymentToDelete(payment);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeletePayment = async () => {
    if (!paymentToDelete || !paymentToDelete.id) return;
    
    try {
      await commercialService.deletePayment(paymentToDelete.id);
      refetch();
      setIsDeleteDialogOpen(false);
      setPaymentToDelete(null);
      toast.success('تم حذف المعاملة بنجاح');
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('حدث خطأ أثناء حذف المعاملة');
    }
  };

  const resetForm = () => {
    setSelectedPayment(null);
    setIsEditMode(false);
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المدفوعات والتحصيلات</h1>
            <p className="text-muted-foreground">إدارة المدفوعات والتحصيلات النقدية</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المدفوعات والتحصيلات</h1>
            <p className="text-muted-foreground">إدارة المدفوعات والتحصيلات النقدية</p>
          </div>
          <Button onClick={() => {
            resetForm();
            setIsFormOpen(true);
          }}>
            <PlusCircle className="ml-2 h-4 w-4" />
            تسجيل معاملة جديدة
          </Button>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="collection">تحصيلات</TabsTrigger>
            <TabsTrigger value="disbursement">مدفوعات</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <PaymentsList 
              payments={filteredPayments}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onEditClick={handleEditClick}
              onDeleteClick={handleDeleteClick}
              activeTab={activeTab}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'تعديل معاملة' : 'تسجيل معاملة جديدة'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'قم بتعديل بيانات المعاملة حسب الحاجة'
                : 'قم بإدخال بيانات المعاملة المالية لتسجيلها في النظام'
              }
            </DialogDescription>
          </DialogHeader>
          <PaymentForm 
            onSubmit={isEditMode ? handleEditPayment : handleAddPayment} 
            initialData={selectedPayment && {
              payment_type: selectedPayment.payment_type as "collection" | "disbursement",
              amount: selectedPayment.amount,
              date: new Date(selectedPayment.date),
              method: selectedPayment.method as "cash" | "check" | "bank_transfer" | "other",
              related_invoice_id: selectedPayment.related_invoice_id,
              notes: selectedPayment.notes
            }} 
            isEditing={isEditMode}
            partyId={selectedPayment?.party_id || ""}
            partyType="customer"
          />
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
    </PageTransition>
  );
};

export default Payments;
