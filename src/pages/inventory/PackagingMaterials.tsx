import React, { useState, useMemo } from 'react';
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

const units = ['قطعة', 'علبة', 'كرتونة', 'رول', 'متر'];

const PackagingMaterials = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<any>(null);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    unit: '',
    price: 0,
    quantity: 0,
    minStock: 0
  });
  
  // إضافة حالة للتصفية حسب حالة المخزون
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'high-value' | 'high-importance'>('all');
  
  const queryClient = useQueryClient();
  
  const { data: packagingMaterials, isLoading, error } = useQuery({
    queryKey: ['packagingMaterials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw new Error(error.message);
      }
      
      return data.map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        price: item.unit_cost,
        quantity: item.quantity,
        minStock: item.min_stock,
        importance: item.importance || 0,
        totalValue: item.quantity * item.unit_cost
      }));
    }
  });
  
  // تطبيق الفلتر على البيانات
  const filteredMaterials = useMemo(() => {
    if (!packagingMaterials) return [];
    
    switch (filterType) {
      case 'low-stock':
        return packagingMaterials.filter(item => item.quantity <= item.minStock * 1.2);
      case 'high-value':
        return [...packagingMaterials].sort((a, b) => b.totalValue - a.totalValue);
      case 'high-importance':
        return [...packagingMaterials].sort((a, b) => b.importance - a.importance);
      default:
        return packagingMaterials;
    }
  }, [packagingMaterials, filterType]);
  
  const addMutation = useMutation({
    mutationFn: async (newItem: any) => {
      const { data: maxCode } = await supabase
        .from('packaging_materials')
        .select('code')
        .order('code', { ascending: false })
        .limit(1);
        
      let newCode = 'PKG-00001';
      if (maxCode && maxCode.length > 0) {
        const lastNum = parseInt(maxCode[0].code.split('-')[1]);
        newCode = `PKG-${String(lastNum + 1).padStart(5, '0')}`;
      }
      
      const { data, error } = await supabase
        .from('packaging_materials')
        .insert([{
          code: newCode,
          name: newItem.name,
          unit: newItem.unit,
          unit_cost: newItem.price,
          quantity: newItem.quantity,
          min_stock: newItem.minStock,
          importance: 0
        }])
        .select();
        
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      toast.success('تمت إضافة مستلزم التعبئة بنجاح');
      setIsAddDialogOpen(false);
      setNewMaterial({
        name: '',
        unit: '',
        price: 0,
        quantity: 0,
        minStock: 0
      });
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: async (material: any) => {
      const { data, error } = await supabase
        .from('packaging_materials')
        .update({
          name: material.name,
          unit: material.unit,
          unit_cost: material.price,
          quantity: material.quantity,
          min_stock: material.minStock
        })
        .eq('id', material.id)
        .select();
        
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      toast.success('تم تعديل مستلزم التعبئة بنجاح');
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('packaging_materials')
        .delete()
        .eq('id', id);
        
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      toast.success('تم حذف مستلزم التعبئة بنجاح');
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  const handleAddMaterial = () => {
    if (!newMaterial.name || !newMaterial.unit) {
      toast.error('يجب ملء جميع الحقول المطلوبة');
      return;
    }
    
    addMutation.mutate(newMaterial);
  };
  
  const handleEditMaterial = () => {
    if (!currentMaterial) return;
    
    updateMutation.mutate({
      id: currentMaterial.id,
      name: currentMaterial.name,
      unit: currentMaterial.unit,
      price: currentMaterial.price,
      quantity: currentMaterial.quantity,
      minStock: currentMaterial.minStock
    });
  };
  
  const handleDeleteMaterial = () => {
    if (!currentMaterial) return;
    deleteMutation.mutate(currentMaterial.id);
  };
  
  const columns = [
    { key: 'code', title: 'الكود' },
    { key: 'name', title: 'اسم المنتج' },
    { key: 'unit', title: 'وحدة القياس' },
    { 
      key: 'price', 
      title: 'سعر الوحدة',
      render: (value: number) => `${value} ج.م`
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
          <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] })}>
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
            <h1 className="text-3xl font-bold tracking-tight">مستلزمات التعبئة</h1>
            <p className="text-muted-foreground mt-1">إدارة مستلزمات التعبئة والتغليف</p>
          </div>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="تصفية المستلزمات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المستلزمات</SelectItem>
                <SelectItem value="low-stock">المخزون المنخفض</SelectItem>
                <SelectItem value="high-value">الأعلى قيمة</SelectItem>
                <SelectItem value="high-importance">الأكثر أهمية</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus size={18} className="mr-2" />
                  إضافة مستلزم
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة مستلزم تعبئة جديد</DialogTitle>
                  <DialogDescription>
                    أدخل بيانات مستلزم التعبئة الجديد. سيتم إنشاء كود فريد للمستلزم تلقائيًا.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">اسم المستلزم</Label>
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
                    <Label htmlFor="price">سعر الوحدة</Label>
                    <Input
                      id="price"
                      type="number"
                      value={newMaterial.price}
                      onChange={e => setNewMaterial({...newMaterial, price: Number(e.target.value)})}
                    />
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
            data={filteredMaterials || []}
            searchable
            searchKeys={['code', 'name']}
            actions={renderActions}
          />
        )}
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل مستلزم تعبئة</DialogTitle>
              <DialogDescription>
                تعديل بيانات مستلزم التعبئة.
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
                  <Label htmlFor="edit-name">اسم المستلزم</Label>
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
                  <Label htmlFor="edit-price">سعر الوحدة</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    value={currentMaterial.price}
                    onChange={e => setCurrentMaterial({...currentMaterial, price: Number(e.target.value)})}
                  />
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
        
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>حذف مستلزم تعبئة</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف هذا المستلزم؟ لا يمكن التراجع عن هذا الإجراء.
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

export default PackagingMaterials;
