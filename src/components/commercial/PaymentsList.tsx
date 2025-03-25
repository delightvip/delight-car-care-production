
import React from 'react';
import { Payment } from '@/services/CommercialService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, FileDown, Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface PaymentsListProps {
  payments: Payment[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onEditClick: (payment: Payment) => void;
  onDeleteClick: (payment: Payment) => void;
  activeTab: string;
}

const PaymentsList = ({ 
  payments, 
  searchQuery, 
  onSearchChange, 
  onEditClick, 
  onDeleteClick,
  activeTab
}: PaymentsListProps) => {
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">
          {activeTab === 'all' ? 'جميع المعاملات' :
           activeTab === 'collection' ? 'التحصيلات' : 'المدفوعات'}
        </CardTitle>
        <div className="flex items-center space-x-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في المعاملات..."
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
              <TableHead>رقم المعاملة</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الطرف</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead className="text-left">المبلغ</TableHead>
              <TableHead>طريقة الدفع</TableHead>
              <TableHead>ملاحظات</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length > 0 ? (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.id?.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.payment_type === 'collection' ? 'default' : 'destructive'}>
                      {payment.payment_type === 'collection' ? 'تحصيل' : 'دفع'}
                    </Badge>
                  </TableCell>
                  <TableCell>{payment.party_name}</TableCell>
                  <TableCell>
                    {format(new Date(payment.date), 'yyyy-MM-dd')}
                  </TableCell>
                  <TableCell className="text-left font-medium">
                    {payment.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {payment.method === 'cash' ? 'نقدي' : 
                     payment.method === 'check' ? 'شيك' : 
                     payment.method === 'bank_transfer' ? 'تحويل بنكي' : 'أخرى'}
                  </TableCell>
                  <TableCell>{payment.notes || '-'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditClick(payment)}
                        title="تعديل"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteClick(payment)}
                        title="حذف"
                        className="text-red-500 hover:text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
