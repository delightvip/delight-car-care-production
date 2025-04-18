import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import InventoryService, { PackagingMaterial } from '@/services/InventoryService';
import ProductionDatabaseService from '@/services/database/ProductionDatabaseService';

/**
 * لوحة متابعة مستلزمات التعبئة: عرض الكميات، الفجوات، تنبيهات المخزون.
 */
export const PackagingPanel: React.FC = () => {
  const [materials, setMaterials] = useState<PackagingMaterial[]>([]);
  const [required, setRequired] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const inventoryService = InventoryService.getInstance();
        const dbService = ProductionDatabaseService.getInstance();
        // جلب مواد التعبئة الفعلية
        const packagingMaterials = await inventoryService.getPackagingMaterials();
        // جلب أوامر التعبئة
        const packagingOrders = await dbService.getPackagingOrders();
        // حساب الكميات المطلوبة لكل مادة تعبئة
        const reqMap: Record<string, number> = {};
        packagingOrders.forEach(order => {
          order.packagingMaterials.forEach(mat => {
            reqMap[mat.code] = (reqMap[mat.code] || 0) + mat.quantity;
          });
        });
        setMaterials(packagingMaterials);
        setRequired(reqMap);
      } catch (e: any) {
        setError('حدث خطأ في جلب البيانات');
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-4">جاري التحميل...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <Card className="mb-6 component-bg">
      <CardHeader>
        <CardTitle>لوحة متابعة مستلزمات التعبئة</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-muted">
              <th className="p-2">المستلزم</th>
              <th className="p-2">المتوفر</th>
              <th className="p-2">المطلوب للخطط</th>
              <th className="p-2">الفجوة</th>
              <th className="p-2">تنبيه</th>
            </tr>
          </thead>
          <tbody>
            {materials.map(mat => {
              const req = required[mat.code] || 0;
              const gap = mat.quantity - req;
              let alert = '';
              let alertClass = '';
              if (gap < 0) {
                alert = 'نقص';
                alertClass = 'text-red-600';
              } else if (gap < mat.min_stock) {
                alert = 'قارب النفاد';
                alertClass = 'text-yellow-600';
              } else {
                alert = 'كافٍ';
                alertClass = 'text-green-600';
              }
              return (
                <tr key={mat.code}>
                  <td>{mat.name}</td>
                  <td>{mat.quantity} {mat.unit}</td>
                  <td>{req} {mat.unit}</td>
                  <td className={gap < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{gap > 0 ? '+' : ''}{gap} {mat.unit}</td>
                  <td className={alertClass}>{alert}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};
