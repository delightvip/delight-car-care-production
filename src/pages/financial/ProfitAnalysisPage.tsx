import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { format, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import InvoiceService from '@/services/commercial/invoice/InvoiceService';
import { Invoice, InvoiceItem } from '@/services/CommercialTypes';
import FinancialService from '@/services/financial/FinancialService';

interface ProfitData {
  date: string;
  revenue: number;
  costs: number;
  profit: number;
}

const ProfitAnalysisPage: React.FC = () => {
  const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 6));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(true);
  const [profitData, setProfitData] = useState<ProfitData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [totalCosts, setTotalCosts] = useState<number>(0);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  
  const invoiceService = InvoiceService.getInstance();
  const financialService = FinancialService.getInstance();
  
  useEffect(() => {
    loadProfitData();
  }, [startDate, endDate]);
  
  const loadProfitData = async () => {
    setLoading(true);
    try {
      // 1. Get all invoices within date range
      const allInvoices = await invoiceService.getInvoices();
      
      // Filter invoices by date range
      const filteredInvoices = allInvoices.filter(invoice => {
        const invoiceDate = new Date(invoice.date);
        return invoiceDate >= startDate && invoiceDate <= endDate;
      });
      
      // Group and analyze sales invoices (revenue)
      const salesInvoices = filteredInvoices.filter(invoice => invoice.invoice_type === "sale");
      
      // Calculate revenue and cost per month
      const monthlyData: Record<string, ProfitData> = {};
      
      // Process sales invoices
      for (const invoice of salesInvoices) {
        const invoiceDate = new Date(invoice.date);
        const monthKey = format(invoiceDate, 'yyyy-MM');
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            date: format(invoiceDate, 'MMM yyyy', { locale: ar }),
            revenue: 0,
            costs: 0,
            profit: 0
          };
        }
        
        // Add revenue
        monthlyData[monthKey].revenue += invoice.total_amount;
        
        // Calculate costs based on item costs
        const items = await invoiceService.getInvoiceItems(invoice.id);
        for (const item of items) {
          // For simplicity, we assume a cost of 70% of sale price if unit_cost not available
          const itemCost = item.cost_price || (item.unit_price * 0.7);
          monthlyData[monthKey].costs += itemCost * item.quantity;
        }
      }
      
      // Calculate profit
      for (const key in monthlyData) {
        monthlyData[key].profit = monthlyData[key].revenue - monthlyData[key].costs;
      }
      
      // Convert to array and sort by date
      const sortedData = Object.values(monthlyData).sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      // Calculate totals
      const revTotal = sortedData.reduce((sum, item) => sum + item.revenue, 0);
      const costTotal = sortedData.reduce((sum, item) => sum + item.costs, 0);
      const profitTotal = revTotal - costTotal;
      
      setProfitData(sortedData);
      setTotalRevenue(revTotal);
      setTotalCosts(costTotal);
      setTotalProfit(profitTotal);
      
    } catch (error) {
      console.error('Error loading profit data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const exportToCSV = () => {
    let csvContent = "التاريخ,الإيرادات,التكاليف,الأرباح\n";
    
    profitData.forEach(record => {
      csvContent += `${record.date},${record.revenue.toFixed(2)},${record.costs.toFixed(2)},${record.profit.toFixed(2)}\n`;
    });
    
    csvContent += `\nالإجمالي,${totalRevenue.toFixed(2)},${totalCosts.toFixed(2)},${totalProfit.toFixed(2)}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `تحليل_الأرباح_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">تحليل الأرباح</h1>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="ml-2 h-4 w-4" />
            تصدير البيانات
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>نطاق التحليل</CardTitle>
            <CardDescription>حدد الفترة الزمنية لتحليل الأرباح</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="startDate">من تاريخ</Label>
                <DatePicker 
                  selected={startDate} 
                  onSelect={setStartDate}
                />
              </div>
              <div>
                <Label htmlFor="endDate">إلى تاريخ</Label>
                <DatePicker 
                  selected={endDate} 
                  onSelect={setEndDate}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-28" /> : `${totalRevenue.toLocaleString()} ر.س`}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي التكاليف</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-28" /> : `${totalCosts.toLocaleString()} ��.س`}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">صافي الأرباح</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-28" /> : `${totalProfit.toLocaleString()} ر.س`}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>تحليل الأرباح الشهرية</CardTitle>
            <CardDescription>الإيرادات والتكاليف والأرباح شهرياً</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={profitData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45} 
                    textAnchor="end" 
                    tick={{ fontSize: 12 }}
                    height={60}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ر.س`} />
                  <Legend />
                  <Bar dataKey="revenue" name="الإيرادات" fill="#22c55e" />
                  <Bar dataKey="costs" name="التكاليف" fill="#ef4444" />
                  <Bar dataKey="profit" name="الأرباح" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل الأرباح الشهرية</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-4 font-semibold mb-2 text-muted-foreground">
                <div>الشهر</div>
                <div>الإيرادات</div>
                <div>التكاليف</div>
                <div>الأرباح</div>
              </div>
              <Separator className="my-2" />
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="mb-4">
                    <Skeleton className="h-6 w-full" />
                  </div>
                ))
              ) : (
                profitData.map((item, index) => (
                  <React.Fragment key={index}>
                    <div className="grid grid-cols-4 py-2">
                      <div>{item.date}</div>
                      <div>{item.revenue.toLocaleString()} ر.س</div>
                      <div>{item.costs.toLocaleString()} ر.س</div>
                      <div className={item.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {item.profit.toLocaleString()} ر.س
                      </div>
                    </div>
                    <Separator className="my-1" />
                  </React.Fragment>
                ))
              )}
              <div className="grid grid-cols-4 py-2 font-bold mt-2">
                <div>الإجمالي</div>
                <div>{totalRevenue.toLocaleString()} ر.س</div>
                <div>{totalCosts.toLocaleString()} ر.س</div>
                <div className={totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {totalProfit.toLocaleString()} ر.س
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfitAnalysisPage;
