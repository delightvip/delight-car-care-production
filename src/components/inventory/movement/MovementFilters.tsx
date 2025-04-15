
import React, { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MovementFiltersProps {
  itemType: string;
  setItemType: (value: string) => void;
  movementType: string;
  setMovementType: (value: string) => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onResetFilters: () => void;
}

const MovementFilters: React.FC<MovementFiltersProps> = ({
  itemType,
  setItemType,
  movementType,
  setMovementType,
  dateRange,
  setDateRange,
  searchTerm,
  setSearchTerm,
  onResetFilters
}) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-sm">نوع الصنف</label>
          <Select value={itemType} onValueChange={setItemType}>
            <SelectTrigger>
              <SelectValue placeholder="اختر نوع الصنف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="raw">مواد خام</SelectItem>
              <SelectItem value="semi">نصف مصنعة</SelectItem>
              <SelectItem value="packaging">مواد تعبئة</SelectItem>
              <SelectItem value="finished">منتجات نهائية</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <label className="text-sm">نوع الحركة</label>
          <Select value={movementType} onValueChange={setMovementType}>
            <SelectTrigger>
              <SelectValue placeholder="اختر نوع الحركة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="in">وارد</SelectItem>
              <SelectItem value="out">صادر</SelectItem>
              <SelectItem value="adjustment">تعديل</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <label className="text-sm">الفترة الزمنية</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-right font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4 ml-2" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "yyyy/MM/dd", { locale: ar })} -{" "}
                      {format(dateRange.to, "yyyy/MM/dd", { locale: ar })}
                    </>
                  ) : (
                    format(dateRange.from, "yyyy/MM/dd", { locale: ar })
                  )
                ) : (
                  <span>اختر الفترة الزمنية</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ar}
                dir="rtl"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative w-full">
          <Input
            placeholder="بحث حسب السبب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        
        <Button 
          variant="ghost" 
          className="whitespace-nowrap" 
          onClick={onResetFilters}
        >
          <X className="h-4 w-4 ml-2" />
          إعادة ضبط
        </Button>
      </div>
    </div>
  );
};

export default MovementFilters;
