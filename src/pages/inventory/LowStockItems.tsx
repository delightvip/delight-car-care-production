
import React, { useState } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from "@/components/ui/progress";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Box, Beaker, Package, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

// Type for low stock items
interface LowStockItem {
  id: number;
  code: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  category: string;
  categoryName: string;
  route: string;
}

interface LowStockData {
  raw: LowStockItem[];
  semi: LowStockItem[];
  packaging: LowStockItem[];
  finished: LowStockItem[];
}

const LowStockItems = () => {
  const [activeTab, setActiveTab] = useState('all');
  
  // Fetch low stock items using React Query
  const { data: lowStockItems, isLoading, error } = useQuery({
    queryKey: ['lowStockItems'],
    queryFn: async () => {
      // Fetch raw materials data
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
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
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
            <Button className="mt-4" onClick={() => window.location.reload()}>
              إعادة المحاولة
            </Button>
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
  
  // Initialize empty data structure if lowStockItems is undefined
  const safeData: LowStockData = lowStockItems || { raw: [], semi: [], packaging: [], finished: [] };
  
  // Combine all items and sort by stock percentage
  const allItems = React.useMemo(() => {    
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
  
  // Calculate totals
  const totalLowStock = allItems.length;
  const criticalItems = allItems.filter(item => (item.currentStock / item.minStock) * 100 <= 50).length;
  
  // Render a stock item card
  const renderStockItem = (item: LowStockItem) => {
    const percentage = Math.min(100, Math.round((item.currentStock / item.minStock) * 100));
    const progressColor = 
      percentage <= 30 ? 'bg-red-500' : 
      percentage <= 70 ? 'bg-amber-500' : 
      'bg-green-500';
    
    // Icon based on category
    const ItemIcon = 
      item.category === 'raw_materials' ? Package :
      item.category === 'semi_finished' ? Beaker :
      item.category === 'packaging' ? Box :
      ShoppingBag;
    
    return (
      <Card key={item.code} className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-start gap-3">
              <div className={`
                p-2 rounded-md 
                ${item.category === 'raw_materials' ? 'bg-blue-100 text-blue-700' : ''}
                ${item.category === 'semi_finished' ? 'bg-green-100 text-green-700' : ''}
                ${item.category === 'packaging' ? 'bg-amber-100 text-amber-700' : ''}
                ${item.category === 'finished_products' ? 'bg-purple-100 text-purple-700' : ''}
              `}>
                <ItemIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-medium">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{item.code}</p>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={`
                ${item.category === 'raw_materials' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                ${item.category === 'semi_finished' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                ${item.category === 'packaging' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                ${item.category === 'finished_products' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
              `}
            >
              {item.categoryName}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span>المخزون الحالي: <span className="font-medium">{item.currentStock} {item.unit}</span></span>
              <span>الحد الأدنى: <span className="font-medium">{item.minStock} {item.unit}</span></span>
            </div>
            
            <div className="w-full">
              <Progress 
                value={percentage} 
                className={`h-2 ${progressColor}`} 
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span className={`text-sm font-medium ${
                percentage <= 30 ? 'text-red-600' :
                percentage <= 70 ? 'text-amber-600' :
                'text-green-600'
              }`}>
                {percentage}%
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link to={item.route}>
                  عرض التفاصيل
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // Get filtered items based on active tab
  const getFilteredItems = () => {
    if (activeTab === 'all') return allItems;
    if (activeTab === 'raw') return safeData.raw || [];
    if (activeTab === 'semi') return safeData.semi || [];
    if (activeTab === 'packaging') return safeData.packaging || [];
    if (activeTab === 'finished') return safeData.finished || [];
    return [];
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المخزون المنخفض</h1>
          <p className="text-muted-foreground mt-1">العناصر التي وصلت إلى الحد الأدنى المسموح به أو أقل</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-800 dark:text-amber-400 font-medium">إجمالي العناصر منخفضة المخزون</p>
                <h3 className="text-3xl font-bold text-amber-900 dark:text-amber-300 mt-1">{totalLowStock}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-red-800 dark:text-red-400 font-medium">العناصر الحرجة (أقل من 50%)</p>
                <h3 className="text-3xl font-bold text-red-900 dark:text-red-300 mt-1">{criticalItems}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col h-full justify-center">
                <p className="text-sm text-muted-foreground">
                  يُوصى بتجديد المخزون للعناصر التي تقل عن الحد الأدنى لضمان استمرارية عمليات الإنتاج.
                </p>
                <Button className="mt-4" size="sm" asChild>
                  <Link to="/inventory/tracking">
                    عرض حركة المخزون
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
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
              {getFilteredItems().length > 0 ? (
                getFilteredItems().map(renderStockItem)
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
