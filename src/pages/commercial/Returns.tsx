import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CommercialService, { Return } from '@/services/CommercialService';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PageTransition from '@/components/ui/PageTransition';
import { ReturnsForm } from '@/components/commercial/ReturnsForm';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';

const Returns = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState<Return | null>(null);
  const [returnToConfirm, setReturnToConfirm] = useState<Return | null>(null);
  const [returnToCancel, setReturnToCancel] = useState<Return | null>(null);
  
  const commercialService = CommercialService.getInstance();
  
  const { data: returns, isLoading, refetch } = useQuery({
    queryKey: ['returns'],
    queryFn: () => commercialService.getReturns(),
  });
  
  const filteredReturns = React.useMemo(() => {
    if (!returns) return [];
    
    let filtered = returns;
    
    if (activeTab !== 'all') {
      filtered = returns.filter(r => r.return_type === activeTab);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.party_name?.toLowerCase().includes(query) ||
        r.amount.toString().includes(query) ||
        (r.notes && r.notes.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [returns, activeTab, searchQuery]);

  const handleAddReturn = async (returnData: Omit<Return, 'id' | 'created_at'>) => {
    try {
      await commercialService.createReturn(returnData);
      refetch();
      setIsFormOpen(false);
      toast.success('تم تسجيل المرتجع بنجاح');
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء تسجيل المرتجع');
    }
  };

  const handleEditReturn = async (returnData: Omit<Return, 'id' | 'created_at'>) => {
    if (!selectedReturn || !selectedReturn.id) return;
    
    try {
      await commercialService.updateReturn(selectedReturn.id, returnData);
      refetch();
      setIsFormOpen(false);
      setSelectedReturn(null);
      setIsEditMode(false);
      toast.success('تم تعديل المرتجع بنجاح');
    } catch (error) {
      console.error('Error updating return:', error);
      toast.error('حدث خطأ أثناء تعديل المرتجع');
    }
  };
  
  const handleEditClick = (returnItem: Return) => {
    setSelectedReturn(returnItem);
    setIsEditMode(true);
    setIsFormOpen(true);
  };
  
  const handleDeleteClick = (returnItem: Return) => {
    setReturnToDelete(returnItem);
    setIsDeleteDialogOpen(true);
  };
  
  const handleConfirmClick = (returnItem: Return) => {
    setReturnToConfirm(returnItem);
    setIsConfirmDialogOpen(true);
  };
  
  const handleCancelClick = (returnItem: Return) => {
    setReturnToCancel(returnItem);
    setIsCancelDialogOpen(true);
  };
  
  const confirmDeleteReturn = async () => {
    if (!returnToDelete || !returnToDelete.id) return;
    
    try {
      await commercialService.deleteReturn(returnToDelete.id);
      refetch();
      setIsDeleteDialogOpen(false);
      setReturnToDelete(null);
      toast.success('تم حذف المرتجع بنجاح');
    } catch (error) {
      console.error('Error deleting return:', error);
      toast.error('حدث خطأ أثناء حذف المرتجع');
    }
  };
  
  const confirmReturn = async () => {
    if (!returnToConfirm || !returnToConfirm.id) return;
    
    try {
      await commercialService.confirmReturn(returnToConfirm.id);
      refetch();
      setIsConfirmDialogOpen(false);
      setReturnToConfirm(null);
      toast.success('تم تأكيد المرتجع بنجاح');
    } catch (error) {
      console.error('Error confirming return:', error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
    }
  };
  
  const cancelReturn = async () => {
    if (!returnToCancel || !returnToCancel.id) return;
    
    try {
      await commercialService.cancelReturn(returnToCancel.id);
      refetch();
      setIsCancelDialogOpen(false);
      setReturnToCancel(null);
      toast.success('تم إلغاء المرتجع بنجاح');
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
    }
  };

  const resetForm = () => {
    setSelectedReturn(null);
    setIsEditMode(false);
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المرتجعات</h1>
            <p className="text-muted-foreground">إدارة سجل المرتجعات</p>
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
            <h1 className="text-3xl font-bold tracking-tight">المرتجعات</h1>
            <p className="text-muted-foreground">إدارة سجل المرتجعات</p>
          </div>
          <Button onClick={() => {
            resetForm();
            setIsFormOpen(true);
          }}>
            <PlusCircle className="ml-2 h-4 w-4" />
            تسجيل مرتجع جديد
          </Button>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="sales_return">مرتجعات مبيعات</TabsTrigger>
            <TabsTrigger value="purchase_return">مرتجعات مشتريات</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Input
                  placeholder="ابحث عن طريق اسم الطرف أو المبلغ أو الملاحظات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-md"
                />
              </div>
              
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredReturns.map((returnItem) => (
                  <Card key={returnItem.id} className="bg-white shadow-md rounded-md">
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{returnItem.party_name || 'غير محدد'}</h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(returnItem)}>
                              تعديل
                            </DropdownMenuItem>
                            {returnItem.payment_status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleDeleteClick(returnItem)}>
                                حذف
                              </DropdownMenuItem>
                            )}
                            {returnItem.payment_status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleConfirmClick(returnItem)}>
                                تأكيد
                              </DropdownMenuItem>
                            )}
                            {returnItem.payment_status === 'confirmed' && (
                              <DropdownMenuItem onClick={() => handleCancelClick(returnItem)}>
                                إلغاء
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {returnItem.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}
                      </p>
                      <p className="text-sm">
                        المبلغ: {returnItem.amount}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        التاريخ: {format(new Date(returnItem.date), 'yyyy-MM-dd')}
                      </p>
                      {returnItem.notes && (
                        <p className="text-sm text-muted-foreground">
                          ملاحظات: {returnItem.notes}
                        </p>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {returnItem.payment_status === 'draft'
                            ? 'مسودة'
                            : returnItem.payment_status === 'confirmed'
                              ? 'مؤكدة'
                              : 'ملغاة'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredReturns.length === 0 && (
                  <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-4 text-muted-foreground">
                    لا توجد مرتجعات مطابقة
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'تعديل مرتجع' : 'تسجيل مرتجع جديد'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'قم بتعديل بيانات المرتجع حسب الحاجة'
                : 'قم بإدخال بيانات المرتجع لتسجيله في النظام'
              }
            </DialogDescription>
          </DialogHeader>
          <ReturnsForm 
            onSubmit={isEditMode ? handleEditReturn : handleAddReturn} 
            initialData={selectedReturn}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف المرتجع</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المرتجع؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteReturn} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد المرتجع</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من تأكيد هذا المرتجع؟ سيتم تحديث المخزون وحساب الطرف المرتبط به.
              <br />
              لا يمكن تعديل المرتجع بعد تأكيده.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReturn} className="bg-green-600 hover:bg-green-700">
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء المرتجع</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إلغاء هذا المرتجع؟ سيتم إلغاء تأثيره على المخزون وحسابات الأطراف المرتبطة به.
              <br />
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={cancelReturn} className="bg-red-600 hover:bg-red-700">
              تأكيد الإلغاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
};

export default Returns;
