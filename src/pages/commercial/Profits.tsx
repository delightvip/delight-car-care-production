
import React, { useState } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { useQuery } from '@tanstack/react-query';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import ProfitService, { ProfitFilter } from '@/services/commercial/profit/ProfitService';
import ProfitFilter from '@/components/commercial/profits/ProfitFilter';
import ProfitSummaryCards from '@/components/commercial/profits/ProfitSummaryCards';
import ProfitTable from '@/components/commercial/profits/ProfitTable';
import ProfitDistributionChart from '@/components/commercial/profits/ProfitDistributionChart';
import ProfitTrendsChart from '@/components/commercial/profits/ProfitTrendsChart';

const Profits = () => {
  const [filters, setFilters] = useState<ProfitFilter>({
    startDate: '',
    endDate: '',
    minProfit: '',
    maxProfit: '',
    partyId: '',
  });
  
  // حالة زر "إعادة حساب جميع الأرباح"
  const [isRecalculating, setIsRecalculating] = useState(false);
  
  // استدعاء بيانات الأرباح
  const { data: profits, isLoading, refetch } = useQuery({
    queryKey: ['profits', filters],
    queryFn: () => ProfitService.getInstance().getProfits(filters),
  });
  
  // استدعاء ملخص الأرباح
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['profitsSummary', filters],
    queryFn: () => {
      return ProfitService.getInstance().getProfitSummary(
        filters.startDate, 
        filters.endDate, 
        filters.partyId
      );
    },
  });
  
  // وظيفة إعادة حساب جميع الأرباح
  const handleRecalculateAllProfits = async () => {
    try {
      setIsRecalculating(true);
      await ProfitService.getInstance().recalculateAllProfits();
      toast.success('تم إعادة حساب جميع الأرباح بنجاح');
      refetch(); // تحديث البيانات بعد إعادة الحساب
    } catch (error) {
      console.error('Error recalculating profits:', error);
      toast.error('حدث خطأ أثناء إعادة حساب الأرباح');
    } finally {
      setIsRecalculating(false);
    }
  };
  
  // معالجة تغيير الفلتر
  const handleFilterChange = (newFilters: ProfitFilter) => {
    setFilters(newFilters);
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">تحليل الأرباح</h2>
            <p className="text-muted-foreground">
              قم بتحليل أرباح البيع ومراجعة أداء المبيعات
            </p>
          </div>
          <Button
            onClick={handleRecalculateAllProfits}
            disabled={isRecalculating}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            إعادة حساب جميع الأرباح
          </Button>
        </div>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">الرئيسية</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/commercial">المبيعات</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>الأرباح</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-6">
          <ProfitFilter onFilterChange={handleFilterChange} />

          {!isSummaryLoading && summary && (
            <ProfitSummaryCards summary={summary} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">توزيع الأرباح</h3>
              <div className="h-[300px]">
                <ProfitDistributionChart profits={profits?.slice(0, 5) || []} />
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">اتجاهات الأرباح</h3>
              <div className="h-[300px]">
                <ProfitTrendsChart profits={profits || []} />
              </div>
            </Card>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">تفاصيل الأرباح</h3>
            <ProfitTable profits={profits || []} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Profits;
