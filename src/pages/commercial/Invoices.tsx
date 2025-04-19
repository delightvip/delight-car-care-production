import React, { useState, useEffect } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CommercialService, { Invoice } from '@/services/CommercialService';
import PartyService from '@/services/PartyService';
import InventoryService from '@/services/InventoryService';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, 
  Search, 
  FileDown, 
  FileText, 
  MoreHorizontal, 
  Printer,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Download
} from 'lucide-react';
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
import { InvoiceForm } from '@/components/commercial/InvoiceForm';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import InvoiceStatusBadge from '@/components/commercial/InvoiceStatusBadge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';

const Invoices = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const commercialService = CommercialService.getInstance();
  const partyService = PartyService.getInstance();
  const inventoryService = InventoryService.getInstance();
  
  const { data: invoices, isLoading: isLoadingInvoices, error: invoicesError, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      console.log('Fetching invoices...');
      const result = await commercialService.getInvoices();
      console.log('Invoices fetched:', result);
      return result;
    },
    refetchInterval: 30000,
  });
  
  const { data: parties, isLoading: isLoadingParties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => partyService.getParties(),
  });
  
  const { data: rawMaterials, isLoading: isLoadingRawMaterials } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: () => inventoryService.getRawMaterials(),
  });
  
  const { data: packaging, isLoading: isLoadingPackaging } = useQuery({
    queryKey: ['packaging'],
    queryFn: () => inventoryService.getPackagingMaterials(),
  });
  
  const { data: semiFinished, isLoading: isLoadingSemiFinished } = useQuery({
    queryKey: ['semiFinished'],
    queryFn: () => inventoryService.getSemiFinishedProducts(),
  });
  
  const { data: finished, isLoading: isLoadingFinished } = useQuery({
    queryKey: ['finished'],
    queryFn: () => inventoryService.getFinishedProducts(),
  });
  
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  }, [queryClient]);
  
  const inventoryItems = React.useMemo(() => {
    const items = [];
    
    if (rawMaterials) {
      items.push(...rawMaterials.map(item => ({
        id: item.id,
        name: item.name,
        type: 'raw_materials' as const,
        quantity: item.quantity,
        unit_cost: item.unit_cost
      })));
    }
    
    if (packaging) {
      items.push(...packaging.map(item => ({
        id: item.id,
        name: item.name,
        type: 'packaging_materials' as const,
        quantity: item.quantity,
        unit_cost: item.unit_cost || 0
      })));
    }
    
    if (semiFinished) {
      items.push(...semiFinished.map(item => ({
        id: item.id,
        name: item.name,
        type: 'semi_finished_products' as const,
        quantity: item.quantity,
        unit_cost: item.unit_cost
      })));
    }
    
    if (finished) {
      items.push(...finished.map(item => ({
        id: item.id,
        name: item.name,
        type: 'finished_products' as const,
        quantity: item.quantity,
        unit_cost: item.unit_cost
      })));
    }
    
    return items;
  }, [rawMaterials, packaging, semiFinished, finished]);
  
  const statusOptions = [
    { value: 'all', label: 'كل الحالات' },
    { value: 'draft', label: 'مسودة' },
    { value: 'confirmed', label: 'مؤكدة' },
    { value: 'cancelled', label: 'ملغية' },
  ];
  const paymentOptions = [
    { value: 'all', label: 'كل حالات الدفع' },
    { value: 'paid', label: 'مدفوعة' },
    { value: 'partial', label: 'مدفوعة جزئياً' },
    { value: 'unpaid', label: 'غير مدفوعة' },
  ];
  
  const initialDateFrom = dateRange.from;
  const initialDateTo = dateRange.to;

  const filteredInvoices = (invoices || []).filter((invoice) => {
    if (statusFilter !== 'all' && invoice.payment_status !== statusFilter) return false;
    if (paymentStatusFilter !== 'all' && invoice.status !== paymentStatusFilter) return false;
    if (activeTab !== 'all' && invoice.invoice_type !== activeTab) return false;
    let match = true;
    if (dateRange.from && dateRange.to) {
      const invoiceDate = new Date(invoice.date);
      match =
        invoiceDate >= new Date(dateRange.from.setHours(0,0,0,0)) &&
        invoiceDate <= new Date(dateRange.to.setHours(23,59,59,999));
    }
    if (!searchQuery) return match;
    return (
      match && (
        String(invoice.id).includes(searchQuery) ||
        (invoice.party_name && invoice.party_name.includes(searchQuery))
      )
    );
  });
  
  const handleCreateInvoice = async (invoiceData: Omit<Invoice, 'id' | 'created_at'>) => {
    try {
      const formattedData = {
        ...invoiceData,
        payment_status: 'draft' as "draft" | "confirmed" | "cancelled",
        status: invoiceData.status as "paid" | "partial" | "unpaid",
        date: invoiceData.date,
        invoice_type: invoiceData.invoice_type as "sale" | "purchase",
        notes: invoiceData.notes,
        party_id: invoiceData.party_id,
        total_amount: invoiceData.total_amount,
        party_name: invoiceData.party_name,
        items: invoiceData.items
      };

      const result = await commercialService.createInvoice(formattedData);
      
      if (result) {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['parties'] });
        setIsAddDialogOpen(false);
        toast.success('تم إنشاء الفاتورة بنجاح');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
    }
  };
  
  const handleDeleteClick = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    
    try {
      const success = await commercialService.deleteInvoice(invoiceToDelete.id);
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        setIsDeleteDialogOpen(false);
        setInvoiceToDelete(null);
        toast.success('تم حذف الفاتورة بنجاح');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('حدث خطأ أثناء حذف الفاتورة');
    }
  };
  
  const handleConfirmInvoice = async () => {
    if (!selectedInvoiceId) return;
    
    try {
      console.log('Confirming invoice:', selectedInvoiceId);
      const success = await commercialService.confirmInvoice(selectedInvoiceId);
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['parties'] });
        setIsConfirmDialogOpen(false);
        setSelectedInvoiceId(null);
      }
    } catch (error) {
      console.error('Error confirming invoice:', error);
      toast.error('حدث خطأ أثناء تأكيد الفاتورة');
    }
  };
  
  const handleCancelInvoice = async () => {
    if (!selectedInvoiceId) return;
    
    try {
      const success = await commercialService.cancelInvoice(selectedInvoiceId);
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['parties'] });
        setIsCancelDialogOpen(false);
        setSelectedInvoiceId(null);
      }
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast.error('حدث خطأ أثناء إلغاء الفاتورة');
    }
  };
  
  const toArabicNumber = (num: number|string) => {
    const rounded = Number(num).toFixed(2);
    return String(rounded).replace(/[0-9]/g, d => String.fromCharCode(d.charCodeAt(0) + 0x0660 - 48));
  };

  const handleExportInvoices = () => {
    try {
      if (!filteredInvoices.length) {
        toast.warning('لا توجد فواتير للتصدير');
        return;
      }
      // إضافة BOM لدعم Excel
      let csvContent = '\uFEFFرقم الفاتورة,النوع,الطرف,التاريخ,المبلغ,الحالة,حالة الفاتورة\n';
      filteredInvoices.forEach(invoice => {
        csvContent += `${invoice.id},`;
        csvContent += `${invoice.invoice_type === 'sale' ? 'بيع' : 'شراء'},`;
        csvContent += `"${invoice.party_name || ''}",`;
        csvContent += `${format(new Date(invoice.date), 'yyyy-MM-dd')},`;
        csvContent += `${toArabicNumber(invoice.total_amount)},`;
        csvContent += `${invoice.status},`;
        csvContent += `${invoice.payment_status || ''}\n`;
      });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `invoices_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('تم تصدير الفواتير بنجاح');
    } catch (error) {
      console.error('Error exporting invoices:', error);
      toast.error('حدث خطأ أثناء تصدير الفواتير');
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">مدفوعة</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500">مدفوعة جزئياً</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-500">غير مدفوعة</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const isLoading = 
    isLoadingInvoices || 
    isLoadingParties || 
    isLoadingRawMaterials || 
    isLoadingPackaging || 
    isLoadingSemiFinished || 
    isLoadingFinished;
  
  const handleEditClick = (invoice: Invoice) => {
    navigate(`/commercial/invoices/edit/${invoice.id}`);
  };
  
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex flex-row items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">الفواتير</h1>
              <p className="text-muted-foreground">إدارة فواتير المبيعات والمشتريات</p>
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </PageTransition>
    );
  }
  
  if (invoicesError) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">الفواتير</h1>
          <div className="bg-destructive/10 p-4 rounded-md text-destructive">
            <p>حدث خطأ أثناء تحميل البيانات. الرجاء المحاولة مرة أخرى.</p>
            <p>{String(invoicesError)}</p>
          </div>
          <Button onClick={() => refetch()}>إعادة المحاولة</Button>
        </div>
      </PageTransition>
    );
  }
  
  const statusColor = {
    paid: 'bg-green-50 text-green-700 border-green-200',
    partial: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    unpaid: 'bg-red-50 text-red-700 border-red-200',
  };

  const statusLabel = {
    paid: 'مدفوعة',
    partial: 'مدفوعة جزئياً',
    unpaid: 'غير مدفوعة',
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">الفواتير</h1>
            <p className="text-muted-foreground">إدارة فواتير المبيعات والمشتريات</p>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="rounded-lg bg-green-200 hover:bg-green-300 text-green-900 font-bold px-5 py-2.5 flex items-center gap-2 shadow border-2 border-green-300 focus:ring-2 focus:ring-green-100 focus:border-green-400 text-base"
          >
            <PlusCircle className="h-5 w-5" />
            فاتورة جديدة
          </Button>
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="sale">المبيعات</TabsTrigger>
            <TabsTrigger value="purchase">المشتريات</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <Card className="w-full shadow border border-gray-100 rounded-2xl overflow-hidden mb-8">
              <CardHeader className="bg-gray-50 dark:bg-zinc-900 py-4 px-6 border-b border-gray-50 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-2xl font-bold text-primary-800 dark:text-primary-200 tracking-tight flex items-center gap-2">
                  <FileText className="h-6 w-6 text-primary-400 dark:text-primary-300" />
                  قائمة الفواتير
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                  <div className="flex gap-2">
                    <div className="w-36">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="حالة المعاملة" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-36">
                      <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="حالة الدفع" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center mb-4">
                    <DateRangePicker
                      className="min-w-[260px]"
                      initialDateFrom={initialDateFrom}
                      initialDateTo={initialDateTo}
                      onUpdate={({ range }) => setDateRange(range)}
                      align="end"
                    />
                  </div>
                  <Button variant="outline" className="border-primary text-primary" onClick={handleExportInvoices}>
                    <FileDown className="mr-2 h-4 w-4" /> تصدير
                  </Button>
                  <Button onClick={() => setIsAddDialogOpen(true)} className="bg-green-200 hover:bg-green-300 text-green-900">
                    <PlusCircle className="mr-2 h-4 w-4" /> فاتورة جديدة
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-full divide-y divide-gray-100">
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="px-4 py-3 text-right text-xs font-bold text-gray-500 tracking-wide">#</TableHead>
                        <TableHead className="px-4 py-3 text-right text-xs font-bold text-gray-500 tracking-wide">النوع</TableHead>
                        <TableHead className="px-4 py-3 text-right text-xs font-bold text-gray-500 tracking-wide">الطرف</TableHead>
                        <TableHead className="px-4 py-3 text-right text-xs font-bold text-gray-500 tracking-wide">التاريخ</TableHead>
                        <TableHead className="px-4 py-3 text-right text-xs font-bold text-gray-500 tracking-wide">المبلغ</TableHead>
                        <TableHead className="px-4 py-3 text-right text-xs font-bold text-gray-500 tracking-wide">الحالة</TableHead>
                        <TableHead className="px-4 py-3 text-right text-xs font-bold text-gray-500 tracking-wide">حالة الفاتورة</TableHead>
                        <TableHead className="px-4 py-3 text-right text-xs font-bold text-gray-500 tracking-wide">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-lg">
                            لا توجد فواتير مطابقة
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInvoices.map((invoice, idx) => (
                          <TableRow
                            key={invoice.id}
                            className="hover:bg-primary/10 transition-colors border-b border-gray-50 group"
                            onClick={() => navigate(`/commercial/invoices/${invoice.id}`)}
                            style={{ cursor: 'pointer' }}
                          >
                            <TableCell className="px-4 py-3 font-semibold text-primary-700 text-base">{invoice.id}</TableCell>
                            <TableCell className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 border text-xs font-semibold ${invoice.invoice_type === 'sale' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                {invoice.invoice_type === 'sale' ? 'بيع' : 'شراء'}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-3 font-medium text-gray-700">{invoice.party_name}</TableCell>
                            <TableCell className="px-4 py-3 text-gray-500">{format(new Date(invoice.date), 'yyyy/MM/dd')}</TableCell>
                            <TableCell className="px-4 py-3 font-bold text-primary-700">{Number(invoice.total_amount).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</TableCell>
                            <TableCell className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 border text-xs font-semibold ${statusColor[invoice.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                <span className="w-2 h-2 rounded-full inline-block" style={{ background: invoice.status === 'paid' ? '#22c55e' : invoice.status === 'partial' ? '#eab308' : '#ef4444' }}></span>
                                {statusLabel[invoice.status] || invoice.status}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <InvoiceStatusBadge status={invoice.payment_status} />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="flex gap-1 items-center child:opacity-80 child-hover:opacity-100" onClick={e => e.stopPropagation()}>
                                <Button size="icon" variant="ghost" onClick={() => navigate(`/commercial/invoices/${invoice.id}`)} title="عرض التفاصيل">
                                  <FileText className="h-4 w-4 text-primary-500" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => handleEditClick(invoice)} title="تعديل">
                                  <Edit className="h-4 w-4 text-blue-500" />
                                </Button>
                                {invoice.payment_status === 'draft' ? (
                                  <Button size="icon" variant="ghost" onClick={() => handleDeleteClick(invoice)} title="حذف">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                ) : invoice.payment_status === 'confirmed' ? (
                                  <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); setSelectedInvoiceId(invoice.id); setIsCancelDialogOpen(true); }} title="إلغاء">
                                    <XCircle className="h-4 w-4 text-orange-500" />
                                  </Button>
                                ) : null}
                                {invoice.payment_status === 'draft' && (
                                  <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); setSelectedInvoiceId(invoice.id); setIsConfirmDialogOpen(true); }} title="تأكيد الفاتورة">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
            <DialogDescription>
              قم بإدخال بيانات الفاتورة وإضافة العناصر.
            </DialogDescription>
          </DialogHeader>
          {parties && inventoryItems && (
            <InvoiceForm 
              onSubmit={handleCreateInvoice} 
              parties={parties} 
              items={inventoryItems}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الفاتورة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه الفاتورة؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteInvoice} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الفاتورة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من تأكيد هذه الفاتورة؟ سيتم تحديث المخزون وحساب الطرف المرتبط بها.
              <br />
              لا يمكن تعديل الفاتورة بعد تأكيدها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmInvoice} className="bg-green-600 hover:bg-green-700">
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء الفاتورة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إلغاء هذه الفاتورة؟ سيتم إلغاء تأثيرها على حساب الطرف المرتبط بها والمخزون.
              <br />
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelInvoice} className="bg-red-600 hover:bg-red-700">
              تأكيد الإلغاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
};

export default Invoices;
