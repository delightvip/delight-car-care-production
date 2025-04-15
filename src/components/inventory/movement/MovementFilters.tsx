
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CalendarIcon, FilterX, Search } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface MovementFiltersProps {
  itemType: string;
  setItemType: (value: string) => void;
  movementType: string;
  setMovementType: (value: string) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
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
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2 flex-wrap md:flex-nowrap">
        <div className="relative w-full flex-1">
          <Input
            placeholder="بحث في السبب أو الملاحظات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9"
          />
          <Search className="absolute top-1/2 right-3 transform -translate-y-1/2 h-4 w-4 opacity-50" />
        </div>
        
        <Select value={itemType} onValueChange={setItemType}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="نوع الصنف" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأصناف</SelectItem>
            <SelectItem value="raw">المواد الخام</SelectItem>
            <SelectItem value="semi">المنتجات النصف مصنعة</SelectItem>
            <SelectItem value="packaging">مواد التعبئة</SelectItem>
            <SelectItem value="finished">المنتجات النهائية</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={movementType} onValueChange={setMovementType}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="نوع الحركة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحركات</SelectItem>
            <SelectItem value="in">وارد</SelectItem>
            <SelectItem value="out">صادر</SelectItem>
            <SelectItem value="adjustment">تعديل</SelectItem>
          </SelectContent>
        </Select>
        
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full md:w-auto justify-start text-left font-normal"
            >
              <CalendarIcon className="ml-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "yyyy/MM/dd")} - {format(dateRange.to, "yyyy/MM/dd")}
                  </>
                ) : (
                  format(dateRange.from, "yyyy/MM/dd")
                )
              ) : (
                "اختر الفترة"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange}
              onSelect={range => {
                setDateRange(range || { from: undefined, to: undefined });
                if (range?.from && range?.to) {
                  setIsCalendarOpen(false);
                }
              }}
              locale={ar}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      {(searchTerm || itemType !== 'all' || movementType !== 'all' || dateRange.from || dateRange.to) && (
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onResetFilters}
            className="flex items-center gap-1"
          >
            <FilterX className="h-4 w-4" />
            <span>مسح التصفية</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default MovementFilters;
