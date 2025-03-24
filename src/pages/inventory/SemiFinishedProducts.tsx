
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import DataTable from '@/components/ui/DataTable';
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
import { Edit, Plus, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const units = ['كجم', 'لتر', 'مللى', 'جم', 'علبة', 'قطعة', 'كرتونة'];

const SemiFinishedProducts = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    unit: '',
    quantity: 0,
    unitCost: 0,
    minStock: 0
  });
  
  const queryClient = useQueryClient();
  
  // جلب المنتجات النصف مصنعة من قاعدة البيانات
  const { data: semiFinishedProducts, isLoading, error } = useQuery({
    queryKey: ['semiFinishedProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw new Error(error.message);
      }
      
      // تحويل البيانات إلى الصيغة المتوافقة مع الواجهة
      return data.map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        unitCost: item.unit_cost,
        minStock: item.min_stock,
        totalValue: item.quantity * item.unit_cost
      }));
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
      toast.success('تمت إضافة المنتج النصف مصنع بنجاح');
      setIsAddDialogOpen(false);
      setNewProduct({
        name: '',
        unit: '',
        quantity: 0,
        unitCost: 0,
        minStock: 0
      });
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  // تعديل منتج
  const updateMutation = useMutation({
    mutationFn: async (product: any) => {
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
  
  // معالجة إضافة منتج جديد
  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.unit) {
      toast.error('يجب ملء جميع الحقول المطلوبة');
      return;
    }
    
    addMutation.mutate(newProduct);
  };
  
  // معالجة تعديل منتج
  const handleEditProduct = () => {
    if (!currentProduct) return;
    
    updateMutation.mutate({
      id: currentProduct.id,
      name: currentProduct.name,
      unit: currentProduct.unit,
      quantity: currentProduct.quantity,
      unitCost: currentProduct.unitCost,
      minStock: currentProduct.minStock
    });
  };
  
  // معالجة حذف منتج
  const handleDeleteProduct = () => {
    if (!currentProduct) return;
    deleteMutation.mutate(currentProduct.id);
  };
  
  // تعريف أعمدة الجدول
  const columns = [
    { key: 'code', title: 'الكود' },
    { key: 'name', title: 'اسم المنتج' },
    { key: 'unit', title: 'وحدة القياس' },
    { 
      key: 'quantity', 
      title: 'الكمية',
      render: (value: number, record: any) => `${value} ${record.unit}`
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
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={18} className="mr-2" />
                إضافة منتج
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة منتج نصف مصنع جديد</DialogTitle>
                <DialogDescription>
                  أدخل بيانات المنتج النصف مصنع الجديد. سيتم إنشاء كود فريد للمنتج تلقائيًا.
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
                  <Label htmlFor="unitCost">التكلفة</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    value={newProduct.unitCost}
                    onChange={e => setNewProduct({...newProduct, unitCost: Number(e.target.value)})}
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleAddProduct} disabled={addMutation.isPending}>
                  {addMutation.isPending ? 'جاري الإضافة...' : 'إضافة'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={semiFinishedProducts || []}
            searchable
            searchKeys={['code', 'name']}
            actions={renderActions}
          />
        )}
        
        {/* نافذة تعديل المنتج */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل منتج نصف مصنع</DialogTitle>
              <DialogDescription>
                تعديل بيانات المنتج النصف مصنع.
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
                  <Label htmlFor="edit-unitCost">التكلفة</Label>
                  <Input
                    id="edit-unitCost"
                    type="number"
                    value={currentProduct.unitCost}
                    onChange={e => setCurrentProduct({...currentProduct, unitCost: Number(e.target.value)})}
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
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleEditProduct} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* نافذة حذف المنتج */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>حذف منتج نصف مصنع</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف هذا المنتج النصف مصنع؟ لا يمكن التراجع عن هذا الإجراء.
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
              <Button variant="destructive" onClick={handleDeleteProduct} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default SemiFinishedProducts;
