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
import { PaymentForm } from '@/components/commercial/PaymentForm';

const PartyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  
  const partyService = PartyService.getInstance();
  const commercialService = CommercialService.getInstance();
  
  if (!id) {
    navigate('/commercial/parties');
    return null;
  }
  
  const { 
    data: party, 
    isLoading: isLoadingParty, 
    error: partyError,
    refetch: refetchParty
  } = useQuery({
    queryKey: ['party', id],
    queryFn: () => partyService.getPartyById(id),
  });
  
  const { 
    data: invoices,
    isLoading: isLoadingInvoices,
  } = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => commercialService.getInvoicesByParty(id),
    enabled: !!id
  });
  
  const { 
    data: payments,
    isLoading: isLoadingPayments,
  } = useQuery({
    queryKey: ['payments', id],
    queryFn: () => commercialService.getPaymentsByParty(id),
    enabled: !!id
  });
  
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
        <div className="flex flex-row items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/commercial/parties')}
            className="rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 shadow-sm px-4 py-2 text-primary-700 dark:text-primary-300"
          >
            <ArrowLeft className="mr-2 h-5 w-5" /> العودة للأطراف
          </Button>
          <Button
            onClick={() => setIsEditDialogOpen(true)}
            className="bg-green-200 hover:bg-green-300 text-green-900 font-bold rounded-lg shadow border-2 border-green-300 focus:ring-2 focus:ring-green-100 focus:border-green-400 px-4 py-2 flex items-center gap-2"
            style={{ backgroundColor: '#bbf7d0', color: '#166534', borderColor: '#86efac' }}
          >
            <FileText className="h-5 w-5" /> تعديل بيانات الطرف
          </Button>
        </div>
        <Card className="shadow-xl border border-gray-200 dark:border-zinc-800 rounded-xl">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${party.type === 'customer' ? 'bg-blue-100 text-blue-700' : party.type === 'supplier' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{party.type === 'customer' ? 'عميل' : party.type === 'supplier' ? 'مورّد' : 'أخرى'}</span>
              <CardTitle className="text-2xl font-bold text-primary-700 dark:text-primary-300 tracking-tight flex items-center gap-2">
                {party.name}
              </CardTitle>
            </div>
            <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center">
              <span className={`inline-block px-3 py-1 rounded-full font-bold text-sm ${party.balance > 0 ? 'bg-red-100 text-red-700' : party.balance < 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{party.balance > 0 ? 'مدين' : party.balance < 0 ? 'دائن' : 'بدون رصيد'}: <span dir="ltr">{Math.abs(party.balance).toFixed(2)}</span></span>
              <span className="inline-block px-3 py-1 rounded-full text-xs bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-zinc-700">تاريخ الإضافة: {party.created_at ? format(new Date(party.created_at), 'yyyy-MM-dd') : '-'}</span>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <FileText className="h-4 w-4 opacity-60" />
                <span className="font-semibold">الكود:</span>
                <span dir="ltr">{party.code || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Banknote className="h-4 w-4 opacity-60" />
                <span className="font-semibold">نوع الرصيد:</span>
                <span>{party.balance_type === 'debit' ? 'مدين (له)' : 'دائن (عليه)'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <span className="font-semibold">رقم الهاتف:</span>
                <span dir="ltr">{party.phone || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <span className="font-semibold">البريد الإلكتروني:</span>
                <span dir="ltr">{party.email || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <span className="font-semibold">العنوان:</span>
                <span>{party.address || '-'}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {/* يمكنك إضافة ملخص آخر أو إحصائيات مستقبلية هنا */}
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="details">البيانات الأساسية</TabsTrigger>
            <TabsTrigger value="invoices">الفواتير</TabsTrigger>
            <TabsTrigger value="payments">المدفوعات</TabsTrigger>
            <TabsTrigger value="ledger">سجل الحساب</TabsTrigger>
          </TabsList>

          {/* بيانات أساسية */}
          <TabsContent value="details" className="mt-0">
            {/* تم عرضها بالفعل في البطاقة أعلاه */}
            <div className="text-center text-muted-foreground">تم عرض جميع بيانات الطرف الأساسية في الأعلى.</div>
          </TabsContent>

          {/* تبويب الفواتير */}
          <TabsContent value="invoices" className="mt-0">
            <Card className="shadow border border-gray-100 dark:border-zinc-800 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>الفواتير</CardTitle>
                <Button
                  size="sm"
                  className="bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold rounded-lg border border-blue-200 px-3 py-1 flex items-center gap-1"
                  onClick={() => navigate(`/commercial/invoices/new?party_id=${party.id}`)}
                  type="button"
                >
                  <FileText className="h-4 w-4" /> إنشاء فاتورة
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingInvoices ? (
                  <div className="py-6 text-center">
                    <Skeleton className="h-6 w-full max-w-md mx-auto" />
                    <Skeleton className="h-16 w-full mt-4" />
                  </div>
                ) : invoices && invoices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm rtl text-right min-w-[700px]">
                      <thead>
                        <tr className="border-b bg-gray-50 dark:bg-zinc-800">
                          <th className="py-2 px-4 font-bold text-gray-700 dark:text-gray-300">#</th>
                          <th className="py-2 px-4 font-bold text-gray-700 dark:text-gray-300">التاريخ</th>
                          <th className="py-2 px-4 font-bold text-gray-700 dark:text-gray-300">النوع</th>
                          <th className="py-2 px-4 font-bold text-gray-700 dark:text-gray-300">المبلغ</th>
                          <th className="py-2 px-4 font-bold text-gray-700 dark:text-gray-300">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv, i) => (
                          <tr key={inv.id} className="border-b hover:bg-green-50 dark:hover:bg-green-900/10">
                            <td className="py-2 px-4">{i + 1}</td>
                            <td className="py-2 px-4">{inv.date ? format(new Date(inv.date), 'yyyy-MM-dd') : '-'}</td>
                            <td className="py-2 px-4">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${inv.invoice_type === 'sale' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{inv.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'}</span>
                            </td>
                            <td className="py-2 px-4 font-bold" dir="ltr">{inv.total_amount?.toFixed(2) || '-'}</td>
                            <td className="py-2 px-4">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{inv.status === 'paid' ? 'مدفوعة' : inv.status === 'partial' ? 'مدفوعة جزئياً' : 'غير مدفوعة'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-10 text-center text-muted-foreground">لا توجد فواتير لهذا الطرف</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب المدفوعات */}
          <TabsContent value="payments" className="mt-0">
            <Card className="shadow border border-gray-100 dark:border-zinc-800 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>المدفوعات</CardTitle>
                <Button
                  size="sm"
                  className="bg-green-100 hover:bg-green-200 text-green-900 font-bold rounded-lg border border-green-200 px-3 py-1 flex items-center gap-1"
                  onClick={() => setIsAddPaymentDialogOpen(true)}
                  type="button"
                >
                  <Banknote className="h-4 w-4" /> تسجيل دفعة
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingPayments ? (
                  <div className="py-6 text-center">
                    <Skeleton className="h-6 w-full max-w-md mx-auto" />
                    <Skeleton className="h-16 w-full mt-4" />
                  </div>
                ) : payments && payments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm rtl text-right min-w-[600px]">
                      <thead>
                        <tr className="border-b bg-gray-50 dark:bg-zinc-800">
                          <th className="py-2 px-4 font-bold text-gray-700 dark:text-gray-300">#</th>
                          <th className="py-2 px-4 font-bold text-gray-700 dark:text-gray-300">التاريخ</th>
                          <th className="py-2 px-4 font-bold text-gray-700 dark:text-gray-300">النوع</th>
                          <th className="py-2 px-4 font-bold text-gray-700 dark:text-gray-300">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((pay, i) => (
                          <tr key={pay.id} className="border-b hover:bg-green-50 dark:hover:bg-green-900/10">
                            <td className="py-2 px-4">{i + 1}</td>
                            <td className="py-2 px-4">{pay.date ? format(new Date(pay.date), 'yyyy-MM-dd') : '-'}</td>
                            <td className="py-2 px-4">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${pay.payment_type === 'collection' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{pay.payment_type === 'collection' ? 'دفعة مستلمة' : 'دفعة مدفوعة'}</span>
                            </td>
                            <td className="py-2 px-4 font-bold" dir="ltr">{pay.amount?.toFixed(2) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-10 text-center text-muted-foreground">لا توجد مدفوعات لهذا الطرف</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب سجل الحساب */}
          <TabsContent value="ledger" className="mt-0">
            <Card className="shadow border border-gray-100 dark:border-zinc-800 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>سجل الحساب</CardTitle>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => navigate(`/commercial/ledger?partyId=${party.id}`)}
                >
                  <FileText className="h-4 w-4" />
                  طباعة سجل الحساب
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingLedger ? (
                  <div className="py-6 text-center">
                    <Skeleton className="h-6 w-full max-w-md mx-auto" />
                    <Skeleton className="h-16 w-full mt-4" />
                  </div>
                ) : ledgerEntries && ledgerEntries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm rtl text-right min-w-[700px]">
                      <thead>
                        <tr className="border-b bg-gray-50 dark:bg-zinc-800">
                          <th className="py-2 px-4 font-bold text-gray-700 dark:text-gray-300">التاريخ</th>
                          <th className="py-2 px-4 font-bold text-gray-700 dark:text-gray-300">المعاملة</th>
                          <th className="py-2 px-4 font-bold text-gray-700 dark:text-gray-300">مدين</th>
                          <th className="py-2 px-4 font-bold text-gray-700 dark:text-gray-300">دائن</th>
                          <th className="py-2 px-4 font-bold text-gray-700 dark:text-gray-300">الرصيد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerEntries.map(entry => (
                          <tr key={entry.id} className="border-b hover:bg-green-50 dark:hover:bg-green-900/10">
                            <td className="py-2 px-4">{entry.date}</td>
                            <td className="py-2 px-4">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-bold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300`}>
                                {entry.transaction_type === 'sale_invoice' ? 'فاتورة مبيعات' :
                                 entry.transaction_type === 'purchase_invoice' ? 'فاتورة مشتريات' :
                                 entry.transaction_type === 'payment_received' ? 'دفعة مستلمة' :
                                 entry.transaction_type === 'payment_made' ? 'دفعة مدفوعة' :
                                 entry.transaction_type === 'sales_return' ? 'مرتجع مبيعات' :
                                 entry.transaction_type === 'purchase_return' ? 'مرتجع مشتريات' :
                                 entry.transaction_type === 'opening_balance' ? 'رصيد افتتاحي' :
                                 entry.transaction_type}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-red-600 font-bold" dir="ltr">
                              {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
                            </td>
                            <td className="py-2 px-4 text-green-700 font-bold" dir="ltr">
                              {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
                            </td>
                            <td className={`py-2 px-4 font-bold ${entry.balance_after > 0 ? 'text-red-700' : entry.balance_after < 0 ? 'text-green-700' : 'text-gray-700'}`} dir="ltr">
                              {Math.abs(entry.balance_after).toFixed(2)} {entry.balance_after > 0 ? '(مدين)' : entry.balance_after < 0 ? '(دائن)' : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-10 text-center text-muted-foreground">لا توجد حركات في سجل الحساب</div>
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

      <Dialog open={isAddPaymentDialogOpen} onOpenChange={setIsAddPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة جديدة للطرف</DialogTitle>
          </DialogHeader>
          <PaymentForm
            onSubmit={async (paymentData) => {
              // Use the correct PaymentService method for adding a payment
              const paymentService = window.PaymentService?.getInstance?.() || null;
              if (paymentService && typeof paymentService.create === 'function') {
                await paymentService.create({ ...paymentData, party_id: party.id });
              } else {
                // fallback: try PaymentEntity.create
                const PaymentEntity = (await import('@/services/commercial/payment/PaymentEntity')).default;
                await PaymentEntity.create({ ...paymentData, party_id: party.id });
              }
              setIsAddPaymentDialogOpen(false);
              if (typeof refetchParty === 'function') refetchParty();
            }}
            parties={[party]}
            initialData={{ party_id: party.id }}
            invoices={invoices || []}
          />
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

export default PartyDetails;
