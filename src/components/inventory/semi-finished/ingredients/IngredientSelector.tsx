
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Ingredient } from '@/types/inventoryTypes';
import SemiFinishedIngredientTypeSwitcher from './SemiFinishedIngredientTypeSwitcher';

interface IngredientSelectorProps {
  rawMaterials: any[];
  semiFinishedProducts: any[];
  onAddIngredient: (ingredient: Ingredient) => void;
  ingredients: Ingredient[];
  hasWater: boolean;
  onToggleWater: (hasWater: boolean) => void;
}

const IngredientSelector: React.FC<IngredientSelectorProps> = ({
  rawMaterials,
  semiFinishedProducts,
  onAddIngredient,
  ingredients,
  hasWater,
  onToggleWater
}) => {
  const [selectedType, setSelectedType] = useState<string>('raw');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [percentage, setPercentage] = useState<number>(0);
  
  // Get materials based on selected type
  const getMaterialsForType = () => {
    if (selectedType === 'raw') {
      return rawMaterials;
    } else if (selectedType === 'semi') {
      return semiFinishedProducts;
    }
    return [];
  };
  
  // Reset material selection when type changes
  const handleTypeChange = (newType: string) => {
    setSelectedType(newType);
    setSelectedMaterial('');
    
    // If selecting water type, handle it differently
    if (newType === 'water') {
      handleAddWater();
    }
  };
  
  // Handle adding water ingredient which is calculated automatically
  const handleAddWater = () => {
    if (hasWater) {
      toast.error('تم إضافة الماء بالفعل');
      return;
    }
    
    // Calculate available percentage
    const currentTotalPercentage = ingredients.reduce(
      (sum, ing) => sum + ing.percentage, 
      0
    );
    
    const waterPercentage = Math.max(0, 100 - currentTotalPercentage);
    
    // Add water as ingredient
    onAddIngredient({
      id: 0,
      code: 'WATER',
      name: 'ماء',
      percentage: waterPercentage,
      ingredient_type: 'water',
      unit: 'لتر',
      unit_cost: 0
    });
    
    onToggleWater(true);
    setSelectedType('raw');
  };
  
  // Handle adding regular ingredient
  const handleAddIngredient = () => {
    if (selectedType === 'water') {
      handleAddWater();
      return;
    }
    
    if (!selectedMaterial) {
      toast.error('يرجى اختيار مادة');
      return;
    }
    
    if (percentage <= 0 || percentage > 100) {
      toast.error('يرجى إدخال نسبة صحيحة (1-100%)');
      return;
    }
    
    // Check if this material already exists in ingredients
    const existingIngredient = ingredients.find(ing => 
      (ing as any).ingredient_type === selectedType && 
      ing.id === parseInt(selectedMaterial)
    );
    
    if (existingIngredient) {
      toast.error('تم إضافة هذه المادة بالفعل');
      return;
    }
    
    // Find the selected material from the appropriate list
    const materials = getMaterialsForType();
    const material = materials.find(m => m.id === parseInt(selectedMaterial));
    
    if (!material) {
      toast.error('المادة المحددة غير موجودة');
      return;
    }
    
    // Create new ingredient
    const newIngredient: Ingredient = {
      id: material.id,
      code: material.code,
      name: material.name,
      percentage,
      ingredient_type: selectedType,
      unit: material.unit,
      unit_cost: material.unit_cost || 0
    };
    
    onAddIngredient(newIngredient);
    
    // Reset fields
    setSelectedMaterial('');
    setPercentage(0);
  };
  
  return (
    <div className="space-y-4">
      <SemiFinishedIngredientTypeSwitcher 
        value={selectedType} 
        onChange={handleTypeChange} 
        disabled={hasWater && selectedType === 'water'} 
      />
      
      {selectedType !== 'water' && (
        <div className="flex gap-2">
          <Select
            value={selectedMaterial}
            onValueChange={setSelectedMaterial}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={`اختر ${selectedType === 'raw' ? 'مادة خام' : 'منتج نصف مصنع'}`} />
            </SelectTrigger>
            <SelectContent>
              {getMaterialsForType().map(material => (
                <SelectItem key={material.id} value={String(material.id)}>
                  {material.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input
            type="number"
            value={percentage || ''}
            onChange={e => setPercentage(Number(e.target.value))}
            min={1}
            max={100}
            placeholder="النسبة %"
            className="w-32"
          />
          
          <Button
            type="button"
            onClick={handleAddIngredient}
          >
            <PlusCircle size={16} className="mr-2" />
            إضافة
          </Button>
        </div>
      )}
    </div>
  );
};

export default IngredientSelector;
