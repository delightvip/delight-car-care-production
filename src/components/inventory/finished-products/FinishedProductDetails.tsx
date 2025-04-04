
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Edit } from 'lucide-react';
import { ensureNumericValue, formatCurrency } from '../common/InventoryDataFormatter';

interface FinishedProductDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onEdit?: () => void;
}

const FinishedProductDetails: React.FC<FinishedProductDetailsProps> = ({
  isOpen,
  onClose,
  product,
  onEdit
}) => {
  // Ensure numeric values
  const quantity = ensureNumericValue(product.quantity);
  const unitCost = ensureNumericValue(product.unit_cost);
  const totalValue = quantity * unitCost;
  const salesPrice = ensureNumericValue(product.sales_price);
  const minStock = ensureNumericValue(product.min_stock);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تفاصيل المنتج النهائي</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">الكود</h4>
              <p className="font-medium">{product.code}</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">الاسم</h4>
              <p className="font-medium">{product.name}</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">الكمية الحالية</h4>
              <p className="font-medium">
                {quantity} {product.unit}
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">الحد الأدنى</h4>
              <p className="font-medium">
                {minStock} {product.unit}
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">تكلفة الوحدة</h4>
              <p className="font-medium">{formatCurrency(unitCost)}</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">سعر البيع</h4>
              <p className="font-medium">{salesPrice > 0 ? formatCurrency(salesPrice) : 'غير محدد'}</p>
            </div>
          </div>
          
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">إجمالي القيمة</h4>
            <p className="font-medium">{formatCurrency(totalValue)}</p>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">المنتج النصف مصنع</h4>
            <p className="font-medium">{product.semi_finished?.name || '-'}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">مواد التعبئة</h4>
            {product.packaging && product.packaging.length > 0 ? (
              <div className="space-y-2">
                {product.packaging.map((pkg: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 border rounded-md">
                    <span>{pkg.name}</span>
                    <span className="text-muted-foreground">الكمية: {ensureNumericValue(pkg.quantity)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">لا توجد مواد تعبئة</p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          {onEdit && (
            <Button variant="outline" onClick={onEdit} className="gap-2">
              <Edit size={16} />
              تعديل
            </Button>
          )}
          <Button onClick={onClose}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinishedProductDetails;
