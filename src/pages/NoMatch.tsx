
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const NoMatch: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">404</h1>
      <h2 className="text-2xl font-semibold mt-2 mb-4 text-gray-800 dark:text-gray-200">الصفحة غير موجودة</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        عذرًا، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
      </p>
      <Button asChild className="flex items-center gap-2">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          <span>العودة إلى الصفحة الرئيسية</span>
        </Link>
      </Button>
    </div>
  );
};

export default NoMatch;
