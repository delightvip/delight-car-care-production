
import React, { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, ActivitySquare, PieChart } from 'lucide-react';
import InventorySummaryStats from './InventorySummaryStats';

interface ReportContentProps {
  selectedItem: string | null;
  selectedCategory: string;
  isLoadingItemDetails: boolean;
  selectedItemDetails: any;
  reportType: string;
  setReportType: (value: string) => void;
  timeRange: string;
  setTimeRange: (value: string) => void;
}

const ReportContent: React.FC<ReportContentProps> = ({ 
  selectedItem, 
  selectedCategory,
  isLoadingItemDetails,
  selectedItemDetails,
  reportType,
  setReportType,
  timeRange,
  setTimeRange 
}) => {
  if (!selectedItem || !selectedCategory) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        يرجى اختيار صنف للعرض
      </div>
    );
  }
  
  if (isLoadingItemDetails) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  // Using React.lazy for code splitting
  const InventoryMovementChart = React.lazy(() => import('./InventoryMovementChart'));
  const InventoryUsageChart = React.lazy(() => import('./InventoryUsageChart'));
  
  return (
    <div className="space-y-6">
      <InventorySummaryStats 
        itemId={selectedItem} 
        itemType={selectedCategory} 
      />
      
      <Tabs defaultValue={reportType} value={reportType} onValueChange={setReportType} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid grid-cols-2 w-[400px]">
            <TabsTrigger value="movement" className="flex items-center gap-2">
              <ActivitySquare size={16} />
              <span>حركة المخزون</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <PieChart size={16} />
              <span>توزيع الاستهلاك</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-muted-foreground" />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="اختر الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">أسبوع</SelectItem>
                <SelectItem value="month">شهر</SelectItem>
                <SelectItem value="quarter">ربع سنوي</SelectItem>
                <SelectItem value="year">سنوي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Card className="border-border/40">
          <CardContent className="p-4">
            <TabsContent value="movement" className="mt-0">
              <div className="h-[400px]">
                <Suspense fallback={<Skeleton className="h-full w-full" />}>
                  <InventoryMovementChart 
                    itemId={selectedItem} 
                    itemType={selectedCategory} 
                    timeRange={timeRange} 
                    itemName={selectedItemDetails?.name || ''} 
                    itemUnit={selectedItemDetails?.unit || ''}
                  />
                </Suspense>
              </div>
            </TabsContent>
            
            <TabsContent value="usage" className="mt-0">
              <div className="h-[400px]">
                <Suspense fallback={<Skeleton className="h-full w-full" />}>
                  <InventoryUsageChart 
                    itemId={selectedItem} 
                    itemType={selectedCategory} 
                    timeRange={timeRange} 
                    itemName={selectedItemDetails?.name || ''}
                  />
                </Suspense>
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

export default ReportContent;
