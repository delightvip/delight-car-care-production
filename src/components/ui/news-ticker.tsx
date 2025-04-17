
import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Pause, Play, TrendingDown, TrendingUp, CircleDot, AlertCircle, Star } from "lucide-react";
import "./news-ticker-fonts.css"; // استيراد ملف الخطوط الجديدة

export interface NewsItem {
  id: string | number;
  content: string;
  category?: string;
  importance?: "normal" | "high" | "urgent";
  link?: string;
  trend?: "up" | "down" | "neutral";
  value?: number | string;
  previousValue?: number | string;
  valueChange?: number;
  valueChangePercentage?: number;
  highlight?: boolean;
}

interface NewsTickerProps {
  items: NewsItem[];
  speed?: number; // سرعة التحريك بالبكسل/ثانية
  pauseOnHover?: boolean;
  className?: string;
  direction?: "rtl" | "ltr";
  controls?: boolean;
  autoplay?: boolean;
  height?: number;
  theme?: "default" | "dark" | "finance";
}

export const NewsTicker = ({
  items,
  speed = 50,
  pauseOnHover = true,
  className,
  direction = "rtl",
  controls = true,
  autoplay = true,
  height = 40,
  theme = "default"
}: NewsTickerProps) => {
  const [isPaused, setIsPaused] = useState(!autoplay);
  const tickerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const [itemWidth, setItemWidth] = useState(0);
  
  useEffect(() => {
    if (tickerRef.current && itemsRef.current) {
      const computedItemWidth = itemsRef.current.scrollWidth;
      setItemWidth(computedItemWidth);
      
      // إعادة تعيين موضع العنصر للعرض من البداية
      if (direction === "rtl") {
        itemsRef.current.style.transform = `translateX(${tickerRef.current.offsetWidth}px)`;
      } else {
        itemsRef.current.style.transform = `translateX(-${computedItemWidth}px)`;
      }
    }
  }, [items, direction]);

  useEffect(() => {
    if (!isPaused && tickerRef.current && itemsRef.current) {
      let animationId: number;
      let startTime: number;
      let lastPos = direction === "rtl" 
        ? tickerRef.current.offsetWidth 
        : -itemWidth;
      
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        
        // حساب الموضع الجديد بناءً على السرعة
        const newPos = direction === "rtl" 
          ? lastPos - (progress / 1000) * speed 
          : lastPos + (progress / 1000) * speed;
        
        itemsRef.current!.style.transform = `translateX(${newPos}px)`;
        
        // إعادة تعيين الشريط عندما يخرج من الشاشة بالكامل
        if ((direction === "rtl" && newPos < -itemWidth) || 
            (direction === "ltr" && newPos > tickerRef.current!.offsetWidth)) {
          startTime = timestamp;
          lastPos = direction === "rtl" 
            ? tickerRef.current!.offsetWidth 
            : -itemWidth;
        }
        
        animationId = requestAnimationFrame(animate);
      };
      
      animationId = requestAnimationFrame(animate);
      
      return () => {
        cancelAnimationFrame(animationId);
      };
    }
  }, [isPaused, itemWidth, speed, direction]);

  // معالجات للتحكم
  const handlePause = () => setIsPaused(true);
  const handlePlay = () => setIsPaused(false);
  const handleMouseEnter = () => pauseOnHover && setIsPaused(true);
  const handleMouseLeave = () => pauseOnHover && autoplay && setIsPaused(false);

  // تصنيف العناصر حسب الأهمية
  const sortedItems = [...items].sort((a, b) => {
    const importanceOrder = { urgent: 0, high: 1, normal: 2 };
    const aVal = importanceOrder[a.importance || "normal"] || 2;
    const bVal = importanceOrder[b.importance || "normal"] || 2;
    return aVal - bVal;
  });  // تحديد فئة الخلفية بناءً على السمة
  const getTickerBackground = () => {
    switch (theme) {
      case "dark":
        return "bg-gray-900/95 border-b-4 border-t border-blue-600 shadow-md";
      case "finance":
        return "bg-blue-950/95 border-b-4 border-t border-blue-600 backdrop-blur-sm shadow-md";
      default:
        return "bg-blue-950/95 border-b-4 border-t border-blue-500";
    }
  };

  return (
    <div 
      className={cn("relative overflow-hidden border-y", getTickerBackground(), className)}
      style={{ height: `${height}px` }}
    >
      <div 
        ref={tickerRef}
        className="h-full overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          ref={itemsRef}
          className="inline-flex items-center h-full whitespace-nowrap will-change-transform"
          dir={direction}
        >
          {sortedItems.map((item, idx) => (
            <div 
              key={item.id || idx}
              className={cn(                "inline-flex items-center px-4 h-full",
                item.importance === "urgent" && "font-bold",
                item.importance === "high" && "font-semibold",
                item.highlight && "bg-amber-500/20 dark:bg-amber-500/30",
                item.category && "after:content-['●'] after:mx-3 after:text-primary-foreground/60"
              )}
            >              {/* أيقونة الأهمية أو الاتجاه */}
              {item.importance === "urgent" && (
                <AlertCircle size={18} className="text-red-500 dark:text-red-400 mr-1.5" />
              )}
              {item.importance === "high" && (
                <Star size={18} className="text-amber-500 dark:text-amber-400 mr-1.5" />
              )}
                {/* عرض الفئة إذا كانت موجودة */}
              {item.category && (
                <span className="ml-1 px-2 py-0.5 bg-blue-600 dark:bg-blue-700 text-white text-xs font-bold rounded-sm mr-2 inline-flex items-center">
                  {item.category}
                </span>
              )}              {/* المحتوى الرئيسي */}
              <span className={cn(
                "text-sm font-bold text-white tracking-wide mx-1 financial-font",
                item.category?.includes("مالي") && "news-financial",
                item.category?.includes("المخزون") && "news-inventory",
                item.category?.includes("التحليلات") && "news-analytics"
              )}>
                {item.link ? (
                  <a href={item.link} className="hover:underline">
                    {item.content}
                  </a>
                ) : (
                  item.content
                )}
              </span>                {/* عرض معلومات التغيير إذا كانت موجودة */}
              {item.value !== undefined && (
                <span 
                  className={cn(
                    "mx-1.5 font-mono font-bold text-sm px-1.5 py-0.5 rounded",
                    item.trend === "up" && "bg-emerald-600/40 text-emerald-400",
                    item.trend === "down" && "bg-red-600/40 text-red-300",
                    item.trend === "neutral" && "bg-amber-600/40 text-amber-300"
                  )}
                >
                  {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                </span>
              )}                {/* مؤشر الاتجاه */}
              {item.trend === "up" && (
                <TrendingUp size={16} className="text-emerald-300 bg-emerald-900/60 p-0.5 rounded mx-0.5" />
              )}
              {item.trend === "down" && (
                <TrendingDown size={16} className="text-red-300 bg-red-900/60 p-0.5 rounded mx-0.5" />
              )}
              {item.trend === "neutral" && (
                <CircleDot size={16} className="text-amber-300 bg-amber-900/60 p-0.5 rounded mx-0.5" />
              )}                {/* نسبة التغيير */}
              {item.valueChangePercentage !== undefined && (
                <span 
                  className={cn(
                    "mx-1 text-xs font-bold px-1.5 py-0.5 rounded",
                    item.valueChangePercentage > 0 ? "bg-emerald-600/40 text-emerald-300" : 
                    item.valueChangePercentage < 0 ? "bg-red-600/40 text-red-300" : "bg-amber-600/40 text-amber-300"
                  )}
                >
                  {item.valueChangePercentage > 0 ? '+' : ''}
                  {item.valueChangePercentage.toFixed(1)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {controls && (
        <div className="absolute top-0 left-0 h-full flex items-center gap-1 px-2 bg-background/80 backdrop-blur-sm z-10">
          {isPaused ? (
            <button onClick={handlePlay} className="p-1 rounded-full hover:bg-muted">
              <Play size={16} />
            </button>
          ) : (
            <button onClick={handlePause} className="p-1 rounded-full hover:bg-muted">
              <Pause size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
