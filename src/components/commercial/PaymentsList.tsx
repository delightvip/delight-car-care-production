
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Receipt, 
  Search, 
  FileDown,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Payment } from '@/services/CommercialService';
import PaymentStatusBadge from './PaymentStatusBadge';

interface PaymentsListProps {
  payments: Payment[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onEditClick: (payment: Payment) => void;
  onDeleteClick: (payment: Payment) => void;
  onConfirmClick: (payment: Payment) => void;
  onCancelClick: (payment: Payment) => void;
  activeTab: string;
}

const PaymentsList = ({ 
  payments, 
  searchQuery, 
  onSearchChange, 
  onEditClick, 
  onDeleteClick,
  onConfirmClick,
  onCancelClick,
  activeTab 
}: PaymentsListProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">
          {activeTab === 'all' ? 'جميع المعاملات' :
           activeTab === 'collection' ? 'معاملات التحصيل' : 'معاملات الدفع'}
        </CardTitle>
        <div className="flex items-center space-x-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في المعاملات..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <FileDown className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">الرقم</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الطرف</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>الطريقة</TableHead>
              <TableHead className="text-right">المبلغ</TableHead>
              <TableHead>حالة المعاملة</TableHead>
              <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length > 0 ? (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.payment_type === 'collection' ? 'default' : 'secondary'}>
                      {payment.payment_type === 'collection' ? 'تحصيل' : 'دفع'}
                    </Badge>
                  </TableCell>
                  <TableCell>{payment.party_name}</TableCell>
                  <TableCell>
                    {format(new Date(payment.date), 'yyyy-MM-dd')}
                  </TableCell>
                  <TableCell>
                    {payment.method === 'cash' && 'نقدي'}
                    {payment.method === 'check' && 'شيك'}
                    {payment.method === 'bank_transfer' && 'تحويل بنكي'}
                    {payment.method === 'other' && 'أخرى'}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={payment.payment_status as any} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">فتح القائمة</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {payment.payment_status === 'draft' && (
                          <>
                            <DropdownMenuItem onClick={() => onEditClick(payment)}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>تعديل</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onConfirmClick(payment)}>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                              <span>تأكيد المعاملة</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDeleteClick(payment)}>
                              <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                              <span>حذف</span>
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        {payment.payment_status === 'confirmed' && (
                          <DropdownMenuItem onClick={() => onCancelClick(payment)}>
                            <XCircle className="mr-2 h-4 w-4 text-red-500" />
                            <span>إلغاء المعاملة</span>
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem>
                          <Receipt className="mr-2 h-4 w-4" />
                          <span>طباعة الإيصال</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                  لا توجد معاملات للعرض
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PaymentsList;
