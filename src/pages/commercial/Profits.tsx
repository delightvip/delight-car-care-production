
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from '@/components/ui/resizable';
import PageTransition from '@/components/ui/PageTransition';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import ProfitService, { ProfitFilter as ProfitFilterType } from '@/services/commercial/profit/ProfitService';
import ProfitFilter from '@/components/commercial/profits/ProfitFilter';
import ProfitSummaryCards from '@/components/commercial/profits/ProfitSummaryCards';
import ProfitTable from '@/components/commercial/profits/ProfitTable';
import ProfitDistributionChart from '@/components/commercial/profits/ProfitDistributionChart';
import ProfitTrendsChart from '@/components/commercial/profits/ProfitTrendsChart';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

const Profits = () => {
  const [filters, setFilters] = useState<ProfitFilterType>({});
  const [activeTab, setActiveTab] = useState<string>('profits');
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  
  const profitService = ProfitService.getInstance();
  
  const { 
    data: profits = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['profits', filters],
    queryFn: async () => {
      return await profitService.getProfits(filters);
    }
  });
  
  const { 
    data: summary,
    isLoading: isSummaryLoading
  } = useQuery({
    queryKey: ['profit-summary', filters],
    queryFn: async () => {
      return await profitService.getProfitSummary(
        filters.startDate,
        filters.endDate,
        filters.partyId
      );
    },
    initialData: {
      total_sales: 0,
      total_cost: 0,
      total_profit: 0,
      average_profit_percentage: 0,
      invoice_count: 0
    }
  });
  
  const handleFilterChange = (newFilters: ProfitFilterType) => {
    setFilters(newFilters);
  };
  
  const handleRecalculateAll = async () => {
    setIsRecalculating(true);
    try {
      const result = await profitService.recalculateAllProfits();
      if (result) {
        refetch();
      }
    } finally {
      setIsRecalculating(false);
    }
  };
  
  return (
    <PageTransition>
      <Helmet>
        <title>الأرباح - إدارة المبيعات</title>
      </Helmet>
      
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <Breadcrumbs
            items={[
              { label: 'الرئيسية', href: '/' },
              { label: 'إدارة المبيعات', href: '/commercial' },
              { label: 'الأرباح', href: '/commercial/profits' },
            ]}
          />
          
          <Button
            variant="outline"
            onClick={handleRecalculateAll}
            disabled={isRecalculating}
            className="mt-2 sm:mt-0 gap-2"
          >
            {isRecalculating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                جارِ إعادة الحساب...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                إعادة حساب جميع الأرباح
              </>
            )}
          </Button>
        </div>

        <ProfitFilter onFilterChange={handleFilterChange} />
        
        <ProfitSummaryCards summary={summary} />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="profits">الأرباح</TabsTrigger>
            <TabsTrigger value="distribution">توزيع الأرباح</TabsTrigger>
            <TabsTrigger value="trends">اتجاهات الأرباح</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profits" className="space-y-4">
            <ProfitTable profits={profits} isLoading={isLoading} />
          </TabsContent>
          
          <TabsContent value="distribution">
            <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
              <ResizablePanel defaultSize={50}>
                <div className="p-2">
                  <ProfitDistributionChart profits={profits} />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50}>
                <div className="p-2">
                  <ProfitTrendsChart profits={profits} />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </TabsContent>
          
          <TabsContent value="trends">
            <ProfitTrendsChart profits={profits} />
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default Profits;
