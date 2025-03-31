import React, { useState } from 'react';
import { format } from 'date-fns';
import { ArrowDownIcon, ArrowUpIcon, ClipboardCopy, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface InventoryMovementProps {
  id: number;
  type: 'in' | 'out';
  category: string;
  item_name: string;
  quantity: number;
  date: Date;
  note: string;
}

const MovementCard: React.FC<{ movement: InventoryMovementProps }> = ({ movement }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    const text = `${movement.type === 'in' ? 'وارد' : 'صادر'}: ${movement.item_name} - الكمية: ${movement.quantity} - التاريخ: ${format(movement.date, 'yyyy/MM/dd')} - ${movement.note}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const getCategoryColor = () => {
    switch(movement.category) {
      case 'raw_materials': 
        return {
          light: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
          icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
        };
      case 'semi_finished': 
        return {
          light: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
          icon: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
        };
      case 'packaging': 
        return {
          light: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
          icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300'
        };
      case 'finished_products': 
        return {
          light: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
          icon: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
        };
      default: 
        return {
          light: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/30 dark:text-gray-300 dark:border-gray-700',
          icon: 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300'
        };
    }
  };
  
  const getCategoryName = (category: string) => {
    switch(category) {
      case 'raw_materials': return 'المواد الأولية';
      case 'semi_finished': return 'المنتجات النصف مصنعة';
      case 'packaging': return 'مستلزمات التعبئة';
      case 'finished_products': return 'المنتجات النهائية';
      default: return category;
    }
  };
  
  const colorClass = getCategoryColor();
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        "border rounded-lg transition-all duration-200 hover:shadow-sm",
        isOpen ? "shadow-md" : "",
        movement.type === 'in' ? "border-l-4 border-l-green-500" : "border-l-4 border-l-amber-500"
      )}
    >
      <div className="flex items-start p-4">
        <div className={`shrink-0 p-2 rounded-full mr-4 ${
          movement.type === 'in' 
            ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300' 
            : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300'
        }`}>
          {movement.type === 'in' ? (
            <ArrowDownIcon className="h-6 w-6" />
          ) : (
            <ArrowUpIcon className="h-6 w-6" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-base">
                  {movement.item_name}
                </h3>
                <Badge 
                  variant="outline" 
                  className={colorClass.light}
                >
                  {getCategoryName(movement.category)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{movement.note}</p>
            </div>
            <div className="text-left flex flex-col items-end">
              <span className={`font-medium text-lg ${
                movement.type === 'in' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                {movement.type === 'in' ? '+' : '-'}{movement.quantity}
              </span>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span>{format(movement.date, 'yyyy/MM/dd')}</span>
                <span>·</span>
                <span dir="ltr">{format(movement.date, 'hh:mm a')}</span>
              </p>
            </div>
          </div>
          
          <div className="mt-3 flex justify-between items-center">
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1 hover:bg-muted/60 -ml-2 h-8"
              >
                {isOpen ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    <span className="text-xs">إخفاء التفاصيل</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    <span className="text-xs">عرض التفاصيل</span>
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            
            <TooltipProvider delayDuration={300}>
              <Tooltip open={copied} onOpenChange={setCopied}>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7" 
                    onClick={handleCopy}
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? 'تم النسخ!' : 'نسخ المعلومات'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      <CollapsibleContent>
        <div className="border-t px-4 py-3 bg-muted/25">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="grid grid-cols-2">
              <dt className="text-muted-foreground">المعرف:</dt>
              <dd dir="ltr" className="text-left">{movement.id}</dd>
            </div>
            
            <div className="grid grid-cols-2">
              <dt className="text-muted-foreground">نوع الحركة:</dt>
              <dd className={movement.type === 'in' ? 'text-green-600' : 'text-amber-600'}>
                {movement.type === 'in' ? 'وارد' : 'صادر'}
              </dd>
            </div>
            
            <div className="grid grid-cols-2">
              <dt className="text-muted-foreground">الصنف:</dt>
              <dd>{movement.item_name}</dd>
            </div>
            
            <div className="grid grid-cols-2">
              <dt className="text-muted-foreground">التصنيف:</dt>
              <dd>{getCategoryName(movement.category)}</dd>
            </div>
            
            <div className="grid grid-cols-2">
              <dt className="text-muted-foreground">الكمية:</dt>
              <dd className="font-medium">{movement.quantity}</dd>
            </div>
            
            <div className="grid grid-cols-2">
              <dt className="text-muted-foreground">التاريخ:</dt>
              <dd dir="ltr" className="text-left">
                {format(movement.date, 'yyyy/MM/dd hh:mm a')}
              </dd>
            </div>
          </dl>
          
          <div className="mt-3">
            <h4 className="text-sm font-medium mb-1">ملاحظات:</h4>
            <p className="text-sm bg-background rounded p-2 border">{movement.note}</p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default MovementCard;
