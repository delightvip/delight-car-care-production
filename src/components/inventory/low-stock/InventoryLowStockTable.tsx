
import React, { useState } from 'react';
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import DataTable from '@/components/ui/data-table';
import { InventoryLowStockTableProps } from './types';
import { getTableColumns } from './TableColumns';
import { useInventoryData } from './useInventoryData';

export const InventoryLowStockTable: React.FC<InventoryLowStockTableProps> = ({
  data,
  isLoading,
  sortOrder,
  type
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const sortedData = useInventoryData(data, searchTerm, sortOrder);
  const columns = getTableColumns();
  
  const noDataMessage = (() => {
    const typeMessages = {
      raw: 'لا توجد مواد أولية منخفضة المخزون',
      semi: 'لا توجد منتجات نصف مصنعة منخفضة المخزون',
      packaging: 'لا توجد مستلزمات تعبئة منخفضة المخزون',
      finished: 'لا توجد منتجات نهائية منخفضة المخزون'
    };
    
    return typeMessages[type] || 'لا توجد عناصر منخفضة المخزون';
  })();
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <CardTitle>عناصر المخزون المنخفض</CardTitle>
            <CardDescription>
              العناصر التي يجب إعادة تعبئتها قريباً
            </CardDescription>
          </div>
          <div className="w-full md:w-64">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="بحث..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <DataTable
            data={sortedData}
            columns={columns}
            searchable={false}
            pagination={true}
            itemsPerPage={5}
            noDataMessage={noDataMessage}
          />
        )}
      </CardContent>
    </Card>
  );
};
