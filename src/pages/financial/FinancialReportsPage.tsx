
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { RefreshCw, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import FinancialService from '@/services/financial/FinancialService';

const FinancialReportsPage = () => {
  const financialService = FinancialService.getInstance();
  
  // States
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(subMonths(new Date(), 11)),
    to: endOfMonth(new Date())
  });
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('monthly');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<any[]>([]);
  const [categorySummary, setCategorySummary] = useState<any[]>([]);
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  useEffect(() => {
    loadData();
  }, [dateRange]);
  
  const loadData = async () => {
    setLoading(true);
    
    // Format dates
    const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
    const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;
    
    // Get transactions and categories
    const allTransactions = await financialService.getTransactions(startDate, endDate);
    const allCategories = await financialService.getCategories();
    
    setTransactions(allTransactions);
    setCategories(allCategories);
    
    // Generate monthly summary data
    const monthsInRange = eachMonthOfInterval({
      start: dateRange.from,
      end: dateRange.to
    });
    
    const monthlyData = monthsInRange.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthFormat = format(month, 'yyyy-MM');
      
      const monthTransactions = allTransactions.filter(t => 
        new Date(t.date) >= monthStart && 
        new Date(t.date) <= monthEnd
      );
      
      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        month: format(month, 'MMM yyyy'),
        monthKey: monthFormat,
        income,
        expense,
        profit: income - expense
      };
    });
    
    setMonthlySummary(monthlyData);
    
    // Generate category summary data
    const categoryData = allCategories.map(category => {
      const categoryTransactions = allTransactions.filter(t => t.category_id === category.id);
      const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      return {
        id: category.id,
        name: category.name,
        type: category.type,
        total,
        count: categoryTransactions.length
      };
    }).filter(cat => cat.total > 0); // Only include categories with transactions
    
    // Sort by total amount
    categoryData.sort((a, b) => b.total - a.total);
    
    setCategorySummary(categoryData);
    setLoading(false);
  };

  const handleRefresh = () => {
    loadData();
  };
  
  const handleExport = () => {
    // Generate CSV data
    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');
    
    let csvContent = "التاريخ,النوع,الفئة,المبلغ,طريقة الدفع,الملاحظات\n";
    
    transactions.forEach(t => {
      csvContent += `${t.date},"${t.type === 'income' ? 'إيراد' : 'مصروف'}","${t.category_name}",${t.amount},"${
        t.payment_method === 'cash' ? 'نقدي' : 
        t.payment_method === 'bank' ? 'حساب بنكي' : 'أخرى'
      }","${t.notes || ''}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_مالي_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">التقارير المالية</h1>
        
        <div className="flex flex-wrap gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="نوع التقرير" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">تقرير شهري</SelectItem>
              <SelectItem value="category">تقرير حسب الفئة</SelectItem>
              <SelectItem value="transactions">المعاملات</SelectItem>
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
          
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
          <TabsTrigger value="income">الإيرادات</TabsTrigger>
          <TabsTrigger value="expense">المصروفات</TabsTrigger>
          <TabsTrigger value="profit">الربح/الخسارة</TabsTrigger>
        </TabsList>
        
        <TabsContent value="income" className="space-y-6">
          {reportType === 'monthly' && (
            <Card>
              <CardHeader>
                <CardTitle>تقرير الإيرادات الشهري</CardTitle>
                <CardDescription>إجمالي الإيرادات حسب الشهر</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlySummary}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" angle={-45} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} ر.س`, 'الإيرادات']} />
                      <Legend />
                      <Bar dataKey="income" name="الإيرادات" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          
          {reportType === 'category' && (
            <Card>
              <CardHeader>
                <CardTitle>تقرير الإيرادات حسب الفئة</CardTitle>
                <CardDescription>توزيع الإيرادات على الفئات المختلفة</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col lg:flex-row items-center gap-4">
                <div className="h-[300px] w-full lg:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categorySummary.filter(cat => cat.type === 'income')}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="total"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {categorySummary.filter(cat => cat.type === 'income').map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} ر.س`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="w-full lg:w-1/2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الفئة</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">النسبة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorySummary
                        .filter(cat => cat.type === 'income')
                        .map((category, index) => {
                          const totalIncome = categorySummary
                            .filter(cat => cat.type === 'income')
                            .reduce((sum, cat) => sum + cat.total, 0);
                          const percentage = totalIncome > 0 ? (category.total / totalIncome) * 100 : 0;
                          
                          return (
                            <TableRow key={category.id}>
                              <TableCell>
                                <div className="flex items-center">
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  />
                                  {category.name}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{category.total.toFixed(2)} ر.س</TableCell>
                              <TableCell className="text-right">{percentage.toFixed(1)}%</TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
          
          {reportType === 'transactions' && (
            <Card>
              <CardHeader>
                <CardTitle>معاملات الإيرادات</CardTitle>
                <CardDescription>تفاصيل جميع معاملات الإيرادات</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead>طريقة الدفع</TableHead>
                      <TableHead>الملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(t => t.type === 'income')
                      .map(transaction => (
                        <TableRow key={transaction.id}>
                          <TableCell>{transaction.date}</TableCell>
                          <TableCell>{transaction.category_name}</TableCell>
                          <TableCell className="text-right">{transaction.amount.toFixed(2)} ر.س</TableCell>
                          <TableCell>
                            {transaction.payment_method === 'cash' ? 'نقدي' : 
                             transaction.payment_method === 'bank' ? 'حساب بنكي' : 'أخرى'}
                          </TableCell>
                          <TableCell>{transaction.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="expense" className="space-y-6">
          {/* Similar content as income tab but for expenses */}
          {reportType === 'monthly' && (
            <Card>
              <CardHeader>
                <CardTitle>تقرير المصروفات الشهري</CardTitle>
                <CardDescription>إجمالي المصروفات حسب الشهر</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlySummary}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" angle={-45} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} ر.س`, 'المصروفات']} />
                      <Legend />
                      <Bar dataKey="expense" name="المصروفات" fill="#ff8042" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          
          {reportType === 'category' && (
            <Card>
              <CardHeader>
                <CardTitle>تقرير المصروفات حسب الفئة</CardTitle>
                <CardDescription>توزيع المصروفات على الفئات المختلفة</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col lg:flex-row items-center gap-4">
                <div className="h-[300px] w-full lg:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categorySummary.filter(cat => cat.type === 'expense')}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="total"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {categorySummary.filter(cat => cat.type === 'expense').map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} ر.س`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="w-full lg:w-1/2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الفئة</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">النسبة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorySummary
                        .filter(cat => cat.type === 'expense')
                        .map((category, index) => {
                          const totalExpense = categorySummary
                            .filter(cat => cat.type === 'expense')
                            .reduce((sum, cat) => sum + cat.total, 0);
                          const percentage = totalExpense > 0 ? (category.total / totalExpense) * 100 : 0;
                          
                          return (
                            <TableRow key={category.id}>
                              <TableCell>
                                <div className="flex items-center">
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  />
                                  {category.name}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{category.total.toFixed(2)} ر.س</TableCell>
                              <TableCell className="text-right">{percentage.toFixed(1)}%</TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
          
          {reportType === 'transactions' && (
            <Card>
              <CardHeader>
                <CardTitle>معاملات المصروفات</CardTitle>
                <CardDescription>تفاصيل جميع معاملات المصروفات</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead>طريقة الدفع</TableHead>
                      <TableHead>الملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(t => t.type === 'expense')
                      .map(transaction => (
                        <TableRow key={transaction.id}>
                          <TableCell>{transaction.date}</TableCell>
                          <TableCell>{transaction.category_name}</TableCell>
                          <TableCell className="text-right">{transaction.amount.toFixed(2)} ر.س</TableCell>
                          <TableCell>
                            {transaction.payment_method === 'cash' ? 'نقدي' : 
                             transaction.payment_method === 'bank' ? 'حساب بنكي' : 'أخرى'}
                          </TableCell>
                          <TableCell>{transaction.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="profit" className="space-y-6">
          {reportType === 'monthly' && (
            <Card>
              <CardHeader>
                <CardTitle>تقرير الربح/الخسارة الشهري</CardTitle>
                <CardDescription>صافي الربح أو الخسارة حسب الشهر</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlySummary}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" angle={-45} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} ر.س`, '']} />
                      <Legend />
                      <Bar dataKey="income" name="الإيرادات" fill="#82ca9d" />
                      <Bar dataKey="expense" name="المصروفات" fill="#ff8042" />
                      <Bar dataKey="profit" name="صافي الربح" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الشهر</TableHead>
                        <TableHead className="text-right">الإيرادات</TableHead>
                        <TableHead className="text-right">المصروفات</TableHead>
                        <TableHead className="text-right">صافي الربح</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlySummary.map(summary => (
                        <TableRow key={summary.monthKey}>
                          <TableCell>{summary.month}</TableCell>
                          <TableCell className="text-right">{summary.income.toFixed(2)} ر.س</TableCell>
                          <TableCell className="text-right">{summary.expense.toFixed(2)} ر.س</TableCell>
                          <TableCell className={`text-right font-semibold ${summary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {summary.profit.toFixed(2)} ر.س
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
          
          {(reportType === 'category' || reportType === 'transactions') && (
            <Card>
              <CardHeader>
                <CardTitle>تقرير الربح/الخسارة الإجمالي</CardTitle>
                <CardDescription>ملخص الإيرادات والمصروفات خلال الفترة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-green-600">إجمالي الإيرادات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0).toFixed(2)} ر.س
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-red-600">إجمالي المصروفات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0).toFixed(2)} ر.س
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>صافي الربح</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                        const profit = income - expense;
                        return (
                          <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {profit.toFixed(2)} ر.س
                          </p>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>
                
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'الإيرادات', value: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) },
                          { name: 'المصروفات', value: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#82ca9d" />
                        <Cell fill="#ff8042" />
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} ر.س`, '']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialReportsPage;
