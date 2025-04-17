
import React from "react";
import "../ui/financial-ticker.css";
import "../ui/news-ticker-fonts.css";

interface TickerItem {
  label: string;
  value: string | number;
  isMonetary?: boolean;
  isPercentage?: boolean;
  status?: "positive" | "negative" | "neutral";
}

interface NewsTicker {
  items: TickerItem[];
  speed?: number;
  className?: string;
}

export function FinancialTicker({ items, className = "" }: NewsTicker) {
  const formatValue = (value: string | number, isMonetary?: boolean, isPercentage?: boolean) => {
    if (isMonetary) {
      return typeof value === "number" 
        ? value.toLocaleString('ar-EG') + " ج.م" 
        : value;
    }
    
    if (isPercentage) {
      return typeof value === "number" 
        ? value.toLocaleString('ar-EG') + "%" 
        : value;
    }
    
    return typeof value === "number" ? value.toLocaleString('ar-EG') : value;
  };

  return (
    <div className={`financial-ticker-container ${className}`}>
      <div className="financial-ticker financial-font">
        {items.map((item, index) => (
          <div key={index} className="financial-ticker-item">
            <span className="financial-ticker-label">{item.label}</span>
            <span 
              className={`financial-ticker-value ${item.status || ''}`}
            >
              {formatValue(item.value, item.isMonetary, item.isPercentage)}
            </span>
          </div>
        ))}
        {items.map((item, index) => (
          <div key={`repeat-${index}`} className="financial-ticker-item">
            <span className="financial-ticker-label">{item.label}</span>
            <span 
              className={`financial-ticker-value ${item.status || ''}`}
            >
              {formatValue(item.value, item.isMonetary, item.isPercentage)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
