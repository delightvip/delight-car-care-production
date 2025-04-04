
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { FileUp, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import FinishedProductsList from '@/components/inventory/finished-products/FinishedProductsList';
import FinishedProductForm from '@/components/inventory/finished-products/FinishedProductForm';
import DeleteConfirmDialog from '@/components/inventory/common/DeleteConfirmDialog';
import FinishedProductDetails from '@/components/inventory/finished-products/FinishedProductDetails';
import ImportDialog from '@/components/inventory/common/ImportDialog';

const FinishedProducts = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
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
            <h1 className="text-3xl font-bold tracking-tight">المنتجات النهائية</h1>
            <p className="text-muted-foreground mt-1">إدارة المنتجات النهائية الجاهزة للبيع</p>
          </div>
          <div className="flex gap-2">
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
              // Delete logic here
              setIsDeleteDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
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
