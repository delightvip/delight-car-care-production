import React, { useEffect, useState } from 'react';
import { subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import PageTransition from '@/components/ui/PageTransition';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { InventoryMovement } from '@/types/inventoryTypes';
import InventoryTrackingService from '@/services/InventoryTrackingService';
import MovementHistoryTable from '@/components/inventory/movement/MovementHistoryTable';
import MovementStatistics from '@/components/inventory/movement/MovementStatistics';
import MovementFilters from '@/components/inventory/movement/MovementFilters';
import { ArrowUpDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const InventoryTracking = () => {
  // حالة التبويب النشط
  const [activeTab, setActiveTab] = useState('all');
  
  // حالة المرشحات
  const [itemType, setItemType] = useState('all');
  const [movementType, setMovementType] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [searchTerm, setSearchTerm] = useState('');

  // استدعاء خدمة تتبع المخزون
  const trackingService = InventoryTrackingService.getInstance();
  
  // استعلام لجلب حركات المخزون
  const { data: movements, isLoading, error, refetch } = useQuery({
    queryKey: ['inventoryMovements', itemType, movementType, dateRange, activeTab],
    queryFn: async () => {
      // بناء معايير التصفية
      const filters: any = {};
      
      if (itemType !== 'all') {
        filters.itemType = itemType;
      }
      
      if (movementType !== 'all') {
        filters.movementType = movementType;
      }
      
      if (dateRange.from) {
        filters.startDate = dateRange.from;
      }
      
      if (dateRange.to) {
        filters.endDate = dateRange.to;
      }
      
      // الحصول على حركات المخزون من الخدمة
      return trackingService.getInventoryMovements(filters);
    }
  });
  
  // استعلام لجلب إحصائيات الحركة
  const { data: statistics, isLoading: isLoadingStats } = useQuery({
    queryKey: ['movementStatistics', dateRange],
    queryFn: async () => {
      // الحصول على إحصائيات حركة المخزون
      return trackingService.getMovementStatistics();
    }
  });
  
  // تصفية الحركات حسب مصطلح البحث
  const filteredMovements = React.useMemo(() => {
    if (!movements) return [];
    
    if (searchTerm.trim() === '') {
      return movements;
    }
    
    const searchLower = searchTerm.toLowerCase();
    return movements.filter(movement => {
      return (movement.reason || '').toLowerCase().includes(searchLower);
    });
  }, [movements, searchTerm]);
  
  // إعادة ضبط المرشحات
  const handleResetFilters = () => {
    setItemType('all');
    setMovementType('all');
    setDateRange({
      from: subDays(new Date(), 30),
      to: new Date(),
    });
    setSearchTerm('');
  };
  
  // تصدير البيانات إلى ملف CSV
  const handleExportData = () => {
    if (!filteredMovements.length) return;
    
    // تحويل نوع الحركة إلى النص العربي
    const getMovementTypeText = (type: string) => {
      switch (type) {
        case 'in': return 'وارد';
        case 'out': return 'صادر';
        case 'adjustment': return 'تعديل';
        default: return type;
      }
    };
    
    // تحويل نوع الصنف إلى النص العربي
    const getItemTypeText = (type: string) => {
      switch (type) {
        case 'raw': return 'مادة خام';
        case 'semi': return 'نصف مصنع';
        case 'packaging': return 'مواد تعبئة';
        case 'finished': return 'منتج نهائي';
        default: return type;
      }
    };
    
    // إنشاء رؤوس أعمدة الملف
    const headers = ['التاريخ', 'نوع الحركة', 'نوع الصنف', 'الكمية', 'الرصيد بعد الحركة', 'السبب'];
    
    // تحويل البيانات إلى صفوف CSV
    const rows = filteredMovements.map(m => [
      new Date(m.created_at).toLocaleString('ar-EG'),
      getMovementTypeText(m.movement_type),
      getItemTypeText(m.item_type),
      m.quantity.toString(),
      m.balance_after.toString(),
      m.reason || ''
    ]);
    
    // دمج الرؤوس والصفوف
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // إنشاء ملف وتنزيله
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `حركات_المخزون_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };
  
  // حساب إجمالي عدد الحركات
  const totalMovements = filteredMovements.length;
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">تتبع المخزون</h1>
            <p className="text-muted-foreground">متابعة حركة المخزون وتوثيق التغييرات</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              className="flex gap-2 items-center"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span>تحديث</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportData}
              disabled={filteredMovements.length === 0}
              className="flex gap-2 items-center"
            >
              <Download className="h-4 w-4" />
              <span>تصدير</span>
            </Button>
          </div>
        </div>

        {/* عرض إحصائيات المخزون */}
        {!isLoadingStats && statistics ? (
          <MovementStatistics 
            totalIn={statistics.totalIn || 0}
            totalOut={statistics.totalOut || 0}
            totalAdjustments={statistics.totalAdjustments || 0}
            movementsByType={statistics.movementsByType || {}}
            totalMovements={totalMovements}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">حركات المخزون</CardTitle>
            <MovementFilters 
              itemType={itemType}
              setItemType={setItemType}
              movementType={movementType}
              setMovementType={setMovementType}
              dateRange={dateRange}
              setDateRange={setDateRange}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onResetFilters={handleResetFilters}
            />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <MovementHistoryTable 
                movements={filteredMovements} 
                isLoading={isLoading} 
              />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default InventoryTracking;
