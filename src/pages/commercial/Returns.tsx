import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CommercialService, { Return, ReturnItem } from '@/services/CommercialService';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReturnsForm } from '@/components/commercial/ReturnsForm';
import { ReturnDetailsDialog } from '@/components/commercial/ReturnDetailsDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

const Returns: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [returnToAction, setReturnToAction] = useState<Return | null>(null);
  
  const commercialService = CommercialService.getInstance();
  
  const { data: returns = [], isLoading, refetch } = useQuery({
    queryKey: ['returns'],
    queryFn: () => commercialService.getReturns(),
  });
  
  const filteredReturns = React.useMemo(() => {
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
  
  const handleCreateReturn = async (data: any) => {
    try {
      // Prepare return data
      const returnData: Omit<Return, 'id' | 'created_at'> = {
        return_type: data.return_type,
        invoice_id: data.invoice_id,
        party_id: data.party_id,
        date: format(data.date, 'yyyy-MM-dd'),
        amount: data.total_amount,
        notes: data.notes,
        payment_status: 'draft',
        items: data.items.map((item: any) => ({
          item_id: item.item_id,
          item_type: item.item_type,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
        })),
      };
      
      await commercialService.createReturn(returnData);
      toast.success('تم تسجيل المرتجع بنجاح');
      setIsAddDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء تسجيل المرتجع');
    }
  };
  
  const handleUpdateReturn = async (id: string, data: Partial<Return>) => {
    try {
      await commercialService.updateReturn(id, data);
      toast.success('تم تحديث المرتجع بنجاح');
      refetch();
    } catch (error) {
      console.error('Error updating return:', error);
      toast.error('حدث خطأ أثناء تحديث المرتجع');
    }
  };
  
  const handleConfirmReturn = async () => {
    if (!returnToAction) return;
    
    try {
      await commercialService.confirmReturn(returnToAction.id);
      toast.success('تم تأكيد المرتجع بنجاح');
      setIsConfirmDialogOpen(false);
      setReturnToAction(null);
      refetch();
    } catch (error) {
      console.error('Error confirming return:', error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
    }
  };
  
  const handleCancelReturn = async () => {
    if (!returnToAction) return;
    
    try {
      await commercialService.cancelReturn(returnToAction.id);
      toast.success('تم إلغاء المرتجع بنجاح');
      setIsCancelDialogOpen(false);
      setReturnToAction(null);
      refetch();
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
    }
  };
  
  const handleDeleteReturn = async () => {
    if (!returnToAction) return;
    
    try {
      await commercialService.deleteReturn(returnToAction.id);
      toast.success('تم حذف المرتجع بنجاح');
      setIsDeleteDialogOpen(false);
      setReturnToAction(null);
      refetch();
    } catch (error) {
      console.error('Error deleting return:', error);
      toast.error('حدث خطأ أثناء حذف المرتجع');
    }
  };
  
  const handleViewDetails = async (returnItem: Return) => {
    try {
      const details = await commercialService.getReturnById(returnItem.id);
      if (details) {
        setSelectedReturn(details);
        setIsDetailsDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching return details:', error);
      toast.error('حدث خطأ أثناء جلب تفاصيل المرتجع');
    }
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المرتجعات</h1>
            <p className="text-muted-foreground">إدارة مرتجعات المبيعات والمشتريات</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> تسجيل مرتجع جديد
          </Button>
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="sales_return">مرتجع مبيعات</TabsTrigger>
            <TabsTrigger value="purchase_return">مرتجع مشتريات</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold">قائمة المرتجعات</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative w-60">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="البحث..."
                      className="w-full pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[450px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">الرقم</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>الطرف</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead className="text-center">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReturns.length > 0 ? (
                        filteredReturns.map((returnItem) => (
                          <TableRow key={returnItem.id}>
                            <TableCell className="font-medium">{returnItem.id.substring(0, 8)}...</TableCell>
                            <TableCell>
                              {returnItem.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}
                            </TableCell>
                            <TableCell>{returnItem.party_name || '-'}</TableCell>
                            <TableCell>{returnItem.date}</TableCell>
                            <TableCell>{returnItem.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                returnItem.payment_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                returnItem.payment_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {returnItem.payment_status === 'confirmed' ? 'مؤكد' :
                                 returnItem.payment_status === 'cancelled' ? 'ملغي' : 'مسودة'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center">
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
                                    <DropdownMenuItem onClick={() => handleViewDetails(returnItem)}>
                                      عرض التفاصيل
                                    </DropdownMenuItem>
                                    
                                    {returnItem.payment_status === 'draft' && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setReturnToAction(returnItem);
                                            setIsConfirmDialogOpen(true);
                                          }}
                                        >
                                          تأكيد
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setReturnToAction(returnItem);
                                            setIsDeleteDialogOpen(true);
                                          }}
                                        >
                                          حذف
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    
                                    {returnItem.payment_status === 'confirmed' && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setReturnToAction(returnItem);
                                          setIsCancelDialogOpen(true);
                                        }}
                                      >
                                        إلغاء
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                            لا توجد مرتجعات للعرض
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Add Return Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>تسجيل مرتجع جديد</DialogTitle>
            <DialogDescription>
              قم بإدخال بيانات المرتجع والأصناف المرتجعة
            </DialogDescription>
          </DialogHeader>
          <ReturnsForm onSubmit={handleCreateReturn} />
        </DialogContent>
      </Dialog>
      
      {/* Return Details Dialog */}
      {selectedReturn && (
        <ReturnDetailsDialog
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          returnData={selectedReturn!}
          onDelete={handleDeleteReturn}
        />
      )}
      
      {/* Confirm Return Dialog */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد المرتجع</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من تأكيد هذا المرتجع؟ سيؤدي ذلك إلى تحديث المخزون وحساب الطرف المقابل.
              <br />
              لا يمكن تعديل المرتجع بعد تأكيده.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReturn} className="bg-green-600 hover:bg-green-700">
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Cancel Return Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء المرتجع</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إلغاء هذا المرتجع؟ سيؤدي ذلك إلى عكس تأثيره على المخزون وحساب الطرف المقابل.
              <br />
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelReturn} className="bg-red-600 hover:bg-red-700">
              تأكيد الإلغاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Return Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المرتجع</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المرتجع؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReturn} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
};

export default Returns;
