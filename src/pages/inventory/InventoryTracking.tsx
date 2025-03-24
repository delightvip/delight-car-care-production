
import React from 'react';
import { PageTransition } from '@/components/ui/PageTransition';

const InventoryTracking = () => {
  return (
    <PageTransition>
      <div className="container px-4 py-16 md:py-24 mx-auto max-w-7xl">
        <div className="flex flex-col items-start pb-6 mb-6 border-b">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 md:text-4xl dark:text-white">
            تتبع المخزون
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            متابعة حركة المخزون والتعديلات
          </p>
        </div>
        
        <div className="grid gap-6 mt-8">
          <div className="p-8 border rounded-lg shadow-sm bg-card">
            <h2 className="mb-6 text-xl font-semibold">تتبع المخزون قيد التطوير</h2>
            <p className="text-muted-foreground">
              هذه الصفحة قيد التطوير وسيتم إضافتها قريباً.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default InventoryTracking;
