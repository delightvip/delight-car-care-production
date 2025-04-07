
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { FileUp, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import PackagingMaterialsList from '@/components/inventory/packaging/PackagingMaterialsList';
import PackagingMaterialForm from '@/components/inventory/packaging/PackagingMaterialForm';
import DeleteConfirmDialog from '@/components/inventory/common/DeleteConfirmDialog';
import PackagingMaterialDetails from '@/components/inventory/packaging/PackagingMaterialDetails';
import ImportPackagingDialog from '@/components/inventory/packaging/ImportPackagingDialog';

const PackagingMaterials = () => {
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
  
  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">مستلزمات التعبئة</h1>
            <p className="text-muted-foreground mt-1">إدارة مستلزمات التعبئة المستخدمة في عمليات الإنتاج</p>
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
        
        <PackagingMaterialsList 
          filterType={filterType}
          searchQuery={searchQuery}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />
        
        {/* Dialogs */}
        {isAddDialogOpen && (
          <PackagingMaterialForm
            isOpen={isAddDialogOpen}
            onClose={() => setIsAddDialogOpen(false)}
            title="إضافة مستلزم تعبئة جديد"
            submitText="إضافة"
          />
        )}
        
        {isEditDialogOpen && currentMaterial && (
          <PackagingMaterialForm
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            initialData={currentMaterial}
            title="تعديل مستلزم تعبئة"
            submitText="حفظ التعديلات"
          />
        )}
        
        {isDeleteDialogOpen && currentMaterial && (
          <DeleteConfirmDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onConfirm={() => {
              // Delete logic here
              setIsDeleteDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
            }}
            title="حذف مستلزم تعبئة"
            description={`هل أنت متأكد من حذف ${currentMaterial.name}؟ لا يمكن التراجع عن هذه العملية.`}
          />
        )}
        
        {isDetailsDialogOpen && currentMaterial && (
          <PackagingMaterialDetails
            isOpen={isDetailsDialogOpen}
            onClose={() => setIsDetailsDialogOpen(false)}
            material={currentMaterial}
          />
        )}
        
        <ImportPackagingDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onSuccess={handleImportSuccess}
        />
      </div>
    </PageTransition>
  );
};

export default PackagingMaterials;
