
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{title}</h1>
      <Card>
        <CardHeader>
          <CardTitle>هذه الصفحة قيد الإنشاء</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            هذه الصفحة غير متاحة حاليًا وسيتم تطويرها قريبًا.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceholderPage;
