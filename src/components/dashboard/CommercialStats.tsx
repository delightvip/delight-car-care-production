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
        
        // جلب بيانات المرتجعات المؤكدة للفترة نفسها
        const { data: confirmedReturns, error: returnsError } = await supabase
          .from('returns')
          .select('*')
          .gte('date', dateStr)
          .eq('payment_status', 'confirmed');
        
        if (returnsError) {
          console.error('Error fetching returns:', returnsError);
          throw returnsError;
        }
        
        console.log("Recent confirmed returns:", confirmedReturns?.length);
        
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
        
        // حساب قيم المرتجعات للمبيعات والمشتريات
        const salesReturns = confirmedReturns
          ? confirmedReturns
              .filter(returnData => returnData.return_type === 'sales_return')
              .reduce((sum, returnData) => sum + (returnData.amount || 0), 0)
          : 0;
          
        const purchaseReturns = confirmedReturns
          ? confirmedReturns
              .filter(returnData => returnData.return_type === 'purchase_return')
              .reduce((sum, returnData) => sum + (returnData.amount || 0), 0)
          : 0;
        
        // خصم قيم المرتجعات من إجمالي المبيعات والمشتريات
        const netSales = sales - salesReturns;
        const netPurchases = purchases - purchaseReturns;
        
        console.log("Calculated gross sales:", sales, "and returns:", salesReturns, "net sales:", netSales);
        console.log("Calculated gross purchases:", purchases, "and returns:", purchaseReturns, "net purchases:", netPurchases);
        
        // Get party balances with customer/supplier data joined
        const { data: partyBalances, error: balancesError } = await supabase
          .from('party_balances')
          .select(`
            balance,
            parties!inner (id, name, type)
          `);
          
        if (balancesError) {
          console.error('Error fetching party balances:', balancesError);
          throw balancesError;
        }
        
        console.log("Party balances:", partyBalances?.length);
        
        // Calculate receivables (money owed to us by customers) and payables (money we owe to suppliers)
        let receivables = 0;
        let payables = 0;
        
        if (partyBalances && partyBalances.length > 0) {
          partyBalances.forEach(item => {
            if (item.parties?.type === 'customer' && item.balance < 0) {
              // Negative balance for customer means they owe us money
              receivables += Math.abs(item.balance);
            } else if (item.parties?.type === 'supplier' && item.balance > 0) {
              // Positive balance for supplier means we owe them money
              payables += item.balance;
            } else if (item.parties?.type === 'supplier' && item.balance < 0) {
              // Negative balance for supplier means they owe us money (overpayment)
              receivables += Math.abs(item.balance);
            } else if (item.parties?.type === 'customer' && item.balance > 0) {
              // Positive balance for customer means we owe them money (customer prepayment or credit)
              payables += item.balance;
            }
          });
        }
        
        console.log("Calculated receivables:", receivables, "and payables:", payables);
        
        return {
          customersCount: customersCount || 0,
          suppliersCount: suppliersCount || 0,
          recentSales: netSales, // استخدام صافي المبيعات بعد خصم المرتجعات
          recentPurchases: netPurchases, // استخدام صافي المشتريات بعد خصم المرتجعات
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
          <p className="text-xs text-muted-foreground">صافي المبيعات خلال ٣٠ يوم</p>
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
          <p className="text-xs text-muted-foreground">صافي المشتريات خلال ٣٠ يوم</p>
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
