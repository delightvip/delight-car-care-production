
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Invoices: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">الفواتير</h1>
      <Card>
        <CardHeader>
          <CardTitle>قائمة الفواتير</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            صفحة الفواتير قيد التطوير. سيتم عرض قائمة الفواتير هنا قريبًا.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
