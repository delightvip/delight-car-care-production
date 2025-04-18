import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import ProductionDatabaseService from '@/services/database/ProductionDatabaseService';

/**
 * جدولة الإنتاج: عرض خطط الإنتاج بشكل زمني مع ربط المواد الخام ومستلزمات التعبئة.
 */
export const TimelinePanel: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTimeline() {
      setLoading(true);
      const dbService = ProductionDatabaseService.getInstance();
      const prodOrders = await dbService.getProductionOrders();
      setOrders(prodOrders);
      setLoading(false);
    }
    fetchTimeline();
  }, []);

  if (loading) return <div className="p-4">جاري التحميل...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>جدولة الإنتاج</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm border mb-4">
          <thead>
            <tr className="bg-muted">
              <th className="p-2">الخطة</th>
              <th className="p-2">التاريخ</th>
              <th className="p-2">المادة الخام المطلوبة</th>
              <th className="p-2">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>{order.productName} ({order.quantity} {order.unit})</td>
                <td>{order.date}</td>
                <td>
                  {order.ingredients && order.ingredients.length > 0 ? (
                    <ul className="list-disc pr-2">
                      {order.ingredients.map(ing => (
                        <li key={ing.code}>{ing.name} ({ing.requiredQuantity})</li>
                      ))}
                    </ul>
                  ) : '—'}
                </td>
                <td className={order.ingredients.some(ing => !ing.available) ? 'text-red-600' : 'text-green-600'}>
                  {order.ingredients.some(ing => !ing.available) ? 'نقص مواد' : 'جاهز'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-xs text-muted-foreground">* جميع العمليات هنا تعكس بيانات الإنتاج أو المخزون الفعلي.</div>
      </CardContent>
    </Card>
  );
};
