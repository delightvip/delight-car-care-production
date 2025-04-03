
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InventoryMovement } from '@/types/inventoryTypes';
import { MovementTypeBadge } from './MovementTypeBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface ProductMovementHistoryProps {
  itemId: string;
  itemType: string;
  itemUnit?: string;
}

const PAGE_SIZE = 10;

const ProductMovementHistory: React.FC<ProductMovementHistoryProps> = ({ 
  itemId, 
  itemType,
  itemUnit = 'وحدة'
}) => {
  const [page, setPage] = useState(1);
  
  // Fetch movement data
  const { data: movements, isLoading, error } = useQuery({
    queryKey: ['inventory-movements', itemId, itemType],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('get_inventory_movements_by_item', {
          p_item_id: itemId,
          p_item_type: itemType
        });
        
        if (error) throw error;
        return data as InventoryMovement[];
      } catch (err) {
        console.error("Error fetching inventory movements:", err);
        return [] as InventoryMovement[];
      }
    }
  });
  
  // Calculate pagination
  const totalPages = movements ? Math.ceil(movements.length / PAGE_SIZE) : 0;
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const currentPageItems = movements ? movements.slice(startIndex, endIndex) : [];
  
  // Pagination controls
  const goToNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };
  
  const goToPreviousPage = () => {
    if (page > 1) setPage(page - 1);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>سجل حركة المخزون</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error || !movements) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>سجل حركة المخزون</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500">
            حدث خطأ أثناء تحميل البيانات
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (movements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>سجل حركة المخزون</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            لا توجد حركات مخزون لهذا الصنف
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل حركة المخزون</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>نوع الحركة</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>الرصيد بعد</TableHead>
                <TableHead>السبب</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPageItems.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>
                    {format(new Date(movement.created_at), 'dd MMM yyyy', { locale: ar })}
                  </TableCell>
                  <TableCell>
                    <MovementTypeBadge type={movement.movement_type} />
                  </TableCell>
                  <TableCell>
                    <span className={`${movement.quantity > 0 ? 'text-green-500' : 'text-red-500'} font-semibold`}>
                      {movement.quantity > 0 ? '+' : ''}{movement.quantity} {itemUnit}
                    </span>
                  </TableCell>
                  <TableCell>
                    {movement.balance_after} {itemUnit}
                  </TableCell>
                  <TableCell>
                    {movement.reason || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToPreviousPage} 
              disabled={page === 1}
            >
              <ChevronRight className="h-4 w-4 ml-1" />
              السابق
            </Button>
            <div className="text-sm text-muted-foreground">
              صفحة {page} من {totalPages}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNextPage} 
              disabled={page === totalPages}
            >
              التالي
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductMovementHistory;
