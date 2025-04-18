import React from 'react';
import { CostScenario, CostFactor } from './types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Save, PlusCircle } from 'lucide-react';

interface ScenarioManagerProps {
  scenarios: CostScenario[];
  onChange: (newScenarios: CostScenario[]) => void;
  factors: CostFactor[];
}

export const ScenarioManager: React.FC<ScenarioManagerProps> = ({ scenarios, onChange, factors }) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [factorChanges, setFactorChanges] = React.useState<{ [factorId: string]: number }>({});
  const [selectedScenarioId, setSelectedScenarioId] = React.useState<string | null>(null);

  const handleAddScenario = () => {
    if (!name.trim()) return;
    const newScenario: CostScenario = {
      id: 'scenario-' + Date.now(),
      name,
      description,
      factorChanges: { ...factorChanges },
      resultingChanges: { production: 0, packaging: 0, operations: 0, total: 0 }, // يمكن تحديثها لاحقًا
    };
    onChange([...scenarios, newScenario]);
    setName('');
    setDescription('');
    setFactorChanges({});
  };

  const handleDelete = (id: string) => {
    onChange(scenarios.filter(s => s.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-primary" />
          إدارة السيناريوهات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-2">
          <Input placeholder="اسم السيناريو" value={name} onChange={e => setName(e.target.value)} />
          <Textarea placeholder="وصف السيناريو (اختياري)" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {factors.map(factor => (
              <div key={factor.id} className="flex items-center gap-2">
                <label className="text-sm flex-1">{factor.name}</label>
                <Input
                  type="number"
                  className="w-20 text-right"
                  placeholder="%"
                  value={factorChanges[factor.id] || ''}
                  min={-50}
                  max={50}
                  onChange={e => setFactorChanges({ ...factorChanges, [factor.id]: e.target.value ? Number(e.target.value) : 0 })}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            ))}
          </div>
          <Button className="mt-2" onClick={handleAddScenario} disabled={!name.trim()}>
            <Save className="h-4 w-4 mr-1" /> حفظ السيناريو
          </Button>
        </div>
        <hr className="my-4" />
        <div className="space-y-2">
          {scenarios.map(scenario => (
            <div
              key={scenario.id}
              className={`flex items-center justify-between bg-muted rounded p-2 cursor-pointer transition-colors ${selectedScenarioId === scenario.id ? 'border border-primary bg-background' : ''}`}
              onClick={() => setSelectedScenarioId(scenario.id)}
            >
              <div>
                <div className="font-bold text-sm">{scenario.name}</div>
                {scenario.description && <div className="text-xs text-muted-foreground">{scenario.description}</div>}
                <div className="text-xs mt-1">{Object.keys(scenario.factorChanges).length} عوامل</div>
              </div>
              <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleDelete(scenario.id); }}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
        {/* عرض تفاصيل العوامل المحددة للسيناريو المختار */}
        {selectedScenarioId && (
          <div className="mt-4 bg-background rounded border p-3">
            <div className="font-medium mb-2">العوامل المحددة لهذا السيناريو:</div>
            <ul className="list-disc pr-4 space-y-1 text-sm">
              {Object.entries((scenarios.find(s => s.id === selectedScenarioId)?.factorChanges || {})).map(([factorId, percent]) => {
                const factor = factors.find(f => f.id === factorId);
                return (
                  <li key={factorId} className="flex items-center gap-2">
                    <span>{factor ? factor.name : factorId}</span>
                    <span className="text-xs text-muted-foreground">({percent > 0 ? '+' : ''}{percent}%)</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
