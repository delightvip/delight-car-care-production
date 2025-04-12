
/**
 * حساب الأيام المتبقية حتى نفاد المخزون
 * @param currentStock المخزون الحالي
 * @param dailyConsumptionRate معدل الاستهلاك اليومي
 * @returns عدد الأيام المتبقية
 */
export const calculateRemainingDays = (currentStock: number, dailyConsumptionRate: number): number => {
  if (dailyConsumptionRate <= 0) return 999; // إذا كان معدل الاستهلاك صفر أو سالب، فالمخزون لن ينفد
  return currentStock / dailyConsumptionRate;
};

/**
 * حساب مستوى الثقة في التنبؤ
 * @param dataPointsCount عدد نقاط البيانات المستخدمة
 * @param variability تباين البيانات
 * @returns قيمة تتراوح بين 0 و 1 تمثل مستوى الثقة
 */
export const calculateConfidenceLevel = (dataPointsCount: number, variability: number): number => {
  // كلما زاد عدد نقاط البيانات وقل التباين، زادت الثقة
  if (dataPointsCount < 3) return 0.3; // بيانات قليلة جدًا
  
  // تأثير عدد نقاط البيانات (0.5 إلى 0.9)
  const dataFactor = Math.min(0.9, 0.5 + (dataPointsCount / 50));
  
  // تأثير التباين (ينقص الثقة كلما زاد التباين)
  const variabilityFactor = Math.max(0.1, 1 - variability);
  
  return dataFactor * variabilityFactor;
};

/**
 * تصنيف العناصر حسب طريقة ABC
 * @param items قائمة العناصر مع القيمة
 * @returns تصنيف لكل عنصر (A, B, أو C)
 */
export const classifyABC = (items: Array<{ id: number, value: number }>): Record<number, string> => {
  // ترتيب العناصر تنازليًا حسب القيمة
  const sortedItems = [...items].sort((a, b) => b.value - a.value);
  
  // حساب إجمالي القيمة
  const totalValue = sortedItems.reduce((sum, item) => sum + item.value, 0);
  
  // تصنيف العناصر
  const classification: Record<number, string> = {};
  let cumulativeValue = 0;
  
  for (const item of sortedItems) {
    cumulativeValue += item.value;
    const percentOfTotal = cumulativeValue / totalValue;
    
    if (percentOfTotal <= 0.8) {
      classification[item.id] = 'A';
    } else if (percentOfTotal <= 0.95) {
      classification[item.id] = 'B';
    } else {
      classification[item.id] = 'C';
    }
  }
  
  return classification;
};

/**
 * حساب الكمية الاقتصادية للطلب (EOQ)
 * @param annualDemand الطلب السنوي
 * @param orderCost تكلفة إصدار أمر الشراء
 * @param holdingCost تكلفة الاحتفاظ بوحدة واحدة لسنة
 * @returns الكمية المثلى للطلب
 */
export const calculateEOQ = (annualDemand: number, orderCost: number, holdingCost: number): number => {
  if (annualDemand <= 0 || orderCost <= 0 || holdingCost <= 0) return 0;
  
  return Math.sqrt((2 * annualDemand * orderCost) / holdingCost);
};

/**
 * حساب نقطة إعادة الطلب
 * @param dailyDemand الطلب اليومي
 * @param leadTime وقت الانتظار بالأيام
 * @param safetyStock مخزون الأمان
 * @returns نقطة إعادة الطلب
 */
export const calculateReorderPoint = (dailyDemand: number, leadTime: number, safetyStock: number): number => {
  return (dailyDemand * leadTime) + safetyStock;
};

/**
 * تحليل اتجاهات الاستهلاك وحساب نسبة التغير
 * @param historicalData بيانات الاستهلاك التاريخية
 * @returns نسبة التغير في الاستهلاك ومعلومات الاتجاه
 */
export const analyzeConsumptionTrend = (historicalData: Array<{ date: Date, quantity: number }>): {
  changeRate: number,
  trend: 'increasing' | 'decreasing' | 'flat'
} => {
  if (historicalData.length < 2) {
    return { changeRate: 0, trend: 'flat' };
  }
  
  // ترتيب البيانات تصاعديًا حسب التاريخ
  const sortedData = [...historicalData].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // تقسيم البيانات إلى فترتين
  const midpoint = Math.floor(sortedData.length / 2);
  const earlierPeriod = sortedData.slice(0, midpoint);
  const laterPeriod = sortedData.slice(midpoint);
  
  // حساب متوسط الاستهلاك في كل فترة
  const earlierAvg = earlierPeriod.reduce((sum, data) => sum + data.quantity, 0) / earlierPeriod.length;
  const laterAvg = laterPeriod.reduce((sum, data) => sum + data.quantity, 0) / laterPeriod.length;
  
  // حساب معدل التغير
  const changeRate = earlierAvg !== 0 ? (laterAvg - earlierAvg) / earlierAvg : 0;
  
  // تحديد الاتجاه
  let trend: 'increasing' | 'decreasing' | 'flat';
  if (changeRate > 0.05) {
    trend = 'increasing';
  } else if (changeRate < -0.05) {
    trend = 'decreasing';
  } else {
    trend = 'flat';
  }
  
  return { changeRate, trend };
};

/**
 * حساب المستوى الأمثل للمخزون
 * @param eoq الكمية الاقتصادية للطلب
 * @param reorderPoint نقطة إعادة الطلب
 * @returns المستوى الأمثل للمخزون
 */
export const calculateOptimalInventoryLevel = (eoq: number, reorderPoint: number): number => {
  return reorderPoint + (eoq / 2);
};

/**
 * تحويل مصفوفة نصية إلى مصفوفة أرقام
 * @param strArray مصفوفة نصية
 * @returns مصفوفة أرقام
 */
export const convertToNumberArray = (strArray: string[]): number[] => {
  // تحويل كل عنصر إلى رقم، وتصفية أي قيم غير رقمية
  return strArray
    .map(str => parseInt(str, 10))
    .filter(num => !isNaN(num));
};
