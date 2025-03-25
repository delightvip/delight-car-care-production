
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

const Payments = () => {
  const [activeTab, setActiveTab] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const commercialService = CommercialService.getInstance();
  
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => commercialService.getPayments(),
  });
  
  const filteredPayments = React.useMemo(() => {
    if (!payments) return [];
    
    let filtered = payments;
    
    if (activeTab !== 'all') {
      filtered = payments.filter(p => p.payment_type === activeTab);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.party_name?.toLowerCase().includes(query) ||
        p.amount.toString().includes(query)
      );
    }
    
    return filtered;
  }, [payments, activeTab, searchQuery]);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المدفوعات والتحصيلات</h1>
            <p className="text-muted-foreground">إدارة المدفوعات والتحصيلات النقدية</p>
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
            <h1 className="text-3xl font-bold tracking-tight">المدفوعات والتحصيلات</h1>
            <p className="text-muted-foreground">إدارة المدفوعات والتحصيلات النقدية</p>
          </div>
          <Button>
            <PlusCircle className="ml-2 h-4 w-4" />
            تسجيل معاملة جديدة
          </Button>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="collection">تحصيلات</TabsTrigger>
            <TabsTrigger value="disbursement">مدفوعات</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold">
                  {activeTab === 'all' ? 'جميع المعاملات' :
                   activeTab === 'collection' ? 'التحصيلات' : 'المدفوعات'}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث في المعاملات..."
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
                      <TableHead>رقم المعاملة</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الطرف</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead className="text-left">المبلغ</TableHead>
                      <TableHead>طريقة الدفع</TableHead>
                      <TableHead>ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length > 0 ? (
                      filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant={payment.payment_type === 'collection' ? 'default' : 'destructive'}>
                              {payment.payment_type === 'collection' ? 'تحصيل' : 'دفع'}
                            </Badge>
                          </TableCell>
                          <TableCell>{payment.party_name}</TableCell>
                          <TableCell>
                            {format(new Date(payment.date), 'yyyy-MM-dd')}
                          </TableCell>
                          <TableCell className="text-left font-medium">
                            {payment.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>{payment.method}</TableCell>
                          <TableCell>{payment.notes || '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          لا توجد معاملات للعرض
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

export default Payments;
