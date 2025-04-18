import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RefreshCcw } from 'lucide-react';

/**
 * لوحة What-If: تتيح للمستخدم تجربة سيناريوهات افتراضية وتظهر التأثير مباشرة.
 */
export const WhatIfPanel: React.FC = () => {
  const [productionQty, setProductionQty] = useState(1000);
  const [stock, setStock] = useState(2000);
  const [result, setResult] = useState('');

  const handleSimulate = () => {
    const remaining = stock - productionQty;
    setResult(
      remaining >= 0
        ? `المخزون بعد الإنتاج: ${remaining} وحدة (كافٍ)`
        : `تحذير: المخزون سينخفض إلى ${remaining} وحدة!`
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>محاكاة What-If</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
          <div>
            <label className="block mb-1">كمية الإنتاج الافتراضية</label>
            <input
              type="number"
              className="border rounded px-2 py-1 w-32"
              value={productionQty}
              onChange={e => setProductionQty(Number(e.target.value))}
              min={0}
            />
          </div>
          <div>
            <label className="block mb-1">المخزون الحالي</label>
            <input
              type="number"
              className="border rounded px-2 py-1 w-32"
              value={stock}
              onChange={e => setStock(Number(e.target.value))}
              min={0}
            />
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded shadow font-bold hover:bg-sky-700 transition"
            onClick={handleSimulate}
          >
            <RefreshCcw size={18} /> تنفيذ المحاكاة
          </button>
        </div>
        {result && <div className="mt-2 font-semibold text-center">{result}</div>}
      </CardContent>
    </Card>
  );
};

export default WhatIfPanel;
