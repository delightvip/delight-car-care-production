
import React from 'react';
import { Clock, AlertTriangle, CheckCircle2, X, BarChart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductionStats } from '@/services/production/ProductionTypes';
import { motion } from 'framer-motion';

type ProductionStatsCardsProps = {
  stats: ProductionStats;
  isLoading: boolean;
};

const ProductionStatsCards = ({ stats, isLoading }: ProductionStatsCardsProps) => {
  const cards = [
    {
      title: 'إجمالي الأوامر',
      value: stats?.totalOrders || 0,
      description: 'إجمالي عدد أوامر الإنتاج',
      icon: <BarChart className="h-5 w-5 text-blue-600" />,
      color: 'bg-blue-100'
    },
    {
      title: 'قيد الانتظار',
      value: stats?.pendingOrders || 0,
      description: 'أوامر بانتظار التنفيذ',
      icon: <Clock className="h-5 w-5 text-amber-600" />,
      color: 'bg-amber-100'
    },
    {
      title: 'قيد التنفيذ',
      value: stats?.inProgressOrders || 0,
      description: 'أوامر جاري تنفيذها',
      icon: <AlertTriangle className="h-5 w-5 text-blue-600" />,
      color: 'bg-blue-100'
    },
    {
      title: 'مكتملة',
      value: stats?.completedOrders || 0,
      description: 'أوامر تم إنجازها',
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      color: 'bg-green-100'
    },
    {
      title: 'ملغية',
      value: stats?.cancelledOrders || 0,
      description: 'أوامر تم إلغاؤها',
      icon: <X className="h-5 w-5 text-red-600" />,
      color: 'bg-red-100'
    },
    {
      title: 'إجمالي التكلفة',
      value: `${stats?.totalCost?.toFixed(2) || 0} ج.م`,
      description: 'إجمالي تكلفة الإنتاج',
      icon: <BarChart className="h-5 w-5 text-purple-600" />,
      color: 'bg-purple-100'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {cards.map((card, index) => (
        <motion.div key={index} variants={cardVariants}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{card.title}</CardTitle>
                <div className={`p-2 rounded-full ${card.color}`}>
                  {card.icon}
                </div>
              </div>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <span className="animate-pulse bg-muted inline-block h-8 w-24 rounded"></span>
                ) : (
                  card.value
                )}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default ProductionStatsCards;
