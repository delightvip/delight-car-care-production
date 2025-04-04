
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

interface RawMaterialDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  material: any;
  onEdit?: () => void;
}

const RawMaterialDetails: React.FC<RawMaterialDetailsProps> = ({
  isOpen,
  onClose,
  material,
  onEdit
}) => {
  // Ensure numeric values
  const quantity = Number(material.quantity);
  const unitCost = Number(material.unit_cost);
  const totalValue = quantity * unitCost;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تفاصيل المادة الخام</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">الكود</h4>
              <p className="font-medium">{material.code}</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">الاسم</h4>
              <p className="font-medium">{material.name}</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">الكمية الحالية</h4>
              <p className="font-medium">
                {quantity} {material.unit}
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">الحد الأدنى</h4>
              <p className="font-medium">
                {material.min_stock} {material.unit}
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
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">الأهمية</h4>
              <p className="font-medium">
                {material.importance === 0 ? 'منخفضة' : 
                 material.importance === 1 ? 'متوسطة' : 'عالية'}
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">وحدة القياس</h4>
              <p className="font-medium">{material.unit}</p>
            </div>
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

export default RawMaterialDetails;
