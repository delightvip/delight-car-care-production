
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ItemCategory, InventoryItem } from '../../../pages/inventory/InventoryReports';

interface ReportFilterCardProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedItem: string | null;
  setSelectedItem: (item: string | null) => void;
  categories: ItemCategory[] | undefined;
  items: InventoryItem[] | undefined;
  isLoadingCategories: boolean;
  isLoadingItems: boolean;
  isItemReport: boolean;
}

const ReportFilterCard: React.FC<ReportFilterCardProps> = ({
  selectedCategory,
  setSelectedCategory,
  selectedItem,
  setSelectedItem,
  categories,
  items,
  isLoadingCategories,
  isLoadingItems,
  isItemReport
}) => {
  return (
    <>
      <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">نوع الصنف</CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedCategory} 
            onValueChange={setSelectedCategory}
            disabled={isItemReport}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر نوع المخزون" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingCategories ? (
                <div className="p-2">
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name} ({category.itemCount})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">الصنف</CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedItem || ''} 
            onValueChange={setSelectedItem}
            disabled={isItemReport}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الصنف" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingItems ? (
                <div className="p-2">
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : items?.length === 0 ? (
                <SelectItem value="none" disabled>
                  لا توجد أصناف
                </SelectItem>
              ) : (
                items?.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </>
  );
};

export default ReportFilterCard;
