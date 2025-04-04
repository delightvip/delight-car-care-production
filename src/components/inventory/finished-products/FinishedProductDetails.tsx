
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
  const quantity = Number(product.quantity);
  const unitCost = Number(product.unit_cost);
  const totalValue = quantity * unitCost;
  const salesPrice = Number(product.sales_price || 0);

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
                {product.min_stock} {product.unit}
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">تكلفة الوحدة</h4>
              <p className="font-medium">{unitCost} ج.م</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">سعر البيع</h4>
              <p className="font-medium">{salesPrice} ج.م</p>
            </div>
          </div>
          
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">إجمالي القيمة</h4>
            <p className="font-medium">{totalValue.toFixed(2)} ج.م</p>
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
                    <span className="text-muted-foreground">الكمية: {pkg.quantity}</span>
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
