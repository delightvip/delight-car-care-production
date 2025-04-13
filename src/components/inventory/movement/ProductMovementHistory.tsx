
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { CalendarIcon, FileDown, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDateToArabic } from '@/lib/utils';
import { MovementTypeBadge } from './MovementTypeBadge';
import * as XLSX from 'xlsx';

interface InventoryMovement {
  id: string;
  item_id: string;
  item_type: string;
  movement_type: string;
  quantity: number;
  balance_after: number;
  reason: string;
  created_at: string;
  user_name: string;
}

interface ProductMovementHistoryProps {
  productId: string;
  productType: string;
  productName: string;
  unit: string;
}

const ProductMovementHistory: React.FC<ProductMovementHistoryProps> = ({
  productId,
  productType,
  productName,
  unit
}) => {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });
  
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Fetch inventory movements
  const { data: movements, isLoading, error } = useQuery({
    queryKey: ['inventoryMovements', productId, productType, dateRange, timeFilter],
    queryFn: async () => {
      // Construct base query
      let query = supabase
        .rpc('get_inventory_movements_by_item', {
          p_item_id: productId,
          p_item_type: productType
        });
      
      // Apply date range filter if selected
      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      
      if (dateRange.to) {
        // Add one day to include the end date fully
        const endDate = new Date(dateRange.to);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString());
      }
      
      // Apply time filter if not "all"
      if (timeFilter !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (timeFilter) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        // Override the date range if time filter is selected
        if (timeFilter !== 'custom') {
          query = query.gte('created_at', startDate.toISOString());
        }
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as InventoryMovement[];
    }
  });
  
  // Apply type filter
  const filteredMovements = movements?.filter(movement => {
    if (typeFilter === 'all') return true;
    return movement.movement_type === typeFilter;
  });
  
  // Prepare data for export
  const exportToExcel = () => {
    if (!filteredMovements || filteredMovements.length === 0) return;
    
    const exportData = filteredMovements.map(movement => ({
      'التاريخ': format(new Date(movement.created_at), 'yyyy-MM-dd HH:mm'),
      'نوع الحركة': getMovementTypeLabel(movement.movement_type),
      'الكمية': movement.quantity,
      'الرصيد بعد': movement.balance_after,
      'السبب': movement.reason || '-',
      'المستخدم': movement.user_name || '-'
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Movements");
    
    // Generate file name with product name and date
    const fileName = `حركة_${productName}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };
  
  function getMovementTypeLabel(type: string): string {
    switch (type) {
      case 'in': return 'وارد';
      case 'out': return 'صادر';
      case 'adjustment': return 'تسوية';
      default: return type;
    }
  }
  
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">سجل حركة {productName}</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToExcel}
              disabled={!filteredMovements || filteredMovements.length === 0}
            >
              <FileDown className="h-4 w-4 mr-2" />
              تصدير
            </Button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          <div className="flex-1 min-w-[200px]">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="نوع الحركة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحركات</SelectItem>
                <SelectItem value="in">وارد</SelectItem>
                <SelectItem value="out">صادر</SelectItem>
                <SelectItem value="adjustment">تسوية</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفترات</SelectItem>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="week">آخر أسبوع</SelectItem>
                <SelectItem value="month">آخر شهر</SelectItem>
                <SelectItem value="quarter">آخر 3 أشهر</SelectItem>
                <SelectItem value="year">آخر سنة</SelectItem>
                <SelectItem value="custom">فترة مخصصة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {timeFilter === 'custom' && (
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal h-9",
                      !dateRange.from && !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {formatDateToArabic(dateRange.from)} - {formatDateToArabic(dateRange.to)}
                        </>
                      ) : (
                        formatDateToArabic(dateRange.from)
                      )
                    ) : (
                      <span>اختر التاريخ</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => setDateRange(range as any)}
                    disabled={(date) => date > new Date()}
                    locale={ar}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="w-full h-16" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-center text-destructive">
            حدث خطأ أثناء تحميل البيانات
          </div>
        ) : !filteredMovements || filteredMovements.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            لا توجد حركات للمنتج في هذه الفترة
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-3">
              {filteredMovements.map((movement) => (
                <div 
                  key={movement.id} 
                  className="p-3 border rounded-md flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <MovementTypeBadge type={movement.movement_type} />
                      <span className="font-medium">
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity} {unit}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {movement.reason ? movement.reason : 'غير محدد'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      <span>الرصيد: </span>
                      <span>{movement.balance_after} {unit}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(movement.created_at), 'yyyy-MM-dd HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductMovementHistory;
