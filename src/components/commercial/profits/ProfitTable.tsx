
import { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProfitData } from '@/services/commercial/profit/ProfitService';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, FileText, TrendingUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface ProfitTableProps {
  profits: ProfitData[];
  isLoading: boolean;
}

const ProfitTable = ({ profits, isLoading }: ProfitTableProps) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(profits.length / itemsPerPage);
  
  const startIdx = (page - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, profits.length);
  const currentProfits = profits.slice(startIdx, endIdx);
  
  if (isLoading) {
    return (
      <Card className="p-6 flex justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2"></div>
          ))}
        </div>
      </Card>
    );
  }
  
  if (profits.length === 0) {
    return (
      <Card className="p-6 text-center">
        <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-2" />
        <h3 className="text-lg font-medium">لا توجد بيانات أرباح</h3>
        <p className="text-muted-foreground">قم بتصفية فواتير المبيعات المؤكدة لعرض الأرباح</p>
      </Card>
    );
  }
  
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>المبيعات</TableHead>
              <TableHead>التكلفة</TableHead>
              <TableHead>الربح</TableHead>
              <TableHead>نسبة الربح</TableHead>
              <TableHead>خيارات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentProfits.map((profit) => (
              <TableRow key={profit.id}>
                <TableCell>{format(new Date(profit.invoice_date), 'PPP', { locale: ar })}</TableCell>
                <TableCell>{profit.party_name}</TableCell>
                <TableCell className="font-medium">{profit.total_sales.toLocaleString('ar-SA')} ر.س</TableCell>
                <TableCell>{profit.total_cost.toLocaleString('ar-SA')} ر.س</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {profit.profit_amount.toLocaleString('ar-SA')} ر.س
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <ProfitBadge percentage={profit.profit_percentage} />
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => navigate(`/commercial/invoices/${profit.invoice_id}`)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>عرض الفاتورة</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-4 rtl:space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="flex items-center mx-2">
            <span className="text-sm">صفحة {page} من {totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Card>
  );
};

const ProfitBadge = ({ percentage }: { percentage: number }) => {
  let badgeVariant = "default";
  
  if (percentage > 30) {
    badgeVariant = "success";
  } else if (percentage > 15) {
    badgeVariant = "default";
  } else if (percentage > 5) {
    badgeVariant = "warning";
  } else {
    badgeVariant = "destructive";
  }
  
  return (
    <Badge 
      variant={badgeVariant as any} 
      className={`${
        badgeVariant === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
        badgeVariant === "warning" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
        badgeVariant === "destructive" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      }`}
    >
      {percentage.toFixed(1)}%
    </Badge>
  );
};

export default ProfitTable;
