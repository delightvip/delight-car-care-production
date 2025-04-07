
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import IngredientsTable from './IngredientsTable';

interface IngredientsCardProps {
  ingredients: any[];
  isLoadingIngredients: boolean;
  ingredientsError: any;
  getIngredientData: (ingredient: any) => any;
}

const IngredientsCard: React.FC<IngredientsCardProps> = ({
  ingredients,
  isLoadingIngredients,
  ingredientsError,
  getIngredientData
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>مكونات المنتج</CardTitle>
        <CardDescription>
          قائمة المكونات المستخدمة في تصنيع المنتج
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingIngredients ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : ingredientsError ? (
          <div className="text-center py-4 text-destructive">
            حدث خطأ في تحميل المكونات. يرجى المحاولة مرة أخرى.
          </div>
        ) : ingredients && ingredients.length > 0 ? (
          <IngredientsTable 
            ingredients={ingredients} 
            getIngredientData={getIngredientData} 
          />
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            لا توجد مكونات مسجلة لهذا المنتج
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IngredientsCard;
