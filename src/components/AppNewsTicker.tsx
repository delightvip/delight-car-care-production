import React, { useEffect, useState } from 'react';
import { NewsTicker, NewsItem } from './ui/news-ticker';
import NewsTickerService from '@/services/NewsTickerService';
import { Spinner } from './ui/spinner';
import { useTheme } from '@/components/theme-provider';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { NewsTickerSettings, NewsTickerCategory } from './TickerSettings';

export const AppNewsTicker = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  const [speed, setSpeed] = useState<number>(40);
  const [autoplay, setAutoplay] = useState<boolean>(true);
  const [categories, setCategories] = useState<NewsTickerCategory[]>([
    { id: 'financial', name: 'مالي', icon: null, enabled: true },
    { id: 'inventory', name: 'المخزون', icon: null, enabled: true },
    { id: 'production', name: 'الإنتاج', icon: null, enabled: true },
    { id: 'commercial', name: 'المبيعات', icon: null, enabled: true },
    { id: 'returns', name: 'المرتجعات', icon: null, enabled: true },
    { id: 'analytics', name: 'التحليلات', icon: null, enabled: true },
  ]);
  // حالة إظهار/إخفاء الشريط
  const [showTicker, setShowTicker] = useState<boolean>(true);

  // تحسين تصنيف الأخبار حسب الفئة باستخدام category id مباشرة
  const getCategoryId = (item: NewsItem): string => {
    // إذا كان هناك category id مخزن ضمن item (يفضل إضافته مستقبلاً)
    if ((item as any).categoryId) return (item as any).categoryId;
    // fallback: استخدم category مباشرة إذا كانت من الأنواع المعتمدة
    const knownIds = categories.map(c => c.id);
    if (item.category && knownIds.includes(item.category)) return item.category;
    // fallback: مطابقة نصية
    const categoryMap: Record<string, string[]> = {
      'financial': ['مالي', 'الخزينة', 'البنك', 'الإيرادات', 'المصروفات', 'الربح'],
      'inventory': ['المخزون', 'الكمية', 'مخزون منخفض', 'حركة المخزون'],
      'production': ['الإنتاج', 'التصنيع', 'التعبئة'],
      'commercial': ['المبيعات', 'الفواتير', 'المدفوعات'],
      'returns': ['المرتجعات', 'مرتجع'],
      'analytics': ['تحليلات', 'الأكثر مبيعًا', 'الأكثر ربحية', 'الأكثر استخدامًا']
    };
    for (const [key, values] of Object.entries(categoryMap)) {
      if (item.category && values.some(value => item.category?.includes(value))) {
        return key;
      }
      if (values.some(value => item.content.includes(value))) {
        return key;
      }
    }
    return 'analytics';
  };

  // تحديث useEffect الخاص بالتصفية
  useEffect(() => {
    if (news.length > 0) {
      const activeCategories = categories.filter(cat => cat.enabled).map(cat => cat.id);
      const filtered = news.filter(item => activeCategories.includes(getCategoryId(item)));
      setFilteredNews(filtered);
    }
  }, [news, categories]);

  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true);
      try {
        const newsService = NewsTickerService.getInstance();
        const newsItems = await newsService.getAllNews();
        setNews(newsItems);
      } catch (error) {
        console.error('Error fetching news for ticker:', error);
        toast.error('حدث خطأ أثناء تحميل بيانات الشريط الإخباري');
      } finally {
        setIsLoading(false);
      }
    };
    
    // جلب الأخبار عند تحميل المكون
    fetchNews();
    
    // تحديث الأخبار كل 2 دقيقة
    const intervalId = setInterval(fetchNews, 2 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // حالة التحميل
  if (isLoading && news.length === 0) {
    return (
      <div className="h-8 bg-slate-800/90 border-y border-slate-700 flex items-center justify-center">
        <Spinner size="sm" className="text-primary mr-2" />
        <span className="text-sm text-muted-foreground">جارِ تحميل البيانات...</span>
      </div>
    );
  }
  
  // إذا لم تكن هناك أخبار، عرض رسالة افتراضية
  if (!isLoading && news.length === 0) {
    return (
      <NewsTicker
        items={[
          {
            id: 'default',
            content: 'مرحبًا بك في نظام ديلايت لإدارة العناية بالسيارات',
            category: 'ترحيب',
            trend: 'neutral'
          }
        ]}
        direction="rtl"
        pauseOnHover={true}
        height={36}
        theme={theme === 'dark' ? 'dark' : 'finance'}
      />
    );
  }

  // معالجة تغيير إعدادات التصفية
  const handleCategoriesChange = (updatedCategories: NewsTickerCategory[]) => {
    setCategories(updatedCategories);
  };
  
  // معالجة تغيير سرعة الشريط
  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
  };
  
  // معالجة تغيير وضع التشغيل التلقائي
  const handleAutoplayChange = (isAutoplay: boolean) => {
    setAutoplay(isAutoplay);
  };
  
  // إضافة دالة تمرير تحكم الإظهار/الإخفاء لإعدادات الشريط
  const handleToggleTicker = () => setShowTicker((prev) => !prev);

  return (
    <div className="relative">
      {/* زر إعدادات الشريط دائم الظهور في أسفل يسار الشاشة */}
      <div className="fixed bottom-2 left-6 z-50">
        <NewsTickerSettings 
          onCategoriesChange={handleCategoriesChange} 
          initialCategories={categories}
          onSpeedChange={handleSpeedChange}
          currentSpeed={speed}
          onAutoplayChange={handleAutoplayChange}
          autoplay={autoplay}
          showTicker={showTicker}
          onToggleTicker={handleToggleTicker}
        />
      </div>
      {/* الشريط الإخباري */}
      {showTicker && (
        <NewsTicker
          items={filteredNews.length > 0 ? filteredNews : news}
          direction="rtl"
          pauseOnHover={true}
          controls={true}
          speed={speed}
          autoplay={autoplay}
          height={36}
          theme={theme === 'dark' ? 'dark' : 'finance'}
        />
      )}
    </div>
  );
};
