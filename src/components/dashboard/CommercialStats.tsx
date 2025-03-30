
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Truck, Wallet, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export function CommercialStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['commercialStats'],
    queryFn: async () => {
      try {
        // Get customers count
        const { count: customersCount, error: customersError } = await supabase
          .from('parties')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'customer');
          
        if (customersError) throw customersError;
        
        // Get suppliers count
        const { count: suppliersCount, error: suppliersError } = await supabase
          .from('parties')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'supplier');
          
        if (suppliersError) throw suppliersError;
        
        // Get recent invoices (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: recentInvoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('*')
          .gte('date', format(thirtyDaysAgo, 'yyyy-MM-dd'))
          .eq('status', 'confirmed');
          
        if (invoicesError) throw invoicesError;
        
        // Calculate sales and purchases from recent invoices
        const sales = recentInvoices
          .filter(invoice => invoice.invoice_type === 'sale')
          .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
          
        const purchases = recentInvoices
          .filter(invoice => invoice.invoice_type === 'purchase')
          .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
        
        // Get party balances
        const { data: partyBalances, error: balancesError } = await supabase
          .from('party_balances')
          .select(`
            balance, 
            parties!inner(type)
          `);
          
        if (balancesError) throw balancesError;
        
        // Fix: Properly type and cast the data to access the nested properties
        const typedPartyBalances = partyBalances as unknown as Array<{
          balance: number;
          parties: { type: string };
        }>;
        
        // Calculate receivables and payables
        const receivables = typedPartyBalances
          .filter(item => item.parties.type === 'customer' && item.balance < 0)
          .reduce((sum, item) => sum + Math.abs(item.balance), 0);
          
        const payables = typedPartyBalances
          .filter(item => item.parties.type === 'supplier' && item.balance > 0)
          .reduce((sum, item) => sum + item.balance, 0);
          
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
        throw error;
      }
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

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
