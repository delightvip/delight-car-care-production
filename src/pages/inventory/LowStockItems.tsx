import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Package, Beaker, Box, ShoppingBag } from 'lucide-react';
import LowStockStats from '@/components/inventory/LowStockStats';
import LowStockCard from '@/components/inventory/LowStockCard';
import PageTransition from '@/components/ui/PageTransition';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { InventoryLowStockTable } from '@/components/inventory/InventoryLowStockTable';

const LowStockItems = () => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // استعلام المواد الأولية ذات المخزون المنخفض - updated query
  const { data: rawMaterials, isLoading: rawMaterialsLoading, error: rawMaterialsError } = useQuery({
    queryKey: ['lowStockRawMaterials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .lt('quantity', 'min_stock')
        .gt('min_stock', 0);
        
      if (error) throw error;
      return data || [];
    },
  });
  
  // استعلام المنتجات نصف المصنعة ذات المخزون المنخفض - updated query
  const { data: semiFinished, isLoading: semiFinishedLoading, error: semiFinishedError } = useQuery({
    queryKey: ['lowStockSemiFinished'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('*')
        .lt('quantity', 'min_stock')
        .gt('min_stock', 0);
        
      if (error) throw error;
      return data || [];
    },
  });
  
  // استعلام مستلزمات التعبئة ذات المخزون المنخفض - updated query
  const { data: packaging, isLoading: packagingLoading, error: packagingError } = useQuery({
    queryKey: ['lowStockPackaging'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('*')
        .lt('quantity', 'min_stock')
        .gt('min_stock', 0);
        
      if (error) throw error;
      return data || [];
    },
  });
  
  // استعلام المنتجات النهائية ذات المخزون المنخفض - updated query
  const { data: finishedProducts, isLoading: finishedProductsLoading, error: finishedProductsError } = useQuery({
    queryKey: ['lowStockFinishedProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finished_products')
        .select('*')
        .lt('quantity', 'min_stock')
        .gt('min_stock', 0);
        
      if (error) throw error;
      return data || [];
    },
  });
  
  const isLoading = rawMaterialsLoading || semiFinishedLoading || packagingLoading || finishedProductsLoading;
  const hasError = rawMaterialsError || semiFinishedError || packagingError || finishedProductsError;
  
  const renderError = () => {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>خطأ</AlertTitle>
        <AlertDescription>
          حدث خطأ أثناء تحميل البيانات. يرجى إعادة المحاولة لاحقا.
        </AlertDescription>
      </Alert>
    );
  };

  const handleSortChange = (value: string) => {
    setSortOrder(value as 'asc' | 'desc');
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المخزون المنخفض</h1>
            <p className="text-muted-foreground mt-1">العناصر التي تحتاج إلى تجديد المخزون بسبب انخفاض كمياتها</p>
          </div>
          
          <div className="w-full sm:w-48">
            <Select defaultValue={sortOrder} onValueChange={handleSortChange}>
              <SelectTrigger>
                <SelectValue placeholder="ترتيب حسب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">تصاعدي</SelectItem>
                <SelectItem value="desc">تنازلي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <LowStockCard 
            title="المواد الأولية" 
            count={rawMaterials?.length || 0} 
            icon={<Package size={20} />} 
            loading={rawMaterialsLoading}
            colorClass="bg-blue-100 text-blue-700" 
          />
          <LowStockCard 
            title="المنتجات النصف مصنعة" 
            count={semiFinished?.length || 0} 
            icon={<Beaker size={20} />} 
            loading={semiFinishedLoading}
            colorClass="bg-green-100 text-green-700" 
          />
          <LowStockCard 
            title="مستلزمات التعبئة" 
            count={packaging?.length || 0} 
            icon={<Box size={20} />} 
            loading={packagingLoading}
            colorClass="bg-purple-100 text-purple-700" 
          />
          <LowStockCard 
            title="المنتجات النهائية" 
            count={finishedProducts?.length || 0} 
            icon={<ShoppingBag size={20} />} 
            loading={finishedProductsLoading}
            colorClass="bg-amber-100 text-amber-700" 
          />
        </div>
        
        <LowStockStats
          rawMaterialsCount={rawMaterials?.length || 0}
          semiFinishedCount={semiFinished?.length || 0}
          packagingCount={packaging?.length || 0}
          finishedProductsCount={finishedProducts?.length || 0}
        />
        
        {hasError ? (
          renderError()
        ) : (
          <Tabs defaultValue="raw-materials" dir="rtl" className="w-full">
            <TabsList className="w-full max-w-md mx-auto flex justify-between mb-6">
              <TabsTrigger value="raw-materials">المواد الأولية</TabsTrigger>
              <TabsTrigger value="semi-finished">النصف مصنعة</TabsTrigger>
              <TabsTrigger value="packaging">مستلزمات التعبئة</TabsTrigger>
              <TabsTrigger value="finished">المنتجات النهائية</TabsTrigger>
            </TabsList>
            
            <TabsContent value="raw-materials">
              <InventoryLowStockTable 
                data={rawMaterials || []} 
                isLoading={rawMaterialsLoading} 
                sortOrder={sortOrder}
                type="raw"
              />
            </TabsContent>
            
            <TabsContent value="semi-finished">
              <InventoryLowStockTable 
                data={semiFinished || []} 
                isLoading={semiFinishedLoading} 
                sortOrder={sortOrder}
                type="semi"
              />
            </TabsContent>
            
            <TabsContent value="packaging">
              <InventoryLowStockTable 
                data={packaging || []} 
                isLoading={packagingLoading} 
                sortOrder={sortOrder}
                type="packaging"
              />
            </TabsContent>
            
            <TabsContent value="finished">
              <InventoryLowStockTable 
                data={finishedProducts || []} 
                isLoading={finishedProductsLoading} 
                sortOrder={sortOrder}
                type="finished"
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageTransition>
  );
};

export default LowStockItems;
