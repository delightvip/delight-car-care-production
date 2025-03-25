
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface RawMaterial {
  id: number;
  code: string;
  name: string;
}

interface IngredientSelectorProps {
  rawMaterials: RawMaterial[];
  selectedMaterial: string;
  percentage: number;
  onMaterialChange: (value: string) => void;
  onPercentageChange: (value: number) => void;
  onAdd: () => void;
}

const IngredientSelector: React.FC<IngredientSelectorProps> = ({
  rawMaterials,
  selectedMaterial,
  percentage,
  onMaterialChange,
  onPercentageChange,
  onAdd
}) => {
  return (
    <div className="flex gap-2 mb-4">
      <Select 
        value={selectedMaterial} 
        onValueChange={onMaterialChange}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="اختر مادة أولية" />
        </SelectTrigger>
        <SelectContent>
          {rawMaterials.map(material => (
            <SelectItem 
              key={material.code} 
              value={material.code || `material_${material.id}`} // Ensure non-empty value
            >
              {material.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="w-32 flex">
        <Input
          type="number"
          value={percentage || ''}
          onChange={e => onPercentageChange(Number(e.target.value))}
          min={1}
          max={100}
          placeholder="النسبة %"
        />
      </div>
      <Button 
        type="button" 
        onClick={onAdd}
      >
        إضافة
      </Button>
    </div>
  );
};

export default IngredientSelector;
