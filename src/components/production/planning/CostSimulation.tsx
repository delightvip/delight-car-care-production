import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calculator, PlusCircle, RotateCcw, Save, Trash2, TrendingUp, Percent, Landmark, Tag, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

import { CostFactor, CostScenario } from './cost-simulation/types';
import { CostFactorsPanel } from './cost-simulation/CostFactorsPanel';
import { ScenarioManager } from './cost-simulation/ScenarioManager';
import { ChartsPanel } from './cost-simulation/ChartsPanel';
import { useCostCalculations } from './cost-simulation/hooks/useCostCalculations';
import { ScenarioComparison } from './cost-simulation/ScenarioComparison';

const CostSimulation = () => {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('factors');
  const [newScenarioName, setNewScenarioName] = useState<string>('');
  const [newScenarioDescription, setNewScenarioDescription] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [comparedScenarioIds, setComparedScenarioIds] = useState<string[]>([]);
  const [costFactors, setCostFactors] = useState<CostFactor[]>([]);
  const [costScenarios, setCostScenarios] = useState<CostScenario[]>([]);

  const { data: rawMaterials, isLoading: isLoadingRawMaterials } = useQuery({
    queryKey: ['raw-materials-for-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('id, name, code, unit_cost')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  useEffect(() => {
    if (selectedScenario) {
      const scenario = costScenarios.find(s => s.id === selectedScenario);
      if (scenario) {
        setIsEditMode(true);
        setNewScenarioName(scenario.name);
        setNewScenarioDescription(scenario.description);
      }
    } else {
      setIsEditMode(false);
      setNewScenarioName('');
      setNewScenarioDescription('');
    }
  }, [selectedScenario]);

  const saveScenario = () => {
    if (!newScenarioName) {
      toast.error('يرجى إدخال اسم للسيناريو');
      return;
    }
    
    if (isEditMode && selectedScenario) {
      // تحديث السيناريو الحالي
    } else {
      // حفظ سيناريو جديد
    }
    
    setIsEditMode(false);
    setNewScenarioName('');
    setNewScenarioDescription('');
    setSelectedScenario(null);
  };

  const deleteScenario = (scenarioId: string) => {
    // حذف السيناريو
    if (selectedScenario === scenarioId) {
      setIsEditMode(false);
      setNewScenarioName('');
      setNewScenarioDescription('');
      setSelectedScenario(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                محاكاة تغير عوامل التكلفة
              </span>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsEditMode(false)} disabled={!isEditMode}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  إلغاء
                </Button>
                <Button size="sm" onClick={saveScenario}>
                  <Save className="h-4 w-4 mr-2" />
                  حفظ السيناريو
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="scenarioName">اسم السيناريو</Label>
                  <Input
                    id="scenarioName"
                    value={newScenarioName}
                    onChange={(e) => setNewScenarioName(e.target.value)}
                    placeholder="أدخل اسماً وصفياً للسيناريو"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="scenarioDesc">وصف السيناريو</Label>
                  <Input
                    id="scenarioDesc"
                    value={newScenarioDescription}
                    onChange={(e) => setNewScenarioDescription(e.target.value)}
                    placeholder="أدخل وصفاً مختصراً للسيناريو"
                  />
                </div>
              </div>
              
              <CostFactorsPanel factors={costFactors} onChange={setCostFactors} />
              <ScenarioManager scenarios={costScenarios} onChange={setCostScenarios} factors={costFactors} />
              <ChartsPanel scenarios={costScenarios} />
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              السيناريوهات المحفوظة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {/* قائمة السيناريوهات */}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">مقارنة السيناريوهات</CardTitle>
          </CardHeader>
          <CardContent>
            <ScenarioComparison scenarios={costScenarios} selectedIds={comparedScenarioIds} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تحليل حساسية العوامل</CardTitle>
          </CardHeader>
          <CardContent>
            {/* تحليل حساسية العوامل */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CostSimulation;
