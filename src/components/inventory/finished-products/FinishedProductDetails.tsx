
import React, { useMemo } from 'react';
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
import { 
  ensureNumericValue, 
  formatCurrency, 
  calculateFinishedProductCost 
} from '../common/InventoryDataFormatter';

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
}) => {  // Calculate the unit cost automatically based on components
  const unitCost = useMemo(() => {
    // Check if we have the necessary data to calculate cost
    if (product.semi_finished && product.packaging) {
      // استخدام كمية المنتج النصف مصنع المطلوبة لكل وحدة
      const semiFinishedQty = ensureNumericValue(product.semi_finished_quantity || 1);
      
      return calculateFinishedProductCost(
        product.semi_finished,
        product.packaging,
        semiFinishedQty // استخدام الكمية الفعلية من المنتج النصف مصنع
      );
    }
    
    // Fall back to the stored unit cost if we can't calculate
    return ensureNumericValue(product.unit_cost);
  }, [product]);
  
  // Ensure numeric values
  const quantity = ensureNumericValue(product.quantity);
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
            <h4 className="text-sm font-medium text-muted-foreground mb-2">تفاصيل تكلفة المنتج</h4>
            
            {/* تكلفة المنتج النصف مصنع */}
            <div className="mb-4">
              <div className="font-medium mb-1">المنتج النصف مصنع:</div>
              {product.semi_finished ? (
                <div className="p-2 border rounded-md space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{product.semi_finished.name}</span>
                    <span className="text-muted-foreground">الكمية: {ensureNumericValue(product.semi_finished_quantity)} لكل وحدة</span>
                  </div>
                  
                  {(() => {
                    const semiFinishedCost = ensureNumericValue(product.semi_finished.unit_cost);
                    const semiFinishedQty = ensureNumericValue(product.semi_finished_quantity);
                    const semiFinishedTotalCost = semiFinishedCost * semiFinishedQty;
                    const contributionPercent = (semiFinishedTotalCost / unitCost) * 100;
                    
                    return (
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t text-sm">
                        <div>
                          <span className="text-muted-foreground">تكلفة الوحدة: </span>
                          <span>{formatCurrency(semiFinishedCost)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">إجمالي التكلفة: </span>
                          <span>{formatCurrency(semiFinishedTotalCost)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">نسبة المساهمة: </span>
                          <span className="font-medium">{contributionPercent.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-muted-foreground">لا يوجد منتج نصف مصنع</p>
              )}
            </div>
            
            {/* تكلفة مواد التعبئة */}
            <div>
              <div className="font-medium mb-1">مواد التعبئة:</div>
              {product.packaging && product.packaging.length > 0 ? (
                <div className="space-y-2">
                  {product.packaging.map((pkg: any, index: number) => {
                    const materialCost = ensureNumericValue(pkg.packaging_material?.unit_cost || pkg.unit_cost);
                    const materialQty = ensureNumericValue(pkg.quantity);
                    const materialTotalCost = materialCost * materialQty;
                    const contributionPercent = (materialTotalCost / unitCost) * 100;
                    
                    return (
                      <div key={index} className="p-2 border rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{pkg.name}</span>
                          <span className="text-muted-foreground">الكمية: {materialQty}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t text-sm">
                          <div>
                            <span className="text-muted-foreground">تكلفة الوحدة: </span>
                            <span>{formatCurrency(materialCost)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">إجمالي التكلفة: </span>
                            <span>{formatCurrency(materialTotalCost)}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">نسبة المساهمة: </span>
                            <span className="font-medium">{contributionPercent.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">لا توجد مواد تعبئة</p>
              )}
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

export default FinishedProductDetails;
