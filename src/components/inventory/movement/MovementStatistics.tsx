
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownIcon, ArrowUpIcon, HistoryIcon, SettingsIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface MovementStatisticsProps {
  totalIn: number;
  totalOut: number;
  totalAdjustments: number;
  movementsByType: Record<string, number>;
  totalMovements: number;
}

const MovementStatistics: React.FC<MovementStatisticsProps> = ({
  totalIn,
  totalOut,
  totalAdjustments,
  movementsByType,
  totalMovements
}) => {
  // حساب النسب المئوية
  const inPercentage = totalMovements > 0 ? (totalIn / (totalIn + totalOut)) * 100 : 0;
  const outPercentage = totalMovements > 0 ? (totalOut / (totalIn + totalOut)) * 100 : 0;
  
  const getItemTypeName = (type: string) => {
    switch (type) {
      case 'raw':
        return 'مواد خام';
      case 'semi':
        return 'منتجات نصف مصنعة';
      case 'packaging':
        return 'مواد تعبئة';
      case 'finished':
        return 'منتجات نهائية';
      default:
        return type;
    }
  };
  
  // استخراج أكثر أنواع الأصناف حركة
  const topItemTypes = Object.entries(movementsByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <ArrowUpIcon className="mr-2 h-5 w-5 text-green-500" />
            حركات الوارد
          </CardTitle>
          <CardDescription>إجمالي الكميات الواردة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat('ar-EG').format(totalIn)}
          </div>
          <div className="mt-2">
            <Progress value={inPercentage} className="h-2 bg-muted" />
            <div className="text-xs text-muted-foreground mt-1">
              {inPercentage.toFixed(1)}% من إجمالي الحركات
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <ArrowDownIcon className="mr-2 h-5 w-5 text-red-500" />
            حركات الصادر
          </CardTitle>
          <CardDescription>إجمالي الكميات الصادرة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat('ar-EG').format(totalOut)}
          </div>
          <div className="mt-2">
            <Progress value={outPercentage} className="h-2 bg-muted" />
            <div className="text-xs text-muted-foreground mt-1">
              {outPercentage.toFixed(1)}% من إجمالي الحركات
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <SettingsIcon className="mr-2 h-5 w-5 text-amber-500" />
            حركات التعديل
          </CardTitle>
          <CardDescription>إجمالي تعديلات المخزون</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat('ar-EG').format(totalAdjustments)}
          </div>
          {totalAdjustments > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              {((totalAdjustments / (totalIn + totalOut + totalAdjustments)) * 100).toFixed(1)}% من جميع الحركات
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <HistoryIcon className="mr-2 h-5 w-5 text-blue-500" />
            توزيع الحركات
          </CardTitle>
          <CardDescription>حسب نوع الصنف</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {topItemTypes.length > 0 ? (
            topItemTypes.map(([type, count]) => (
              <div key={type} className="flex justify-between items-center text-sm">
                <span>{getItemTypeName(type)}</span>
                <span className="font-medium">{count} حركة</span>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground">لا توجد بيانات كافية</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MovementStatistics;
