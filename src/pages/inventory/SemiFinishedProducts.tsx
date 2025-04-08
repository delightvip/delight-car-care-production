
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { FileUp, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import SemiFinishedList from '@/components/inventory/semi-finished/SemiFinishedList';
import SemiFinishedForm from '@/components/inventory/semi-finished/SemiFinishedForm';
import DeleteConfirmDialog from '@/components/inventory/common/DeleteConfirmDialog';
import SemiFinishedDetails from '@/components/inventory/semi-finished/SemiFinishedDetails';
import ImportDialog from '@/components/inventory/common/ImportDialog';
import InventoryService from '@/services/InventoryService';
import { toast } from 'sonner';
import InventoryAuditButton from '@/components/inventory/audit/InventoryAuditButton';
import InventoryAuditDialog from '@/components/inventory/audit/InventoryAuditDialog';

const SemiFinishedProducts = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'high-value'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
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
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المنتجات النصف مصنعة</h1>
            <p className="text-muted-foreground mt-1">إدارة المنتجات النصف مصنعة المستخدمة في عمليات الإنتاج</p>
          </div>
          <div className="flex gap-2">
            <InventoryAuditButton onClick={() => setIsAuditDialogOpen(true)} />
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
        
        {/* Inventory Audit Dialog */}
        <InventoryAuditDialog
          isOpen={isAuditDialogOpen}
          onClose={() => {
            setIsAuditDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
          }}
          inventoryType="semi_finished_products"
          title="جرد المنتجات النصف مصنعة"
        />
      </div>
    </PageTransition>
  );
};

export default SemiFinishedProducts;
