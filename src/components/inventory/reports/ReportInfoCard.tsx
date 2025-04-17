
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryItem } from '../../../pages/inventory/InventoryReports';

interface ReportInfoCardProps {
  selectedItemDetails: InventoryItem | null;
  isLoadingItemDetails: boolean;
}

const ReportInfoCard: React.FC<ReportInfoCardProps> = ({
  selectedItemDetails,
  isLoadingItemDetails
}) => {
  return (
    <Card className="border-border/40 bg-card/60 backdrop-blur-sm col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">معلومات التقرير</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          {isLoadingItemDetails ? (
            <Skeleton className="h-10 w-[200px]" />
          ) : selectedItemDetails ? (
            <div>
              <p className="font-medium">{selectedItemDetails.name}</p>
              <p className="text-sm text-muted-foreground">
                كود: {selectedItemDetails.code} | الوحدة: {selectedItemDetails.unit}
              </p>
            </div>
          ) : (
            <div className="text-muted-foreground">
              اختر صنفًا للعرض
            </div>
          )}
          
          <div className="flex gap-4 items-center">
            <div className="text-sm text-right">
              <span className="block font-medium">آخر تحديث:</span>
              <span className="block text-muted-foreground">
                {new Date().toLocaleDateString('ar-EG')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportInfoCard;
