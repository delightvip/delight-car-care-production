
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Edit, ArrowLeft, PlusCircle, MinusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PackagingMaterialDetailsProps {
  materialId: number;
  onEditClick: () => void;
  onQuantityUpdate: (id: number, change: number) => void;
  onBackClick: () => void;
}

const PackagingMaterialDetails: React.FC<PackagingMaterialDetailsProps> = ({
  materialId,
  onEditClick,
  onQuantityUpdate,
  onBackClick
}) => {
  const { data: material, isLoading, error } = useQuery({
    queryKey: ['packagingMaterial', materialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('*')
        .eq('id', materialId)
        .single();
        
      if (error) {
        toast.error(`حدث خطأ أثناء تحميل البيانات: ${error.message}`);
        throw new Error(error.message);
      }
      
      return {
        id: data.id,
        code: data.code,
        name: data.name,
        unit: data.unit,
        price: data.unit_cost,
        quantity: data.quantity,
        minStock: data.min_stock,
        importance: data.importance || 0,
        totalValue: data.quantity * data.unit_cost,
        createdAt: new Date(data.created_at).toLocaleDateString('ar-EG'),
        updatedAt: new Date(data.updated_at).toLocaleDateString('ar-EG')
      };
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4 mb-2" />
            <Skeleton className="h-4 w-2/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Separator />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">حدث خطأ أثناء تحميل بيانات المنتج</p>
        <Button onClick={onBackClick}>العودة للقائمة</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <Button variant="outline" size="icon" onClick={onBackClick}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{material.name}</h1>
        </div>
        <Button onClick={onEditClick}>
          <Edit className="h-4 w-4 mr-2" />
          تعديل
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>معلومات أساسية</CardTitle>
            <CardDescription>معلومات أساسية عن مستلزم التعبئة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">الكود</p>
                <p className="font-medium">{material.code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">وحدة القياس</p>
                <p className="font-medium">{material.unit}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">سعر الوحدة</p>
                <p className="font-medium">{material.price} ج.م</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الأهمية</p>
                <p className="font-medium">{material.importance}/10</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الإضافة</p>
                <p className="font-medium">{material.createdAt}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">آخر تحديث</p>
                <p className="font-medium">{material.updatedAt}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>حالة المخزون</CardTitle>
            <CardDescription>معلومات عن المخزون الحالي والحد الأدنى</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">الكمية الحالية</p>
                <p className={`text-2xl font-bold ${
                  material.quantity <= material.minStock ? 'text-red-600' : 
                  material.quantity <= material.minStock * 1.5 ? 'text-amber-600' : 
                  'text-green-600'
                }`}>
                  {material.quantity} {material.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الحد الأدنى</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {material.minStock} {material.unit}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">حالة المخزون</p>
              <div className="w-full h-3 bg-gray-200 rounded-full">
                <div 
                  className={`h-full rounded-full ${
                    material.quantity <= material.minStock ? 'bg-red-500' : 
                    material.quantity <= material.minStock * 1.5 ? 'bg-amber-500' : 
                    'bg-green-500'
                  }`}
                  style={{ 
                    width: `${Math.min(100, Math.round((material.quantity / (material.minStock * 2)) * 100))}%` 
                  }}
                ></div>
              </div>
            </div>

            <div className="flex justify-center items-center space-x-4 rtl:space-x-reverse mt-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onQuantityUpdate(material.id, -1)}
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="text-3xl font-bold">{material.quantity}</p>
                <p className="text-sm text-muted-foreground">{material.unit}</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onQuantityUpdate(material.id, 1)}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>القيمة المالية</CardTitle>
            <CardDescription>معلومات عن القيمة المالية لمستلزم التعبئة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">سعر الوحدة</p>
                <p className="text-2xl font-bold">{material.price} ج.م</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الكمية</p>
                <p className="text-2xl font-bold">{material.quantity} {material.unit}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي القيمة</p>
                <p className="text-2xl font-bold">{material.totalValue} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PackagingMaterialDetails;
