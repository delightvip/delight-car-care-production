import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import FinancialService from '@/services/financial/FinancialService';
import InvoiceService from '@/services/commercial/invoice/InvoiceService';

const ProfitAnalysisPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const financialService = FinancialService.getInstance();
  const invoiceService = InvoiceService.getInstance();

  // States
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(subMonths(new Date(), 1)),
    to: endOfMonth(new Date())
  });
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [profitAnalysis, setProfitAnalysis] = useState({
    totalSales: 0,
    totalCost: 0,
    grossProfit: 0,
    grossMargin: 0,
    profitByProduct: [] as any[]
  });
  const [selectedPeriod, setSelectedPeriod] = useState('lastMonth');

  // Load data when component mounts and when date range changes
  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    
    // Format dates
    const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
    const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;
    
    // Get sales invoices
    const allInvoices = await invoiceService.getInvoices();
    const filteredInvoices = allInvoices.filter(invoice => 
      invoice.invoice_type === 'sale' && 
      invoice.payment_status === 'confirmed' &&
      new Date(invoice.date) >= new Date(startDate!) &&
      new Date(invoice.date) <= new Date(endDate!)
    );
    
    setInvoices(filteredInvoices);
    
    // Calculate profit metrics
    let totalSales = 0;
    let totalCost = 0;
    const productProfits = new Map();
    
    for (const invoice of filteredInvoices) {
      totalSales += invoice.total_amount;
      
      // Get detailed invoice with items to calculate cost
      const detailedInvoice = await invoiceService.getInvoiceById(invoice.id);
      if (detailedInvoice && detailedInvoice.items) {
        for (const item of detailedInvoice.items) {
          // Assume we have a unit_cost field or can retrieve it
          const cost = item.quantity * (item.unit_cost || 0);
          totalCost += cost;
          
          // Track profit by product
          if (!productProfits.has(item.item_name)) {
            productProfits.set(item.item_name, {
              name: item.item_name,
              sales: 0,
              cost: 0,
              profit: 0,
              margin: 0,
              quantity: 0
            });
          }
          
          const productProfit = productProfits.get(item.item_name);
          productProfit.sales += item.quantity * item.unit_price;
          productProfit.cost += cost;
          productProfit.quantity += item.quantity;
        }
      }
    }
    
    // Calculate profit and margin for each product
    const profitByProduct = Array.from(productProfits.values()).map(product => {
      product.profit = product.sales - product.cost;
      product.margin = product.sales > 0 ? (product.profit / product.sales) * 100 : 0;
      return product;
    });
    
    // Sort products by profit
    profitByProduct.sort((a, b) => b.profit - a.profit);
    
    // Set the analysis state
    setProfitAnalysis({
      totalSales,
      totalCost,
      grossProfit: totalSales - totalCost,
      grossMargin: totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0,
      profitByProduct
    });
    
    setLoading(false);
  };

  const handleRefresh = () => {
    loadData();
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    
    let from, to;
    const today = new Date();
    
    switch (value) {
      case 'thisMonth':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'lastMonth':
        from = startOfMonth(subMonths(today, 1));
        to = endOfMonth(subMonths(today, 1));
        break;
      case 'last3Months':
        from = startOfMonth(subMonths(today, 3));
        to = endOfMonth(today);
        break;
      case 'last6Months':
        from = startOfMonth(subMonths(today, 6));
        to = endOfMonth(today);
        break;
      default:
        from = startOfMonth(subMonths(today, 1));
        to = endOfMonth(today);
    }
    
    setDateRange({ from, to });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">تحليل الأرباح</h1>
        
        <div className="flex flex-wrap gap-2">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="اختر الفترة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisMonth">الشهر الحالي</SelectItem>
              <SelectItem value="lastMonth">الشهر الماضي</SelectItem>
              <SelectItem value="last3Months">آخر 3 أشهر</SelectItem>
              <SelectItem value="last6Months">آخر 6 أشهر</SelectItem>
            </SelectContent>
          </Select>
          
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            onUpdate={({ range }) => {
              if (range?.from && range?.to) {
                setDateRange({ from: range.from, to: range.to });
              }
            }}
          />
          
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-700">إجمالي المبيعات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-800">{profitAnalysis.totalSales.toFixed(2)} ر.س</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-700">إجمالي التكلفة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-800">{profitAnalysis.totalCost.toFixed(2)} ر.س</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-700">إجمالي الربح</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-800">{profitAnalysis.grossProfit.toFixed(2)} ر.س</p>
            <p className="text-sm text-green-600">هامش الربح: {profitAnalysis.grossMargin.toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="byProduct">
        <TabsList className="w-full max-w-md mx-auto grid grid-cols-2">
          <TabsTrigger value="byProduct">الربح حسب المنتج</TabsTrigger>
          <TabsTrigger value="invoices">فواتير المبيعات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="byProduct" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>تحليل الربح حسب المنتج</CardTitle>
              <CardDescription>عرض المنتجات الأكثر ربحية خلال الفترة المحددة</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-6">
                  <p>جاري تحميل البيانات...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">المبيعات</TableHead>
                      <TableHead className="text-right">التكلفة</TableHead>
                      <TableHead className="text-right">الربح</TableHead>
                      <TableHead className="text-right">هامش الربح</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitAnalysis.profitByProduct.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right">{product.quantity}</TableCell>
                        <TableCell className="text-right">{product.sales.toFixed(2)} ر.س</TableCell>
                        <TableCell className="text-right">{product.cost.toFixed(2)} ر.س</TableCell>
                        <TableCell className="text-right font-semibold">
                          {product.profit.toFixed(2)} ر.س
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={product.margin > 20 ? "success" : "default"}>
                            {product.margin.toFixed(2)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>فواتير المبيعات</CardTitle>
              <CardDescription>جميع فواتير المبيعات المؤكدة خلال الفترة المحددة</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-6">
                  <p>جاري تحميل البيانات...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-center">تفاصيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.id.slice(0, 8)}</TableCell>
                        <TableCell>{format(new Date(invoice.date), 'yyyy-MM-dd')}</TableCell>
                        <TableCell>{invoice.party_name}</TableCell>
                        <TableCell className="text-right">{invoice.total_amount.toFixed(2)} ر.س</TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate(`/commercial/invoices/${invoice.id}`)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {invoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          لا توجد فواتير مبيعات مؤكدة خلال هذه الفترة
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfitAnalysisPage;
