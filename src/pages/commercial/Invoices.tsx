
import React, { useState } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
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
  Edit
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

const Invoices = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  
  const navigate = useNavigate();
  
  const commercialService = CommercialService.getInstance();
  const partyService = PartyService.getInstance();
  const inventoryService = InventoryService.getInstance();
  
  // استعلام جلب بيانات الفواتير
  const { data: invoices, isLoading: isLoadingInvoices, error: invoicesError, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => commercialService.getInvoices(),
    refetchInterval: 60000, // تحديث كل دقيقة
    refetchOnWindowFocus: false,
  });
  
  // استعلام جلب بيانات الأطراف التجارية
  const { data: parties, isLoading: isLoadingParties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => partyService.getParties(),
    refetchOnWindowFocus: false,
  });
  
  // استعلام جلب بيانات المنتجات
  const { data: rawMaterials, isLoading: isLoadingRawMaterials } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: () => inventoryService.getRawMaterials(),
    refetchOnWindowFocus: false,
  });
  
  const { data: packaging, isLoading: isLoadingPackaging } = useQuery({
    queryKey: ['packaging'],
    queryFn: () => inventoryService.getPackagingMaterials(),
    refetchOnWindowFocus: false,
  });
  
  const { data: semiFinished, isLoading: isLoadingSemiFinished } = useQuery({
    queryKey: ['semiFinished'],
    queryFn: () => inventoryService.getSemiFinishedProducts(),
    refetchOnWindowFocus: false,
  });
  
  const { data: finished, isLoading: isLoadingFinished } = useQuery({
    queryKey: ['finished'],
    queryFn: () => inventoryService.getFinishedProducts(),
    refetchOnWindowFocus: false,
  });
  
  // تحضير بيانات العناصر للنموذج
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
  
  // تصفية الفواتير حسب النوع المحدد والبحث
  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return [];
    
    let filtered = invoices;
    
    // تصفية حسب النوع
    if (activeTab !== 'all') {
      filtered = invoices.filter(invoice => invoice.invoice_type === activeTab);
    }
    
    // تصفية حسب البحث
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
      await commercialService.createInvoice(invoiceData);
      refetch();
      setIsAddDialogOpen(false);
      toast.success('تم إنشاء الفاتورة بنجاح');
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
        refetch();
        setIsDeleteDialogOpen(false);
        setInvoiceToDelete(null);
        toast.success('تم حذف الفاتورة بنجاح');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('حدث خطأ أثناء حذف الفاتورة');
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
  
  const isLoading = isLoadingInvoices || isLoadingParties || 
                    isLoadingRawMaterials || isLoadingPackaging || 
                    isLoadingSemiFinished || isLoadingFinished;
  
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
                <div className="flex items-center space-x-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث في الفواتير..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <FileDown className="h-4 w-4" />
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
                                <DropdownMenuItem>
                                  <Printer className="mr-2 h-4 w-4" />
                                  <span>طباعة</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteClick(invoice)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>حذف</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
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
      
      {/* نافذة إنشاء فاتورة جديدة */}
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
      
      {/* نافذة تأكيد الحذف */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الفاتورة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه الفاتورة؟ سيتم أيضاً إلغاء تأثيرها على حساب الطرف المرتبط بها.
              <br />
              هذا الإجراء لا يمكن التراجع عنه.
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
    </PageTransition>
  );
};

export default Invoices;
