
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

interface SemiFinishedDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onEdit?: () => void;
}

const SemiFinishedDetails: React.FC<SemiFinishedDetailsProps> = ({
  isOpen,
  onClose,
  product,
  onEdit
}) => {
  // Ensure numeric values
  const quantity = Number(product.quantity);
  const unitCost = Number(product.unit_cost);
  const totalValue = quantity * unitCost;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تفاصيل المنتج النصف مصنع</DialogTitle>
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
              <h4 className="text-sm font-medium text-muted-foreground">إجمالي القيمة</h4>
              <p className="font-medium">{totalValue.toFixed(2)} ج.م</p>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">المكونات</h4>
            {product.ingredients && product.ingredients.length > 0 ? (
              <div className="space-y-2">
                {product.ingredients.map((ingredient: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 border rounded-md">
                    <span>{ingredient.name}</span>
                    <span className="text-muted-foreground">{ingredient.percentage}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">لا توجد مكونات</p>
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

export default SemiFinishedDetails;
