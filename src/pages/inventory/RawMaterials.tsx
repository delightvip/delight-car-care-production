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
import { Edit, Plus, Trash, Eye, FileUp, PlusCircle, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const units = ['كجم', 'لتر', 'مللى', 'جم', 'علبة', 'قطعة', 'كرتونة'];

const RawMaterials = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<any>(null);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    unit: '',
    quantity: 0,
    price: 0,
    minStock: 0
  });
  
  // إضافة متغير لحالة الفلتر
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'high-value' | 'high-importance'>('all');
  
  // إضافة حالة للفرز
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  
  // إضافة حالة لنافذة الاستيراد
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  
  const queryClient = useQueryClient();
  
  // استيراد المواد من ملف
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      // في التطبيق الحقيقي، هنا سيتم رفع الملف إلى الخادم ومعالجته
      // ولأغراض العرض التوضيحي، سنفترض أنه تمت معالجة الملف بنجاح
      
      toast.info("جاري معالجة الملف...");
      
      // نقوم بمحاكاة وقت المعالجة
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return { success: true, count: 5 }; // نفترض أنه تمت إضافة 5 مواد بنجاح
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      toast.success(`تم استيراد ${result.count} مواد بنجاح`);
      setIsImportDialogOpen(false);
      setImportFile(null);
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ أثناء استيراد الملف: ${error.message}`);
    }
  });
  
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
  
  // تطبيق الفلتر على البيانات
  const filteredMaterials = useMemo(() => {
    if (!rawMaterials) return [];
    
    switch (filterType) {
      case 'low-stock':
        return rawMaterials.filter(item => item.quantity <= item.minStock * 1.2);
      case 'high-value':
        return [...rawMaterials].sort((a, b) => b.totalValue - a.totalValue);
      case 'high-importance':
        return [...rawMaterials].sort((a, b) => b.importance - a.importance);
      default:
        return rawMaterials;
    }
  }, [rawMaterials, filterType]);
  
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
  
  // تعديل سريع للكمية
  const quickUpdateQuantityMutation = useMutation({
    mutationFn: async ({ id, change }: { id: number, change: number }) => {
      // أولاً، نحصل على المادة الحالية
      const { data: material, error: fetchError } = await supabase
        .from('raw_materials')
        .select('quantity')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;
      
      // نحسب الكمية الجديدة (مع التأكد من عدم وجود قيم سالبة)
      const newQuantity = Math.max(0, material.quantity + change);
      
      // تحديث الكمية
      const { data, error } = await supabase
        .from('raw_materials')
        .update({ quantity: newQuantity })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      toast.success('تم تحديث الكمية بنجاح');
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  // تعريف أعمدة الجدول
  const columns = [
    { key: 'code', title: 'الكود', sortable: true },
    { key: 'name', title: 'اسم المادة', sortable: true },
    { key: 'unit', title: 'وحدة القياس', sortable: true },
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
      key: 'price', 
      title: 'السعر',
      sortable: true,
      render: (value: number) => `${value} ج.م`
    },
    { 
      key: 'minStock', 
      title: 'الحد الأدنى',
      sortable: true,
      render: (value: number, record: any) => `${value} ${record.unit}`
    },
    { key: 'importance', title: 'الأهمية', sortable: true },
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
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setCurrentMaterial(record);
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
  
  // وظيفة للتعامل مع النقر على رأس العمود للفرز
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
  
  // تطبيق الفرز على البيانات
  const sortedMaterials = useMemo(() => {
    if (!sortConfig) return filteredMaterials;
    
    return [...filteredMaterials].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredMaterials, sortConfig]);
  
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <FileUp size={18} className="mr-2" />
              استيراد من ملف
            </Button>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="تصفية المواد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المواد</SelectItem>
                <SelectItem value="low-stock">المخزون المنخفض</SelectItem>
                <SelectItem value="high-value">الأعلى قيمة</SelectItem>
                <SelectItem value="high-importance">الأكثر أهمية</SelectItem>
              </SelectContent>
            </Select>
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
            data={sortedMaterials || []}
            searchable
            searchKeys={['code', 'name']}
            actions={renderActions}
            onSort={handleSort}
            sortConfig={sortConfig}
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
        
        {/* نافذة عرض تفاصيل المادة */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-screen-md">
            <DialogHeader>
              <DialogTitle>تفاصيل المادة الأولية</DialogTitle>
              <DialogDescription>
                عرض تفاصيل وحركة المادة الأولية في المخزون
              </DialogDescription>
            </DialogHeader>
            {currentMaterial && (
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg">معلومات المادة</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-muted-foreground">الكود:</span>
                      <span className="font-medium">{currentMaterial.code}</span>
                      
                      <span className="text-muted-foreground">الاسم:</span>
                      <span className="font-medium">{currentMaterial.name}</span>
                      
                      <span className="text-muted-foreground">وحدة القياس:</span>
                      <span className="font-medium">{currentMaterial.unit}</span>
                      
                      <span className="text-muted-foreground">الكمية الحالية:</span>
                      <div className="flex items-center">
                        <div 
                          className={`w-2 h-2 rounded-full mr-2 ${
                            currentMaterial.quantity <= currentMaterial.minStock ? 'bg-red-500' : 
                            currentMaterial.quantity <= currentMaterial.minStock * 1.5 ? 'bg-amber-500' : 
                            'bg-green-500'
                          }`} 
                        />
                        <span className="font-medium">{currentMaterial.quantity} {currentMaterial.unit}</span>
                      </div>
                      
                      <span className="text-muted-foreground">الحد الأدنى:</span>
                      <span className="font-medium">{currentMaterial.minStock} {currentMaterial.unit}</span>
                      
                      <span className="text-muted-foreground">السعر:</span>
                      <span className="font-medium">{currentMaterial.price} ج.م</span>
                      
                      <span className="text-muted-foreground">القيمة الإجمالية:</span>
                      <span className="font-medium">{currentMaterial.totalValue} ج.م</span>
                      
                      <span className="text-muted-foreground">مستوى الأهمية:</span>
                      <span className="font-medium">
                        {currentMaterial.importance === 0 && "منخفض"}
                        {currentMaterial.importance === 1 && "متوسط"}
                        {currentMaterial.importance >= 2 && "مرتفع"}
                      </span>
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
                              currentMaterial.quantity <= currentMaterial.minStock ? 'bg-red-500' : 
                              currentMaterial.quantity <= currentMaterial.minStock * 1.5 ? 'bg-amber-500' : 
                              'bg-green-500'
                            }`}
                            style={{ 
                              width: `${Math.min(100, Math.round((currentMaterial.quantity / currentMaterial.minStock) * 100))}%` 
                            }}
                          ></div>
                        </div>
                        <p className="text-xs mt-1">
                          {Math.round((currentMaterial.quantity / currentMaterial.minStock) * 100)}% من الحد الأدنى
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">تاريخ آخر تحديث:</span>
                        <p className="font-medium">-</p>
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">المنتجات المستخدمة فيها:</span>
                        <p className="font-medium">-</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg">سجل الحركة</h3>
                  <p className="text-muted-foreground text-sm">
                    سجل حركة المادة في المخزون (الإضافات والصرف)
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
                    تعديل المادة
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
        
        {/* نافذة استيراد الملفات */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>استيراد المواد الأولية من ملف</DialogTitle>
              <DialogDescription>
                يمكنك استيراد المواد الأولية من ملف Excel أو CSV. تأكد من أن الملف يحتوي على الأعمدة المطلوبة.
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
                    يجب أن يحتوي الملف على الأعمدة التالية: اسم المادة، وحدة القياس، الكمية، السعر، الحد الأدنى للمخزون
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
                  <li>سيتم توليد كود المادة تلقائيًا لكل مادة جديدة</li>
                  <li>سيتم تخطي المواد التي لا تحتوي على اسم أو وحدة قياس</li>
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

export default RawMaterials;
