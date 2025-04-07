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
import { Edit, Plus, Trash, FileUp, Eye, PlusCircle, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const units = ['قطعة', 'علبة', 'كرتونة', 'رول', 'متر'];

const PackagingMaterials = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<any>(null);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    unit: '',
    price: 0,
    quantity: 0,
    minStock: 0
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  
  // إضافة حالة للتصفية حسب حالة المخزون
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'high-value' | 'high-importance'>('all');
  
  // إضافة حالة للفرز
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
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

  // تطبيق الفرز على البيانات المفلترة
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

  // تعديل سريع للكمية
  const quickUpdateQuantityMutation = useMutation({
    mutationFn: async ({ id, change }: { id: number, change: number }) => {
      // أولاً، نحصل على المستلزم الحالي
      const { data: material, error: fetchError } = await supabase
        .from('packaging_materials')
        .select('quantity')
        .eq('id', id)
        .single();
        
      if (fetchError) throw new Error(fetchError.message);
      
      // نحسب الكمية الجديدة (مع التأكد من عدم وجود قيم سالبة)
      const newQuantity = Math.max(0, material.quantity + change);
      
      // تحديث الكمية
      const { data, error } = await supabase
        .from('packaging_materials')
        .update({ quantity: newQuantity })
        .eq('id', id)
        .select();
        
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      toast.success('تم تحديث الكمية بنجاح');
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  // استيراد مستلزمات التعبئة من ملف
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      // في التطبيق الحقيقي، هنا سيتم رفع الملف إلى الخادم ومعالجته
      // ولأغراض العرض التوضيحي، سنفترض أنه تمت معالجة الملف بنجاح
      
      toast.info("جاري معالجة الملف...");
      
      // نقوم بمحاكاة وقت المعالجة
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return { success: true, count: 3 }; // نفترض أنه تمت إضافة 3 مستلزمات بنجاح
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      toast.success(`تم استيراد ${result.count} مستلزمات بنجاح`);
      setIsImportDialogOpen(false);
      setImportFile(null);
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ أثناء استيراد الملف: ${error.message}`);
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
      <Button
        variant="ghost"
        size="icon"
        title="عرض التفاصيل"
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
            
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <FileUp size={18} className="mr-2" />
              استيراد
            </Button>
            
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
            columns={columns.map(col => ({ ...col, sortable: true }))}
            data={sortedMaterials || []}
            searchable
            searchKeys={['code', 'name']}
            actions={renderActions}
            onSort={handleSort}
            sortConfig={sortConfig}
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

        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>استيراد مستلزمات التعبئة من ملف</DialogTitle>
              <DialogDescription>
                يمكنك استيراد مستلزمات التعبئة من ملف Excel أو CSV. تأكد من أن الملف يحتوي على الأعمدة المطلوبة.
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
                    يجب أن يحتوي الملف على الأعمدة التالية: اسم المستلزم، وحدة القياس، سعر الوحدة، الكمية، الحد الأدنى للمخزون
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
                  <li>سيتم توليد كود المستلزم تلقائيًا لكل مستلزم جديد</li>
                  <li>يتم تعيين قيمة الأهمية تلقائيًا إلى 0 للمستلزمات الجديدة</li>
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

        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl">تفاصيل مستلزم التعبئة</DialogTitle>
              <DialogDescription>
                عرض تفاصيل كاملة عن مستلزم التعبئة، بما في ذلك إحصائيات المخزون وسجل الحركة.
              </DialogDescription>
            </DialogHeader>
            {currentMaterial && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* معلومات أساسية */}
                  <div className="space-y-4">
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-3">معلومات أساسية</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الكود:</span>
                          <span className="font-medium">{currentMaterial.code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الاسم:</span>
                          <span className="font-medium">{currentMaterial.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">وحدة القياس:</span>
                          <span className="font-medium">{currentMaterial.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">سعر الوحدة:</span>
                          <span className="font-medium">{currentMaterial.price} ج.م</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الكمية الحالية:</span>
                          <span className={`font-medium ${
                            currentMaterial.quantity <= currentMaterial.minStock ? 'text-red-600' : 
                            currentMaterial.quantity <= currentMaterial.minStock * 1.5 ? 'text-amber-600' : 
                            'text-green-600'
                          }`}>
                            {currentMaterial.quantity} {currentMaterial.unit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الحد الأدنى للمخزون:</span>
                          <span className="font-medium">{currentMaterial.minStock} {currentMaterial.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">القيمة الإجمالية:</span>
                          <span className="font-bold">{currentMaterial.price * currentMaterial.quantity} ج.م</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* تعديل سريع للكمية */}
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-3">تعديل سريع للكمية</h3>
                      <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => quickUpdateQuantityMutation.mutate({ 
                            id: currentMaterial.id, 
                            change: -1 
                          })}
                          disabled={quickUpdateQuantityMutation.isPending}
                        >
                          <MinusCircle size={16} />
                        </Button>
                        
                        <div className="w-24 text-center">
                          <p className="text-2xl font-bold">{currentMaterial.quantity}</p>
                          <p className="text-xs text-muted-foreground">{currentMaterial.unit}</p>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => quickUpdateQuantityMutation.mutate({ 
                            id: currentMaterial.id, 
                            change: 1 
                          })}
                          disabled={quickUpdateQuantityMutation.isPending}
                        >
                          <PlusCircle size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* إحصائيات ومعلومات إضافية */}
                  <div className="space-y-4">
                    {/* نسبة المخزون */}
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-3">حالة المخزون</h3>
                      
                      <div className="flex justify-between items-center my-1">
                        <div className="text-sm">0</div>
                        <div className="text-sm font-medium">{currentMaterial.minStock} (الحد الأدنى)</div>
                        <div className="text-sm">{currentMaterial.minStock * 2}</div>
                      </div>
                      
                      <div className="w-full h-3 bg-gray-200 rounded-full mt-2 mb-4">
                        <div 
                          className={`h-full rounded-full ${
                            currentMaterial.quantity <= currentMaterial.minStock ? 'bg-red-500' : 
                            currentMaterial.quantity <= currentMaterial.minStock * 1.5 ? 'bg-amber-500' : 
                            'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, Math.round((currentMaterial.quantity / (currentMaterial.minStock * 2)) * 100))}%` 
                          }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                          <div className="text-xs text-muted-foreground">نفاد المخزون</div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
                          <div className="text-xs text-muted-foreground">مخزون منخفض</div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                          <div className="text-xs text-muted-foreground">مخزون جيد</div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-muted-foreground">الأهمية:</span>
                          <span className="text-sm font-medium">{currentMaterial.importance} / 10</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${currentMaterial.importance * 10}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* آخر التحديثات للمخزون */}
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-3">آخر تحديثات المخزون</h3>
                      <div className="space-y-3">
                        <div className="text-center text-sm text-muted-foreground">
                          <p>سيتم عرض آخر 5 حركات لهذا المنتج هنا</p>
                          <p className="mt-2">لتفعيل هذه الميزة، قم بإضافة جدول حركة المخزون</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* المنتجات المرتبطة */}
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-3">المنتجات المرتبطة</h3>
                  <div className="text-center text-sm text-muted-foreground">
                    <p>سيتم عرض المنتجات النهائية التي تستخدم هذا المستلزم هنا</p>
                    <p className="mt-2">لتفعيل هذه الميزة، قم بربط المنتجات النهائية بمستلزمات التعبئة</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                إغلاق
              </Button>
              <Button
                onClick={() => {
                  setIsDetailsDialogOpen(false);
                  setIsEditDialogOpen(true);
                }}
              >
                تعديل المعلومات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default PackagingMaterials;
