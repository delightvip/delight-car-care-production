
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Eye } from 'lucide-react';
import InventoryService, { PackagingMaterial } from '@/services/InventoryService';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ImportanceBadge } from '@/components/inventory/low-stock/ImportanceBadge';

interface PackagingMaterialsListProps {
  filterType: 'all' | 'low-stock' | 'high-value';
  searchQuery: string;
  onEdit: (material: PackagingMaterial) => void;
  onDelete: (material: PackagingMaterial) => void;
  onView: (material: PackagingMaterial) => void;
}

const PackagingMaterialsList: React.FC<PackagingMaterialsListProps> = ({
  filterType,
  searchQuery,
  onEdit,
  onDelete,
  onView
}) => {
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const inventoryService = InventoryService.getInstance();
  
  const { data: packagingMaterials, isLoading, isError } = useQuery({
    queryKey: ['packagingMaterials'],
    queryFn: () => inventoryService.getPackagingMaterials(),
  });
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full h-10" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-16" />
          ))}
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-lg font-medium">خطأ في تحميل البيانات</h3>
        <p className="text-muted-foreground mt-2">حدث خطأ أثناء تحميل بيانات مواد التعبئة. يرجى المحاولة مرة أخرى.</p>
      </div>
    );
  }
  
  if (!packagingMaterials || packagingMaterials.length === 0) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-lg font-medium">لا توجد مواد تعبئة</h3>
        <p className="text-muted-foreground mt-2">لم يتم العثور على أي مواد تعبئة. قم بإضافة مواد جديدة.</p>
      </div>
    );
  }
  
  // تطبيق الفلتر
  let filteredMaterials = [...packagingMaterials];
  
  if (filterType === 'low-stock') {
    filteredMaterials = filteredMaterials.filter(material => material.quantity < material.min_stock);
  } else if (filterType === 'high-value') {
    filteredMaterials = filteredMaterials.filter(material => material.unit_cost * material.quantity > 1000);
  }
  
  // تطبيق البحث
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredMaterials = filteredMaterials.filter(material => 
      material.name.toLowerCase().includes(query) || 
      material.code.toLowerCase().includes(query)
    );
  }
  
  // ترتيب النتائج
  filteredMaterials.sort((a, b) => {
    const fieldA = a[sortField as keyof PackagingMaterial];
    const fieldB = b[sortField as keyof PackagingMaterial];
    
    if (fieldA < fieldB) return sortDirection === 'asc' ? -1 : 1;
    if (fieldA > fieldB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const getSortIcon = (field: string) => {
    if (field !== sortField) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };
  
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort('code')}>
              الرمز {getSortIcon('code')}
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
              اسم المادة {getSortIcon('name')}
            </TableHead>
            <TableHead className="text-center cursor-pointer" onClick={() => handleSort('quantity')}>
              الكمية {getSortIcon('quantity')}
            </TableHead>
            <TableHead className="text-center">وحدة القياس</TableHead>
            <TableHead className="text-center cursor-pointer" onClick={() => handleSort('min_stock')}>
              الحد الأدنى {getSortIcon('min_stock')}
            </TableHead>
            <TableHead className="text-center cursor-pointer" onClick={() => handleSort('unit_cost')}>
              التكلفة {getSortIcon('unit_cost')}
            </TableHead>
            <TableHead className="text-center cursor-pointer" onClick={() => handleSort('importance')}>
              الأهمية {getSortIcon('importance')}
            </TableHead>
            <TableHead className="text-center">الحالة</TableHead>
            <TableHead className="text-center">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMaterials.map((material) => (
            <TableRow key={material.id}>
              <TableCell className="font-medium">{material.code}</TableCell>
              <TableCell>{material.name}</TableCell>
              <TableCell className="text-center">{material.quantity}</TableCell>
              <TableCell className="text-center">{material.unit}</TableCell>
              <TableCell className="text-center">{material.min_stock}</TableCell>
              <TableCell className="text-center">{material.unit_cost}</TableCell>
              <TableCell className="text-center">
                <ImportanceBadge importance={material.importance || 0} />
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={material.quantity < material.min_stock ? "destructive" : "success"}>
                  {material.quantity < material.min_stock ? "منخفض" : "متوفر"}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onView(material)}>
                    <Eye size={18} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(material)}>
                    <Pencil size={18} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(material)}>
                    <Trash2 size={18} className="text-destructive" />
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
