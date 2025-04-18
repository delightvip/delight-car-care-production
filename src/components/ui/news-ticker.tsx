import React, { useEffect, useState, useRef, useCallback } from "react";
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
  height = 32,
  theme = "default"
}: NewsTickerProps) => {
  const [isPaused, setIsPaused] = useState(!autoplay);
  const tickerRef = useRef<HTMLDivElement>(null);
  const movingRef = useRef<HTMLDivElement>(null);
  const [itemWidth, setItemWidth] = useState(0);
  const [tickerSpeed, setTickerSpeed] = useState(speed);
  const [repeatCount, setRepeatCount] = useState(3); // افتراضيًا
  const [displayItems, setDisplayItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    setDisplayItems(items.length === 0 ? [{ id: 'empty', content: 'لا توجد أخبار حالياً', category: 'عام', trend: 'neutral' }] : items);
  }, [JSON.stringify(items)]);

  useEffect(() => {
    if (tickerRef.current && movingRef.current && displayItems.length > 0) {
      const tempDiv = document.createElement('div');
      tempDiv.style.display = 'inline-flex';
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.position = 'absolute';
      tempDiv.style.pointerEvents = 'none';
      tempDiv.style.height = `${height}px`;
      tempDiv.style.whiteSpace = 'nowrap';
      tempDiv.dir = direction;
      displayItems.forEach(item => {
        const el = document.createElement('span');
        el.textContent = item.content;
        el.style.padding = '0 24px';
        el.style.fontWeight = 'bold';
        tempDiv.appendChild(el);
      });
      document.body.appendChild(tempDiv);
      const itemsWidth = tempDiv.scrollWidth;
      setItemWidth(itemsWidth);
      const containerWidth = tickerRef.current.offsetWidth;
      const minRepeat = itemsWidth > 0 ? Math.ceil((containerWidth * 2) / itemsWidth) : 3;
      setRepeatCount(Math.max(3, minRepeat));
      document.body.removeChild(tempDiv);
    }
  }, [displayItems, tickerSpeed, height, direction]);

  const positionRef = useRef(0); // الموضع الحالي الفعلي
  const lastTimestampRef = useRef<number | null>(null);
  useEffect(() => {
    if (tickerRef.current && movingRef.current) {
      positionRef.current = direction === "rtl" ? 0 : -itemWidth * repeatCount / 2;
      movingRef.current.style.transform = `translateX(${positionRef.current}px)`;
      lastTimestampRef.current = null;
    }
  }, [itemWidth, direction, repeatCount]);

  useEffect(() => {
    let animationId: number;
    function animate(timestamp: number) {
      if (isPaused) {
        lastTimestampRef.current = null;
        return;
      }
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const totalWidth = itemWidth * repeatCount / 2;
      const elapsed = (timestamp - lastTimestampRef.current);
      const distance = (elapsed / 1000) * tickerSpeed;
      lastTimestampRef.current = timestamp;
      if (direction === "rtl") {
        positionRef.current -= distance;
        if (Math.abs(positionRef.current) >= totalWidth) {
          positionRef.current = 0;
        }
      } else {
        positionRef.current += distance;
        if (Math.abs(positionRef.current) >= totalWidth) {
          positionRef.current = -totalWidth;
        }
      }
      if (movingRef.current) {
        movingRef.current.style.transform = `translateX(${positionRef.current}px)`;
      }
      animationId = requestAnimationFrame(animate);
    }
    if (!isPaused) {
      animationId = requestAnimationFrame(animate);
    }
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPaused, tickerSpeed, repeatCount, direction, itemWidth]);

  const handlePause = useCallback(() => setIsPaused(true), []);
  const handlePlay = useCallback(() => setIsPaused(false), []);
  const handleMouseEnter = useCallback(() => pauseOnHover && setIsPaused(true), [pauseOnHover]);
  const handleMouseLeave = useCallback(() => pauseOnHover && autoplay && setIsPaused(false), [pauseOnHover, autoplay]);

  return (
    <div
      ref={tickerRef}
      className={cn("relative overflow-hidden w-full flex items-center select-none", className)}
      style={{ height }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={movingRef}
        className="flex items-center whitespace-nowrap"
        style={{ height, willChange: 'transform', transition: 'none' }}
      >
        {Array.from({ length: repeatCount }).map((_, idx) => (
          displayItems.map((item, i) => (
            <div key={`${item.id}-${idx}-${i}`} className="flex items-center px-6 py-0.5">
              {item.importance === "urgent" && (
                <AlertCircle size={18} className="text-red-500 dark:text-red-400 mr-1.5" />
              )}
              {item.importance === "high" && (
                <Star size={18} className="text-amber-500 dark:text-amber-400 mr-1.5" />
              )}
              {item.category && (
                <span className="ml-1 px-2 py-0.5 bg-blue-600 dark:bg-blue-700 text-white text-xs font-bold rounded-sm mr-2 inline-flex items-center">
                  {item.category}
                </span>
              )}
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
              </span>
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
              )}
              {item.trend === "up" && (
                <TrendingUp size={16} className="text-emerald-300 bg-emerald-900/60 p-0.5 rounded mx-0.5" />
              )}
              {item.trend === "down" && (
                <TrendingDown size={16} className="text-red-300 bg-red-900/60 p-0.5 rounded mx-0.5" />
              )}
              {item.trend === "neutral" && (
                <CircleDot size={16} className="text-amber-300 bg-amber-900/60 p-0.5 rounded mx-0.5" />
              )}
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
          ))
        ))}
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
      <div className="w-full flex justify-end items-center px-2 py-0.5 bg-transparent">
        <label htmlFor="ticker-speed" className="text-xs mr-2 text-muted-foreground">السرعة</label>
        <input
          id="ticker-speed"
          type="range"
          min={10}
          max={200}
          step={1}
          value={tickerSpeed}
          onChange={e => setTickerSpeed(Number(e.target.value))}
          className="w-32 accent-primary"
        />
        <span className="text-xs w-7 text-center">{tickerSpeed}</span>
      </div>
    </div>
  );
};
