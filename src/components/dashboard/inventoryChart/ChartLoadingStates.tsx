
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, BarChart2, PieChart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

export const ChartLoading: React.FC<{ height?: string | number }> = ({ height = '16rem' }) => (
  <div className="flex flex-col items-center justify-center" style={{ height }}>
    <Skeleton className="h-56 w-56 rounded-full" />
    <motion.div
      className="flex flex-col items-center mt-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <p className="text-sm text-muted-foreground">جاري تحميل البيانات...</p>
      <div className="flex gap-1 mt-2">
        <motion.div 
          className="w-2 h-2 bg-primary/60 rounded-full" 
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: "loop", delay: 0 }}
        />
        <motion.div 
          className="w-2 h-2 bg-primary/60 rounded-full" 
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: "loop", delay: 0.2 }}
        />
        <motion.div 
          className="w-2 h-2 bg-primary/60 rounded-full" 
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: "loop", delay: 0.4 }}
        />
      </div>
    </motion.div>
  </div>
);

export const ChartError: React.FC<{ height?: string | number, message?: string }> = ({ 
  height = '16rem',
  message = 'حدث خطأ أثناء تحميل بيانات توزيع المخزون'
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    style={{ height }}
  >
    <Alert variant="destructive" className="h-full flex flex-col justify-center items-center text-center p-6">
      <AlertCircle className="h-12 w-12 mb-4" />
      <AlertTitle className="text-lg">خطأ</AlertTitle>
      <AlertDescription className="mt-2">{message}</AlertDescription>
      <Button variant="destructive" className="mt-4" onClick={() => window.location.reload()}>
        إعادة التحميل
      </Button>
    </Alert>
  </motion.div>
);

export const ChartEmpty: React.FC<{ height?: string | number, message?: string }> = ({
  height = '16rem',
  message = 'لا توجد بيانات مخزون لعرضها. قم بإضافة عناصر للمخزون أولاً.'
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="flex flex-col items-center justify-center text-center p-6 border rounded-lg"
    style={{ height }}
  >
    <PieChart className="h-12 w-12 text-muted-foreground/60 mb-4" />
    <h3 className="text-lg font-medium">لا توجد بيانات</h3>
    <p className="text-muted-foreground mt-2 max-w-xs">{message}</p>
  </motion.div>
);

// بإضافة مكون Button من shadcn
import { Button } from '@/components/ui/button';
