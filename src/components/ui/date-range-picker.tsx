
import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import { ar } from "date-fns/locale";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  className?: string;
  initialDateFrom?: Date;
  initialDateTo?: Date;
  onUpdate?: (values: { range: DateRange }) => void;
  align?: "start" | "center" | "end";
}

export function DateRangePicker({
  className,
  initialDateFrom,
  initialDateTo,
  onUpdate,
  align = "end",
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: initialDateFrom || addDays(new Date(), -30),
    to: initialDateTo || new Date(),
  });

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    onUpdate?.({ range: range || { from: undefined, to: undefined } });
  };

  const handlePresetChange = (preset: string) => {
    const today = new Date();
    let range: DateRange;

    switch (preset) {
      case "last7":
        range = {
          from: addDays(today, -7),
          to: today,
        };
        break;
      case "last30":
        range = {
          from: addDays(today, -30),
          to: today,
        };
        break;
      case "last90":
        range = {
          from: addDays(today, -90),
          to: today,
        };
        break;
      case "thisYear":
        const currentYear = today.getFullYear();
        range = {
          from: new Date(currentYear, 0, 1),
          to: today,
        };
        break;
      case "lastYear":
        const lastYear = today.getFullYear() - 1;
        range = {
          from: new Date(lastYear, 0, 1),
          to: new Date(lastYear, 11, 31),
        };
        break;
      default:
        range = {
          from: addDays(today, -30),
          to: today,
        };
    }

    setDate(range);
    onUpdate?.({ range });
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="ml-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd/MM/yyyy", { locale: ar })} -{" "}
                  {format(date.to, "dd/MM/yyyy", { locale: ar })}
                </>
              ) : (
                format(date.from, "dd/MM/yyyy", { locale: ar })
              )
            ) : (
              <span>اختر فترة زمنية</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <div className="p-3 space-y-3">
            <Select
              onValueChange={handlePresetChange}
              defaultValue="last30"
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر نطاقاً زمنياً" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="last7">آخر 7 أيام</SelectItem>
                <SelectItem value="last30">آخر 30 يوم</SelectItem>
                <SelectItem value="last90">آخر 90 يوم</SelectItem>
                <SelectItem value="thisYear">هذه السنة</SelectItem>
                <SelectItem value="lastYear">السنة الماضية</SelectItem>
              </SelectContent>
            </Select>
            <div className="border-t pt-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={2}
                locale={ar}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
