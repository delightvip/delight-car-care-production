
import React, { useState, useEffect } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import ReportFilterCard from '@/components/inventory/reports/ReportFilterCard';
import ReportInfoCard from '@/components/inventory/reports/ReportInfoCard';
import ReportContent from '@/components/inventory/reports/ReportContent';

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
    toast.info("جاري تحضير التقرير للتنزيل...");
    
    setTimeout(() => {
      toast.success("تم تحضير التقرير بنجاح، جاري التنزيل");
    }, 1500);
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">تقارير المخزون</h1>
            <p className="text-muted-foreground mt-1">تحليل وإحصائيات حركة المخزون</p>
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
        
        <div className="bg-muted/30 rounded-lg p-6 border border-border/40 shadow-sm">
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
      </div>
    </PageTransition>
  );
};

export default InventoryReports;
