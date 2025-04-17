import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { FileUp, Plus, FileDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import RawMaterialsList from '@/components/inventory/raw-materials/RawMaterialsList';
import RawMaterialForm from '@/components/inventory/raw-materials/RawMaterialForm';
import DeleteConfirmDialog from '@/components/inventory/common/DeleteConfirmDialog';
import ImportMaterialsDialog from '@/components/inventory/raw-materials/ImportMaterialsDialog';
import RawMaterialDetails from '@/components/inventory/raw-materials/RawMaterialDetails';
import RawMaterialsStats from '@/components/inventory/raw-materials/RawMaterialsStats';
import InventoryService from '@/services/InventoryService';
import { exportToExcel, prepareDataForExport } from '@/utils/exportData';
import { toast } from 'sonner';

const RawMaterials = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<any>(null);
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'high-value'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, totalValue: 0 });

  const queryClient = useQueryClient();

  // احصائيات المواد الخام
  useEffect(() => {
    async function fetchStats() {
      try {
        const inventoryService = InventoryService.getInstance();
        const materials = await inventoryService.getRawMaterials();
        let total = materials.length;
        let lowStock = materials.filter((m: any) => Number(m.quantity) <= Number(m.min_stock) * 1.2).length;
        let totalValue = materials.reduce((acc: number, m: any) => acc + (Number(m.quantity) * Number(m.unit_cost)), 0);
        setStats({ total, lowStock, totalValue });
      } catch (e) {
        setStats({ total: 0, lowStock: 0, totalValue: 0 });
      }
    }
    fetchStats();
  }, [isAddDialogOpen, isEditDialogOpen, isDeleteDialogOpen]);

  // Handle opening edit dialog
  const handleEdit = (material: any) => {
    setCurrentMaterial(material);
    setIsEditDialogOpen(true);
  };
  // Handle opening delete confirmation dialog
  const handleDelete = (material: any) => {
    setCurrentMaterial(material);
    setIsDeleteDialogOpen(true);
  };
  // Handle opening material details dialog
  const handleView = (material: any) => {
    setCurrentMaterial(material);
    setIsDetailsDialogOpen(true);
  };
  // تصدير بيانات المواد الخام إلى ملف Excel
  const handleExportData = async () => {
    setExporting(true);
    toast.info('جاري تحضير بيانات التصدير...', { id: 'export-data' });
    try {
      // استدعاء خدمة المخزون للحصول على البيانات الكاملة
      const inventoryService = InventoryService.getInstance();
      const materials = await inventoryService.getRawMaterials();
      if (!materials || materials.length === 0) {
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
        { key: 'importance', title: 'الأهمية' }
      ];
      // تحضير البيانات للتصدير
      const exportData = prepareDataForExport(materials, columns);
      // تصدير البيانات
      exportToExcel(exportData, 'المواد-الخام', 'المواد الخام');
      toast.success('تم تصدير البيانات بنجاح', { id: 'export-data' });
    } catch (error) {
      console.error('خطأ في تصدير البيانات:', error);
      toast.error('حدث خطأ أثناء تصدير البيانات', { id: 'export-data' });
    } finally {
      setExporting(false);
    }
  };

  // عند النقر على بطاقة إحصائية
  const handleStatClick = (type: 'total' | 'lowStock' | 'totalValue') => {
    if (type === 'lowStock') {
      setFilterType('low-stock');
    } else if (type === 'total') {
      setFilterType('all');
    } else if (type === 'totalValue') {
      setFilterType('high-value');
    }
  };

  return (
    <PageTransition>
      <div className="space-y-4 max-w-screen-xl mx-auto px-2 sm:px-4">
        <RawMaterialsStats total={stats.total} lowStock={stats.lowStock} totalValue={stats.totalValue} onStatClick={handleStatClick} />
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">المواد الخام</h1>
            <p className="text-muted-foreground mt-1 text-sm">إدارة المواد الخام المستخدمة في عمليات الإنتاج</p>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-2 mb-2">
            <div className="flex flex-wrap gap-2 items-center order-2 md:order-1">
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-200 font-semibold px-3 py-1.5 text-sm gap-1"
                size="sm"
              >
                <Plus className="h-4 w-4" /> إضافة مادة
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportData}
                disabled={exporting}
                title="تصدير بيانات المواد الخام إلى ملف Excel"
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
                  <SelectValue placeholder="تصفية المواد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المواد</SelectItem>
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
        {/* جدول المواد الخام */}
        <div className="overflow-x-auto rounded-xl border bg-card">
          <RawMaterialsList 
            filterType={filterType}
            searchQuery={searchQuery}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
          />
        </div>
        {/* Add form dialog */}
        {isAddDialogOpen && (
          <RawMaterialForm
            isOpen={isAddDialogOpen}
            onClose={() => setIsAddDialogOpen(false)}
            title="إضافة مادة خام جديدة"
            submitText="إضافة"
          />
        )}
        {/* Edit form dialog */}
        {isEditDialogOpen && currentMaterial && (
          <RawMaterialForm
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            initialData={currentMaterial}
            title="تعديل مادة خام"
            submitText="حفظ التعديلات"
          />
        )}
        {/* Delete confirmation dialog */}
        {isDeleteDialogOpen && currentMaterial && (
          <DeleteConfirmDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onConfirm={() => {
              // استدعاء خدمة المخزون لحذف المادة الخام
              const inventoryService = InventoryService.getInstance();
              inventoryService.deleteRawMaterial(currentMaterial.id).then((success) => {
                if (success) {
                  toast.success(`تم حذف المادة الخام ${currentMaterial.name} بنجاح`);
                  setIsDeleteDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
                } else {
                  toast.error(`فشل في حذف المادة الخام ${currentMaterial.name}`);
                }
              });
            }}
            title="حذف مادة خام"
            description={`هل أنت متأكد من حذف ${currentMaterial.name}؟ لا يمكن التراجع عن هذه العملية.`}
            confirmText="نعم، حذف"
            cancelText="إلغاء"
          />
        )}
        {/* Material details dialog */}
        {isDetailsDialogOpen && currentMaterial && (
          <RawMaterialDetails
            isOpen={isDetailsDialogOpen}
            onClose={() => setIsDetailsDialogOpen(false)}
            material={currentMaterial}
          />
        )}
        {/* Import dialog */}
        <ImportMaterialsDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
        />
      </div>
    </PageTransition>
  );
};

export default RawMaterials;
