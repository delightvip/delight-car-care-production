
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

interface CostFactor {
  id: string;
  name: string;
  category: string;
  currentValue: number;
  unit: string;
  impactLevel: 'low' | 'medium' | 'high';
  minValue?: number;
  maxValue?: number;
}

interface CostScenario {
  id: string;
  name: string;
  description: string;
  factorChanges: {
    [factorId: string]: number; // نسبة التغيير للعامل
  };
  resultingChanges: {
    production: number; // التغيير في تكلفة الإنتاج
    packaging: number; // التغيير في تكلفة التعبئة
    operations: number; // التغيير في تكلفة العمليات
    total: number; // التغيير الإجمالي
  };
}

interface FactorCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const CostSimulation = () => {
  const [costFactors, setCostFactors] = useState<CostFactor[]>([
    {
      id: 'raw-material-1',
      name: 'سعر المادة الخام الرئيسية',
      category: 'raw-materials',
      currentValue: 250,
      unit: 'ج.م/كجم',
      impactLevel: 'high',
      minValue: 180,
      maxValue: 320
    },
    {
      id: 'raw-material-2',
      name: 'سعر المواد المضافة',
      category: 'raw-materials',
      currentValue: 80,
      unit: 'ج.م/كجم',
      impactLevel: 'medium',
      minValue: 60,
      maxValue: 120
    },
    {
      id: 'packaging-1',
      name: 'تكلفة مواد التعبئة',
      category: 'packaging',
      currentValue: 3.5,
      unit: 'ج.م/وحدة',
      impactLevel: 'medium',
      minValue: 2.8,
      maxValue: 4.2
    },
    {
      id: 'labor-1',
      name: 'تكلفة العمالة',
      category: 'operations',
      currentValue: 22,
      unit: 'ج.م/ساعة',
      impactLevel: 'medium',
      minValue: 18,
      maxValue: 28
    },
    {
      id: 'energy-1',
      name: 'تكلفة الطاقة',
      category: 'operations',
      currentValue: 1.2,
      unit: 'ج.م/كيلو واط',
      impactLevel: 'low',
      minValue: 0.9,
      maxValue: 1.8
    },
    {
      id: 'transportation-1',
      name: 'تكلفة النقل',
      category: 'operations',
      currentValue: 500,
      unit: 'ج.م/رحلة',
      impactLevel: 'low',
      minValue: 400,
      maxValue: 700
    }
  ]);

  const [costScenarios, setCostScenarios] = useState<CostScenario[]>([
    {
      id: 'scenario-1',
      name: 'زيادة أسعار المواد الخام',
      description: 'سيناريو زيادة أسعار المواد الخام بنسب متفاوتة',
      factorChanges: {
        'raw-material-1': 15,
        'raw-material-2': 10,
      },
      resultingChanges: {
        production: 12.5,
        packaging: 0,
        operations: 0,
        total: 8.2
      }
    },
    {
      id: 'scenario-2',
      name: 'انخفاض تكاليف التشغيل',
      description: 'سيناريو انخفاض تكاليف التشغيل والعمالة',
      factorChanges: {
        'labor-1': -8,
        'energy-1': -12,
      },
      resultingChanges: {
        production: 0,
        packaging: 0,
        operations: -9.5,
        total: -4.2
      }
    }
  ]);

  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [selectedFactors, setSelectedFactors] = useState<{ [id: string]: boolean }>({});
  const [factorChanges, setFactorChanges] = useState<{ [id: string]: number }>({});
  const [selectedTab, setSelectedTab] = useState<string>('factors');
  const [newScenarioName, setNewScenarioName] = useState<string>('');
  const [newScenarioDescription, setNewScenarioDescription] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const factorCategories: FactorCategory[] = [
    { id: 'raw-materials', name: 'المواد الخام', icon: <Tag className="h-4 w-4 mr-2" /> },
    { id: 'packaging', name: 'التعبئة', icon: <PlusCircle className="h-4 w-4 mr-2" /> },
    { id: 'operations', name: 'العمليات', icon: <Landmark className="h-4 w-4 mr-2" /> }
  ];

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
    if (rawMaterials && rawMaterials.length > 0) {
      const rawMaterialFactors: CostFactor[] = rawMaterials.slice(0, 5).map((material, index) => ({
        id: `db-raw-${material.id}`,
        name: material.name,
        category: 'raw-materials',
        currentValue: material.unit_cost,
        unit: 'ج.م/وحدة',
        impactLevel: index < 2 ? 'high' : index < 4 ? 'medium' : 'low',
        minValue: material.unit_cost * 0.7,
        maxValue: material.unit_cost * 1.3
      }));
      
      setCostFactors(prev => {
        const nonRawFactors = prev.filter(factor => factor.category !== 'raw-materials' || factor.id.startsWith('raw-material-'));
        return [...nonRawFactors, ...rawMaterialFactors];
      });
    }
  }, [rawMaterials]);

  useEffect(() => {
    if (selectedScenario) {
      const scenario = costScenarios.find(s => s.id === selectedScenario);
      if (scenario) {
        const newSelectedFactors: { [id: string]: boolean } = {};
        Object.keys(scenario.factorChanges).forEach(factorId => {
          newSelectedFactors[factorId] = true;
        });
        
        setSelectedFactors(newSelectedFactors);
        setFactorChanges(scenario.factorChanges);
        setNewScenarioName(scenario.name);
        setNewScenarioDescription(scenario.description);
        setIsEditMode(true);
      }
    } else {
      resetScenarioForm();
    }
  }, [selectedScenario]);

  const resetScenarioForm = () => {
    setSelectedFactors({});
    setFactorChanges({});
    setNewScenarioName('');
    setNewScenarioDescription('');
    setIsEditMode(false);
  };

  const toggleFactor = (factorId: string) => {
    setSelectedFactors(prev => {
      const newSelectedFactors = { ...prev };
      newSelectedFactors[factorId] = !prev[factorId];
      
      if (!newSelectedFactors[factorId]) {
        const newFactorChanges = { ...factorChanges };
        delete newFactorChanges[factorId];
        setFactorChanges(newFactorChanges);
      } else {
        setFactorChanges(prev => ({ ...prev, [factorId]: 0 }));
      }
      
      return newSelectedFactors;
    });
  };

  const updateFactorChange = (factorId: string, value: number) => {
    setFactorChanges(prev => ({ ...prev, [factorId]: value }));
  };

  const calculateImpact = () => {
    const selectedFactorsWithChanges = costFactors.filter(factor => selectedFactors[factor.id])
      .map(factor => ({
        ...factor,
        changePercent: factorChanges[factor.id] || 0
      }));
    
    let productionImpact = 0;
    let packagingImpact = 0;
    let operationsImpact = 0;
    
    selectedFactorsWithChanges.forEach(factor => {
      const impact = factor.changePercent * (factor.impactLevel === 'high' ? 1 : factor.impactLevel === 'medium' ? 0.6 : 0.3);
      
      if (factor.category === 'raw-materials') {
        productionImpact += impact;
      } else if (factor.category === 'packaging') {
        packagingImpact += impact;
      } else if (factor.category === 'operations') {
        operationsImpact += impact;
      }
    });
    
    const totalImpact = (productionImpact * 0.5 + packagingImpact * 0.2 + operationsImpact * 0.3);
    
    return {
      production: productionImpact,
      packaging: packagingImpact,
      operations: operationsImpact,
      total: totalImpact
    };
  };

  const saveScenario = () => {
    if (!newScenarioName) {
      toast.error('يرجى إدخال اسم للسيناريو');
      return;
    }
    
    if (Object.keys(factorChanges).length === 0) {
      toast.error('يرجى تحديد عامل واحد على الأقل وتحديد نسبة التغيير');
      return;
    }
    
    const impact = calculateImpact();
    
    if (isEditMode && selectedScenario) {
      setCostScenarios(prev => prev.map(scenario => {
        if (scenario.id === selectedScenario) {
          return {
            ...scenario,
            name: newScenarioName,
            description: newScenarioDescription,
            factorChanges: { ...factorChanges },
            resultingChanges: impact
          };
        }
        return scenario;
      }));
      
      toast.success('تم تحديث السيناريو بنجاح');
    } else {
      const newScenario: CostScenario = {
        id: `scenario-${Date.now()}`,
        name: newScenarioName,
        description: newScenarioDescription,
        factorChanges: { ...factorChanges },
        resultingChanges: impact
      };
      
      setCostScenarios(prev => [...prev, newScenario]);
      toast.success('تم حفظ السيناريو الجديد بنجاح');
    }
    
    resetScenarioForm();
    setSelectedScenario(null);
  };

  const deleteScenario = (scenarioId: string) => {
    setCostScenarios(prev => prev.filter(scenario => scenario.id !== scenarioId));
    
    if (selectedScenario === scenarioId) {
      resetScenarioForm();
      setSelectedScenario(null);
    }
    
    toast.success('تم حذف السيناريو بنجاح');
  };

  const getComparisonChartData = () => {
    return costScenarios.map(scenario => ({
      name: scenario.name,
      إنتاج: scenario.resultingChanges.production,
      تعبئة: scenario.resultingChanges.packaging,
      عمليات: scenario.resultingChanges.operations,
      إجمالي: scenario.resultingChanges.total
    }));
  };

  const getSensitivityChartData = () => {
    const highImpactFactors = costFactors.filter(factor => factor.impactLevel === 'high').slice(0, 3);
    
    if (highImpactFactors.length === 0) return [];
    
    const data = [];
    
    for (let change = -20; change <= 20; change += 5) {
      let entry: any = { change: `${change}%` };
      
      highImpactFactors.forEach(factor => {
        const impact = change * (factor.impactLevel === 'high' ? 1 : factor.impactLevel === 'medium' ? 0.6 : 0.3);
        const totalImpact = impact * (factor.category === 'raw-materials' ? 0.5 : factor.category === 'packaging' ? 0.2 : factor.category === 'operations' ? 0.3 : 0);
        entry[factor.name] = totalImpact;
      });
      
      data.push(entry);
    }
    
    return data;
  };

  const getBarColor = (value: number) => {
    return value > 0 ? "#ef4444" : "#10b981";
  };

  const getFactorCategory = (categoryId: string) => {
    const category = factorCategories.find(cat => cat.id === categoryId);
    if (category) {
      return (
        <div className="flex items-center">
          {category.icon}
          <span className="ml-1">{category.name}</span>
        </div>
      );
    }
    return categoryId;
  };

  const formatTooltipValue = (value: any) => {
    const numValue = Array.isArray(value) 
      ? (typeof value[0] === 'string' ? parseFloat(value[0]) : value[0])
      : (typeof value === 'string' ? parseFloat(value) : value);
    
    if (isNaN(numValue)) return value;
    return `${numValue > 0 ? '+' : ''}${numValue.toFixed(1)}%`;
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
                <Button size="sm" variant="outline" onClick={resetScenarioForm} disabled={!isEditMode}>
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
              
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="factors">عوامل التكلفة</TabsTrigger>
                  <TabsTrigger value="raw-materials">المواد الخام</TabsTrigger>
                  <TabsTrigger value="packaging">التعبئة</TabsTrigger>
                  <TabsTrigger value="operations">العمليات</TabsTrigger>
                </TabsList>
                
                <TabsContent value="factors" className="mt-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">تحديد</TableHead>
                          <TableHead>عامل التكلفة</TableHead>
                          <TableHead>الفئة</TableHead>
                          <TableHead>القيمة الحالية</TableHead>
                          <TableHead>مستوى التأثير</TableHead>
                          <TableHead className="text-right">نسبة التغيير</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costFactors.map(factor => (
                          <TableRow key={factor.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedFactors[factor.id] || false}
                                onChange={() => toggleFactor(factor.id)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{factor.name}</div>
                            </TableCell>
                            <TableCell>
                              {getFactorCategory(factor.category)}
                            </TableCell>
                            <TableCell>
                              {factor.currentValue} {factor.unit}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                factor.impactLevel === 'high' ? 'destructive' :
                                factor.impactLevel === 'medium' ? 'warning' : 'outline'
                              }>
                                {factor.impactLevel === 'high' ? 'مرتفع' : factor.impactLevel === 'medium' ? 'متوسط' : 'منخفض'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  type="number"
                                  min={-50}
                                  max={50}
                                  value={factorChanges[factor.id] || 0}
                                  onChange={(e) => updateFactorChange(factor.id, Number(e.target.value))}
                                  disabled={!selectedFactors[factor.id]}
                                  className="w-20 text-right"
                                />
                                <Percent className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {Object.keys(factorChanges).length > 0 && (
                    <div className="mt-6 bg-muted rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-2">نتائج المحاكاة</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-background rounded-md">
                          <div className="text-sm text-muted-foreground">تأثير الإنتاج</div>
                          <div className={`text-xl font-bold ${calculateImpact().production > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {calculateImpact().production > 0 ? '+' : ''}{calculateImpact().production.toFixed(1)}%
                          </div>
                        </div>
                        <div className="p-3 bg-background rounded-md">
                          <div className="text-sm text-muted-foreground">تأثير التعبئة</div>
                          <div className={`text-xl font-bold ${calculateImpact().packaging > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {calculateImpact().packaging > 0 ? '+' : ''}{calculateImpact().packaging.toFixed(1)}%
                          </div>
                        </div>
                        <div className="p-3 bg-background rounded-md">
                          <div className="text-sm text-muted-foreground">تأثير العمليات</div>
                          <div className={`text-xl font-bold ${calculateImpact().operations > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {calculateImpact().operations > 0 ? '+' : ''}{calculateImpact().operations.toFixed(1)}%
                          </div>
                        </div>
                        <div className="p-3 bg-background rounded-md">
                          <div className="text-sm text-muted-foreground">التأثير الإجمالي</div>
                          <div className={`text-xl font-bold ${calculateImpact().total > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {calculateImpact().total > 0 ? '+' : ''}{calculateImpact().total.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="raw-materials" className="mt-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">تحديد</TableHead>
                          <TableHead>المادة الخام</TableHead>
                          <TableHead>السعر الحالي</TableHead>
                          <TableHead>مستوى التأثير</TableHead>
                          <TableHead className="text-right">نسبة التغيير</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costFactors.filter(factor => factor.category === 'raw-materials').map(factor => (
                          <TableRow key={factor.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedFactors[factor.id] || false}
                                onChange={() => toggleFactor(factor.id)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{factor.name}</div>
                            </TableCell>
                            <TableCell>
                              {factor.currentValue} {factor.unit}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                factor.impactLevel === 'high' ? 'destructive' :
                                factor.impactLevel === 'medium' ? 'warning' : 'outline'
                              }>
                                {factor.impactLevel === 'high' ? 'مرتفع' : factor.impactLevel === 'medium' ? 'متوسط' : 'منخفض'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  type="number"
                                  min={-50}
                                  max={50}
                                  value={factorChanges[factor.id] || 0}
                                  onChange={(e) => updateFactorChange(factor.id, Number(e.target.value))}
                                  disabled={!selectedFactors[factor.id]}
                                  className="w-20 text-right"
                                />
                                <Percent className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                
                <TabsContent value="packaging" className="mt-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">تحديد</TableHead>
                          <TableHead>عامل التكلفة</TableHead>
                          <TableHead>القيمة الحالية</TableHead>
                          <TableHead>مستوى التأثير</TableHead>
                          <TableHead className="text-right">نسبة التغيير</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costFactors.filter(factor => factor.category === 'packaging').map(factor => (
                          <TableRow key={factor.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedFactors[factor.id] || false}
                                onChange={() => toggleFactor(factor.id)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{factor.name}</div>
                            </TableCell>
                            <TableCell>
                              {factor.currentValue} {factor.unit}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                factor.impactLevel === 'high' ? 'destructive' :
                                factor.impactLevel === 'medium' ? 'warning' : 'outline'
                              }>
                                {factor.impactLevel === 'high' ? 'مرتفع' : factor.impactLevel === 'medium' ? 'متوسط' : 'منخفض'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  type="number"
                                  min={-50}
                                  max={50}
                                  value={factorChanges[factor.id] || 0}
                                  onChange={(e) => updateFactorChange(factor.id, Number(e.target.value))}
                                  disabled={!selectedFactors[factor.id]}
                                  className="w-20 text-right"
                                />
                                <Percent className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                
                <TabsContent value="operations" className="mt-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">تحديد</TableHead>
                          <TableHead>عامل التكلفة</TableHead>
                          <TableHead>القيمة الحالية</TableHead>
                          <TableHead>مستوى التأثير</TableHead>
                          <TableHead className="text-right">نسبة التغيير</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costFactors.filter(factor => factor.category === 'operations').map(factor => (
                          <TableRow key={factor.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedFactors[factor.id] || false}
                                onChange={() => toggleFactor(factor.id)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{factor.name}</div>
                            </TableCell>
                            <TableCell>
                              {factor.currentValue} {factor.unit}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                factor.impactLevel === 'high' ? 'destructive' :
                                factor.impactLevel === 'medium' ? 'warning' : 'outline'
                              }>
                                {factor.impactLevel === 'high' ? 'مرتفع' : factor.impactLevel === 'medium' ? 'متوسط' : 'منخفض'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  type="number"
                                  min={-50}
                                  max={50}
                                  value={factorChanges[factor.id] || 0}
                                  onChange={(e) => updateFactorChange(factor.id, Number(e.target.value))}
                                  disabled={!selectedFactors[factor.id]}
                                  className="w-20 text-right"
                                />
                                <Percent className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
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
            {costScenarios.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                لا توجد سيناريوهات محفوظة. قم بإنشاء سيناريو جديد.
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {costScenarios.map(scenario => (
                    <div
                      key={scenario.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                        selectedScenario === scenario.id ? 'border-primary' : ''
                      }`}
                      onClick={() => setSelectedScenario(scenario.id)}
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium">{scenario.name}</h3>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteScenario(scenario.id);
                          }}
                          className="h-6 w-6"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{scenario.description}</p>
                      
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className={`text-sm font-medium ${
                          scenario.resultingChanges.total > 0 ? 'text-red-500' : 'text-green-500'
                        }`}>
                          {scenario.resultingChanges.total > 0 ? '+' : ''}{scenario.resultingChanges.total.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {Object.keys(scenario.factorChanges).length} عوامل
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">مقارنة السيناريوهات</CardTitle>
          </CardHeader>
          <CardContent>
            {costScenarios.length < 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                يرجى إنشاء سيناريوهين على الأقل للمقارنة
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getComparisonChartData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatTooltipValue(value)} />
                    <Legend />
                    <Bar dataKey="إنتاج" fill="#6366F1" />
                    <Bar dataKey="تعبئة" fill="#F59E0B" />
                    <Bar dataKey="عمليات" fill="#10B981" />
                    <Bar dataKey="إجمالي" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تحليل حساسية العوامل</CardTitle>
          </CardHeader>
          <CardContent>
            {costFactors.filter(f => f.impactLevel === 'high').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد عوامل ذات تأثير مرتفع للتحليل
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={getSensitivityChartData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="change" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [
                      formatTooltipValue(value), 
                      'تأثير على التكلفة الإجمالية'
                    ]} />
                    <Legend />
                    {costFactors.filter(factor => factor.impactLevel === 'high').slice(0, 3).map((factor, index) => (
                      <Line
                        key={factor.id}
                        type="monotone"
                        dataKey={factor.name}
                        stroke={['#6366F1', '#F59E0B', '#10B981'][index % 3]}
                        activeDot={{ r: 8 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CostSimulation;
