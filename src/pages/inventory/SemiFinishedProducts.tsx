import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Beaker, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash, 
  Eye 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PageTransition from '@/components/ui/PageTransition';

// Define types for the data
interface SemiFinishedProduct {
  id: number;
  code: string;
  name: string;
  quantity: number;
  min_stock: number;
  unit: string;
  cost_price?: number;
}

const SemiFinishedProducts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const fetchSemiFinishedProducts = async (): Promise<SemiFinishedProduct[]> => {
    try {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('id, code, name, quantity, min_stock, unit, cost_price')
        .order('name');
        
      if (error) throw error;
      
      // Properly cast the data to the expected type
      return data as SemiFinishedProduct[];
    } catch (error) {
      console.error('Error fetching semi-finished products:', error);
      return [];
    }
  };
  
  // Use the fetchSemiFinishedProducts function in your query
  const { data: products, isLoading } = useQuery({
    queryKey: ['semiFinishedProducts'],
    queryFn: fetchSemiFinishedProducts
  });
  
  const filteredProducts = products?.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المنتجات نصف المصنعة</h1>
            <p className="text-muted-foreground">إدارة المنتجات نصف المصنعة ومتابعة المخزون</p>
          </div>
          <Button asChild>
            <Link to="/inventory/semi-finished/add">
              <Plus className="ml-2 h-4 w-4" />
              إضافة منتج جديد
            </Link>
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">قائمة المنتجات نصف المصنعة</CardTitle>
            <CardDescription>
              عرض وإدارة جميع المنتجات نصف المصنعة في المخزون
            </CardDescription>
            <div className="relative mt-2">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث عن منتج..."
                className="pl-3 pr-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredProducts && filteredProducts.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">الكود</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead className="text-center">الكمية</TableHead>
                      <TableHead className="text-center">الحد الأدنى</TableHead>
                      <TableHead className="text-center">الوحدة</TableHead>
                      <TableHead className="text-center">التكلفة</TableHead>
                      <TableHead className="text-center">الحالة</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.code}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Beaker className="h-4 w-4 text-purple-500" />
                            <span>{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{product.quantity}</TableCell>
                        <TableCell className="text-center">{product.min_stock}</TableCell>
                        <TableCell className="text-center">{product.unit}</TableCell>
                        <TableCell className="text-center">
                          {product.cost_price ? `${product.cost_price.toFixed(2)} ج.م` : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {product.quantity <= product.min_stock ? (
                            <Badge variant="destructive">منخفض</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              متوفر
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/inventory/semi-finished/${product.id}`}>
                                  <Eye className="ml-2 h-4 w-4" />
                                  <span>عرض</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/inventory/semi-finished/edit/${product.id}`}>
                                  <Edit className="ml-2 h-4 w-4" />
                                  <span>تعديل</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash className="ml-2 h-4 w-4" />
                                <span>حذف</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Beaker className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">لا توجد منتجات</h3>
                <p className="text-muted-foreground mt-2 mb-4">
                  لم يتم العثور على منتجات نصف مصنعة. يمكنك إضافة منتج جديد.
                </p>
                <Button asChild>
                  <Link to="/inventory/semi-finished/add">
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة منتج جديد
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default SemiFinishedProducts;
