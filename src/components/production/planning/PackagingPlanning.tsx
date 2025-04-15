
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type Product = {
  id: number;
  name: string;
  code: string;
  unit: string;
  quantity: number;
  semi_finished_id: number;
  semi_finished_quantity: number;
};

type SemiFinishedProduct = {
  id: number;
  name: string;
  code: string;
  unit: string;
  quantity: number;
  unit_cost?: number;  // أضفنا الخاصية المفقودة
};

type PackagingMaterial = {
  id: number;
  name: string;
  code: string;
  unit: string;
  quantity: number;
  unit_cost?: number;   // أضفنا الخاصية المفقودة
  requiredQuantity?: number;  // أضفنا الخاصية المفقودة
};

export default function PackagingPlanning() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [packagingMaterials, setPackagingMaterials] = useState<PackagingMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch finished products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['finishedProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finished_products')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as Product[];
    }
  });
  
  // Fetch semi-finished products when a product is selected
  const { data: semiFinished, isLoading: semiFinishedLoading } = useQuery({
    queryKey: ['semiFinished', selectedProduct?.semi_finished_id],
    queryFn: async () => {
      if (!selectedProduct?.semi_finished_id) return null;
      
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('*')
        .eq('id', selectedProduct.semi_finished_id)
        .single();
      
      if (error) throw error;
      return data as SemiFinishedProduct;
    },
    enabled: !!selectedProduct?.semi_finished_id
  });
  
  // Fetch packaging materials for the selected product
  useEffect(() => {
    const fetchPackagingMaterials = async () => {
      if (!selectedProduct) return;
      
      try {
        const { data, error } = await supabase
          .from('finished_product_packaging')
          .select(`
            packaging_material_id,
            quantity,
            packaging_materials:packaging_material_id(id, name, code, unit, quantity)
          `)
          .eq('finished_product_id', selectedProduct.id);
        
        if (error) throw error;
        
        // Transform the data
        const materials = data.map(item => ({
          id: Number(item.packaging_materials.id),
          name: item.packaging_materials.name,
          code: item.packaging_materials.code,
          unit: item.packaging_materials.unit,
          quantity: item.packaging_materials.quantity,
          requiredQuantity: item.quantity * quantity
        }));
        
        setPackagingMaterials(materials);
      } catch (error) {
        console.error('Error fetching packaging materials:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تحميل مواد التعبئة',
          variant: 'destructive',
        });
      }
    };
    
    fetchPackagingMaterials();
  }, [selectedProduct, quantity]);
  
  const handleProductChange = (productId: string) => {
    const product = products?.find(p => p.id === Number(productId)) || null;
    setSelectedProduct(product);
    if (product) {
      setQuantity(1);
    }
  };
  
  const handleSimulate = () => {
    if (!selectedProduct || !semiFinished) {
      toast({
        title: 'تنبيه',
        description: 'الرجاء اختيار منتج أولاً',
      });
      return;
    }
    
    const semiFinishedQuantityNeeded = selectedProduct.semi_finished_quantity * quantity;
    
    if (Number(semiFinished.quantity) < semiFinishedQuantityNeeded) {
      if (!window.confirm(`تحذير: كمية المنتج النصف مصنع (${semiFinished.quantity}) أقل من الكمية المطلوبة (${semiFinishedQuantityNeeded}). هل تريد المتابعة على أي حال؟`)) {
        return;
      }
    }
    
    // Check if all packaging materials are available
    const unavailableMaterials = packagingMaterials.filter(m => 
      m.quantity < (m.requiredQuantity || 0)
    );
    
    if (unavailableMaterials.length > 0) {
      const materialNames = unavailableMaterials.map(m => m.name).join(', ');
      if (!window.confirm(`تحذير: المواد التالية غير متوفرة بالكمية المطلوبة: ${materialNames}. هل تريد المتابعة على أي حال؟`)) {
        return;
      }
    }
    
    // Calculate cost
    const semiFinishedCost = (semiFinished?.unit_cost || 0) * semiFinishedQuantityNeeded;
    const packagingCost = packagingMaterials.reduce((sum, m) => {
      return sum + ((m.unit_cost || 0) * (m.requiredQuantity || 0));
    }, 0);
    
    const totalCost = semiFinishedCost + packagingCost;
    const unitCost = totalCost / quantity;
    
    toast({
      title: 'تقدير التكلفة',
      description: `
        تكلفة المنتج النصف مصنع: ${semiFinishedCost.toFixed(2)} ريال
        تكلفة مواد التعبئة: ${packagingCost.toFixed(2)} ريال
        إجمالي التكلفة: ${totalCost.toFixed(2)} ريال
        تكلفة الوحدة: ${unitCost.toFixed(2)} ريال
      `,
    });
  };
  
  const createPackagingOrder = async () => {
    if (!selectedProduct || !semiFinished) {
      toast({
        title: 'تنبيه',
        description: 'الرجاء اختيار منتج أولاً',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Generate a code for the packaging order
      const code = `PKG-${Date.now().toString().slice(-6)}`;
      const semiFinishedQuantityNeeded = selectedProduct.semi_finished_quantity * quantity;
      
      // Create packaging order
      const { data: orderData, error: orderError } = await supabase
        .from('packaging_orders')
        .insert([
          {
            code,
            date: new Date().toISOString(),
            product_code: selectedProduct.code,
            product_name: selectedProduct.name,
            semi_finished_code: semiFinished.code,
            semi_finished_name: semiFinished.name,
            semi_finished_quantity: semiFinishedQuantityNeeded,
            quantity,
            status: 'pending',
            unit: selectedProduct.unit,
          }
        ])
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Add packaging materials to the order
      for (const material of packagingMaterials) {
        const { error: materialError } = await supabase
          .from('packaging_order_materials')
          .insert([
            {
              packaging_order_id: orderData.id,
              packaging_material_code: material.code,
              packaging_material_name: material.name,
              required_quantity: material.requiredQuantity || (material.quantity * quantity),
            }
          ]);
        
        if (materialError) throw materialError;
      }
      
      toast({
        title: 'تم بنجاح',
        description: `تم إنشاء أمر تعبئة رقم ${code}`,
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['packagingOrders'] });
      
      // Reset form
      setSelectedProduct(null);
      setQuantity(1);
      setPackagingMaterials([]);
      
    } catch (error) {
      console.error('Error creating packaging order:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إنشاء أمر التعبئة',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>تخطيط التعبئة</CardTitle>
        <CardDescription>
          هنا يمكنك تخطيط أوامر التعبئة وتقدير التكاليف.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="product">المنتج التام</Label>
          <Select onValueChange={handleProductChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="اختر منتج" />
            </SelectTrigger>
            <SelectContent>
              {productsLoading ? (
                <SelectItem value="loading" disabled>
                  <Spinner size="sm" className="mr-2" />
                  تحميل...
                </SelectItem>
              ) : (
                products?.map((product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.name} ({product.code})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">الكمية</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            disabled={!selectedProduct}
          />
        </div>

        {selectedProduct && semiFinished ? (
          <div className="space-y-2">
            <Separator />
            <h3 className="text-sm font-medium">تفاصيل المنتج النصف مصنع</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>اسم المنتج</Label>
                <Input
                  type="text"
                  value={semiFinished.name}
                  disabled
                />
              </div>
              <div>
                <Label>الكمية المطلوبة</Label>
                <Input
                  type="text"
                  value={selectedProduct.semi_finished_quantity * quantity}
                  disabled
                />
              </div>
            </div>
          </div>
        ) : (
          selectedProduct && (
            <div className="flex items-center space-x-2">
              <Spinner size="sm" />
              <p>تحميل تفاصيل المنتج النصف مصنع...</p>
            </div>
          )
        )}

        {packagingMaterials.length > 0 && (
          <div className="space-y-2">
            <Separator />
            <h3 className="text-sm font-medium">مواد التعبئة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {packagingMaterials.map((material) => (
                <div key={material.id}>
                  <Label>{material.name}</Label>
                  <Input
                    type="text"
                    value={`${material.requiredQuantity} ${material.unit}`}
                    disabled
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleSimulate}
          disabled={!selectedProduct}
        >
          محاكاة
        </Button>
        <Button
          onClick={createPackagingOrder}
          disabled={!selectedProduct || isLoading}
        >
          {isLoading ? (
            <div className="flex items-center">
              <Spinner size="sm" className="mr-2" />
              جاري الإنشاء...
            </div>
          ) : (
            "إنشاء أمر تعبئة"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
