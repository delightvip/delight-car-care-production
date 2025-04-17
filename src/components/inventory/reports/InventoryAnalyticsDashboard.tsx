import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, BarChart3, PieChart, LineChart, ArrowDownUp, Activity, Filter } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import AdvancedTimeFilter from './AdvancedTimeFilter';
import MostActiveItemsChart from './MostActiveItemsChart';
import InventorySummaryStats from './InventorySummaryStats';
import ReportContent from './ReportContent';
import InventoryVolatilityChart from './InventoryVolatilityChart';

interface InventoryAnalyticsDashboardProps {
  selectedItem: string | null;
  selectedCategory: string;
  isLoadingItemDetails: boolean;
  selectedItemDetails: any;
}

const InventoryAnalyticsDashboard: React.FC<InventoryAnalyticsDashboardProps> = ({
  selectedItem,
  selectedCategory,
  isLoadingItemDetails,
  selectedItemDetails
}) => {
  const [timeRange, setTimeRange] = useState('month');
  const [reportType, setReportType] = useState('overview');
  const [customDateRange, setCustomDateRange] = useState<{from: Date; to: Date; preset?: string}>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
    preset: 'month'
  });

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    const now = new Date();
    let from = new Date();
    
    switch (value) {
      case 'week':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'quarter':
        from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'year':
        from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
    
    setCustomDateRange({
      from,
      to: now,
      preset: value
    });
  };

  const handleCustomDateRangeChange = (range: {from: Date; to: Date; preset?: string}) => {
    setCustomDateRange(range);
    if (range.preset) {
      setTimeRange(range.preset);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <Card className="flex-1 border-border/40">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">لوحة تحليل المخزون</CardTitle>
            <CardDescription>
              عرض تقارير وتحليلات متقدمة لحركات المخزون وأداء الأصناف
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  <Filter size={16} className="inline-block ml-2" />
                  الفترة الزمنية
                </div>
                <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفترة الزمنية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">أسبوع</SelectItem>
                    <SelectItem value="month">شهر</SelectItem>
                    <SelectItem value="quarter">ربع سنة</SelectItem>
                    <SelectItem value="year">سنة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  <Calendar size={16} className="inline-block ml-2" />
                  تحديد فترة مخصصة
                </div>
                <AdvancedTimeFilter 
                  onChange={handleCustomDateRangeChange}
                  defaultValue={customDateRange}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={reportType} value={reportType} onValueChange={setReportType} className="w-full">
        <TabsList className="grid grid-cols-3 w-full md:w-auto md:inline-grid md:grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity size={16} />
            <span>نظرة عامة</span>
          </TabsTrigger>
          <TabsTrigger value="movement" className="flex items-center gap-2">
            <ArrowDownUp size={16} />
            <span>تحليل الحركة</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <BarChart3 size={16} />
            <span>تحليلات متقدمة</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview" className="mt-0">
            {!selectedItem ? (
              <div className="grid grid-cols-1 gap-6">
                <MostActiveItemsChart timeRange={timeRange} limit={10} />
              </div>
            ) : (
              <ReportContent
                selectedItem={selectedItem}
                selectedCategory={selectedCategory}
                isLoadingItemDetails={isLoadingItemDetails}
                selectedItemDetails={selectedItemDetails}
                reportType="movement"
                setReportType={(v) => setReportType(v === 'movement' ? 'movement' : 'advanced')}
                timeRange={timeRange}
                setTimeRange={setTimeRange}
              />
            )}
          </TabsContent>

          <TabsContent value="movement" className="mt-0">
            {!selectedItem ? (
              <div className="p-8 text-center text-muted-foreground">
                يرجى اختيار صنف للعرض
              </div>
            ) : (
              <ReportContent
                selectedItem={selectedItem}
                selectedCategory={selectedCategory}
                isLoadingItemDetails={isLoadingItemDetails}
                selectedItemDetails={selectedItemDetails}
                reportType="movement"
                setReportType={() => {}}
                timeRange={timeRange}
                setTimeRange={setTimeRange}
              />
            )}
          </TabsContent>

          <TabsContent value="advanced" className="mt-0">
            {!selectedItem ? (
              <div className="p-8 text-center text-muted-foreground">
                يرجى اختيار صنف للعرض
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <InventorySummaryStats 
                    itemId={selectedItem} 
                    itemType={selectedCategory} 
                  />
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <ReportContent
                    selectedItem={selectedItem}
                    selectedCategory={selectedCategory}
                    isLoadingItemDetails={isLoadingItemDetails}
                    selectedItemDetails={selectedItemDetails}
                    reportType="usage"
                    setReportType={() => {}}
                    timeRange={timeRange}
                    setTimeRange={setTimeRange}
                  />
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="col-span-1">
                    <Card className="border-border/40">
                      <CardHeader>
                        <CardTitle className="text-lg font-medium">تحليلات متقدمة</CardTitle>
                        <CardDescription>
                          تحليلات وإحصائيات متقدمة لأداء الصنف المحدد
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <InventoryVolatilityChart 
                          itemId={selectedItem} 
                          itemType={selectedCategory} 
                          timeRange={timeRange} 
                          itemName={selectedItemDetails?.name || ''} 
                          itemUnit={selectedItemDetails?.unit || ''}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default InventoryAnalyticsDashboard;
