
import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const InvoiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">تفاصيل الفاتورة</h1>
      <Card>
        <CardHeader>
          <CardTitle>معرف الفاتورة: {id}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            صفحة تفاصيل الفاتورة قيد التطوير. سيتم عرض معلومات الفاتورة هنا قريبًا.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceDetails;
