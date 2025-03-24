
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DataTableWithLoading from '@/components/ui/DataTableWithLoading';
import LowStockStats from '@/components/inventory/LowStockStats';
import LowStockCard from '@/components/inventory/LowStockCard';
import PageTransition from '@/components/ui/PageTransition';
import { AlertTriangle, Package, Beaker, Box, ShoppingBag } from 'lucide-react';

// تعريف أنواع العناصر منخفضة المخزون
export type LowStockItem = {
  id: number;
  name: string;
  code: string;
  quantity: number;
  min_stock: number;
  category: 'raw' | 'semi' | 'packaging' | 'finished';
  categoryLabel: string;
};

const InventoryLowStock: React.FC = () => {
  // استخدام React Query لجلب العناصر منخفضة المخزون
  const { data: lowStockItems, isLoading, error } = useQuery({
    queryKey: ['lowStockItems'],
    queryFn: async () => {
      try {
        // جلب المواد الأولية منخفضة المخزون
        const rawMaterialsResponse = await supabase
          .from('raw_materials')
          .select('id, name, code, quantity, min_stock')
          .lt('quantity', 'min_stock');
          
        // تنسيق بيانات المواد الأولية
        const rawMaterials = (rawMaterialsResponse.data || []).map(item => ({
          ...item,
          category: 'raw' as const,
          categoryLabel: 'مواد أولية'
        }));
          
        // جلب المنتجات النصف مصنعة منخفضة المخزون
        const semiFinishedResponse = await supabase
          .from('semi_finished_products')
          .select('id, name, code, quantity, min_stock')
          .lt('quantity', 'min_stock');
        
        // تنسيق بيانات المنتجات النصف مصنعة
        const semiFinishedProducts = (semiFinishedResponse.data || []).map(item => ({
          ...item,
          category: 'semi' as const,
          categoryLabel: 'نصف مصنعة'
        }));
        
        // جلب مواد التعبئة منخفضة المخزون
        const packagingResponse = await supabase
          .from('packaging_materials')
          .select('id, name, code, quantity, min_stock')
          .lt('quantity', 'min_stock');
        
        // تنسيق بيانات مواد التعبئة
        const packagingMaterials = (packagingResponse.data || []).map(item => ({
          ...item,
          category: 'packaging' as const,
          categoryLabel: 'مواد تعبئة'
        }));
        
        // جلب المنتجات النهائية منخفضة المخزون
        const finishedResponse = await supabase
          .from('finished_products')
          .select('id, name, code, quantity, min_stock')
          .lt('quantity', 'min_stock');
        
        // تنسيق بيانات المنتجات النهائية
        const finishedProducts = (finishedResponse.data || []).map(item => ({
          ...item,
          category: 'finished' as const,
          categoryLabel: 'منتجات نهائية'
        }));
        
        // دمج جميع النتائج
        return {
          allItems: [...rawMaterials, ...semiFinishedProducts, ...packagingMaterials, ...finishedProducts],
          rawMaterials,
          semiFinishedProducts,
          packagingMaterials,
          finishedProducts
        };
      } catch (error) {
        console.error("Error fetching low stock items:", error);
        throw error;
      }
    }
  });

  // تعريف أعمدة الجدول
  const columns = [
    {
      accessorKey: 'code',
      header: 'الكود',
    },
    {
      accessorKey: 'name',
      header: 'الاسم',
    },
    {
      accessorKey: 'categoryLabel',
      header: 'النوع',
    },
    {
      accessorKey: 'quantity',
      header: 'الكمية الحالية',
    },
    {
      accessorKey: 'min_stock',
      header: 'الحد الأدنى',
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">المخزون المنخفض</h1>
        
        {/* عرض إحصائيات المخزون المنخفض */}
        {lowStockItems && (
          <LowStockStats
            rawMaterialsCount={lowStockItems.rawMaterials.length}
            semiFinishedCount={lowStockItems.semiFinishedProducts.length}
            packagingCount={lowStockItems.packagingMaterials.length}
            finishedProductsCount={lowStockItems.finishedProducts.length}
          />
        )}
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* بطاقات المخزون المنخفض حسب الفئة */}
          <LowStockCard
            title="المواد الأولية"
            count={lowStockItems?.rawMaterials.length || 0}
            icon={<Package className="h-8 w-8" />}
            loading={isLoading}
            colorClass="text-blue-500 bg-blue-100"
          />
          
          <LowStockCard
            title="المنتجات النصف مصنعة"
            count={lowStockItems?.semiFinishedProducts.length || 0}
            icon={<Beaker className="h-8 w-8" />}
            loading={isLoading}
            colorClass="text-purple-500 bg-purple-100"
          />
          
          <LowStockCard
            title="مواد التعبئة"
            count={lowStockItems?.packagingMaterials.length || 0}
            icon={<Box className="h-8 w-8" />}
            loading={isLoading}
            colorClass="text-yellow-500 bg-yellow-100"
          />
          
          <LowStockCard
            title="المنتجات النهائية"
            count={lowStockItems?.finishedProducts.length || 0}
            icon={<ShoppingBag className="h-8 w-8" />}
            loading={isLoading}
            colorClass="text-green-500 bg-green-100"
          />
        </div>
        
        {/* جدول العناصر منخفضة المخزون */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              جميع العناصر منخفضة المخزون
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTableWithLoading
              columns={columns}
              data={lowStockItems?.allItems || []}
              isLoading={isLoading}
              error={error ? "حدث خطأ أثناء تحميل البيانات" : undefined}
              filterPlaceholder="ابحث عن عنصر..."
            />
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default InventoryLowStock;
