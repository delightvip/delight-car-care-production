
import React from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import MovementCard from '@/components/inventory/MovementCard';
import { fetchInventoryMovements, filterMovementsByCategory } from '@/services/InventoryMovementService';

const InventoryTracking = () => {
  const [activeTab, setActiveTab] = React.useState('all');
  
  // Fetch real inventory movements from our service
  const { data: movementsData, isLoading, error } = useQuery({
    queryKey: ['inventoryMovements'],
    queryFn: fetchInventoryMovements,
    refetchInterval: 60000 // Refresh every minute
  });
  
  // Filter movements based on active tab
  const filteredMovements = React.useMemo(() => {
    if (!movementsData) return [];
    return filterMovementsByCategory(movementsData, activeTab);
  }, [movementsData, activeTab]);
  
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex flex-col items-start pb-6">
            <h1 className="text-3xl font-bold tracking-tight">تتبع المخزون</h1>
            <p className="text-muted-foreground">متابعة حركة المخزون والتعديلات</p>
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
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col items-start pb-6">
          <h1 className="text-3xl font-bold tracking-tight">تتبع المخزون</h1>
          <p className="text-muted-foreground">متابعة حركة المخزون والتعديلات</p>
        </div>
        
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
              <CardHeader>
                <CardTitle className="text-lg">حركة المخزون</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6">
                    {filteredMovements.length > 0 ? (
                      filteredMovements.map((movement) => (
                        <MovementCard key={movement.id} movement={movement} />
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        لا توجد حركات مخزون لعرضها
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
