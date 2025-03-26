
import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">تفاصيل المنتج</h1>
      <Card>
        <CardHeader>
          <CardTitle>معرف المنتج: {id}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            صفحة تفاصيل المنتج قيد التطوير. سيتم عرض معلومات المنتج هنا قريبًا.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductDetails;
