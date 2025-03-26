
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { format, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Download, ChevronRight, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, 
  BarChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import FinancialService, { Transaction } from '@/services/financial/FinancialService';

interface CategorySummary {
  id: string;
  name: string;
  total: number;
  percentage: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2', '#45B39D', '#F4D03F'];

const FinancialReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 3));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [reportType, setReportType] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategorySummary[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategorySummary[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [netBalance, setNetBalance] = useState<number>(0);
  
  const financialService = FinancialService.getInstance();
  
  useEffect(() => {
    loadFinancialData();
  }, [startDate, endDate, reportType]);
  
  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      // تحميل المعاملات المالية
      let txns;
      if (reportType === 'income') {
        txns = await financialService.getTransactions(formattedStartDate, formattedEndDate, 'income');
      } else if (reportType === 'expense') {
        txns = await financialService.getTransactions(formattedStartDate, formattedEndDate, 'expense');
      } else {
        txns = await financialService.getTransactions(formattedStartDate, formattedEndDate);
      }
      
      setTransactions(txns);
      
      // حساب المجاميع
      let totalInc = 0;
      let totalExp = 0;
      
      txns.forEach(tx => {
        if (tx.type === 'income') {
          totalInc += tx.amount;
        } else {
          totalExp += tx.amount;
        }
      });
      
      setTotalIncome(totalInc);
      setTotalExpense(totalExp);
      setNetBalance(totalInc - totalExp);
      
      // معالجة بيانات الفئات
      const categoriesMap: Record<string, { name: string, total: number, type: 'income' | 'expense' }> = {};
      
      txns.forEach(tx => {
        if (!categoriesMap[tx.category_id]) {
          categoriesMap[tx.category_id] = {
            name: tx.category_name,
            total: 0,
            type: tx.type
          };
        }
        categoriesMap[tx.category_id].total += tx.amount;
      });
      
      // فصل فئات الإيرادات والمصروفات
      const incCategories: CategorySummary[] = [];
      const expCategories: CategorySummary[] = [];
      
      Object.entries(categoriesMap).forEach(([id, data]) => {
        const category = {
          id,
          name: data.name,
          total: data.total,
          percentage: data.type === 'income' 
            ? (totalInc > 0 ? (data.total / totalInc * 100) : 0)
            : (totalExp > 0 ? (data.total / totalExp * 100) : 0)
        };
        
        if (data.type === 'income') {
          incCategories.push(category);
        } else {
          expCategories.push(category);
        }
      });
      
      // ترتيب الفئات بناءً على المبلغ (تنازلياً)
      incCategories.sort((a, b) => b.total - a.total);
      expCategories.sort((a, b) => b.total - a.total);
      
      setIncomeCategories(incCategories);
      setExpenseCategories(expCategories);
      
      // معالجة البيانات الشهرية
      const monthlyDataMap: Record<string, MonthlyData> = {};
      
      txns.forEach(tx => {
        const txDate = new Date(tx.date);
        const monthKey = format(txDate, 'yyyy-MM');
        const monthDisplay = format(txDate, 'MMM yyyy', { locale: ar });
        
        if (!monthlyDataMap[monthKey]) {
          monthlyDataMap[monthKey] = {
            month: monthDisplay,
            income: 0,
            expense: 0,
            balance: 0
          };
        }
        
        if (tx.type === 'income') {
          monthlyDataMap[monthKey].income += tx.amount;
        } else {
          monthlyDataMap[monthKey].expense += tx.amount;
        }
        
        monthlyDataMap[monthKey].balance = 
          monthlyDataMap[monthKey].income - monthlyDataMap[monthKey].expense;
      });
      
      // تحويل إلى مصفوفة وترتيبها
      const monthlyDataArray = Object.values(monthlyDataMap);
      monthlyDataArray.sort((a, b) => {
        return new Date(a.month).getTime() - new Date(b.month).getTime();
      });
      
      setMonthlyData(monthlyDataArray);
      
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const exportToCSV = () => {
    let reportTitle = '';
    switch (reportType) {
      case 'income': reportTitle = 'تقرير_الإيرادات'; break;
      case 'expense': reportTitle = 'تقرير_المصروفات'; break;
      default: reportTitle = 'التقرير_المالي_الشامل';
    }
    
    let csvContent = "التاريخ,النوع,الفئة,طريقة الدفع,المبلغ,الملاحظات\n";
    
    transactions.forEach(tx => {
      const txType = tx.type === 'income' ? 'إيراد' : 'مصروف';
      const paymentMethod = 
        tx.payment_method === 'cash' ? 'نقدي' : 
        tx.payment_method === 'bank' ? 'بنك' : 'أخرى';
      
      csvContent += `${tx.date},${txType},${tx.category_name},${paymentMethod},${tx.amount.toFixed(2)},${tx.notes || ''}\n`;
    });
    
    // إضافة ملخص
    csvContent += "\nالملخص\n";
    csvContent += `إجمالي الإيرادات,${totalIncome.toFixed(2)}\n`;
    csvContent += `إجمالي المصروفات,${totalExpense.toFixed(2)}\n`;
    csvContent += `صافي الرصيد,${netBalance.toFixed(2)}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportTitle}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">التقارير المالية</h1>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="ml-2 h-4 w-4" />
            تصدير التقرير
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>إعدادات التقرير</CardTitle>
            <CardDescription>حدد نطاق التقرير ونوعه</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="startDate">من تاريخ</Label>
                <DatePicker
                  id="startDate"
                  selected={startDate}
                  onSelect={setStartDate}
                />
              </div>
              <div>
                <Label htmlFor="endDate">إلى تاريخ</Label>
                <DatePicker
                  id="endDate"
                  selected={endDate}
                  onSelect={setEndDate}
                />
              </div>
              <div>
                <Label htmlFor="reportType">نوع التقرير</Label>
                <Select 
                  value={reportType} 
                  onValueChange={setReportType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع التقرير" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المعاملات</SelectItem>
                    <SelectItem value="income">الإيرادات فقط</SelectItem>
                    <SelectItem value="expense">المصروفات فقط</SelectItem>
                  </SelectContent>
                </Select>
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
                {loading ? <Skeleton className="h-8 w-28" /> : `${totalIncome.toLocaleString()} ر.س`}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-28" /> : `${totalExpense.toLocaleString()} ر.س`}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">صافي الرصيد</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {loading ? <Skeleton className="h-8 w-28" /> : `${netBalance.toLocaleString()} ر.س`}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="charts" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="charts">الرسوم البيانية</TabsTrigger>
            <TabsTrigger value="transactions">المعاملات</TabsTrigger>
            <TabsTrigger value="categories">الفئات</TabsTrigger>
          </TabsList>
          
          <TabsContent value="charts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>الإيرادات والمصروفات الشهرية</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[350px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ر.س`} />
                        <Legend />
                        <Bar dataKey="income" name="الإيرادات" fill="#22c55e" />
                        <Bar dataKey="expense" name="المصروفات" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>صافي الرصيد الشهري</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[350px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ر.س`} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="balance" 
                          name="صافي الرصيد" 
                          stroke="#3b82f6" 
                          activeDot={{ r: 8 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>توزيع الإيرادات حسب الفئات</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[350px] w-full" />
                  ) : incomeCategories.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={incomeCategories}
                          dataKey="total"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {incomeCategories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ر.س`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                      لا توجد بيانات إيرادات لعرضها
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>توزيع المصروفات حسب الفئات</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[350px] w-full" />
                  ) : expenseCategories.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={expenseCategories}
                          dataKey="total"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {expenseCategories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ر.س`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                      لا توجد بيانات مصروفات لعرضها
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>قائمة المعاملات المالية</CardTitle>
                <CardDescription>
                  {transactions.length} معاملة في الفترة المحددة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="grid grid-cols-5 font-semibold mb-2 text-muted-foreground">
                    <div>التاريخ</div>
                    <div>النوع</div>
                    <div>الفئة</div>
                    <div>المبلغ</div>
                    <div>الملاحظات</div>
                  </div>
                  <Separator className="my-2" />
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <div key={i} className="mb-4">
                        <Skeleton className="h-6 w-full" />
                      </div>
                    ))
                  ) : transactions.length > 0 ? (
                    transactions.map((tx, index) => (
                      <React.Fragment key={index}>
                        <div className="grid grid-cols-5 py-3">
                          <div>{tx.date}</div>
                          <div className={tx.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                            {tx.type === 'income' ? 'إيراد' : 'مصروف'}
                          </div>
                          <div>{tx.category_name}</div>
                          <div className={tx.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                            {tx.amount.toLocaleString()} ر.س
                          </div>
                          <div className="truncate max-w-xs">{tx.notes || '-'}</div>
                        </div>
                        <Separator className="my-1" />
                      </React.Fragment>
                    ))
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      لا توجد معاملات للعرض في النطاق المحدد
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="categories">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>فئات الإيرادات</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full mb-4" />
                    ))
                  ) : incomeCategories.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                      {incomeCategories.map((cat, index) => (
                        <AccordionItem key={cat.id} value={cat.id}>
                          <AccordionTrigger>
                            <div className="flex justify-between w-full text-right">
                              <span>{cat.name}</span>
                              <span className="text-green-600">{cat.total.toLocaleString()} ر.س</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="py-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">النسبة من إجمالي الإيرادات:</span>
                                <span>{cat.percentage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full h-2 mt-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500" 
                                  style={{ width: `${cat.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      لا توجد فئات إيرادات للعرض في النطاق المحدد
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>فئات المصروفات</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full mb-4" />
                    ))
                  ) : expenseCategories.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                      {expenseCategories.map((cat, index) => (
                        <AccordionItem key={cat.id} value={cat.id}>
                          <AccordionTrigger>
                            <div className="flex justify-between w-full text-right">
                              <span>{cat.name}</span>
                              <span className="text-red-600">{cat.total.toLocaleString()} ر.س</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="py-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">النسبة من إجمالي المصروفات:</span>
                                <span>{cat.percentage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full h-2 mt-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-red-500" 
                                  style={{ width: `${cat.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      لا توجد فئات مصروفات للعرض في النطاق المحدد
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FinancialReportsPage;
