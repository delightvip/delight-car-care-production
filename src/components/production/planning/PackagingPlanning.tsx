import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ChevronRight, Loader2, PackageCheck, Trash2 } from "lucide-react";
import ProductionDatabaseService from "@/services/database/ProductionDatabaseService";

interface FinishedProduct {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  semi_finished_id: number;
  semi_finished_quantity: number;
  unit_cost: number;
}

interface SemiFinishedProduct {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unit_cost: number;
}

interface PackagingMaterial {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit_cost: number;
}

interface PackagingPlanningItem {
  packageMaterialId: number;
  code: string;
  name: string;
  requiredQuantity: number;
  unitCost: number;
  available: boolean;
}

const PackagingPlanning = () => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productionQuantity, setProductionQuantity] = useState<number>(1);
  const [packagingMaterials, setPackagingMaterials] = useState<PackagingPlanningItem[]>([]);
  const [semiFinished, setSemiFinished] = useState<SemiFinishedProduct | null>(null);
  const [semiFinishedQuantityNeeded, setSemiFinishedQuantityNeeded] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const productionService = ProductionDatabaseService.getInstance();
  
  const { data: finishedProducts = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['finishedProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finished_products')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as FinishedProduct[];
    }
  });
  
  const { data: productPackagingMaterials = [], isLoading: isLoadingPackaging } = useQuery({
    queryKey: ['productPackaging', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];
      
      const { data, error } = await supabase
        .from('finished_product_packaging')
        .select(`
          packaging_material_id,
          quantity,
          packaging_material:packaging_material_id(id, code, name, quantity, unit_cost)
        `)
        .eq('finished_product_id', selectedProductId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProductId
  });
  
  const { data: productDetails } = useQuery({
    queryKey: ['productDetails', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return null;
      
      const { data, error } = await supabase
        .from('finished_products')
        .select(`
          semi_finished_id,
          semi_finished_quantity,
          semi_finished:semi_finished_id(id, code, name, quantity, unit, unit_cost)
        `)
        .eq('id', selectedProductId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProductId
  });
  
  useEffect(() => {
    if (productDetails && productDetails.semi_finished) {
      setSemiFinished(productDetails.semi_finished as SemiFinishedProduct);
      
      const quantity = Number(productionQuantity);
      const requiredSemiFinishedQty = quantity * (productDetails.semi_finished_quantity || 0);
      setSemiFinishedQuantityNeeded(requiredSemiFinishedQty);
      
      const materials: PackagingPlanningItem[] = [];
      let totalPackagingCost = 0;
      
      productPackagingMaterials.forEach(item => {
        const requiredQty = item.quantity * quantity;
        const material = item.packaging_material;
        const unitCost = material?.unit_cost || 0;
        const materialCost = unitCost * requiredQty;
        totalPackagingCost += materialCost;
        
        materials.push({
          packageMaterialId: material?.id || 0,
          code: material?.code || '',
          name: material?.name || '',
          requiredQuantity: requiredQty,
          unitCost: unitCost,
          available: (material?.quantity || 0) >= requiredQty
        });
      });
      
      setPackagingMaterials(materials);
      
      const semiFinishedCost = (productDetails.semi_finished?.unit_cost || 0) * requiredSemiFinishedQty;
      setTotalCost(semiFinishedCost + totalPackagingCost);
    }
  }, [selectedProductId, productionQuantity, productDetails, productPackagingMaterials]);
  
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProductId || !semiFinished) {
        throw new Error('يرجى اختيار منتج وكمية صحيحة');
      }
      
      const product = finishedProducts.find(p => p.id.toString() === selectedProductId);
      if (!product) {
        throw new Error('لم يتم العثور على المنتج المحدد');
      }
      
      const packagingMaterialsData = packagingMaterials.map(material => ({
        code: material.code,
        name: material.name,
        quantity: material.requiredQuantity
      }));
      
      return await productionService.createPackagingOrder(
        product.code,
        product.name,
        productionQuantity,
        product.unit,
        {
          code: semiFinished.code,
          name: semiFinished.name,
          quantity: semiFinishedQuantityNeeded
        },
        packagingMaterialsData,
        totalCost
      );
    },
    onSuccess: () => {
      toast.success('تم إنشاء أمر التعبئة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['packagingOrders'] });
      navigate('/production/packaging-orders');
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ أثناء إنشاء أمر التعبئة: ${error.message}`);
    }
  });
  
  const handleCreateOrder = () => {
    if (!selectedProductId) {
      toast.error('يرجى اختيار منتج');
      return;
    }
    
    const quantity = Number(productionQuantity);
    
    if (quantity <= 0) {
      toast.error('يجب أن تكون الكمية أكبر من 0');
      return;
    }
    
    if (!semiFinished) {
      toast.error('لم يتم تحديد المنتج النصف مصنع بشكل صحيح');
      return;
    }
    
    if (semiFinished.quantity < semiFinishedQuantityNeeded) {
      if (!window.confirm(`تحذير: كمية المنتج النصف المصنع (${semiFinished.quantity}) أقل من الكمية المطلوبة (${semiFinishedQuantityNeeded}). هل تريد المتابعة على أي حال؟`)) {
        return;
      }
    }
    
    const unavailablePackaging = packagingMaterials.filter(m => !m.available);
    if (unavailablePackaging.length > 0) {
      if (!window.confirm(`تحذير: بعض مواد التعبئة غير متوفرة بالكمية المطلوبة. هل تريد المتابعة على أي حال؟`)) {
        return;
      }
    }
    
    setIsCreatingOrder(true);
    createOrderMutation.mutate();
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-6 w-6" />
            تخطيط أمر تعبئة جديد
          </CardTitle>
          <CardDescription>
            قم باختيار المنتج النهائي وإدخال الكمية المطلوب إنتاجها
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product">المنتج النهائي</Label>
              <Select 
                value={selectedProductId} 
                onValueChange={setSelectedProductId}
                disabled={isLoadingProducts || isCreatingOrder}
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder="اختر المنتج النهائي" />
                </SelectTrigger>
                <SelectContent>
                  {finishedProducts.map(product => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name} ({product.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity">الكمية المطلوبة</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={productionQuantity}
                onChange={(e) => setProductionQuantity(Number(e.target.value))}
                disabled={isCreatingOrder}
              />
            </div>
          </div>
          
          {selectedProductId && (
            <>
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">تفاصيل المنتج النصف مصنع المطلوب</h3>
                
                {semiFinished ? (
                  <div className="border rounded-md p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">المنتج</div>
                        <div>{semiFinished.name} ({semiFinished.code})</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">الكمية المطلوبة</div>
                        <div className="flex items-center gap-1">
                          <span>{semiFinishedQuantityNeeded}</span>
                          <span className="text-xs text-muted-foreground">{semiFinished.unit}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">الكمية المتوفرة</div>
                        <div className={`flex items-center gap-1 ${semiFinished.quantity < semiFinishedQuantityNeeded ? 'text-destructive' : 'text-success'}`}>
                          <span>{semiFinished.quantity}</span>
                          <span className="text-xs text-muted-foreground">{semiFinished.unit}</span>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <div className="text-sm font-medium text-muted-foreground">التكلفة</div>
                        <div>
                          {semiFinished.unit_cost} × {semiFinishedQuantityNeeded} = {(semiFinished.unit_cost * semiFinishedQuantityNeeded).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    {semiFinished.quantity < semiFinishedQuantityNeeded && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>تحذير نقص الكمية</AlertTitle>
                        <AlertDescription>
                          الكمية المتوفرة من المنتج النصف مصنع غير كافية. يرجى التحقق من المخزون أو تقليل الكمية المطلوبة.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    لم يتم تحديد منتج نصف مصنع بعد
                  </div>
                )}
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">مواد التعبئة المطلوبة</h3>
                
                {packagingMaterials.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الكود</TableHead>
                        <TableHead>اسم المادة</TableHead>
                        <TableHead>الكمية المطلوبة</TableHead>
                        <TableHead>التكلفة</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packagingMaterials.map((material, index) => (
                        <TableRow key={index}>
                          <TableCell>{material.code}</TableCell>
                          <TableCell>{material.name}</TableCell>
                          <TableCell>{material.requiredQuantity}</TableCell>
                          <TableCell>
                            {material.unitCost} × {material.requiredQuantity} = {(material.unitCost * material.requiredQuantity).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${material.available ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                              {material.available ? 'متوفر' : 'غير متوفر'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    لم يتم تحديد مواد تعبئة بعد
                  </div>
                )}
              </div>
              
              <div className="bg-muted p-4 rounded-md mt-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium">التكلفة الإجمالية:</div>
                  <div className="text-xl font-bold">{totalCost.toFixed(2)}</div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  تكلفة المنتج النصف مصنع: {semiFinished ? (semiFinished.unit_cost * semiFinishedQuantityNeeded).toFixed(2) : '0.00'} + 
                  تكلفة مواد التعبئة: {(totalCost - (semiFinished ? semiFinished.unit_cost * semiFinishedQuantityNeeded : 0)).toFixed(2)}
                </div>
              </div>
              
              <div className="flex justify-end gap-4 mt-6">
                <Button 
                  variant="outline"
                  onClick={() => navigate('/production/packaging-orders')}
                  disabled={isCreatingOrder}
                >
                  إلغاء
                </Button>
                <Button 
                  onClick={handleCreateOrder}
                  disabled={!selectedProductId || productionQuantity <= 0 || isCreatingOrder}
                >
                  {isCreatingOrder ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري إنشاء الأمر...
                    </>
                  ) : (
                    <>
                      إنشاء أمر التعبئة
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PackagingPlanning;
