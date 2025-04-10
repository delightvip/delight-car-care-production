
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PackagingMaterial } from '@/services/InventoryService';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { rpcFunctions } from '@/integrations/supabase/client';
import ImportanceBadge from '@/components/inventory/low-stock/ImportanceBadge';

interface PackagingMaterialDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  material: PackagingMaterial;
}

const PackagingMaterialDetails: React.FC<PackagingMaterialDetailsProps> = ({
  isOpen,
  onClose,
  material,
}) => {
  // جلب حركات المخزون للمادة
  const { data: movements } = useQuery({
    queryKey: ['packagingMaterialMovements', material.id],
    queryFn: () => rpcFunctions.getInventoryMovementsByItem(material.id.toString(), 'packaging'),
    enabled: isOpen
  });

  // حساب إجمالي القيمة
  const totalValue = material.quantity * material.unit_cost;

  // تحديد حالة المخزون
  const stockStatus = material.quantity < material.min_stock
    ? { label: 'منخفض', color: 'text-red-500' }
    : { label: 'متوفر', color: 'text-green-500' };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>تفاصيل مادة التعبئة: {material.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4">
          <Card className="p-4">
            <h3 className="text-lg font-medium mb-3">المعلومات الأساسية</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">الرمز</div>
                <div className="font-medium">{material.code}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">الاسم</div>
                <div className="font-medium">{material.name}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">وحدة القياس</div>
                <div className="font-medium">{material.unit}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">الأهمية</div>
                <div className="font-medium">
                  <ImportanceBadge importance={material.importance || 0} />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-lg font-medium mb-3">معلومات المخزون</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">الكمية الحالية</div>
                <div className="font-medium">{material.quantity} {material.unit}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">الحد الأدنى</div>
                <div className="font-medium">{material.min_stock} {material.unit}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">حالة المخزون</div>
                <div className={`font-medium ${stockStatus.color}`}>{stockStatus.label}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">نسبة المخزون</div>
                <div className="font-medium">
                  {material.min_stock > 0 
                    ? `${Math.round((material.quantity / material.min_stock) * 100)}%` 
                    : 'غير محدد'}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-lg font-medium mb-3">معلومات التكلفة</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">تكلفة الوحدة</div>
                <div className="font-medium">{material.unit_cost}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">إجمالي القيمة</div>
                <div className="font-medium">{totalValue.toFixed(2)}</div>
              </div>
            </div>
          </Card>

          {movements && movements.data && movements.data.length > 0 && (
            <Card className="p-4">
              <h3 className="text-lg font-medium mb-3">آخر حركات المخزون</h3>
              <div className="space-y-2">
                {movements.data.slice(0, 3).map((movement: any) => (
                  <div key={movement.id} className="border-b pb-2 last:border-0">
                    <div className="flex justify-between">
                      <span className={movement.quantity > 0 ? 'text-green-500' : 'text-red-500'}>
                        {movement.quantity > 0 ? 'إضافة' : 'سحب'} {Math.abs(movement.quantity)} {material.unit}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {new Date(movement.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <div className="text-sm mt-1">
                      {movement.reason || 'لا يوجد سبب'}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PackagingMaterialDetails;
