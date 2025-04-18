import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  PlusCircle, 
  Search, 
  FileDown, 
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import PageTransition from '@/components/ui/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import CommercialService from '@/services/CommercialService';
import { Return } from '@/types/returns';

// Importing our new components
import { ReturnTable } from '@/components/commercial/returns/ReturnTable';
import { AddReturnDialog } from '@/components/commercial/returns/AddReturnDialog';
import { ReturnActionDialogs } from '@/components/commercial/returns/ReturnActionDialogs';
import { useReturnActions } from '@/hooks/commercial/useReturnActions';

const Returns = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const commercialService = CommercialService.getInstance();
  
  const { 
    selectedReturnId, 
    viewingReturn, 
    isDetailsOpen,
    isProcessing,
    isConfirmDialogOpen,
    isCancelDialogOpen,
    isDeleteDialogOpen,
    setSelectedReturnId,
    setViewingReturn,
    setIsDetailsOpen,
    setIsConfirmDialogOpen,
    setIsCancelDialogOpen,
    setIsDeleteDialogOpen,
    handleCreateReturn,
    handleConfirmReturn,
    handleCancelReturn,
    handleDeleteReturn,
    handleViewDetails
  } = useReturnActions();
  
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
              <div className="h-10 w-full mb-4 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-64 w-full bg-gray-200 animate-pulse rounded"></div>
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
        {/* --- ملخص سريع أعلى الصفحة --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl bg-gradient-to-tr from-green-50 via-green-100 to-green-50 dark:from-green-900/50 dark:to-green-950/60 p-4 flex items-center gap-3 shadow-sm">
            <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-300" />
            <div>
              <div className="font-bold text-lg">{returns?.filter(r => r.return_type === 'sales_return').length || 0}</div>
              <div className="text-sm text-muted-foreground">مرتجع مبيعات</div>
            </div>
          </div>
          <div className="rounded-xl bg-gradient-to-tr from-blue-50 via-blue-100 to-blue-50 dark:from-blue-900/50 dark:to-blue-950/60 p-4 flex items-center gap-3 shadow-sm">
            <CheckCircle className="h-7 w-7 text-blue-600 dark:text-blue-300" />
            <div>
              <div className="font-bold text-lg">{returns?.filter(r => r.return_type === 'purchase_return').length || 0}</div>
              <div className="text-sm text-muted-foreground">مرتجع مشتريات</div>
            </div>
          </div>
          <div className="rounded-xl bg-gradient-to-tr from-yellow-50 via-yellow-100 to-yellow-50 dark:from-yellow-900/50 dark:to-yellow-950/60 p-4 flex items-center gap-3 shadow-sm">
            <CheckCircle className="h-7 w-7 text-yellow-600 dark:text-yellow-300" />
            <div>
              <div className="font-bold text-lg">{returns?.length || 0}</div>
              <div className="text-sm text-muted-foreground">إجمالي المرتجعات</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">المرتجعات</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} className="transition-transform hover:scale-105">
              <RefreshCw className="w-4 h-4 ml-2 animate-spin-slow group-hover:animate-spin" />
              تحديث
            </Button>
            <Button variant="outline" onClick={exportToCsv} className="transition-transform hover:scale-105">
              <FileDown className="w-4 h-4 ml-2" />
              تصدير
            </Button>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="rounded-lg bg-green-200 hover:bg-green-300 text-green-900 font-bold px-2.5 py-1 flex items-center gap-1 shadow border border-green-300 focus:ring-1 focus:ring-green-100 focus:border-green-400 text-sm"
              title="إضافة مرتجع"
            >
              <PlusCircle className="h-4 w-4" />
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
              <div className="relative w-full max-w-xs transition-all">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground animate-pulse" />
                <Input 
                  placeholder="بحث سريع بالاسم أو الرقم..." 
                  className="w-full pr-10 rounded-full focus:ring-2 focus:ring-blue-400 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {/* تصفية متقدمة */}
                {/* <Button size="sm" variant="ghost" className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-600" title="تصفية متقدمة"><Filter className="w-4 h-4" /></Button> */}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ReturnTable 
              returns={filteredReturns} 
              onViewDetails={handleViewDetails} 
              onConfirm={(id) => {
                setSelectedReturnId(id);
                setIsConfirmDialogOpen(true);
              }}
              onCancel={(id) => {
                setSelectedReturnId(id);
                setIsCancelDialogOpen(true);
              }}
              isProcessing={isProcessing}
            />
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AddReturnDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleCreateReturn}
        isSubmitting={isProcessing}
      />

      <ReturnActionDialogs
        viewingReturn={viewingReturn}
        isDetailsOpen={isDetailsOpen}
        setIsDetailsOpen={setIsDetailsOpen}
        isProcessing={isProcessing}
        isConfirmDialogOpen={isConfirmDialogOpen}
        setIsConfirmDialogOpen={setIsConfirmDialogOpen}
        onConfirm={handleConfirmReturn}
        isCancelDialogOpen={isCancelDialogOpen}
        setIsCancelDialogOpen={setIsCancelDialogOpen}
        onCancel={handleCancelReturn}
        isDeleteDialogOpen={isDeleteDialogOpen}
        setIsDeleteDialogOpen={setIsDeleteDialogOpen}
        onDelete={handleDeleteReturn}
        selectedReturnId={selectedReturnId}
      />
    </PageTransition>
  );
};

export default Returns;
