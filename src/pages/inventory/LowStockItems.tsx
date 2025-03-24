
import React, { useState, useMemo } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import LowStockCard from '@/components/inventory/LowStockCard';
import LowStockStats from '@/components/inventory/LowStockStats';

// Type for low stock items
interface LowStockData {
  raw: any[];
  semi: any[];
  packaging: any[];
  finished: any[];
}

const LowStockItems = () => {
  const [activeTab, setActiveTab] = useState('all');
  
  // Fetch low stock items using React Query with fixed query logic
  const { data: lowStockItems, isLoading, error } = useQuery({
    queryKey: ['lowStockItems'],
    queryFn: async () => {
      try {
        console.log("Fetching low stock items...");
        
        // Fetch raw materials data - comparing quantity directly with min_stock field
        const { data: rawMaterials, error: rawMaterialsError } = await supabase
          .from('raw_materials')
          .select('id, code, name, quantity, min_stock, unit')
          .lt('quantity', 'min_stock');
        
        if (rawMaterialsError) throw new Error(rawMaterialsError.message);
        
        // Fetch semi-finished products data
        const { data: semiFinished, error: semiFinishedError } = await supabase
          .from('semi_finished_products')
          .select('id, code, name, quantity, min_stock, unit')
          .lt('quantity', 'min_stock');
        
        if (semiFinishedError) throw new Error(semiFinishedError.message);
        
        // Fetch packaging materials data
        const { data: packaging, error: packagingError } = await supabase
          .from('packaging_materials')
          .select('id, code, name, quantity, min_stock, unit')
          .lt('quantity', 'min_stock');
        
        if (packagingError) throw new Error(packagingError.message);
        
        // Fetch finished products data
        const { data: finished, error: finishedError } = await supabase
          .from('finished_products')
          .select('id, code, name, quantity, min_stock, unit')
          .lt('quantity', 'min_stock');
        
        if (finishedError) throw new Error(finishedError.message);
        
        console.log("Raw materials:", rawMaterials);
        console.log("Semi-finished:", semiFinished);
        console.log("Packaging:", packaging);
        console.log("Finished products:", finished);
        
        // Format the data for consistent display
        const formattedData: LowStockData = {
          raw: (rawMaterials || []).map(item => ({
            id: item.id,
            code: item.code,
            name: item.name,
            currentStock: item.quantity,
            minStock: item.min_stock,
            unit: item.unit,
            category: 'raw_materials',
            categoryName: 'المواد الأولية',
            route: '/inventory/raw-materials'
          })),
          semi: (semiFinished || []).map(item => ({
            id: item.id,
            code: item.code,
            name: item.name,
            currentStock: item.quantity,
            minStock: item.min_stock,
            unit: item.unit,
            category: 'semi_finished',
            categoryName: 'المنتجات النصف مصنعة',
            route: '/inventory/semi-finished'
          })),
          packaging: (packaging || []).map(item => ({
            id: item.id,
            code: item.code,
            name: item.name,
            currentStock: item.quantity,
            minStock: item.min_stock,
            unit: item.unit,
            category: 'packaging',
            categoryName: 'مستلزمات التعبئة',
            route: '/inventory/packaging'
          })),
          finished: (finished || []).map(item => ({
            id: item.id,
            code: item.code,
            name: item.name,
            currentStock: item.quantity,
            minStock: item.min_stock,
            unit: item.unit,
            category: 'finished_products',
            categoryName: 'المنتجات النهائية',
            route: '/inventory/finished-products'
          }))
        };
        
        return formattedData;
      } catch (error) {
        console.error('Error fetching low stock items:', error);
        throw error;
      }
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Initialize empty data structure if lowStockItems is undefined
  const safeData: LowStockData = lowStockItems || { raw: [], semi: [], packaging: [], finished: [] };
  
  // Combine all items and sort by stock percentage
  const allItems = useMemo(() => {    
    return [
      ...safeData.raw,
      ...safeData.semi,
      ...safeData.packaging,
      ...safeData.finished
    ].sort((a, b) => {
      const percentA = (a.currentStock / a.minStock) * 100;
      const percentB = (b.currentStock / b.minStock) * 100;
      return percentA - percentB;
    });
  }, [safeData]);
  
  // Calculate critical items
  const criticalItems = useMemo(() => {
    return allItems.filter(item => (item.currentStock / item.minStock) * 100 <= 50).length;
  }, [allItems]);
  
  // Handle error state
  if (error) {
    console.error('Error fetching low stock items:', error);
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المخزون المنخفض</h1>
            <p className="text-muted-foreground mt-1">العناصر التي وصلت إلى الحد الأدنى المسموح به أو أقل</p>
          </div>
          
          <Card className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">حدث خطأ أثناء تحميل البيانات</h3>
            <p className="text-muted-foreground">{error instanceof Error ? error.message : 'خطأ غير معروف'}</p>
          </Card>
        </div>
      </PageTransition>
    );
  }
  
  // Render loading skeleton
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المخزون المنخفض</h1>
            <p className="text-muted-foreground mt-1">العناصر التي وصلت إلى الحد الأدنى المسموح به أو أقل</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          
          <Skeleton className="h-10 w-full max-w-md mb-6" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </PageTransition>
    );
  }
  
  // Get filtered items based on active tab
  const getFilteredItems = () => {
    if (activeTab === 'all') return allItems;
    if (activeTab === 'raw') return safeData.raw || [];
    if (activeTab === 'semi') return safeData.semi || [];
    if (activeTab === 'packaging') return safeData.packaging || [];
    if (activeTab === 'finished') return safeData.finished || [];
    return [];
  };
  
  const filteredItems = getFilteredItems();
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المخزون المنخفض</h1>
          <p className="text-muted-foreground mt-1">العناصر التي وصلت إلى الحد الأدنى المسموح به أو أقل</p>
        </div>
        
        <LowStockStats allItems={allItems} criticalItems={criticalItems} />
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all">الكل ({allItems.length})</TabsTrigger>
            <TabsTrigger value="raw">المواد الأولية ({safeData.raw.length || 0})</TabsTrigger>
            <TabsTrigger value="semi">النصف مصنعة ({safeData.semi.length || 0})</TabsTrigger>
            <TabsTrigger value="packaging">مستلزمات التعبئة ({safeData.packaging.length || 0})</TabsTrigger>
            <TabsTrigger value="finished">المنتجات النهائية ({safeData.finished.length || 0})</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => <LowStockCard key={`${item.category}-${item.id}`} item={item} />)
              ) : (
                <Card className="col-span-full">
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p>لا توجد عناصر منخفضة المخزون في هذه الفئة</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default LowStockItems;
