
import React from 'react';
import { InvoiceItem } from '@/services/CommercialTypes';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface InvoiceItemsTableProps {
  items: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'>[];
  onRemoveItem: (index: number) => void;
  total: number;
}

const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({ items, onRemoveItem, total }) => {
  const getCategoryTranslation = (category: string) => {
    switch (category) {
      case 'raw_materials':
        return 'المواد الخام';
      case 'packaging_materials':
        return 'مواد التعبئة';
      case 'semi_finished_products':
        return 'المنتجات نصف المصنعة';
      case 'finished_products':
        return 'المنتجات النهائية';
      default:
        return '';
    }
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>المنتج</TableHead>
            <TableHead>الفئة</TableHead>
            <TableHead className="text-center">الكمية</TableHead>
            <TableHead className="text-center">السعر</TableHead>
            <TableHead className="text-right">المجموع</TableHead>
            <TableHead className="text-center w-[80px]">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length > 0 ? (
            items.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{item.item_name}</TableCell>
                <TableCell>{getCategoryTranslation(item.item_type)}</TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-center">{Number(item.unit_price).toFixed(2)}</TableCell>
                <TableCell className="text-right font-medium">
                  {Number(item.quantity * item.unit_price).toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onRemoveItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                لم يتم إضافة عناصر بعد
              </TableCell>
            </TableRow>
          )}
          
          {items.length > 0 && (
            <TableRow className="bg-muted/50">
              <TableCell colSpan={5} className="text-right font-bold">
                المجموع الكلي
              </TableCell>
              <TableCell className="text-right font-bold">
                {total.toFixed(2)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default InvoiceItemsTable;
