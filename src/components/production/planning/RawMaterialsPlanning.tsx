import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Calendar as CalendarIcon, Search, Printer, FileDown } from 'lucide-react';
import InventoryService from '@/services/InventoryService';
import MaterialsConsumptionService from '@/services/database/MaterialsConsumptionService';
import SmartForecastingService, { ForecastAlgorithm } from '@/services/ai/SmartForecastingService';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const RawMaterialsPlanning = () => {
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [forecastedConsumptions, setForecastedConsumptions] = useState<Record<string, number>>({});
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<ForecastAlgorithm>('ensemble');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);
  const [materialHistory, setMaterialHistory] = useState<any[]>([]);
  const [materialForecasts, setMaterialForecasts] = useState<any[]>([]);
  const [materialAccuracy, setMaterialAccuracy] = useState<any>({});

  useEffect(() => {
    const fetchMaterialsWithHistory = async () => {
      setIsLoading(true);
      try {
        const inventoryService = InventoryService.getInstance();
        const materials = await inventoryService.getRawMaterials();
        // جلب الاستهلاك التاريخي لكل مادة (آخر 6 أشهر)
        const history = await MaterialsConsumptionService.getHistoricalConsumption(6);
        // ربط الاستهلاك التاريخي بكل مادة
        const materialsWithHistory = materials.map((mat: any) => {
          const matHistory = history.filter((h: any) => h.materialId === mat.id || h.materialId === mat.code);
          return { ...mat, consumptionHistory: matHistory };
        });
        setRawMaterials(materialsWithHistory);
      } catch (error) {
        console.error('Error fetching raw materials or consumption history', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMaterialsWithHistory();
  }, []);

  useEffect(() => {
    const fetchForecast = async () => {
      setForecastLoading(true);
      setForecastError(null);
      try {
        // جلب بيانات الاستهلاك التاريخي
        const history = await MaterialsConsumptionService.getHistoricalConsumption(6);
        // تحديد الأشهر المستقبلية
        const now = new Date();
        const monthsAhead = 1;
        const monthsList = [
          `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`
        ];
        // توقع الاستهلاك القادم لكل مادة
        const results = SmartForecastingService.smartForecast(
          history.filter(h => h.category === 'raw-material'),
          monthsAhead,
          monthsList,
          [selectedAlgorithm]
        );
        const map: Record<string, number> = {};
        results.forEach(r => {
          const forecast = r.forecasts.find(f => f.month === monthsList[0] && f.algorithm === selectedAlgorithm);
          if (forecast) map[r.materialId] = forecast.predicted;
        });
        setForecastedConsumptions(map);
      } catch (err) {
        setForecastError('حدث خطأ أثناء حساب التوقعات');
      } finally {
        setForecastLoading(false);
      }
    };
    fetchForecast();
  }, [selectedAlgorithm]);

  const filteredMaterials = rawMaterials.filter(
    material => material.name.includes(searchQuery) || material.code.includes(searchQuery)
  );

  // حساب الأيام المتبقية بشكل ذكي بناءً على التوقع أو المتوسط التاريخي
  const smartDaysLeft = (material: any): number => {
    const forecast = forecastedConsumptions[material.id];
    let avgMonthly = 0;
    if (forecast && forecast > 0) {
      avgMonthly = forecast;
    } else if (material.consumptionHistory && material.consumptionHistory.length > 0) {
      // متوسط آخر 3 أشهر
      const last3 = material.consumptionHistory.slice(-3);
      avgMonthly = last3.reduce((a: number, b: any) => a + b.consumptionQty, 0) / last3.length;
    } else if (material.avgConsumption) {
      avgMonthly = material.avgConsumption;
    }
    if (!avgMonthly || avgMonthly === 0) return 0;
    return Math.floor((material.quantity / (avgMonthly / 30)));
  };

  // توصيات الحالة الذكية
  const getStatusRecommendation = (material: any): { label: string; color: string; tooltip?: string } => {
    const days = smartDaysLeft(material);
    const forecast = forecastedConsumptions[material.id];
    let label = 'آمن';
    let color = 'bg-green-100 text-green-800';
    let tooltip = '';
    if (days <= 0 || (forecast !== undefined && material.quantity < forecast)) {
      label = 'يجب الشراء فورًا';
      color = 'bg-red-100 text-red-800';
      tooltip = 'المخزون لا يكفي لتغطية الاستهلاك المتوقع للشهر القادم.';
    } else if (days < 7 || (forecast !== undefined && material.quantity < forecast * 1.2)) {
      label = 'اقترب من إعادة الطلب';
      color = 'bg-yellow-100 text-yellow-800';
      tooltip = 'يفضل طلب المادة قريبًا لضمان استمرارية الإنتاج.';
    } else if (days < 14 || (forecast !== undefined && material.quantity < forecast * 1.5)) {
      label = 'راقب المخزون';
      color = 'bg-yellow-50 text-yellow-700';
      tooltip = 'المخزون يكفي لفترة متوسطة، راقب الاستهلاك.';
    }
    if (material.importance >= 3) {
      tooltip += ' (مادة ذات أهمية عالية، راقبها باستمرار)';
    }
    // تحذير إذا كان هناك تذبذب أو تغير مفاجئ في الاستهلاك
    if (material.consumptionHistory && material.consumptionHistory.length >= 6) {
      const last6 = material.consumptionHistory.slice(-6).map((h: any) => h.consumptionQty);
      const mean = last6.reduce((a, b) => a + b, 0) / last6.length;
      const std = Math.sqrt(last6.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / last6.length);
      if (std > mean * 0.5) {
        tooltip += ' (استهلاك المادة متذبذب بشكل كبير)';
      }
    }
    return { label, color, tooltip };
  };

  const estimatedDaysLeft = (quantity: number, minStock: number) => {
    if (quantity <= minStock) return 0;
    // Assuming average daily consumption is 20% of min_stock for raw materials
    const dailyConsumption = minStock * 0.2;
    if (dailyConsumption <= 0) return 999; // Effectively infinite if no consumption
    return Math.floor((quantity - minStock) / dailyConsumption);
  };

  // عند اختيار مادة، جلب بياناتها التاريخية والتوقعات
  const handleRowClick = async (material: any) => {
    setSelectedMaterial(material);
    setDrawerOpen(true);
    setMaterialHistory([]);
    setMaterialForecasts([]);
    setMaterialAccuracy({});
    try {
      const history = await MaterialsConsumptionService.getHistoricalConsumption(12);
      const matHistory = history.filter((h: any) => h.materialId === material.id);
      setMaterialHistory(matHistory);
      // توقعات كل الخوارزميات
      const monthsAhead = 3;
      const now = new Date();
      const monthsList = Array.from({ length: monthsAhead }, (_, i) => `${now.getFullYear()}-${String(now.getMonth() + 2 + i).padStart(2, '0')}`);
      const allForecasts = SmartForecastingService.smartForecast(matHistory, monthsAhead, monthsList);
      setMaterialForecasts(allForecasts[0]?.forecasts || []);
      // دقة كل خوارزمية
      const testWindow = 6;
      if (matHistory.length > testWindow + monthsAhead) {
        const sorted = [...matHistory].sort((a, b) => a.month.localeCompare(b.month));
        const train = sorted.slice(0, -testWindow);
        const test = sorted.slice(-testWindow);
        const testMonths = test.map((x: any) => x.month);
        const actual = test.map((x: any) => x.consumptionQty);
        const algos = [
          { key: 'moving_average', fn: SmartForecastingService.movingAverage },
          { key: 'linear_regression', fn: SmartForecastingService.linearRegression },
          { key: 'seasonal_trend', fn: (h: any, m: any) => SmartForecastingService.seasonalTrend(h, m, testMonths) },
          { key: 'exponential_smoothing', fn: SmartForecastingService.exponentialSmoothing },
          { key: 'arima_like', fn: SmartForecastingService.arimaLike },
          { key: 'ensemble', fn: (h: any, m: any) => SmartForecastingService.ensembleForecast(h, m, testMonths) },
          { key: 'weighted_ensemble', fn: (h: any, m: any) => SmartForecastingService.weightedEnsembleForecast(h, m, testMonths) },
        ];
        const acc: any = {};
        algos.forEach(algo => {
          const preds = algo.fn(train, testWindow);
          acc[algo.key] = {
            mae: SmartForecastingService.meanAbsoluteError(actual, preds),
            rmse: SmartForecastingService.rootMeanSquaredError(actual, preds)
          };
        });
        setMaterialAccuracy(acc);
      }
    } catch (err) {
      setMaterialHistory([]);
      setMaterialForecasts([]);
      setMaterialAccuracy({});
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="بحث..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 flex justify-end">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal w-full md:w-auto",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {date ? format(date, 'PPP', { locale: ar }) : <span>اختر تاريخ</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <FileDown size={16} />
            <span>تصدير</span>
          </Button>
          <Button variant="outline" className="gap-2">
            <Printer size={16} />
            <span>طباعة</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الكمية الحالية</TableHead>
                  <TableHead>الحد الأدنى</TableHead>
                  <TableHead>الأهمية</TableHead>
                  <TableHead>الأيام المتبقية (تقديرياً)</TableHead>
                  <TableHead>التوقع للشهر القادم</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">جاري التحميل...</TableCell>
                  </TableRow>
                ) : filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">لا توجد مواد خام</TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map((material) => {
                    const daysLeft = smartDaysLeft(material);
                    const forecast = forecastedConsumptions[material.id];
                    const status = getStatusRecommendation(material);
                    return (
                      <TableRow key={material.id} onClick={() => handleRowClick(material)} className="cursor-pointer hover:bg-blue-50">
                        <TableCell>{material.code}</TableCell>
                        <TableCell>{material.name}</TableCell>
                        <TableCell>{material.quantity} {material.unit}</TableCell>
                        <TableCell>{material.min_stock} {material.unit}</TableCell>
                        <TableCell>
                          {material.importance > 0 ? (
                            <div className="flex">
                              {Array.from({ length: Math.min(material.importance, 5) }).map((_, i) => (
                                <span key={i} className="text-amber-500">★</span>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{daysLeft > 0 ? `${daysLeft} يوم` : '0'}</TableCell>
                        <TableCell>{forecastLoading ? '...' : forecast !== undefined ? `${forecast} ${material.unit}` : '-'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${status.color}`} title={status.tooltip}>
                            {status.label}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2">
          <label htmlFor="algo-select" className="text-xs">خوارزمية التوقع:</label>
          <select
            id="algo-select"
            className="border rounded px-2 py-1 text-xs"
            value={selectedAlgorithm}
            onChange={e => setSelectedAlgorithm(e.target.value as ForecastAlgorithm)}
          >
            <option value="ensemble">توقع مدمج (الأدق)</option>
            <option value="moving_average">متوسط متحرك</option>
            <option value="linear_regression">انحدار خطي</option>
            <option value="seasonal_trend">تحليل موسمي</option>
            <option value="exponential_smoothing">تسوية أسية</option>
            <option value="arima_like">ARIMA-like</option>
          </select>
        </div>
        {forecastError && <span className="text-red-500 text-xs">{forecastError}</span>}
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild />
        <DrawerContent className="p-6 max-w-lg mx-auto">
          {/* DialogTitle for accessibility compliance */}
          <div role="heading" aria-level={2} className="sr-only">
            تفاصيل المادة الخام
          </div>
          {selectedMaterial && (
            <div>
              <h2 className="text-lg font-bold mb-2">تفاصيل المادة: {selectedMaterial.name}</h2>
              <div className="mb-4 text-sm text-gray-600">الكود: {selectedMaterial.code} | الوحدة: {selectedMaterial.unit}</div>
              <div className="mb-4">
                <h3 className="font-semibold mb-1">الاستهلاك التاريخي والتوقعات</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={(() => {
                    // دمج التاريخ والتوقعات في مصفوفة واحدة
                    const months = [...(materialHistory?.map(h => h.month) || []), ...(materialForecasts?.map(f => f.month) || [])];
                    const uniqueMonths = Array.from(new Set(months)).sort();
                    return uniqueMonths.map(month => {
                      const hist = materialHistory?.find(h => h.month === month)?.consumptionQty;
                      const preds: any = {};
                      materialForecasts?.forEach(f => {
                        if (f.month === month) preds[f.algorithm] = f.predicted;
                      });
                      return {
                        month,
                        actual: hist,
                        ...preds
                      };
                    });
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="actual" name="فعلي" stroke="#6366F1" />
                    <Line type="monotone" dataKey="moving_average" name="متوسط متحرك" stroke="#F59E0B" />
                    <Line type="monotone" dataKey="linear_regression" name="انحدار خطي" stroke="#10b981" />
                    <Line type="monotone" dataKey="seasonal_trend" name="موسمي" stroke="#EF4444" />
                    <Line type="monotone" dataKey="advanced_seasonal" name="موسمي متقدم" stroke="#1D4ED8" />
                    <Line type="monotone" dataKey="exponential_smoothing" name="تسوية أسية" stroke="#8B5CF6" />
                    <Line type="monotone" dataKey="arima_like" name="ARIMA-like" stroke="#FF6F61" />
                    <Line type="monotone" dataKey="ensemble" name="مدمج" stroke="#1E293B" />
                    <Line type="monotone" dataKey="weighted_ensemble" name="مدمج مرجح" stroke="#0EA5E9" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mb-4">
                <h3 className="font-semibold mb-1">دقة كل خوارزمية (آخر 6 أشهر):</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(materialAccuracy).map(([algo, acc]: any) => (
                    <div key={algo} className="flex justify-between">
                      <span>{algo}</span>
                      <span>MAE: {acc.mae?.toFixed(1)} | RMSE: {acc.rmse?.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button className="mt-2 w-full" onClick={() => setDrawerOpen(false)}>إغلاق</Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default RawMaterialsPlanning;
