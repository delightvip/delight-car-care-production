
import { useState } from "react";
import { DataTableWithLoading } from "@/components/ui/DataTableWithLoading";
import { ProfitData } from "@/services/commercial/profit/ProfitService";
import { format, parseISO } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProfitTableProps {
  profits: ProfitData[];
  isLoading: boolean;
}

const ProfitTable = ({ profits, isLoading }: ProfitTableProps) => {
  const columns = [
    {
      accessorKey: "invoice_date",
      header: "التاريخ",
      cell: ({ row }: any) => {
        return format(
          new Date(row.getValue("invoice_date")),
          "yyyy-MM-dd"
        );
      },
    },
    {
      accessorKey: "party_name",
      header: "العميل",
    },
    {
      accessorKey: "total_sales",
      header: "المبيعات",
      cell: ({ row }: any) => {
        return (
          <span className="font-medium">
            {Number(row.getValue("total_sales")).toLocaleString("ar-SA")} ر.س
          </span>
        );
      },
    },
    {
      accessorKey: "total_cost",
      header: "التكلفة",
      cell: ({ row }: any) => {
        return (
          <span>
            {Number(row.getValue("total_cost")).toLocaleString("ar-SA")} ر.س
          </span>
        );
      },
    },
    {
      accessorKey: "profit_amount",
      header: "الربح",
      cell: ({ row }: any) => {
        const profit = Number(row.getValue("profit_amount"));
        return (
          <span className={`font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {profit.toLocaleString("ar-SA")} ر.س
          </span>
        );
      },
    },
    {
      accessorKey: "profit_percentage",
      header: "نسبة الربح",
      cell: ({ row }: any) => {
        const percentage = Number(row.getValue("profit_percentage"));
        let badgeVariant = "default";
        
        if (percentage >= 25) {
          badgeVariant = "success";
        } else if (percentage >= 15) {
          badgeVariant = "default";
        } else if (percentage >= 5) {
          badgeVariant = "secondary";
        } else if (percentage >= 0) {
          badgeVariant = "outline";
        } else {
          badgeVariant = "destructive";
        }
        
        return (
          <Badge variant={badgeVariant as any}>
            {percentage.toFixed(1)}%
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }: any) => {
        const profit = row.original;
        return (
          <Button 
            asChild 
            variant="ghost" 
            size="icon"
            className="hover:bg-muted/80 transition-colors"
          >
            <Link to={`/commercial/invoices/${profit.invoice_id}`}>
              <ArrowUpRight className="h-4 w-4" />
              <span className="sr-only">عرض الفاتورة</span>
            </Link>
          </Button>
        );
      },
    },
  ];

  return (
    <DataTableWithLoading
      columns={columns}
      data={profits}
      isLoading={isLoading}
      noDataMessage="لا توجد أرباح متاحة"
      loadingMessage="جاري تحميل بيانات الأرباح..."
      pagination
    />
  );
};

export default ProfitTable;
