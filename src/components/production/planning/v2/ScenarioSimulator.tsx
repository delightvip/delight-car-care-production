import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import ProductionService, { ProductionOrder } from '@/services/ProductionService';
import InventoryService from '@/services/InventoryService';
import { toast } from 'sonner';

// أنواع التغييرات الممكنة
const changeTypes = [
  { value: 'increase-production', label: 'زيادة الإنتاج' },
  { value: 'decrease-production', label: 'تخفيض الإنتاج' },
  { value: 'change-raw-price', label: 'تغيير سعر مادة خام' },
  { value: 'change-packaging-price', label: 'تغيير سعر مستلزم تعبئة' },
];

// نوع متغير المحاكاة
interface ScenarioVariable {
  id: string;
  changeType: string;
  productCode?: string;
  materialCode?: string;
  value: number;
}

export const ScenarioSimulator: React.FC = () => {
  const [variables, setVariables] = useState<ScenarioVariable[]>([
    { id: Date.now().toString(), changeType: 'increase-production', productCode: '', value: 10 }
  ]);
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // تحميل المنتجات والمواد عند التحميل الأول
  useEffect(() => {
    async function fetchData() {
      try {
        const invService = InventoryService.getInstance();
        const semiFinished = await invService.getSemiFinishedProducts();
        setProducts(semiFinished);
        const rawMaterials = await invService.getRawMaterials();
        const packagingMaterials = await invService.getPackagingMaterials();
        setMaterials([...rawMaterials, ...packagingMaterials]);
      } catch (e) {
        toast.error('تعذر تحميل المنتجات أو المواد');
      }
    }
    fetchData();
  }, []);

  // إضافة متغير جديد
  const addVariable = () => {
    setVariables(vars => [
      ...vars,
      { id: Date.now().toString() + Math.random(), changeType: 'increase-production', productCode: '', value: 10 }
    ]);
  };

  // حذف متغير
  const removeVariable = (id: string) => {
    setVariables(vars => vars.length === 1 ? vars : vars.filter(v => v.id !== id));
  };

  // تحديث متغير
  const updateVariable = (id: string, changes: Partial<ScenarioVariable>) => {
    setVariables(vars => vars.map(v => v.id === id ? { ...v, ...changes } : v));
  };

  // تنفيذ المحاكاة لجميع المتغيرات
  const handleSimulate = async () => {
    setLoading(true);
    setResults([]);
    try {
      let allResults: string[] = [];
      for (const variable of variables) {
        if ((variable.changeType === 'increase-production' || variable.changeType === 'decrease-production') && variable.productCode) {
          const product = products.find(p => p.code === variable.productCode);
          if (!product) {
            allResults.push('لم يتم العثور على المنتج المختار.');
            continue;
          }
          const percent = variable.value / 100;
          const direction = variable.changeType === 'increase-production' ? 1 : -1;
          // تحقق من وجود ingredients وتحقق من requiredQuantity وunitCost
          const affectedMaterials = (product.ingredients || []).map((ing: any) => {
            // تحقق من وجود requiredQuantity وأنها رقم
            let qty = Number(ing.requiredQuantity);
            if (isNaN(qty)) qty = 0;
            const qtyChange = qty * percent * direction;
            return {
              name: ing.name,
              code: ing.code,
              qtyChange,
              unit: ing.unit || '',
              unitCost: typeof ing.unitCost === 'number' ? ing.unitCost : 0
            };
          });
          // حساب التغير في التكلفة بدقة
          const costChange = affectedMaterials.reduce((sum: number, ing: any) => sum + (ing.qtyChange * ing.unitCost), 0);
          allResults = allResults.concat([
            `منتج: ${product.name}`,
            ...affectedMaterials.map(m => `${m.qtyChange > 0 ? 'زيادة' : 'نقص'} في ${m.name}${m.unit ? ' (' + m.unit + ')' : ''} بمقدار ${isNaN(m.qtyChange) ? '0' : Math.abs(m.qtyChange).toFixed(2)} وحدة`),
            `تغير تقديري في التكلفة الكلية: ${costChange > 0 ? '+' : ''}${isNaN(costChange) ? '0.00' : costChange.toFixed(2)} جنيه`,
            '---'
          ]);
        } else if ((variable.changeType === 'change-raw-price' || variable.changeType === 'change-packaging-price') && variable.materialCode) {
          const material = materials.find(m => m.code === variable.materialCode);
          if (!material) {
            allResults.push('لم يتم العثور على المادة المختارة.');
            continue;
          }
          const percent = variable.value / 100;
          const unitCost = typeof material.unit_cost === 'number' ? material.unit_cost : 0;
          const priceChange = unitCost * percent;

          // المنتجات المتأثرة بهذه المادة
          // ابحث في جميع المنتجات عن المنتجات التي تحتوي هذه المادة ضمن ingredients
          const affectedProducts = products.filter(prod =>
            Array.isArray(prod.ingredients) && prod.ingredients.some((ing: any) => ing.code === material.code)
          );

          if (affectedProducts.length === 0) {
            allResults = allResults.concat([
              `مادة: ${material.name}`,
              `تغير سعر المادة بمقدار ${priceChange > 0 ? '+' : ''}${isNaN(priceChange) ? '0.00' : priceChange.toFixed(2)} جنيه للوحدة`,
              'لا يوجد منتجات متأثرة بهذه المادة.',
              '---'
            ]);
            continue;
          }

          allResults.push(`مادة: ${material.name}`);
          allResults.push(`تغير سعر المادة بمقدار ${priceChange > 0 ? '+' : ''}${isNaN(priceChange) ? '0.00' : priceChange.toFixed(2)} جنيه للوحدة`);
          allResults.push('المنتجات المتأثرة:');

          affectedProducts.forEach(prod => {
            const ing = prod.ingredients.find((i: any) => i.code === material.code);
            let qty = Number(ing?.requiredQuantity);
            if (isNaN(qty) || !qty) {
              allResults.push(`- ${prod.name}: بيانات الكمية المطلوبة للمادة غير متوفرة أو غير رقمية.`);
              return;
            }
            // جلب تكلفة الوحدة من جميع الاحتمالات
            let unitCost = 0;
            if (typeof ing.unitCost === 'number') unitCost = ing.unitCost;
            else if (typeof ing.unit_cost === 'number') unitCost = ing.unit_cost;
            else if (typeof material.unit_cost === 'number') unitCost = material.unit_cost;
            if (!unitCost) {
              allResults.push(`- ${prod.name}: بيانات تكلفة الوحدة للمادة غير متوفرة.`);
              return;
            }
            // التكلفة القديمة للمادة في المنتج
            const oldMaterialCost = qty * unitCost;
            // التكلفة الجديدة للمادة في المنتج
            const newMaterialCost = qty * (unitCost + priceChange);
            // التكلفة الكلية القديمة للمنتج (نحاول أخذها من totalCost أو جمع كل المواد)
            let oldTotalCost = typeof prod.totalCost === 'number' ? prod.totalCost : 0;
            if (!oldTotalCost && Array.isArray(prod.ingredients)) {
              oldTotalCost = prod.ingredients.reduce((sum: number, i: any) => {
                const q = Number(i.requiredQuantity);
                let c = 0;
                if (typeof i.unitCost === 'number') c = i.unitCost;
                else if (typeof i.unit_cost === 'number') c = i.unit_cost;
                return sum + (isNaN(q) || isNaN(c) ? 0 : q * c);
              }, 0);
            }
            if (!oldTotalCost) {
              allResults.push(`- ${prod.name}: بيانات التكلفة الكلية للمنتج غير متوفرة.`);
              return;
            }
            // التكلفة الكلية الجديدة للمنتج
            const newTotalCost = oldTotalCost - oldMaterialCost + newMaterialCost;
            // نسبة التغير في تكلفة المنتج الكلية
            const percentChange = oldTotalCost === 0 ? 0 : ((newTotalCost - oldTotalCost) / oldTotalCost) * 100;

            allResults.push(
              `- ${prod.name}:\n  * الكمية المستخدمة من المادة: ${qty} وحدة\n  * تكلفة المادة في المنتج: من ${oldMaterialCost.toFixed(2)} إلى ${newMaterialCost.toFixed(2)} جنيه\n  * التكلفة الكلية للمنتج: من ${oldTotalCost.toFixed(2)} إلى ${newTotalCost.toFixed(2)} جنيه\n  * نسبة التغير في تكلفة المنتج: ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(2)}%`
            );
          });
          allResults.push('---');
        } else {
          allResults.push('يرجى تحديد منتج أو مادة لكل متغير.');
        }
      }
      setResults(allResults);
    } catch (e: any) {
      setResults(['حدث خطأ أثناء المحاكاة: ' + (e.message || 'خطأ غير معروف')]);
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>محاكاة سيناريوهات متقدمة (What If)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2">يمكنك الآن إضافة عدة متغيرات (منتجات أو مواد) في نفس السيناريو، وتحديد نوع التغيير وقيمته لكل متغير.</div>
        <div className="space-y-4 mb-4">
          {variables.map((v, idx) => (
            <div key={v.id} className="flex gap-3 flex-wrap items-end border-b pb-2">
              <div>
                <label className="block mb-1 text-xs">نوع التغيير</label>
                <select className="border rounded p-1 text-xs" value={v.changeType} onChange={e => updateVariable(v.id, { changeType: e.target.value })}>
                  {changeTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              {(v.changeType === 'increase-production' || v.changeType === 'decrease-production') && (
                <div>
                  <label className="block mb-1 text-xs">المنتج المستهدف</label>
                  <select className="border rounded p-1 text-xs" value={v.productCode} onChange={e => updateVariable(v.id, { productCode: e.target.value })}>
                    <option value="">اختر المنتج</option>
                    {products.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {(v.changeType === 'change-raw-price' || v.changeType === 'change-packaging-price') && (
                <div>
                  <label className="block mb-1 text-xs">المادة المستهدفة</label>
                  <select className="border rounded p-1 text-xs" value={v.materialCode} onChange={e => updateVariable(v.id, { materialCode: e.target.value })}>
                    <option value="">اختر المادة</option>
                    {materials.map(m => (
                      <option key={m.code} value={m.code}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block mb-1 text-xs">القيمة (%)</label>
                <input type="number" className="border rounded p-1 text-xs w-20" value={v.value} onChange={e => updateVariable(v.id, { value: Number(e.target.value) })} placeholder="مثلاً 10" />
              </div>
              <button className="text-xs text-red-600 ml-2 underline" type="button" onClick={() => removeVariable(v.id)} disabled={variables.length === 1}>حذف</button>
            </div>
          ))}
          <button className="bg-sky-100 text-sky-700 rounded px-3 py-1 text-xs font-bold border border-sky-300 hover:bg-sky-200 transition" type="button" onClick={addVariable}>+ إضافة متغير جديد</button>
        </div>
        <button className="bg-primary text-white rounded px-4 py-2 text-sm font-bold" onClick={handleSimulate} disabled={loading}>
          {loading ? 'جارٍ الحساب...' : 'محاكاة السيناريو'}
        </button>
        {/* نتائج المحاكاة */}
        <div className="bg-muted rounded p-3 mt-4 text-sm">
          <div>التأثير المتوقع:</div>
          <ul className="list-disc pr-4 mt-1">
            {results.length === 0 && <li>—</li>}
            {results.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
        <div className="text-xs text-muted-foreground mt-2">* هذه النتائج محاكاة فقط ولا تؤثر على أي بيانات حقيقية.</div>
      </CardContent>
    </Card>
  );
};

export default ScenarioSimulator;
