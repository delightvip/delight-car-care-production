
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PartyService from '@/services/PartyService';
import CommercialService from '@/services/CommercialService';
import PageTransition from '@/components/ui/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Plus, Receipt, FileText, Banknote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PartyForm } from '@/components/parties/PartyForm';
import { PaymentForm } from '@/components/commercial/PaymentForm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PartyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  const partyService = PartyService.getInstance();
  const commercialService = CommercialService.getInstance();
  
  const { data: party, isLoading: partyLoading, refetch: refetchParty } = useQuery({
    queryKey: ['party', id],
    queryFn: () => partyService.getPartyById(id!),
    enabled: !!id,
  });
  
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['party-transactions', id],
    queryFn: () => partyService.getPartyTransactions(id!),
    enabled: !!id,
  });
  
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['party-invoices', id],
    queryFn: () => commercialService.getInvoicesByParty(id!),
    enabled: !!id,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['party-payments', id],
    queryFn: () => commercialService.getPaymentsByParty(id!),
    enabled: !!id,
  });
  
  const handleUpdateParty = async (updatedData: any) => {
    if (id) {
      await partyService.updateParty(id, updatedData);
      refetchParty();
      setIsEditDialogOpen(false);
    }
  };
  
  const handlePaymentSubmit = async (paymentData: any) => {
    await commercialService.recordPayment({
      ...paymentData,
      party_id: id!,
      party_name: party?.name,
    });
    refetchParty();
    setIsPaymentDialogOpen(false);
  };
  
  if (partyLoading || !party) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/commercial/parties')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              عودة
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">تفاصيل الطرف التجاري</h1>
          </div>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        </div>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/commercial/parties')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              عودة
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{party.name}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={party.type === 'customer' ? 'default' : party.type === 'supplier' ? 'secondary' : 'outline'}>
                  {party.type === 'customer' ? 'عميل' : party.type === 'supplier' ? 'مورد' : 'أخرى'}
                </Badge>
                <Badge variant={party.balance > 0 ? 'destructive' : 'success'} className="mr-2">
                  {`الرصيد: ${Math.abs(party.balance).toFixed(2)} (${party.balance > 0 ? 'مدين' : party.balance < 0 ? 'دائن' : 'متزن'})`}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              تعديل
            </Button>
            <Button onClick={() => setIsPaymentDialogOpen(true)} variant="secondary">
              <Receipt className="mr-2 h-4 w-4" />
              تسجيل دفعة
            </Button>
            <Button 
              onClick={() => navigate(`/commercial/invoices/new?party=${id}`)} 
              variant={party.type === 'customer' ? 'default' : 'outline'}
            >
              <Plus className="mr-2 h-4 w-4" />
              {party.type === 'customer' ? 'فاتورة مبيعات جديدة' : 'فاتورة مشتريات جديدة'}
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="transactions">المعاملات المالية</TabsTrigger>
            <TabsTrigger value="invoices">الفواتير</TabsTrigger>
            <TabsTrigger value="payments">المدفوعات</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>معلومات الاتصال</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">رقم الهاتف:</dt>
                      <dd>{party.phone || 'غير محدد'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">البريد الإلكتروني:</dt>
                      <dd>{party.email || 'غير محدد'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">العنوان:</dt>
                      <dd>{party.address || 'غير محدد'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">تاريخ الإنشاء:</dt>
                      <dd>{format(new Date(party.created_at), 'yyyy-MM-dd')}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>معلومات الحساب</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">رصيد الافتتاح:</dt>
                      <dd>{party.opening_balance.toFixed(2)} ({party.balance_type === 'debit' ? 'مدين' : 'دائن'})</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">الرصيد الحالي:</dt>
                      <dd className={party.balance > 0 ? 'text-destructive font-medium' : party.balance < 0 ? 'text-green-600 font-medium' : ''}>
                        {Math.abs(party.balance).toFixed(2)} ({party.balance > 0 ? 'مدين' : party.balance < 0 ? 'دائن' : 'متزن'})
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">عدد الفواتير:</dt>
                      <dd>{invoices?.length || 0}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">عدد الدفعات:</dt>
                      <dd>{payments?.length || 0}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>ملخص النشاط</CardTitle>
                  <CardDescription>آخر 5 معاملات للطرف التجاري</CardDescription>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <p className="text-muted-foreground text-center py-4">جاري تحميل البيانات...</p>
                  ) : transactions && transactions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>المعاملة</TableHead>
                          <TableHead>الوصف</TableHead>
                          <TableHead>مدين</TableHead>
                          <TableHead>دائن</TableHead>
                          <TableHead>الرصيد</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.slice(0, 5).map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>{format(new Date(tx.transaction_date), 'yyyy-MM-dd')}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {tx.transaction_type === 'sale_invoice' ? 'فاتورة مبيعات' :
                                  tx.transaction_type === 'purchase_invoice' ? 'فاتورة مشتريات' :
                                  tx.transaction_type === 'payment_received' ? 'دفعة مستلمة' :
                                  tx.transaction_type === 'payment_made' ? 'دفعة مسددة' : tx.transaction_type}
                              </Badge>
                            </TableCell>
                            <TableCell>{tx.description || '-'}</TableCell>
                            <TableCell>{tx.debit > 0 ? tx.debit.toFixed(2) : '-'}</TableCell>
                            <TableCell>{tx.credit > 0 ? tx.credit.toFixed(2) : '-'}</TableCell>
                            <TableCell className={tx.balance > 0 ? 'text-destructive' : tx.balance < 0 ? 'text-green-600' : ''}>
                              {Math.abs(tx.balance).toFixed(2)} {tx.balance > 0 ? '(مدين)' : tx.balance < 0 ? '(دائن)' : ''}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">لا توجد معاملات لعرضها</p>
                  )}
                  {transactions && transactions.length > 5 && (
                    <div className="flex justify-center mt-4">
                      <Button variant="ghost" onClick={() => setActiveTab('transactions')}>
                        عرض جميع المعاملات
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="transactions" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>المعاملات المالية</CardTitle>
                <CardDescription>سجل كامل بجميع المعاملات المالية للطرف التجاري</CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <p className="text-muted-foreground text-center py-4">جاري تحميل البيانات...</p>
                ) : transactions && transactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>المعاملة</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>المرجع</TableHead>
                        <TableHead>مدين</TableHead>
                        <TableHead>دائن</TableHead>
                        <TableHead>الرصيد</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{format(new Date(tx.transaction_date), 'yyyy-MM-dd')}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {tx.transaction_type === 'sale_invoice' ? 'فاتورة مبيعات' :
                                tx.transaction_type === 'purchase_invoice' ? 'فاتورة مشتريات' :
                                tx.transaction_type === 'payment_received' ? 'دفعة مستلمة' :
                                tx.transaction_type === 'payment_made' ? 'دفعة مسددة' : tx.transaction_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{tx.description || '-'}</TableCell>
                          <TableCell>
                            {tx.reference ? 
                              <Button variant="link" className="p-0 h-auto" onClick={() => {
                                if (tx.transaction_type === 'sale_invoice' || tx.transaction_type === 'purchase_invoice') {
                                  navigate(`/commercial/invoices/${tx.reference}`);
                                }
                              }}>
                                {tx.reference.substring(0, 8)}...
                              </Button> : '-'}
                          </TableCell>
                          <TableCell>{tx.debit > 0 ? tx.debit.toFixed(2) : '-'}</TableCell>
                          <TableCell>{tx.credit > 0 ? tx.credit.toFixed(2) : '-'}</TableCell>
                          <TableCell className={tx.balance > 0 ? 'text-destructive' : tx.balance < 0 ? 'text-green-600' : ''}>
                            {Math.abs(tx.balance).toFixed(2)} {tx.balance > 0 ? '(مدين)' : tx.balance < 0 ? '(دائن)' : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-6 text-muted-foreground">لا توجد معاملات لعرضها</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="invoices" className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>الفواتير</CardTitle>
                  <CardDescription>جميع فواتير {party.type === 'customer' ? 'المبيعات' : 'المشتريات'} المرتبطة</CardDescription>
                </div>
                <Button onClick={() => navigate(`/commercial/invoices/new?party=${id}`)}>
                  <Plus className="mr-2 h-4 w-4" />
                  فاتورة جديدة
                </Button>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <p className="text-muted-foreground text-center py-4">جاري تحميل البيانات...</p>
                ) : invoices && invoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الفاتورة</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>ملاحظات</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.id.substring(0, 8)}...</TableCell>
                          <TableCell>{format(new Date(invoice.date), 'yyyy-MM-dd')}</TableCell>
                          <TableCell>{invoice.total_amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={
                              invoice.status === 'paid' ? 'success' :
                              invoice.status === 'partial' ? 'warning' : 'destructive'
                            }>
                              {invoice.status === 'paid' ? 'مدفوعة' :
                               invoice.status === 'partial' ? 'مدفوعة جزئياً' : 'غير مدفوعة'}
                            </Badge>
                          </TableCell>
                          <TableCell>{invoice.notes || '-'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/commercial/invoices/${invoice.id}`)}>
                              <FileText className="h-4 w-4 mr-2" />
                              عرض
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-6 text-muted-foreground">لا توجد فواتير لعرضها</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payments" className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>المدفوعات</CardTitle>
                  <CardDescription>سجل المدفوعات المستلمة والمسددة</CardDescription>
                </div>
                <Button onClick={() => setIsPaymentDialogOpen(true)}>
                  <Banknote className="mr-2 h-4 w-4" />
                  تسجيل دفعة جديدة
                </Button>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <p className="text-muted-foreground text-center py-4">جاري تحميل البيانات...</p>
                ) : payments && payments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم المعاملة</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>طريقة الدفع</TableHead>
                        <TableHead>الفاتورة المرتبطة</TableHead>
                        <TableHead>ملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.id?.substring(0, 8)}...</TableCell>
                          <TableCell>
                            <Badge variant={payment.payment_type === 'collection' ? 'success' : 'destructive'}>
                              {payment.payment_type === 'collection' ? 'تحصيل' : 'سداد'}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(payment.date), 'yyyy-MM-dd')}</TableCell>
                          <TableCell>{payment.amount.toFixed(2)}</TableCell>
                          <TableCell>{payment.method === 'cash' ? 'نقدي' : 
                                      payment.method === 'check' ? 'شيك' : 
                                      payment.method === 'bank_transfer' ? 'تحويل بنكي' : payment.method}</TableCell>
                          <TableCell>
                            {payment.related_invoice_id ? (
                              <Button variant="link" className="p-0 h-auto" onClick={() => 
                                navigate(`/commercial/invoices/${payment.related_invoice_id}`)
                              }>
                                {payment.related_invoice_id.substring(0, 8)}...
                              </Button>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{payment.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-6 text-muted-foreground">لا توجد مدفوعات لعرضها</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      
        {/* Edit Party Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>تعديل بيانات {party.name}</DialogTitle>
            </DialogHeader>
            <PartyForm initialData={party} onSubmit={handleUpdateParty} />
          </DialogContent>
        </Dialog>
        
        {/* Add Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>تسجيل دفعة {party.type === 'customer' ? 'مستلمة من' : 'مسددة إلى'} {party.name}</DialogTitle>
            </DialogHeader>
            <PaymentForm
              partyId={id!}
              partyType={party.type}
              initialData={{
                payment_type: party.type === 'customer' ? 'collection' : 'disbursement',
              }}
              onSubmit={handlePaymentSubmit}
            />
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default PartyDetails;
