import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  PlusCircle, 
  Search, 
  FileDown, 
  RefreshCw, 
  CheckCircle, 
  XCircle
} from 'lucide-react';
import PageTransition from '@/components/ui/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

import ReturnForm from '@/components/commercial/returns/ReturnForm';
import { ReturnDetailsDialog } from '@/components/commercial/returns/ReturnDetailsDialog';
import CommercialService from '@/services/CommercialService';
import { Return } from '@/types/returns';

const Returns = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [viewingReturn, setViewingReturn] = useState<Return | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();
  const commercialService = CommercialService.getInstance();
  
  const { data: returns, isLoading, error, refetch } = useQuery({
    queryKey: ['returns'],
    queryFn: async () => {
      try {
        const result = await commercialService.getReturns();
        return result;
      } catch (err) {
        console.error('Error fetching returns:', err);
        throw err;
      }
    },
  });

  const filteredReturns = React.useMemo(() => {
    if (!returns) return [];
    
    let filtered = returns;
    
    if (activeTab !== 'all') {
      filtered = returns.filter(returnItem => returnItem.return_type === activeTab);
    }
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(returnItem => 
        returnItem.party_name?.toLowerCase().includes(query) ||
        returnItem.id.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [returns, activeTab, searchQuery]);

  const handleCreateReturn = async (returnData: Omit<Return, 'id' | 'created_at'>) => {
    try {
      setIsProcessing(true);
      console.log('Creating return with data:', returnData);
      
      const result = await commercialService.createReturn({
        ...returnData,
        payment_status: 'draft'
      });
      
      if (result) {
        queryClient.invalidateQueries({ queryKey: ['returns'] });
        toast.success('تم إنشاء المرتجع بنجاح');
        setIsAddDialogOpen(false);
      } else {
        toast.error('حدث خطأ أثناء إنشاء المرتجع');
      }
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء إنشاء المرتجع');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!selectedReturnId) return;
    
    try {
      setIsProcessing(true);
      const success = await commercialService.confirmReturn(selectedReturnId);
      
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['returns'] });
        queryClient.invalidateQueries({ queryKey: ['parties'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        
        toast.success('تم تأكيد المرتجع بنجاح');
      } else {
        toast.error('حدث خطأ أثناء تأكيد المرتجع');
      }
    } catch (error) {
      console.error('Error confirming return:', error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
    } finally {
      setIsConfirmDialogOpen(false);
      setSelectedReturnId(null);
      setIsProcessing(false);
      setIsDetailsOpen(false);
    }
  };

  const handleCancelReturn = async () => {
    if (!selectedReturnId) return;
    
    try {
      setIsProcessing(true);
      const success = await commercialService.cancelReturn(selectedReturnId);
      
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['returns'] });
        queryClient.invalidateQueries({ queryKey: ['parties'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        
        toast.success('تم إلغاء المرتجع بنجاح');
      } else {
        toast.error('حدث خطأ أثناء إلغاء المرتجع');
      }
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
    } finally {
      setIsCancelDialogOpen(false);
      setSelectedReturnId(null);
      setIsProcessing(false);
      setIsDetailsOpen(false);
    }
  };

  const handleDeleteReturn = async () => {
    if (!selectedReturnId) return;
    
    try {
      setIsProcessing(true);
      const success = await commercialService.deleteReturn(selectedReturnId);
      
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['returns'] });
        toast.success('تم حذف المرتجع بنجاح');
      } else {
        toast.error('حدث خطأ أثناء حذف المرتجع');
      }
    } catch (error) {
      console.error('Error deleting return:', error);
      toast.error('حدث خطأ أثناء حذف المرتجع');
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedReturnId(null);
      setIsProcessing(false);
      setIsDetailsOpen(false);
    }
  };

  const handleViewDetails = async (returnId: string) => {
    try {
      const returnData = await commercialService.getReturnById(returnId);
      if (returnData) {
        setViewingReturn(returnData as Return);
        setSelectedReturnId(returnId);
        setIsDetailsOpen(true);
      } else {
        toast.error('لم يتم العثور على بيانات المرتجع');
      }
    } catch (error) {
      console.error('Error fetching return details:', error);
      toast.error('حدث خطأ أثناء جلب بيانات المرتجع');
    }
  };

  const exportToCsv = async (): Promise<void> => {
    try {
      if (!filteredReturns.length) {
        toast.error('لا توجد بيانات للتصدير');
        return;
      }
      
      const csvContent = 'ID,النوع,الطرف,التاريخ,المبلغ,الفاتورة المرتبطة,الحالة\n' +
        filteredReturns.map(returnItem => 
          `"${returnItem.id}","${returnItem.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}","${returnItem.party_name || ''}","${returnItem.date}","${returnItem.amount}","${returnItem.invoice_id || ''}","${
            returnItem.payment_status === 'confirmed' ? 'مؤكد' : 
            returnItem.payment_status === 'cancelled' ? 'ملغي' : 'مسودة'
          }"`
        ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `returns-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('حدث خطأ أثناء تصدير البيانات');
    }
  };

  const handleRefresh = async (): Promise<void> => {
    try {
      await refetch();
      toast.success('تم تحديث البيانات بنجاح');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('حدث خطأ أثناء تحديث البيانات');
    }
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">المرتجعات</h1>
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-10 w-full mb-4" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">المرتجعات</h1>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-10">
                <p className="text-red-500 text-lg mb-2">حدث خطأ أثناء جلب البيانات</p>
                <Button onClick={() => refetch()}>إعادة المحاولة</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">المرتجعات</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 ml-2" />
              تحديث
            </Button>
            <Button variant="outline" onClick={exportToCsv}>
              <FileDown className="w-4 h-4 ml-2" />
              تصدير
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="w-4 h-4 ml-2" />
              إضافة مرتجع
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <Tabs 
                defaultValue="all" 
                value={activeTab} 
                onValueChange={setActiveTab} 
                className="w-full max-w-md"
              >
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="all">الكل</TabsTrigger>
                  <TabsTrigger value="sales_return">مرتجع مبيعات</TabsTrigger>
                  <TabsTrigger value="purchase_return">مرتجع مشتريات</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full max-w-xs">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="بحث..." 
                  className="w-full pr-10" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right w-24">التاريخ</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الطرف</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.length > 0 ? (
                  filteredReturns.map((returnItem) => (
                    <TableRow key={returnItem.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(returnItem.id)}>
                      <TableCell className="text-right">
                        {format(new Date(returnItem.date), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={returnItem.return_type === 'sales_return' ? 'destructive' : 'default'}>
                          {returnItem.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {returnItem.party_name || "غير محدد"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {returnItem.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {returnItem.payment_status === 'confirmed' ? (
                          <Badge className="bg-green-500">مؤكد</Badge>
                        ) : returnItem.payment_status === 'cancelled' ? (
                          <Badge variant="destructive">ملغي</Badge>
                        ) : (
                          <Badge variant="outline">مسودة</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2 rtl:space-x-reverse" onClick={(e) => e.stopPropagation()}>
                          {returnItem.payment_status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReturnId(returnItem.id);
                                setIsConfirmDialogOpen(true);
                              }}
                              disabled={isProcessing}
                            >
                              <CheckCircle className="h-4 w-4 ml-1" />
                              تأكيد
                            </Button>
                          )}
                          {returnItem.payment_status === 'confirmed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReturnId(returnItem.id);
                                setIsCancelDialogOpen(true);
                              }}
                              disabled={isProcessing}
                            >
                              <XCircle className="h-4 w-4 ml-1" />
                              إلغاء
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      لا توجد مرتجعات مسجلة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={(open) => !isProcessing && setIsAddDialogOpen(open)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>إضافة مرتجع جديد</DialogTitle>
          </DialogHeader>
          <ReturnForm 
            onSubmit={handleCreateReturn} 
            isSubmitting={isProcessing}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {viewingReturn && (
        <ReturnDetailsDialog
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          returnData={viewingReturn}
          isProcessing={isProcessing}
          onConfirm={
            viewingReturn.payment_status === 'draft' 
              ? () => {
                  setIsDetailsOpen(false);
                  setSelectedReturnId(viewingReturn.id);
                  setIsConfirmDialogOpen(true);
                }
              : undefined
          }
          onCancel={
            viewingReturn.payment_status === 'confirmed'
              ? () => {
                  setIsDetailsOpen(false);
                  setSelectedReturnId(viewingReturn.id);
                  setIsCancelDialogOpen(true);
                }
              : undefined
          }
          onDelete={
            viewingReturn.payment_status === 'draft'
              ? () => {
                  setIsDetailsOpen(false);
                  setSelectedReturnId(viewingReturn.id);
                  setIsDeleteDialogOpen(true);
                }
              : undefined
          }
        />
      )}

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={(open) => !isProcessing && setIsConfirmDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد المرتجع</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في تأكيد هذا المرتجع؟ سيتم تحديث المخزون والحسابات وفقًا لذلك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReturn} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={(open) => !isProcessing && setIsCancelDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء المرتجع</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في إلغاء هذا المرتجع؟ سيتم عكس تأثيره على المخزون والحسابات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>تراجع</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelReturn} disabled={isProcessing} className="bg-red-600 hover:bg-red-700">
              إلغاء المرتجع
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => !isProcessing && setIsDeleteDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المرتجع</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في حذف هذا المرتجع؟ لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>تراجع</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReturn} disabled={isProcessing} className="bg-red-600 hover:bg-red-700">
              حذف المرتجع
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
};

export default Returns;
