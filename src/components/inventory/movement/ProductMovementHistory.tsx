
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import InventoryMovementTrackingService from '@/services/inventory/InventoryMovementTrackingService';
import { Button } from '@/components/ui/button';
import InventoryMovementChart from '@/components/inventory/reports/InventoryMovementChart';
import InventorySummaryStats from '@/components/inventory/reports/InventorySummaryStats';
import MovementTypeBadge from './MovementTypeBadge';
import { Skeleton } from '@/components/ui/skeleton';

export interface ProductMovementHistoryProps {
  itemId: string;
  itemType: string;
  itemName: string;
  itemUnit?: string;
}

const ProductMovementHistory: React.FC<ProductMovementHistoryProps> = ({
  itemId,
  itemType,
  itemName,
  itemUnit = ''
}) => {
  const [activeTab, setActiveTab] = useState('list');
  const [timeRange, setTimeRange] = useState('month');
  
  const trackingService = InventoryMovementTrackingService.getInstance();
  
  // الحصول على حركات العنصر
  const { data: movements = [], isLoading, error } = useQuery({
    queryKey: ['item-movements', itemId, itemType],
    queryFn: async () => {
      const result = await trackingService.getItemMovements(itemId, itemType);
      return result || [];
    }
  });
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-10 w-40" />
        <div className="grid gap-4">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/30">
        <CardContent className="pt-6">
          <p className="text-center text-destructive">
            حدث خطأ أثناء تحميل بيانات حركات العنصر
          </p>
          <div className="flex justify-center mt-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              إعادة المحاولة
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <InventorySummaryStats itemId={itemId} itemType={itemType} />
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-xl">سجل حركة {itemName}</CardTitle>
              <CardDescription>سجل حركات الوارد والصادر للعنصر</CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[200px]">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="list">القائمة</TabsTrigger>
                  <TabsTrigger value="chart">رسم بياني</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {activeTab === 'chart' && (
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="اختر الفترة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">يومي</SelectItem>
                    <SelectItem value="week">أسبوعي</SelectItem>
                    <SelectItem value="month">شهري</SelectItem>
                    <SelectItem value="year">سنوي</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {activeTab === 'list' ? (
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-3">
                {movements.length > 0 ? (
                  movements.map((movement: any) => (
                    <div 
                      key={movement.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <MovementTypeBadge type={movement.movement_type} />
                          <span className="font-medium">{movement.reason || (movement.movement_type === 'in' ? 'إضافة للمخزون' : 'صرف من المخزون')}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          الكمية: {movement.quantity} {itemUnit} - الرصيد: {movement.balance_after} {itemUnit}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm">
                          {format(new Date(movement.created_at), 'yyyy/MM/dd', { locale: ar })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {movement.user_name || 'غير معروف'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground">لا توجد حركات مسجلة لهذا العنصر</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <InventoryMovementChart 
              itemId={itemId}
              itemType={itemType}
              timeRange={timeRange}
              itemName={itemName} 
              itemUnit={itemUnit}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductMovementHistory;
