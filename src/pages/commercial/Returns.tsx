
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Returns: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">المرتجعات</h1>
      <Card>
        <CardHeader>
          <CardTitle>قائمة المرتجعات</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            صفحة المرتجعات قيد التطوير. سيتم عرض قائمة المرتجعات هنا قريبًا.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Returns;
