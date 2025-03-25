
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CommercialService, { Return, ReturnItem } from '@/services/CommercialService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, FileDown, Eye, Receipt } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import PageTransition from '@/components/ui/PageTransition';
import { Badge } from '@/components/ui/badge';
import { ReturnsForm } from '@/components/commercial/ReturnsForm';
import { toast } from 'sonner';
import { ReturnDetailsDialog } from '@/components/commercial/ReturnDetailsDialog';

const Returns = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
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
        r.invoice_number?.toLowerCase().includes(query) ||
        r.amount.toString().includes(query)
      );
    }
    
    return filtered;
  }, [returns, activeTab, searchQuery]);

  const handleAddNewReturn = async (returnData: Omit<Return, 'id' | 'created_at'>) => {
    try {
      // Convert "no_invoice" to null/undefined before sending to the server
      if (returnData.invoice_id === 'no_invoice') {
        returnData.invoice_id = undefined;
      }
      
      await commercialService.recordReturn(returnData);
      refetch();
      setIsFormOpen(false);
      toast.success('تم تسجيل المرتجع بنجاح');
    } catch (error) {
      console.error('Error recording return:', error);
      toast.error('حدث خطأ أثناء تسجيل المرتجع');
    }
  };

  const handleViewDetails = (returnItem: Return) => {
    setSelectedReturn(returnItem);
    setIsDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المرتجعات</h1>
            <p className="text-muted-foreground">إدارة مرتجعات المبيعات والمشتريات</p>
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
            <p className="text-muted-foreground">إدارة مرتجعات المبيعات والمشتريات</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="ml-2 h-4 w-4" />
            إضافة مرتجع جديد
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
                <CardTitle className="text-xl font-bold">
                  {activeTab === 'all' ? 'جميع المرتجعات' :
                   activeTab === 'sales_return' ? 'مرتجعات المبيعات' : 'مرتجعات المشتريات'}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث في المرتجعات..."
                      className="pl-8"
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
                      <TableHead>رقم المرتجع</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead className="text-left">المبلغ</TableHead>
                      <TableHead>ملاحظات</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReturns.length > 0 ? (
                      filteredReturns.map((returnItem) => (
                        <TableRow key={returnItem.id}>
                          <TableCell className="font-medium">
                            {returnItem.id?.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant={returnItem.return_type === 'sales_return' ? 'destructive' : 'default'}>
                              {returnItem.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}
                            </Badge>
                          </TableCell>
                          <TableCell>{returnItem.invoice_id ? returnItem.invoice_id.substring(0, 8) + '...' : '-'}</TableCell>
                          <TableCell>
                            {format(new Date(returnItem.date), 'yyyy-MM-dd')}
                          </TableCell>
                          <TableCell className="text-left font-medium">
                            {returnItem.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>{returnItem.notes || '-'}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDetails(returnItem)}
                                title="عرض التفاصيل"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="طباعة سند المرتجع"
                              >
                                <Receipt className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          لا توجد مرتجعات للعرض
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>إضافة مرتجع جديد</DialogTitle>
            <DialogDescription>
              قم بإدخال بيانات المرتجع لتسجيله في النظام
            </DialogDescription>
          </DialogHeader>
          <ReturnsForm onSubmit={handleAddNewReturn} />
        </DialogContent>
      </Dialog>

      {selectedReturn && (
        <ReturnDetailsDialog
          returnData={selectedReturn}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
        />
      )}
    </PageTransition>
  );
};

export default Returns;
