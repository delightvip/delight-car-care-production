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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import InvoiceStatusBadge from '@/components/commercial/InvoiceStatusBadge';

const Invoices = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  
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
  
  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return [];
    
    let filtered = invoices;
    
    if (activeTab !== 'all') {
      filtered = invoices.filter(invoice => invoice.invoice_type === activeTab);
    }
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(invoice => 
        invoice.party_name?.toLowerCase().includes(query) ||
        invoice.id.toLowerCase().includes(query) ||
        invoice.total_amount.toString().includes(query)
      );
    }
    
    return filtered;
  }, [invoices, activeTab, searchQuery]);
  
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
  
  const handleExportInvoices = () => {
    try {
      if (!filteredInvoices.length) {
        toast.warning('لا توجد فواتير للتصدير');
        return;
      }
      
      let csvContent = 'رقم الفاتورة,النوع,الطرف,التاريخ,المبلغ,الحالة,حالة المعاملة\n';
      
      filteredInvoices.forEach(invoice => {
        csvContent += `${invoice.id},`;
        csvContent += `${invoice.invoice_type === 'sale' ? 'بيع' : 'شراء'},`;
        csvContent += `"${invoice.party_name || ''}",`;
        csvContent += `${format(new Date(invoice.date), 'yyyy-MM-dd')},`;
        csvContent += `${invoice.total_amount.toFixed(2)},`;
        csvContent += `${invoice.status},`;
        csvContent += `${invoice.payment_status}\n`;
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
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">الفواتير</h1>
            <p className="text-muted-foreground">إدارة فواتير المبيعات والمشتريات</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> إنشاء فاتورة جديدة
          </Button>
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="sale">المبيعات</TabsTrigger>
            <TabsTrigger value="purchase">المشتريات</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold">
                  {activeTab === 'all' ? 'جميع الفواتير' :
                   activeTab === 'sale' ? 'فواتير المبيعات' : 'فواتير المشتريات'}
                </CardTitle>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث في الفواتير..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={handleExportInvoices} title="تصدير إلى CSV">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">رقم الفاتورة</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الطرف</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>حالة المعاملة</TableHead>
                      <TableHead className="text-center w-[100px]">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length > 0 ? (
                      filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            {invoice.invoice_type === 'sale' ? 'بيع' : 'شراء'}
                          </TableCell>
                          <TableCell>{invoice.party_name}</TableCell>
                          <TableCell>
                            {format(new Date(invoice.date), 'yyyy-MM-dd')}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {invoice.total_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell>
                            <InvoiceStatusBadge status={invoice.payment_status} />
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">فتح القائمة</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/commercial/invoices/${invoice.id}`)}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  <span>عرض التفاصيل</span>
                                </DropdownMenuItem>
                                
                                {invoice.payment_status === 'draft' && (
                                  <>
                                    <DropdownMenuItem onClick={() => navigate(`/commercial/invoices/edit/${invoice.id}`)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      <span>تعديل</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedInvoiceId(invoice.id);
                                      setIsConfirmDialogOpen(true);
                                    }}>
                                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                      <span>تأكيد الفاتورة</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteClick(invoice)}>
                                      <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                                      <span>حذف</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                                
                                {invoice.payment_status === 'confirmed' && (
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedInvoiceId(invoice.id);
                                    setIsCancelDialogOpen(true);
                                  }}>
                                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                    <span>إلغاء الفاتورة</span>
                                  </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuItem onClick={() => window.print()}>
                                  <Printer className="mr-2 h-4 w-4" />
                                  <span>طباعة</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                          لا توجد فواتير للعرض
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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
