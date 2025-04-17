import React, { useState, useMemo } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { FileUp, Plus, FileDown, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import FinishedProductsList from '@/components/inventory/finished-products/FinishedProductsList';
import FinishedProductForm from '@/components/inventory/finished-products/FinishedProductForm';
import DeleteConfirmDialog from '@/components/inventory/common/DeleteConfirmDialog';
import FinishedProductDetails from '@/components/inventory/finished-products/FinishedProductDetails';
import ImportDialog from '@/components/inventory/common/ImportDialog';
import InventoryService from '@/services/InventoryService';
import CostUpdateService from '@/services/CostUpdateService';
import { exportToExcel, prepareDataForExport } from '@/utils/exportData';
import { toast } from 'sonner';
import FinishedProductsStats from '@/components/inventory/finished-products/FinishedProductsStats';
import { supabase } from '@/integrations/supabase/client';

const FinishedProducts = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);  
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);  
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'high-value'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [updatingCosts, setUpdatingCosts] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Fetch finished products for stats
  const { data: finishedProducts = [], isLoading } = useQuery({
    queryKey: ['finishedProducts'],
    queryFn: async () => {
      // Get the finished products
      const { data: products, error: productsError } = await supabase
        .from('finished_products')
        .select(`*, semi_finished:semi_finished_id(id, name, code, unit_cost)`)
        .order('created_at', { ascending: false });
      if (productsError) throw new Error(productsError.message);
      // Get packaging materials for each product
      const productsWithPackaging = await Promise.all(products.map(async (product) => {
        const { data: packaging } = await supabase
          .from('finished_product_packaging')
          .select(`id, quantity, packaging_material:packaging_material_id(id, name, code, unit_cost)`)
          .eq('finished_product_id', product.id);
        // Format packaging materials
        const formattedPackaging = packaging?.map((pkg) => ({
          id: pkg.packaging_material?.id,
          code: pkg.packaging_material?.code,
          name: pkg.packaging_material?.name,
          quantity: pkg.quantity
        })) || [];
        // Calculate cost
        const unitCost = product.unit_cost;
        const quantity = Number(product.quantity);
        const totalValue = quantity * unitCost;
        return {
          ...product,
          quantity,
          unit_cost: unitCost,
          totalValue,
          packaging: formattedPackaging
        };
      }));
      return productsWithPackaging;
    }
  });

  // Calculate stats
  const stats = useMemo(() => {
    const total = finishedProducts.length;
    const lowStock = finishedProducts.filter((p) => Number(p.quantity) <= Number(p.min_stock)).length;
    const totalValue = finishedProducts.reduce((sum, p) => sum + (Number(p.totalValue) || 0), 0);
    return { total, lowStock, totalValue };
  }, [finishedProducts]);
  
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
  
  // تصدير بيانات المنتجات النهائية إلى ملف Excel
  const handleExportData = async () => {
    setExporting(true);
    toast.info('جاري تحضير بيانات التصدير...', { id: 'export-data' });
    
    try {
      // استدعاء خدمة المخزون للحصول على البيانات الكاملة
      const inventoryService = InventoryService.getInstance();
      const products = await inventoryService.getFinishedProducts();
      
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
        { key: 'sales_price', title: 'سعر البيع' },
        { key: 'min_stock', title: 'الحد الأدنى للمخزون' }
      ];
      
      // تحضير البيانات للتصدير
      const exportData = prepareDataForExport(products, columns);
      
      // تصدير البيانات
      exportToExcel(exportData, 'المنتجات-النهائية', 'المنتجات النهائية');
      
      toast.success('تم تصدير البيانات بنجاح', { id: 'export-data' });
    } catch (error) {
      console.error('خطأ في تصدير البيانات:', error);
      toast.error('حدث خطأ أثناء تصدير البيانات', { id: 'export-data' });
    } finally {
      setExporting(false);
    }
  };
  
  // تحديث تكاليف جميع المنتجات النهائية بناءً على مكوناتها
  const handleUpdateAllCosts = async () => {
    if (updatingCosts) return;
    
    setUpdatingCosts(true);
    toast.info('جاري تحديث تكاليف المنتجات النهائية...', { id: 'update-costs' });
    
    try {
      const costUpdateService = CostUpdateService.getInstance();
      const updatedCount = await costUpdateService.updateAllFinishedProductsCosts();
      
      if (updatedCount > 0) {
        toast.success(`تم تحديث تكاليف ${updatedCount} منتج نهائي بنجاح`, { id: 'update-costs' });
        // تحديث بيانات القائمة
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
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <FinishedProductsStats 
          total={stats.total}
          lowStock={stats.lowStock}
          totalValue={stats.totalValue}
          onStatClick={handleStatClick}
        />
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المنتجات النهائية</h1>
            <p className="text-muted-foreground mt-1">إدارة المنتجات النهائية الجاهزة للبيع</p>          </div>          <div className="flex gap-2 flex-wrap items-center">
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-200 font-semibold px-3 py-1.5 text-sm gap-1"
              size="sm"
            >
              <Plus className="h-4 w-4" /> إضافة منتج
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportData}
              disabled={exporting}
              title="تصدير بيانات المنتجات النهائية إلى ملف Excel"
              className="gap-1 bg-sky-100 hover:bg-sky-200 text-sky-700 border-sky-200 font-semibold px-3 py-1.5 text-sm"
              size="sm"
            >
              <FileDown className={exporting ? 'animate-pulse h-4 w-4' : 'h-4 w-4'} /> تصدير البيانات
            </Button>
            <Button 
              variant="outline" 
              onClick={handleUpdateAllCosts}
              disabled={updatingCosts}
              title="تحديث تكاليف جميع المنتجات النهائية بناءً على المكونات"
              className="gap-1 bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-200 font-semibold px-3 py-1.5 text-sm"
              size="sm"
            >
              <RefreshCw className={updatingCosts ? 'animate-spin h-4 w-4' : 'h-4 w-4'} /> تحديث التكاليف
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
        
        <FinishedProductsList 
          filterType={filterType}
          searchQuery={searchQuery}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />
        
        {/* Dialogs */}
        {isAddDialogOpen && (
          <FinishedProductForm
            isOpen={isAddDialogOpen}
            onClose={() => setIsAddDialogOpen(false)}
            title="إضافة منتج نهائي جديد"
            submitText="إضافة"
          />
        )}
        
        {isEditDialogOpen && currentProduct && (
          <FinishedProductForm
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            initialData={currentProduct}
            title="تعديل منتج نهائي"
            submitText="حفظ التعديلات"
          />
        )}
        
        {isDeleteDialogOpen && currentProduct && (
          <DeleteConfirmDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onConfirm={() => {
              // استدعاء خدمة المخزون لحذف المنتج النهائي
              const inventoryService = InventoryService.getInstance();
              inventoryService.deleteFinishedProduct(currentProduct.id).then((success) => {
                if (success) {
                  toast.success(`تم حذف المنتج ${currentProduct.name} بنجاح`);
                  setIsDeleteDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
                } else {
                  toast.error(`فشل في حذف المنتج ${currentProduct.name}`);
                }
              });
            }}
            title="حذف منتج نهائي"
            description={`هل أنت متأكد من حذف ${currentProduct.name}؟ لا يمكن التراجع عن هذه العملية.`}
          />
        )}
        
        {isDetailsDialogOpen && currentProduct && (
          <FinishedProductDetails
            isOpen={isDetailsDialogOpen}
            onClose={() => setIsDetailsDialogOpen(false)}
            product={currentProduct}
          />
        )}
        
        <ImportDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          title="استيراد المنتجات النهائية"
          description="قم بتحميل ملف Excel أو CSV يحتوي على بيانات المنتجات النهائية"
        />
      </div>
    </PageTransition>
  );
};

export default FinishedProducts;
