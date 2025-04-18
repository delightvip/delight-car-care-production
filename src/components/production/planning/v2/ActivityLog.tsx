import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

/**
 * سجل الأحداث: تتبع كل عمليات المحاكاة والتعديلات على الخطط.
 */
export const ActivityLog: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل الأحداث</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pr-4 text-xs space-y-1">
          <li>2025-04-18 15:30 - تمت محاكاة سيناريو زيادة الإنتاج بنسبة 10%.</li>
          <li>2025-04-18 15:32 - تم تعديل كمية خام A المطلوبة في خطة إنتاج منتج A.</li>
          <li>2025-04-18 15:35 - تم استلام توصية AI بزيادة طلب مستلزم التعبئة.</li>
        </ul>
        <div className="text-xs text-muted-foreground mt-2">* كل الأحداث هنا ناتجة عن عمليات محاكاة فقط.</div>
      </CardContent>
    </Card>
  );
};
