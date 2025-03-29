import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import DataTableWithLoading from '@/components/ui/DataTableWithLoading';
import { Button } from '@/components/ui/button';
import { Edit, Plus, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SemiFinishedForm from '@/components/semi-finished/SemiFinishedForm';
import DeleteConfirmDialog from '@/components/semi-finished/DeleteConfirmDialog';

const SemiFinishedProducts = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);

  const queryClient = useQueryClient();
  
  // استعلام للحصول على المواد الأولية
  const { data: rawMaterials = [], isLoading: isLoadingRawMaterials } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('id, code, name, unit')
        .order('name');
        
      if (error) throw error;
      return data;
    }
  });
  
  // استعلام للحصول على المنتجات النصف مصنعة مع مكوناتها
  const { data: semiFinishedProducts, isLoading, error } = useQuery({
    queryKey: ['semiFinishedProducts'],
    queryFn: async () => {
      // 1. جلب المنتجات النصف مصنعة
      const { data: products, error: productsError } = await supabase
        .from('semi_finished_products')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (productsError) throw new Error(productsError.message);

      // 2. جلب مكونات كل منتج
      const productsWithIngredients = await Promise.all(products.map(async (product) => {
        const { data: ingredients, error: ingredientsError } = await supabase
          .from('semi_finished_ingredients')
          .select(`
            id,
            percentage,
            raw_materials:raw_material_id(id, code, name)
          `)
          .eq('semi_finished_id', product.id);
          
        if (ingredientsError) throw new Error(ingredientsError.message);
        
        // تنسيق المكونات بطريقة أسهل للاستخدام
        const formattedIngredients = ingredients?.map((ingredient) => ({
          id: ingredient.raw_materials?.id,
          code: ingredient.raw_materials?.code,
          name: ingredient.raw_materials?.name,
          percentage: ingredient.percentage
        })) || [];
        
        return {
          id: product.id,
          code: product.code,
          name: product.name,
          unit: product.unit,
          quantity: product.quantity,
          unitCost: product.unit_cost,
          minStock: product.min_stock,
          totalValue: product.quantity * product.unit_cost,
          ingredients: formattedIngredients
        };
      }));
      
      return productsWithIngredients;
    }
  });
  
  // إضافة منتج جديد
  const addMutation = useMutation({
    mutationFn: async (newItem: any) => {
      // توليد كود جديد (في بيئة الإنتاج يمكن أن يتم ذلك من الخادم)
      const { data: maxCode } = await supabase
        .from('semi_finished_products')
        .select('code')
        .order('code', { ascending: false })
        .limit(1);
        
      let newCode = 'SEMI-00001';
      if (maxCode && maxCode.length > 0) {
        const lastNum = parseInt(maxCode[0].code.split('-')[1]);
        newCode = `SEMI-${String(lastNum + 1).padStart(5, '0')}`;
      }
      
      // 1. إضافة المنتج النصف مصنع
      const { data, error } = await supabase
        .from('semi_finished_products')
        .insert([{
          code: newCode,
          name: newItem.name,
          unit: newItem.unit,
          quantity: newItem.quantity,
          unit_cost: newItem.unitCost,
          min_stock: newItem.minStock
        }])
        .select();
        
      if (error) throw new Error(error.message);
      
      // 2. إضافة مكونات المنتج
      if (newItem.ingredients && newItem.ingredients.length > 0) {
        const ingredientsToInsert = newItem.ingredients.map((ingredient: any) => ({
          semi_finished_id: data[0].id,
          raw_material_id: ingredient.id,
          percentage: ingredient.percentage
        }));
        
        const { error: ingredientsError } = await supabase
          .from('semi_finished_ingredients')
          .insert(ingredientsToInsert);
          
        if (ingredientsError) throw new Error(ingredientsError.message);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
      toast.success('تمت إضافة المنتج النصف مصنع بنجاح');
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  // تعديل منتج
  const updateMutation = useMutation({
    mutationFn: async (product: any) => {
      // 1. تحديث بيانات المنتج
      const { data, error } = await supabase
        .from('semi_finished_products')
        .update({
          name: product.name,
          unit: product.unit,
          quantity: product.quantity,
          unit_cost: product.unitCost,
          min_stock: product.minStock
        })
        .eq('id', product.id)
        .select();
        
      if (error) throw new Error(error.message);
      
      // 2. حذف المكونات القديمة
      const { error: deleteError } = await supabase
        .from('semi_finished_ingredients')
        .delete()
        .eq('semi_finished_id', product.id);
        
      if (deleteError) throw new Error(deleteError.message);
      
      // 3. إضافة المكونات الجديدة
      if (product.ingredients && product.ingredients.length > 0) {
        const ingredientsToInsert = product.ingredients.map((ingredient: any) => ({
          semi_finished_id: product.id,
          raw_material_id: ingredient.id,
          percentage: ingredient.percentage
        }));
        
        const { error: ingredientsError } = await supabase
          .from('semi_finished_ingredients')
          .insert(ingredientsToInsert);
          
        if (ingredientsError) throw new Error(ingredientsError.message);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
      toast.success('تم تعديل المنتج النصف مصنع بنجاح');
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  // حذف منتج
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // لا حاجة لحذف المكونات لأننا استخدمنا ON DELETE CASCADE في قاعدة البيانات
      const { error } = await supabase
        .from('semi_finished_products')
        .delete()
        .eq('id', id);
        
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
      toast.success('تم حذف المنتج النصف مصنع بنجاح');
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  // تعريف أعمدة الجدول
  const columns = [
    { key: 'code', title: 'الكود' },
    { key: 'name', title: 'اسم المنتج' },
    { key: 'unit', title: 'وحدة القياس' },
    {
      key: 'ingredients',
      title: 'عدد المكونات',
      render: (value: any[] | undefined) => (value && Array.isArray(value)) ? value.length : 0
    },
    { 
      key: 'quantity', 
      title: 'الكمية',
      render: (value: number, record: any) => (
        <div className="flex items-center">
          <div className="flex items-center gap-2 min-w-[120px]">
            <div 
              className={`w-3 h-3 rounded-full ${
                value <= record.minStock ? 'bg-red-500' : 
                value <= record.minStock * 1.5 ? 'bg-amber-500' : 
                'bg-green-500'
              }`} 
            />
            <div className="relative w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full rounded-full ${
                  value <= record.minStock ? 'bg-red-500' : 
                  value <= record.minStock * 1.5 ? 'bg-amber-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, Math.round((value / (record.minStock * 2)) * 100))}%` }}
              ></div>
            </div>
            <span className={`font-medium ${
              value <= record.minStock ? 'text-red-700' : 
              value <= record.minStock * 1.5 ? 'text-amber-700' : 
              'text-green-700'
            }`}>{value} {record.unit}</span>
          </div>
        </div>
      )
    },
    { 
      key: 'unitCost', 
      title: 'التكلفة',
      render: (value: number) => `${value} ج.م`
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
  
  // إضافة أيقونات التعديل والحذف
  const renderActions = (record: any) => (
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
  
  // معالجة إضافة منتج جديد
  const handleAddProduct = (productData: any) => {
    addMutation.mutate(productData);
  };
  
  // معالجة تعديل منتج
  const handleEditProduct = (productData: any) => {
    updateMutation.mutate(productData);
  };
  
  // معالجة حذف منتج
  const handleDeleteProduct = () => {
    if (!currentProduct) return;
    deleteMutation.mutate(currentProduct.id);
  };
  
  if (error) {
    return (
      <PageTransition>
        <div className="p-6 text-center">
          <p className="text-red-500">حدث خطأ أثناء تحميل البيانات: {(error as Error).message}</p>
          <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] })}>
            إعادة المحاولة
          </Button>
        </div>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المنتجات النصف مصنعة</h1>
            <p className="text-muted-foreground mt-1">إدارة المنتجات النصف مصنعة المستخدمة في عمليات الإنتاج</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus size={18} className="mr-2" />
            إضافة منتج
          </Button>
        </div>
        
        <DataTableWithLoading
          columns={columns}
          data={semiFinishedProducts || []}
          searchable
          searchKeys={['code', 'name']}
          actions={renderActions}
          isLoading={isLoading}
        />
        
        {/* نموذج إضافة منتج جديد */}
        <SemiFinishedForm
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onSubmit={handleAddProduct}
          rawMaterials={rawMaterials}
          isLoading={addMutation.isPending}
          title="إضافة منتج نصف مصنع جديد"
          submitText="إضافة"
        />
        
        {/* نموذج تعديل منتج */}
        {currentProduct && (
          <SemiFinishedForm
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            onSubmit={handleEditProduct}
            initialData={currentProduct}
            rawMaterials={rawMaterials}
            isLoading={updateMutation.isPending}
            title="تعديل منتج نصف مصنع"
            submitText="حفظ التعديلات"
          />
        )}
        
        {/* مربع حوار تأكيد الحذف */}
        <DeleteConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDeleteProduct}
          isLoading={deleteMutation.isPending}
          product={currentProduct}
        />
      </div>
    </PageTransition>
  );
};

export default SemiFinishedProducts;




