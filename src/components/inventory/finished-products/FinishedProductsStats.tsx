import React from 'react';
import { BarChart2, AlertTriangle, Layers } from 'lucide-react';

interface FinishedProductsStatsProps {
  total: number;
  lowStock: number;
  totalValue: number;
  onStatClick?: (type: 'total' | 'lowStock' | 'totalValue') => void;
}

const statConfigs = [
  {
    key: 'total',
    icon: Layers,
    label: 'إجمالي المنتجات النهائية',
    color: 'text-blue-500 dark:text-blue-300',
    bg: 'from-blue-100/60 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/30',
  },
  {
    key: 'lowStock',
    icon: AlertTriangle,
    label: 'منتجات منخفضة المخزون',
    color: 'text-yellow-500 dark:text-yellow-300',
    bg: 'from-yellow-100/60 to-yellow-50 dark:from-yellow-900/40 dark:to-yellow-800/30',
  },
  {
    key: 'totalValue',
    icon: BarChart2,
    label: 'إجمالي قيمة المخزون',
    color: 'text-emerald-500 dark:text-emerald-300',
    bg: 'from-emerald-100/60 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-800/30',
  },
];

const FinishedProductsStats: React.FC<FinishedProductsStatsProps> = ({ total, lowStock, totalValue, onStatClick }) => {
  const values = { total, lowStock, totalValue };
  return (
    <div className="grid grid-cols-3 gap-2 mb-4 max-w-3xl mx-auto">
      {statConfigs.map(({ key, icon: Icon, label, color, bg }) => (
        <button
          key={key}
          className={`stat-card flex items-center gap-3 py-2 px-3 bg-gradient-to-r ${bg} cursor-pointer group focus:ring-2 focus:ring-primary/40 transition-all min-h-[64px]`}
          style={{ fontSize: '0.97rem' }}
          onClick={() => onStatClick && onStatClick(key as any)}
        >
          <Icon className={`${color} group-hover:scale-110 transition-transform`} size={26} />
          <div className="text-right flex-1">
            <div className="stat-value text-lg font-bold mb-0.5">{key === 'totalValue' ? values[key].toLocaleString() + ' ج.م' : values[key]}</div>
            <div className="stat-label text-xs opacity-80 font-normal">{label}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default FinishedProductsStats;
