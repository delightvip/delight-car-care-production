import React, { useState, useEffect } from 'react';
import styles from '@/components/production/planning/v2/ProductionPlanningV2.module.css';
import { SmartDashboard } from '@/components/production/planning/v2/SmartDashboard';
import { MaterialsPanel } from '@/components/production/planning/v2/MaterialsPanel';
import { PackagingPanel } from '@/components/production/planning/v2/PackagingPanel';
import { TimelinePanel } from '@/components/production/planning/v2/TimelinePanel';
import { ScenarioSimulator } from '@/components/production/planning/v2/ScenarioSimulator';
import { SensitivityAnalysis } from '@/components/production/planning/v2/SensitivityAnalysis';
import { AIRecommendations } from '@/components/production/planning/v2/AIRecommendations';
import { ActivityLog } from '@/components/production/planning/v2/ActivityLog';
import { DecisionSupportPanel } from '@/components/production/planning/v2/DecisionSupportPanel';
import { KPIsPanel } from '@/components/production/planning/v2/KPIsPanel';
import { WhatIfPanel } from '@/components/production/planning/v2/WhatIfPanel';

const TABS = [
  { value: 'dashboard', label: 'لوحة القيادة', component: <SmartDashboard /> },
  { value: 'materials', label: 'المواد الخام', component: <MaterialsPanel /> },
  { value: 'packaging', label: 'مستلزمات التعبئة', component: <PackagingPanel /> },
  { value: 'timeline', label: 'جدولة الإنتاج', component: <TimelinePanel /> },
  { value: 'scenarios', label: 'محاكاة السيناريوهات', component: <ScenarioSimulator /> },
  { value: 'sensitivity', label: 'تحليل الحساسية', component: <SensitivityAnalysis /> },
  { value: 'ai', label: 'توصيات ذكية', component: <AIRecommendations /> },
  { value: 'log', label: 'سجل الأحداث', component: <ActivityLog /> },
];

const ProductionPlanningV2: React.FC = () => {
  // استرجاع التاب النشط من localStorage أو الافتراضي
  const [tab, setTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('planning_tab') || 'dashboard';
    }
    return 'dashboard';
  });

  // حفظ التاب النشط عند التغيير
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('planning_tab', tab);
    }
  }, [tab]);

  // Spinner for loading state
  const Spinner = () => (
    <div className="flex justify-center items-center py-10">
      <svg className="animate-spin h-8 w-8 text-sky-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
      <span className="ml-4 text-sky-700 font-bold">جاري تحميل البيانات...</span>
    </div>
  );

  const [loadingTab, setLoadingTab] = useState(false);

  // دالة تغيير التبويب مع مؤثر تحميل
  const handleTabChange = (value: string) => {
    setLoadingTab(true);
    setTimeout(() => {
      setTab(value);
      setLoadingTab(false);
    }, 500); // يمكن تعديل المدة حسب الحاجة أو ربطها بتحميل بيانات فعلية
  };

  return (
    <div className={styles['planning-root']}>
      {/* Header */}
      <header className="mb-8 border-b pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={styles.heading + ' mb-2'}>تخطيط الإنتاج الذكي <span className="text-primary">(محاكاة متقدمة)</span></h1>
          <p className="text-muted-foreground text-base max-w-xl">منصة تفاعلية تدعم اتخاذ القرار الذكي في تخطيط الإنتاج، مع مؤشرات أداء، توصيات AI، محاكاة What-If، وجدولة ديناميكية.</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button className="bg-primary text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-sky-700 transition">تقرير شامل</button>
          <button className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-amber-600 transition">تنبيه المخزون</button>
        </div>
      </header>
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Main Section (2/3) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className={styles.card + ' animate-fadein'}>
            <SmartDashboard />
          </div>
          <div className={styles.card + ' animate-fadein'}>
            <DecisionSupportPanel />
          </div>
          <div className={styles.card + ' animate-fadein'}>
            <AIRecommendations />
          </div>
        </div>
        {/* Side Section (1/3) */}
        <div className="flex flex-col gap-6">
          <div className={styles.card + ' animate-fadein'}>
            <KPIsPanel onNavigate={handleTabChange} />
          </div>
          <div className={styles.card + ' animate-fadein'}>
            <WhatIfPanel />
          </div>
          <div className={styles.card + ' animate-fadein'}>
            <ActivityLog />
          </div>
        </div>
      </div>
      {/* Tabs Navigation for advanced tools */}
      <nav className={styles['tab-list'] + ' sticky top-0 z-10 bg-opacity-70 backdrop-blur mb-6'}>
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            className={styles['tab-trigger'] + (tab === value ? ' ' + styles['tab-active'] : '')}
            onClick={() => handleTabChange(value)}
            aria-selected={tab === value}
            disabled={loadingTab}
          >
            {label}
          </button>
        ))}
      </nav>
      {/* Dynamic Section for advanced/pluggable tools */}
      <section>
        <div className={styles.card + ' animate-fadein'}>
          {loadingTab ? <Spinner /> : TABS.find(t => t.value === tab)?.component}
        </div>
      </section>
    </div>
  );
};

export default ProductionPlanningV2;
