import React, { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
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
import { 
  Package, 
  Beaker, 
  Box, 
  ShoppingBag, 
  FileDown, 
  RefreshCcw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase, lowStockQueries } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import PageTransition from '@/components/ui/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchLowStockItems, getItemTypeBgColor } from '@/services/NotificationService';

export default function LowStockItems() {
  const [allItems, setAllItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({
    rawMaterials: 0,
    semiFinished: 0,
    packaging: 0,
    finished: 0,
    total: 0
  });

  useEffect(() => {
    loadLowStockItems();
  }, []);

  const loadLowStockItems = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Loading low stock items page data...");
      const result = await fetchLowStockItems();
      
      setAllItems(result.items);
      setCounts({
        rawMaterials: result.counts.rawMaterials,
        semiFinished: result.counts.semiFinished,
        packaging: result.counts.packaging,
        finished: result.counts.finished,
        total: result.totalCount
      });
    } catch (error) {
      console.error("Error loading low stock items:", error);
      setError("حدث خطأ أثناء تحميل عناصر المخزون المنخفض");
      toast.error("حدث خطأ أثناء تحميل عناصر المخزون المنخفض");
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredItems = () => {
    if (activeTab === 'all') {
      return allItems;
    }
    return allItems.filter(item => item.type === activeTab);
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
        return null;
    }
  };

  const exportToCSV = () => {
    const items = getFilteredItems();
    if (items.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    
    let csvContent = "الكود,الاسم,الكمية الحالية,الحد الأدنى,الوحدة,النوع\n";
    
    items.forEach(item => {
      csvContent += `${item.code},"${item.name}",${item.quantity},${item.min_stock},"${item.unit}","${item.type_name}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `low_stock_items_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("تم تصدير البيانات بنجاح");
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المخزون المنخفض</h1>
            <p className="text-muted-foreground">عناصر المخزون التي انخفضت عن الحد الأدنى المطلوب</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadLowStockItems}>
              <RefreshCcw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <FileDown className="h-4 w-4 ml-2" />
              تصدير CSV
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="all" className="flex items-center gap-2">
              الكل
              <Badge variant="outline">{counts.total}</Badge>
            </TabsTrigger>
            <TabsTrigger value="raw" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              مواد أولية
              <Badge variant="outline">{counts.rawMaterials}</Badge>
            </TabsTrigger>
            <TabsTrigger value="semi" className="flex items-center gap-2">
              <Beaker className="h-4 w-4" />
              نصف مصنعة
              <Badge variant="outline">{counts.semiFinished}</Badge>
            </TabsTrigger>
            <TabsTrigger value="packaging" className="flex items-center gap-2">
              <Box className="h-4 w-4" />
              مواد تعبئة
              <Badge variant="outline">{counts.packaging}</Badge>
            </TabsTrigger>
            <TabsTrigger value="finished" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              منتجات نهائية
              <Badge variant="outline">{counts.finished}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <Card>
              <CardHeader>
                <CardTitle>عناصر المخزون المنخفض {activeTab !== 'all' && ` - ${
                  activeTab === 'raw' ? 'مواد أولية' :
                  activeTab === 'semi' ? 'منتجات نصف مصنعة' :
                  activeTab === 'packaging' ? 'مستلزمات تعبئة' :
                  'منتجات نهائية'
                }`}</CardTitle>
                <CardDescription>
                  العناصر التي انخفض مخزونها عن الحد الأدنى المسموح به
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : error ? (
                  <div className="bg-destructive/10 p-4 rounded-md text-destructive">
                    {error}
                  </div>
                ) : getFilteredItems().length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">الكود</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead className="text-center">الكمية الحالية</TableHead>
                        <TableHead className="text-center">الحد الأدنى</TableHead>
                        <TableHead className="text-center">الوحدة</TableHead>
                        <TableHead className="text-center">النوع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredItems().map((item) => (
                        <TableRow key={`${item.type}-${item.id}`}>
                          <TableCell className="font-medium">{item.code}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-center">{item.min_stock}</TableCell>
                          <TableCell className="text-center">{item.unit}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <Badge variant="outline" className="flex items-center gap-1">
                                {getItemTypeIcon(item.type)}
                                {item.type_name}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    لا توجد عناصر منخفضة المخزون حالياً
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
