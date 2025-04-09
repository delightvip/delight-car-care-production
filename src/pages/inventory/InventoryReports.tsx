
import React, { useState, useEffect } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, BarChart3, Clock, AlertTriangle, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReportFilterCard from '@/components/inventory/reports/ReportFilterCard';
import ReportInfoCard from '@/components/inventory/reports/ReportInfoCard';
import ReportContent from '@/components/inventory/reports/ReportContent';
import UnusedItemsReport from '@/components/inventory/reports/UnusedItemsReport';
import StagnantItemsReport from '@/components/inventory/reports/StagnantItemsReport';
import { exportAuditData } from '@/utils/exportUtils';
import { enhancedToast } from '@/components/ui/enhanced-toast';

export interface ItemCategory {
  id: string;
  name: string;
  type: 'raw' | 'semi' | 'packaging' | 'finished';
  itemCount: number;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
}

const inventoryTables = [
  { id: 'raw', name: 'المواد الخام', table: 'raw_materials' as const },
  { id: 'semi', name: 'المنتجات النصف مصنعة', table: 'semi_finished_products' as const },
  { id: 'packaging', name: 'مواد التعبئة', table: 'packaging_materials' as const },
  { id: 'finished', name: 'المنتجات النهائية', table: 'finished_products' as const }
];

const InventoryReports = () => {
  const params = useParams<{ type?: string; id?: string }>();
  const isItemReport = !!params.type && !!params.id;

  const [selectedCategory, setSelectedCategory] = useState<string>(params.type || 'raw');
  const [selectedItem, setSelectedItem] = useState<string | null>(params.id || null);
  const [reportType, setReportType] = useState<string>('movement');
  const [timeRange, setTimeRange] = useState<string>('month');
  const [mainTab, setMainTab] = useState<string>('item-analysis');
  
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const result: ItemCategory[] = [];
      
      for (const type of inventoryTables) {
        const { count, error } = await supabase
          .from(type.table)
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.error(`Error fetching count for ${type.table}:`, error);
        }
          
        result.push({
          id: type.id,
          name: type.name,
          type: type.id as ItemCategory['type'],
          itemCount: count || 0
        });
      }
      
      return result;
    }
  });
  
  const { data: items, isLoading: isLoadingItems } = useQuery({
    queryKey: ['inventory-items', selectedCategory],
    queryFn: async () => {
      const selectedTableInfo = inventoryTables.find(t => t.id === selectedCategory);
      
      if (!selectedTableInfo) return [];
      
      const { data, error } = await supabase
        .from(selectedTableInfo.table)
        .select('id, code, name, quantity, unit');
        
      if (error) {
        console.error(`Error fetching items from ${selectedTableInfo.table}:`, error);
        return [];
      }
        
      return data.map(item => ({
        id: String(item.id),
        code: String(item.code),
        name: String(item.name),
        quantity: Number(item.quantity),
        unit: String(item.unit)
      })) as InventoryItem[];
    },
    enabled: !!selectedCategory
  });
  
  const { data: selectedItemDetails, isLoading: isLoadingItemDetails } = useQuery({
    queryKey: ['inventory-item-details', selectedCategory, selectedItem],
    queryFn: async () => {
      if (!selectedItem) return null;
      
      const selectedTableInfo = inventoryTables.find(t => t.id === selectedCategory);
      
      if (!selectedTableInfo) return null;
      
      const { data, error } = await supabase
        .from(selectedTableInfo.table)
        .select('id, code, name, quantity, unit')
        .eq('id', parseInt(selectedItem))
        .single();
        
      if (error) {
        console.error(`Error fetching item details:`, error);
        return null;
      }
        
      return {
        id: String(data.id),
        code: String(data.code),
        name: String(data.name),
        quantity: Number(data.quantity),
        unit: String(data.unit)
      } as InventoryItem;
    },
    enabled: !!selectedItem && !!selectedCategory
  });
  
  useEffect(() => {
    if (items && items.length > 0 && !selectedItem) {
      setSelectedItem(items[0].id);
    }
  }, [items, selectedItem]);

  const handleExportReport = () => {
    try {
      enhancedToast.info("جاري تحضير التقرير للتنزيل...");
      
      if (mainTab === 'unused-items' || mainTab === 'stagnant-items') {
        // Export special reports
        const reportData = document.getElementById(mainTab)?.querySelectorAll('table tr');
        
        if (!reportData || reportData.length <= 1) {
          enhancedToast.warning("لا توجد بيانات كافية للتصدير");
          return;
        }
        
        const headers = Array.from(reportData[0].querySelectorAll('th')).map(th => th.textContent || '');
        const rows = Array.from(reportData).slice(1).map(row => 
          Array.from(row.querySelectorAll('td')).map(td => td.textContent || '')
        );
        
        const data = rows.map(row => {
          const obj: any = {};
          headers.forEach((header, i) => {
            obj[header] = row[i];
          });
          return obj;
        });
        
        exportAuditData(data);
      } else {
        // Export regular item report
        if (!selectedItemDetails) {
          enhancedToast.warning("يرجى اختيار عنصر للتصدير");
          return;
        }
        
        const exportData = [{
          كود: selectedItemDetails.code,
          الاسم: selectedItemDetails.name,
          الكمية: selectedItemDetails.quantity,
          الوحدة: selectedItemDetails.unit,
          التقرير: reportType === 'movement' ? 'حركة المخزون' : 'توزيع الاستهلاك',
          الفترة: timeRange === 'week' ? 'أسبوع' : 
                  timeRange === 'month' ? 'شهر' : 
                  timeRange === 'quarter' ? 'ربع سنوي' : 'سنوي'
        }];
        
        exportAuditData(exportData);
      }
      
      setTimeout(() => {
        enhancedToast.success("تم تصدير التقرير بنجاح");
      }, 1000);
    } catch (error) {
      console.error("Error exporting report:", error);
      enhancedToast.error("حدث خطأ أثناء تصدير التقرير");
    }
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">تقارير المخزون</h1>
            <p className="text-muted-foreground mt-1">تحليل وإحصائيات حركة المخزون والعناصر غير المستخدمة</p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleExportReport}
          >
            <Download size={16} />
            تصدير التقرير
          </Button>
        </div>
        
        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
          <TabsList className="w-full max-w-2xl mx-auto grid grid-cols-3">
            <TabsTrigger value="item-analysis" className="flex items-center gap-1">
              <BarChart3 size={16} />
              <span>تحليل العناصر</span>
            </TabsTrigger>
            <TabsTrigger value="unused-items" className="flex items-center gap-1">
              <AlertTriangle size={16} />
              <span>عناصر غير مستخدمة</span>
            </TabsTrigger>
            <TabsTrigger value="stagnant-items" className="flex items-center gap-1">
              <Clock size={16} />
              <span>عناصر راكدة</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="item-analysis" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ReportFilterCard
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
                categories={categories}
                items={items}
                isLoadingCategories={isLoadingCategories}
                isLoadingItems={isLoadingItems}
                isItemReport={isItemReport}
              />
              
              <ReportInfoCard
                selectedItemDetails={selectedItemDetails}
                isLoadingItemDetails={isLoadingItemDetails}
              />
            </div>
            
            <div className="bg-muted/30 rounded-lg p-6 border border-border/40 shadow-sm mt-6">
              <ReportContent
                selectedItem={selectedItem}
                selectedCategory={selectedCategory}
                isLoadingItemDetails={isLoadingItemDetails}
                selectedItemDetails={selectedItemDetails}
                reportType={reportType}
                setReportType={setReportType}
                timeRange={timeRange}
                setTimeRange={setTimeRange}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="unused-items" className="mt-6">
            <UnusedItemsReport />
          </TabsContent>
          
          <TabsContent value="stagnant-items" className="mt-6">
            <StagnantItemsReport />
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default InventoryReports;
