
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Transaction } from '@/services/financial/FinancialService';
import FinancialService from '@/services/financial/FinancialService';
import DataTableWithLoading from '@/components/ui/DataTableWithLoading';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Edit, Trash } from 'lucide-react';
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

interface FinancialTransactionsListProps {
  startDate?: string;
  endDate?: string;
  type?: 'income' | 'expense';
  categoryId?: string;
  limit?: number;
}

const FinancialTransactionsList: React.FC<FinancialTransactionsListProps> = ({
  startDate,
  endDate,
  type,
  categoryId,
  limit
}) => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  
  const financialService = FinancialService.getInstance();
  
  useEffect(() => {
    loadTransactions();
  }, [startDate, endDate, type, categoryId, limit]);
  
  const loadTransactions = async () => {
    setLoading(true);
    const data = await financialService.getTransactions(startDate, endDate, type, categoryId);
    
    // Apply limit if specified
    const limitedData = limit ? data.slice(0, limit) : data;
    setTransactions(limitedData);
    setLoading(false);
  };
  
  const handleEdit = (id: string) => {
    navigate(`/financial/transactions/edit/${id}`);
  };
  
  const handleDelete = (id: string) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    
    const success = await financialService.deleteTransaction(transactionToDelete);
    if (success) {
      loadTransactions();
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
      key: 'type',
      title: 'النوع',
      render: (value: 'income' | 'expense') => (
        <Badge variant={value === 'income' ? 'success' : 'destructive'}>
          {value === 'income' ? 'إيراد' : 'مصروف'}
        </Badge>
      )
    },
    {
      key: 'category_name',
      title: 'الفئة'
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

export default FinancialTransactionsList;
