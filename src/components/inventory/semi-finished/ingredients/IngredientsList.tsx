
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ingredient, WaterIngredient } from '@/types/inventoryTypes';

interface IngredientsListProps {
  ingredients: Ingredient[];
  onRemoveIngredient: (id: number, type: string) => void;
  hasWater: boolean;
  totalCost: number;
}

const IngredientsList: React.FC<IngredientsListProps> = ({
  ingredients,
  onRemoveIngredient,
  hasWater,
  totalCost
}) => {
  const [totalPercentage, setTotalPercentage] = useState<number>(0);
  const [waterPercentage, setWaterPercentage] = useState<number>(0);
  
  // Calculate total percentage and update water percentage if needed
  useEffect(() => {
    const nonWaterIngredients = ingredients.filter(ing => 
      (ing as any).ingredient_type !== 'water'
    );
    
    const nonWaterTotal = nonWaterIngredients.reduce(
      (sum, ing) => sum + ing.percentage, 
      0
    );
    
    setTotalPercentage(nonWaterTotal);
    
    // If we have water, update its percentage
    if (hasWater) {
      const waterIngredient = ingredients.find(ing => 
        (ing as WaterIngredient).ingredient_type === 'water'
      ) as WaterIngredient | undefined;
      
      if (waterIngredient) {
        const newWaterPercentage = Math.max(0, 100 - nonWaterTotal);
        setWaterPercentage(newWaterPercentage);
        waterIngredient.percentage = newWaterPercentage;
      }
    }
  }, [ingredients, hasWater]);
  
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
  const calculateIngredientCost = (ingredient: Ingredient) => {
    if (!ingredient.unit_cost) return 0;
    return (ingredient.percentage / 100) * ingredient.unit_cost;
  };
  
  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">
          إجمالي النسب: {hasWater ? 100 : totalPercentage}%
        </div>
        {totalCost > 0 && (
          <div className="text-sm font-medium">
            إجمالي التكلفة: {totalCost.toFixed(2)}
          </div>
        )}
      </div>
      
      {ingredients.length > 0 ? (
        <>
          {ingredients.map((ingredient) => {
            const type = (ingredient as any).ingredient_type || 'raw';
            const isWater = type === 'water';
            const cost = calculateIngredientCost(ingredient);
            
            return (
              <div 
                key={`${type}-${ingredient.id}-${ingredient.code}`} 
                className="flex justify-between items-center p-3 border rounded-md"
              >
                <div className="space-y-1">
                  <div className="font-medium flex items-center gap-2">
                    {ingredient.name}
                    <Badge variant="secondary" className={getTypeBadgeColor(type)}>
                      {getTypeName(type)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    النسبة: {isWater ? waterPercentage : ingredient.percentage}%
                    {cost > 0 && (
                      <span className="ms-2">
                        | المساهمة في التكلفة: {cost.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveIngredient(ingredient.id, type)}
                  disabled={isWater && waterPercentage === 0}
                >
                  <X size={16} />
                </Button>
              </div>
            );
          })}
        </>
      ) : (
        <div className="text-muted-foreground text-center py-2">
          لم يتم إضافة مكونات بعد
        </div>
      )}
    </div>
  );
};

export default IngredientsList;
