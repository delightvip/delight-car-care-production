
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import DataTableWithLoading from '@/components/ui/DataTableWithLoading';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, Trash, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateCode } from '@/utils/generateCode';
import { supabase } from '@/integrations/supabase/client';

// نوع بيانات المنتج النهائي من قاعدة البيانات
interface FinishedProductDB {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  semi_finished_id: number;
  semi_finished_quantity: number;
  unit_cost: number;
  min_stock: number;
  created_at: string;
  updated_at: string;
}

// نوع بيانات المنتج النصف مصنع من قاعدة البيانات
interface SemiFinishedProductDB {
  id: number;
  code: string;
  name: string;
  unit: string;
  unit_cost: number;
}

// نوع بيانات مستلزمات التعبئة من قاعدة البيانات
interface PackagingMaterialDB {
  id: number;
  code: string;
  name: string;
  unit: string;
  unit_cost: number; // سنستخدم unit_cost بدلاً من price
}

// نوع بيانات علاقة المنتج النهائي بمستلزمات التعبئة
interface FinishedProductPackagingDB {
  id: number;
  finished_product_id: number;
  packaging_material_id: number;
  quantity: number;
}

// نوع بيانات المنتج النهائي المعروض في الواجهة
interface FinishedProduct {
  id: number;
  code: string;
  name: string;
  unit: string;
  components: {
    id: number;
    type: 'semi' | 'packaging';
    code: string;
    name: string;
    quantity: number;
    unit: string;
  }[];
  unitCost: number;
  quantity: number;
  minStock: number;
  totalValue: number;
}

const units = ['قطعة', 'علبة', 'كرتونة', 'طقم'];

const FinishedProducts = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<FinishedProduct | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    unit: '',
    components: [] as any[],
    quantity: 0,
    minStock: 0
  });
  const [selectedSemiFinished, setSelectedSemiFinished] = useState('');
  const [semiFinishedQuantity, setSemiFinishedQuantity] = useState(0);
  const [selectedPackaging, setSelectedPackaging] = useState('');
  const [packagingQuantity, setPackagingQuantity] = useState(0);
  
  // استعلام للحصول على المنتجات النهائية
  const { 
    data: products = [], 
    isLoading: isLoadingProducts,
    isError: isErrorProducts,
    error: errorProducts
  } = useQuery({
    queryKey: ['finishedProducts'],
    queryFn: async () => {
      const { data: finishedProducts, error: fpError } = await supabase
        .from('finished_products')
        .select('*');
        
      if (fpError) throw fpError;
      
      // الحصول على معلومات المنتجات النصف مصنعة والتعبئة لكل منتج نهائي
      const productsWithComponents = await Promise.all(finishedProducts.map(async (product) => {
        // الحصول على بيانات المنتج النصف مصنع
        const { data: semiFinished, error: sfError } = await supabase
          .from('semi_finished_products')
          .select('*')
          .eq('id', product.semi_finished_id)
          .single();
          
        if (sfError) {
          console.error("Error fetching semi-finished product:", sfError);
          return null;
        }
        
        // الحصول على مستلزمات التعبئة
        const { data: packagingItems, error: pkgError } = await supabase
          .from('finished_product_packaging')
          .select(`
            id,
            quantity,
            packaging_materials:packaging_material_id(
              id, code, name, unit, unit_cost
            )
          `)
          .eq('finished_product_id', product.id);
          
        if (pkgError) {
          console.error("Error fetching packaging materials:", pkgError);
          return null;
        }
        
        // بناء مصفوفة المكونات
        const components = [
          // إضافة المنتج النصف مصنع كمكون
          {
            id: semiFinished.id,
            type: 'semi' as const,
            code: semiFinished.code,
            name: semiFinished.name,
            quantity: product.semi_finished_quantity,
            unit: semiFinished.unit
          },
          // إضافة مستلزمات التعبئة كمكونات
          ...(packagingItems || []).map((item: any) => ({
            id: item.packaging_materials?.id,
            type: 'packaging' as const,
            code: item.packaging_materials?.code,
            name: item.packaging_materials?.name,
            quantity: item.quantity,
            unit: item.packaging_materials?.unit
          })).filter((item: any) => item.id) // فلترة العناصر التي لا تحتوي على معرف صالح
        ];
        
        // حساب إجمالي القيمة
        const totalValue = product.quantity * product.unit_cost;
        
        return {
          id: product.id,
          code: product.code,
          name: product.name,
          unit: product.unit,
          components,
          unitCost: product.unit_cost,
          quantity: product.quantity,
          minStock: product.min_stock,
          totalValue
        } as FinishedProduct;
      }));
      
      // إزالة أي قيم null (في حالة حدوث خطأ في الوعود)
      return productsWithComponents.filter(product => product !== null) as FinishedProduct[];
    }
  });
  
  // استعلام للحصول على المنتجات النصف مصنعة
  const { 
    data: semiFinishedProducts = [], 
    isLoading: isLoadingSemi 
  } = useQuery({
    queryKey: ['semiFinishedProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('id, code, name, unit, unit_cost');
        
      if (error) throw error;
      return data as SemiFinishedProductDB[];
    }
  });
  
  // استعلام للحصول على مستلزمات التعبئة
  const { 
    data: packagingMaterials = [], 
    isLoading: isLoadingPackaging 
  } = useQuery({
    queryKey: ['packagingMaterials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('id, code, name, unit, unit_cost');
        
      if (error) throw error;
      return data as PackagingMaterialDB[];
    }
  });
  
  // إنشاء منتج نهائي جديد
  const createProductMutation = useMutation({
    mutationFn: async (newFinishedProduct: {
      code: string;
      name: string;
      unit: string;
      semi_finished_id: number;
      semi_finished_quantity: number;
      unit_cost: number;
      quantity: number;
      min_stock: number;
      packagingMaterials: { id: number; quantity: number }[];
    }) => {
      // 1. إنشاء المنتج النهائي
      const { data: product, error } = await supabase
        .from('finished_products')
        .insert({
          code: newFinishedProduct.code,
          name: newFinishedProduct.name,
          unit: newFinishedProduct.unit,
          semi_finished_id: newFinishedProduct.semi_finished_id,
          semi_finished_quantity: newFinishedProduct.semi_finished_quantity,
          unit_cost: newFinishedProduct.unit_cost,
          quantity: newFinishedProduct.quantity,
          min_stock: newFinishedProduct.min_stock
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // 2. إضافة مستلزمات التعبئة
      if (newFinishedProduct.packagingMaterials.length > 0) {
        const packagingInserts = newFinishedProduct.packagingMaterials.map(pkg => ({
          finished_product_id: product.id,
          packaging_material_id: pkg.id,
          quantity: pkg.quantity
        }));
        
        const { error: pkgError } = await supabase
          .from('finished_product_packaging')
          .insert(packagingInserts);
          
        if (pkgError) throw pkgError;
      }
      
      return product;
    },
    onSuccess: () => {
      // تحديث قائمة المنتجات
      queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
      setIsAddDialogOpen(false);
      toast.success('تمت إضافة المنتج بنجاح');
      
      // إعادة تعيين نموذج المنتج الجديد
      setNewProduct({
        name: '',
        unit: '',
        components: [],
        quantity: 0,
        minStock: 0
      });
    },
    onError: (error) => {
      console.error('Error creating product:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج');
    }
  });
  
  // تحديث منتج نهائي
  const updateProductMutation = useMutation({
    mutationFn: async (updatedProduct: {
      id: number;
      name: string;
      unit: string;
      quantity: number;
      min_stock: number;
      unit_cost: number;
      semi_finished_id: number;
      semi_finished_quantity: number;
      packagingMaterials: { id: number; quantity: number }[];
    }) => {
      // 1. تحديث بيانات المنتج النهائي
      const { error } = await supabase
        .from('finished_products')
        .update({
          name: updatedProduct.name,
          unit: updatedProduct.unit,
          quantity: updatedProduct.quantity,
          min_stock: updatedProduct.min_stock,
          unit_cost: updatedProduct.unit_cost,
          semi_finished_quantity: updatedProduct.semi_finished_quantity
        })
        .eq('id', updatedProduct.id);
        
      if (error) throw error;
      
      // 2. حذف جميع مستلزمات التعبئة الحالية وإعادة إنشائها
      const { error: deleteError } = await supabase
        .from('finished_product_packaging')
        .delete()
        .eq('finished_product_id', updatedProduct.id);
        
      if (deleteError) throw deleteError;
      
      // 3. إضافة مستلزمات التعبئة الجديدة
      if (updatedProduct.packagingMaterials.length > 0) {
        const packagingInserts = updatedProduct.packagingMaterials.map(pkg => ({
          finished_product_id: updatedProduct.id,
          packaging_material_id: pkg.id,
          quantity: pkg.quantity
        }));
        
        const { error: pkgError } = await supabase
          .from('finished_product_packaging')
          .insert(packagingInserts);
          
        if (pkgError) throw pkgError;
      }
      
      return updatedProduct;
    },
    onSuccess: () => {
      // تحديث قائمة المنتجات
      queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
      setIsEditDialogOpen(false);
      toast.success('تم تحديث المنتج بنجاح');
    },
    onError: (error) => {
      console.error('Error updating product:', error);
      toast.error('حدث خطأ أثناء تحديث المنتج');
    }
  });
  
  // حذف منتج نهائي
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      // لا داعي لحذف مستلزمات التعبئة لأن لديها قيد CASCADE
      const { error } = await supabase
        .from('finished_products')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      // تحديث قائمة المنتجات
      queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
      setIsDeleteDialogOpen(false);
      toast.success('تم حذف المنتج بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting product:', error);
      toast.error('حدث خطأ أثناء حذف المنتج');
    }
  });
  
  // حساب تكلفة الوحدة بناءً على المكونات
  const calculateUnitCost = (components: any[]) => {
    if (!components || !Array.isArray(components)) return 0;
    
    return components.reduce((sum, component) => {
      if (!component) return sum;
      
      if (component.type === 'semi') {
        const semiProduct = semiFinishedProducts.find(item => item.code === component.code);
        return sum + (semiProduct ? semiProduct.unit_cost * component.quantity : 0);
      } else {
        const packagingMaterial = packagingMaterials.find(item => item.code === component.code);
        return sum + (packagingMaterial ? packagingMaterial.unit_cost * component.quantity : 0);
      }
    }, 0);
  };
  
  // إضافة منتج نصف مصنع
  const handleAddSemiFinished = () => {
    if (!selectedSemiFinished || semiFinishedQuantity <= 0) {
      toast.error("يرجى اختيار منتج نصف مصنع وتحديد الكمية");
      return;
    }
    
    // التحقق من وجود منتج نصف مصنع بالفعل
    const hasSemiFinished = newProduct.components.some(c => c.type === 'semi');
    if (hasSemiFinished) {
      toast.error("لا يمكن إضافة أكثر من منتج نصف مصنع واحد");
      return;
    }
    
    const semiProduct = semiFinishedProducts.find(item => item.code === selectedSemiFinished);
    if (!semiProduct) return;
    
    const newComponent = {
      id: semiProduct.id,
      type: 'semi' as const,
      code: semiProduct.code,
      name: semiProduct.name,
      quantity: semiFinishedQuantity,
      unit: semiProduct.unit
    };
    
    setNewProduct({
      ...newProduct,
      components: [...newProduct.components, newComponent]
    });
    
    setSelectedSemiFinished('');
    setSemiFinishedQuantity(0);
  };
  
  // إضافة مستلزم تعبئة
  const handleAddPackaging = () => {
    if (!selectedPackaging || packagingQuantity <= 0) {
      toast.error("يرجى اختيار مستلزم تعبئة وتحديد الكمية");
      return;
    }
    
    // التحقق من وجود مستلزم التعبئة بالفعل
    const existingIndex = newProduct.components.findIndex(
      c => c.type === 'packaging' && c.code === selectedPackaging
    );
    
    if (existingIndex >= 0) {
      // تحديث كمية المستلزم الموجود
      const updatedComponents = [...newProduct.components];
      updatedComponents[existingIndex].quantity += packagingQuantity;
      
      setNewProduct({
        ...newProduct,
        components: updatedComponents
      });
    } else {
      // إضافة مستلزم جديد
      const packagingMaterial = packagingMaterials.find(item => item.code === selectedPackaging);
      if (!packagingMaterial) return;
      
      const newComponent = {
        id: packagingMaterial.id,
        type: 'packaging' as const,
        code: packagingMaterial.code,
        name: packagingMaterial.name,
        quantity: packagingQuantity,
        unit: packagingMaterial.unit
      };
      
      setNewProduct({
        ...newProduct,
        components: [...newProduct.components, newComponent]
      });
    }
    
    setSelectedPackaging('');
    setPackagingQuantity(0);
  };
  
  // إزالة مكون
  const handleRemoveComponent = (componentIndex: number) => {
    const updatedComponents = newProduct.components.filter((_, index) => index !== componentIndex);
    setNewProduct({
      ...newProduct,
      components: updatedComponents
    });
  };
  
  // إضافة منتج جديد
  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.unit || newProduct.components.length === 0) {
      toast.error("يجب ملء جميع الحقول المطلوبة وإضافة مكون واحد على الأقل");
      return;
    }
    
    // التحقق من وجود منتج نصف مصنع واحد على الأقل
    const semiFinishedComponent = newProduct.components.find(c => c.type === 'semi');
    if (!semiFinishedComponent) {
      toast.error("يجب إضافة منتج نصف مصنع واحد على الأقل");
      return;
    }
    
    const unitCost = calculateUnitCost(newProduct.components);
    
    // إعداد مصفوفة مستلزمات التعبئة
    const packagingComponents = newProduct.components
      .filter(c => c.type === 'packaging')
      .map(c => ({
        id: c.id,
        quantity: c.quantity
      }));
    
    // إنشاء منتج جديد
    createProductMutation.mutate({
      code: generateCode('finished', products.length),
      name: newProduct.name,
      unit: newProduct.unit,
      semi_finished_id: semiFinishedComponent.id,
      semi_finished_quantity: semiFinishedComponent.quantity,
      unit_cost: Math.round(unitCost * 100) / 100,
      quantity: newProduct.quantity,
      min_stock: newProduct.minStock,
      packagingMaterials: packagingComponents
    });
  };
  
  // تحديث منتج
  const handleEditProduct = () => {
    if (!currentProduct) return;
    
    // التحقق من صحة البيانات
    if (!currentProduct.name || !currentProduct.unit || !currentProduct.components || currentProduct.components.length === 0) {
      toast.error("يجب ملء جميع الحقول المطلوبة وإضافة مكون واحد على الأقل");
      return;
    }
    
    // التحقق من وجود منتج نصف مصنع واحد على الأقل
    const semiFinishedComponent = currentProduct.components.find(c => c.type === 'semi');
    if (!semiFinishedComponent) {
      toast.error("يجب إضافة منتج نصف مصنع واحد على الأقل");
      return;
    }
    
    const unitCost = calculateUnitCost(currentProduct.components);
    
    // إعداد مصفوفة مستلزمات التعبئة
    const packagingComponents = (currentProduct.components || [])
      .filter(c => c.type === 'packaging')
      .map(c => ({
        id: c.id,
        quantity: c.quantity
      }));
    
    // تحديث المنتج
    updateProductMutation.mutate({
      id: currentProduct.id,
      name: currentProduct.name,
      unit: currentProduct.unit,
      quantity: currentProduct.quantity,
      min_stock: currentProduct.minStock,
      unit_cost: Math.round(unitCost * 100) / 100,
      semi_finished_id: semiFinishedComponent.id,
      semi_finished_quantity: semiFinishedComponent.quantity,
      packagingMaterials: packagingComponents
    });
  };
  
  // حذف منتج
  const handleDeleteProduct = () => {
    if (!currentProduct) return;
    deleteProductMutation.mutate(currentProduct.id);
  };
  
  // أعمدة جدول البيانات
  const columns = [
    { key: 'code', title: 'الكود' },
    { key: 'name', title: 'اسم المنتج' },
    { key: 'unit', title: 'وحدة القياس' },
    { 
      key: 'components', 
      title: 'عدد المكونات',
      render: (value: any[]) => Array.isArray(value) ? value.length : 0
    },
    { 
      key: 'unitCost', 
      title: 'تكلفة الوحدة',
      render: (value: number) => `${value} ج.م`
    },
    { 
      key: 'quantity', 
      title: 'الكمية',
      render: (value: number, record: any) => `${value} ${record.unit}`
    },
    { 
      key: 'minStock', 
      title: 'الحد الأدنى',
      render: (value: number, record: any) => `${value} ${record.unit}`
    },
    { 
      key: 'totalValue', 
      title: 'إجمالي القيمة',
      render: (value: number) => `${value} ج.م`
    }
  ];
  
  // عرض أزرار العمليات
  const renderActions = (record: FinishedProduct) => (
    <div className="flex space-x-2 rtl:space-x-reverse">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setCurrentProduct(record);
          setIsEditDialogOpen(true);
        }}
      >
        <Edit size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setCurrentProduct(record);
          setIsDeleteDialogOpen(true);
        }}
      >
        <Trash size={16} />
      </Button>
    </div>
  );
  
  // عرض رسالة خطأ إذا فشل تحميل البيانات
  if (isErrorProducts) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-96">
          <div className="text-red-500 text-xl font-bold mb-4">حدث خطأ أثناء تحميل البيانات</div>
          <div className="text-gray-600">{(errorProducts as Error)?.message || 'خطأ غير معروف'}</div>
        </div>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المنتجات النهائية</h1>
            <p className="text-muted-foreground mt-1">إدارة المنتجات النهائية الجاهزة للبيع</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={18} className="mr-2" />
                إضافة منتج
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>إضافة منتج نهائي جديد</DialogTitle>
                <DialogDescription>
                  أدخل بيانات المنتج النهائي الجديد. سيتم إنشاء كود فريد للمنتج تلقائيًا.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">اسم المنتج</Label>
                  <Input
                    id="name"
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit">وحدة القياس</Label>
                  <Select 
                    value={newProduct.unit} 
                    onValueChange={value => setNewProduct({...newProduct, unit: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر وحدة القياس" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map(unit => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quantity">الكمية</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newProduct.quantity}
                    onChange={e => setNewProduct({...newProduct, quantity: Number(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minStock">الحد الأدنى للمخزون</Label>
                  <Input
                    id="minStock"
                    type="number"
                    value={newProduct.minStock}
                    onChange={e => setNewProduct({...newProduct, minStock: Number(e.target.value)})}
                  />
                </div>
                
                <div className="border-t pt-4">
                  <Label className="mb-2 block">المنتج النصف مصنع</Label>
                  <div className="flex gap-2 mb-4">
                    <Select 
                      value={selectedSemiFinished} 
                      onValueChange={setSelectedSemiFinished}
                      disabled={isLoadingSemi}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="اختر منتج" />
                      </SelectTrigger>
                      <SelectContent>
                        {semiFinishedProducts.map(product => (
                          <SelectItem key={product.code} value={product.code}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="w-24 flex">
                      <Input
                        type="number"
                        value={semiFinishedQuantity}
                        onChange={e => setSemiFinishedQuantity(Number(e.target.value))}
                        min={0.01}
                        step={0.01}
                      />
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleAddSemiFinished}
                      disabled={isLoadingSemi}
                    >
                      إضافة
                    </Button>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <Label className="mb-2 block">مستلزمات التعبئة</Label>
                  <div className="flex gap-2 mb-4">
                    <Select 
                      value={selectedPackaging} 
                      onValueChange={setSelectedPackaging}
                      disabled={isLoadingPackaging}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="اختر مستلزم" />
                      </SelectTrigger>
                      <SelectContent>
                        {packagingMaterials.map(material => (
                          <SelectItem key={material.code} value={material.code}>
                            {material.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="w-24 flex">
                      <Input
                        type="number"
                        value={packagingQuantity}
                        onChange={e => setPackagingQuantity(Number(e.target.value))}
                        min={1}
                      />
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleAddPackaging}
                      disabled={isLoadingPackaging}
                    >
                      إضافة
                    </Button>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-2">
                    المكونات المضافة
                    {newProduct.components.length > 0 && (
                      <span className="text-muted-foreground mr-2">
                        (التكلفة التقديرية: {Math.round(calculateUnitCost(newProduct.components) * 100) / 100} ج.م)
                      </span>
                    )}
                  </div>
                  
                  {newProduct.components.length > 0 ? (
                    <div className="space-y-2">
                      {newProduct.components.map((component, index) => (
                        <div key={`${component.code}-${index}`} className="flex items-center justify-between p-2 border rounded-md">
                          <div>
                            <div className="font-medium">{component.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {component.quantity} {component.unit} | 
                              <Badge 
                                variant="outline" 
                                className="ml-2"
                              >
                                {component.type === 'semi' ? 'نصف مصنع' : 'مستلزم تعبئة'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveComponent(index)}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      لم تتم إضافة مكونات بعد
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button 
                  onClick={handleAddProduct}
                  disabled={createProductMutation.isPending}
                >
                  {createProductMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري الإضافة...
                    </>
                  ) : (
                    'إضافة'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <DataTableWithLoading
          columns={columns}
          data={products}
          searchable
          searchKeys={['code', 'name']}
          actions={renderActions}
          isLoading={isLoadingProducts}
        />
        
        {/* مربع حوار التعديل */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تعديل منتج نهائي</DialogTitle>
              <DialogDescription>
                تعديل بيانات المنتج النهائي.
              </DialogDescription>
            </DialogHeader>
            {currentProduct && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-code">الكود</Label>
                  <Input
                    id="edit-code"
                    value={currentProduct.code}
                    disabled
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">اسم المنتج</Label>
                  <Input
                    id="edit-name"
                    value={currentProduct.name}
                    onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-unit">وحدة القياس</Label>
                  <Select 
                    value={currentProduct.unit} 
                    onValueChange={value => setCurrentProduct({...currentProduct, unit: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر وحدة القياس" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map(unit => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-quantity">الكمية</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    value={currentProduct.quantity}
                    onChange={e => setCurrentProduct({...currentProduct, quantity: Number(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-minStock">الحد الأدنى للمخزون</Label>
                  <Input
                    id="edit-minStock"
                    type="number"
                    value={currentProduct.minStock}
                    onChange={e => setCurrentProduct({...currentProduct, minStock: Number(e.target.value)})}
                  />
                </div>
                
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">
                    المكونات
                    {currentProduct.components && currentProduct.components.length > 0 && (
                      <span className="text-muted-foreground mr-2">
                        (التكلفة التقديرية: {Math.round(calculateUnitCost(currentProduct.components) * 100) / 100} ج.م)
                      </span>
                    )}
                  </div>
                  
                  {currentProduct.components && currentProduct.components.length > 0 ? (
                    <div className="space-y-2">
                      {currentProduct.components.map((component: any, index: number) => (
                        <div key={`${component.code}-${index}`} className="flex items-center justify-between p-2 border rounded-md">
                          <div>
                            <div className="font-medium">{component.name}</div>
                            <div className="text-sm text-muted-foreground">
                              <Input
                                type="number"
                                value={component.quantity}
                                onChange={e => {
                                  const updatedComponents = [...currentProduct.components];
                                  updatedComponents[index].quantity = Number(e.target.value);
                                  setCurrentProduct({
                                    ...currentProduct,
                                    components: updatedComponents
                                  });
                                }}
                                min={component.type === 'semi' ? 0.01 : 1}
                                step={component.type === 'semi' ? 0.01 : 1}
                                className="w-20 h-7 mr-2"
                              />
                              {component.unit} | 
                              <Badge 
                                variant="outline" 
                                className="ml-2"
                              >
                                {component.type === 'semi' ? 'نصف مصنع' : 'مستلزم تعبئة'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      لم تتم إضافة مكونات بعد
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleEditProduct}
                disabled={updateProductMutation.isPending}
              >
                {updateProductMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ التعديلات'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* مربع حوار الحذف */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>حذف منتج نهائي</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف هذا المنتج النهائي؟ لا يمكن التراجع عن هذا الإجراء.
              </DialogDescription>
            </DialogHeader>
            {currentProduct && (
              <div className="py-4">
                <p className="font-medium">{currentProduct.name}</p>
                <p className="text-sm text-muted-foreground">{currentProduct.code}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteProduct}
                disabled={deleteProductMutation.isPending}
              >
                {deleteProductMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري الحذف...
                  </>
                ) : (
                  'حذف'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default FinishedProducts;
