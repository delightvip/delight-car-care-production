
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Package, Beaker, Droplet } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface IngredientDisplayData {
  name: string;
  code: string;
  unit: string;
  type: string;
  unit_cost: number;
}

interface IngredientsTableProps {
  ingredients: any[];
  getIngredientData: (ingredient: any) => IngredientDisplayData;
}

const IngredientsTable: React.FC<IngredientsTableProps> = ({
  ingredients,
  getIngredientData,
}) => {
  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'raw':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'semi':
        return <Beaker className="h-4 w-4 text-purple-600" />;
      case 'water':
        return <Droplet className="h-4 w-4 text-cyan-600" />;
      default:
        return null;
    }
  };
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>الكود</TableHead>
          <TableHead>الاسم</TableHead>
          <TableHead>النوع</TableHead>
          <TableHead className="text-center">النسبة</TableHead>
          <TableHead className="text-center">الوحدة</TableHead>
          <TableHead className="text-center">المساهمة في التكلفة</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ingredients.map((ingredient: any) => {
          const data = getIngredientData(ingredient);
          const costContribution = (ingredient.percentage / 100) * (data.unit_cost || 0);
          
          return (
            <TableRow key={ingredient.id}>
              <TableCell>{data.code}</TableCell>
              <TableCell>{data.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {getTypeIcon(data.type)}
                  <span>
                    {data.type === 'raw' ? 'مادة خام' : 
                     data.type === 'semi' ? 'منتج نصف مصنع' : 
                     data.type === 'water' ? 'ماء' : 'غير معروف'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">{ingredient.percentage}%</TableCell>
              <TableCell className="text-center">{data.unit}</TableCell>
              <TableCell className="text-center">{costContribution.toFixed(2)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default IngredientsTable;
