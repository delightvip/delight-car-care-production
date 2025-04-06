
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { RestoreError } from '../types';

interface ErrorDisplayProps {
  errors: RestoreError[];
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ errors }) => {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>تم العثور على أخطاء أثناء الاستعادة ({errors.length})</AlertTitle>
      <AlertDescription>
        <ScrollArea className="h-40 w-full rounded border p-2 mt-2">
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index}>
                <strong>الجدول:</strong> {error.table}, <strong>العملية:</strong> {error.operation}{' '}
                {error.batch && <span><strong>الدفعة:</strong> {error.batch}</span>}{' '}
                <strong>الخطأ:</strong> {error.error}
              </li>
            ))}
          </ul>
        </ScrollArea>
        <div className="mt-2">
          <p>قد تمت استعادة بعض البيانات بنجاح. يمكنك إعادة تحميل الصفحة للمتابعة.</p>
          <Button 
            size="sm" 
            variant="outline" 
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            إعادة تحميل الصفحة
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
