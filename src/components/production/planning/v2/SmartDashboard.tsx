import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import InventoryService from '@/services/InventoryService';
import ProductionDatabaseService from '@/services/database/ProductionDatabaseService';
import { MaterialsConsumptionService } from '@/services/database/MaterialsConsumptionService';

/**
 * لوحة القيادة الذكية: ملخص سريع للإنتاج والمواد الخام ومستلزمات التعبئة والتنبيهات.
 */
export const SmartDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalProduction: 0,
    rawAvailability: 0,
    packagingAvailability: 0,
    criticalAlerts: 0,
    alerts: [] as string[],
    opportunities: [] as string[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      // جلب بيانات المواد الخام والتعبئة وأوامر الإنتاج
      const inventoryService = InventoryService.getInstance();
      const dbService = ProductionDatabaseService.getInstance();
      const rawMaterials = await inventoryService.getRawMaterials();
      const packagingMaterials = await inventoryService.getPackagingMaterials();
      const prodOrders = await dbService.getProductionOrders();
      const packagingOrders = await dbService.getPackagingOrders();
      // حساب إجمالي الإنتاج المتوقع
      const totalProduction = prodOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
      // حساب توافر المواد الخام
      let totalRaw = 0, availableRaw = 0;
      rawMaterials.forEach(mat => {
        totalRaw++;
        if (mat.quantity > mat.min_stock) availableRaw++;
      });
      // حساب توافر مواد التعبئة
      let totalPkg = 0, availablePkg = 0;
      packagingMaterials.forEach(mat => {
        totalPkg++;
        if (mat.quantity > mat.min_stock) availablePkg++;
      });
      // تنبيهات حرجة (مواد ناقصة)
      let criticalAlerts = 0;
      let alerts: string[] = [];
      let opportunities: string[] = [];
      rawMaterials.forEach(mat => {
        if (mat.quantity < mat.min_stock) {
          criticalAlerts++;
          alerts.push(`نقص في المادة الخام: ${mat.name}`);
        }
      });
      packagingMaterials.forEach(mat => {
        if (mat.quantity < mat.min_stock) {
          criticalAlerts++;
          alerts.push(`نقص في مستلزم التعبئة: ${mat.name}`);
        }
      });
      // فرص (مثال: مواد فائضة)
      rawMaterials.forEach(mat => {
        if (mat.quantity > mat.min_stock * 2) {
          opportunities.push(`يمكن زيادة إنتاج المنتجات التي تستخدم ${mat.name}`);
        }
      });
      setStats({
        totalProduction,
        rawAvailability: totalRaw ? Math.round((availableRaw / totalRaw) * 100) : 0,
        packagingAvailability: totalPkg ? Math.round((availablePkg / totalPkg) * 100) : 0,
        criticalAlerts,
        alerts,
        opportunities,
      });
      setLoading(false);
    }
    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-4">جاري التحميل...</div>;

  return (
    <Card className="mb-6 component-bg">
      <CardHeader>
        <CardTitle>لوحة القيادة الذكية</CardTitle>
      </CardHeader>
      <CardContent>
        {/* مؤشرات الأداء الرئيسية (KPIs) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="dashboard-kpi rounded p-3 text-center">
            <div className="text-lg font-bold">{stats.totalProduction}</div>
            <div className="text-xs">إجمالي الإنتاج المتوقع</div>
          </div>
          <div className="dashboard-kpi rounded p-3 text-center">
            <div className="text-lg font-bold">{stats.rawAvailability}%</div>
            <div className="text-xs">توافر المواد الخام</div>
          </div>
          <div className="dashboard-kpi rounded p-3 text-center">
            <div className="text-lg font-bold">{stats.packagingAvailability}%</div>
            <div className="text-xs">توافر مستلزمات التعبئة</div>
          </div>
          <div className="dashboard-kpi rounded p-3 text-center">
            <div className="text-lg font-bold text-red-500">{stats.criticalAlerts}</div>
            <div className="text-xs">تنبيهات حرجة</div>
          </div>
        </div>
        {/* إشعارات ذكية بشكل شبكة منظمة */}
        <div className="dashboard-row-list grid md:grid-cols-2 gap-2 mt-2">
          {stats.alerts.map((alert, i) => (
            <div key={i} className="dashboard-row-card critical">
              <span className="font-bold">تنبيه:</span> {alert}
            </div>
          ))}
          {stats.opportunities.map((op, i) => (
            <div key={i} className="dashboard-row-card opportunity">
              <span className="font-bold">فرصة:</span> {op}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
