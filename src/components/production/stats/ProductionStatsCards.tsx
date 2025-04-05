
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Package, Clock, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { ProductionStats } from '@/services/production/ProductionTypes';
import { motion } from 'framer-motion';

interface ProductionStatsCardsProps {
  stats: ProductionStats;
  isLoading: boolean;
}

const ProductionStatsCards = ({ stats, isLoading }: ProductionStatsCardsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: "easeOut"
      }
    })
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <motion.div 
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={0}
        className="col-span-1"
      >
        <Card className="hover:bg-primary/5 transition-colors">
          <CardContent className="p-4 flex justify-between items-center">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">إجمالي أوامر الإنتاج</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.totalOrders}</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div 
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={1}
        className="col-span-1"
      >
        <Card className="hover:bg-amber-500/5 transition-colors">
          <CardContent className="p-4 flex justify-between items-center">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">قيد الانتظار</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.pendingOrders}</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div 
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={2}
        className="col-span-1"
      >
        <Card className="hover:bg-blue-500/5 transition-colors">
          <CardContent className="p-4 flex justify-between items-center">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">قيد التنفيذ</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.inProgressOrders}</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-blue-600" />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div 
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={3}
        className="col-span-1"
      >
        <Card className="hover:bg-green-500/5 transition-colors">
          <CardContent className="p-4 flex justify-between items-center">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">مكتمل</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.completedOrders}</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div 
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={4}
        className="col-span-1"
      >
        <Card className="hover:bg-red-500/5 transition-colors">
          <CardContent className="p-4 flex justify-between items-center">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ملغي</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.cancelledOrders}</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="h-6 w-6 text-red-600" />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div 
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={5}
        className="col-span-1"
      >
        <Card className="hover:bg-primary/5 transition-colors border-primary/20">
          <CardContent className="p-4 flex justify-between items-center">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">إجمالي التكلفة</p>
                  <h3 className="text-xl font-bold mt-1">{formatCurrency(stats.totalCost)}</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ProductionStatsCards;
