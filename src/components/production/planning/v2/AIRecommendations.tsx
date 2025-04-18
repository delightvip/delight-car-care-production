import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MaterialsConsumptionService } from '@/services/database/MaterialsConsumptionService';
import SmartForecastingService from '@/services/ai/SmartForecastingService';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

interface Recommendation {
  text: string;
  reason: string;
  actionable: boolean;
  executed?: boolean;
  ignored?: boolean;
}

export const AIRecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAIRecommendations() {
      setLoading(true);
      setError(null);
      try {
        // جلب سجل استهلاك المواد
        const history = await MaterialsConsumptionService.getHistoricalConsumption(6);
        // توقع الاستهلاك القادم لكل مادة خام (مثال: المتوسط المتحرك)
        const byMaterial = history.reduce((acc, rec) => {
          if (!acc[rec.materialId]) acc[rec.materialId] = [];
          acc[rec.materialId].push(rec);
          return acc;
        }, {} as Record<string, typeof history>);
        let recs: Recommendation[] = [];
        for (const matId in byMaterial) {
          const matHistory = byMaterial[matId];
          if (matHistory.length >= 3) {
            const forecast = SmartForecastingService.movingAverage(
              matHistory.map(h => ({ month: h.month, consumptionQty: h.consumptionQty })),
              1
            );
            if (forecast[0] > matHistory[matHistory.length - 1].consumptionQty * 1.2) {
              recs.push({
                text: `ينصح بمراجعة مخزون المادة "${matHistory[0].materialName}": زيادة متوقعة في الاستهلاك الشهر القادم.`,
                reason: 'بناءً على توقعات الاستهلاك باستخدام المتوسط المتحرك لآخر 6 أشهر.',
                actionable: true,
              });
            }
          }
        }
        if (recs.length === 0) {
          recs.push({
            text: 'لا توجد توصيات حرجة حالياً. المخزون والاستهلاك في الحدود الآمنة.',
            reason: 'تم تحليل بيانات الاستهلاك ولم يتم رصد أي مخاطر أو فرص حرجة.',
            actionable: false,
          });
        }
        setRecommendations(recs);
      } catch (e) {
        setError('تعذر تحميل توصيات الذكاء الاصطناعي. حاول لاحقًا.');
        setRecommendations([]);
      }
      setLoading(false);
    }
    fetchAIRecommendations();
  }, []);

  const handleAction = (idx: number, action: 'execute' | 'ignore') => {
    setRecommendations(recs =>
      recs.map((rec, i) =>
        i === idx
          ? { ...rec, executed: action === 'execute', ignored: action === 'ignore' }
          : rec
      )
    );
  };

  if (loading) return <div className="p-4 text-center text-sky-600">جاري تحميل توصيات الذكاء الاصطناعي...</div>;
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>;

  return (
    <Card className="mb-6 component-bg">
      <CardHeader>
        <CardTitle>توصيات الذكاء الاصطناعي (AI)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2">اقتراحات الذكاء الاصطناعي لتحسين خطط الإنتاج وتقليل التكاليف والمخاطر.</div>
        <ul className="list-disc pr-4 text-sm space-y-3">
          {recommendations.map((rec, i) => (
            <li key={i} className="relative bg-slate-50/70 dark:bg-slate-800/70 rounded-lg p-3 flex flex-col gap-1 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span>{rec.text}</span>
                <span className="group relative">
                  <Info size={15} className="text-sky-500 ml-1 cursor-pointer group-hover:scale-110 transition" />
                  <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-all duration-200 min-w-max">
                    {rec.reason}
                  </span>
                </span>
                {rec.executed && <span className="text-green-600 flex items-center ml-2"><CheckCircle2 size={16} className="mr-1"/>تم التنفيذ</span>}
                {rec.ignored && <span className="text-red-500 flex items-center ml-2"><XCircle size={16} className="mr-1"/>تم التجاهل</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                <span className="opacity-80">{rec.reason}</span>
                {rec.actionable && !rec.executed && !rec.ignored && (
                  <>
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white rounded px-3 py-0.5 ml-2 text-xs font-bold shadow"
                      onClick={() => handleAction(i, 'execute')}
                    >تنفيذ التوصية</button>
                    <button
                      className="bg-slate-400 hover:bg-slate-500 text-white rounded px-3 py-0.5 text-xs font-bold shadow"
                      onClick={() => handleAction(i, 'ignore')}
                    >تجاهل</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="text-xs text-muted-foreground mt-2">* هذه التوصيات ناتجة عن محاكاة ذكية ولا تؤثر على البيانات الفعلية.</div>
      </CardContent>
    </Card>
  );
};
