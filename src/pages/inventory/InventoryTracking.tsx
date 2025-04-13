
import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { DateRange } from 'react-day-picker';
import { 
  FileDownIcon, 
  RefreshCw, 
  ChartBarIcon,
  ListIcon,
  FilterIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import PageTransition from '@/components/ui/PageTransition';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

import InventoryMovementStats from '@/components/inventory/InventoryMovementStats';
import InventorySourcesChart from '@/components/inventory/InventorySourcesChart';
import InventoryMovementFilters from '@/components/inventory/InventoryMovementFilters';
import { InventoryMovementTable } from '@/components/inventory/movement';
import ManualMovementForm from '@/components/inventory/ManualMovementForm';

import { 
  fetchFilteredInventoryMovements, 
  fetchInventoryMovementStats,
  exportInventoryMovementsToCSV,
  MovementFilter
} from '@/services/InventoryTracking';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const InventoryTracking = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState<{
    movementType: string;
    itemType: string;
    dateRange: DateRange;
    searchTerm: string;
  }>({
    movementType: 'all',
    itemType: 'all',
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    searchTerm: ''
  });
  
  // Convert UI filters to API filters
  const getMovementFilters = (): MovementFilter => {
    return {
      itemType: filters.itemType !== 'all' ? filters.itemType : undefined,
      movementType: filters.movementType !== 'all' ? filters.movementType : undefined,
      dateRange: {
        from: filters.dateRange.from,
        to: filters.dateRange.to
      },
      searchTerm: filters.searchTerm.trim() !== '' ? filters.searchTerm : undefined
    };
  };
  
  // Fetch inventory movements filtered by current filters
  const { 
    data: movements = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['inventoryMovements', filters],
    queryFn: () => fetchFilteredInventoryMovements(getMovementFilters()),
    refetchInterval: 300000, // 5 minutes
    refetchOnWindowFocus: true
  });
  
  // Fetch inventory movement statistics
  const { 
    data: statsData,
    isLoading: statsLoading 
  } = useQuery({
    queryKey: ['inventoryMovementStats', filters],
    queryFn: () => fetchInventoryMovementStats(getMovementFilters()),
    refetchInterval: 300000, // 5 minutes
    enabled: !isLoading
  });
  
  // Filter movements by active tab (category)
  const filteredMovements = React.useMemo(() => {
    if (activeTab === 'all') return movements;
    
    return movements.filter(movement => {
      if (activeTab === 'raw_materials' && movement.item_type === 'raw') return true;
      if (activeTab === 'semi_finished' && movement.item_type === 'semi') return true;
      if (activeTab === 'packaging' && movement.item_type === 'packaging') return true;
      if (activeTab === 'finished_products' && movement.item_type === 'finished') return true;
      return false;
    });
  }, [movements, activeTab]);
  
  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };
  
  const resetFilters = () => {
    setFilters({
      movementType: 'all',
      itemType: 'all',
      dateRange: {
        from: subDays(new Date(), 30),
        to: new Date(),
      },
      searchTerm: ''
    });
  };
  
  const handleManualMovementSuccess = () => {
    setDialogOpen(false);
    refetch();
    toast.success('تم تسجيل حركة المخزون بنجاح');
  };
  
  const handleExportData = () => {
    exportInventoryMovementsToCSV(filteredMovements);
    toast.success('تم تصدير البيانات بنجاح');
  };
  
  if (error) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex flex-col items-start pb-6">
            <h1 className="text-3xl font-bold tracking-tight">تتبع المخزون</h1>
            <p className="text-muted-foreground">متابعة حركة المخزون والتعديلات</p>
          </div>
          
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-medium mb-2">حدث خطأ أثناء تحميل البيانات</h3>
              <p className="text-muted-foreground">
                {error instanceof Error ? error.message : 'خطأ غير معروف'}
              </p>
              <Button className="mt-4" onClick={() => refetch()}>
                إعادة المحاولة
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">تتبع المخزون</h1>
            <p className="text-muted-foreground">متابعة حركة المخزون والتعديلات</p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex gap-2 items-center">
                  إضافة حركة
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>إضافة حركة مخزون جديدة</DialogTitle>
                  <DialogDescription>
                    أدخل بيانات حركة المخزون الجديدة (وارد أو صادر)
                  </DialogDescription>
                </DialogHeader>
                <ManualMovementForm 
                  onSuccess={handleManualMovementSuccess}
                  onCancel={() => setDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
            
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'} 
              onClick={() => setViewMode('list')}
              className="flex gap-2 items-center"
            >
              <ListIcon className="h-4 w-4" />
              <span>قائمة</span>
            </Button>
            
            <Button 
              variant={viewMode === 'chart' ? 'default' : 'outline'} 
              onClick={() => setViewMode('chart')}
              className="flex gap-2 items-center"
            >
              <ChartBarIcon className="h-4 w-4" />
              <span>رسم بياني</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              className="flex gap-2 items-center"
            >
              <RefreshCw className="h-4 w-4" />
              <span>تحديث</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleExportData}
              className="flex gap-2 items-center"
            >
              <FileDownIcon className="h-4 w-4" />
              <span>تصدير</span>
            </Button>
          </div>
        </div>

        {/* عرض إحصائيات حركة المخزون */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : (
          <InventoryMovementStats 
            totalMovements={statsData?.totalMovements || 0}
            inMovements={statsData?.inMovements || 0}
            outMovements={statsData?.outMovements || 0}
            inQuantity={statsData?.inQuantity || 0}
            outQuantity={statsData?.outQuantity || 0}
            selectedCategory={activeTab}
          />
        )}
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="raw_materials">المواد الأولية</TabsTrigger>
            <TabsTrigger value="semi_finished">النصف مصنعة</TabsTrigger>
            <TabsTrigger value="packaging">مستلزمات التعبئة</TabsTrigger>
            <TabsTrigger value="finished_products">المنتجات النهائية</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <Card>
              <CardHeader className="pb-0">
                <InventoryMovementFilters 
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onResetFilters={resetFilters}
                />
              </CardHeader>
              
              <CardContent>
                {viewMode === 'chart' && !isLoading && filteredMovements.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <InventorySourcesChart movements={filteredMovements} />
                    {/* Additional charts can be added here */}
                  </div>
                ) : (
                  <div className="mt-6">
                    {isLoading ? (
                      <div className="space-y-4">
                        {Array(5).fill(0).map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : filteredMovements.length > 0 ? (
                      <InventoryMovementTable 
                        movements={filteredMovements} 
                        isLoading={isLoading} 
                      />
                    ) : (
                      <div className="text-center py-16 text-muted-foreground">
                        <FilterIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        <h3 className="text-xl font-medium mb-2">لا توجد نتائج</h3>
                        <p>لا توجد حركات مخزون تطابق معايير التصفية الحالية</p>
                        <Button 
                          className="mt-4" 
                          variant="outline"
                          onClick={resetFilters}
                        >
                          مسح جميع المرشحات
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default InventoryTracking;
