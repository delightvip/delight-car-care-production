
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import InventoryService from '@/services/InventoryService';
import { format } from 'date-fns';

const ProductDetails = () => {
  const [activeTab, setActiveTab] = useState('finished');
  const [searchQuery, setSearchQuery] = useState('');
  
  const inventoryService = InventoryService.getInstance();
  
  const { data: rawMaterials, isLoading: isLoadingRaw } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: () => inventoryService.getRawMaterials(),
  });
  
  const { data: packagingMaterials, isLoading: isLoadingPackaging } = useQuery({
    queryKey: ['packagingMaterials'],
    queryFn: () => inventoryService.getPackagingMaterials(),
  });
  
  const { data: semiFinishedProducts, isLoading: isLoadingSemi } = useQuery({
    queryKey: ['semiFinishedProducts'],
    queryFn: () => inventoryService.getSemiFinishedProducts(),
  });
  
  const { data: finishedProducts, isLoading: isLoadingFinished } = useQuery({
    queryKey: ['finishedProducts'],
    queryFn: () => inventoryService.getFinishedProducts(),
  });
  
  const filterItems = (items) => {
    if (!items) return [];
    if (!searchQuery) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.code.toLowerCase().includes(query)
    );
  };
  
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.warning('لا توجد بيانات للتصدير');
      return;
    }
    
    const headers = Object.keys(data[0]).filter(key => 
      key !== 'updated_at' && key !== 'created_at' && typeof data[0][key] !== 'object'
    );
    
    let csvContent = headers.join(',') + '\n';
    
    data.forEach(item => {
      const row = headers.map(header => {
        const value = item[header];
        // التعامل مع القيم التي قد تحتوي على فواصل
        const valueStr = value === null ? '' : String(value);
        return `"${valueStr.replace(/"/g, '""')}"`;
      });
      csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('تم تصدير البيانات بنجاح');
  };
  
  const isLoading = isLoadingRaw || isLoadingPackaging || isLoadingSemi || isLoadingFinished;
  
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex flex-row items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">تفاصيل المنتجات</h1>
              <p className="text-muted-foreground">عرض تفاصيل وخصائص المنتجات</p>
            </div>
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">تفاصيل المنتجات</h1>
            <p className="text-muted-foreground">عرض تفاصيل وخصائص المنتجات</p>
          </div>
        </div>
        
        <Tabs defaultValue="finished" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="finished">المنتجات النهائية</TabsTrigger>
            <TabsTrigger value="semi">المنتجات النصف مصنّعة</TabsTrigger>
            <TabsTrigger value="raw">المواد الأولية</TabsTrigger>
            <TabsTrigger value="packaging">مواد التعبئة</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2 space-x-reverse mb-4">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المنتجات..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => {
                switch(activeTab) {
                  case 'finished':
                    exportToCSV(finishedProducts, 'finished_products');
                    break;
                  case 'semi':
                    exportToCSV(semiFinishedProducts, 'semi_finished_products');
                    break;
                  case 'raw':
                    exportToCSV(rawMaterials, 'raw_materials');
                    break;
                  case 'packaging':
                    exportToCSV(packagingMaterials, 'packaging_materials');
                    break;
                }
              }}
              title="تصدير إلى CSV"
            >
              <FileDown className="h-4 w-4" />
            </Button>
          </div>
          
          <TabsContent value="finished" className="mt-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>المنتجات النهائية</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الكود</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الوحدة</TableHead>
                      <TableHead className="text-right">المخزون الحالي</TableHead>
                      <TableHead className="text-right">المخزون الأدنى</TableHead>
                      <TableHead className="text-right">التكلفة</TableHead>
                      <TableHead>المنتج النصف مصنع</TableHead>
                      <TableHead className="text-right">الكمية المستخدمة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterItems(finishedProducts).length > 0 ? (
                      filterItems(finishedProducts).map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.code}</TableCell>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.unit}</TableCell>
                          <TableCell className="text-right">{product.quantity.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{product.min_stock}</TableCell>
                          <TableCell className="text-right">{product.unit_cost.toFixed(2)}</TableCell>
                          <TableCell>{semiFinishedProducts?.find(s => s.id === product.semi_finished_id)?.name || '-'}</TableCell>
                          <TableCell className="text-right">{product.semi_finished_quantity}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                          لا توجد منتجات للعرض
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="semi" className="mt-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>المنتجات النصف مصنّعة</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الكود</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الوحدة</TableHead>
                      <TableHead className="text-right">المخزون الحالي</TableHead>
                      <TableHead className="text-right">المخزون الأدنى</TableHead>
                      <TableHead className="text-right">التكلفة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterItems(semiFinishedProducts).length > 0 ? (
                      filterItems(semiFinishedProducts).map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.code}</TableCell>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.unit}</TableCell>
                          <TableCell className="text-right">{product.quantity.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{product.min_stock}</TableCell>
                          <TableCell className="text-right">{product.unit_cost.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          لا توجد منتجات للعرض
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="raw" className="mt-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>المواد الأولية</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الكود</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الوحدة</TableHead>
                      <TableHead className="text-right">المخزون الحالي</TableHead>
                      <TableHead className="text-right">المخزون الأدنى</TableHead>
                      <TableHead className="text-right">التكلفة</TableHead>
                      <TableHead className="text-right">الأهمية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterItems(rawMaterials).length > 0 ? (
                      filterItems(rawMaterials).map((material) => (
                        <TableRow key={material.id}>
                          <TableCell className="font-medium">{material.code}</TableCell>
                          <TableCell>{material.name}</TableCell>
                          <TableCell>{material.unit}</TableCell>
                          <TableCell className="text-right">{material.quantity.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{material.min_stock}</TableCell>
                          <TableCell className="text-right">{material.unit_cost.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{material.importance || 0}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          لا توجد مواد للعرض
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="packaging" className="mt-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>مواد التعبئة</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الكود</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الوحدة</TableHead>
                      <TableHead className="text-right">المخزون الحالي</TableHead>
                      <TableHead className="text-right">المخزون الأدنى</TableHead>
                      <TableHead className="text-right">التكلفة</TableHead>
                      <TableHead className="text-right">الأهمية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterItems(packagingMaterials).length > 0 ? (
                      filterItems(packagingMaterials).map((material) => (
                        <TableRow key={material.id}>
                          <TableCell className="font-medium">{material.code}</TableCell>
                          <TableCell>{material.name}</TableCell>
                          <TableCell>{material.unit}</TableCell>
                          <TableCell className="text-right">{material.quantity.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{material.min_stock}</TableCell>
                          <TableCell className="text-right">{material.unit_cost.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{material.importance || 0}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          لا توجد مواد للعرض
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default ProductDetails;
