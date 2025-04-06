import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import CommercialService from '@/services/CommercialService';
import { Invoice } from '@/types/commercial';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  Printer, 
  ArrowLeft, 
  FileText, 
  User, 
  Calendar, 
  Bookmark,
  Trash2,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import InvoiceStatusBadge from '@/components/commercial/InvoiceStatusBadge';
import TransactionStatusActions from '@/components/commercial/TransactionStatusActions';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const commercialService = CommercialService.getInstance();
  
  const { data: invoice, isLoading, error, refetch } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => commercialService.getInvoiceById(id || ''),
    enabled: !!id,
  });
  
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">تفاصيل الفاتورة</h1>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="animate-pulse">
              <CardHeader className="bg-muted h-12" />
              <CardContent className="space-y-4 pt-6">
                <div className="bg-muted h-6 rounded w-1/2" />
                <div className="bg-muted h-6 rounded w-2/3" />
                <div className="bg-muted h-6 rounded w-1/3" />
              </CardContent>
            </Card>
            <Card className="animate-pulse">
              <CardHeader className="bg-muted h-12" />
              <CardContent className="space-y-4 pt-6">
                <div className="bg-muted h-6 rounded w-3/4" />
                <div className="bg-muted h-6 rounded w-1/2" />
                <div className="bg-muted h-6 rounded w-2/3" />
              </CardContent>
            </Card>
          </div>
          <Card className="animate-pulse">
            <CardHeader className="bg-muted h-12" />
            <CardContent className="pt-6">
              <div className="bg-muted h-64 rounded" />
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }
  
  if (error || !invoice) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">تفاصيل الفاتورة</h1>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة
            </Button>
          </div>
          <Card className="bg-destructive/10">
            <CardContent className="p-6">
              <p className="text-destructive text-lg">
                حدث خطأ أثناء جلب بيانات الفاتورة. الرجاء المحاولة مرة أخرى لاحقًا.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {error instanceof Error ? error.message : 'خطأ غير معروف'}
              </p>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }
  
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
  
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      const success = await commercialService.deleteInvoice(id);
      if (success) {
        toast.success('تم حذف الفاتورة بنجاح');
        navigate('/commercial/invoices');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('حدث خطأ أثناء حذف الفاتورة');
    }
  };
  
  const handleConfirmInvoice = async () => {
    if (!id) return;
    
    try {
      const success = await commercialService.confirmInvoice(id);
      if (success) {
        refetch();
        toast.success('تم تأكيد الفاتورة بنجاح');
      }
    } catch (error) {
      console.error('Error confirming invoice:', error);
      toast.error('حدث خطأ أثناء تأكيد الفاتورة');
    }
  };
  
  const handleCancelInvoice = async () => {
    if (!id) return;
    
    try {
      const success = await commercialService.cancelInvoice(id);
      if (success) {
        refetch();
        toast.success('تم إلغاء الفاتورة بنجاح');
      }
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast.error('حدث خطأ أثناء إلغاء الفاتورة');
    }
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {invoice.invoice_type === 'sale' ? 'فاتورة مبيعات' : 'فاتورة مشتريات'}
            </h1>
            <p className="text-muted-foreground">
              رقم الفاتورة: {invoice.id.substring(0, 8)}...
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
            {invoice.payment_status === 'draft' && (
              <>
                <Button variant="outline" onClick={() => navigate(`/commercial/invoices/edit/${id}`)}>
                  <Edit className="ml-2 h-4 w-4" />
                  تعديل
                </Button>
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="ml-2 h-4 w-4" />
                      حذف
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>تأكيد حذف الفاتورة</AlertDialogTitle>
                      <AlertDialogDescription>
                        هل أنت متأكد من حذف هذه الفاتورة؟ هذا الإجراء لا يمكن التراجع عنه.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                        حذف
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">معلومات الفاتورة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">نوع الفاتورة:</span>
                <span>{invoice.invoice_type === 'sale' ? 'فاتورة مبيعات' : 'فاتورة مشتريات'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">الطرف:</span>
                <span>{invoice.party_name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">التاريخ:</span>
                <span>{format(new Date(invoice.date), 'yyyy-MM-dd')}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">الحالة:</span>
                {getStatusBadge(invoice.status)}
              </div>
              
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">حالة المعاملة:</span>
                <InvoiceStatusBadge status={invoice.payment_status as any} />
              </div>
              
              {invoice.notes && (
                <div className="pt-2">
                  <h4 className="font-medium mb-1">ملاحظات:</h4>
                  <p className="text-sm text-muted-foreground bg-secondary p-3 rounded">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">ملخص الفاتورة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between">
                  <span>عدد العناصر</span>
                  <span className="font-medium">{invoice.items.length}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-lg font-bold">المجموع</span>
                  <span className="text-lg font-bold">{invoice.total_amount.toFixed(2)}</span>
                </div>
              </div>
              
              <TransactionStatusActions 
                status={invoice.payment_status as any} 
                onConfirm={handleConfirmInvoice}
                onCancel={handleCancelInvoice}
              />
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">تفاصيل العناصر</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>المنتج</TableHead>
                  <TableHead className="text-center">الكمية</TableHead>
                  <TableHead className="text-center">السعر</TableHead>
                  <TableHead className="text-right">المجموع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-center">{item.unit_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {(item.quantity * item.unit_price).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                
                <TableRow className="bg-secondary/50">
                  <TableCell colSpan={4} className="text-right font-bold">
                    المجموع الكلي
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {invoice.total_amount.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default InvoiceDetails;
