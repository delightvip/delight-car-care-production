import React, { useEffect, useState } from 'react';
import { NewsTicker, NewsItem } from './ui/news-ticker';
import NewsTickerService from '@/services/NewsTickerService';

export const AppNewsTicker = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
    
    // تحديث الأخبار كل 5 دقائق
    const intervalId = setInterval(fetchNews, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  if (isLoading && news.length === 0) {
    return (
      <div className="h-8 bg-muted/30 border-y border-border flex items-center justify-center">
        <span className="text-sm text-muted-foreground">جارِ تحميل الأخبار...</span>
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
            category: 'ترحيب'
          }
        ]}
        direction="rtl"
        pauseOnHover={true}
        height={36}
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
    />
  );
};
