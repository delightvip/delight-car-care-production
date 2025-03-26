
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus, Download, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InventoryService from '@/services/InventoryService';
import { Badge } from '@/components/ui/badge';
import { InventoryItem } from '@/types/inventoryTypes';

interface InventoryProps {
  type: 'raw-materials' | 'packaging' | 'semi-finished' | 'finished-products';
  title: string;
}

const Inventory = ({ type, title }: InventoryProps) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const navigate = useNavigate();
  
  const { data: inventory, isLoading, error, refetch } = useQuery<InventoryItem[]>({
    queryKey: ['inventory', type],
    queryFn: async () => {
      const service = InventoryService.getInstance();
      switch (type) {
        case 'raw-materials':
          return service.getRawMaterials();
        case 'packaging':
          return service.getPackagingMaterials();
        case 'semi-finished':
          return service.getSemiFinishedProducts();
        case 'finished-products':
          return service.getFinishedProducts();
        default:
          return [];
      }
    }
  });
  
  const handleAddNew = () => {
    navigate(`/inventory/${type}/add`);
  };
  
  const exportToCSV = () => {
    // Implementation for exporting data to CSV
    const csvContent = "data:text/csv;charset=utf-8," 
      + "الكود,الاسم,الكمية,الوحدة,المخزون الأدنى,التكلفة\n"
      + filteredItems.map(item => 
          `${item.code},${item.name},${item.quantity},${item.unit},${item.min_stock},${item.unit_cost}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const filteredItems = React.useMemo(() => {
    if (!inventory) return [];
    
    if (!searchQuery.trim()) return inventory;
    
    const query = searchQuery.toLowerCase().trim();
    return inventory.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.code.toLowerCase().includes(query)
    );
  }, [inventory, searchQuery]);

  // Navigate to product details when row is clicked
  const handleRowClick = (itemId: number) => {
    navigate(`/inventory/${type}/${itemId}`);
  };
  
  if (isLoading) {
    return (
      <PageTransition>
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }
  
  if (error) {
    return (
      <PageTransition>
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-10">
                <p className="text-red-500 text-lg mb-2">حدث خطأ أثناء جلب البيانات</p>
                <Button onClick={() => refetch()}>إعادة المحاولة</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <div className="container mx-auto p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">{title}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 ml-2" />
              تصدير
            </Button>
            <Button onClick={handleAddNew}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة جديد
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>قائمة {title}</CardTitle>
              <div className="relative w-full max-w-xs">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="بحث..." 
                  className="w-full pr-10" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الكود</TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">الوحدة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <TableRow key={item.id} onClick={() => handleRowClick(item.id)} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="text-right">{item.code}</TableCell>
                      <TableCell className="text-right font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-right">{item.unit}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity <= item.min_stock ? (
                          <Badge variant="destructive">مخزون منخفض</Badge>
                        ) : (
                          <Badge variant="outline">متوفر</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      لا توجد عناصر متاحة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Inventory;
