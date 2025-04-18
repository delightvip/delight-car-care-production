import { MaterialConsumptionRecord } from '@/services/database/MaterialsConsumptionService';

export type ForecastAlgorithm = 'moving_average' | 'linear_regression' | 'seasonal_trend' | 'advanced_seasonal' | 'exponential_smoothing' | 'arima_like' | 'ensemble' | 'weighted_ensemble';

export interface SmartForecastResult {
  materialId: string;
  materialCode: string;
  materialName: string;
  category: string;
  forecasts: { month: string; predicted: number; algorithm: ForecastAlgorithm }[];
}

export class SmartForecastingService {
  /**
   * توقع الاستهلاك المستقبلي بخوارزمية المتوسط المتحرك البسيط
   * @param history بيانات الاستهلاك التاريخي لمادة واحدة (مرتبة تصاعديًا حسب الشهر)
   * @param monthsAhead عدد الأشهر المستقبلية للتوقع
   * @param windowSize حجم نافذة المتوسط
   */
  static movingAverage(history: { month: string; consumptionQty: number }[], monthsAhead: number, windowSize: number = 3): number[] {
    const result: number[] = [];
    let data = history.map(h => h.consumptionQty);
    for (let i = 0; i < monthsAhead; i++) {
      const window = data.slice(-windowSize);
      const avg = window.length > 0 ? window.reduce((a, b) => a + b, 0) / window.length : 0;
      result.push(Math.round(avg));
      data.push(avg);
    }
    return result;
  }

  /**
   * توقع الاستهلاك المستقبلي بالانحدار الخطي البسيط
   * @param history بيانات الاستهلاك التاريخي لمادة واحدة (مرتبة تصاعديًا حسب الشهر)
   * @param monthsAhead عدد الأشهر المستقبلية للتوقع
   */
  static linearRegression(history: { month: string; consumptionQty: number }[], monthsAhead: number): number[] {
    if (history.length === 0) return Array(monthsAhead).fill(0);
    // تحويل الأشهر إلى أرقام متسلسلة
    const x = history.map((_, i) => i + 1);
    const y = history.map(h => h.consumptionQty);
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    const result: number[] = [];
    for (let i = 1; i <= monthsAhead; i++) {
      const xi = n + i;
      const pred = slope * xi + intercept;
      result.push(Math.max(0, Math.round(pred)));
    }
    return result;
  }

  /**
   * تحليل موسمي متقدم (Seasonal Decomposition) واكتشاف القيم الشاذة
   * @param history بيانات الاستهلاك التاريخي
   * @returns كائن يحوي trend, seasonality, cleanedHistory
   */
  static advancedSeasonalDecomposition(history: { month: string; consumptionQty: number }[], period: number = 12) {
    if (history.length < period * 2) {
      // إذا لم تتوفر بيانات كافية، نعيد البيانات كما هي
      return { trend: [], seasonality: [], cleanedHistory: history };
    }
    // استخراج القيم
    const values = history.map(h => h.consumptionQty);
    // حساب المتوسط الموسمي
    const seasonality: number[] = [];
    for (let i = 0; i < period; i++) {
      const vals = [];
      for (let j = i; j < values.length; j += period) vals.push(values[j]);
      seasonality[i] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    // حساب الترند عبر متوسط متحرك طويل
    const trend: number[] = [];
    const window = period;
    for (let i = 0; i < values.length; i++) {
      const w = values.slice(Math.max(0, i - Math.floor(window/2)), Math.min(values.length, i + Math.ceil(window/2)));
      trend[i] = w.length ? w.reduce((a, b) => a + b, 0) / w.length : values[i];
    }
    // كشف القيم الشاذة (أي نقطة تبعد أكثر من 2.5 انحراف معياري عن الترند+الموسمية)
    const cleaned: { month: string; consumptionQty: number }[] = [];
    const residuals = values.map((v, i) => v - (trend[i] + seasonality[i % period]));
    const std = Math.sqrt(residuals.reduce((a, b) => a + b * b, 0) / residuals.length);
    for (let i = 0; i < values.length; i++) {
      if (Math.abs(residuals[i]) <= 2.5 * std) {
        cleaned.push(history[i]);
      }
    }
    return { trend, seasonality, cleanedHistory: cleaned };
  }

  /**
   * توقع موسمي متقدم (Seasonal + Trend)
   */
  static advancedSeasonalForecast(history: { month: string; consumptionQty: number }[], monthsAhead: number, monthsList: string[]): number[] {
    const period = 12;
    const { trend, seasonality, cleanedHistory } = this.advancedSeasonalDecomposition(history, period);
    if (!trend.length || !seasonality.length) {
      // fallback
      return this.seasonalTrend(history, monthsAhead, monthsList);
    }
    // توقع الترند عبر انحدار خطي على الترند فقط
    const trendVals = trend;
    const n = trendVals.length;
    const x = Array.from({length: n}, (_, i) => i+1);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = trendVals.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * trendVals[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    // توقع الأشهر القادمة
    const result: number[] = [];
    for (let i = 0; i < monthsAhead; i++) {
      const trendPred = intercept + slope * (n + i + 1);
      const season = seasonality[(n + i) % period];
      result.push(Math.max(0, Math.round(trendPred + season)));
    }
    return result;
  }

  /**
   * توقع موسمي بسيط (بأخذ متوسط نفس الشهر في السنوات الماضية)
   * @param history بيانات الاستهلاك التاريخي لمادة واحدة (مرتبة تصاعديًا حسب الشهر)
   * @param monthsAhead عدد الأشهر المستقبلية للتوقع
   * @param monthsList قائمة الأشهر المستقبلية (yyyy-MM)
   */
  static seasonalTrend(history: { month: string; consumptionQty: number }[], monthsAhead: number, monthsList: string[]): number[] {
    // مثال مبسط: إذا كان لدينا تاريخ سنتين، توقع شهر 5 القادم = متوسط شهري 5 في السنتين
    const result: number[] = [];
    for (let m = 0; m < monthsAhead; m++) {
      const targetMonth = monthsList[m];
      const mm = targetMonth.split('-')[1];
      const sameMonthHistory = history.filter(h => h.month.endsWith('-' + mm));
      const avg = sameMonthHistory.length > 0 ? sameMonthHistory.reduce((a, b) => a + b.consumptionQty, 0) / sameMonthHistory.length : 0;
      result.push(Math.round(avg));
    }
    return result;
  }

  /**
   * توقع الاستهلاك المستقبلي بطريقة التسوية الأسية البسيطة (Simple Exponential Smoothing)
   * @param history بيانات الاستهلاك التاريخي لمادة واحدة (مرتبة تصاعديًا حسب الشهر)
   * @param monthsAhead عدد الأشهر المستقبلية للتوقع
   * @param alpha معامل التسوية (0 < alpha <= 1)
   */
  static exponentialSmoothing(history: { month: string; consumptionQty: number }[], monthsAhead: number, alpha: number = 0.6): number[] {
    if (history.length === 0) return Array(monthsAhead).fill(0);
    let lastSmoothed = history[0].consumptionQty;
    for (let i = 1; i < history.length; i++) {
      lastSmoothed = alpha * history[i].consumptionQty + (1 - alpha) * lastSmoothed;
    }
    // توقع المستقبل بنفس القيمة الأخيرة (لأن التسوية الأسية البسيطة لا تتوقع اتجاه)
    return Array(monthsAhead).fill(Math.round(lastSmoothed));
  }

  /**
   * توقع مبسط بأسلوب ARIMA-like (AR, MA فقط، بدون تكامل أو موسمية)
   * @param history بيانات الاستهلاك التاريخي لمادة واحدة (مرتبة تصاعديًا حسب الشهر)
   * @param monthsAhead عدد الأشهر المستقبلية للتوقع
   * @param p عدد التأخيرات (AR)
   * @param q عدد المتوسطات المتحركة (MA)
   */
  static arimaLike(history: { month: string; consumptionQty: number }[], monthsAhead: number, p: number = 2, q: number = 2): number[] {
    if (history.length === 0) return Array(monthsAhead).fill(0);
    // AR: متوسط آخر p قيم
    // MA: متوسط آخر q أخطاء
    let values = history.map(h => h.consumptionQty);
    let errors: number[] = [];
    for (let i = 0; i < monthsAhead; i++) {
      const ar = values.slice(-p).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(p, values.length));
      const ma = errors.slice(-q).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(q, errors.length));
      const pred = Math.max(0, Math.round(ar + (isNaN(ma) ? 0 : ma)));
      errors.push(values[values.length - 1] - pred);
      values.push(pred);
    }
    return values.slice(-monthsAhead);
  }

  /**
   * توقع استهلاك مستقبلي متقدم باستخدام مزيج (Ensemble) من عدة خوارزميات
   * @param history بيانات الاستهلاك التاريخي لمادة واحدة
   * @param monthsAhead عدد الأشهر المستقبلية
   * @param monthsList قائمة الأشهر المستقبلية (yyyy-MM)
   */
  static ensembleForecast(history: { month: string; consumptionQty: number }[], monthsAhead: number, monthsList: string[]): number[] {
    // نجمع نتائج الخوارزميات ونأخذ المتوسط
    const preds = [
      this.movingAverage(history, monthsAhead),
      this.linearRegression(history, monthsAhead),
      this.seasonalTrend(history, monthsAhead, monthsList),
      this.exponentialSmoothing(history, monthsAhead),
      this.arimaLike(history, monthsAhead)
    ];
    const result: number[] = [];
    for (let i = 0; i < monthsAhead; i++) {
      const vals = preds.map(arr => arr[i] ?? 0);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      result.push(Math.round(avg));
    }
    return result;
  }

  /**
   * توقع استهلاك مستقبلي متقدم باستخدام مزيج (Ensemble) من عدة خوارزميات مع أوزان حسب الدقة التاريخية
   * @param history بيانات الاستهلاك التاريخي لمادة واحدة
   * @param monthsAhead عدد الأشهر المستقبلية
   * @param monthsList قائمة الأشهر المستقبلية (yyyy-MM)
   */
  static weightedEnsembleForecast(
    history: { month: string; consumptionQty: number }[],
    monthsAhead: number,
    monthsList: string[]
  ): number[] {
    // استخدم آخر 6 أشهر لاختبار دقة كل خوارزمية
    const testWindow = 6;
    if (history.length <= testWindow + monthsAhead) {
      // إذا كانت البيانات غير كافية، استخدم المتوسط البسيط لكل الخوارزميات
      return this.ensembleForecast(history, monthsAhead, monthsList);
    }
    const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
    const train = sorted.slice(0, -testWindow);
    const test = sorted.slice(-testWindow);
    const testMonths = test.map(x => x.month);
    const actual = test.map(x => x.consumptionQty);
    // احصل على توقعات كل خوارزمية
    const algos = [
      { key: 'moving_average', fn: this.movingAverage.bind(this) },
      { key: 'linear_regression', fn: this.linearRegression.bind(this) },
      { key: 'seasonal_trend', fn: (h, m) => this.seasonalTrend(h, m, testMonths) },
      { key: 'advanced_seasonal', fn: (h, m) => this.advancedSeasonalForecast(h, m, testMonths) },
      { key: 'exponential_smoothing', fn: this.exponentialSmoothing.bind(this) },
      { key: 'arima_like', fn: this.arimaLike.bind(this) },
    ];
    const errors = algos.map(algo => {
      const preds = algo.fn(train, testWindow);
      const mae = this.meanAbsoluteError(actual, preds);
      return isNaN(mae) ? 99999 : mae;
    });
    // حساب الأوزان (كلما كان MAE أقل، الوزن أعلى)
    const invErrors = errors.map(e => (e <= 0 ? 1e-6 : 1 / e));
    const sumInv = invErrors.reduce((a, b) => a + b, 0);
    const weights = invErrors.map(w => w / sumInv);
    // توقع الأشهر القادمة بكل خوارزمية
    const preds = algos.map(algo => algo.fn(sorted, monthsAhead));
    const result: number[] = [];
    for (let i = 0; i < monthsAhead; i++) {
      let weightedSum = 0;
      for (let j = 0; j < preds.length; j++) {
        weightedSum += (preds[j][i] ?? 0) * weights[j];
      }
      result.push(Math.round(weightedSum));
    }
    return result;
  }

  /**
   * حساب متوسط الخطأ المطلق (MAE)
   * @param actual القيم الفعلية
   * @param predicted القيم المتوقعة
   */
  static meanAbsoluteError(actual: number[], predicted: number[]): number {
    if (actual.length === 0 || actual.length !== predicted.length) return NaN;
    const sum = actual.reduce((acc, val, i) => acc + Math.abs(val - predicted[i]), 0);
    return sum / actual.length;
  }

  /**
   * حساب الجذر التربيعي لمتوسط مربع الأخطاء (RMSE)
   * @param actual القيم الفعلية
   * @param predicted القيم المتوقعة
   */
  static rootMeanSquaredError(actual: number[], predicted: number[]): number {
    if (actual.length === 0 || actual.length !== predicted.length) return NaN;
    const sum = actual.reduce((acc, val, i) => acc + Math.pow(val - predicted[i], 2), 0);
    return Math.sqrt(sum / actual.length);
  }

  /**
   * توقع ذكي شامل لمجموعة مواد
   * @param allHistory جميع بيانات الاستهلاك (كل المواد)
   * @param monthsAhead عدد الأشهر المستقبلية
   * @param monthsList قائمة الأشهر المستقبلية (yyyy-MM)
   */
  static smartForecast(
    allHistory: MaterialConsumptionRecord[],
    monthsAhead: number,
    monthsList: string[],
    algorithms: ForecastAlgorithm[] = ['moving_average', 'linear_regression', 'seasonal_trend', 'advanced_seasonal', 'exponential_smoothing', 'arima_like', 'ensemble', 'weighted_ensemble']
  ): SmartForecastResult[] {
    // تجميع التاريخ حسب المادة
    const grouped: { [key: string]: MaterialConsumptionRecord[] } = {};
    allHistory.forEach(rec => {
      if (!grouped[rec.materialId]) grouped[rec.materialId] = [];
      grouped[rec.materialId].push(rec);
    });
    const results: SmartForecastResult[] = [];
    Object.entries(grouped).forEach(([materialId, records]) => {
      // ترتيب التاريخ تصاعديًا
      const sorted = [...records].sort((a, b) => a.month.localeCompare(b.month));
      const forecasts: { month: string; predicted: number; algorithm: ForecastAlgorithm }[] = [];
      algorithms.forEach(alg => {
        let preds: number[] = [];
        if (alg === 'moving_average') preds = this.movingAverage(sorted, monthsAhead);
        if (alg === 'linear_regression') preds = this.linearRegression(sorted, monthsAhead);
        if (alg === 'seasonal_trend') preds = this.seasonalTrend(sorted, monthsAhead, monthsList);
        if (alg === 'advanced_seasonal') preds = this.advancedSeasonalForecast(sorted, monthsAhead, monthsList);
        if (alg === 'exponential_smoothing') preds = this.exponentialSmoothing(sorted, monthsAhead);
        if (alg === 'arima_like') preds = this.arimaLike(sorted, monthsAhead);
        if (alg === 'ensemble') preds = this.ensembleForecast(sorted, monthsAhead, monthsList);
        if (alg === 'weighted_ensemble') preds = this.weightedEnsembleForecast(sorted, monthsAhead, monthsList);
        preds.forEach((val, i) => {
          forecasts.push({ month: monthsList[i], predicted: val, algorithm: alg });
        });
      });
      results.push({
        materialId,
        materialCode: records[0]?.materialCode,
        materialName: records[0]?.materialName,
        category: records[0]?.category,
        forecasts
      });
    });
    return results;
  }
}

export default SmartForecastingService;
