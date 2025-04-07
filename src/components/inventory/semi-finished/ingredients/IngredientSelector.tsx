
import React, { useState } from 'react';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  RawMaterialIngredient, 
  SemiFinishedIngredient,
  WaterIngredient,
  Ingredient
} from '@/types/inventoryTypes';

interface Material {
  id: number;
  code: string;
  name: string;
  unit: string;
  unit_cost: number;
}

interface IngredientSelectorProps {
  rawMaterials: Material[];
  semiFinishedProducts: Material[];
  onAddIngredient: (ingredient: Ingredient) => void;
  ingredients: Ingredient[];
  hasWater: boolean;
  onToggleWater: (has: boolean) => void;
}

const IngredientSelector: React.FC<IngredientSelectorProps> = ({
  rawMaterials,
  semiFinishedProducts,
  onAddIngredient,
  ingredients,
  hasWater,
  onToggleWater
}) => {
  const [ingredientType, setIngredientType] = useState<'raw' | 'semi'>('raw');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [percentage, setPercentage] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter materials based on search query
  const filteredRawMaterials = rawMaterials.filter(material => 
    material.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    material.code.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredSemiFinishedProducts = semiFinishedProducts.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    product.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if a material is already added
  const isMaterialAlreadyAdded = (id: number, type: 'raw' | 'semi'): boolean => {
    return ingredients.some(ing => 
      ing.id === id && 
      ((type === 'raw' && (ing as RawMaterialIngredient).ingredient_type === 'raw') ||
       (type === 'semi' && (ing as SemiFinishedIngredient).ingredient_type === 'semi'))
    );
  };
  
  const handleAddIngredient = () => {
    if (!selectedMaterialId) {
      toast.error('يرجى اختيار مادة خام أو منتج نصف مصنع');
      return;
    }
    
    if (percentage <= 0 || percentage > 100) {
      toast.error('يجب أن تكون النسبة بين 1 و 100');
      return;
    }
    
    const materialId = parseInt(selectedMaterialId);
    
    // Check if already exists
    if (isMaterialAlreadyAdded(materialId, ingredientType)) {
      toast.error('تم إضافة هذه المادة بالفعل');
      return;
    }
    
    let selectedMaterial: Material | undefined;
    
    if (ingredientType === 'raw') {
      selectedMaterial = rawMaterials.find(m => m.id === materialId);
    } else {
      selectedMaterial = semiFinishedProducts.find(m => m.id === materialId);
    }
    
    if (!selectedMaterial) return;
    
    if (ingredientType === 'raw') {
      const newIngredient: RawMaterialIngredient = {
        id: selectedMaterial.id,
        code: selectedMaterial.code,
        name: selectedMaterial.name,
        percentage: percentage,
        ingredient_type: 'raw',
        unit: selectedMaterial.unit,
        unit_cost: selectedMaterial.unit_cost
      };
      onAddIngredient(newIngredient);
    } else {
      const newIngredient: SemiFinishedIngredient = {
        id: selectedMaterial.id,
        code: selectedMaterial.code,
        name: selectedMaterial.name,
        percentage: percentage,
        ingredient_type: 'semi',
        unit: selectedMaterial.unit,
        unit_cost: selectedMaterial.unit_cost
      };
      onAddIngredient(newIngredient);
    }
    
    // Reset form
    setSelectedMaterialId('');
    setPercentage(0);
  };
  
  const handleAddWater = () => {
    // Check if water is already added
    const waterExists = ingredients.some(ing => 
      (ing as WaterIngredient).ingredient_type === 'water'
    );
    
    if (waterExists) {
      toast.error('تم إضافة الماء بالفعل');
      return;
    }
    
    const waterIngredient: WaterIngredient = {
      id: 0, // Special ID for water
      code: 'WATER',
      name: 'ماء',
      percentage: 0, // Will be calculated automatically
      ingredient_type: 'water',
      is_auto_calculated: true,
      unit_cost: 0
    };
    
    onAddIngredient(waterIngredient);
    onToggleWater(true);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-2">
        <div className="flex-1">
          <Select
            value={ingredientType}
            onValueChange={(value: 'raw' | 'semi') => {
              setIngredientType(value);
              setSelectedMaterialId('');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="نوع المادة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="raw">مادة خام</SelectItem>
              <SelectItem value="semi">منتج نصف مصنع</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-32">
          <Input
            type="number"
            min="1"
            max="100"
            value={percentage || ''}
            onChange={e => setPercentage(Number(e.target.value))}
            placeholder="النسبة %"
          />
        </div>
        
        <div>
          <Button 
            type="button" 
            onClick={handleAddIngredient}
            variant="default"
          >
            إضافة
          </Button>
        </div>
        
        <div>
          <Button 
            type="button" 
            onClick={handleAddWater}
            variant="outline"
            disabled={hasWater}
          >
            إضافة ماء
          </Button>
        </div>
      </div>
      
      <div className="relative">
        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          type="search"
          placeholder="بحث عن المواد الخام أو المنتجات النصف مصنعة..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-10"
        />
      </div>
      
      <div className="max-h-64 overflow-y-auto border rounded-md">
        <Select
          value={selectedMaterialId}
          onValueChange={setSelectedMaterialId}
        >
          <SelectTrigger>
            <SelectValue placeholder={ingredientType === 'raw' ? "اختر مادة خام" : "اختر منتج نصف مصنع"} />
          </SelectTrigger>
          <SelectContent className="max-h-96">
            {ingredientType === 'raw'
              ? filteredRawMaterials.map(material => (
                  <SelectItem 
                    key={material.id} 
                    value={String(material.id)}
                    disabled={isMaterialAlreadyAdded(material.id, 'raw')}
                  >
                    <div className="flex justify-between w-full">
                      <span>{material.name}</span>
                      <span className="text-muted-foreground text-xs">{material.code}</span>
                    </div>
                  </SelectItem>
                ))
              : filteredSemiFinishedProducts.map(product => (
                  <SelectItem 
                    key={product.id} 
                    value={String(product.id)}
                    disabled={isMaterialAlreadyAdded(product.id, 'semi')}
                  >
                    <div className="flex justify-between w-full">
                      <span>{product.name}</span>
                      <span className="text-muted-foreground text-xs">{product.code}</span>
                    </div>
                  </SelectItem>
                ))
            }
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default IngredientSelector;
