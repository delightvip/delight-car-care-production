import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, Banknote } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PartyService, { Party } from '@/services/PartyService';
import CommercialService from '@/services/CommercialService';
import { PartyForm } from '@/components/parties/PartyForm';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PartyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const partyService = PartyService.getInstance();
  const commercialService = CommercialService.getInstance();
  
  // مانع للأخطاء في حال كان المعرف غير موجود
  if (!id) {
    navigate('/commercial/parties');
    return null;
  }
  
  // استعلام جلب بيانات الطرف التجاري
  const { 
    data: party, 
    isLoading: isLoadingParty, 
    error: partyError,
    refetch: refetchParty
  } = useQuery({
    queryKey: ['party', id],
    queryFn: () => partyService.getPartyById(id),
  });
  
  // استعلام جلب الفواتير الخاصة بالطرف
  const { 
    data: invoices,
    isLoading: isLoadingInvoices,
  } = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => commercialService.getInvoicesByParty(id),
    enabled: !!id
  });
  
  // استعلام جلب المدفوعات الخاصة بالطرف
  const { 
    data: payments,
    isLoading: isLoadingPayments,
  } = useQuery({
    queryKey: ['payments', id],
    queryFn: () => commercialService.getPaymentsByParty(id),
    enabled: !!id
  });
  
  // استعلام جلب سجل الحساب
  const { 
    data: ledgerEntries,
    isLoading: isLoadingLedger,
  } = useQuery({
    queryKey: ['ledger', id],
    queryFn: () => commercialService.getLedgerEntries(id),
    enabled: !!id
  });
  
  const handleUpdateParty = async (partyData: Partial<Party>) => {
    try {
      await partyService.updateParty(id, partyData);
      toast.success('تم تحديث بيانات الطرف بنجاح');
      refetchParty();
      setIsEditDialogOpen(false);
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث البيانات');
      console.error(error);
    }
  };
  
  // التعامل مع حالة التحميل
  if (isLoadingParty) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate('/commercial/parties')} className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              العودة للقائمة
            </Button>
            <Skeleton className="h-8 w-60" />
          </div>
          <Skeleton className="h-12 w-full max-w-md" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </PageTransition>
    );
  }
  
  // التعامل مع حالة الخطأ
  if (partyError || !party) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate('/commercial/parties')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            العودة للقائمة
          </Button>
          <div className="bg-destructive/10 p-4 rounded-md text-destructive">
            <p>حدث خطأ أثناء تحميل بيانات الطرف التجاري. الرجاء المحاولة مرة أخرى.</p>
            <p>{String(partyError || 'الطرف التجاري غير موجود')}</p>
          </div>
        </div>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate('/commercial/parties')} className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              العودة للقائمة
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{party.name}</h1>
              <p className="text-muted-foreground">
                {party.type === 'customer' ? 'عميل' : 
                 party.type === 'supplier' ? 'مورّد' : 'طرف آخر'}
                 {party.code ? ` - الكود: ${party.code}` : ''}
              </p>
            </div>
          </div>
          <Button onClick={() => setIsEditDialogOpen(true)}>
            تعديل البيانات
          </Button>
        </div>
        
        <Card>
          <CardHeader className="p-4">
            <div className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">معلومات الحساب</CardTitle>
                <CardDescription>ملخص الحساب والرصيد</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">الرصيد الحالي</div>
                <div className={`text-2xl font-bold ${party.balance > 0 ? 'text-red-600' : party.balance < 0 ? 'text-green-600' : ''}`}>
                  {Math.abs(party.balance).toFixed(2)} {party.balance > 0 ? '(مدين)' : party.balance < 0 ? '(دائن)' : ''}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
        
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="details">التفاصيل</TabsTrigger>
            <TabsTrigger value="invoices">الفواتير</TabsTrigger>
            <TabsTrigger value="payments">المدفوعات</TabsTrigger>
            <TabsTrigger value="ledger">سجل الحساب</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>بيانات الطرف التجاري</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">الاسم</h3>
                  <p>{party.name}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">النوع</h3>
                  <p>
                    {party.type === 'customer' ? 'عميل' : 
                     party.type === 'supplier' ? 'مورّد' : 'أخرى'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">رقم الهاتف</h3>
                  <p>{party.phone || 'غير محدد'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">البريد الإلكتروني</h3>
                  <p>{party.email || 'غير محدد'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">العنوان</h3>
                  <p>{party.address || 'غير محدد'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">الرصيد</h3>
                  <p className={party.balance > 0 ? 'text-red-600' : party.balance < 0 ? 'text-green-600' : ''}>
                    {Math.abs(party.balance).toFixed(2)} {party.balance > 0 ? '(مدين)' : party.balance < 0 ? '(دائن)' : ''}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">تاريخ الإضافة</h3>
                  <p>{party.created_at ? format(new Date(party.created_at), 'yyyy-MM-dd') : 'غير محدد'}</p>
                </div>
                
                {party.notes && (
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">ملاحظات</h3>
                    <p>{party.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>الفواتير</CardTitle>
                <Button size="sm" onClick={() => navigate('/commercial/invoices')}>
                  <FileText className="mr-2 h-4 w-4" />
                  إنشاء فاتورة جديدة
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingInvoices ? (
                  <div className="py-6 text-center">
                    <Skeleton className="h-6 w-full max-w-md mx-auto" />
                    <Skeleton className="h-16 w-full mt-4" />
                    <Skeleton className="h-16 w-full mt-2" />
                    <Skeleton className="h-16 w-full mt-2" />
                  </div>
                ) : invoices && invoices.length > 0 ? (
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-2 px-4 text-right">الرقم</th>
                          <th className="py-2 px-4 text-right">النوع</th>
                          <th className="py-2 px-4 text-right">التاريخ</th>
                          <th className="py-2 px-4 text-right">المبلغ</th>
                          <th className="py-2 px-4 text-right">الحالة</th>
                          <th className="py-2 px-4 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map(invoice => (
                          <tr key={invoice.id} className="border-b">
                            <td className="py-2 px-4">{invoice.id.substring(0, 8)}...</td>
                            <td className="py-2 px-4">
                              {invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'}
                            </td>
                            <td className="py-2 px-4">{invoice.date}</td>
                            <td className="py-2 px-4">{invoice.total_amount.toFixed(2)}</td>
                            <td className="py-2 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                invoice.payment_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                invoice.payment_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {invoice.payment_status === 'confirmed' ? 'مؤكدة' :
                                 invoice.payment_status === 'cancelled' ? 'ملغية' : 'مسودة'}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-center">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate(`/commercial/invoices/${invoice.id}`)}
                              >
                                عرض
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-10 text-center text-muted-foreground">
                    لا توجد فواتير لهذا الطرف
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>المدفوعات والتحصيلات</CardTitle>
                <Button size="sm" onClick={() => navigate('/commercial/payments')}>
                  <Banknote className="mr-2 h-4 w-4" />
                  تسجيل معاملة جديدة
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingPayments ? (
                  <div className="py-6 text-center">
                    <Skeleton className="h-6 w-full max-w-md mx-auto" />
                    <Skeleton className="h-16 w-full mt-4" />
                    <Skeleton className="h-16 w-full mt-2" />
                    <Skeleton className="h-16 w-full mt-2" />
                  </div>
                ) : payments && payments.length > 0 ? (
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-2 px-4 text-right">الرقم</th>
                          <th className="py-2 px-4 text-right">النوع</th>
                          <th className="py-2 px-4 text-right">التاريخ</th>
                          <th className="py-2 px-4 text-right">المبلغ</th>
                          <th className="py-2 px-4 text-right">طريقة الدفع</th>
                          <th className="py-2 px-4 text-right">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map(payment => (
                          <tr key={payment.id} className="border-b">
                            <td className="py-2 px-4">{payment.id.substring(0, 8)}...</td>
                            <td className="py-2 px-4">
                              {payment.payment_type === 'collection' ? 'تحصيل' : 'صرف'}
                            </td>
                            <td className="py-2 px-4">{payment.date}</td>
                            <td className="py-2 px-4">{payment.amount.toFixed(2)}</td>
                            <td className="py-2 px-4">
                              {payment.method === 'cash' ? 'نقداً' :
                               payment.method === 'check' ? 'شيك' :
                               payment.method === 'bank_transfer' ? 'حوالة بنكية' : 'أخرى'}
                            </td>
                            <td className="py-2 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                payment.payment_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                payment.payment_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {payment.payment_status === 'confirmed' ? 'مؤكدة' :
                                 payment.payment_status === 'cancelled' ? 'ملغية' : 'مسودة'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-10 text-center text-muted-foreground">
                    لا توجد مدفوعات أو تحصيلات لهذا الطرف
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="ledger" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>سجل الحساب</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingLedger ? (
                  <div className="py-6 text-center">
                    <Skeleton className="h-6 w-full max-w-md mx-auto" />
                    <Skeleton className="h-16 w-full mt-4" />
                    <Skeleton className="h-16 w-full mt-2" />
                    <Skeleton className="h-16 w-full mt-2" />
                  </div>
                ) : ledgerEntries && ledgerEntries.length > 0 ? (
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-2 px-4 text-right">التاريخ</th>
                          <th className="py-2 px-4 text-right">المعاملة</th>
                          <th className="py-2 px-4 text-right">مدين</th>
                          <th className="py-2 px-4 text-right">دائن</th>
                          <th className="py-2 px-4 text-right">الرصيد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerEntries.map(entry => (
                          <tr key={entry.id} className="border-b">
                            <td className="py-2 px-4">{entry.date}</td>
                            <td className="py-2 px-4">
                              {entry.transaction_type === 'sale_invoice' ? 'فاتورة مبيعات' :
                               entry.transaction_type === 'purchase_invoice' ? 'فاتورة مشتريات' :
                               entry.transaction_type === 'payment_received' ? 'دفعة مستلمة' :
                               entry.transaction_type === 'payment_made' ? 'دفعة مدفوعة' :
                               entry.transaction_type === 'sales_return' ? 'مرتجع مبيعات' :
                               entry.transaction_type === 'purchase_return' ? 'مرتجع مشتريات' :
                               entry.transaction_type === 'opening_balance' ? 'رصيد افتتاحي' :
                               entry.transaction_type}
                            </td>
                            <td className="py-2 px-4 text-red-600">
                              {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
                            </td>
                            <td className="py-2 px-4 text-green-600">
                              {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
                            </td>
                            <td className={`py-2 px-4 ${entry.balance_after > 0 ? 'text-red-600' : entry.balance_after < 0 ? 'text-green-600' : ''}`}>
                              {Math.abs(entry.balance_after).toFixed(2)} {entry.balance_after > 0 ? '(مدين)' : entry.balance_after < 0 ? '(دائن)' : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-10 text-center text-muted-foreground">
                    لا توجد حركات في سجل الحساب
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>تعديل بيانات الطرف</DialogTitle>
          </DialogHeader>
          <PartyForm onSubmit={handleUpdateParty} initialData={party} isEditing={true} />
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

export default PartyDetails;
