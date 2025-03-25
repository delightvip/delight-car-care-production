
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import IngredientSelector from './IngredientSelector';

export const units = ['كجم', 'لتر', 'مللى', 'جم', 'علبة', 'قطعة', 'كرتونة'];

interface RawMaterial {
  id: number;
  code: string;
  name: string;
  unit: string;
}

interface Ingredient {
  id: number;
  code: string;
  name: string;
  percentage: number;
}

interface SemiFinishedProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: any) => void;
  initialData?: any;
  rawMaterials: RawMaterial[];
  isLoading: boolean;
  title: string;
  submitText: string;
}

const SemiFinishedForm: React.FC<SemiFinishedProductFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  rawMaterials,
  isLoading,
  title,
  submitText
}) => {
  const [product, setProduct] = useState(initialData || {
    name: '',
    unit: units[0], // Default to first unit instead of empty string
    quantity: 0,
    unitCost: 0,
    minStock: 0,
    ingredients: []
  });

  const [selectedRawMaterial, setSelectedRawMaterial] = useState('none'); // Changed from empty string to 'none'
  const [percentage, setPercentage] = useState(0);

  const handleAddIngredient = () => {
    if (!selectedRawMaterial || selectedRawMaterial === 'none' || percentage <= 0 || percentage > 100) {
      toast.error("يرجى اختيار مادة أولية وتحديد نسبة صحيحة (1-100%)");
      return;
    }

    const existingIndex = product.ingredients.findIndex(
      (i: Ingredient) => i.code === selectedRawMaterial
    );

    if (existingIndex >= 0) {
      toast.error("تم إضافة هذه المادة الأولية بالفعل");
      return;
    }

    const rawMaterial = rawMaterials.find(m => m.code === selectedRawMaterial);
    if (!rawMaterial) return;

    const newIngredient = {
      id: rawMaterial.id,
      code: rawMaterial.code,
      name: rawMaterial.name,
      percentage: percentage
    };

    setProduct({
      ...product,
      ingredients: [...product.ingredients, newIngredient]
    });

    setSelectedRawMaterial('none'); // Reset to 'none' instead of empty string
    setPercentage(0);
  };

  const handleRemoveIngredient = (index: number) => {
    const updatedIngredients = product.ingredients.filter((_: any, i: number) => i !== index);
    setProduct({
      ...product,
      ingredients: updatedIngredients
    });
  };

  const validateTotalPercentage = (): boolean => {
    const total = product.ingredients.reduce((sum: number, ing: Ingredient) => sum + ing.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`مجموع النسب يجب أن يكون 100%، الإجمالي الحالي: ${total}%`);
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!product.name || !product.unit) {
      toast.error("يجب ملء جميع الحقول المطلوبة");
      return;
    }

    if (product.ingredients.length === 0) {
      toast.error("يجب إضافة مكون واحد على الأقل");
      return;
    }

    if (!validateTotalPercentage()) {
      return;
    }

    onSubmit(product);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            أدخل بيانات المنتج النصف مصنع مع مكوناته من المواد الأولية ونسبها.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">اسم المنتج</Label>
            <Input
              id="name"
              value={product.name}
              onChange={e => setProduct({...product, name: e.target.value})}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="unit">وحدة القياس</Label>
            <Select
              value={product.unit || units[0]} // Ensure we never have empty value
              onValueChange={value => setProduct({...product, unit: value})}
            >
              <SelectTrigger id="unit">
                <SelectValue placeholder="اختر وحدة القياس" />
              </SelectTrigger>
              <SelectContent>
                {units.map(unit => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quantity">الكمية</Label>
            <Input
              id="quantity"
              type="number"
              value={product.quantity}
              onChange={e => setProduct({...product, quantity: Number(e.target.value)})}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="unitCost">التكلفة</Label>
            <Input
              id="unitCost"
              type="number"
              value={product.unitCost}
              onChange={e => setProduct({...product, unitCost: Number(e.target.value)})}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="minStock">الحد الأدنى للمخزون</Label>
            <Input
              id="minStock"
              type="number"
              value={product.minStock}
              onChange={e => setProduct({...product, minStock: Number(e.target.value)})}
            />
          </div>
          
          <div className="border-t pt-4">
            <Label className="mb-2 block font-semibold">مكونات المنتج (المواد الأولية)</Label>
            <IngredientSelector
              rawMaterials={rawMaterials}
              selectedMaterial={selectedRawMaterial}
              percentage={percentage}
              onMaterialChange={setSelectedRawMaterial}
              onPercentageChange={setPercentage}
              onAdd={handleAddIngredient}
            />
          </div>
          
          <div>
            <div className="text-sm font-medium mb-2 flex justify-between">
              <span>المكونات المضافة</span>
              {product.ingredients.length > 0 && (
                <span className="text-muted-foreground">
                  إجمالي النسب: {product.ingredients.reduce((sum: number, ing: Ingredient) => sum + ing.percentage, 0)}%
                </span>
              )}
            </div>
            
            {product.ingredients.length > 0 ? (
              <div className="space-y-2">
                {product.ingredients.map((ingredient: Ingredient, index: number) => (
                  <div key={`${ingredient.code}-${index}`} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <div className="font-medium">{ingredient.name}</div>
                      <div className="text-sm text-muted-foreground">
                        النسبة: {ingredient.percentage}%
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveIngredient(index)}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                لم تتم إضافة مكونات بعد
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : submitText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SemiFinishedForm;
