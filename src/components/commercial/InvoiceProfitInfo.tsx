
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvoiceItem } from '@/services/CommercialTypes';
import { InvoiceProfitCalculator, ProfitCalculationResult } from '@/services/commercial/invoice/InvoiceProfitCalculator';
import { Skeleton } from '@/components/ui/skeleton';

interface InvoiceProfitInfoProps {
  invoiceItems: InvoiceItem[];
  title?: string;
}

const InvoiceProfitInfo: React.FC<InvoiceProfitInfoProps> = ({ invoiceItems, title = "معلومات الربح" }) => {
  const [loading, setLoading] = React.useState(true);
  const [profitData, setProfitData] = React.useState<ProfitCalculationResult | null>(null);
  
  React.useEffect(() => {
    if (invoiceItems.length > 0) {
      const calculatProfit = async () => {
        setLoading(true);
        try {
          const calculator = new InvoiceProfitCalculator();
          const result = await calculator.calculateProfit(invoiceItems);
          setProfitData(result);
        } catch (error) {
          console.error('Error calculating profit:', error);
        } finally {
          setLoading(false);
        }
      };
      
      calculatProfit();
    } else {
      setProfitData(null);
      setLoading(false);
    }
  }, [invoiceItems]);
  
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
            <Skeleton className="h-4 w-[250px]" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!profitData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>لا توجد بيانات لحساب الربح.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted p-3 rounded-md">
            <div className="text-muted-foreground text-sm">إجمالي التكلفة</div>
            <div className="text-xl font-bold">{profitData.totalCost.toFixed(2)}</div>
          </div>
          <div className="bg-muted p-3 rounded-md">
            <div className="text-muted-foreground text-sm">إجمالي المبيعات</div>
            <div className="text-xl font-bold">{profitData.totalPrice.toFixed(2)}</div>
          </div>
          <div className="bg-muted p-3 rounded-md">
            <div className="text-muted-foreground text-sm">إجمالي الربح</div>
            <div className="text-xl font-bold">{profitData.profit.toFixed(2)}</div>
          </div>
          <div className="bg-muted p-3 rounded-md">
            <div className="text-muted-foreground text-sm">هامش الربح</div>
            <div className="text-xl font-bold">{profitData.profitMargin.toFixed(2)}%</div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الصنف</TableHead>
                <TableHead className="text-right">الكمية</TableHead>
                <TableHead className="text-right">سعر التكلفة</TableHead>
                <TableHead className="text-right">سعر البيع</TableHead>
                <TableHead className="text-right">إجمالي التكلفة</TableHead>
                <TableHead className="text-right">إجمالي البيع</TableHead>
                <TableHead className="text-right">الربح</TableHead>
                <TableHead className="text-right">هامش الربح</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profitData.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{item.cost_price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{item.unit_price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{item.total_cost.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{item.total_price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{item.item_profit.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{item.item_profit_margin.toFixed(2)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceProfitInfo;
