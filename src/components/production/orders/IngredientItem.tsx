
import React from 'react';
import { Badge } from '@/components/ui/badge';

type IngredientItemProps = {
  name: string;
  quantity: number;
  unit?: string;
  available?: boolean;
  type?: string;
};

const IngredientItem = ({ name, quantity, unit = '', available, type }: IngredientItemProps) => {
  return (
    <div className="flex justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors group">
      <div className="flex items-center">
        <span className="font-medium">{name}</span>
        <span className="text-sm text-muted-foreground mx-2">
          ({quantity.toFixed(2)}{unit && ` ${unit}`})
        </span>
        {type && (
          <Badge variant="outline" className="mr-2">{type}</Badge>
        )}
      </div>
      
      {available !== undefined && (
        available ? (
          <Badge className="bg-green-100 text-green-800 group-hover:bg-green-200 transition-colors">متوفر</Badge>
        ) : (
          <Badge className="bg-red-100 text-red-800 group-hover:bg-red-200 transition-colors">غير متوفر</Badge>
        )
      )}
    </div>
  );
};

export default IngredientItem;
