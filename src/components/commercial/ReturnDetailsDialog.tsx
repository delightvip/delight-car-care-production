
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Return } from '@/services/CommercialService';
import { useQuery } from '@tanstack/react-query';
import CommercialService from '@/services/CommercialService';

interface ReturnDetailsDialogProps {
  returnData: Return;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReturnDetailsDialog({ returnData, open, onOpenChange }: ReturnDetailsDialogProps) {
  const { data: linkedInvoice } = useQuery({
    queryKey: ['invoice', returnData.invoice_id],
    queryFn: () => returnData.invoice_id ? CommercialService.getInstance().getInvoiceById(returnData.invoice_id) : null,
    enabled: !!returnData.invoice_id,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>تفاصيل المرتجع</DialogTitle>
          <DialogDescription>
            معلومات كاملة عن المرتجع وبنوده
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">معلومات أساسية</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">رقم المرتجع:</dt>
                  <dd>{returnData.id?.substring(0, 12)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">النوع:</dt>
                  <dd>
                    <Badge variant={returnData.return_type === 'sales_return' ? 'destructive' : 'default'}>
                      {returnData.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">المبلغ:</dt>
                  <dd>{returnData.amount.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">التاريخ:</dt>
                  <dd>{format(new Date(returnData.date), 'yyyy-MM-dd')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">تاريخ الإنشاء:</dt>
                  <dd>{returnData.created_at ? format(new Date(returnData.created_at), 'yyyy-MM-dd HH:mm') : '-'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {returnData.invoice_id && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">معلومات الفاتورة المرتبطة</CardTitle>
              </CardHeader>
              <CardContent>
                {linkedInvoice ? (
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="font-medium text-muted-foreground">رقم الفاتورة:</dt>
                      <dd>{linkedInvoice.id.substring(0, 12)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium text-muted-foreground">نوع الفاتورة:</dt>
                      <dd>
                        <Badge variant={linkedInvoice.invoice_type === 'sale' ? 'default' : 'outline'}>
                          {linkedInvoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'}
                        </Badge>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium text-muted-foreground">العميل/المورد:</dt>
                      <dd>{linkedInvoice.party_name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium text-muted-foreground">تاريخ الفاتورة:</dt>
                      <dd>{format(new Date(linkedInvoice.date), 'yyyy-MM-dd')}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium text-muted-foreground">إجمالي الفاتورة:</dt>
                      <dd>{linkedInvoice.total_amount.toFixed(2)}</dd>
                    </div>
                  </dl>
                ) : (
                  <div className="text-muted-foreground text-center py-4">
                    جاري تحميل بيانات الفاتورة...
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {returnData.notes && (
          <div className="mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">ملاحظات</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{returnData.notes}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {returnData.items && returnData.items.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">الأصناف المرتجعة</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>سعر الوحدة</TableHead>
                  <TableHead className="text-left">الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnData.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit_price.toFixed(2)}</TableCell>
                    <TableCell className="text-left">
                      {(item.quantity * item.unit_price).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell colSpan={3} className="text-left font-bold">
                    الإجمالي
                  </TableCell>
                  <TableCell className="text-left font-bold">
                    {returnData.amount.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
