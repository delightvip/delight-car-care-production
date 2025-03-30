
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const MovementChartLoading: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>حركة المخزون</CardTitle>
        <CardDescription>جاري تحميل البيانات...</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Skeleton className="h-[350px] w-full" />
      </CardContent>
    </Card>
  );
};

export default MovementChartLoading;
