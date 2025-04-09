
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Filter, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { enhancedToast } from '@/components/ui/enhanced-toast';
import { useNavigate } from 'react-router-dom';

interface UnusedItem {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  type: 'raw' | 'packaging';
  typeName: string;
  lastUsed: string | null;
  lastMovement: string | null;
}

const UnusedItemsReport = () => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const navigate = useNavigate();
  
  const { data: unusedItems, isLoading } = useQuery({
    queryKey: ['unused-items', selectedType],
    queryFn: async () => {
      try {
        // First, get all raw materials and packaging materials
        const { data: rawMaterials, error: rawError } = await supabase
          .from('raw_materials')
          .select('id, code, name, quantity, unit');
          
        if (rawError) throw rawError;
        
        const { data: packagingMaterials, error: packagingError } = await supabase
          .from('packaging_materials')
          .select('id, code, name, quantity, unit');
          
        if (packagingError) throw packagingError;
        
        // Get all semi-finished ingredients to identify which materials are used
        const { data: semiIngredients, error: semiError } = await supabase
          .from('semi_finished_ingredients')
          .select('raw_material_id');
          
        if (semiError) throw semiError;
        
        // Get production order ingredients to see which raw materials are used in production
        const { data: productionIngredients, error: prodError } = await supabase
          .from('production_order_ingredients')
          .select('raw_material_code');
          
        if (prodError) throw prodError;
        
        // Get packaging order materials to see which packaging materials are used
        const { data: packagingOrderMaterials, error: packOrderError } = await supabase
          .from('packaging_order_materials')
          .select('packaging_material_code');
          
        if (packOrderError) throw packOrderError;
        
        // Get last movements for each material
        const { data: movements, error: movError } = await supabase
          .from('inventory_movements')
          .select('item_id, item_type, created_at')
          .order('created_at', { ascending: false });
          
        if (movError) throw movError;
        
        // Create sets of used material IDs and codes
        const usedRawMaterialIds = new Set(semiIngredients?.map(item => item.raw_material_id) || []);
        const usedRawMaterialCodes = new Set(productionIngredients?.map(item => item.raw_material_code) || []);
        const usedPackagingCodes = new Set(packagingOrderMaterials?.map(item => item.packaging_material_code) || []);
        
        // Map movements to items
        const lastMovementMap = new Map();
        movements?.forEach(movement => {
          const key = `${movement.item_type}-${movement.item_id}`;
          if (!lastMovementMap.has(key)) {
            lastMovementMap.set(key, movement.created_at);
          }
        });
        
        // Find unused raw materials
        const unusedRaw = rawMaterials
          ?.map(item => {
            const isUsed = usedRawMaterialIds.has(item.id) || 
                          usedRawMaterialCodes.has(item.code);
            
            if (!isUsed || selectedType === 'all' || selectedType === 'raw') {
              return {
                id: item.id,
                code: item.code,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                type: 'raw' as const,
                typeName: 'مواد خام',
                lastUsed: null,
                lastMovement: lastMovementMap.get(`raw-${item.id}`) || null,
                isUnused: !isUsed
              };
            }
            return null;
          })
          .filter(item => item !== null && item.isUnused) as UnusedItem[];
          
        // Find unused packaging materials
        const unusedPackaging = packagingMaterials
          ?.map(item => {
            const isUsed = usedPackagingCodes.has(item.code);
            
            if (!isUsed || selectedType === 'all' || selectedType === 'packaging') {
              return {
                id: item.id,
                code: item.code,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                type: 'packaging' as const,
                typeName: 'مواد تعبئة',
                lastUsed: null,
                lastMovement: lastMovementMap.get(`packaging-${item.id}`) || null,
                isUnused: !isUsed
              };
            }
            return null;
          })
          .filter(item => item !== null && item.isUnused) as UnusedItem[];
          
        // Combine results based on filter
        let result = [];
        
        if (selectedType === 'all') {
          result = [...(unusedRaw || []), ...(unusedPackaging || [])];
        } else if (selectedType === 'raw') {
          result = unusedRaw || [];
        } else if (selectedType === 'packaging') {
          result = unusedPackaging || [];
        }
        
        return result;
      } catch (error) {
        console.error("Error fetching unused items:", error);
        enhancedToast.error("حدث خطأ أثناء جلب بيانات العناصر غير المستخدمة");
        return [];
      }
    },
    refetchOnWindowFocus: false
  });
  
  const viewItemDetails = (item: UnusedItem) => {
    if (item.type === 'raw') {
      navigate(`/inventory/raw-material/${item.id}`);
    } else if (item.type === 'packaging') {
      navigate(`/inventory/packaging-material/${item.id}`);
    }
  };
  
  return (
    <Card id="unused-items">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
          تقرير العناصر غير المستخدمة
        </CardTitle>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted-foreground" />
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="نوع العنصر" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              <SelectItem value="raw">المواد الخام</SelectItem>
              <SelectItem value="packaging">مواد التعبئة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : unusedItems && unusedItems.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">الكود</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead className="text-center">الكمية</TableHead>
                  <TableHead className="text-center">آخر حركة</TableHead>
                  <TableHead className="text-center w-[100px]">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unusedItems.map((item) => (
                  <TableRow key={`${item.type}-${item.id}`}>
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Badge variant={item.type === 'raw' ? 'default' : 'secondary'}>
                        {item.typeName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.lastMovement ? new Date(item.lastMovement).toLocaleDateString('ar-EG') : 'لا يوجد'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => viewItemDetails(item)}>
                        <Eye size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 opacity-50 mb-4" />
            <h3 className="mt-2 text-lg font-semibold">لا توجد عناصر غير مستخدمة</h3>
            <p className="text-muted-foreground mt-1">
              جميع العناصر في المخزون تستخدم في المنتجات أو عمليات الإنتاج
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UnusedItemsReport;
