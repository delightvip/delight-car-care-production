import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * لوحة دعم اتخاذ القرار: تعرض توصيات ذكية، قرارات سريعة، ومؤشرات المخاطر والفرص.
 */
const recommendations = [
  { icon: <Lightbulb color="#0ea5e9" />, text: 'زيادة طلب المواد الخام خلال الأسبوع القادم بسبب توقع زيادة الاستهلاك.' },
  { icon: <AlertTriangle color="#f59e42" />, text: 'انخفاض مخزون التعبئة لبعض الأصناف، يُنصح بإعادة جدولة الإنتاج.' },
  { icon: <CheckCircle color="#22c55e" />, text: 'معدلات الإنتاج الحالية تحقق استدامة المخزون.' },
];

const quickActions = [
  { label: 'طلب مواد خام', color: 'bg-sky-500', onClick: () => alert('تم إرسال طلب المواد الخام!') },
  { label: 'تعديل خطة الإنتاج', color: 'bg-amber-500', onClick: () => alert('تم تحويلك لتعديل الخطة!') },
  { label: 'تفعيل تنبيه المخزون', color: 'bg-red-500', onClick: () => alert('تم تفعيل التنبيه!') },
];

export const DecisionSupportPanel: React.FC = () => (
  <Card className="mb-6 component-bg">
    <CardHeader>
      <CardTitle>دعم اتخاذ القرار الذكي</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">توصيات ذكية</h3>
        <ul className="space-y-2">
          {recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-center gap-2 text-base">
              {rec.icon}
              {rec.text}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-2">قرارات سريعة</h3>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              className={`px-4 py-2 rounded-lg text-white font-bold shadow transition ${action.color}`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default DecisionSupportPanel;
