
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface SemiFinishedListProps {
  filterType: 'all' | 'low-stock' | 'high-value';
  searchQuery: string;
  onEdit: (product: any) => void;
  onDelete: (product: any) => void;
  onView: (product: any) => void;
}

const SemiFinishedList: React.FC<SemiFinishedListProps> = ({
  filterType,
  searchQuery,
  onEdit,
  onDelete,
  onView
}) => {
  const {
    data: products,
    isLoading,
    error
  } = useQuery({
    queryKey: ['semiFinishedProducts', filterType],
    queryFn: async () => {
      let query = supabase
        .from('semi_finished_products')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (filterType === 'low-stock') {
        query = query.filter('quantity', 'lt', 'min_stock');
      } else if (filterType === 'high-value') {
        query = query.order('unit_cost', { ascending: false }).limit(20);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // Filter products based on search query
  const filteredProducts = searchQuery
    ? products?.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;
  
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-4 text-destructive">
        حدث خطأ أثناء تحميل البيانات
      </div>
    );
  }
  
  if (!filteredProducts?.length) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        لا توجد منتجات نصف مصنعة{' '}
        {filterType === 'low-stock' ? 'منخفضة المخزون' : filterType === 'high-value' ? 'عالية القيمة' : ''}
        {searchQuery ? ` تطابق "${searchQuery}"` : ''}
      </div>
    );
  }
  
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">الكود</TableHead>
            <TableHead>الاسم</TableHead>
            <TableHead className="text-center">الكمية</TableHead>
            <TableHead className="text-center">الوحدة</TableHead>
            <TableHead className="text-center">الحد الأدنى</TableHead>
            <TableHead className="text-center">التكلفة</TableHead>
            <TableHead className="text-center">سعر البيع</TableHead>
            <TableHead className="text-center">الحالة</TableHead>
            <TableHead className="text-center w-[180px]">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.code}</TableCell>
              <TableCell>{product.name}</TableCell>
              <TableCell className="text-center">{product.quantity}</TableCell>
              <TableCell className="text-center">{product.unit}</TableCell>
              <TableCell className="text-center">{product.min_stock}</TableCell>
              <TableCell className="text-center">{product.unit_cost}</TableCell>
              <TableCell className="text-center">{product.sales_price}</TableCell>
              <TableCell className="text-center">
                <StockStatusBadge quantity={product.quantity} minStock={product.min_stock} />
              </TableCell>
              <TableCell>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onView(product)}
                    title="عرض التفاصيل"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(product)}
                    title="تعديل"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(product)}
                    title="حذف"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

// Helper component for stock status badge
const StockStatusBadge = ({ quantity, minStock }: { quantity: number, minStock: number }) => {
  if (quantity <= 0) {
    return <Badge variant="destructive">نفذ المخزون</Badge>;
  } else if (quantity < minStock) {
    return <Badge variant="warning" className="bg-amber-500">منخفض</Badge>;
  } else {
    return <Badge variant="success" className="bg-green-600">متوفر</Badge>;
  }
};

export default SemiFinishedList;
