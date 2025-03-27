import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ar } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import CommercialService, { InvoiceItem } from "@/services/CommercialService";
import InventoryService from "@/services/InventoryService";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ProfitAnalysisPage = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [type, setType] = useState<"sale" | "purchase">("sale");
  const [itemId, setItemId] = useState<number | undefined>(undefined);
  const [calculatedItems, setCalculatedItems] = useState<
    { item_id: number; quantity: number }[]
  >([]);

  const commercialService = CommercialService.getInstance();
  const inventoryService = InventoryService.getInstance();

  const { data: invoiceData, isLoading: isLoadingInvoiceData } = useQuery({
    queryKey: ["invoiceData", date, type],
    queryFn: () => {
      if (!date || !type) return [];
      const formattedDate = format(date, "yyyy-MM-dd");
      return commercialService.getInvoices().then((invoices) => {
        return invoices.filter(
          (invoice) => invoice.date === formattedDate && invoice.invoice_type === type
        );
      });
    },
  });

  const { data: inventoryData, isLoading: isLoadingInventoryData } = useQuery({
    queryKey: ["inventoryData"],
    queryFn: () => {
      return Promise.all([
        inventoryService.getRawMaterials(),
        inventoryService.getPackagingMaterials(),
        inventoryService.getSemiFinishedProducts(),
        inventoryService.getFinishedProducts(),
      ]).then((results) => {
        return results.flat();
      });
    },
  });

  useEffect(() => {
    if (invoiceData) {
      const items: { item_id: number; quantity: number }[] = [];
      invoiceData.forEach((invoice) => {
        invoice.items?.forEach((item) => {
          const existingItem = items.find((i) => i.item_id === item.item_id);
          if (existingItem) {
            existingItem.quantity += item.quantity;
          } else {
            items.push({ item_id: item.item_id, quantity: item.quantity });
          }
        });
      });
      setCalculatedItems(items);
    }
  }, [invoiceData]);

  // Fixed to match the expected type
  const isSpending = type !== "sale";

  const totalRevenue = calculatedItems.reduce((acc, calculatedItem) => {
    // Find unit cost for each item in the invoice data
    const itemUnitPrice = invoiceData
      ?.find((invoice) =>
        invoice.items?.find((item) => item.item_id === calculatedItem.item_id)
      )
      ?.items?.find((item) => item.item_id === calculatedItem.item_id)?.unit_price ||
      0;

    return acc + calculatedItem.quantity * itemUnitPrice;
  }, 0);

  // Calculate total cost based on the selected item
  const totalCost = calculatedItems.reduce((acc, calculatedItem) => {
    // Find unit cost for each item in the calculated items
    const itemUnitCost = inventoryData?.find(
      (item) => item.id === Number(calculatedItem.item_id)
    )?.unit_cost || 0;

    return acc + calculatedItem.quantity * itemUnitCost;
  }, 0);

  const totalProfit = totalRevenue - totalCost;

  const handleExport = () => {
    if (!date || !type) {
      toast.error("الرجاء تحديد التاريخ والنوع");
      return;
    }

    const formattedDate = format(date, "yyyy-MM-dd");
    const filename = `تحليل_الأرباح_${type}_${formattedDate}.csv`;

    let csvContent = "item_id,quantity,unit_price,unit_cost,revenue,cost,profit\n";
    calculatedItems.forEach((item) => {
      const itemUnitPrice = invoiceData
        ?.find((invoice) =>
          invoice.items?.find((i) => i.item_id === item.item_id)
        )
        ?.items?.find((i) => i.item_id === item.item_id)?.unit_price ||
        0;
      const itemUnitCost = inventoryData?.find((i) => i.id === Number(item.item_id))?.unit_cost || 0;
      const revenue = item.quantity * itemUnitPrice;
      const cost = item.quantity * itemUnitCost;
      const profit = revenue - cost;
      csvContent += `${item.item_id},${item.quantity},${itemUnitPrice},${itemUnitCost},${revenue},${cost},${profit}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>تحليل الأرباح</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>التاريخ</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-right font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    {date ? (
                      format(date, "PPP", { locale: ar })
                    ) : (
                      <span>اختر التاريخ</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>النوع</Label>
              <Select onValueChange={(value) => setType(value as "sale" | "purchase")}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">مبيعات</SelectItem>
                  <SelectItem value="purchase">مشتريات</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>إجمالي الإيرادات</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingInvoiceData ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  `${totalRevenue.toFixed(2)}`
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>إجمالي التكاليف</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingInventoryData ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  `${totalCost.toFixed(2)}`
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>إجمالي الأرباح</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingInvoiceData || isLoadingInventoryData ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  `${totalProfit.toFixed(2)}`
                )}
              </CardContent>
            </Card>
          </div>
          <Button onClick={handleExport}>تصدير</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitAnalysisPage;
