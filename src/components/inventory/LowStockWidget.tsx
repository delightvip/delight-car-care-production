
import React, { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Package, Beaker, Box, ShoppingBag, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { fetchLowStockItems, calculateStockPercentage, getStockStatus } from '@/services/NotificationService';

interface LowStockWidgetProps {
  limit?: number;
}

export const LowStockWidget: React.FC<LowStockWidgetProps> = ({ limit = 5 }) => {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    loadLowStockItems();
  }, []);
  
  const loadLowStockItems = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchLowStockItems();
      setItems(result.items.slice(0, limit));
    } catch (error) {
      console.error("Error loading low stock items:", error);
      setError("حدث خطأ أثناء تحميل عناصر المخزون المنخفض");
    } finally {
      setIsLoading(false);
    }
  };
  
  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'raw':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'semi':
        return <Beaker className="h-4 w-4 text-purple-600" />;
      case 'packaging':
        return <Box className="h-4 w-4 text-green-600" />;
      case 'finished':
        return <ShoppingBag className="h-4 w-4 text-amber-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };
  
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">
          المخزون المنخفض
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/inventory/low-stock')}
          className="text-xs"
        >
          عرض الكل
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 p-4 rounded-md text-destructive text-center">
            {error}
          </div>
        ) : items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الصنف</TableHead>
                <TableHead className="text-center">الكمية</TableHead>
                <TableHead className="text-center">الحد الأدنى</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const percentage = calculateStockPercentage(item.quantity, item.min_stock);
                const status = getStockStatus(percentage);
                
                return (
                  <TableRow key={`${item.type}-${item.id}`}>
                    <TableCell>
                      <div className="flex items-center">
                        {getItemTypeIcon(item.type)}
                        <span className="ml-2 font-medium">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.min_stock} {item.unit}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium">
                            {percentage.toFixed(0)}%
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${status.color}`}
                          >
                            {status.label}
                          </Badge>
                        </div>
                        <Progress 
                          value={percentage} 
                          className="h-2"
                          indicatorClassName={percentage <= 30 ? "bg-red-600" : 
                                            percentage <= 60 ? "bg-amber-600" : 
                                            "bg-green-600"}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            لا توجد عناصر منخفضة المخزون حالياً
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LowStockWidget;
