
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calculator, 
  Factory, 
  Loader2, 
  Plus, 
  RotateCcw, 
  Save, 
  Trash2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';

// نوع البيانات للمكون المطلوب في أمر الإنتاج
interface SimulationIngredient {
  id: string;
  code: string;
  name: string;
  requiredQuantity: number;
  originalCost: number;
  adjustedCost: number;
  available: boolean;
}

// نوع البيانات لأمر إنتاج محاكي
interface SimulationProductionOrder {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  ingredients: SimulationIngredient[];
  originalTotalCost: number;
  adjustedTotalCost: number;
}

const ProductionSimulation = () => {
  const [simulationOrders, setSimulationOrders] = useState<SimulationProductionOrder[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  
  // للحصول على المنتجات نصف المصنعة من قاعدة البيانات
  const { data: semiFinishedProducts, isLoading: isLoadingSemiFinished } = useQuery({
    queryKey: ['semi-finished-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('id, code, name, unit, unit_cost, quantity');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // للحصول على المواد الخام من قاعدة البيانات
  const { data: rawMaterials, isLoading: isLoadingRawMaterials } = useQuery({
    queryKey: ['raw-materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('id, code, name, unit, unit_cost, quantity');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // للحصول على مكونات المنتجات نصف المصنعة
  const { data: ingredients, isLoading: isLoadingIngredients } = useQuery({
    queryKey: ['semi-finished-ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semi_finished_ingredients')
        .select('id, semi_finished_id, raw_material_id, percentage, ingredient_type');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // إضافة أمر إنتاج جديد للمحاكاة
  const addSimulationOrder = () => {
    if (!selectedProductId || quantity <= 0) {
      toast.error('يرجى اختيار منتج وكمية صحيحة');
      return;
    }
    
    const selectedProduct = semiFinishedProducts?.find(p => p.id.toString() === selectedProductId);
    
    if (!selectedProduct) {
      toast.error('لم يتم العثور على المنتج المحدد');
      return;
    }
    
    // البحث عن مكونات المنتج المختار
    const productIngredients = ingredients?.filter(i => 
      i.semi_finished_id.toString() === selectedProductId
    ) || [];
    
    // تحويل المكونات إلى الشكل المطلوب للمحاكاة
    const simulationIngredients: SimulationIngredient[] = productIngredients.map(ingredient => {
      const rawMaterial = rawMaterials?.find(rm => rm.id === ingredient.raw_material_id);
      
      if (!rawMaterial) {
        return {
          id: ingredient.id.toString(),
          code: 'غير متوفر',
          name: 'غير متوفر',
          requiredQuantity: (ingredient.percentage / 100) * quantity,
          originalCost: 0,
          adjustedCost: 0,
          available: false
        };
      }
      
      const requiredQty = (ingredient.percentage / 100) * quantity;
      const originalCost = requiredQty * rawMaterial.unit_cost;
      
      return {
        id: ingredient.id.toString(),
        code: rawMaterial.code,
        name: rawMaterial.name,
        requiredQuantity: requiredQty,
        originalCost: originalCost,
        adjustedCost: originalCost, // في البداية تكون نفس التكلفة الأصلية
        available: rawMaterial.quantity >= requiredQty
      };
    });
    
    // حساب إجمالي التكاليف
    const totalOriginalCost = simulationIngredients.reduce(
      (sum, item) => sum + item.originalCost, 0
    );
    
    // إنشاء أمر المحاكاة الجديد
    const newSimulationOrder: SimulationProductionOrder = {
      id: Date.now().toString(), // معرف مؤقت للمحاكاة
      productCode: selectedProduct.code,
      productName: selectedProduct.name,
      quantity: quantity,
      unit: selectedProduct.unit,
      ingredients: simulationIngredients,
      originalTotalCost: totalOriginalCost,
      adjustedTotalCost: totalOriginalCost // في البداية نفس التكلفة الأصلية
    };
    
    // إضافة أمر المحاكاة للقائمة
    setSimulationOrders(prev => [...prev, newSimulationOrder]);
    toast.success('تمت إضافة أمر الإنتاج للمحاكاة');
    
    // إعادة تعيين النموذج
    setSelectedProductId('');
    setQuantity(1);
  };
  
  // حذف أمر من المحاكاة
  const removeSimulationOrder = (orderId: string) => {
    setSimulationOrders(prev => prev.filter(order => order.id !== orderId));
    toast.success('تم حذف الأمر من المحاكاة');
  };
  
  // تعديل كمية مكون في المحاكاة
  const updateIngredientQuantity = (orderId: string, ingredientId: string, newQuantity: number) => {
    setSimulationOrders(prev => {
      return prev.map(order => {
        if (order.id !== orderId) return order;
        
        const updatedIngredients = order.ingredients.map(ingredient => {
          if (ingredient.id !== ingredientId) return ingredient;
          
          const rawMaterial = rawMaterials?.find(rm => rm.code === ingredient.code);
          const unitCost = rawMaterial ? rawMaterial.unit_cost : 0;
          
          return {
            ...ingredient,
            requiredQuantity: newQuantity,
            originalCost: newQuantity * unitCost,
            adjustedCost: newQuantity * unitCost,
            available: rawMaterial ? rawMaterial.quantity >= newQuantity : false
          };
        });
        
        // إعادة حساب إجمالي التكاليف
        const newTotalCost = updatedIngredients.reduce(
          (sum, item) => sum + item.originalCost, 0
        );
        
        return {
          ...order,
          ingredients: updatedIngredients,
          originalTotalCost: newTotalCost,
          adjustedTotalCost: newTotalCost
        };
      });
    });
  };
  
  // تعديل تكلفة مكون في المحاكاة
  const updateIngredientCost = (orderId: string, ingredientId: string, costAdjustmentFactor: number) => {
    setSimulationOrders(prev => {
      return prev.map(order => {
        if (order.id !== orderId) return order;
        
        const updatedIngredients = order.ingredients.map(ingredient => {
          if (ingredient.id !== ingredientId) return ingredient;
          
          return {
            ...ingredient,
            adjustedCost: ingredient.originalCost * costAdjustmentFactor
          };
        });
        
        // إعادة حساب إجمالي التكاليف المعدلة
        const newAdjustedTotalCost = updatedIngredients.reduce(
          (sum, item) => sum + item.adjustedCost, 0
        );
        
        return {
          ...order,
          ingredients: updatedIngredients,
          adjustedTotalCost: newAdjustedTotalCost
        };
      });
    });
  };
  
  // بدء المحاكاة
  const startSimulation = () => {
    if (simulationOrders.length === 0) {
      toast.error('يرجى إضافة أوامر إنتاج للمحاكاة أولاً');
      return;
    }
    
    setIsSimulating(true);
    
    // محاكاة معالجة البيانات
    setTimeout(() => {
      toast.success('تمت المحاكاة بنجاح');
      setIsSimulating(false);
    }, 1500);
  };
  
  // إعادة تعيين المحاكاة
  const resetSimulation = () => {
    setSimulationOrders([]);
    setSelectedProductId('');
    setQuantity(1);
    toast.info('تم إعادة تعيين المحاكاة');
  };
  
  // اللوحة الرئيسية للمحاكاة
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* نموذج إضافة أمر إنتاج للمحاكاة */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              إضافة أمر إنتاج للمحاكاة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">المنتج نصف المصنع</Label>
              {isLoadingSemiFinished ? (
                <div className="flex items-center justify-center h-10 bg-muted rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger id="product">
                    <SelectValue placeholder="اختر المنتج" />
                  </SelectTrigger>
                  <SelectContent>
                    {semiFinishedProducts?.map(product => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} ({product.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity">الكمية</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            
            <Button
              onClick={addSimulationOrder}
              className="w-full"
              disabled={isLoadingSemiFinished || isLoadingRawMaterials || isLoadingIngredients}
            >
              <Plus className="h-4 w-4 mr-2" />
              إضافة للمحاكاة
            </Button>
          </CardContent>
        </Card>
        
        {/* ملخص المحاكاة */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                ملخص المحاكاة
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetSimulation}
                  disabled={simulationOrders.length === 0 || isSimulating}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  إعادة تعيين
                </Button>
                <Button
                  size="sm"
                  onClick={startSimulation}
                  disabled={simulationOrders.length === 0 || isSimulating}
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      جاري المحاكاة...
                    </>
                  ) : (
                    <>
                      <Factory className="h-4 w-4 mr-2" />
                      بدء المحاكاة
                    </>
                  )}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {simulationOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                قم بإضافة أوامر إنتاج للمحاكاة
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <div className="text-sm font-medium text-muted-foreground">إجمالي الأوامر</div>
                    <div className="text-2xl font-bold mt-1">{simulationOrders.length}</div>
                  </div>
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <div className="text-sm font-medium text-muted-foreground">التكلفة الأصلية</div>
                    <div className="text-2xl font-bold mt-1">
                      {simulationOrders.reduce((sum, order) => sum + order.originalTotalCost, 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <div className="text-sm font-medium text-muted-foreground">التكلفة المعدلة</div>
                    <div className="text-2xl font-bold mt-1">
                      {simulationOrders.reduce((sum, order) => sum + order.adjustedTotalCost, 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <ScrollArea className="h-[350px]">
                  {simulationOrders.map((order, orderIndex) => (
                    <div key={order.id} className="mb-6 border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h3 className="font-bold">{order.productName}</h3>
                          <div className="text-sm text-muted-foreground">
                            الكمية: {order.quantity} {order.unit} | الكود: {order.productCode}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={order.originalTotalCost === order.adjustedTotalCost ? "outline" : "secondary"}>
                            {order.adjustedTotalCost.toFixed(2)}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeSimulationOrder(order.id)}
                            className="h-8 w-8"
                            disabled={isSimulating}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>المكون</TableHead>
                            <TableHead>الكمية</TableHead>
                            <TableHead>التكلفة</TableHead>
                            <TableHead>عامل التعديل</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {order.ingredients.map((ingredient, ingredientIndex) => (
                            <TableRow key={ingredient.id}>
                              <TableCell>
                                <div className="font-medium">{ingredient.name}</div>
                                <div className="text-xs text-muted-foreground">{ingredient.code}</div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={ingredient.requiredQuantity}
                                  onChange={(e) => updateIngredientQuantity(
                                    order.id,
                                    ingredient.id,
                                    Number(e.target.value)
                                  )}
                                  className="h-8 w-20"
                                  disabled={isSimulating}
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  ingredient.originalCost === ingredient.adjustedCost
                                    ? "outline"
                                    : ingredient.adjustedCost > ingredient.originalCost
                                      ? "destructive"
                                      : "success"
                                }>
                                  {ingredient.adjustedCost.toFixed(2)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Select
                                  defaultValue="1"
                                  onValueChange={(value) => updateIngredientCost(
                                    order.id,
                                    ingredient.id,
                                    Number(value)
                                  )}
                                  disabled={isSimulating}
                                >
                                  <SelectTrigger className="h-8 w-20">
                                    <SelectValue placeholder="×1" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0.5">×0.5</SelectItem>
                                    <SelectItem value="0.8">×0.8</SelectItem>
                                    <SelectItem value="0.9">×0.9</SelectItem>
                                    <SelectItem value="1">×1</SelectItem>
                                    <SelectItem value="1.1">×1.1</SelectItem>
                                    <SelectItem value="1.2">×1.2</SelectItem>
                                    <SelectItem value="1.5">×1.5</SelectItem>
                                    <SelectItem value="2">×2</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductionSimulation;
