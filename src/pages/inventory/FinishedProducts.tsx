import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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

const FinishedProducts = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'high-value'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [updatingCosts, setUpdatingCosts] = useState(false);
  
  const queryClient = useQueryClient();
  
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المنتجات النهائية</h1>
            <p className="text-muted-foreground mt-1">إدارة المنتجات النهائية الجاهزة للبيع</p>          </div>          <div className="flex gap-2">            
            <Button 
              variant="outline" 
              onClick={handleExportData}
              disabled={exporting}
              title="تصدير بيانات المنتجات النهائية إلى ملف Excel"
              className="gap-2 bg-sky-100 hover:bg-sky-200 text-sky-700 border-sky-200"
            >
              <FileDown size={18} className={exporting ? 'animate-pulse' : ''} />
              تصدير البيانات
            </Button>
            <Button 
              variant="outline" 
              onClick={handleUpdateAllCosts}
              disabled={updatingCosts}
              title="تحديث تكاليف جميع المنتجات النهائية بناءً على المكونات"
              className="gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-200"
            >
              <RefreshCw size={18} className={updatingCosts ? 'animate-spin' : ''} />
              تحديث التكاليف
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsImportDialogOpen(true)}
              className="bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200"
            >
              <FileUp size={18} className="mr-2" />
              استيراد من ملف
            </Button>            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-[180px] bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-gray-100">
                <SelectValue placeholder="تصفية المنتجات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المنتجات</SelectItem>
                <SelectItem value="low-stock">المخزون المنخفض</SelectItem>
                <SelectItem value="high-value">الأعلى قيمة</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="w-[220px] bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400"
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus size={18} className="mr-2" />
              إضافة منتج
            </Button>
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
