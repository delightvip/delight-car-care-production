
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

const RawMaterials = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<any>(null);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    unit: '',
    quantity: 0,
    price: 0,
    minStock: 0
  });
  
  const queryClient = useQueryClient();
  
  // جلب المواد الأولية من قاعدة البيانات
  const { data: rawMaterials, isLoading, error } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
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
        price: item.unit_cost,
        minStock: item.min_stock,
        importance: item.importance || 0,
        totalValue: item.quantity * item.unit_cost
      }));
    }
  });
  
  // إضافة مادة جديدة
  const addMutation = useMutation({
    mutationFn: async (newItem: any) => {
      // توليد كود جديد (في بيئة الإنتاج يمكن أن يتم ذلك من الخادم)
      const { data: maxCode } = await supabase
        .from('raw_materials')
        .select('code')
        .order('code', { ascending: false })
        .limit(1);
        
      let newCode = 'RAW-00001';
      if (maxCode && maxCode.length > 0) {
        const lastNum = parseInt(maxCode[0].code.split('-')[1]);
        newCode = `RAW-${String(lastNum + 1).padStart(5, '0')}`;
      }
      
      const { data, error } = await supabase
        .from('raw_materials')
        .insert([{
          code: newCode,
          name: newItem.name,
          unit: newItem.unit,
          quantity: newItem.quantity,
          unit_cost: newItem.price,
          min_stock: newItem.minStock,
          importance: 0
        }])
        .select();
        
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      toast.success('تمت إضافة المادة الأولية بنجاح');
      setIsAddDialogOpen(false);
      setNewMaterial({
        name: '',
        unit: '',
        quantity: 0,
        price: 0,
        minStock: 0
      });
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  // تعديل مادة
  const updateMutation = useMutation({
    mutationFn: async (material: any) => {
      const { data, error } = await supabase
        .from('raw_materials')
        .update({
          name: material.name,
          unit: material.unit,
          quantity: material.quantity,
          unit_cost: material.price,
          min_stock: material.minStock
        })
        .eq('id', material.id)
        .select();
        
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      toast.success('تم تعديل المادة الأولية بنجاح');
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  // حذف مادة
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id);
        
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      toast.success('تم حذف المادة الأولية بنجاح');
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  // معالجة إضافة مادة جديدة
  const handleAddMaterial = () => {
    if (!newMaterial.name || !newMaterial.unit) {
      toast.error('يجب ملء جميع الحقول المطلوبة');
      return;
    }
    
    addMutation.mutate(newMaterial);
  };
  
  // معالجة تعديل مادة
  const handleEditMaterial = () => {
    if (!currentMaterial) return;
    
    updateMutation.mutate({
      id: currentMaterial.id,
      name: currentMaterial.name,
      unit: currentMaterial.unit,
      quantity: currentMaterial.quantity,
      price: currentMaterial.price,
      minStock: currentMaterial.minStock
    });
  };
  
  // معالجة حذف مادة
  const handleDeleteMaterial = () => {
    if (!currentMaterial) return;
    deleteMutation.mutate(currentMaterial.id);
  };
  
  // تعريف أعمدة الجدول
  const columns = [
    { key: 'code', title: 'الكود' },
    { key: 'name', title: 'اسم المادة' },
    { key: 'unit', title: 'وحدة القياس' },
    { 
      key: 'quantity', 
      title: 'الكمية',
      render: (value: number, record: any) => `${value} ${record.unit}`
    },
    { 
      key: 'price', 
      title: 'السعر',
      render: (value: number) => `${value} ج.م`
    },
    { 
      key: 'minStock', 
      title: 'الحد الأدنى',
      render: (value: number, record: any) => `${value} ${record.unit}`
    },
    { key: 'importance', title: 'الأهمية' },
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
          setCurrentMaterial(record);
          setIsEditDialogOpen(true);
        }}
      >
        <Edit size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setCurrentMaterial(record);
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
          <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['rawMaterials'] })}>
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
            <h1 className="text-3xl font-bold tracking-tight">المواد الأولية</h1>
            <p className="text-muted-foreground mt-1">إدارة المواد الأولية المستخدمة في عمليات الإنتاج</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={18} className="mr-2" />
                إضافة مادة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة مادة أولية جديدة</DialogTitle>
                <DialogDescription>
                  أدخل بيانات المادة الأولية الجديدة. سيتم إنشاء كود فريد للمادة تلقائيًا.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">اسم المادة</Label>
                  <Input
                    id="name"
                    value={newMaterial.name}
                    onChange={e => setNewMaterial({...newMaterial, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit">وحدة القياس</Label>
                  <Select 
                    value={newMaterial.unit} 
                    onValueChange={value => setNewMaterial({...newMaterial, unit: value})}
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
                    value={newMaterial.quantity}
                    onChange={e => setNewMaterial({...newMaterial, quantity: Number(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">السعر</Label>
                  <Input
                    id="price"
                    type="number"
                    value={newMaterial.price}
                    onChange={e => setNewMaterial({...newMaterial, price: Number(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minStock">الحد الأدنى للمخزون</Label>
                  <Input
                    id="minStock"
                    type="number"
                    value={newMaterial.minStock}
                    onChange={e => setNewMaterial({...newMaterial, minStock: Number(e.target.value)})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleAddMaterial} disabled={addMutation.isPending}>
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
            data={rawMaterials || []}
            searchable
            searchKeys={['code', 'name']}
            actions={renderActions}
          />
        )}
        
        {/* نافذة تعديل المادة */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل مادة أولية</DialogTitle>
              <DialogDescription>
                تعديل بيانات المادة الأولية.
              </DialogDescription>
            </DialogHeader>
            {currentMaterial && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-code">الكود</Label>
                  <Input
                    id="edit-code"
                    value={currentMaterial.code}
                    disabled
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">اسم المادة</Label>
                  <Input
                    id="edit-name"
                    value={currentMaterial.name}
                    onChange={e => setCurrentMaterial({...currentMaterial, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-unit">وحدة القياس</Label>
                  <Select 
                    value={currentMaterial.unit} 
                    onValueChange={value => setCurrentMaterial({...currentMaterial, unit: value})}
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
                    value={currentMaterial.quantity}
                    onChange={e => setCurrentMaterial({...currentMaterial, quantity: Number(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-price">السعر</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    value={currentMaterial.price}
                    onChange={e => setCurrentMaterial({...currentMaterial, price: Number(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-minStock">الحد الأدنى للمخزون</Label>
                  <Input
                    id="edit-minStock"
                    type="number"
                    value={currentMaterial.minStock}
                    onChange={e => setCurrentMaterial({...currentMaterial, minStock: Number(e.target.value)})}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleEditMaterial} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* نافذة حذف المادة */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>حذف مادة أولية</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف هذه المادة الأولية؟ لا يمكن التراجع عن هذا الإجراء.
              </DialogDescription>
            </DialogHeader>
            {currentMaterial && (
              <div className="py-4">
                <p className="font-medium">{currentMaterial.name}</p>
                <p className="text-sm text-muted-foreground">{currentMaterial.code}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                إلغاء
              </Button>
              <Button variant="destructive" onClick={handleDeleteMaterial} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default RawMaterials;
