import React from 'react';

interface InvoiceSummaryCardProps {
  total: number;
  itemsCount: number;
  currency?: string;
  className?: string;
}

export const InvoiceSummaryCard: React.FC<InvoiceSummaryCardProps> = ({ total, itemsCount, currency = 'ر.س', className }) => {
  return (
    <div className={`rounded-lg border bg-white shadow-sm p-4 mb-4 ${className || ''}`.trim()}>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-600">عدد العناصر</span>
          <span className="font-bold text-lg">{itemsCount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-600">الإجمالي الكلي</span>
          <span className="font-bold text-xl text-primary">{total.toFixed(2)} {currency}</span>
        </div>
      </div>
    </div>
  );
};
