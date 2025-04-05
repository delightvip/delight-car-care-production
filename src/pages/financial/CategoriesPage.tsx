
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Trash2, Edit, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import FinancialService from '@/services/financial/FinancialService';
import { Category } from '@/services/financial/FinancialTypes';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const financialService = FinancialService.getInstance();
  
  const { data: incomeCategories, isLoading: isLoadingIncome } = useQuery({
    queryKey: ['categories', 'income'],
    queryFn: () => financialService.getCategories('income'),
  });
  
  const { data: expenseCategories, isLoading: isLoadingExpense } = useQuery({
    queryKey: ['categories', 'expense'],
    queryFn: () => financialService.getCategories('expense'),
  });
  
  const handleAddCategory = () => {
    navigate('/financial/categories/new');
  };
  
  const handleEditCategory = (category: Category) => {
    navigate(`/financial/categories/edit/${category.id}`);
  };
  
  const handleDeleteCategory = (category: Category) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };
  
  const confirmDeleteCategory = async () => {
    if (!selectedCategory) return;
    
    try {
      const result = await financialService.deleteCategory(selectedCategory.id);
      
      if (result) {
        toast.success('تم حذف الفئة بنجاح');
        queryClient.invalidateQueries({ queryKey: ['categories'] });
      } else {
        toast.error('تعذر حذف الفئة. قد تكون هناك معاملات مرتبطة بها.');
      }
    } catch (error) {
      console.error('خطأ أثناء حذف الفئة:', error);
      toast.error('حدث خطأ أثناء حذف الفئة');
    }
    
    setDeleteDialogOpen(false);
  };
  
  const renderCategories = (categories: Category[] | undefined, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-8">
          <Spinner className="h-8 w-8" />
        </div>
      );
    }
    
    if (!categories || categories.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">لا توجد فئات بعد</p>
          <Button 
            onClick={handleAddCategory} 
            variant="outline" 
            className="mt-4"
          >
            <PlusCircle className="h-4 w-4 ml-2" />
            إضافة فئة جديدة
          </Button>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex justify-between items-center">
                <span>{category.name}</span>
                <div className="flex space-x-1 rtl:space-x-reverse">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleEditCategory(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteCategory(category)}
                    className="text-destructive hover:text-destructive/90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {category.description || 'لا يوجد وصف'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">فئات المعاملات المالية</h1>
        <Button onClick={handleAddCategory} variant="default">
          <PlusCircle className="h-4 w-4 ml-2" />
          إضافة فئة جديدة
        </Button>
      </div>
      
      <Tabs 
        defaultValue="income" 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as 'income' | 'expense')}
        className="space-y-4"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="income">فئات الإيرادات</TabsTrigger>
          <TabsTrigger value="expense">فئات المصروفات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="income" className="space-y-4">
          {renderCategories(incomeCategories, isLoadingIncome)}
        </TabsContent>
        
        <TabsContent value="expense" className="space-y-4">
          {renderCategories(expenseCategories, isLoadingExpense)}
        </TabsContent>
      </Tabs>
      
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد حذف الفئة</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك في حذف هذه الفئة؟<br />
              لا يمكنك حذف الفئة إذا كانت هناك معاملات مرتبطة بها.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteCategory}
            >
              تأكيد الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesPage;
