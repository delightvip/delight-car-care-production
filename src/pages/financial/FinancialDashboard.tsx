import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { addDays, format, startOfMonth, endOfMonth } from 'date-fns';
import FinancialService from '@/services/financial/FinancialService';
import { FinancialSummary } from '@/services/financial/FinancialTypes';
import FinancialSummaryCards from '@/components/financial/FinancialSummaryCards';
import TransactionList from '@/components/financial/TransactionList';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

const FinancialDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const financialService = FinancialService.getInstance();
  
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  
  const [activeTab, setActiveTab] = useState('summary');
  
  useEffect(() => {
    loadData();
    
    // إضافة مستمع للتغييرات في البيانات المالية (مثل تأكيد الفواتير)
    const handleFinancialDataChange = (event: any) => {
      console.log('تم استلام إشعار بتغيير البيانات المالية', event.detail);
      toast.info('جاري تحديث البيانات المالية...');
      loadData();
      // تنشيط بيانات React Query المتعلقة بالمالية
      queryClient.invalidateQueries({ queryKey: ['financial'] });
      queryClient.invalidateQueries({ queryKey: ['financial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['profits'] });
    };

    // تسجيل المستمع للحدث المخصص
    window.addEventListener('financial-data-change', handleFinancialDataChange);
    
    // إزالة المستمع عند تفكيك المكون
    return () => {
      window.removeEventListener('financial-data-change', handleFinancialDataChange);
    };
  }, [dateRange]);
  
  const loadData = async () => {
    setLoading(true);
    
    const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
    const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;
    
    try {
      const financialSummary = await financialService.getFinancialSummary(startDate, endDate);
      setSummary(financialSummary);
    } catch (error) {
      console.error('خطأ في تحميل البيانات المالية:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات المالية');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = () => {
    toast.info('جاري تحديث البيانات...');
    loadData();
    // تنشيط أي ذاكرة تخزين مؤقت لـ React Query متعلقة بالبيانات المالية
    queryClient.invalidateQueries({ queryKey: ['financial'] });
    queryClient.invalidateQueries({ queryKey: ['financial-balance'] });
    queryClient.invalidateQueries({ queryKey: ['profits'] });
  };
  
  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">لوحة التحكم المالية</h1>
        <div className="flex flex-wrap gap-2">
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
          
          <Button onClick={() => navigate('/financial/transactions/new')}>
            <PlusCircle className="h-4 w-4 ml-2" />
            معاملة جديدة
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-[400px]">
          <TabsTrigger value="summary">ملخص مالي</TabsTrigger>
          <TabsTrigger value="income">الإيرادات</TabsTrigger>
          <TabsTrigger value="expenses">المصروفات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary" className="space-y-6">
          {summary && <FinancialSummaryCards summary={summary} loading={loading} />}
          
          <Card>
            <CardHeader>
              <CardTitle>المعاملات الأخيرة</CardTitle>
              <CardDescription>آخر المعاملات المالية في النظام</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionList 
                transactions={summary?.recentTransactions || []}
                loading={loading}
                onDelete={handleRefresh}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="income" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>الإيرادات</CardTitle>
              <CardDescription>جميع معاملات الإيرادات في الفترة المحددة</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionList 
                transactions={(summary?.recentTransactions || []).filter(t => t.type === 'income')}
                loading={loading}
                onDelete={handleRefresh}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>المصروفات</CardTitle>
              <CardDescription>جميع معاملات المصروفات في الفترة المحددة</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionList 
                transactions={(summary?.recentTransactions || []).filter(t => t.type === 'expense')}
                loading={loading}
                onDelete={handleRefresh}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialDashboard;
