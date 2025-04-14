import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Beaker, Box, ShoppingBag } from 'lucide-react';
import { calculateFinishedProductCost, ensureNumericValue } from '@/components/inventory/common/InventoryDataFormatter';

const InventoryValueCard: React.FC = () => {
  // Fetch inventory values
  const { data, isLoading } = useQuery({
    queryKey: ['inventoryValues'],
    queryFn: async () => {
      // جلب بيانات المواد الأولية
      const rawMaterials = await supabase
        .from('raw_materials')
        .select('quantity, unit_cost');
      
      // جلب بيانات المنتجات النصف مصنعة
      const semiFinished = await supabase
        .from('semi_finished_products')
        .select('id, code, name, quantity, unit_cost');
      
      // جلب بيانات مستلزمات التعبئة
      const packaging = await supabase
        .from('packaging_materials')
        .select('quantity, unit_cost');
      
      // جلب بيانات المنتجات النهائية مع العلاقات المرتبطة
      const finished = await supabase
        .from('finished_products')
        .select(`
          id, 
          code, 
          name, 
          quantity, 
          unit_cost, 
          semi_finished_id,
          semi_finished_quantity,
          packaging:finished_product_packaging(
            id,
            quantity,
            packaging_material_id,
            packaging_material:packaging_materials(
              id,
              code,
              name,
              unit_cost
            )
          )
        `);
      
      // حساب القيم الإجمالية
      const rawValue = (rawMaterials.data || []).reduce((sum, item) => 
        sum + (item.quantity * item.unit_cost), 0);
      
      const semiValue = (semiFinished.data || []).reduce((sum, item) => 
        sum + (item.quantity * item.unit_cost), 0);
      
      const packagingValue = (packaging.data || []).reduce((sum, item) => 
        sum + (item.quantity * item.unit_cost), 0);
      
      // حساب قيمة المنتجات النهائية بالطريقة الصحيحة
      let finishedValue = 0;
      
      for (const product of finished.data || []) {
        const semiFinishedProduct = semiFinished.data?.find(item => item.id === product.semi_finished_id);
        
        // حساب تكلفة الوحدة باستخدام الدالة الصحيحة
        const unitCost = calculateFinishedProductCost(
          semiFinishedProduct,
          product.packaging,
          product.semi_finished_quantity
        );
        
        // إضافة القيمة الإجمالية (الكمية × تكلفة الوحدة)
        finishedValue += product.quantity * unitCost;
      }
      
      const totalValue = rawValue + semiValue + packagingValue + finishedValue;
      
      return {
        rawValue,
        semiValue,
        packagingValue,
        finishedValue,
        totalValue
      };
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
                {data ? Math.round((data.rawValue / data.totalValue) * 100) : 0}% من المخزون
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
                {data ? Math.round((data.semiValue / data.totalValue) * 100) : 0}% من المخزون
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
                {data ? Math.round((data.packagingValue / data.totalValue) * 100) : 0}% من المخزون
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
                {data ? Math.round((data.finishedValue / data.totalValue) * 100) : 0}% من المخزون
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryValueCard;
