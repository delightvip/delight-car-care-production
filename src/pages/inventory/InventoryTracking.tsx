
import React from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowDownIcon, ArrowUpIcon, Clipboard, FileEdit, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

const InventoryTracking = () => {
  const [activeTab, setActiveTab] = React.useState('all');
  
  // Fetch all inventory movements
  const { data: movementsData, isLoading } = useQuery({
    queryKey: ['inventoryMovements'],
    queryFn: async () => {
      // Simulate fetching inventory movements - in a real app you would have a table for this
      // Just showing sample events for now
      return [
        { id: 1, type: 'in', category: 'raw_materials', item_name: 'كحول إيثيلي', quantity: 100, date: new Date(2023, 5, 15), note: 'استلام مواد من المورد' },
        { id: 2, type: 'out', category: 'raw_materials', item_name: 'جليسرين', quantity: 50, date: new Date(2023, 5, 16), note: 'تحويل إلى إنتاج' },
        { id: 3, type: 'in', category: 'semi_finished', item_name: 'ملمع تابلوه سائل', quantity: 200, date: new Date(2023, 5, 17), note: 'إنتاج جديد' },
        { id: 4, type: 'out', category: 'packaging', item_name: 'عبوة بلاستيكية 250مل', quantity: 150, date: new Date(2023, 5, 18), note: 'تحويل إلى تعبئة' },
        { id: 5, type: 'in', category: 'finished_products', item_name: 'ملمع تابلوه 250مل', quantity: 120, date: new Date(2023, 5, 19), note: 'منتج نهائي جديد' },
      ];
    },
  });
  
  // Filter movements based on active tab
  const filteredMovements = React.useMemo(() => {
    if (!movementsData) return [];
    
    if (activeTab === 'all') return movementsData;
    
    return movementsData.filter(movement => movement.category === activeTab);
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
                    {filteredMovements.map((movement) => (
                      <div 
                        key={movement.id} 
                        className="flex items-start p-4 border rounded-lg transition-colors"
                      >
                        <div className={`shrink-0 p-2 rounded-full mr-4 ${
                          movement.type === 'in' 
                            ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300'
                        }`}>
                          {movement.type === 'in' ? (
                            <ArrowDownIcon className="h-6 w-6" />
                          ) : (
                            <ArrowUpIcon className="h-6 w-6" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <h3 className="font-medium">{movement.item_name}</h3>
                              <p className="text-sm text-muted-foreground">{movement.note}</p>
                            </div>
                            <div className="text-left">
                              <span className="font-medium">
                                {movement.type === 'in' ? '+' : '-'}{movement.quantity}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {format(movement.date, 'yyyy/MM/dd')}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <Badge 
                              variant="outline" 
                              className={`
                                ${movement.category === 'raw_materials' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                ${movement.category === 'semi_finished' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                                ${movement.category === 'packaging' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                                ${movement.category === 'finished_products' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                              `}
                            >
                              {movement.category === 'raw_materials' && 'المواد الأولية'}
                              {movement.category === 'semi_finished' && 'المنتجات النصف مصنعة'}
                              {movement.category === 'packaging' && 'مستلزمات التعبئة'}
                              {movement.category === 'finished_products' && 'المنتجات النهائية'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
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
