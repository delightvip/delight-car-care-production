
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Transaction } from '@/services/financial/FinancialTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash, Eye } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FinancialService from '@/services/financial/FinancialService';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
  onDelete?: () => void;
  showViewLink?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  loading = false,
  onDelete,
  showViewLink = true,
  allowEdit = true,
  allowDelete = true
}) => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const financialService = FinancialService.getInstance();
  
  // تنسيق المبلغ
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP'
    }).format(amount);
  };
  
  // فتح حوار تفاصيل المعاملة
  const handleView = (transaction: Transaction) => {
    setViewTransaction(transaction);
    setViewDialogOpen(true);
  };
  
  // فتح صفحة تعديل المعاملة
  const handleEdit = (id: string) => {
    navigate(`/financial/transactions/edit/${id}`);
  };
  
  // فتح حوار حذف المعاملة
  const handleDelete = (id: string) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  // تأكيد حذف المعاملة
  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    
    const success = await financialService.deleteTransaction(transactionToDelete);
    
    if (success) {
      toast.success('تم حذف المعاملة المالية بنجاح');
      if (onDelete) {
        onDelete();
      }
    }
    
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };
  
  // تصفية المعاملات بناءً على مصطلح البحث
  const filteredTransactions = transactions.filter(transaction => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      transaction.category_name?.toLowerCase().includes(searchTermLower) ||
      transaction.notes?.toLowerCase().includes(searchTermLower) ||
      formatAmount(transaction.amount).includes(searchTerm)
    );
  });
  
  // تحديد ما إذا كانت المعاملة مرتبطة بمعاملة تجارية
  const isLinkedToCommercial = (transaction: Transaction) => {
    return transaction.reference_id && transaction.reference_type;
  };
  
  return (
    <div className="space-y-4">
      {/* مربع البحث */}
      <div>
        <Input
          placeholder="البحث في المعاملات..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      
      {/* جدول المعاملات */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">التاريخ</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الفئة</TableHead>
              <TableHead>طريقة الدفع</TableHead>
              <TableHead className="text-right">المبلغ</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // حالة التحميل
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                </TableRow>
              ))
            ) : filteredTransactions.length > 0 ? (
              // عرض المعاملات
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    {format(new Date(transaction.date), 'yyyy-MM-dd')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === 'income' ? 'success' : 'destructive'}>
                      {transaction.type === 'income' ? 'إيراد' : 'مصروف'}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.category_name}</TableCell>
                  <TableCell>
                    {transaction.payment_method === 'cash' && 'نقدي'}
                    {transaction.payment_method === 'bank' && 'بنكي'}
                    {transaction.payment_method === 'other' && 'أخرى'}
                    {isLinkedToCommercial(transaction) && (
                      <Badge variant="outline" className="mr-2">مرتبطة</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAmount(transaction.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2 space-x-reverse">
                      {showViewLink && (
                        <Button variant="ghost" size="icon" onClick={() => handleView(transaction)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {allowEdit && (
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(transaction.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {allowDelete && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(transaction.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              // لا توجد معاملات
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {searchTerm ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد معاملات مالية'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* حوار تأكيد الحذف */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذه المعاملة المالية بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* حوار عرض تفاصيل المعاملة */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تفاصيل المعاملة المالية</DialogTitle>
            <DialogDescription>
              عرض كامل لمعلومات المعاملة المالية
            </DialogDescription>
          </DialogHeader>
          
          {viewTransaction && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">التاريخ</h4>
                  <p>{format(new Date(viewTransaction.date), 'yyyy-MM-dd')}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">النوع</h4>
                  <Badge variant={viewTransaction.type === 'income' ? 'success' : 'destructive'}>
                    {viewTransaction.type === 'income' ? 'إيراد' : 'مصروف'}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">الفئة</h4>
                  <p>{viewTransaction.category_name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">طريقة الدفع</h4>
                  <p>
                    {viewTransaction.payment_method === 'cash' && 'نقدي'}
                    {viewTransaction.payment_method === 'bank' && 'بنكي'}
                    {viewTransaction.payment_method === 'other' && 'أخرى'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">المبلغ</h4>
                  <p className="font-bold">{formatAmount(viewTransaction.amount)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">تاريخ الإنشاء</h4>
                  <p>{viewTransaction.created_at ? format(new Date(viewTransaction.created_at), 'yyyy-MM-dd') : '-'}</p>
                </div>
              </div>
              
              {viewTransaction.notes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">ملاحظات</h4>
                  <p className="mt-1 text-sm">{viewTransaction.notes}</p>
                </div>
              )}
              
              {isLinkedToCommercial(viewTransaction) && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">معلومات الارتباط</h4>
                  <div className="mt-1 p-2 bg-muted rounded-sm text-sm">
                    <p>مرتبطة بمعاملة تجارية من نوع: {viewTransaction.reference_type}</p>
                    <p>معرف المعاملة التجارية: {viewTransaction.reference_id}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setViewDialogOpen(false)}
            >
              إغلاق
            </Button>
            {allowEdit && viewTransaction && (
              <Button onClick={() => {
                setViewDialogOpen(false);
                handleEdit(viewTransaction.id);
              }}>
                تعديل
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionList;
