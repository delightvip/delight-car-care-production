
import React, { useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X } from 'lucide-react';
import { format, isAfter, isBefore } from 'date-fns';
import { ar } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

export interface InventoryFilterOptions {
  movementType: string;
  itemType: string;
  dateRange: DateRange;
  searchTerm: string;
}

interface InventoryMovementFiltersProps {
  filters: InventoryFilterOptions;
  onFilterChange: (filters: InventoryFilterOptions) => void;
  onResetFilters: () => void;
}

const InventoryMovementFilters: React.FC<InventoryMovementFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const handleMovementTypeChange = (value: string) => {
    onFilterChange({ ...filters, movementType: value });
  };

  const handleItemTypeChange = (value: string) => {
    onFilterChange({ ...filters, itemType: value });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range) {
      onFilterChange({ ...filters, dateRange: range });
      if (range.from && range.to) {
        setIsCalendarOpen(false);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, searchTerm: e.target.value });
  };

  const getItemTypeName = (type: string) => {
    switch (type) {
      case 'raw': return 'مواد خام';
      case 'semi': return 'نصف مصنعة';
      case 'packaging': return 'مواد تعبئة';
      case 'finished': return 'منتجات نهائية';
      default: return 'الكل';
    }
  };

  const getMovementTypeName = (type: string) => {
    switch (type) {
      case 'in': return 'وارد';
      case 'out': return 'صادر';
      case 'adjustment': return 'تعديل';
      default: return 'الكل';
    }
  };

  const hasActiveFilters = () => {
    return (
      filters.movementType !== 'all' ||
      filters.itemType !== 'all' ||
      filters.dateRange.from ||
      filters.dateRange.to ||
      filters.searchTerm.trim() !== ''
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex gap-2 flex-wrap md:flex-nowrap">
            <div className="w-full md:w-auto">
              <Input
                placeholder="بحث في الأصناف والأسباب..."
                value={filters.searchTerm}
                onChange={handleSearchChange}
                className="w-full md:w-60"
              />
            </div>
            
            <Select value={filters.movementType} onValueChange={handleMovementTypeChange}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="نوع الحركة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحركات</SelectItem>
                <SelectItem value="in">وارد</SelectItem>
                <SelectItem value="out">صادر</SelectItem>
                <SelectItem value="adjustment">تعديل</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.itemType} onValueChange={handleItemTypeChange}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="نوع الصنف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأصناف</SelectItem>
                <SelectItem value="raw">مواد خام</SelectItem>
                <SelectItem value="semi">نصف مصنعة</SelectItem>
                <SelectItem value="packaging">مواد تعبئة</SelectItem>
                <SelectItem value="finished">منتجات نهائية</SelectItem>
              </SelectContent>
            </Select>
            
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full md:w-auto justify-start text-left font-normal"
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {filters.dateRange.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, "yyyy/MM/dd")} - {format(filters.dateRange.to, "yyyy/MM/dd")}
                      </>
                    ) : (
                      format(filters.dateRange.from, "yyyy/MM/dd")
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
                  defaultMonth={filters.dateRange.from}
                  selected={filters.dateRange}
                  onSelect={handleDateRangeChange}
                  locale={ar}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {hasActiveFilters() && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onResetFilters}
              className="mt-2 md:mt-0"
            >
              <X className="h-4 w-4 mr-1" />
              مسح التصفية
            </Button>
          )}
        </div>
      </div>
      
      {hasActiveFilters() && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filters.itemType !== 'all' && (
            <Badge variant="outline" className="bg-muted">
              نوع الصنف: {getItemTypeName(filters.itemType)}
            </Badge>
          )}
          
          {filters.movementType !== 'all' && (
            <Badge variant="outline" className="bg-muted">
              نوع الحركة: {getMovementTypeName(filters.movementType)}
            </Badge>
          )}
          
          {filters.dateRange.from && (
            <Badge variant="outline" className="bg-muted">
              من: {format(filters.dateRange.from, 'yyyy/MM/dd')}
            </Badge>
          )}
          
          {filters.dateRange.to && (
            <Badge variant="outline" className="bg-muted">
              إلى: {format(filters.dateRange.to, 'yyyy/MM/dd')}
            </Badge>
          )}
          
          {filters.searchTerm && (
            <Badge variant="outline" className="bg-muted">
              بحث: {filters.searchTerm}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryMovementFilters;
