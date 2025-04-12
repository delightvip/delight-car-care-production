
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
  Loader2, 
  Package2, 
  Plus, 
  RotateCcw, 
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

// نوع البيانات لمواد التعبئة المطلوبة في المحاكاة
interface SimulationPackagingMaterial {
  id: string;
  code: string;
  name: string;
  requiredQuantity: number;
  originalCost: number;
  adjustedCost: number;
  available: boolean;
}

// نوع البيانات لمحاكاة أمر تعبئة
interface SimulationPackagingOrder {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  semiFinished: {
    code: string;
    name: string;
    quantity: number;
    originalCost: number;
    adjustedCost: number;
    available: boolean;
  };
  packagingMaterials: SimulationPackagingMaterial[];
  originalTotalCost: number;
  adjustedTotalCost: number;
}

const PackagingSimulation = () => {
  const [simulationOrders, setSimulationOrders] = useState<SimulationPackagingOrder[]>([]);
  const [selectedFinishedProductId, setSelectedFinishedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  
  // للحصول على المنتجات النهائية من قاعدة البيانات
  const { data: finishedProducts, isLoading: isLoadingFinished } = useQuery({
    queryKey: ['finished-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finished_products')
        .select('id, code, name, unit, unit_cost, semi_finished_id, semi_finished_quantity, quantity')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // للحصول على المنتجات نصف المصنعة من قاعدة البيانات
  const { data: semiFinishedProducts, isLoading: isLoadingSemiFinished } = useQuery({
    queryKey: ['semi-finished-products-for-packaging'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('id, code, name, unit, unit_cost, quantity');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // للحصول على مواد التعبئة المرتبطة بالمنتجات النهائية
  const { data: packagingMaterialsRelations, isLoading: isLoadingPackagingRelations } = useQuery({
    queryKey: ['finished-product-packaging'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finished_product_packaging')
        .select('id, finished_product_id, packaging_material_id, quantity');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // للحصول على مواد التعبئة
  const { data: packagingMaterials, isLoading: isLoadingPackagingMaterials } = useQuery({
    queryKey: ['packaging-materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('id, code, name, unit, unit_cost, quantity');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // إضافة أمر تعبئة جديد للمحاكاة
  const addSimulationOrder = () => {
    if (!selectedFinishedProductId || quantity <= 0) {
      toast.error('يرجى اختيار منتج وكمية صحيحة');
      return;
    }
    
    const selectedProduct = finishedProducts?.find(p => p.id.toString() === selectedFinishedProductId);
    
    if (!selectedProduct) {
      toast.error('لم يتم العثور على المنتج المحدد');
      return;
    }
    
    // البحث عن المنتج نصف المصنع المرتبط
    const semiFinished = semiFinishedProducts?.find(s => s.id === selectedProduct.semi_finished_id);
    
    if (!semiFinished) {
      toast.error('لم يتم العثور على المنتج نصف المصنع المرتبط');
      return;
    }
    
    // البحث عن مواد التعبئة المرتبطة بالمنتج النهائي
    const productPackagingRelations = packagingMaterialsRelations?.filter(
      relation => relation.finished_product_id.toString() === selectedFinishedProductId
    ) || [];
    
    // إعداد بيانات المنتج نصف المصنع للمحاكاة
    const requiredSemiFinishedQty = selectedProduct.semi_finished_quantity * quantity;
    const semiFinishedOriginalCost = requiredSemiFinishedQty * semiFinished.unit_cost;
    
    const simulationSemiFinished = {
      code: semiFinished.code,
      name: semiFinished.name,
      quantity: requiredSemiFinishedQty,
      originalCost: semiFinishedOriginalCost,
      adjustedCost: semiFinishedOriginalCost, // في البداية تكون نفس التكلفة الأصلية
      available: semiFinished.quantity >= requiredSemiFinishedQty
    };
    
    // تحويل مواد التعبئة إلى الشكل المطلوب للمحاكاة
    const simulationPackagingMaterials: SimulationPackagingMaterial[] = productPackagingRelations.map(relation => {
      const packagingMaterial = packagingMaterials?.find(pm => pm.id === relation.packaging_material_id);
      
      if (!packagingMaterial) {
        return {
          id: relation.id.toString(),
          code: 'غير متوفر',
          name: 'غير متوفر',
          requiredQuantity: relation.quantity * quantity,
          originalCost: 0,
          adjustedCost: 0,
          available: false
        };
      }
      
      const requiredQty = relation.quantity * quantity;
      const originalCost = requiredQty * packagingMaterial.unit_cost;
      
      return {
        id: relation.id.toString(),
        code: packagingMaterial.code,
        name: packagingMaterial.name,
        requiredQuantity: requiredQty,
        originalCost: originalCost,
        adjustedCost: originalCost, // في البداية تكون نفس التكلفة الأصلية
        available: packagingMaterial.quantity >= requiredQty
      };
    });
    
    // حساب إجمالي التكاليف
    const materialsOriginalCost = simulationPackagingMaterials.reduce(
      (sum, item) => sum + item.originalCost, 0
    );
    const totalOriginalCost = semiFinishedOriginalCost + materialsOriginalCost;
    
    // إنشاء أمر المحاكاة الجديد
    const newSimulationOrder: SimulationPackagingOrder = {
      id: Date.now().toString(), // معرف مؤقت للمحاكاة
      productCode: selectedProduct.code,
      productName: selectedProduct.name,
      quantity: quantity,
      unit: selectedProduct.unit,
      semiFinished: simulationSemiFinished,
      packagingMaterials: simulationPackagingMaterials,
      originalTotalCost: totalOriginalCost,
      adjustedTotalCost: totalOriginalCost // في البداية نفس التكلفة الأصلية
    };
    
    // إضافة أمر المحاكاة للقائمة
    setSimulationOrders(prev => [...prev, newSimulationOrder]);
    toast.success('تمت إضافة أمر التعبئة للمحاكاة');
    
    // إعادة تعيين النموذج
    setSelectedFinishedProductId('');
    setQuantity(1);
  };
  
  // حذف أمر من المحاكاة
  const removeSimulationOrder = (orderId: string) => {
    setSimulationOrders(prev => prev.filter(order => order.id !== orderId));
    toast.success('تم حذف الأمر من المحاكاة');
  };
  
  // تعديل كمية مادة تعبئة في المحاكاة
  const updatePackagingMaterialQuantity = (orderId: string, materialId: string, newQuantity: number) => {
    setSimulationOrders(prev => {
      return prev.map(order => {
        if (order.id !== orderId) return order;
        
        const updatedMaterials = order.packagingMaterials.map(material => {
          if (material.id !== materialId) return material;
          
          const packagingMaterial = packagingMaterials?.find(pm => pm.code === material.code);
          const unitCost = packagingMaterial ? packagingMaterial.unit_cost : 0;
          
          return {
            ...material,
            requiredQuantity: newQuantity,
            originalCost: newQuantity * unitCost,
            adjustedCost: newQuantity * unitCost,
            available: packagingMaterial ? packagingMaterial.quantity >= newQuantity : false
          };
        });
        
        // إعادة حساب إجمالي التكاليف
        const materialsOriginalCost = updatedMaterials.reduce(
          (sum, item) => sum + item.originalCost, 0
        );
        const totalOriginalCost = order.semiFinished.originalCost + materialsOriginalCost;
        const materialsAdjustedCost = updatedMaterials.reduce(
          (sum, item) => sum + item.adjustedCost, 0
        );
        const totalAdjustedCost = order.semiFinished.adjustedCost + materialsAdjustedCost;
        
        return {
          ...order,
          packagingMaterials: updatedMaterials,
          originalTotalCost: totalOriginalCost,
          adjustedTotalCost: totalAdjustedCost
        };
      });
    });
  };
  
  // تعديل تكلفة مادة تعبئة في المحاكاة
  const updatePackagingMaterialCost = (orderId: string, materialId: string, costAdjustmentFactor: number) => {
    setSimulationOrders(prev => {
      return prev.map(order => {
        if (order.id !== orderId) return order;
        
        const updatedMaterials = order.packagingMaterials.map(material => {
          if (material.id !== materialId) return material;
          
          return {
            ...material,
            adjustedCost: material.originalCost * costAdjustmentFactor
          };
        });
        
        // إعادة حساب إجمالي التكاليف المعدلة
        const materialsAdjustedCost = updatedMaterials.reduce(
          (sum, item) => sum + item.adjustedCost, 0
        );
        const totalAdjustedCost = order.semiFinished.adjustedCost + materialsAdjustedCost;
        
        return {
          ...order,
          packagingMaterials: updatedMaterials,
          adjustedTotalCost: totalAdjustedCost
        };
      });
    });
  };
  
  // تعديل تكلفة المنتج نصف المصنع في المحاكاة
  const updateSemiFinishedCost = (orderId: string, costAdjustmentFactor: number) => {
    setSimulationOrders(prev => {
      return prev.map(order => {
        if (order.id !== orderId) return order;
        
        const updatedSemiFinished = {
          ...order.semiFinished,
          adjustedCost: order.semiFinished.originalCost * costAdjustmentFactor
        };
        
        // إعادة حساب إجمالي التكاليف المعدلة
        const materialsAdjustedCost = order.packagingMaterials.reduce(
          (sum, item) => sum + item.adjustedCost, 0
        );
        const totalAdjustedCost = updatedSemiFinished.adjustedCost + materialsAdjustedCost;
        
        return {
          ...order,
          semiFinished: updatedSemiFinished,
          adjustedTotalCost: totalAdjustedCost
        };
      });
    });
  };
  
  // تعديل كمية المنتج نصف المصنع في المحاكاة
  const updateSemiFinishedQuantity = (orderId: string, newQuantity: number) => {
    setSimulationOrders(prev => {
      return prev.map(order => {
        if (order.id !== orderId) return order;
        
        const semiFinished = semiFinishedProducts?.find(s => s.code === order.semiFinished.code);
        const unitCost = semiFinished ? semiFinished.unit_cost : 0;
        
        const updatedSemiFinished = {
          ...order.semiFinished,
          quantity: newQuantity,
          originalCost: newQuantity * unitCost,
          adjustedCost: newQuantity * unitCost,
          available: semiFinished ? semiFinished.quantity >= newQuantity : false
        };
        
        // إعادة حساب إجمالي التكاليف
        const materialsOriginalCost = order.packagingMaterials.reduce(
          (sum, item) => sum + item.originalCost, 0
        );
        const totalOriginalCost = updatedSemiFinished.originalCost + materialsOriginalCost;
        const materialsAdjustedCost = order.packagingMaterials.reduce(
          (sum, item) => sum + item.adjustedCost, 0
        );
        const totalAdjustedCost = updatedSemiFinished.adjustedCost + materialsAdjustedCost;
        
        return {
          ...order,
          semiFinished: updatedSemiFinished,
          originalTotalCost: totalOriginalCost,
          adjustedTotalCost: totalAdjustedCost
        };
      });
    });
  };
  
  // بدء المحاكاة
  const startSimulation = () => {
    if (simulationOrders.length === 0) {
      toast.error('يرجى إضافة أوامر تعبئة للمحاكاة أولاً');
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
    setSelectedFinishedProductId('');
    setQuantity(1);
    toast.info('تم إعادة تعيين المحاكاة');
  };
  
  // اللوحة الرئيسية للمحاكاة
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* نموذج إضافة أمر تعبئة للمحاكاة */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              إضافة أمر تعبئة للمحاكاة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="finishedProduct">المنتج النهائي</Label>
              {isLoadingFinished ? (
                <div className="flex items-center justify-center h-10 bg-muted rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select value={selectedFinishedProductId} onValueChange={setSelectedFinishedProductId}>
                  <SelectTrigger id="finishedProduct">
                    <SelectValue placeholder="اختر المنتج" />
                  </SelectTrigger>
                  <SelectContent>
                    {finishedProducts?.map(product => (
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
              disabled={isLoadingFinished || isLoadingSemiFinished || isLoadingPackagingMaterials || isLoadingPackagingRelations}
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
                <Package2 className="h-5 w-5" />
                ملخص محاكاة التعبئة
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
                      <Package2 className="h-4 w-4 mr-2" />
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
                قم بإضافة أوامر تعبئة للمحاكاة
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
                      
                      {/* معلومات المنتج نصف المصنع */}
                      <div className="mb-4 border-b pb-4">
                        <div className="font-medium mb-2">المنتج نصف المصنع</div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">المنتج</div>
                            <div>{order.semiFinished.name} ({order.semiFinished.code})</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">الكمية</div>
                            <Input
                              type="number"
                              min="0"
                              value={order.semiFinished.quantity}
                              onChange={(e) => updateSemiFinishedQuantity(
                                order.id,
                                Number(e.target.value)
                              )}
                              className="h-8"
                              disabled={isSimulating}
                            />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">التكلفة</div>
                            <Badge variant={
                              order.semiFinished.originalCost === order.semiFinished.adjustedCost
                                ? "outline"
                                : order.semiFinished.adjustedCost > order.semiFinished.originalCost
                                  ? "destructive"
                                  : "success"
                            }>
                              {order.semiFinished.adjustedCost.toFixed(2)}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">عامل التعديل</div>
                            <Select
                              defaultValue="1"
                              onValueChange={(value) => updateSemiFinishedCost(
                                order.id,
                                Number(value)
                              )}
                              disabled={isSimulating}
                            >
                              <SelectTrigger className="h-8">
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
                          </div>
                        </div>
                      </div>
                      
                      {/* مواد التعبئة */}
                      <div>
                        <div className="font-medium mb-2">مواد التعبئة</div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>المادة</TableHead>
                              <TableHead>الكمية</TableHead>
                              <TableHead>التكلفة</TableHead>
                              <TableHead>عامل التعديل</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {order.packagingMaterials.map((material) => (
                              <TableRow key={material.id}>
                                <TableCell>
                                  <div className="font-medium">{material.name}</div>
                                  <div className="text-xs text-muted-foreground">{material.code}</div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={material.requiredQuantity}
                                    onChange={(e) => updatePackagingMaterialQuantity(
                                      order.id,
                                      material.id,
                                      Number(e.target.value)
                                    )}
                                    className="h-8 w-20"
                                    disabled={isSimulating}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Badge variant={
                                    material.originalCost === material.adjustedCost
                                      ? "outline"
                                      : material.adjustedCost > material.originalCost
                                        ? "destructive"
                                        : "success"
                                  }>
                                    {material.adjustedCost.toFixed(2)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    defaultValue="1"
                                    onValueChange={(value) => updatePackagingMaterialCost(
                                      order.id,
                                      material.id,
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

export default PackagingSimulation;
