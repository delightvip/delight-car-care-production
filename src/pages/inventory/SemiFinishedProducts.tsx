import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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

const SemiFinishedProducts = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'high-value'>('all');  const [searchQuery, setSearchQuery] = useState('');
  const [updatingCosts, setUpdatingCosts] = useState(false);
  const [exporting, setExporting] = useState(false);
  
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المنتجات النصف مصنعة</h1>
            <p className="text-muted-foreground mt-1">إدارة المنتجات النصف مصنعة المستخدمة في عمليات الإنتاج</p>
          </div>          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleUpdateCosts} 
              disabled={updatingCosts}
              title="تحديث تكاليف المنتجات بناءً على آخر أسعار المواد الخام"
              className="gap-2"
            >
              <RefreshCw size={18} className={updatingCosts ? 'animate-spin' : ''} />
              تحديث التكاليف
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportData}
              disabled={exporting}
              title="تصدير بيانات المنتجات النصف مصنعة إلى ملف Excel"
              className="gap-2"
            >
              <FileDown size={18} className={exporting ? 'animate-pulse' : ''} />
              تصدير البيانات
            </Button>
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
            <Input
              className="w-[220px]"
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
