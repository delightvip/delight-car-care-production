
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { FileUp, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import RawMaterialsList from '@/components/inventory/raw-materials/RawMaterialsList';
import RawMaterialForm from '@/components/inventory/raw-materials/RawMaterialForm';
import DeleteConfirmDialog from '@/components/inventory/common/DeleteConfirmDialog';
import ImportMaterialsDialog from '@/components/inventory/raw-materials/ImportMaterialsDialog';
import RawMaterialDetails from '@/components/inventory/raw-materials/RawMaterialDetails';

const RawMaterials = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<any>(null);
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'high-value'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const queryClient = useQueryClient();
  
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
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المواد الخام</h1>
            <p className="text-muted-foreground mt-1">إدارة المواد الخام المستخدمة في عمليات الإنتاج</p>
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
              إضافة مادة
            </Button>
          </div>
        </div>
        
        <RawMaterialsList 
          filterType={filterType}
          searchQuery={searchQuery}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />
        
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
              // Delete logic here
              setIsDeleteDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
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
