import React, { useState } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CommercialService, { Return } from '@/services/CommercialService';
import PartyService from '@/services/PartyService';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, FileDown, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ReturnsForm } from '@/components/commercial/ReturnsForm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ReturnFormValues } from '@/components/commercial/ReturnFormTypes';

const Returns = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();
  
  const commercialService = CommercialService.getInstance();
  
  const { data: returns, isLoading, error, refetch } = useQuery({
    queryKey: ['returns'],
    queryFn: async () => {
      console.log('Fetching returns...');
      try {
        const result = await commercialService.getReturns();
        console.log('Returns fetched:', result);
        return result;
      } catch (err) {
        console.error('Error fetching returns:', err);
        throw err;
      }
    },
  });
  
  const { data: parties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => PartyService.getInstance().getParties(),
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

  const handleCreateReturn = async (returnData: ReturnFormValues) => {
    try {
      setIsProcessing(true);
      console.log('Creating return with data:', returnData);
      
      if (!returnData.party_id && returnData.invoice_id) {
        const invoice = await commercialService.getInvoiceById(returnData.invoice_id);
        if (invoice) {
          returnData.party_id = invoice.party_id;
        }
      }
      
      const returnToCreate: Omit<Return, 'id' | 'created_at'> = {
        party_id: returnData.party_id || '',
        party_name: undefined,
        date: returnData.date ? format(returnData.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        invoice_id: returnData.invoice_id,
        return_type: returnData.return_type || 'sales_return',
        amount: returnData.amount || 0,
        payment_status: 'draft',
        notes: returnData.notes,
        items: (returnData.items || []).filter(item => item.selected).map(item => ({
          id: '',
          return_id: '',
          item_id: item.item_id,
          item_name: item.item_name,
          item_type: item.item_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
          created_at: ''
        }))
      };
      
      const createReturnPromise = new Promise<Return | null>(async (resolve) => {
        try {
          const result = await commercialService.createReturn(returnToCreate);
          console.log('Return creation result:', result);
          resolve(result);
        } catch (error) {
          console.error('Error in return creation:', error);
          resolve(null);
        }
      });
      
      const result = await createReturnPromise;
      
      if (result) {
        console.log('Auto confirming return:', result.id);
        
        setTimeout(async () => {
          try {
            const confirmed = await commercialService.confirmReturn(result.id);
            console.log('Return confirm result:', confirmed);
            
            queryClient.invalidateQueries({ queryKey: ['returns'] });
            queryClient.invalidateQueries({ queryKey: ['parties'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
            queryClient.invalidateQueries({ queryKey: ['packaging_materials'] });
            queryClient.invalidateQueries({ queryKey: ['semi_finished_products'] });
            queryClient.invalidateQueries({ queryKey: ['finished_products'] });
          } catch (confirmError) {
            console.error('Error confirming return:', confirmError);
          }
        }, 500);
        
        toast({
          title: "نجاح",
          description: "تم إنشاء المرتجع وتأكيده بنجاح",
          variant: "default"
        });
        
        setIsAddDialogOpen(false);
      } else {
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء إنشاء المرتجع",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error handling return creation:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء المرتجع",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!selectedReturnId) return;
    
    try {
      setIsProcessing(true);
      console.log('Confirming return:', selectedReturnId);
      
      const confirmPromise = new Promise<boolean>(async (resolve) => {
        try {
          const success = await commercialService.confirmReturn(selectedReturnId);
          resolve(success);
        } catch (error) {
          console.error('Error in confirm promise:', error);
          resolve(false);
        }
      });
      
      const success = await confirmPromise;
      
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['returns'] });
        queryClient.invalidateQueries({ queryKey: ['parties'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
        queryClient.invalidateQueries({ queryKey: ['packaging_materials'] });
        queryClient.invalidateQueries({ queryKey: ['semi_finished_products'] });
        queryClient.invalidateQueries({ queryKey: ['finished_products'] });
        
        toast({
          title: "نجاح",
          description: "تم تأكيد المرتجع بنجاح",
          variant: "default"
        });
      } else {
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تأكيد المرتجع",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error confirming return:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تأكيد المرتجع",
        variant: "destructive"
      });
    } finally {
      setIsConfirmDialogOpen(false);
      setSelectedReturnId(null);
      setIsProcessing(false);
    }
  };

  const handleCancelReturn = async () => {
    if (!selectedReturnId) return;
    
    try {
      setIsProcessing(true);
      console.log('Cancelling return:', selectedReturnId);
      
      const cancelPromise = new Promise<boolean>(async (resolve) => {
        try {
          const success = await commercialService.cancelReturn(selectedReturnId);
          resolve(success);
        } catch (error) {
          console.error('Error in cancel promise:', error);
          resolve(false);
        }
      });
      
      const success = await cancelPromise;
      
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['returns'] });
        queryClient.invalidateQueries({ queryKey: ['parties'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
        queryClient.invalidateQueries({ queryKey: ['packaging_materials'] });
        queryClient.invalidateQueries({ queryKey: ['semi_finished_products'] });
        queryClient.invalidateQueries({ queryKey: ['finished_products'] });
        
        toast({
          title: "نجاح",
          description: "تم إلغاء المرتجع بنجاح",
          variant: "default"
        });
      } else {
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء إلغاء المرتجع",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast({
        title: "خطأ", 
        description: "حدث خطأ أثناء إلغاء المرتجع",
        variant: "destructive"
      });
    } finally {
      setIsCancelDialogOpen(false);
      setSelectedReturnId(null);
      setIsProcessing(false);
    }
  };

  const handleConfirmClick = (id: string) => {
    setSelectedReturnId(id);
    setIsConfirmDialogOpen(true);
  };

  const handleCancelClick = (id: string) => {
    setSelectedReturnId(id);
    setIsCancelDialogOpen(true);
  };

  const exportToCsv = () => {
    if (!filteredReturns.length) {
      toast({
        title: "خطأ",
        description: "لا توجد بيانات للتصدير",
        variant: "destructive"
      });
      return;
    }
    
    const csvContent = 'ID,النوع,الطرف,التاريخ,المبلغ,الفاتورة المرتبطة,الحالة\n' +
      filteredReturns.map(returnItem => `"${returnItem.id}","${returnItem.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}","${returnItem.party_name || ''}","${returnItem.date}","${returnItem.amount}","${returnItem.invoice_id || ''}","${returnItem.payment_status}"`).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `المرتجعات-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "نجاح",
        description: "تم تحديث البيانات بنجاح",
        variant: "default"
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث البيانات",
        variant: "destructive"
      });
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
                    <TableRow key={returnItem.id}>
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
                          <Badge variant="default" className="bg-green-500">مؤكد</Badge>
                        ) : returnItem.payment_status === 'cancelled' ? (
                          <Badge variant="destructive">ملغي</Badge>
                        ) : (
                          <Badge variant="outline">مسودة</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {returnItem.payment_status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConfirmClick(returnItem.id)}
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
                              onClick={() => handleCancelClick(returnItem.id)}
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>إضافة مرتجع جديد</DialogTitle>
          </DialogHeader>
          <ReturnsForm onSubmit={handleCreateReturn} />
        </DialogContent>
      </Dialog>

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
            <AlertDialogAction onClick={handleConfirmReturn} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  جاري التأكيد...
                </>
              ) : (
                <>تأكيد</>
              )}
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
            <AlertDialogAction 
              className="bg-red-500 hover:bg-red-600"
              onClick={handleCancelReturn}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  جاري الإلغاء...
                </>
              ) : (
                <>تأكيد الإلغاء</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
};

export default Returns;
