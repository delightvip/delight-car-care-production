
import React, { useMemo } from 'react';
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Search } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import DataTable from '@/components/ui/DataTable';
import { Skeleton } from '@/components/ui/skeleton';

interface InventoryItem {
  id: number;
  code: string;
  name: string;
  quantity: number;
  min_stock: number;
  unit: string;
  unit_cost?: number;
  importance?: number;
}

interface InventoryLowStockTableProps {
  data: InventoryItem[];
  isLoading: boolean;
  sortOrder: 'asc' | 'desc';
  type: 'raw' | 'semi' | 'packaging' | 'finished';
}

export const InventoryLowStockTable: React.FC<InventoryLowStockTableProps> = ({
  data,
  isLoading,
  sortOrder,
  type
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  
  // فلترة البيانات بناءً على مصطلح البحث
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);
  
  // ترتيب البيانات بناءً على النسبة المئوية للمخزون المتبقي
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const percentA = (a.quantity / a.min_stock) * 100;
      const percentB = (b.quantity / b.min_stock) * 100;
      
      return sortOrder === 'asc' 
        ? percentA - percentB 
        : percentB - percentA;
    });
  }, [filteredData, sortOrder]);
  
  // تعريف أعمدة الجدول
  const columns = useMemo(() => [
    {
      key: "code",
      title: "الرمز",
      render: (value: any, row: InventoryItem) => (
        <div className="font-medium">{row.code}</div>
      )
    },
    {
      key: "name",
      title: "الاسم",
      render: (value: any, row: InventoryItem) => (
        <div className="max-w-[200px] truncate" title={row.name}>
          {row.name}
        </div>
      )
    },
    {
      key: "current_stock",
      title: "المخزون الحالي",
      render: (value: any, row: InventoryItem) => (
        <div className="font-medium">
          {row.quantity} {row.unit}
        </div>
      )
    },
    {
      key: "min_stock",
      title: "الحد الأدنى",
      render: (value: any, row: InventoryItem) => (
        <div>
          {row.min_stock} {row.unit}
        </div>
      )
    },
    {
      key: "status",
      title: "الحالة",
      render: (value: any, row: InventoryItem) => {
        const percentage = (row.quantity / row.min_stock) * 100;
        const getColor = () => {
          if (percentage <= 30) return "text-red-600";
          if (percentage <= 60) return "text-amber-600";
          return "text-green-600";
        };
        
        const getProgressClasses = () => {
          if (percentage <= 30) return {
            bg: "bg-red-100",
            indicator: "bg-red-600"
          };
          if (percentage <= 60) return {
            bg: "bg-amber-100",
            indicator: "bg-amber-600"
          };
          return {
            bg: "bg-green-100",
            indicator: "bg-green-600"
          };
        };
        
        const progressClasses = getProgressClasses();
        
        return (
          <div className="w-full max-w-[180px]">
            <div className="flex justify-between items-center mb-1.5">
              <span className={`text-xs font-medium ${getColor()}`}>
                {percentage.toFixed(1)}%
              </span>
              <Badge variant="outline" className="text-xs">
                {percentage <= 30 ? 'حرج' : percentage <= 60 ? 'منخفض' : 'مقبول'}
              </Badge>
            </div>
            <Progress 
              value={percentage} 
              className={`h-2 ${progressClasses.bg}`}
              style={{
                backgroundColor: progressClasses.bg.replace('bg-', ''),
                "--tw-bg-opacity": 1
              }}
            />
          </div>
        );
      }
    },
    {
      key: "importance",
      title: "الأهمية",
      render: (value: any, row: InventoryItem) => {
        const importance = row.importance || 0;
        
        // تحديد مستوى الأهمية بناءً على القيمة
        const getImportanceLevel = () => {
          if (importance >= 8) return { label: 'عالية', color: 'bg-red-100 text-red-800' };
          if (importance >= 4) return { label: 'متوسطة', color: 'bg-amber-100 text-amber-800' };
          return { label: 'منخفضة', color: 'bg-green-100 text-green-800' };
        };
        
        const importanceLevel = getImportanceLevel();
        
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>{importance}</span>
            </div>
            <Badge variant="outline" className={`${importanceLevel.color}`}>
              {importanceLevel.label}
            </Badge>
          </div>
        );
      }
    }
  ], []);
  
  // رسالة عدم وجود بيانات
  const noDataMessage = useMemo(() => {
    const typeMessages = {
      raw: 'لا توجد مواد أولية منخفضة المخزون',
      semi: 'لا توجد منتجات نصف مصنعة منخفضة المخزون',
      packaging: 'لا توجد مستلزمات تعبئة منخفضة المخزون',
      finished: 'لا توجد منتجات نهائية منخفضة المخزون'
    };
    
    return typeMessages[type] || 'لا توجد عناصر منخفضة المخزون';
  }, [type]);
  
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
