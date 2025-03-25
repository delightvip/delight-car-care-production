
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import CommercialService from '@/services/CommercialService';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Printer, 
  Edit, 
  Trash2,
  Receipt,
  RefreshCw, 
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
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
import { InvoiceForm } from '@/components/commercial/InvoiceForm';
import PartyService from '@/services/PartyService';
import InventoryService from '@/services/InventoryService';

const InvoiceDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const commercialService = CommercialService.getInstance();
  const partyService = PartyService.getInstance();
  const inventoryService = InventoryService.getInstance();
  
  const { data: invoice, isLoading: isLoadingInvoice, error: invoiceError, refetch } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => id ? commercialService.getInvoiceById(id) : null,
    enabled: !!id
  });
  
  const { data: invoiceItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['invoiceItems', id],
    queryFn: () => id ? commercialService.getInvoiceItems(id) : [],
    enabled: !!id
  });
  
  const { data: parties, isLoading: isLoadingParties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => partyService.getParties(),
    refetchOnWindowFocus: false,
  });
  
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
  
  const handleUpdateInvoice = async (updatedInvoiceData: any) => {
    if (!id) return;
    
    try {
      const { items, ...invoiceData } = updatedInvoiceData;
      
      // First update the invoice
      await commercialService.updateInvoice(id, {
        ...invoiceData,
        total_amount: items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0)
      });
      
      // Delete old items
      if (invoiceItems && invoiceItems.length > 0) {
        // This is handled server-side when updating the invoice
      }
      
      refetch();
      setIsEditDialogOpen(false);
      toast.success('تم تحديث الفاتورة بنجاح');
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('حدث خطأ أثناء تحديث الفاتورة');
    }
  };
  
  const handleDeleteInvoice = async () => {
    if (!id) return;
    
    try {
      await commercialService.deleteInvoice(id);
      toast.success('تم حذف الفاتورة بنجاح');
      navigate('/commercial/invoices');
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
  
  if (isLoadingInvoice || isLoadingItems) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/commercial/invoices')}>
                <ArrowLeft className="ml-2 h-4 w-4" />
                العودة للفواتير
              </Button>
              <Skeleton className="h-8 w-40" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </PageTransition>
    );
  }
  
  if (invoiceError || !invoice) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate('/commercial/invoices')}>
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة للفواتير
            </Button>
            <h1 className="text-3xl font-bold tracking-tight mr-4">تفاصيل الفاتورة</h1>
          </div>
          <div className="bg-destructive/10 p-4 rounded-md text-destructive">
            <p>عذراً، لم يتم العثور على الفاتورة المطلوبة أو حدث خطأ أثناء تحميل البيانات.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/commercial/invoices')}>
              العودة لصفحة الفواتير
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate('/commercial/invoices')}>
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة للفواتير
            </Button>
            <h1 className="text-3xl font-bold tracking-tight mr-4">
              فاتورة {invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'} #{invoice.id.substring(0, 8)}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="ml-2 h-4 w-4" />
              تعديل
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="ml-2 h-4 w-4" />
              حذف
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">معلومات الفاتورة</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">رقم الفاتورة:</dt>
                  <dd className="font-mono">{invoice.id.substring(0, 8)}...</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">التاريخ:</dt>
                  <dd>{format(new Date(invoice.date), 'yyyy-MM-dd')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">نوع الفاتورة:</dt>
                  <dd>{invoice.invoice_type === 'sale' ? 'بيع' : 'شراء'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">الحالة:</dt>
                  <dd>{getStatusBadge(invoice.status)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">معلومات {invoice.invoice_type === 'sale' ? 'العميل' : 'المورد'}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">الاسم:</dt>
                  <dd>{invoice.party_name}</dd>
                </div>
                {invoice.party_id && (
                  <div className="flex justify-between">
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto" 
                      onClick={() => navigate(`/commercial/parties/${invoice.party_id}`)}
                    >
                      عرض بيانات {invoice.invoice_type === 'sale' ? 'العميل' : 'المورد'}
                    </Button>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">ملخص المبالغ</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between text-xl font-bold">
                  <dt>الإجمالي:</dt>
                  <dd>{invoice.total_amount.toFixed(2)}</dd>
                </div>
                <div className="pt-4 flex justify-end">
                  {invoice.status !== 'paid' && (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => navigate('/commercial/payments')}
                    >
                      <Receipt className="ml-2 h-4 w-4" />
                      تسجيل دفعة
                    </Button>
                  )}
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>عناصر الفاتورة</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead className="text-center">الكمية</TableHead>
                  <TableHead className="text-center">سعر الوحدة</TableHead>
                  <TableHead className="text-left">الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceItems && invoiceItems.length > 0 ? (
                  invoiceItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell>
                        {item.item_type === 'raw_materials' ? 'مواد خام' :
                         item.item_type === 'packaging_materials' ? 'مواد تعبئة' :
                         item.item_type === 'semi_finished_products' ? 'منتجات نصف مصنعة' :
                         'منتجات نهائية'}
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-center">{item.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-left font-medium">
                        {(item.quantity * item.unit_price).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      لا توجد عناصر في هذه الفاتورة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {invoice.notes && (
          <Card>
            <CardHeader>
              <CardTitle>ملاحظات</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>تعديل الفاتورة</DialogTitle>
            <DialogDescription>
              قم بتعديل بيانات الفاتورة وعناصرها.
            </DialogDescription>
          </DialogHeader>
          {parties && inventoryItems && invoice && (
            <InvoiceForm 
              onSubmit={handleUpdateInvoice} 
              parties={parties}
              items={inventoryItems}
              initialData={{
                party_id: invoice.party_id,
                invoice_type: invoice.invoice_type as 'sale' | 'purchase',
                date: new Date(invoice.date),
                status: invoice.status as 'paid' | 'partial' | 'unpaid',
                notes: invoice.notes,
                items: invoiceItems || []
              }}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الفاتورة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه الفاتورة؟ سيتم أيضاً إلغاء تأثيرها على حساب الطرف المرتبط بها والمخزون.
              <br />
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInvoice} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
};

export default InvoiceDetails;
