import React from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Return } from '@/types/returns';

interface ReturnTableProps {
  returns: Return[];
  onViewDetails: (id: string) => void;
  onConfirm: (id: string) => void;
  onCancel: (id: string, action?: string) => void;
  isProcessing: boolean;
}

export const ReturnTable: React.FC<ReturnTableProps> = ({
  returns,
  onViewDetails,
  onConfirm,
  onCancel,
  isProcessing
}) => {
  // Helper for colored status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/90 text-white hover:bg-green-600">مؤكد</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/90 text-white hover:bg-red-600">ملغي</Badge>;
      default:
        return <Badge className="bg-yellow-400/90 text-white hover:bg-yellow-500 border-0">مسودة</Badge>;
    }
  };

  // Helper for colored row
  const getRowClass = (status: string, idx: number) => {
    let base = idx % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-muted/40 dark:bg-neutral-800/80';
    if (status === 'cancelled') return base + ' opacity-70';
    return base;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b-2 border-muted/40">
          <TableHead className="text-right w-24">التاريخ</TableHead>
          <TableHead className="text-right">النوع</TableHead>
          <TableHead className="text-right">الطرف</TableHead>
          <TableHead className="text-right">المبلغ</TableHead>
          <TableHead className="text-right">الحالة</TableHead>
          <TableHead className="text-right">الإجراءات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {returns.length > 0 ? (
          returns.map((returnItem, idx) => (
            <TableRow key={returnItem.id} className={`group cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors border-b border-muted/30 ${getRowClass(returnItem.payment_status, idx)}`} onClick={() => onViewDetails(returnItem.id)}>
              <TableCell className="text-right font-mono text-xs text-blue-900 dark:text-blue-200">{format(new Date(returnItem.date), 'yyyy-MM-dd')}</TableCell>
              <TableCell className="text-right">
                <Badge variant={returnItem.return_type === 'sales_return' ? 'destructive' : 'default'} className="px-2 py-1 text-xs">
                  {returnItem.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium text-sm">{returnItem.party_name || "غير محدد"}</TableCell>
              <TableCell className="text-right font-bold text-base text-green-700 dark:text-green-300">{returnItem.amount.toFixed(2)}</TableCell>
              <TableCell className="text-right">{getStatusBadge(returnItem.payment_status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex flex-row-reverse gap-1 justify-end items-center" onClick={(e) => e.stopPropagation()}>
                  {/* زر تفاصيل أولاً */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full border border-blue-200 dark:border-blue-700 bg-transparent text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-800 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-150 shadow-none"
                    title="تفاصيل المرتجع"
                    aria-label="عرض تفاصيل المرتجع"
                    onClick={() => onViewDetails(returnItem.id)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <circle cx="12" cy="8" r="1.2" />
                    </svg>
                  </Button>
                  {/* زر تأكيد */}
                  {returnItem.payment_status === 'draft' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700"
                      title="تأكيد المرتجع"
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfirm(returnItem.id);
                      }}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="h-5 w-5" />
                    </Button>
                  )}
                  {/* زر حذف (فقط إذا مسودة) */}
                  {returnItem.payment_status === 'draft' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700"
                      title="حذف المرتجع"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof onCancel === 'function') onCancel(returnItem.id, 'delete');
                      }}
                      disabled={isProcessing}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                  {/* زر إلغاء (فقط إذا مؤكد) */}
                  {returnItem.payment_status === 'confirmed' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700"
                      title="إلغاء المرتجع"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancel(returnItem.id);
                      }}
                      disabled={isProcessing}
                    >
                      <XCircle className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-6">
              لا توجد مرتجعات مسجلة
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
