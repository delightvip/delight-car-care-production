import React from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import MovementCard from '@/components/inventory/MovementCard';
import { fetchInventoryMovements, filterMovementsByCategory } from '@/services/InventoryMovementService';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, FileDownIcon, FilterIcon, RefreshCw } from 'lucide-react';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import InventoryMovementStats from '@/components/inventory/InventoryMovementStats';
import { DateRange } from 'react-day-picker';

const InventoryTracking = () => {
  const [activeTab, setActiveTab] = React.useState('all');
  const [movementType, setMovementType] = React.useState<string>('all');
  const [dateRange, setDateRange] = React.useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  
  // Fetch real inventory movements from our service
  const { data: movementsData, isLoading, error, refetch } = useQuery({
    queryKey: ['inventoryMovements'],
    queryFn: fetchInventoryMovements,
    refetchInterval: 60000 // Refresh every minute
  });
  
  // Filter movements based on active filters
  const filteredMovements = React.useMemo(() => {
    if (!movementsData) return [];
    
    return movementsData.filter(movement => {
      // Filter by category
      if (activeTab !== 'all' && movement.category !== activeTab) {
        return false;
      }
      
      // Filter by movement type
      if (movementType !== 'all' && movement.type !== movementType) {
        return false;
      }
      
      // Filter by date range
      if (dateRange.from && !isAfter(movement.date, dateRange.from)) {
        return false;
      }
      if (dateRange.to && isAfter(movement.date, dateRange.to)) {
        return false;
      }
      
      // Filter by search term
      if (searchTerm.trim() !== '') {
        const lowercaseSearch = searchTerm.toLowerCase();
        return (
          movement.item_name.toLowerCase().includes(lowercaseSearch) ||
          movement.note.toLowerCase().includes(lowercaseSearch)
        );
      }
      
      return true;
    });
  }, [movementsData, activeTab, movementType, dateRange, searchTerm]);

  // Bulk actions for export
  const handleExportData = () => {
    // Convert filtered movements to CSV
    const headers = ['نوع الحركة', 'التصنيف', 'الصنف', 'الكمية', 'التاريخ', 'ملاحظات'];
    const csvData = filteredMovements.map(movement => [
      movement.type === 'in' ? 'وارد' : 'صادر',
      getCategoryName(movement.category),
      movement.item_name,
      movement.quantity,
      format(movement.date, 'yyyy/MM/dd'),
      movement.note
    ]);
    
    // Create CSV content
    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
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
  
  const getCategoryName = (category: string) => {
    switch(category) {
      case 'raw_materials': return 'المواد الأولية';
      case 'semi_finished': return 'المنتجات النصف مصنعة';
      case 'packaging': return 'مستلزمات التعبئة';
      case 'finished_products': return 'المنتجات النهائية';
      default: return category;
    }
  };
  
  // حساب عدد الحركات في كل فئة للشارة (badge) على علامات التبويب
  const getCategoryMovementCount = (category: string) => {
    if (!movementsData) return 0;
    return movementsData.filter(m => category === 'all' || m.category === category).length;
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
            <p className="text-muted-foreground">متابعة حركة المخزون والتعديلات</p>
          </div>
          
          <div className="flex gap-2">
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
        {movementsData && <InventoryMovementStats movements={movementsData} selectedCategory={activeTab} />}
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all" className="relative">
              الكل
              <Badge variant="secondary" className="mr-2 bg-secondary/30 hover:bg-secondary/30">
                {getCategoryMovementCount('all')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="raw_materials" className="relative">
              المواد الأولية
              <Badge variant="secondary" className="mr-2 bg-secondary/30 hover:bg-secondary/30">
                {getCategoryMovementCount('raw_materials')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="semi_finished" className="relative">
              النصف مصنعة
              <Badge variant="secondary" className="mr-2 bg-secondary/30 hover:bg-secondary/30">
                {getCategoryMovementCount('semi_finished')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="packaging" className="relative">
              مستلزمات التعبئة
              <Badge variant="secondary" className="mr-2 bg-secondary/30 hover:bg-secondary/30">
                {getCategoryMovementCount('packaging')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="finished_products" className="relative">
              المنتجات النهائية
              <Badge variant="secondary" className="mr-2 bg-secondary/30 hover:bg-secondary/30">
                {getCategoryMovementCount('finished_products')}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
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
                            <CalendarIcon className="ml-2 h-4 w-4" />
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
                
                {filteredMovements.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge variant="outline" className="bg-muted">
                      {filteredMovements.length} عنصر
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
                    {filteredMovements.length > 0 ? (
                      filteredMovements.map((movement) => (
                        <MovementCard key={movement.id} movement={movement} />
                      ))
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
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default InventoryTracking;
