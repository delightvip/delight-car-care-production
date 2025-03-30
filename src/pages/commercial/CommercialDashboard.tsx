
import React, { useState } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { CommercialStats } from '@/components/dashboard/CommercialStats';
import { FinancialTrendsChart } from '@/components/dashboard/FinancialTrendsChart';
import { Users, Receipt, ArrowUpDown, CreditCard, FileText, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, subDays } from 'date-fns';

interface Party {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'other';
  balance: number;
}

interface Invoice {
  id: string;
  invoice_type: 'sale' | 'purchase';
  party_id: string;
  party_name: string;
  date: string;
  total_amount: number;
  status: string;
}

interface Payment {
  id: string;
  payment_type: 'collection' | 'disbursement';
  party_id: string;
  party_name: string;
  date: string;
  amount: number;
}

const CommercialDashboard = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  
  // Fetch top customers by value
  const { data: topCustomers, isLoading: loadingCustomers } = useQuery({
    queryKey: ['topCustomers'],
    queryFn: async () => {
      try {
        // Get customers with negative balances (receivables)
        const { data, error } = await supabase
          .from('party_balances')
          .select(`
            balance,
            parties!inner(id, name, type)
          `)
          .lt('balance', 0)
          .order('balance', { ascending: true }) // Ascending because negative values
          .limit(5);
        
        if (error) throw error;
        
        // Properly type the query result
        const typedData = data as unknown as Array<{
          balance: number;
          parties: { id: string; name: string; type: string; };
        }>;
        
        return typedData
          .filter(item => item.parties.type === 'customer')
          .map(item => ({
            id: item.parties.id,
            name: item.parties.name,
            type: item.parties.type,
            balance: Math.abs(item.balance)
          }));
      } catch (error) {
        console.error('Error fetching top customers:', error);
        return [];
      }
    },
    refetchInterval: 300000
  });
  
  // Fetch recent invoices
  const { data: recentInvoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['recentInvoices'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select(`
            id,
            invoice_type,
            party_id,
            parties(name),
            date,
            total_amount,
            status
          `)
          .order('date', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        
        // Properly type the query result
        const typedData = data as unknown as Array<{
          id: string;
          invoice_type: string;
          party_id: string;
          parties: { name: string };
          date: string;
          total_amount: number;
          status: string;
        }>;
        
        return typedData.map(invoice => ({
          id: invoice.id,
          invoice_type: invoice.invoice_type,
          party_id: invoice.party_id,
          party_name: invoice.parties.name,
          date: invoice.date,
          total_amount: invoice.total_amount,
          status: invoice.status
        }));
      } catch (error) {
        console.error('Error fetching recent invoices:', error);
        return [];
      }
    },
    refetchInterval: 300000
  });
  
  // Fetch recent payments
  const { data: recentPayments, isLoading: loadingPayments } = useQuery({
    queryKey: ['recentPayments'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select(`
            id,
            payment_type,
            party_id,
            parties(name),
            date,
            amount
          `)
          .order('date', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        
        // Properly type the query result
        const typedData = data as unknown as Array<{
          id: string;
          payment_type: string;
          party_id: string;
          parties: { name: string };
          date: string;
          amount: number;
        }>;
        
        return typedData.map(payment => ({
          id: payment.id,
          payment_type: payment.payment_type,
          party_id: payment.party_id,
          party_name: payment.parties.name,
          date: payment.date,
          amount: payment.amount
        }));
      } catch (error) {
        console.error('Error fetching recent payments:', error);
        return [];
      }
    },
    refetchInterval: 300000
  });
  
  // Fetch overdue invoices
  const { data: overdueInvoices, isLoading: loadingOverdue } = useQuery({
    queryKey: ['overdueInvoices'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select(`
            id,
            invoice_type,
            party_id,
            parties(name),
            date,
            total_amount
          `)
          .eq('invoice_type', 'sale')
          .eq('status', 'pending')
          .lt('date', today)
          .order('date', { ascending: true });
        
        if (error) throw error;
        
        return data.map(invoice => ({
          id: invoice.id,
          invoice_type: invoice.invoice_type,
          party_id: invoice.party_id,
          party_name: invoice.parties.name,
          date: invoice.date,
          total_amount: invoice.total_amount
        }));
      } catch (error) {
        console.error('Error fetching overdue invoices:', error);
        return [];
      }
    },
    refetchInterval: 300000
  });
  
  return (
    <PageTransition>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">لوحة تحكم المعاملات التجارية</h1>
            <p className="text-muted-foreground mt-1">مراقبة وتحليل المعاملات التجارية والمالية</p>
          </div>
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            onUpdate={({ range }) => 
              setDateRange({ 
                from: range.from || subDays(new Date(), 30), 
                to: range.to || new Date() 
              })
            }
          />
        </div>
        
        <CommercialStats />
        
        <FinancialTrendsChart />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-md font-medium">العملاء الأعلى قيمة</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingCustomers ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : topCustomers && topCustomers.length > 0 ? (
                <div className="space-y-2">
                  {topCustomers.map((customer: Party) => (
                    <div key={customer.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <Link 
                        to={`/commercial/parties/${customer.id}`}
                        className="font-medium hover:underline"
                      >
                        {customer.name}
                      </Link>
                      <span className="text-primary font-semibold">
                        {customer.balance.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Button size="sm" variant="outline" asChild className="w-full">
                      <Link to="/commercial/statements">
                        عرض كل العملاء
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mb-3 opacity-50" />
                  <p>لم يتم العثور على عملاء</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-md font-medium">الفواتير المتأخرة</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {loadingOverdue ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : overdueInvoices && overdueInvoices.length > 0 ? (
                <div className="space-y-2">
                  {overdueInvoices.map((invoice: Invoice) => (
                    <div key={invoice.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <div className="space-y-1">
                        <Link 
                          to={`/commercial/invoices/${invoice.id}`}
                          className="font-medium hover:underline block"
                        >
                          {invoice.party_name}
                        </Link>
                        <span className="text-xs text-muted-foreground">{invoice.date}</span>
                      </div>
                      <span className="text-red-500 font-semibold">
                        {invoice.total_amount.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Button size="sm" variant="outline" asChild className="w-full">
                      <Link to="/commercial/invoices">
                        عرض كل الفواتير المتأخرة
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <FileText className="h-10 w-10 mb-3 opacity-50" />
                  <p>لا توجد فواتير متأخرة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-md font-medium">أحدث الفواتير</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : recentInvoices && recentInvoices.length > 0 ? (
                <div className="space-y-2">
                  {recentInvoices.map((invoice: Invoice) => (
                    <div key={invoice.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <div className="space-y-1">
                        <Link 
                          to={`/commercial/invoices/${invoice.id}`}
                          className="font-medium hover:underline block"
                        >
                          {invoice.party_name}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{invoice.date}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            invoice.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800' 
                              : invoice.status === 'cancelled' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {invoice.status === 'confirmed' ? 'مؤكد' : invoice.status === 'cancelled' ? 'ملغي' : 'معلق'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${invoice.invoice_type === 'sale' ? 'text-green-600' : 'text-red-600'}`}>
                          {invoice.total_amount.toLocaleString('ar-EG')} ج.م
                        </div>
                        <span className="text-xs text-muted-foreground block">
                          {invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Button size="sm" variant="outline" asChild className="w-full">
                      <Link to="/commercial/invoices">
                        عرض كل الفواتير
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Receipt className="h-10 w-10 mb-3 opacity-50" />
                  <p>لا توجد فواتير حديثة</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-md font-medium">أحدث المدفوعات</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : recentPayments && recentPayments.length > 0 ? (
                <div className="space-y-2">
                  {recentPayments.map((payment: Payment) => (
                    <div key={payment.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <div className="space-y-1">
                        <Link 
                          to={`/commercial/parties/${payment.party_id}`}
                          className="font-medium hover:underline block"
                        >
                          {payment.party_name}
                        </Link>
                        <span className="text-xs text-muted-foreground">{payment.date}</span>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${payment.payment_type === 'collection' ? 'text-green-600' : 'text-red-600'}`}>
                          {payment.amount.toLocaleString('ar-EG')} ج.م
                        </div>
                        <span className="text-xs text-muted-foreground block">
                          {payment.payment_type === 'collection' ? 'تحصيل' : 'صرف'}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Button size="sm" variant="outline" asChild className="w-full">
                      <Link to="/commercial/payments">
                        عرض كل المدفوعات
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <CreditCard className="h-10 w-10 mb-3 opacity-50" />
                  <p>لا توجد مدفوعات حديثة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default CommercialDashboard;
