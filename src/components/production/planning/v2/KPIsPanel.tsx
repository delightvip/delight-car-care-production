import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart2, TrendingUp, TrendingDown, Package } from 'lucide-react';
import KPIChart from './KPIChart';
import { Info } from 'lucide-react';
import ProductionService from '@/services/ProductionService';
import { MaterialsConsumptionService } from '@/services/database/MaterialsConsumptionService';
import InventoryService from '@/services/InventoryService';

interface KPIsPanelProps {
  onNavigate?: (tab: string) => void;
}

export const KPIsPanel: React.FC<KPIsPanelProps> = ({ onNavigate }) => {
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchKPIs() {
      setLoading(true);
      setError(null);
      try {
        // إجمالي الإنتاج
        const prodService = ProductionService.getInstance();
        const prodStats = await prodService.getProductionStats();
        // معدل استهلاك المواد
        const consumptionStats = await MaterialsConsumptionService.getSummaryStats();
        // مواد منخفضة المخزون
        const inventory = await InventoryService.getInstance().getLowStockMaterials();
        // مستلزمات التعبئة المتاحة
        const packaging = await InventoryService.getInstance().getPackagingStockSummary();
        setKpis([
          {
            icon: <BarChart2 color="#0ea5e9" />, label: 'إجمالي الإنتاج', value: prodStats.total_production_orders + ' أمر', tooltip: 'إجمالي أوامر الإنتاج', tab: 'dashboard', trend: null },
          {
            icon: <TrendingUp color="#22c55e" />, label: 'معدل استهلاك المواد', value: (consumptionStats.totalRawConsumed || 0) + ' كجم', tooltip: 'إجمالي المواد الخام المستهلكة', tab: 'materials', trend: null },
          {
            icon: <TrendingDown color="#ef4444" />, label: 'مواد منخفضة المخزون', value: inventory.length + ' صنف', tooltip: 'عدد المواد التي تحتاج إعادة طلب', tab: 'materials', trend: inventory.length > 0 ? 'down' : null },
          {
            icon: <Package color="#f59e42" />, label: 'مستلزمات التعبئة المتاحة', value: packaging.total + ' عبوة', tooltip: 'عدد عبوات التعبئة المتوفرة', tab: 'packaging', trend: null },
        ]);
      } catch (e) {
        setKpis([]);
        setError('تعذر تحميل بيانات مؤشرات الأداء. حاول مرة أخرى.');
      }
      setLoading(false);
    }
    fetchKPIs();
  }, []);

  return (
    <Card className="mb-6 bg-white/60 dark:bg-slate-900/60 shadow-xl rounded-2xl backdrop-blur-lg animate-fadein">
      <CardHeader>
        <CardTitle>مؤشرات الأداء الرئيسية (KPIs)</CardTitle>
      </CardHeader>
      <CardContent>
        <KPIChart />
        {loading ? (
          <div className="text-center py-6">جاري تحميل البيانات الحقيقية...</div>
        ) : error ? (
          <div className="text-center py-6 text-red-600">{error}</div>
        ) : kpis.length === 0 ? (
          <div className="text-center py-6 text-slate-500">لا توجد بيانات متاحة لعرض المؤشرات.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.map((kpi, idx) => (
              <button
                key={idx}
                type="button"
                className="flex flex-col items-center bg-slate-50/70 dark:bg-slate-800/70 rounded-xl p-4 shadow-sm relative group hover:ring-2 hover:ring-sky-400 transition cursor-pointer focus:outline-none"
                onClick={() => kpi.tab && onNavigate && onNavigate(kpi.tab)}
                tabIndex={0}
                aria-label={`انتقال إلى ${kpi.label}`}
              >
                <div className="mb-2">{kpi.icon}</div>
                <div className="font-bold text-lg mb-1 flex items-center gap-1">
                  {kpi.value}
                  {kpi.trend === 'down' && <span className="text-red-500 ml-1">↓</span>}
                  {kpi.trend === 'up' && <span className="text-green-500 ml-1">↑</span>}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-300 flex items-center gap-1">
                  {kpi.label}
                  <span className="relative">
                    <Info size={14} className="text-sky-500 cursor-pointer group-hover:scale-110 transition" />
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-all duration-200">
                      {kpi.tooltip}
                    </span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KPIsPanel;
