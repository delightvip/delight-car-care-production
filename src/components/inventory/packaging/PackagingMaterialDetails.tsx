
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package,
  Truck,
  History,
  MoveVertical
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductMovementHistory } from '@/components/inventory/movement';

interface PackagingMaterialDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  material: any;
}

const PackagingMaterialDetails: React.FC<PackagingMaterialDetailsProps> = ({
  isOpen,
  onClose,
  material
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تفاصيل مستلزم التعبئة</DialogTitle>
          <DialogDescription>
            معلومات مفصلة عن {material.name}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span>معلومات أساسية</span>
            </TabsTrigger>
            <TabsTrigger value="movements" className="flex items-center gap-2">
              <MoveVertical className="h-4 w-4" />
              <span>حركة المخزون</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span>سجل الاستخدام</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-6 p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">معلومات أساسية</h3>
                  <Separator className="my-2" />
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">الاسم</dt>
                      <dd className="font-medium">{material.name}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">الكود</dt>
                      <dd className="font-medium">{material.code}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">المخزون الحالي</dt>
                      <dd className="font-medium">
                        {material.quantity < material.min_stock ? (
                          <Badge variant="destructive">{material.quantity} {material.unit}</Badge>
                        ) : (
                          <span>{material.quantity} {material.unit}</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">الحد الأدنى</dt>
                      <dd className="font-medium">{material.min_stock} {material.unit}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">تكلفة الوحدة</dt>
                      <dd className="font-medium">{material.unit_cost} ج.م</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">إجمالي القيمة</dt>
                      <dd className="font-medium">{(material.quantity * material.unit_cost).toFixed(2)} ج.م</dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">إحصائيات المخزون</h3>
                  <Separator className="my-2" />
                  <div className="h-[200px] flex items-center justify-center bg-muted/20 rounded-md">
                    {material.quantity < material.min_stock ? (
                      <div className="text-center">
                        <Badge variant="destructive" className="mb-2">تنبيه</Badge>
                        <p className="text-sm text-muted-foreground">الكمية أقل من الحد الأدنى للمخزون</p>
                        <p className="text-sm font-medium">يجب إعادة الطلب قريباً</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Badge variant="outline" className="mb-2 bg-green-50 text-green-700 border-green-200">
                          المخزون جيد
                        </Badge>
                        <p className="text-sm text-muted-foreground">الكمية أعلى من الحد الأدنى للمخزون</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="movements" className="space-y-4">
            <h3 className="text-lg font-medium">سجل حركة المخزون</h3>
            <ProductMovementHistory itemId={material.id.toString()} itemType="packaging" />
          </TabsContent>
          
          <TabsContent value="usage" className="space-y-4">
            <h3 className="text-lg font-medium">سجل استخدام المستلزم</h3>
            <div className="border rounded-md p-8 text-center">
              <p className="text-muted-foreground">سجل الاستخدام غير متاح حالياً</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PackagingMaterialDetails;
