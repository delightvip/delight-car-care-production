import * as React from 'react';
import { useRef, useState, useEffect } from 'react';
import { DateRange, RangeKeyDict } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { arEG } from 'date-fns/locale';
import { Button } from "./button";

interface DateRangePickerProps {
  value: { startDate: Date | null; endDate: Date | null };
  onChange: (range: { startDate: Date | null; endDate: Date | null }) => void;
  onReset?: () => void;
  dir?: 'rtl' | 'ltr';
  showFilterButton?: boolean;
}

const PRESETS = [
  { label: 'اليوم', getRange: () => {
      const today = new Date();
      return { startDate: today, endDate: today };
    }
  },
  { label: 'أمس', getRange: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return { startDate: yesterday, endDate: yesterday };
    }
  },
  { label: 'هذا الأسبوع', getRange: () => {
      const today = new Date();
      const day = today.getDay() === 0 ? 7 : today.getDay();
      const start = new Date(today);
      start.setDate(today.getDate() - (day - 1));
      return { startDate: start, endDate: today };
    }
  },
  { label: 'الأسبوع الماضي', getRange: () => {
      const today = new Date();
      const day = today.getDay() === 0 ? 7 : today.getDay();
      const end = new Date(today);
      end.setDate(today.getDate() - day);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      return { startDate: start, endDate: end };
    }
  },
  { label: 'هذا الشهر', getRange: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: start, endDate: today };
    }
  },
  { label: 'الشهر الماضي', getRange: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: start, endDate: end };
    }
  },
  { label: 'هذا العام', getRange: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), 0, 1);
      return { startDate: start, endDate: today };
    }
  },
  { label: 'مخصص', getRange: null, icon: true }
];

function useThemeMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => {
      if (typeof window !== 'undefined') {
        setIsDark(document.body.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    };
    check();
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, []);
  return isDark;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange, onReset, dir = 'rtl', showFilterButton = false }) => {
  const [customOpen, setCustomOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const isDark = useThemeMode();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setCustomOpen(false);
      }
    }
    if (customOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [customOpen]);

  const selectionRange = {
    startDate: value.startDate || new Date(),
    endDate: value.endDate || new Date(),
    key: 'selection',
  };

  const handleSelect = (ranges: RangeKeyDict) => {
    const range = ranges.selection;
    onChange({ startDate: range.startDate, endDate: range.endDate });
    setCustomOpen(false);
    setSelectedPreset('مخصص');
  };

  const getLabel = () => {
    if (value.startDate && value.endDate) {
      return `من ${value.startDate.toLocaleDateString('ar-EG')} إلى ${value.endDate.toLocaleDateString('ar-EG')}`;
    } else if (value.startDate) {
      return `من ${value.startDate.toLocaleDateString('ar-EG')}`;
    } else if (value.endDate) {
      return `إلى ${value.endDate.toLocaleDateString('ar-EG')}`;
    } else {
      return 'اختر الفترة الزمنية';
    }
  };

  const handlePreset = (preset: typeof PRESETS[0]) => {
    setSelectedPreset(preset.label);
    if (preset.getRange) {
      onChange(preset.getRange());
      setCustomOpen(false);
    } else {
      setCustomOpen(true);
    }
  };

  const colors = {
    bg: isDark ? '#18181b' : '#fff',
    border: isDark ? '#333' : '#ddd',
    text: isDark ? '#e5e7eb' : '#222',
    accent: 'linear-gradient(90deg, #6366f1 0%, #2563eb 100%)',
    accentSolid: '#2563eb',
    accentText: '#fff',
    hover: isDark ? '#232336' : '#f3f4f6',
    selected: isDark ? 'linear-gradient(90deg, #2563eb 0%, #6366f1 100%)' : 'linear-gradient(90deg, #6366f1 0%, #2563eb 100%)',
    selectedText: '#fff',
    label: isDark ? '#60a5fa' : '#2563eb',
    popoverBg: isDark ? '#232336' : '#fff',
    popoverShadow: isDark ? '0 4px 24px rgba(37,99,235,0.13)' : '0 4px 24px rgba(0,0,0,0.13)',
    reset: isDark ? '#444' : '#eee',
    resetText: isDark ? '#eee' : '#222',
  };

  return (
    <div dir={dir} ref={wrapperRef} style={{
      width: '100%',
      background: 'none',
      border: 'none',
      padding: '12px 0',
      margin: '16px 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      fontFamily: 'inherit',
      position: 'relative',
    }}>
      <span style={{ fontSize: 13, color: colors.label, fontWeight: 500, margin: dir === 'rtl' ? '0 8px 8px 0' : '0 0 8px 8px', alignSelf: dir === 'rtl' ? 'flex-end' : 'flex-start', opacity: 0.85 }}>
        {getLabel()}
      </span>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        flexDirection: dir === 'rtl' ? 'row-reverse' : 'row',
        gap: 10,
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        marginBottom: 2,
      }}>
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant={selectedPreset === preset.label ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => handlePreset(preset)}
            className={selectedPreset === preset.label ? 'font-bold shadow-sm ring-1 ring-blue-200 bg-blue-100 text-blue-900' : ''}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: preset.icon ? 3 : 6,
              minWidth: 48,
              minHeight: 22,
              fontSize: 11,
              padding: '0 6px',
              fontFamily: 'Cairo, Inter, Segoe UI, Arial, sans-serif',
              letterSpacing: '0.01em',
              fontWeight: 600
            }}
          >
            {preset.icon && (
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" style={{ display: 'inline', verticalAlign: 'middle', color: 'currentColor' }}>
                <rect x="3.5" y="4.5" width="13" height="11" rx="3" stroke="currentColor" strokeWidth="1" fill="none" />
                <rect x="6" y="2.5" width="1" height="1.8" rx="0.5" fill="currentColor" />
                <rect x="12.5" y="2.5" width="1" height="1.8" rx="0.5" fill="currentColor" />
                <rect x="3.5" y="7" width="13" height="0.8" rx="0.4" fill="currentColor" opacity=".13" />
              </svg>
            )}
            {preset.label}
          </Button>
        ))}
        {showFilterButton && (
          <Button type="button" variant="default" size="sm" onClick={() => onChange(selectionRange)} style={{ minWidth: 80, minHeight: 32 }}>تصفية</Button>
        )}
        {onReset && (
          <Button type="button" variant="outline" size="sm" onClick={onReset} style={{ minWidth: 80, minHeight: 32 }}>إعادة تعيين</Button>
        )}
      </div>
      {customOpen && (
        <div style={{
          position: 'absolute',
          top: 54,
          [dir === 'rtl' ? 'right' : 'left']: 0,
          zIndex: 100,
          background: colors.popoverBg,
          boxShadow: colors.popoverShadow,
          borderRadius: 12,
          padding: 6,
        }}>
          <DateRange
            ranges={[selectionRange]}
            onChange={handleSelect}
            showSelectionPreview={true}
            moveRangeOnFirstSelection={false}
            months={1}
            direction="horizontal"
            rangeColors={[colors.accentSolid]}
            locale={arEG}
          />
        </div>
      )}
    </div>
  );
};
