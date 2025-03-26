
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash } from 'lucide-react';
import DataTableWithLoading from '@/components/ui/DataTableWithLoading';
import { Transaction } from '@/services/financial/FinancialService';
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
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import FinancialService from '@/services/financial/FinancialService';

interface TransactionListProps {
  transactions: Transaction[];
  loading: boolean;
  onDelete?: (id: string) => void;
  hideActions?: boolean;
}

const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  loading, 
  onDelete,
  hideActions = false
}) => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  
  const financialService = FinancialService.getInstance();
  
  const handleEdit = (id: string) => {
    navigate(`/financial/transactions/edit/${id}`);
  };
  
  const handleDelete = (id: string) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    
    try {
      const success = await financialService.deleteTransaction(transactionToDelete);
      
      if (success) {
        toast.success('تم حذف المعاملة بنجاح');
        if (onDelete) {
          onDelete(transactionToDelete);
        }
      } else {
        toast.error('حدث خطأ أثناء حذف المعاملة');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('حدث خطأ أثناء حذف المعاملة');
    }
    
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP'
    }).format(amount);
  };
  
  const columns = [
    {
      key: 'date',
      title: 'التاريخ',
      render: (value: string) => format(new Date(value), 'yyyy-MM-dd')
    },
    {
      key: 'category_name',
      title: 'الفئة'
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
      key: 'payment_method',
      title: 'طريقة الدفع',
      render: (value: string) => {
        switch(value) {
          case 'cash': return 'نقدي';
          case 'bank': return 'بنك';
          case 'other': return 'أخرى';
          default: return value;
        }
      }
    },
    {
      key: 'amount',
      title: 'المبلغ',
      render: (value: number) => formatAmount(value)
    },
    {
      key: 'notes',
      title: 'ملاحظات'
    }
  ];
  
  return (
    <>
      <DataTableWithLoading
        columns={columns}
        data={transactions}
        isLoading={loading}
        searchable={true}
        searchKeys={['category_name', 'notes']}
        actions={hideActions ? undefined : (record) => (
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
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذه المعاملة بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TransactionList;
