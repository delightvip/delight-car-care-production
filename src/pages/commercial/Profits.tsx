
import React, { useState, useCallback } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { useQuery } from '@tanstack/react-query';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ProfitService, { ProfitFilter as ProfitFilterType } from '@/services/commercial/profit/ProfitService';
import ProfitFilterComponent from '@/components/commercial/profits/ProfitFilter';
import ProfitSummaryCards from '@/components/commercial/profits/ProfitSummaryCards';
import ProfitTable from '@/components/commercial/profits/ProfitTable';
import ProfitDistributionChart from '@/components/commercial/profits/ProfitDistributionChart';
import ProfitTrendsChart from '@/components/commercial/profits/ProfitTrendsChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

const Profits = () => {
  const [filters, setFilters] = useState<ProfitFilterType>({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
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
  const handleFilterChange = useCallback((newFilters: ProfitFilterType) => {
    setFilters(newFilters);
  }, []);

  // تنزيل تقرير الأرباح كملف CSV
  const handleDownloadReport = useCallback(() => {
    if (!profits || profits.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    try {
      // إنشاء بيانات CSV
      let csvContent = "الرقم,الفاتورة,التاريخ,العميل,إجمالي المبيعات,إجمالي التكلفة,قيمة الربح,نسبة الربح\n";
      
      profits.forEach((profit, index) => {
        const row = [
          index + 1,
          profit.invoice_id,
          profit.invoice_date,
          profit.party_name,
          profit.total_sales,
          profit.total_cost,
          profit.profit_amount,
          `${profit.profit_percentage.toFixed(2)}%`
        ].join(",");
        csvContent += row + "\n";
      });
      
      // إنشاء رابط التنزيل
      const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `تقرير_الأرباح_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      
      // تنزيل الملف
      link.click();
      document.body.removeChild(link);
      
      toast.success('تم تنزيل التقرير بنجاح');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('حدث خطأ أثناء تنزيل التقرير');
    }
  }, [profits]);
  
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
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 sm:rtl:space-x-reverse">
            <Button
              onClick={handleDownloadReport}
              disabled={isLoading || !profits || profits.length === 0}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              تصدير التقرير
            </Button>
            <Button
              onClick={handleRecalculateAllProfits}
              disabled={isRecalculating}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
              إعادة حساب جميع الأرباح
            </Button>
          </div>
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
          <ProfitFilterComponent onFilterChange={handleFilterChange} />

          {isSummaryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : summary ? (
            <ProfitSummaryCards summary={summary} />
          ) : null}

          <Tabs defaultValue="charts" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="charts">الرسوم البيانية</TabsTrigger>
              <TabsTrigger value="details">التفاصيل</TabsTrigger>
            </TabsList>
            
            <TabsContent value="charts" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-medium mb-4">توزيع الأرباح</h3>
                  <div className="h-[300px]">
                    {isLoading ? (
                      <Skeleton className="h-full w-full" />
                    ) : profits && profits.length > 0 ? (
                      <ProfitDistributionChart profits={profits} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground flex-col">
                        <AlertTriangle className="h-8 w-8 mb-2" />
                        <p>لا توجد بيانات كافية لعرض الرسم البياني</p>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-medium mb-4">اتجاهات الأرباح</h3>
                  <div className="h-[300px]">
                    {isLoading ? (
                      <Skeleton className="h-full w-full" />
                    ) : profits && profits.length > 0 ? (
                      <ProfitTrendsChart profits={profits} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground flex-col">
                        <AlertTriangle className="h-8 w-8 mb-2" />
                        <p>لا توجد بيانات كافية لعرض الرسم البياني</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="details">
              <div>
                <h3 className="text-lg font-medium mb-4">تفاصيل الأرباح</h3>
                <ProfitTable profits={profits || []} isLoading={isLoading} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  );
};

export default Profits;
