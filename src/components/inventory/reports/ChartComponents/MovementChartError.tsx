
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface MovementChartErrorProps {
  message?: string;
}

const MovementChartError: React.FC<MovementChartErrorProps> = ({ 
  message = 'تعذر تحميل البيانات. يرجى المحاولة مرة أخرى.' 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>حركة المخزون</CardTitle>
        <CardDescription className="text-destructive">حدث خطأ أثناء تحميل البيانات</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-6 text-center text-muted-foreground">
          {message}
        </div>
      </CardContent>
    </Card>
  );
};

export default MovementChartError;
