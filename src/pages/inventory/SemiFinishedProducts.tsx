import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import DataTableWithLoading from '@/components/ui/DataTableWithLoading';
import { Button } from '@/components/ui/button';
import { Edit, Plus, Trash, Eye, FileUp, PlusCircle, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SemiFinishedForm from '@/components/semi-finished/SemiFinishedForm';
import DeleteConfirmDialog from '@/components/semi-finished/DeleteConfirmDialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SemiFinishedProducts = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  
  // إضافة حالة للتصفية حسب حالة المخزون
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'high-value'>('all');
  
  // إضافة حالة للفرز
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

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

  // تطبيق الفلتر على البيانات
  const filteredProducts = useMemo(() => {
    if (!semiFinishedProducts) return [];
    
    switch (filterType) {
      case 'low-stock':
        return semiFinishedProducts.filter(item => item.quantity <= item.minStock * 1.2);
      case 'high-value':
        return [...semiFinishedProducts].sort((a, b) => b.totalValue - a.totalValue);
      default:
        return semiFinishedProducts;
    }
  }, [semiFinishedProducts, filterType]);
  
  // تطبيق الفرز على البيانات المفلترة
  const sortedProducts = useMemo(() => {
    if (!sortConfig) return filteredProducts;
    
    return [...filteredProducts].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredProducts, sortConfig]);
  
  // معالجة النقر على رأس العمود للفرز
  const handleSort = (key: string) => {
    if (sortConfig && sortConfig.key === key) {
      // إذا كان العمود مفروز بالفعل، نعكس اتجاه الفرز أو نلغيه
      if (sortConfig.direction === 'asc') {
        setSortConfig({ key, direction: 'desc' });
      } else {
        setSortConfig(null);
      }
    } else {
      // إذا كان العمود غير مفروز، نفرزه تصاعديًا
      setSortConfig({ key, direction: 'asc' });
    }
  };
  
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
  
  // تعديل سريع للكمية
  const quickUpdateQuantityMutation = useMutation({
    mutationFn: async ({ id, change }: { id: number, change: number }) => {
      // أولاً، نحصل على المنتج الحالي
      const { data: product, error: fetchError } = await supabase
        .from('semi_finished_products')
        .select('quantity')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;
      
      // نحسب الكمية الجديدة (مع التأكد من عدم وجود قيم سالبة)
      const newQuantity = Math.max(0, product.quantity + change);
      
      // تحديث الكمية
      const { data, error } = await supabase
        .from('semi_finished_products')
        .update({ quantity: newQuantity })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
      toast.success('تم تحديث الكمية بنجاح');
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  // استيراد المنتجات النصف مصنعة من ملف
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      // في التطبيق الحقيقي، هنا سيتم رفع الملف إلى الخادم ومعالجته
      // ولأغراض العرض التوضيحي، سنفترض أنه تمت معالجة الملف بنجاح
      
      toast.info("جاري معالجة الملف...");
      
      // نقوم بمحاكاة وقت المعالجة
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return { success: true, count: 3 }; // نفترض أنه تمت إضافة 3 منتجات بنجاح
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
      toast.success(`تم استيراد ${result.count} منتجات بنجاح`);
      setIsImportDialogOpen(false);
      setImportFile(null);
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ أثناء استيراد الملف: ${error.message}`);
    }
  });
  
  // تعريف أعمدة الجدول
  const columns = [
    { key: 'code', title: 'الكود', sortable: true },
    { key: 'name', title: 'اسم المنتج', sortable: true },
    { key: 'unit', title: 'وحدة القياس', sortable: true },
    {
      key: 'ingredients',
      title: 'عدد المكونات',
      render: (value: any[] | undefined) => (value && Array.isArray(value)) ? value.length : 0,
      sortable: true
    },
    { 
      key: 'quantity', 
      title: 'الكمية',
      sortable: true,
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
      sortable: true,
      render: (value: number) => `${value} ج.م`
    },
    { 
      key: 'minStock', 
      title: 'الحد الأدنى',
      sortable: true,
      render: (value: number, record: any) => `${value} ${record.unit}`
    },
    { 
      key: 'totalValue', 
      title: 'إجمالي القيمة',
      sortable: true,
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
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setCurrentProduct(record);
          setIsDetailsDialogOpen(true);
        }}
      >
        <Eye size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="زيادة الكمية"
        onClick={() => quickUpdateQuantityMutation.mutate({ id: record.id, change: 1 })}
      >
        <PlusCircle size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="نقص الكمية"
        onClick={() => quickUpdateQuantityMutation.mutate({ id: record.id, change: -1 })}
      >
        <MinusCircle size={16} />
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <FileUp size={18} className="mr-2" />
              استيراد من ملف
            </Button>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="تصفية المنتجات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المنتجات</SelectItem>
                <SelectItem value="low-stock">المخزون المنخفض</SelectItem>
                <SelectItem value="high-value">الأعلى قيمة</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus size={18} className="mr-2" />
              إضافة منتج
            </Button>
          </div>
        </div>
        
        <DataTableWithLoading
          columns={columns}
          data={sortedProducts || []}
          searchable
          searchKeys={['code', 'name']}
          actions={renderActions}
          isLoading={isLoading}
          onSort={handleSort}
          sortConfig={sortConfig}
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
        
        {/* نافذة عرض تفاصيل المنتج */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-screen-md">
            <DialogHeader>
              <DialogTitle>تفاصيل المنتج النصف مصنع</DialogTitle>
              <DialogDescription>
                عرض تفاصيل وحركة المنتج النصف مصنع في المخزون
              </DialogDescription>
            </DialogHeader>
            {currentProduct && (
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg">معلومات المنتج</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-muted-foreground">الكود:</span>
                      <span className="font-medium">{currentProduct.code}</span>
                      
                      <span className="text-muted-foreground">الاسم:</span>
                      <span className="font-medium">{currentProduct.name}</span>
                      
                      <span className="text-muted-foreground">وحدة القياس:</span>
                      <span className="font-medium">{currentProduct.unit}</span>
                      
                      <span className="text-muted-foreground">الكمية الحالية:</span>
                      <div className="flex items-center">
                        <div 
                          className={`w-2 h-2 rounded-full mr-2 ${
                            currentProduct.quantity <= currentProduct.minStock ? 'bg-red-500' : 
                            currentProduct.quantity <= currentProduct.minStock * 1.5 ? 'bg-amber-500' : 
                            'bg-green-500'
                          }`} 
                        />
                        <span className="font-medium">{currentProduct.quantity} {currentProduct.unit}</span>
                      </div>
                      
                      <span className="text-muted-foreground">الحد الأدنى:</span>
                      <span className="font-medium">{currentProduct.minStock} {currentProduct.unit}</span>
                      
                      <span className="text-muted-foreground">تكلفة الوحدة:</span>
                      <span className="font-medium">{currentProduct.unitCost} ج.م</span>
                      
                      <span className="text-muted-foreground">القيمة الإجمالية:</span>
                      <span className="font-medium">{currentProduct.totalValue} ج.م</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg">إحصائيات</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-muted-foreground text-sm mb-1">نسبة المخزون الحالي إلى الحد الأدنى</p>
                        <div className="w-full bg-muted rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${
                              currentProduct.quantity <= currentProduct.minStock ? 'bg-red-500' : 
                              currentProduct.quantity <= currentProduct.minStock * 1.5 ? 'bg-amber-500' : 
                              'bg-green-500'
                            }`}
                            style={{ 
                              width: `${Math.min(100, Math.round((currentProduct.quantity / currentProduct.minStock) * 100))}%` 
                            }}
                          ></div>
                        </div>
                        <p className="text-xs mt-1">
                          {Math.round((currentProduct.quantity / currentProduct.minStock) * 100)}% من الحد الأدنى
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">تاريخ آخر تحديث:</span>
                        <p className="font-medium">-</p>
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">المنتجات المستخدمة فيه:</span>
                        <p className="font-medium">-</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg">المكونات</h3>
                  <div className="mt-2">
                    {currentProduct.ingredients && currentProduct.ingredients.length > 0 ? (
                      <div className="space-y-2">
                        {currentProduct.ingredients.map((ingredient: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 border rounded-md">
                            <div>
                              <div className="font-medium">{ingredient.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {ingredient.code}
                              </div>
                            </div>
                            <div className="font-medium">
                              {ingredient.percentage}%
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground p-4">
                        لا توجد مكونات لهذا المنتج
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg">سجل الحركة</h3>
                  <p className="text-muted-foreground text-sm">
                    سجل حركة المنتج في المخزون (الإضافات والصرف)
                  </p>
                  <div className="border rounded-md mt-2 p-4 text-center text-muted-foreground">
                    لا توجد بيانات لعرضها
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsDetailsDialogOpen(false);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit size={16} className="ml-2" />
                    تعديل المنتج
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button variant="outline">
                      طباعة التفاصيل
                    </Button>
                    <Button variant="outline">
                      تصدير البيانات
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* نافذة استيراد البيانات من ملف */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>استيراد المنتجات النصف مصنعة من ملف</DialogTitle>
              <DialogDescription>
                يمكنك استيراد المنتجات النصف مصنعة من ملف Excel أو CSV. تأكد من أن الملف يحتوي على الأعمدة المطلوبة.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="border rounded-md p-6 text-center">
                <div className="mb-4">
                  <FileUp className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">
                    {importFile ? importFile.name : 'اختر ملف Excel أو CSV لاستيراده'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    يجب أن يحتوي الملف على الأعمدة التالية: اسم المنتج، وحدة القياس، الكمية، التكلفة، الحد الأدنى للمخزون، والمكونات
                  </p>
                </div>
                
                {!importFile && (
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="mt-2">
                      <Button variant="outline" className="w-full max-w-xs mx-auto" size="sm">
                        <FileUp size={16} className="mr-2" />
                        اختيار ملف
                      </Button>
                      <input
                        id="file-upload"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setImportFile(e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                  </label>
                )}
                
                {importFile && (
                  <div className="mt-2 flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setImportFile(null)}
                    >
                      إلغاء
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => importMutation.mutate(importFile)}
                      disabled={importMutation.isPending}
                    >
                      {importMutation.isPending ? 'جاري الاستيراد...' : 'استيراد'}
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="bg-muted/50 rounded-md p-4">
                <h4 className="text-sm font-medium mb-2">تنسيق الملف</h4>
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                  <li>يجب أن يكون الملف بتنسيق Excel (.xlsx, .xls) أو CSV (.csv)</li>
                  <li>يجب أن يحتوي الصف الأول على أسماء الأعمدة</li>
                  <li>سيتم توليد كود المنتج تلقائيًا لكل منتج جديد</li>
                  <li>لإضافة مكونات، يجب تضمين عمود "المكونات" يحتوي على كود المادة الخام ونسبتها</li>
                </ul>
                
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">تحميل نموذج</h4>
                  <Button variant="link" size="sm" className="p-0 h-auto">
                    تحميل ملف نموذجي (.xlsx)
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default SemiFinishedProducts;




