
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Truck, Wallet, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

export function CommercialStats() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['commercialStats'],
    queryFn: async () => {
      try {
        console.log("Fetching commercial stats data...");
        // Get today's date and 30 days ago
        const today = new Date();
        const thirtyDaysAgo = subDays(today, 30);
        const dateStr = format(thirtyDaysAgo, 'yyyy-MM-dd');
        
        // Get customers count
        const { count: customersCount, error: customersError } = await supabase
          .from('parties')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'customer');
          
        if (customersError) {
          console.error('Error fetching customers:', customersError);
          throw customersError;
        }
        
        console.log("Customers count:", customersCount);
        
        // Get suppliers count
        const { count: suppliersCount, error: suppliersError } = await supabase
          .from('parties')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'supplier');
          
        if (suppliersError) {
          console.error('Error fetching suppliers:', suppliersError);
          throw suppliersError;
        }
        
        console.log("Suppliers count:", suppliersCount);
        
        // Get recent invoices (last 30 days)
        const { data: recentInvoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('*')
          .gte('date', dateStr)
          .eq('payment_status', 'confirmed');
          
        if (invoicesError) {
          console.error('Error fetching invoices:', invoicesError);
          throw invoicesError;
        }
        
        console.log("Recent invoices:", recentInvoices?.length);
        
        // Calculate sales and purchases from recent invoices
        const sales = recentInvoices
          ? recentInvoices
              .filter(invoice => invoice.invoice_type === 'sale')
              .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0)
          : 0;
          
        const purchases = recentInvoices
          ? recentInvoices
              .filter(invoice => invoice.invoice_type === 'purchase')
              .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0)
          : 0;
        
        console.log("Calculated sales:", sales, "and purchases:", purchases);
        
        // Get party balances
        const { data: partyBalances, error: balancesError } = await supabase
          .from('party_balances')
          .select(`
            balance,
            parties (id, type)
          `);
          
        if (balancesError) {
          console.error('Error fetching party balances:', balancesError);
          throw balancesError;
        }
        
        console.log("Party balances:", partyBalances?.length);
        
        // Calculate receivables (money owed to us by customers) and payables (money we owe to suppliers)
        let receivables = 0;
        let payables = 0;
        
        if (partyBalances) {
          for (const item of partyBalances) {
            if (item.parties?.type === 'customer' && item.balance < 0) {
              receivables += Math.abs(item.balance);
            } else if (item.parties?.type === 'supplier' && item.balance > 0) {
              payables += item.balance;
            }
          }
        }
        
        console.log("Calculated receivables:", receivables, "and payables:", payables);
        
        return {
          customersCount: customersCount || 0,
          suppliersCount: suppliersCount || 0,
          recentSales: sales,
          recentPurchases: purchases,
          receivables,
          payables
        };
      } catch (error) {
        console.error('Error fetching commercial stats:', error);
        toast.error("حدث خطأ أثناء جلب البيانات التجارية");
        throw error;
      }
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (error) {
    console.error('Error loading commercial stats:', error);
    toast.error("فشل تحميل البيانات التجارية، يرجى المحاولة مرة أخرى");
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">العملاء</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold">{stats?.customersCount}</div>
          )}
          <p className="text-xs text-muted-foreground">إجمالي عدد العملاء المسجلين</p>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">الموردين</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold">{stats?.suppliersCount}</div>
          )}
          <p className="text-xs text-muted-foreground">إجمالي عدد الموردين المسجلين</p>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">المبيعات (٣٠ يوم)</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold">{stats?.recentSales.toLocaleString('ar-EG')} ج.م</div>
          )}
          <p className="text-xs text-muted-foreground">قيمة المبيعات خلال ٣٠ يوم</p>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">المشتريات (٣٠ يوم)</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold">{stats?.recentPurchases.toLocaleString('ar-EG')} ج.م</div>
          )}
          <p className="text-xs text-muted-foreground">قيمة المشتريات خلال ٣٠ يوم</p>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">المستحقات</CardTitle>
          <ArrowUpDown className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold">{stats?.receivables.toLocaleString('ar-EG')} ج.م</div>
          )}
          <p className="text-xs text-muted-foreground">المبالغ المستحقة من العملاء</p>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">الالتزامات</CardTitle>
          <Wallet className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold">{stats?.payables.toLocaleString('ar-EG')} ج.م</div>
          )}
          <p className="text-xs text-muted-foreground">المبالغ المستحقة للموردين</p>
        </CardContent>
      </Card>
    </div>
  );
}
