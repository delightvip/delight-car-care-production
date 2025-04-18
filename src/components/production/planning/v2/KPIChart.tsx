import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ProductionService from '@/services/ProductionService';
import { MaterialsConsumptionService } from '@/services/database/MaterialsConsumptionService';
import { RefreshCw } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const options = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        font: { family: 'Cairo, sans-serif', size: 14 },
      },
    },
    title: {
      display: true,
      text: 'تطور الإنتاج والاستهلاك خلال الأشهر',
      font: { family: 'Cairo, sans-serif', size: 16 },
    },
    tooltip: {
      rtl: true,
      callbacks: {
        label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y} وحدة`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { family: 'Cairo, sans-serif' } },
    },
    y: {
      grid: { color: 'rgba(0,0,0,0.07)' },
      ticks: { font: { family: 'Cairo, sans-serif' } },
    },
  },
  animation: {
    duration: 1000,
    easing: 'easeOutQuart' as const,
  },
};

const KPIChart: React.FC = () => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // جلب بيانات الإنتاج الشهرية
      const prodService = ProductionService.getInstance();
      const monthlyProduction = await prodService.getProductionChartData();
      // جلب بيانات الاستهلاك الشهرية
      const monthlyConsumptionRaw = await MaterialsConsumptionService.getHistoricalConsumption(5);
      // تجميع الاستهلاك الشهري لكل شهر
      const consumptionByMonth: Record<string, number> = {};
      monthlyConsumptionRaw.forEach((rec: any) => {
        if (!consumptionByMonth[rec.month]) consumptionByMonth[rec.month] = 0;
        consumptionByMonth[rec.month] += rec.consumptionQty;
      });
      // بناء قائمة الأشهر المشتركة
      const allMonths = Array.from(new Set([
        ...monthlyProduction.map((p: any) => p.month),
        ...Object.keys(consumptionByMonth)
      ])).sort();
      // بناء بيانات الرسم البياني
      setChartData({
        labels: allMonths.map(m => {
          const date = new Date(m + '-01');
          return date.toLocaleString('ar-EG', { month: 'long', year: '2-digit' });
        }),
        datasets: [
          {
            label: 'الإنتاج',
            data: allMonths.map(m => {
              const found = monthlyProduction.find((p: any) => p.month === m);
              return found ? found.production_count : 0;
            }),
            backgroundColor: 'rgba(14,165,233,0.7)',
            borderRadius: 8,
            borderSkipped: false,
          },
          {
            label: 'الاستهلاك',
            data: allMonths.map(m => consumptionByMonth[m] || 0),
            backgroundColor: 'rgba(34,197,94,0.7)',
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      });
    } catch (e) {
      setChartData(null);
      setError('تعذر تحميل بيانات الرسم البياني. تحقق من الاتصال أو حاول مجددًا.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center p-8 text-sky-600">
      <svg className="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
      جاري تحميل البيانات الفعلية...
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center p-8 text-red-600">
      <span>{error}</span>
      <button
        onClick={fetchData}
        className="mt-4 flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-1.5 rounded shadow text-sm font-bold"
      >
        <RefreshCw size={18} className="animate-spin-slow" /> إعادة المحاولة
      </button>
    </div>
  );
  if (!chartData) return null;
  return (
    <div className="bg-white/60 dark:bg-slate-900/60 rounded-2xl shadow-lg p-4 mb-6 backdrop-blur-lg animate-fadein">
      <Bar data={chartData} options={options} height={220} />
    </div>
  );
};

export default KPIChart;
