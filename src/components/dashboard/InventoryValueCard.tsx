
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Beaker, Box, ShoppingBag } from 'lucide-react';

const InventoryValueCard: React.FC = () => {
  // Fetch inventory values
  const { data, isLoading } = useQuery({
    queryKey: ['inventoryValues'],
    queryFn: async () => {
      try {
        // جلب بيانات المواد الخام
        const rawMaterials = await supabase
          .from('raw_materials')
          .select('quantity, unit_cost');
        
        // جلب بيانات المنتجات نصف المصنعة
        const semiFinished = await supabase
          .from('semi_finished_products')
          .select('quantity, unit_cost');
        
        // جلب بيانات مواد التعبئة
        const packaging = await supabase
          .from('packaging_materials')
          .select('quantity, unit_cost');
        
        // جلب بيانات المنتجات النهائية
        const finished = await supabase
          .from('finished_products')
          .select('quantity, unit_cost, sales_price');
        
        // طباعة بيانات المنتجات النهائية للتحقق
        console.log('Finished products data:', finished.data);
        
        // حساب قيم المخزون مع التأكد من عدم وجود قيم undefined
        const rawValue = (rawMaterials.data || []).reduce((sum, item) => 
          sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0);
        
        const semiValue = (semiFinished.data || []).reduce((sum, item) => 
          sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0);
        
        const packagingValue = (packaging.data || []).reduce((sum, item) => 
          sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0);
        
        // حساب قيمة المنتجات النهائية بحرص مع التأكد من استخدام القيم الصحيحة
        const finishedValue = (finished.data || []).reduce((sum, item) => {
          const quantity = Number(item.quantity) || 0;
          const unitCost = Number(item.unit_cost) || 0;
          return sum + (quantity * unitCost);
        }, 0);
        
        // طباعة القيم المحسوبة للتحقق منها
        console.log("Inventory Values:", {
          rawValue,
          semiValue,
          packagingValue,
          finishedValue,
          totalValue: rawValue + semiValue + packagingValue + finishedValue
        });
        
        return {
          rawValue,
          semiValue,
          packagingValue,
          finishedValue,
          totalValue: rawValue + semiValue + packagingValue + finishedValue
        };
      } catch (error) {
        console.error("Error fetching inventory values:", error);
        return {
          rawValue: 0,
          semiValue: 0,
          packagingValue: 0,
          finishedValue: 0,
          totalValue: 0
        };
      }
    },
    refetchInterval: 60000 // تحديث كل دقيقة
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">قيمة المخزون</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">قيمة المخزون</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-4">
          <span className="text-3xl font-bold">
            {data?.totalValue.toLocaleString('ar-EG')} ج.م
          </span>
          <p className="text-sm text-muted-foreground">
            إجمالي قيمة المخزون (الجنيه المصري)
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-4 rounded-lg border bg-card/50 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 text-blue-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">المواد الأولية</p>
              <p className="text-lg font-bold">{data?.rawValue.toLocaleString('ar-EG')} ج.م</p>
              <p className="text-xs text-muted-foreground">
                {data && data.totalValue > 0 ? Math.round((data.rawValue / data.totalValue) * 100) : 0}% من المخزون
              </p>
            </div>
          </div>
          
          <div className="p-4 rounded-lg border bg-card/50 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 text-green-600">
              <Beaker className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">النصف مصنعة</p>
              <p className="text-lg font-bold">{data?.semiValue.toLocaleString('ar-EG')} ج.م</p>
              <p className="text-xs text-muted-foreground">
                {data && data.totalValue > 0 ? Math.round((data.semiValue / data.totalValue) * 100) : 0}% من المخزون
              </p>
            </div>
          </div>
          
          <div className="p-4 rounded-lg border bg-card/50 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 text-amber-600">
              <Box className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">مستلزمات التعبئة</p>
              <p className="text-lg font-bold">{data?.packagingValue.toLocaleString('ar-EG')} ج.م</p>
              <p className="text-xs text-muted-foreground">
                {data && data.totalValue > 0 ? Math.round((data.packagingValue / data.totalValue) * 100) : 0}% من المخزون
              </p>
            </div>
          </div>
          
          <div className="p-4 rounded-lg border bg-card/50 flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-100 text-purple-600">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">المنتجات النهائية</p>
              <p className="text-lg font-bold">{data?.finishedValue.toLocaleString('ar-EG')} ج.م</p>
              <p className="text-xs text-muted-foreground">
                {data && data.totalValue > 0 ? Math.round((data.finishedValue / data.totalValue) * 100) : 0}% من المخزون
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryValueCard;
