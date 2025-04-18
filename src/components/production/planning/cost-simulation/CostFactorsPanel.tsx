import React from 'react';
import { CostFactor } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface CostFactorsPanelProps {
  factors: CostFactor[];
  onChange: (newFactors: CostFactor[]) => void;
}

const impactColors: Record<CostFactor['impactLevel'], string> = {
  high: 'bg-red-500 text-white',
  medium: 'bg-yellow-400 text-black',
  low: 'bg-green-500 text-white',
};

export const CostFactorsPanel: React.FC<CostFactorsPanelProps> = ({ factors, onChange }) => {
  const handleValueChange = (id: string, value: number) => {
    const updated = factors.map(f =>
      f.id === id ? { ...f, currentValue: value } : f
    );
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">العوامل المؤثرة في التكاليف</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {factors.map(factor => (
            <div key={factor.id} className="flex flex-col md:flex-row md:items-center md:gap-4 border-b pb-2 last:border-b-0">
              <div className="flex-1">
                <Label className="font-medium">{factor.name}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    value={factor.currentValue}
                    min={factor.minValue}
                    max={factor.maxValue}
                    step={0.01}
                    onChange={e => handleValueChange(factor.id, parseFloat(e.target.value))}
                    className="w-28 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">{factor.unit}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 md:mt-0">
                <Badge className={impactColors[factor.impactLevel] + ' text-xs'}>
                  {factor.impactLevel === 'high' ? 'تأثير مرتفع' : factor.impactLevel === 'medium' ? 'تأثير متوسط' : 'تأثير منخفض'}
                </Badge>
                {/* يمكن إضافة أيقونة الفئة هنا لاحقًا */}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
