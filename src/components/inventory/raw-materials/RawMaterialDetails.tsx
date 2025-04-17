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
import { Edit, AlertTriangle, TrendingDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchRelatedProductsByRawMaterialCode } from '@/services/inventory/fetchRelatedProducts';

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
  const minStock = Number(material.min_stock);

  // حالة تحذير إذا الكمية أقل من أو تساوي الحد الأدنى
  const isLowStock = quantity <= minStock;
  // حالة أهمية عالية
  const isHighImportance = material.importance === 2;

  // Fetch related products using react-query
  const {
    data: relatedProducts,
    isLoading: isLoadingRelated,
    error: relatedError
  } = useQuery({
    queryKey: ['relatedProducts', material.code],
    queryFn: () => fetchRelatedProductsByRawMaterialCode(material.code),
    enabled: !!material.code
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
                {material.name}
                {isHighImportance && (
                  <span className="inline-flex items-center text-red-600 text-xs font-semibold ml-2">
                    <AlertTriangle size={16} className="mr-1" />
                    أهمية عالية
                  </span>
                )}
              </DialogTitle>
              <div className="text-xs text-muted-foreground mt-1">كود المادة: <span className="font-mono bg-muted px-2 py-0.5 rounded">{material.code}</span></div>
            </div>
            {isLowStock && (
              <div className="flex items-center bg-yellow-900/30 border border-yellow-700 rounded px-2 py-1 text-yellow-200 text-xs font-semibold">
                <TrendingDown size={16} className="mr-1" />
                مخزون منخفض
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* القيم الأساسية في شبكة بطاقات */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted rounded p-3 flex flex-col items-start">
              <span className="text-xs text-muted-foreground mb-1">الكمية الحالية</span>
              <span className="font-bold text-base">{quantity} <span className="text-xs">{material.unit}</span></span>
            </div>
            <div className="bg-muted rounded p-3 flex flex-col items-start">
              <span className="text-xs text-muted-foreground mb-1">الحد الأدنى</span>
              <span className="font-bold text-base">{minStock} <span className="text-xs">{material.unit}</span></span>
            </div>
            <div className="bg-muted rounded p-3 flex flex-col items-start">
              <span className="text-xs text-muted-foreground mb-1">تكلفة الوحدة</span>
              <span className="font-bold text-base">{unitCost} <span className="text-xs">ج.م</span></span>
            </div>
            <div className="bg-muted rounded p-3 flex flex-col items-start">
              <span className="text-xs text-muted-foreground mb-1">إجمالي القيمة</span>
              <span className="font-bold text-base">{totalValue.toFixed(2)} <span className="text-xs">ج.م</span></span>
            </div>
          </div>

          {/* بيانات إضافية */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">الأهمية</h4>
              <p className="font-medium">
                {material.importance === 0 ? 'منخفضة' : 
                 material.importance === 1 ? 'متوسطة' : 'عالية'}
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">وحدة القياس</h4>
              <p className="font-medium">{material.unit}</p>
            </div>
          </div>
        </div>

        {/* --- Related Products Section --- */}
        <Separator className="my-4" />
        <div>
          <h4 className="text-sm font-semibold mb-2">المنتجات المرتبطة بهذه المادة الخام</h4>
          {isLoadingRelated ? (
            <div className="text-xs text-muted-foreground">جاري التحميل...</div>
          ) : relatedError ? (
            <div className="text-xs text-red-500">حدث خطأ أثناء جلب المنتجات المرتبطة</div>
          ) : (
            <div className="space-y-2">
              {/* Semi-finished products */}
              {relatedProducts?.semiFinished?.length > 0 && (
                <div className="bg-slate-50 border rounded p-2">
                  <div className="font-medium text-xs text-muted-foreground mb-1">منتجات نصف مصنعة:</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="px-2 py-1 text-right">الاسم</th>
                          <th className="px-2 py-1 text-right">الكود</th>
                          <th className="px-2 py-1 text-right">النسبة (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatedProducts.semiFinished.map((prod: any) => (
                          <tr key={prod.id} className="odd:bg-white even:bg-slate-100">
                            <td className="px-2 py-1 font-semibold">{prod.name}</td>
                            <td className="px-2 py-1 font-mono">{prod.code}</td>
                            <td className="px-2 py-1">{prod.percentage !== undefined ? prod.percentage : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* Finished products */}
              {relatedProducts?.finished?.length > 0 && (
                <div className="bg-slate-50 border rounded p-2">
                  <div className="font-medium text-xs text-muted-foreground mb-1">منتجات تامة الصنع:</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="px-2 py-1 text-right">الاسم</th>
                          <th className="px-2 py-1 text-right">الكود</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatedProducts.finished.map((prod: any) => (
                          <tr key={prod.id} className="odd:bg-white even:bg-slate-100">
                            <td className="px-2 py-1 font-semibold">{prod.name}</td>
                            <td className="px-2 py-1 font-mono">{prod.code}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {(!relatedProducts?.semiFinished?.length && !relatedProducts?.finished?.length) && (
                <div className="text-xs text-muted-foreground">لا توجد منتجات مرتبطة بهذه المادة الخام.</div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
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
