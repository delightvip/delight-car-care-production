
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, ArrowLeftRight } from 'lucide-react';
import CashManagementService from '@/services/financial/CashManagementService';
import { CashOperation } from '@/integrations/supabase/types-custom';

export const RecentCashOperations: React.FC = () => {
  const cashManagementService = CashManagementService.getInstance();
  
  const { data: cashOperations, isLoading } = useQuery<CashOperation[]>({
    queryKey: ['cash-operations'],
    queryFn: () => cashManagementService.getRecentCashOperations(),
  });

  const getOperationIcon = (operationType: string) => {
    switch (operationType) {
      case 'deposit':
        return <ArrowDown className="h-4 w-4 text-green-500" />;
      case 'withdraw':
        return <ArrowUp className="h-4 w-4 text-red-500" />;
      case 'transfer':
        return <ArrowLeftRight className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getOperationTitle = (operationType: string) => {
    switch (operationType) {
      case 'deposit':
        return 'إيداع';
      case 'withdraw':
        return 'سحب';
      case 'transfer':
        return 'تحويل';
      default:
        return operationType;
    }
  };

  const getOperationDescription = (operation: any) => {
    switch (operation.operation_type) {
      case 'deposit':
        return `إيداع في ${operation.account_type === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'}`;
      case 'withdraw':
        return `سحب من ${operation.account_type === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'}`;
      case 'transfer':
        return `تحويل من ${operation.from_account === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'} إلى ${operation.to_account === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'}`;
      default:
        return operation.notes || '';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>تاريخ العملية</TableHead>
            <TableHead>نوع العملية</TableHead>
            <TableHead>الوصف</TableHead>
            <TableHead>المبلغ</TableHead>
            <TableHead>المرجع</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cashOperations && cashOperations.length > 0 ? (
            cashOperations.map((operation) => (
              <TableRow key={operation.id}>
                <TableCell>
                  {format(new Date(operation.date), 'yyyy-MM-dd', { locale: ar })}
                </TableCell>
                <TableCell>
                  <Badge variant={
                    operation.operation_type === 'deposit' ? 'success' :
                    operation.operation_type === 'withdraw' ? 'destructive' : 'outline'
                  } 
                  className="flex items-center gap-1">
                    {getOperationIcon(operation.operation_type)}
                    {getOperationTitle(operation.operation_type)}
                  </Badge>
                </TableCell>
                <TableCell>{getOperationDescription(operation)}</TableCell>
                <TableCell>{operation.amount.toLocaleString('ar-EG')} ج.م</TableCell>
                <TableCell>{operation.reference || '-'}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                لا توجد عمليات حديثة للخزينة
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
