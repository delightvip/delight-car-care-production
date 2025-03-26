
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Payments: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">المدفوعات</h1>
      <Card>
        <CardHeader>
          <CardTitle>قائمة المدفوعات</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            صفحة المدفوعات قيد التطوير. سيتم عرض قائمة المدفوعات هنا قريبًا.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;
