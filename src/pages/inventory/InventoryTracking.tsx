
import React from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChartBarIcon, 
  FileDownIcon, 
  FilterIcon, 
  RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import InventoryMovementTrackingService from '@/services/inventory/InventoryMovementTrackingService';
import InventoryMovementList from '@/components/inventory/movement/InventoryMovementList';
import InventoryMovementStats from '@/components/inventory/movement/InventoryMovementStats';
import InventoryMovementChart from '@/components/inventory/movement/InventoryMovementChart';

const InventoryTracking = () => {
  const [activeTab, setActiveTab] = React.useState('all');
  const [movementType, setMovementType] = React.useState<string>('all');
  const [dateRange, setDateRange] = React.useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'list' | 'chart'>('list');
  
  const trackingService = InventoryMovementTrackingService.getInstance();
  
  // الحصول على الحركات من خدمة تتبع المخزون
  const { data: movements = [], isLoading, error, refetch } = useQuery({
    queryKey: ['inventory-movements', activeTab, movementType, dateRange, searchTerm],
    queryFn: async () => {
      // الحصول على أحدث الحركات
      const recentMovements = await trackingService.getRecentMovements(100);
      
      // تطبيق التصفية
      return filterMovements(recentMovements, {
        category: activeTab !== 'all' ? activeTab : undefined,
        type: movementType !== 'all' ? movementType : undefined,
        dateRange,
        searchTerm
      });
    },
    refetchInterval: 60000, // تحديث كل دقيقة
  });
  
  // تصفية الحركات بناءً على المعايير
  const filterMovements = (data: any[], filters: any) => {
    return data.filter(movement => {
      // التصفية حسب الفئة
      if (filters.category && movement.item_type !== filters.category) {
        return false;
      }
      
      // التصفية حسب نوع الحركة
      if (filters.type && movement.movement_type !== filters.type) {
        return false;
      }
      
      // التصفية حسب نطاق التاريخ
      if (filters.dateRange) {
        const movementDate = new Date(movement.created_at);
        if (filters.dateRange.from && movementDate < filters.dateRange.from) {
          return false;
        }
        if (filters.dateRange.to) {
          const endOfDay = new Date(filters.dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          if (movementDate > endOfDay) {
            return false;
          }
        }
      }
      
      // التصفية حسب مصطلح البحث
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const itemName = (movement.item_name || '').toLowerCase();
        const reason = (movement.reason || '').toLowerCase();
        if (!itemName.includes(term) && !reason.includes(term)) {
          return false;
        }
      }
      
      return true;
    });
  };
  
  // الحصول على اسم الفئة
  const getCategoryName = (category: string) => {
    switch(category) {
      case 'raw': return 'المواد الأولية';
      case 'semi': return 'المنتجات النصف مصنعة';
      case 'packaging': return 'مواد التعبئة';
      case 'finished': return 'المنتجات النهائية';
      default: return category;
    }
  };
  
  // الحصول على عدد الحركات لكل فئة
  const getCategoryMovementCount = (category: string) => {
    if (!movements) return 0;
    return movements.filter(m => category === 'all' || m.item_type === category).length;
  };
  
  // تصدير البيانات
  const handleExportData = () => {
    // تحويل الحركات المصفاة إلى CSV
    const headers = ['نوع الحركة', 'التصنيف', 'الصنف', 'الكمية', 'التاريخ', 'السبب'];
    const csvData = movements.map(movement => [
      movement.movement_type === 'in' ? 'وارد' : 'صادر',
      getCategoryName(movement.item_type),
      movement.item_name,
      movement.quantity,
      format(new Date(movement.created_at), 'yyyy/MM/dd'),
      movement.reason
    ]);
    
    // إنشاء محتوى CSV
    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    // إنشاء رابط التنزيل
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `حركة-المخزون-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex flex-col items-start pb-6">
            <h1 className="text-3xl font-bold tracking-tight">تتبع المخزون</h1>
            <p className="text-muted-foreground">متابعة حركة المخزون والتعديلات</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          
          <Skeleton className="h-10 w-full max-w-md" />
          
          <div className="grid gap-6">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </PageTransition>
    );
  }
  
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
            <p className="text-muted-foreground">متابعة حركة المخزون وتحليل البيانات</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('list')}
              className="flex gap-2 items-center"
            >
              <span>قائمة</span>
            </Button>
            
            <Button 
              variant={viewMode === 'chart' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('chart')}
              className="flex gap-2 items-center"
            >
              <ChartBarIcon className="h-4 w-4" />
              <span>رسم بياني</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              className="flex gap-2 items-center"
            >
              <RefreshCw className="h-4 w-4" />
              <span>تحديث</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportData}
              className="flex gap-2 items-center"
            >
              <FileDownIcon className="h-4 w-4" />
              <span>تصدير</span>
            </Button>
          </div>
        </div>

        {/* عرض إحصائيات حركة المخزون */}
        <InventoryMovementStats selectedCategory={activeTab} />
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all" className="relative">
              الكل
              <Badge variant="secondary" className="mr-2 bg-secondary/30 hover:bg-secondary/30">
                {getCategoryMovementCount('all')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="raw" className="relative">
              المواد الأولية
              <Badge variant="secondary" className="mr-2 bg-secondary/30 hover:bg-secondary/30">
                {getCategoryMovementCount('raw')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="semi" className="relative">
              النصف مصنعة
              <Badge variant="secondary" className="mr-2 bg-secondary/30 hover:bg-secondary/30">
                {getCategoryMovementCount('semi')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="packaging" className="relative">
              مواد التعبئة
              <Badge variant="secondary" className="mr-2 bg-secondary/30 hover:bg-secondary/30">
                {getCategoryMovementCount('packaging')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="finished" className="relative">
              المنتجات النهائية
              <Badge variant="secondary" className="mr-2 bg-secondary/30 hover:bg-secondary/30">
                {getCategoryMovementCount('finished')}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            {viewMode === 'chart' ? (
              <InventoryMovementChart selectedCategory={activeTab} />
            ) : (
              <Card>
                <CardHeader className="pb-0">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <CardTitle className="text-lg">حركة المخزون</CardTitle>
                    
                    <div className="flex flex-col md:flex-row gap-2">
                      <div className="flex gap-2 flex-wrap md:flex-nowrap">
                        <div className="w-full md:w-auto">
                          <Input
                            placeholder="بحث في الأصناف والملاحظات..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-60"
                          />
                        </div>
                        
                        <Select value={movementType} onValueChange={setMovementType}>
                          <SelectTrigger className="w-full md:w-40">
                            <SelectValue placeholder="نوع الحركة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">جميع الحركات</SelectItem>
                            <SelectItem value="in">وارد</SelectItem>
                            <SelectItem value="out">صادر</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full md:w-auto justify-start text-left font-normal"
                            >
                              {dateRange.from ? (
                                dateRange.to ? (
                                  <>
                                    {format(dateRange.from, "yyyy/MM/dd")} - {format(dateRange.to, "yyyy/MM/dd")}
                                  </>
                                ) : (
                                  format(dateRange.from, "yyyy/MM/dd")
                                )
                              ) : (
                                "اختر الفترة"
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={dateRange.from}
                              selected={dateRange}
                              onSelect={range => {
                                setDateRange(range || { from: undefined, to: undefined });
                                if (range?.from && range?.to) {
                                  setIsCalendarOpen(false);
                                }
                              }}
                              locale={ar}
                              numberOfMonths={2}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      {(searchTerm || movementType !== 'all' || dateRange.from || dateRange.to) && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSearchTerm('');
                            setMovementType('all');
                            setDateRange({
                              from: subDays(new Date(), 30),
                              to: new Date()
                            });
                          }}
                          className="mt-2 md:mt-0"
                        >
                          مسح التصفية
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {movements.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Badge variant="outline" className="bg-muted">
                        {movements.length} عنصر
                      </Badge>
                      
                      {activeTab !== 'all' && (
                        <Badge variant="outline" className="bg-muted">
                          التصنيف: {getCategoryName(activeTab)}
                        </Badge>
                      )}
                      
                      {movementType !== 'all' && (
                        <Badge variant="outline" className="bg-muted">
                          نوع الحركة: {movementType === 'in' ? 'وارد' : 'صادر'}
                        </Badge>
                      )}
                      
                      {dateRange.from && (
                        <Badge variant="outline" className="bg-muted">
                          من: {format(dateRange.from, 'yyyy/MM/dd')}
                        </Badge>
                      )}
                      
                      {dateRange.to && (
                        <Badge variant="outline" className="bg-muted">
                          إلى: {format(dateRange.to, 'yyyy/MM/dd')}
                        </Badge>
                      )}
                      
                      {searchTerm && (
                        <Badge variant="outline" className="bg-muted">
                          بحث: {searchTerm}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-6">
                      {movements.length > 0 ? (
                        <InventoryMovementList />
                      ) : (
                        <div className="text-center py-16 text-muted-foreground">
                          <FilterIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                          <h3 className="text-xl font-medium mb-2">لا توجد نتائج</h3>
                          <p>لا توجد حركات مخزون تطابق معايير التصفية الحالية</p>
                          <Button 
                            className="mt-4" 
                            variant="outline"
                            onClick={() => {
                              setSearchTerm('');
                              setMovementType('all');
                              setDateRange({
                                from: subDays(new Date(), 30),
                                to: new Date()
                              });
                              setActiveTab('all');
                            }}
                          >
                            مسح جميع المرشحات
                          </Button>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default InventoryTracking;
