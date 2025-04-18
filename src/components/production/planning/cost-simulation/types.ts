// جميع أنواع البيانات المستخدمة في محاكاة التكاليف

export interface CostFactor {
  id: string;
  name: string;
  category: string;
  currentValue: number;
  unit: string;
  impactLevel: 'low' | 'medium' | 'high';
  minValue?: number;
  maxValue?: number;
}

export interface CostScenario {
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

export interface FactorCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
}
