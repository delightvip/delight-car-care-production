
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import CommercialService from '@/services/CommercialService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import PageTransition from '@/components/ui/PageTransition';
import { Badge } from '@/components/ui/badge';

const Returns = () => {
  const [activeTab, setActiveTab] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const commercialService = CommercialService.getInstance();
  
  const { data: returns, isLoading } = useQuery({
    queryKey: ['returns'],
    queryFn: () => commercialService.getReturns(),
  });
  
  const filteredReturns = React.useMemo(() => {
    if (!returns) return [];
    
    let filtered = returns;
    
    if (activeTab !== 'all') {
      filtered = returns.filter(r => r.return_type === activeTab);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.invoice_number?.toLowerCase().includes(query) ||
        r.amount.toString().includes(query)
      );
    }
    
    return filtered;
  }, [returns, activeTab, searchQuery]);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المرتجعات</h1>
            <p className="text-muted-foreground">إدارة مرتجعات المبيعات والمشتريات</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المرتجعات</h1>
            <p className="text-muted-foreground">إدارة مرتجعات المبيعات والمشتريات</p>
          </div>
          <Button>
            <PlusCircle className="ml-2 h-4 w-4" />
            إضافة مرتجع جديد
          </Button>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="sales_return">مرتجع مبيعات</TabsTrigger>
            <TabsTrigger value="purchase_return">مرتجع مشتريات</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold">
                  {activeTab === 'all' ? 'جميع المرتجعات' :
                   activeTab === 'sales_return' ? 'مرتجعات المبيعات' : 'مرتجعات المشتريات'}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث في المرتجعات..."
                      className="pl-8"
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
                      <TableHead>رقم المرتجع</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead className="text-left">المبلغ</TableHead>
                      <TableHead>ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReturns.length > 0 ? (
                      filteredReturns.map((returnItem) => (
                        <TableRow key={returnItem.id}>
                          <TableCell className="font-medium">
                            {returnItem.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge>
                              {returnItem.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}
                            </Badge>
                          </TableCell>
                          <TableCell>{returnItem.invoice_id ? returnItem.invoice_id.substring(0, 8) + '...' : '-'}</TableCell>
                          <TableCell>
                            {format(new Date(returnItem.date), 'yyyy-MM-dd')}
                          </TableCell>
                          <TableCell className="text-left font-medium">
                            {returnItem.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>{returnItem.notes || '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          لا توجد مرتجعات للعرض
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

export default Returns;
