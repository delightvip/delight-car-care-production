
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import InventoryMovementTrackingService from '@/services/inventory/InventoryMovementTrackingService';
import InventoryMovementChart from './InventoryMovementChart';

interface ProductMovementHistoryProps {
  itemId: string;
  itemType: string;
  itemName: string;
}

const ProductMovementHistory: React.FC<ProductMovementHistoryProps> = ({
  itemId,
  itemType,
  itemName,
}) => {
  const [activeTab, setActiveTab] = React.useState('movements');
  const trackingService = InventoryMovementTrackingService.getInstance();

  const { data: movements, isLoading } = useQuery({
    queryKey: ['product-movements', itemId, itemType],
    queryFn: () => trackingService.getItemMovements(itemId, itemType),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تحميل حركات المخزون</CardTitle>
          <CardDescription>جاري استرجاع البيانات...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!movements || movements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>سجل حركات المخزون</CardTitle>
          <CardDescription>لا توجد حركات مسجلة لهذا الصنف</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">لم يتم العثور على أي حركات مخزون مسجلة لهذا الصنف</p>
        </CardContent>
      </Card>
    );
  }

  // حساب الإحصائيات
  const totalIn = movements
    .filter(m => m.movement_type === 'in')
    .reduce((sum, m) => sum + (m.quantity || 0), 0);

  const totalOut = movements
    .filter(m => m.movement_type === 'out')
    .reduce((sum, m) => sum + (m.quantity || 0), 0);

  const netChange = totalIn - totalOut;

  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل حركات المخزون - {itemName}</CardTitle>
        <CardDescription>
          عرض جميع حركات المخزون المسجلة للصنف
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الوارد</p>
                <p className="text-2xl font-bold">{totalIn.toFixed(2)}</p>
              </div>
              <ArrowUpIcon className="h-8 w-8 text-emerald-500" />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الصادر</p>
                <p className="text-2xl font-bold">{totalOut.toFixed(2)}</p>
              </div>
              <ArrowDownIcon className="h-8 w-8 text-red-500" />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">صافي التغيير</p>
                <p className="text-2xl font-bold">{netChange.toFixed(2)}</p>
              </div>
              {netChange >= 0 ? (
                <ArrowUpIcon className="h-8 w-8 text-emerald-500" />
              ) : (
                <ArrowDownIcon className="h-8 w-8 text-red-500" />
              )}
            </CardContent>
          </Card>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="movements">قائمة الحركات</TabsTrigger>
            <TabsTrigger value="chart">الرسم البياني</TabsTrigger>
          </TabsList>
          
          <TabsContent value="movements">
            <ScrollArea className="h-[400px] pr-4 mt-4">
              <div className="space-y-4">
                {movements.map(movement => (
                  <Card key={movement.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={movement.movement_type === 'in' ? 'default' : 'destructive'}>
                              {movement.movement_type === 'in' ? 'وارد' : 'صادر'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(movement.created_at), 'PPP', { locale: ar })}
                            </span>
                          </div>
                          <p className="mt-2">{movement.reason || (movement.movement_type === 'in' ? 'إضافة للمخزون' : 'صرف من المخزون')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{movement.quantity}</p>
                          <p className="text-xs text-muted-foreground">
                            الرصيد بعد: {movement.balance_after}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="chart">
            <div className="mt-4">
              <InventoryMovementChart itemId={itemId} itemType={itemType} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProductMovementHistory;
