import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, ChevronDown, History } from 'lucide-react';
import { format, subDays, subMonths, subYears, isAfter } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface AdvancedTimeFilterProps {
  onChange: (range: { from: Date; to: Date; preset?: string }) => void;
  defaultValue?: { from: Date; to: Date; preset?: string };
}

const AdvancedTimeFilter: React.FC<AdvancedTimeFilterProps> = ({
  onChange,
  defaultValue
}) => {
  const [date, setDate] = useState<{
    from: Date;
    to: Date;
    preset?: string;
  }>({
    from: defaultValue?.from || subMonths(new Date(), 1),
    to: defaultValue?.to || new Date(),
    preset: defaultValue?.preset || 'month'
  });
  
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    onChange(date);
  }, [date, onChange]);
  
  const applyPreset = (preset: string) => {
    const now = new Date();
    let fromDate: Date;
    
    switch (preset) {
      case 'week':
        fromDate = subDays(now, 7);
        break;
      case 'month':
        fromDate = subMonths(now, 1);
        break;
      case 'quarter':
        fromDate = subMonths(now, 3);
        break;
      case 'year':
        fromDate = subYears(now, 1);
        break;
      default:
        fromDate = subMonths(now, 1);
        break;
    }
    
    setDate({
      from: fromDate,
      to: now,
      preset
    });
  };
  
  return (
    <div className="flex gap-2 items-center">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="justify-between text-right font-normal gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>
              {date.from ? (
                date.to ? (
                  <>
                    {format(date.from, 'dd/MM/yyyy', { locale: ar })} -{' '}
                    {format(date.to, 'dd/MM/yyyy', { locale: ar })}
                  </>
                ) : (
                  format(date.from, 'dd/MM/yyyy', { locale: ar })
                )
              ) : (
                'اختر الفترة الزمنية'
              )}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Tabs defaultValue="presets">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="presets">فترات جاهزة</TabsTrigger>
              <TabsTrigger value="range">تحديد فترة</TabsTrigger>
            </TabsList>
            <TabsContent value="presets" className="p-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  اختر فترة زمنية جاهزة
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={date.preset === 'week' ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => {
                      applyPreset('week');
                      setIsOpen(false);
                    }}
                  >
                    <History className="ml-2 h-4 w-4" />
                    أسبوع
                  </Button>
                  <Button
                    variant={date.preset === 'month' ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => {
                      applyPreset('month');
                      setIsOpen(false);
                    }}
                  >
                    <History className="ml-2 h-4 w-4" />
                    شهر
                  </Button>
                  <Button
                    variant={date.preset === 'quarter' ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => {
                      applyPreset('quarter');
                      setIsOpen(false);
                    }}
                  >
                    <History className="ml-2 h-4 w-4" />
                    ربع سنة
                  </Button>
                  <Button
                    variant={date.preset === 'year' ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => {
                      applyPreset('year');
                      setIsOpen(false);
                    }}
                  >
                    <History className="ml-2 h-4 w-4" />
                    سنة
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="range" className="p-4 pb-0">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  اختر تاريخ البداية والنهاية
                </p>
                <Calendar
                  mode="range"
                  selected={{ from: date.from, to: date.to }}
                  onSelect={(selected) => {
                    if (selected?.from && selected?.to) {
                      setDate({
                        from: selected.from,
                        to: selected.to,
                        preset: undefined // إزالة الإعداد المسبق عند اختيار نطاق مخصص
                      });
                    }
                  }}
                  numberOfMonths={2}
                  locale={ar}
                />
                <div className="flex justify-end p-2">
                  <Button
                    onClick={() => setIsOpen(false)}
                    disabled={!date.from || !date.to || isAfter(date.from, date.to)}
                  >
                    تطبيق
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AdvancedTimeFilter;
