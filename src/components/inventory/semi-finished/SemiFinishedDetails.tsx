
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Package, Beaker, Droplet } from 'lucide-react';
import ProductMovementHistory from '@/components/inventory/movement/ProductMovementHistory';

interface SemiFinishedDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
}

const SemiFinishedDetails: React.FC<SemiFinishedDetailsProps> = ({
  isOpen,
  onClose,
  product
}) => {
  const [activeTab, setActiveTab] = useState('details');
  
  // Fetch ingredients for this product
  const {
    data: ingredients,
    isLoading: isLoadingIngredients
  } = useQuery({
    queryKey: ['semiFinishedIngredients', product?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semi_finished_ingredients')
        .select(`
          id,
          percentage,
          ingredient_type,
          raw_material:raw_material_id(id, code, name, unit, unit_cost),
          semi_finished_product:semi_finished_id(id, code, name, unit, unit_cost)
        `)
        .eq('semi_finished_product_id', product.id);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!product?.id
  });
  
  // Format ingredient data for display
  const getIngredientData = (ingredient: any) => {
    if (ingredient.ingredient_type === 'raw' && ingredient.raw_material) {
      return {
        name: ingredient.raw_material.name,
        code: ingredient.raw_material.code,
        unit: ingredient.raw_material.unit,
        type: 'raw',
        unit_cost: ingredient.raw_material.unit_cost
      };
    } else if (ingredient.ingredient_type === 'semi' && ingredient.semi_finished_product) {
      return {
        name: ingredient.semi_finished_product.name,
        code: ingredient.semi_finished_product.code,
        unit: ingredient.semi_finished_product.unit,
        type: 'semi',
        unit_cost: ingredient.semi_finished_product.unit_cost
      };
    } else if (ingredient.ingredient_type === 'water') {
      return {
        name: 'ماء',
        code: 'WATER',
        unit: 'لتر',
        type: 'water',
        unit_cost: 0
      };
    }
    
    // Fallback
    return {
      name: 'غير معروف',
      code: '',
      unit: '',
      type: 'unknown',
      unit_cost: 0
    };
  };
  
  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'raw':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'semi':
        return <Beaker className="h-4 w-4 text-purple-600" />;
      case 'water':
        return <Droplet className="h-4 w-4 text-cyan-600" />;
      default:
        return null;
    }
  };
  
  if (!product) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تفاصيل المنتج النصف مصنع</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="details">معلومات المنتج</TabsTrigger>
            <TabsTrigger value="movements">حركات المخزون</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  {product.name}
                  <Badge variant="outline">{product.code}</Badge>
                </CardTitle>
                <CardDescription>
                  معلومات أساسية عن المنتج النصف مصنع
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">الكمية الحالية</div>
                    <div className="font-semibold">{product.quantity} {product.unit}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">الحد الأدنى للمخزون</div>
                    <div className="font-semibold">{product.min_stock} {product.unit}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">تكلفة الوحدة</div>
                    <div className="font-semibold">{product.unit_cost}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">سعر البيع</div>
                    <div className="font-semibold">{product.sales_price}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>مكونات المنتج</CardTitle>
                <CardDescription>
                  قائمة المكونات المستخدمة في تصنيع المنتج
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingIngredients ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : ingredients && ingredients.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الكود</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead className="text-center">النسبة</TableHead>
                        <TableHead className="text-center">الوحدة</TableHead>
                        <TableHead className="text-center">المساهمة في التكلفة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredients.map((ingredient) => {
                        const data = getIngredientData(ingredient);
                        const costContribution = (ingredient.percentage / 100) * (data.unit_cost || 0);
                        
                        return (
                          <TableRow key={ingredient.id}>
                            <TableCell>{data.code}</TableCell>
                            <TableCell>{data.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {getTypeIcon(data.type)}
                                <span>
                                  {data.type === 'raw' ? 'مادة خام' : 
                                   data.type === 'semi' ? 'منتج نصف مصنع' : 
                                   data.type === 'water' ? 'ماء' : 'غير معروف'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{ingredient.percentage}%</TableCell>
                            <TableCell className="text-center">{data.unit}</TableCell>
                            <TableCell className="text-center">{costContribution.toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    لا توجد مكونات مسجلة لهذا المنتج
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="movements">
            <Card>
              <CardHeader>
                <CardTitle>حركات المخزون</CardTitle>
                <CardDescription>
                  سجل حركات الإضافة والصرف للمنتج
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductMovementHistory
                  itemId={String(product.id)}
                  itemType="semi"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SemiFinishedDetails;
