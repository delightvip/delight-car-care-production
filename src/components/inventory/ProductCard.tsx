
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  id: string;
  name: string;
  code: string;
  quantity: number;
  unit: string;
  minStock: number;
  type: 'raw-materials' | 'packaging' | 'semi-finished' | 'finished-products';
  description?: string;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  code,
  quantity,
  unit,
  minStock,
  type,
  description,
  className
}) => {
  const isLowStock = quantity <= minStock;
  
  return (
    <Card className={cn("product-card hover-scale", className)}>
      <CardHeader className="p-4 pb-0 flex flex-row justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="product-title">{name}</h3>
            {isLowStock && (
              <AlertTriangle className="h-4 w-4 text-warning" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            الكود: {code}
          </p>
        </div>
        <div className="shrink-0">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-muted-foreground">المخزون الحالي:</span>
          <Badge variant={isLowStock ? "destructive" : "outline"} className="text-sm">
            {quantity} {unit}
          </Badge>
        </div>
        
        <div className="relative pt-1 mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              الحد الأدنى: {minStock} {unit}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round((quantity / Math.max(minStock, 1)) * 100)}%
            </span>
          </div>
          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
            <div 
              style={{ 
                width: `${Math.min(100, (quantity / Math.max(minStock * 2, 1)) * 100)}%` 
              }}
              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                quantity <= minStock 
                  ? 'bg-destructive' 
                  : quantity <= minStock * 1.5 
                  ? 'bg-warning' 
                  : 'bg-success'
              }`}
            ></div>
          </div>
        </div>
        
        {description && (
          <p className="product-desc mt-3">{description}</p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild variant="ghost" className="w-full gap-2 justify-between">
          <Link to={`/inventory/${type}/${id}`}>
            <span>عرض التفاصيل</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
