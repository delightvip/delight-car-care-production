
import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface SemiFinishedIngredientTypeSwitcherProps {
  value: "raw" | "semi" | "water";
  onChange: (value: string) => void;
  disabled?: boolean;
}

const SemiFinishedIngredientTypeSwitcher: React.FC<SemiFinishedIngredientTypeSwitcherProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  return (
    <RadioGroup
      className="flex gap-4"
      value={value}
      onValueChange={onChange}
    >
      <div className="flex items-center space-x-2 rtl:space-x-reverse">
        <RadioGroupItem value="raw" id="raw" disabled={disabled} />
        <Label htmlFor="raw" className={`cursor-pointer ${disabled ? 'text-muted-foreground' : ''}`}>
          مادة خام
        </Label>
      </div>
      <div className="flex items-center space-x-2 rtl:space-x-reverse">
        <RadioGroupItem value="semi" id="semi" disabled={disabled} />
        <Label htmlFor="semi" className={`cursor-pointer ${disabled ? 'text-muted-foreground' : ''}`}>
          منتج نصف مصنع
        </Label>
      </div>
      <div className="flex items-center space-x-2 rtl:space-x-reverse">
        <RadioGroupItem value="water" id="water" disabled={disabled} />
        <Label htmlFor="water" className={`cursor-pointer ${disabled ? 'text-muted-foreground' : ''}`}>
          ماء (يتم حساب النسبة تلقائيًا)
        </Label>
      </div>
    </RadioGroup>
  );
};

export default SemiFinishedIngredientTypeSwitcher;
