
import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { FileUp, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import SemiFinishedList from '@/components/inventory/semi-finished/SemiFinishedList';
import SemiFinishedForm from '@/components/inventory/semi-finished/SemiFinishedForm';
import DeleteConfirmDialog from '@/components/inventory/common/DeleteConfirmDialog';
import SemiFinishedDetails from '@/components/inventory/semi-finished/SemiFinishedDetails';
import ImportSemiFinishedDialog from '@/components/inventory/semi-finished/ImportSemiFinishedDialog';

const SemiFinishedProducts = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'high-value'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
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
  
  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
  };
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (productId: number) => {
      setIsDeleting(true);
      
      try {
        // First, check if the product is used in any semi-finished ingredients
        const { data: usedInIngredients, error: checkError } = await supabase
          .from('semi_finished_ingredients')
          .select('id')
          .eq('semi_finished_id', productId)
          .not('semi_finished_product_id', 'eq', productId); // Exclude self-references
        
        if (checkError) {
          console.error("Error checking ingredient usage:", checkError);
          throw checkError;
        }
        
        if (usedInIngredients && usedInIngredients.length > 0) {
          throw new Error("لا يمكن حذف هذا المنتج لأنه مستخدم كمكون في منتجات أخرى");
        }
        
        // Check if used in any finished products
        const { data: usedInFinished, error: finishedError } = await supabase
          .from('finished_products')
          .select('id')
          .eq('semi_finished_id', productId);
          
        if (finishedError) {
          console.error("Error checking finished product usage:", finishedError);
          throw finishedError;
        }
        
        if (usedInFinished && usedInFinished.length > 0) {
          throw new Error("لا يمكن حذف هذا المنتج لأنه مستخدم في منتجات نهائية");
        }
        
        // First, delete any ingredients associated with this product
        const { error: ingredientsError } = await supabase
          .from('semi_finished_ingredients')
          .delete()
          .eq('semi_finished_product_id', productId);
          
        if (ingredientsError) {
          console.error("Error deleting ingredients:", ingredientsError);
          throw ingredientsError;
        }
        
        // Then delete the product itself
        const { error: productError } = await supabase
          .from('semi_finished_products')
          .delete()
          .eq('id', productId);
          
        if (productError) {
          console.error("Error deleting product:", productError);
          throw productError;
        }
        
        return productId;
      } catch (error: any) {
        console.error("Delete operation failed:", error);
        throw new Error(error.message || "Failed to delete product");
      } finally {
        setIsDeleting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
      toast.success('تم حذف المنتج النصف مصنع بنجاح');
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ أثناء الحذف: ${error.message}`);
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  });
  
  const handleConfirmDelete = () => {
    if (currentProduct && currentProduct.id) {
      deleteMutation.mutate(currentProduct.id);
    }
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
            onConfirm={handleConfirmDelete}
            title="حذف منتج نصف مصنع"
            description={`هل أنت متأكد من حذف ${currentProduct.name}؟ لا يمكن التراجع عن هذه العملية.`}
            isLoading={isDeleting}
          />
        )}
        
        {isDetailsDialogOpen && currentProduct && (
          <SemiFinishedDetails
            isOpen={isDetailsDialogOpen}
            onClose={() => setIsDetailsDialogOpen(false)}
            product={currentProduct}
          />
        )}
        
        <ImportSemiFinishedDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onSuccess={handleImportSuccess}
        />
      </div>
    </PageTransition>
  );
};

export default SemiFinishedProducts;
