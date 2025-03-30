
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, CreditCard } from 'lucide-react';

const FinancialBalanceDisplay: React.FC = () => {
  const { data: balance, isLoading } = useQuery({
    queryKey: ['financial-balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .single();
        
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">رصيد الخزينة</CardTitle>
          <Coins className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{balance?.cash_balance?.toLocaleString('ar-EG') || 0} ج.م</div>
          <p className="text-xs text-muted-foreground">
            آخر تحديث: {new Date(balance?.last_updated || new Date()).toLocaleDateString('ar-EG')}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">رصيد البنك</CardTitle>
          <CreditCard className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{balance?.bank_balance?.toLocaleString('ar-EG') || 0} ج.م</div>
          <p className="text-xs text-muted-foreground">
            آخر تحديث: {new Date(balance?.last_updated || new Date()).toLocaleDateString('ar-EG')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialBalanceDisplay;
