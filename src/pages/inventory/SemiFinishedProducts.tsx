import React, { useState, useMemo } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { FileUp, Plus, RefreshCw, FileDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import SemiFinishedList from '@/components/inventory/semi-finished/SemiFinishedList';
import SemiFinishedForm from '@/components/inventory/semi-finished/SemiFinishedForm';
import DeleteConfirmDialog from '@/components/inventory/common/DeleteConfirmDialog';
import SemiFinishedDetails from '@/components/inventory/semi-finished/SemiFinishedDetails';
import ImportDialog from '@/components/inventory/common/ImportDialog';
import InventoryService from '@/services/InventoryService';
import CostUpdateService from '@/services/CostUpdateService';
import { exportToExcel, prepareDataForExport } from '@/utils/exportData';
import { toast } from 'sonner';
import SemiFinishedStats from '@/components/inventory/semi-finished/SemiFinishedStats';

const SemiFinishedProducts = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'high-value'>('all');  
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingCosts, setUpdatingCosts] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Fetch semi-finished products for stats
  const { data: semiFinishedProducts = [], isLoading } = useQuery({
    queryKey: ['semiFinishedProducts'],
    queryFn: async () => {
      // Get the semi-finished products
      const { data: products, error: productsError } = await supabase
        .from('semi_finished_products')
        .select('*')
        .order('created_at', { ascending: false });
      if (productsError) throw new Error(productsError.message);
      // Get ingredients for each product
      const productsWithIngredients = await Promise.all(products.map(async (product) => {
        const { data: ingredients } = await supabase
          .from('semi_finished_ingredients')
          .select(`id, percentage, raw_materials:raw_material_id(id, code, name, unit_cost)`)
          .eq('semi_finished_id', product.id);
        // Format ingredients
        const formattedIngredients = ingredients?.map((ingredient) => ({
          id: ingredient.raw_materials?.id,
          code: ingredient.raw_materials?.code,
          name: ingredient.raw_materials?.name,
          percentage: ingredient.percentage
        })) || [];
        // Calculate cost
        const quantity = Number(product.quantity);
        const unitCost = Number(product.unit_cost);
        const totalValue = quantity * unitCost;
        return {
          ...product,
          quantity,
          unit_cost: unitCost,
          totalValue,
          ingredients: formattedIngredients
        };
      }));
      return productsWithIngredients;
    }
  });

  // Calculate stats
  const stats = useMemo(() => {
    const total = semiFinishedProducts.length;
    const lowStock = semiFinishedProducts.filter((p) => Number(p.quantity) <= Number(p.min_stock)).length;
    const totalValue = semiFinishedProducts.reduce((sum, p) => sum + (Number(p.totalValue) || 0), 0);
    return { total, lowStock, totalValue };
  }, [semiFinishedProducts]);
  
  // Handle opening edit dialog
  const handleEdit = (product: any) => {
    setCurrentProduct(product);
    setIsEditDialogOpen(true);
  };
  
  // Handle opening delete confirmation dialog
  const handleDelete = (product: any) => {
    setCurrentProduct(product);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle opening product details dialog
  const handleView = (product: any) => {
    setCurrentProduct(product);
    setIsDetailsDialogOpen(true);
  };
  
  // Handle stat card click (filtering)
  const handleStatClick = (type: 'total' | 'lowStock' | 'totalValue') => {
    if (type === 'lowStock') {
      setFilterType('low-stock');
    } else if (type === 'total') {
      setFilterType('all');
    } else if (type === 'totalValue') {
      setFilterType('high-value');
    }
  };
  
  // تحديث تكاليف المنتجات النصف مصنعة بناءً على آخر أسعار المواد الخام
  const handleUpdateCosts = async () => {
    if (updatingCosts) return; // منع التنفيذ المتكرر أثناء التحديث
    
    setUpdatingCosts(true);
    toast.info('جاري تحديث تكاليف المنتجات النصف مصنعة...', { id: 'cost-update' });
    
    try {
      const costUpdateService = CostUpdateService.getInstance();
      const updatedCount = await costUpdateService.updateAllSemiFinishedCosts();
      
      if (updatedCount > 0) {
        toast.success(`تم تحديث تكاليف ${updatedCount} منتج نصف مصنع`, { id: 'cost-update' });
        // تحديث البيانات المعروضة
        queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
      } else {
        toast.info('لم يتم العثور على منتجات تحتاج للتحديث', { id: 'cost-update' });
      }
    } catch (error) {
      console.error('خطأ في تحديث تكاليف المنتجات النصف مصنعة:', error);
      toast.error('حدث خطأ أثناء تحديث تكاليف المنتجات', { id: 'cost-update' });    } finally {
      setUpdatingCosts(false);
    }
  };
  
  // تصدير بيانات المنتجات النصف مصنعة إلى ملف Excel
  const handleExportData = async () => {
    setExporting(true);
    toast.info('جاري تحضير بيانات التصدير...', { id: 'export-data' });
    
    try {
      // استدعاء خدمة المخزون للحصول على البيانات الكاملة
      const inventoryService = InventoryService.getInstance();
      const products = await inventoryService.getSemiFinishedProducts();
      
      if (!products || products.length === 0) {
        toast.error('لا توجد بيانات للتصدير', { id: 'export-data' });
        return;
      }
      
      // تحضير الأعمدة للتصدير (نفس الأعمدة المعروضة في الجدول)
      const columns = [
        { key: 'code', title: 'الكود' },
        { key: 'name', title: 'الاسم' },
        { key: 'quantity', title: 'الكمية المتاحة' },
        { key: 'unit', title: 'وحدة القياس' },
        { key: 'unit_cost', title: 'تكلفة الوحدة' },
        { key: 'min_stock', title: 'الحد الأدنى للمخزون' },
      ];
      
      // تحضير البيانات للتصدير
      const exportData = prepareDataForExport(products, columns);
      
      // تصدير البيانات
      exportToExcel(exportData, 'المنتجات-النصف-مصنعة', 'المنتجات النصف مصنعة');
      
      toast.success('تم تصدير البيانات بنجاح', { id: 'export-data' });
    } catch (error) {
      console.error('خطأ في تصدير البيانات:', error);
      toast.error('حدث خطأ أثناء تصدير البيانات', { id: 'export-data' });
    } finally {
      setExporting(false);
    }
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <SemiFinishedStats 
          total={stats.total}
          lowStock={stats.lowStock}
          totalValue={stats.totalValue}
          onStatClick={handleStatClick}
        />
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المنتجات النصف مصنعة</h1>
            <p className="text-muted-foreground mt-1">إدارة المنتجات النصف مصنعة المستخدمة في عمليات الإنتاج</p>
          </div>          <div className="flex gap-2 flex-wrap items-center">
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-200 font-semibold px-3 py-1.5 text-sm gap-1"
              size="sm"
            >
              <Plus className="h-4 w-4" /> إضافة منتج
            </Button>
            <Button 
              variant="outline" 
              onClick={handleUpdateCosts}
              disabled={updatingCosts}
              title="تحديث تكاليف المنتجات بناءً على آخر أسعار المواد الخام"
              className="gap-1 bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-200 font-semibold px-3 py-1.5 text-sm"
              size="sm"
            >
              <RefreshCw className={updatingCosts ? 'animate-spin h-4 w-4' : 'h-4 w-4'} /> تحديث التكاليف
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportData}
              disabled={exporting}
              title="تصدير بيانات المنتجات النصف مصنعة إلى ملف Excel"
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
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-[130px] bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-gray-100 text-xs h-9">
                <SelectValue placeholder="تصفية المنتجات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المنتجات</SelectItem>
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
        
        <SemiFinishedList 
          filterType={filterType}
          searchQuery={searchQuery}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />
        
        {/* Dialogs */}
        {isAddDialogOpen && (
          <SemiFinishedForm
            isOpen={isAddDialogOpen}
            onClose={() => setIsAddDialogOpen(false)}
            title="إضافة منتج نصف مصنع جديد"
            submitText="إضافة"
          />
        )}
        
        {isEditDialogOpen && currentProduct && (
          <SemiFinishedForm
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            initialData={currentProduct}
            title="تعديل منتج نصف مصنع"
            submitText="حفظ التعديلات"
          />
        )}
        
        {isDeleteDialogOpen && currentProduct && (
          <DeleteConfirmDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onConfirm={() => {
              // استدعاء خدمة المخزون لحذف المنتج نصف المصنع
              const inventoryService = InventoryService.getInstance();
              inventoryService.deleteSemiFinishedProduct(currentProduct.id).then((success) => {
                if (success) {
                  toast.success(`تم حذف المنتج ${currentProduct.name} بنجاح`);
                  setIsDeleteDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
                } else {
                  toast.error(`فشل في حذف المنتج ${currentProduct.name}`);
                }
              });
            }}
            title="حذف منتج نصف مصنع"
            description={`هل أنت متأكد من حذف ${currentProduct.name}؟ لا يمكن التراجع عن هذه العملية.`}
          />
        )}
        
        {isDetailsDialogOpen && currentProduct && (
          <SemiFinishedDetails
            isOpen={isDetailsDialogOpen}
            onClose={() => setIsDetailsDialogOpen(false)}
            product={currentProduct}
          />
        )}
        
        <ImportDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          title="استيراد المنتجات النصف مصنعة"
          description="قم بتحميل ملف Excel أو CSV يحتوي على بيانات المنتجات النصف مصنعة"
        />
      </div>
    </PageTransition>
  );
};

export default SemiFinishedProducts;
