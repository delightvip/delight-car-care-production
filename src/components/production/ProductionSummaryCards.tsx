import React from 'react';
import { ClipboardList, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';

interface ProductionSummaryCardsProps {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  totalCost: number;
  isLoading?: boolean;
  dateRange?: { from?: Date; to?: Date };
}

const cardConfigs = [
  {
    key: 'total',
    title: 'إجمالي أوامر الإنتاج',
    icon: <ClipboardList className="h-7 w-7" />, 
    color: 'primary',
    description: 'عدد جميع أوامر الإنتاج المسجلة',
    className: 'order-1',
  },
  {
    key: 'pending',
    title: 'قيد الانتظار',
    icon: <Clock className="h-7 w-7" />, 
    color: 'warning',
    description: 'أوامر لم يبدأ تنفيذها بعد',
    className: 'order-2',
  },
  {
    key: 'inProgress',
    title: 'قيد التنفيذ',
    icon: <AlertTriangle className="h-7 w-7" />, 
    color: 'info',
    description: 'أوامر يتم تنفيذها حاليًا',
    className: 'order-3',
  },
  {
    key: 'completed',
    title: 'مكتملة',
    icon: <CheckCircle2 className="h-7 w-7" />, 
    color: 'success',
    description: 'أوامر تم الانتهاء منها بنجاح',
    className: 'order-4',
  },
  {
    key: 'cancelled',
    title: 'ملغاة',
    icon: <XCircle className="h-7 w-7" />, 
    color: 'danger',
    description: 'أوامر تم إلغاؤها',
    className: 'order-5',
  },
  {
    key: 'totalCost',
    title: 'إجمالي تكلفة الإنتاج',
    icon: <ClipboardList className="h-7 w-7" />, 
    color: 'secondary',
    description: 'إجمالي تكلفة جميع أوامر الإنتاج',
    className: 'lg:col-span-2 order-6',
    valueRender: (v: number, isLoading: boolean) => isLoading ? '...' : v.toLocaleString('en-US', {minimumFractionDigits:2}) + ' ج.م',
  },
];

const ProductionSummaryCards: React.FC<ProductionSummaryCardsProps> = ({
  total,
  pending,
  inProgress,
  completed,
  cancelled,
  totalCost,
  isLoading = false,
  dateRange
}) => {
  const values: Record<string, number> = {
    total,
    pending,
    inProgress,
    completed,
    cancelled,
    totalCost
  };
  return (
    <div className="flex flex-row flex-nowrap gap-2 mb-2 w-full justify-center overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
      {cardConfigs.map(card => {
        // تحديد لون البطاقة حسب الحالة مع دعم الوضع الليلي والنهاري
        let bgColor = 'bg-zinc-100/80 dark:bg-zinc-900/80';
        let borderColor = 'border-zinc-200 dark:border-zinc-800';
        let textColor = 'text-zinc-700 dark:text-zinc-200';
        switch (card.key) {
          case 'pending':
            bgColor = 'bg-yellow-50 dark:bg-yellow-900/40';
            borderColor = 'border-yellow-200 dark:border-yellow-700';
            textColor = 'text-yellow-800 dark:text-yellow-200';
            break;
          case 'inProgress':
            bgColor = 'bg-blue-50 dark:bg-blue-900/40';
            borderColor = 'border-blue-200 dark:border-blue-700';
            textColor = 'text-blue-800 dark:text-blue-200';
            break;
          case 'completed':
            bgColor = 'bg-green-50 dark:bg-green-900/40';
            borderColor = 'border-green-200 dark:border-green-700';
            textColor = 'text-green-800 dark:text-green-200';
            break;
          case 'cancelled':
            bgColor = 'bg-red-50 dark:bg-red-900/40';
            borderColor = 'border-red-200 dark:border-red-700';
            textColor = 'text-red-800 dark:text-red-200';
            break;
          case 'totalCost':
            bgColor = 'bg-purple-50 dark:bg-purple-900/40';
            borderColor = 'border-purple-200 dark:border-purple-700';
            textColor = 'text-purple-800 dark:text-purple-200';
            break;
          case 'total':
            bgColor = 'bg-sky-50 dark:bg-sky-900/40';
            borderColor = 'border-sky-200 dark:border-sky-700';
            textColor = 'text-sky-800 dark:text-sky-200';
            break;
        }
        return (
          <div
            key={card.key}
            className={
              `flex flex-col items-center justify-center ${bgColor} ${borderColor} ${textColor} rounded-[6px] min-h-[36px] px-3 py-1 text-[13px] md:text-base font-medium text-center min-w-[135px] max-w-[150px] ` +
              card.className
            }
            style={{ lineHeight: 1.2, minWidth: 0 }}
          >
            <div className="flex items-center gap-1 mb-0.5">
              {React.cloneElement(card.icon, { className: 'h-4 w-4' })}
              <span className="truncate font-semibold" style={{fontSize:'13px'}}>{card.title}</span>
            </div>
            <span className="font-bold text-[15px] md:text-lg">
              {card.valueRender ? card.valueRender(values[card.key], isLoading) : (isLoading ? '...' : values[card.key])}
            </span>
            <span className="truncate opacity-70 font-normal mt-0" style={{fontSize: '11.5px'}}>{card.description}</span>
          </div>
        );
      })}
    </div>
  );
};

export default ProductionSummaryCards;
