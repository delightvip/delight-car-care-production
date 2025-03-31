
import React from 'react';
import { ProfitData } from '@/services/commercial/profit/ProfitService';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DataTableWithLoading } from '@/components/ui/DataTableWithLoading';
import { Column } from '@/components/ui/data-table/types';

interface ProfitTableProps {
  profits: ProfitData[];
  isLoading: boolean;
}

const ProfitTable = ({ profits, isLoading }: ProfitTableProps) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  
  const getProfitBadge = (profit: number) => {
    if (profit < 0) {
      return <Badge className="bg-destructive">خسارة</Badge>;
    } else if (profit < 1000) {
      return <Badge variant="outline" className="text-amber-500 border-amber-500">منخفض</Badge>;
    } else if (profit < 5000) {
      return <Badge className="bg-green-500">متوسط</Badge>;
    } else {
      return <Badge className="bg-green-600">مرتفع</Badge>;
    }
  };
  
  const getProfitPercentageBadge = (percentage: number) => {
    if (percentage < 0) {
      return <Badge variant="destructive">{percentage.toFixed(1)}%</Badge>;
    } else if (percentage < 10) {
      return <Badge variant="outline" className="text-amber-500 border-amber-500">{percentage.toFixed(1)}%</Badge>;
    } else if (percentage < 25) {
      return <Badge className="bg-green-500">{percentage.toFixed(1)}%</Badge>;
    } else {
      return <Badge className="bg-green-600">{percentage.toFixed(1)}%</Badge>;
    }
  };

  const columns: Column[] = [
    {
      key: 'invoice_date',
      title: 'التاريخ',
      render: (record) => formatDate(record.invoice_date),
    },
    {
      key: 'party_name',
      title: 'العميل',
    },
    {
      key: 'total_sales',
      title: 'المبيعات',
      render: (record) => formatCurrency(record.total_sales),
    },
    {
      key: 'total_cost',
      title: 'التكلفة',
      render: (record) => formatCurrency(record.total_cost),
    },
    {
      key: 'profit_amount',
      title: 'قيمة الربح',
      render: (record) => formatCurrency(record.profit_amount),
    },
    {
      key: 'profit_badge',
      title: 'حالة الربح',
      render: (record) => getProfitBadge(record.profit_amount),
    },
    {
      key: 'profit_percentage',
      title: 'نسبة الربح',
      render: (record) => getProfitPercentageBadge(record.profit_percentage),
    },
    {
      key: 'actions',
      title: 'الإجراءات',
      render: (record) => (
        <Button asChild variant="ghost" size="sm">
          <Link to={`/commercial/invoices/${record.invoice_id}`} className="flex items-center gap-1">
            تفاصيل الفاتورة
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];
  
  const emptyState = (
    <div className="text-center p-4">
      <p className="text-muted-foreground text-lg">لا توجد بيانات أرباح لعرضها</p>
      <p className="text-sm text-muted-foreground">حاول تعديل معايير الفلتر لعرض نتائج مختلفة</p>
    </div>
  );
  
  return (
    <DataTableWithLoading
      columns={columns}
      data={profits}
      isLoading={isLoading}
      searchable
      searchKeys={['party_name', 'invoice_id']}
      pagination={true}
      itemsPerPage={10}
      emptyState={emptyState}
    />
  );
};

export default ProfitTable;
