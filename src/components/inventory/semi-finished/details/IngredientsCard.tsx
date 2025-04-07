
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  // Get type badge color
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'raw':
        return 'bg-blue-500';
      case 'semi':
        return 'bg-purple-500';
      case 'water':
        return 'bg-cyan-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Get type name in Arabic
  const getTypeName = (type: string) => {
    switch (type) {
      case 'raw':
        return 'مادة خام';
      case 'semi':
        return 'منتج نصف مصنع';
      case 'water':
        return 'ماء';
      default:
        return type;
    }
  };
  
  // Calculate ingredient cost contribution
  const calculateIngredientCost = (ingredient: any, ingredientData: any) => {
    if (!ingredientData.unit_cost) return 0;
    return (ingredient.percentage / 100) * ingredientData.unit_cost;
  };
  
  if (isLoadingIngredients) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>مكونات المنتج</CardTitle>
          <CardDescription>جاري تحميل المكونات...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center p-2 border rounded-md">
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  if (ingredientsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>مكونات المنتج</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>خطأ</AlertTitle>
            <AlertDescription>
              حدث خطأ أثناء تحميل المكونات. يرجى المحاولة مرة أخرى.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>مكونات المنتج</CardTitle>
        <CardDescription>
          المكونات المستخدمة في صناعة المنتج ونسبها
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ingredients.length > 0 ? (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {ingredients.map((ingredient, index) => {
              const ingredientData = getIngredientData(ingredient);
              const cost = calculateIngredientCost(ingredient, ingredientData);
              const type = ingredient.ingredient_type || 'unknown';
              
              return (
                <div 
                  key={`${index}-${ingredientData.code}`} 
                  className="flex justify-between items-center p-3 border rounded-md"
                >
                  <div className="space-y-1">
                    <div className="font-medium flex items-center gap-2">
                      {ingredientData.name}
                      <Badge variant="secondary" className={getTypeBadgeColor(ingredientData.type)}>
                        {getTypeName(ingredientData.type)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      النسبة: {ingredient.percentage}%
                      {cost > 0 && (
                        <span className="ms-2">
                          | المساهمة في التكلفة: {cost.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-muted-foreground text-center py-2">
            لم يتم إضافة مكونات لهذا المنتج
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IngredientsCard;
