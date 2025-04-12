
import React, { useState } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Database, 
  BoxesIcon, 
  AreaChart, 
  LucideIcon, 
  Layers, 
  Box, 
  PackageOpen 
} from 'lucide-react';
import InventoryForecast from '@/components/inventory/analytics/InventoryForecast';
import ABCAnalysis from '@/components/inventory/analytics/ABCAnalysis';
import ConsumptionTrends from '@/components/inventory/analytics/ConsumptionTrends';
import OptimalInventoryAnalysis from '@/components/inventory/analytics/OptimalInventoryAnalysis';
import InventoryUsageMatrix from '@/components/inventory/analytics/InventoryUsageMatrix';
import AdvancedTimeFilter from '@/components/inventory/reports/AdvancedTimeFilter';
import { ExportReportOptions } from '@/components/inventory/reports/ExportReportOptions';

interface CategoryOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

const categories: CategoryOption[] = [
  { value: 'all', label: 'جميع المخزون', icon: Database },
  { value: 'raw', label: 'المواد الخام', icon: Box },
  { value: 'packaging', label: 'مواد التعبئة', icon: PackageOpen },
  { value: 'semi', label: 'نصف مصنعة', icon: Layers },
  { value: 'finished', label: 'منتجات نهائية', icon: BoxesIcon }
];

const InventoryAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('forecast');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<{ from: Date; to: Date; preset?: string }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
    preset: 'month'
  });
  
  const handleTimeRangeChange = (range: { from: Date; to: Date; preset?: string }) => {
    setTimeRange(range);
  };
  
  const getPresetValue = (): string => {
    return timeRange.preset || 'custom';
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">تحليلات المخزون</h1>
          <p className="text-muted-foreground mt-1">تحليلات متقدمة للمخزون تستخدم خوارزميات ذكية للتنبؤ والتحسين</p>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-2 items-center">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="اختر نوع المخزون" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex items-center gap-2">
                      <category.icon className="h-4 w-4" />
                      <span>{category.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <AdvancedTimeFilter
              onChange={handleTimeRangeChange}
              defaultValue={timeRange}
            />
          </div>
          
          <ExportReportOptions
            inventoryType={selectedCategory}
            timeRange={getPresetValue()}
            reportType={activeTab}
          />
        </div>
        
        <Tabs defaultValue="forecast" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="forecast" className="flex items-center gap-2">
              <AreaChart className="h-4 w-4" />
              <span className="hidden md:inline">التنبؤ بالمخزون</span>
              <span className="md:hidden">التنبؤ</span>
            </TabsTrigger>
            <TabsTrigger value="abc" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden md:inline">تحليل ABC</span>
              <span className="md:hidden">ABC</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <AreaChart className="h-4 w-4" />
              <span className="hidden md:inline">اتجاهات الاستهلاك</span>
              <span className="md:hidden">الاتجاهات</span>
            </TabsTrigger>
            <TabsTrigger value="optimal" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden md:inline">المستوى الأمثل</span>
              <span className="md:hidden">الأمثل</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <Box className="h-4 w-4" />
              <span className="hidden md:inline">استخدام المخزون</span>
              <span className="md:hidden">الاستخدام</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="forecast" className="mt-0">
              <InventoryForecast 
                inventoryType={selectedCategory}
                timeRange={getPresetValue()}
              />
            </TabsContent>
            
            <TabsContent value="abc" className="mt-0">
              <ABCAnalysis
                inventoryType={selectedCategory}
              />
            </TabsContent>
            
            <TabsContent value="trends" className="mt-0">
              <ConsumptionTrends
                inventoryType={selectedCategory}
                timeRange={getPresetValue()}
              />
            </TabsContent>
            
            <TabsContent value="optimal" className="mt-0">
              <OptimalInventoryAnalysis
                inventoryType={selectedCategory}
              />
            </TabsContent>
            
            <TabsContent value="usage" className="mt-0">
              <InventoryUsageMatrix
                inventoryType={selectedCategory}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default InventoryAnalytics;
