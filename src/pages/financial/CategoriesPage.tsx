
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FinancialService, { Category } from '@/services/financial/FinancialService';
import DataTableWithLoading from '@/components/ui/DataTableWithLoading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, Plus, Trash } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  
  const financialService = FinancialService.getInstance();
  
  useEffect(() => {
    loadCategories();
  }, []);
  
  const loadCategories = async () => {
    setLoading(true);
    const data = await financialService.getCategories();
    setCategories(data);
    setLoading(false);
  };
  
  const handleEdit = (id: string) => {
    navigate(`/financial/categories/edit/${id}`);
  };
  
  const handleDelete = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    
    const success = await financialService.deleteCategory(categoryToDelete);
    if (success) {
      loadCategories();
    }
    
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };
  
  const columns = [
    {
      key: 'name',
      title: 'اسم الفئة',
    },
    {
      key: 'type',
      title: 'النوع',
      render: (value: 'income' | 'expense') => (
        <Badge variant={value === 'income' ? 'success' : 'destructive'}>
          {value === 'income' ? 'إيراد' : 'مصروف'}
        </Badge>
      )
    },
    {
      key: 'description',
      title: 'الوصف',
    }
  ];
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => navigate('/financial')}>
          <ArrowLeft className="h-4 w-4 ml-2" />
          العودة للوحة التحكم
        </Button>
        
        <Button onClick={() => navigate('/financial/categories/new')}>
          <Plus className="h-4 w-4 ml-2" />
          فئة جديدة
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>فئات المعاملات المالية</CardTitle>
          <CardDescription>
            إدارة فئات الإيرادات والمصروفات في النظام المالي
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTableWithLoading
            columns={columns}
            data={categories}
            isLoading={loading}
            searchable={true}
            searchKeys={['name', 'description']}
            actions={(record) => (
              <div className="flex space-x-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(record.id)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذه الفئة بشكل نهائي. لا يمكنك حذف الفئات المستخدمة في معاملات موجودة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoriesPage;
