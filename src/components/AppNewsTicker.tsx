
import React, { useEffect, useState } from 'react';
import { NewsTicker, NewsItem } from './ui/news-ticker';
import NewsTickerService from '@/services/NewsTickerService';
import { Spinner } from './ui/spinner';
import { useTheme } from '@/components/theme-provider';

export const AppNewsTicker = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  
  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true);
      try {
        const newsService = NewsTickerService.getInstance();
        const newsItems = await newsService.getAllNews();
        setNews(newsItems);
      } catch (error) {
        console.error('Error fetching news for ticker:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // جلب الأخبار عند تحميل المكون
    fetchNews();
    
    // تحديث الأخبار كل 3 دقائق
    const intervalId = setInterval(fetchNews, 3 * 60 * 1000);
    
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
  
  return (
    <NewsTicker
      items={news}
      direction="rtl"
      pauseOnHover={true}
      controls={true}
      speed={40}
      height={36}
      theme={theme === 'dark' ? 'dark' : 'finance'}
    />
  );
};
