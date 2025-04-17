import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import PackagingMaterialsList from '@/components/inventory/packaging/PackagingMaterialsList';
import PackagingMaterialsStats from '@/components/inventory/packaging/PackagingMaterialsStats';
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
import { Edit, Plus, Trash, FileUp, Eye, PlusCircle, MinusCircle, FileDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import InventoryService from '@/services/InventoryService';
import CostUpdateService from '@/services/CostUpdateService';
import { exportToExcel, prepareDataForExport } from '@/utils/exportData';
import { getCommonTableColumns, renderInventoryActions } from '@/components/inventory/common/InventoryTableColumns';

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
    minStock: 0  });  const [importFile, setImportFile] = useState<File | null>(null);
  
  // إضافة حالة للتصفية حسب حالة المخزون
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'high-value' | 'high-importance'>('all');
  
  // إضافة حالة للفرز
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  // إضافة حالة للتحكم في عملية التصدير
  const [exporting, setExporting] = useState(false);
  const [updatingCosts, setUpdatingCosts] = useState(false);
  
  // إضافة حالة البحث عن المستلزم
  const [searchQuery, setSearchQuery] = useState('');
  
  const queryClient = useQueryClient();
  
  // تحديث تكاليف المنتجات النهائية المرتبطة بمواد التغليف
  const handleUpdateFinishedProductCosts = async () => {
    if (updatingCosts) return;
    
    setUpdatingCosts(true);
    toast.info('جاري تحديث تكاليف المنتجات النهائية...', { id: 'update-costs' });
    
    try {
      const costUpdateService = CostUpdateService.getInstance();
      const updatedCount = await costUpdateService.updateAllFinishedProductsCosts();
      
      if (updatedCount > 0) {
        toast.success(`تم تحديث تكاليف ${updatedCount} منتج نهائي بنجاح`, { id: 'update-costs' });
        // تحديث بيانات المنتجات النهائية
        queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
      } else {
        toast.info('لم يتم تحديث أي منتجات', { id: 'update-costs' });
      }
    } catch (error) {
      console.error('خطأ في تحديث تكاليف المنتجات النهائية:', error);
      toast.error('حدث خطأ أثناء تحديث تكاليف المنتجات النهائية', { id: 'update-costs' });
    } finally {
      setUpdatingCosts(false);
    }
  };
  
  // تصدير بيانات مستلزمات التعبئة إلى ملف Excel
  const handleExportData = async () => {
    setExporting(true);
    toast.info('جاري تحضير بيانات التصدير...', { id: 'export-data' });
    
    try {
      // استدعاء خدمة المخزون للحصول على البيانات الكاملة
      const inventoryService = InventoryService.getInstance();
      const materials = await inventoryService.getPackagingMaterials();
      
      if (!materials || materials.length === 0) {
        toast.error('لا توجد بيانات للتصدير', { id: 'export-data' });
        return;
      }
      
      // تحضير الأعمدة للتصدير
      const columns = [
        { key: 'code', title: 'الكود' },
        { key: 'name', title: 'الاسم' },
        { key: 'quantity', title: 'الكمية المتاحة' },
        { key: 'unit', title: 'وحدة القياس' },
        { key: 'unit_cost', title: 'تكلفة الوحدة' },
        { key: 'min_stock', title: 'الحد الأدنى للمخزون' }
      ];
      
      // تحضير البيانات للتصدير
      const exportData = prepareDataForExport(materials, columns);
      
      // تصدير البيانات
      exportToExcel(exportData, 'مستلزمات-التعبئة', 'مستلزمات التعبئة');
      
      toast.success('تم تصدير البيانات بنجاح', { id: 'export-data' });
    } catch (error) {
      console.error('خطأ في تصدير البيانات:', error);
      toast.error('حدث خطأ أثناء تصدير البيانات', { id: 'export-data' });
    } finally {
      setExporting(false);
    }
  };
  
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

  // تطبيق البحث على البيانات المفلترة
  const searchedMaterials = useMemo(() => {
    if (!filteredMaterials) return [];
    if (!searchQuery.trim()) return filteredMaterials;
    return filteredMaterials.filter(item =>
      item.name?.toString().includes(searchQuery) ||
      item.code?.toString().includes(searchQuery)
    );
  }, [filteredMaterials, searchQuery]);

  // تطبيق الفرز على البيانات المفلترة
  const sortedMaterials = useMemo(() => {
    if (!sortConfig) return searchedMaterials;
    
    return [...searchedMaterials].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [searchedMaterials, sortConfig]);
  
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
      // تحديث مادة التغليف
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
      
      // تحديث تكاليف المنتجات النهائية المرتبطة باستخدام CostUpdateService
      const costUpdateService = CostUpdateService.getInstance();
      await costUpdateService.updateFinishedProductsForPackagingMaterial(material.id);
      
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      // تحديث بيانات المنتجات النهائية أيضاً
      queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
      toast.success('تم تعديل مستلزم التعبئة بنجاح وتحديث تكاليف المنتجات النهائية المرتبطة');
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
  
  const [stats, setStats] = useState({ total: 0, lowStock: 0, totalValue: 0 });

  // احصائيات مستلزمات التعبئة
  React.useEffect(() => {
    async function fetchStats() {
      try {
        const inventoryService = InventoryService.getInstance();
        const materials = await inventoryService.getPackagingMaterials();
        let total = materials.length;
        let lowStock = materials.filter((m: any) => Number(m.quantity) <= Number(m.min_stock || m.minStock) * 1.2).length;
        let totalValue = materials.reduce((acc: number, m: any) => acc + (Number(m.quantity) * Number(m.unit_cost || m.price)), 0);
        setStats({ total, lowStock, totalValue });
      } catch (e) {
        setStats({ total: 0, lowStock: 0, totalValue: 0 });
      }
    }
    fetchStats();
  }, [isAddDialogOpen, isEditDialogOpen, isDeleteDialogOpen]);

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
    
    const inventoryService = InventoryService.getInstance();
    inventoryService.deletePackagingMaterial(currentMaterial.id).then((success) => {
      if (success) {
        // لا داعي لاستدعاء toast.success لأن الدالة في InventoryService تقوم بذلك
        setIsDeleteDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      }
    });
  };
  
  return (
    <PageTransition>
      <div className="space-y-4 max-w-screen-xl mx-auto px-2 sm:px-4">
        <PackagingMaterialsStats
          total={stats.total}
          lowStock={stats.lowStock}
          totalValue={stats.totalValue}
          onStatClick={(type) => {
            if (type === 'lowStock') setFilterType('low-stock');
            else if (type === 'total') setFilterType('all');
            else if (type === 'totalValue') setFilterType('high-value');
          }}
        />
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">مستلزمات التعبئة</h1>
            <p className="text-muted-foreground mt-1 text-sm">إدارة مستلزمات التعبئة والتغليف المستخدمة في عمليات الإنتاج</p>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-2 mb-2">
            <div className="flex flex-wrap gap-2 items-center order-2 md:order-1">
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-200 font-semibold px-3 py-1.5 text-sm gap-1"
                size="sm"
              >
                <Plus className="h-4 w-4" /> إضافة مستلزم
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportData}
                disabled={exporting}
                title="تصدير بيانات مستلزمات التعبئة إلى ملف Excel"
                className="gap-1 bg-sky-100 hover:bg-sky-200 text-sky-700 border-sky-200 font-semibold px-3 py-1.5 text-sm"
                size="sm"
              >
                <FileDown className={exporting ? 'animate-pulse h-4 w-4' : 'h-4 w-4'} /> تصدير البيانات
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsImportDialogOpen(true)}
                className="bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200 font-semibold px-3 py-1.5 text-sm gap-1"
                size="sm"
              >
                <FileUp className="h-4 w-4" /> استيراد من ملف
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 items-center order-1 md:order-2">
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-[130px] bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-gray-100 text-xs h-9">
                  <SelectValue placeholder="تصفية المستلزمات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المستلزمات</SelectItem>
                  <SelectItem value="low-stock">المخزون المنخفض</SelectItem>
                  <SelectItem value="high-value">الأعلى قيمة</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="w-[140px] bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400 text-xs h-9"
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
          <PackagingMaterialsList
            data={sortedMaterials}
            isLoading={isLoading}
            sortConfig={sortConfig}
            onSort={handleSort}
            quickUpdateQuantity={(id, change) => quickUpdateQuantityMutation.mutate({ id, change })}
            onEdit={(rec) => { setCurrentMaterial(rec); setIsEditDialogOpen(true); }}
            onDelete={(rec) => { setCurrentMaterial(rec); setIsDeleteDialogOpen(true); }}
            onView={(rec) => { setCurrentMaterial(rec); setIsDetailsDialogOpen(true); }}
          />
        )}
        
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
              <Button variant="destructive" onClick={handleDeleteMaterial}>
                حذف
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
