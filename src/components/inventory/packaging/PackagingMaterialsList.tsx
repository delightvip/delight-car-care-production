
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, ArrowUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface PackagingMaterialsListProps {
  filterType: 'all' | 'low-stock' | 'high-value';
  searchQuery: string;
  onEdit: (material: any) => void;
  onDelete: (material: any) => void;
  onView: (material: any) => void;
}

const PackagingMaterialsList: React.FC<PackagingMaterialsListProps> = ({
  filterType,
  searchQuery,
  onEdit,
  onDelete,
  onView
}) => {
  const { data: materials, isLoading, error } = useQuery({
    queryKey: ['packagingMaterials', filterType],
    queryFn: async () => {
      let query = supabase
        .from('packaging_materials')
        .select('*');
      
      if (filterType === 'low-stock') {
        query = query.lt('quantity', supabase.raw('min_stock'));
      } else if (filterType === 'high-value') {
        query = query.order('unit_cost', { ascending: false }).limit(10);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // Filter by search query (client-side)
  const filteredMaterials = React.useMemo(() => {
    if (!materials) return [];
    
    if (!searchQuery.trim()) return materials;
    
    const lowerSearchQuery = searchQuery.toLowerCase();
    return materials.filter(
      material => 
        material.name.toLowerCase().includes(lowerSearchQuery) ||
        material.code.toLowerCase().includes(lowerSearchQuery)
    );
  }, [materials, searchQuery]);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-10 border rounded-md">
        <p className="text-destructive">حدث خطأ أثناء تحميل البيانات</p>
        <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
      </div>
    );
  }
  
  if (filteredMaterials.length === 0) {
    return (
      <div className="text-center py-10 border rounded-md">
        <p className="text-muted-foreground">لا توجد مستلزمات تعبئة مطابقة للبحث</p>
      </div>
    );
  }
  
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">كود</TableHead>
            <TableHead>الاسم</TableHead>
            <TableHead>الوحدة</TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end">
                <span>المخزون</span>
                <ArrowUpDown size={16} className="mr-2" />
              </div>
            </TableHead>
            <TableHead className="text-right">الحد الأدنى</TableHead>
            <TableHead className="text-right">التكلفة</TableHead>
            <TableHead className="text-right">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMaterials.map(material => (
            <TableRow key={material.id}>
              <TableCell className="font-medium">{material.code}</TableCell>
              <TableCell>{material.name}</TableCell>
              <TableCell>{material.unit}</TableCell>
              <TableCell className="text-right">
                {material.quantity < material.min_stock ? (
                  <Badge variant="destructive">{material.quantity}</Badge>
                ) : (
                  material.quantity
                )}
              </TableCell>
              <TableCell className="text-right">{material.min_stock}</TableCell>
              <TableCell className="text-right">{material.unit_cost} ج.م</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onView(material)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onEdit(material)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onDelete(material)}
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

export default PackagingMaterialsList;
