
import React from 'react';
import PageTransition from '@/components/ui/PageTransition';

const Analytics = () => {
  return (
    <PageTransition>
      <div className="container px-4 py-16 md:py-24 mx-auto max-w-7xl">
        <div className="flex flex-col items-start pb-6 mb-6 border-b">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 md:text-4xl dark:text-white">
            التحليلات والإحصائيات
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            عرض مؤشرات الأداء والتحليلات الإحصائية
          </p>
        </div>
        
        <div className="grid gap-6 mt-8">
          <div className="p-8 border rounded-lg shadow-sm bg-card">
            <h2 className="mb-6 text-xl font-semibold">التحليلات قيد التطوير</h2>
            <p className="text-muted-foreground">
              هذه الصفحة قيد التطوير وسيتم إضافة المزيد من المخططات والتحليلات قريباً.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Analytics;
