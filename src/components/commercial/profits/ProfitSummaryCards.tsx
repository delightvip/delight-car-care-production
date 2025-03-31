
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfitSummary } from '@/services/commercial/profit/ProfitService';
import { TrendingUp, Banknote, ShoppingBag, ChartBar, Receipt } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

interface ProfitSummaryCardsProps {
  summary: ProfitSummary;
}

const ProfitSummaryCards = ({ summary }: ProfitSummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 shadow-sm border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            إجمالي الأرباح
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.total_profit.toLocaleString('ar-SA')} ر.س</div>
          <div className="text-xs text-muted-foreground mt-1">
            من إجمالي {summary.invoice_count} فاتورة
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            إجمالي المبيعات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.total_sales.toLocaleString('ar-SA')} ر.س</div>
          <div className="text-xs text-muted-foreground mt-1">
            من إجمالي {summary.invoice_count} فاتورة
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            إجمالي التكاليف
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.total_cost.toLocaleString('ar-SA')} ر.س</div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ChartBar className="h-4 w-4" />
            متوسط نسبة الربح
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.average_profit_percentage.toFixed(1)}%
          </div>
          <Progress 
            value={Math.min(summary.average_profit_percentage, 100)} 
            className="h-2 mt-2" 
          />
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            عدد الفواتير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.invoice_count}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            فاتورة مبيعات
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitSummaryCards;
