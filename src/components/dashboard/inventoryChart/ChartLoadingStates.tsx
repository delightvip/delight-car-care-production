
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const ChartLoading: React.FC<{ height?: string | number }> = ({ height = '16rem' }) => (
  <div className="flex items-center justify-center" style={{ height }}>
    <Skeleton className="h-56 w-56 rounded-full" />
  </div>
);

export const ChartError: React.FC<{ height?: string | number, message?: string }> = ({ 
  height = '16rem',
  message = 'حدث خطأ أثناء تحميل بيانات توزيع المخزون'
}) => (
  <Alert variant="destructive" className="flex flex-col justify-center" style={{ height }}>
    <AlertCircle className="h-5 w-5" />
    <AlertTitle>خطأ</AlertTitle>
    <AlertDescription>{message}</AlertDescription>
  </Alert>
);

export const ChartEmpty: React.FC<{ height?: string | number, message?: string }> = ({
  height = '16rem',
  message = 'لا توجد بيانات مخزون لعرضها. قم بإضافة عناصر للمخزون أولاً.'
}) => (
  <Alert className="flex flex-col justify-center" style={{ height }}>
    <AlertCircle className="h-5 w-5" />
    <AlertTitle>لا توجد بيانات</AlertTitle>
    <AlertDescription>{message}</AlertDescription>
  </Alert>
);
