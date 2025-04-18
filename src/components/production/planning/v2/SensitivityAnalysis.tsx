import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

/**
 * تحليل الحساسية: تأثير التغير في المواد الخام ومستلزمات التعبئة على الإنتاج والتكلفة.
 */
export const SensitivityAnalysis: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>تحليل الحساسية</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2">حلل كيف يؤثر تغير أسعار أو توفر المواد الخام ومستلزمات التعبئة على نتائج الإنتاج والتكلفة.</div>
        {/* رسم بياني أو جدول توضيحي (واجهة أولية) */}
        <table className="w-full text-xs border mb-2">
          <thead>
            <tr className="bg-muted">
              <th className="p-2">العامل</th>
              <th className="p-2">التغير المفترض</th>
              <th className="p-2">الأثر على التكلفة</th>
              <th className="p-2">الأثر على الإنتاج</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>سعر خام A</td>
              <td>+10%</td>
              <td className="text-red-600">+5%</td>
              <td className="text-yellow-700">-2%</td>
            </tr>
            <tr>
              <td>توافر زجاجة 1 لتر</td>
              <td>-20%</td>
              <td className="text-yellow-700">0%</td>
              <td className="text-red-600">-10%</td>
            </tr>
          </tbody>
        </table>
        <div className="text-xs text-muted-foreground">* هذه النتائج محاكاة فقط ولا تؤثر على أي بيانات حقيقية.</div>
      </CardContent>
    </Card>
  );
};
