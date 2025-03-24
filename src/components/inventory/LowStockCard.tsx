
import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Beaker, Box, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export interface LowStockItemProps {
  id: number;
  code: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  category: string;
  categoryName: string;
  route: string;
}

interface LowStockCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  loading?: boolean;
  colorClass?: string;
}

const LowStockCard: React.FC<LowStockCardProps> = ({ 
  title, 
  count, 
  icon, 
  loading = false,
  colorClass = "bg-gray-100 text-gray-700" 
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <h3 className="text-3xl font-bold mt-1">{count}</h3>
        </div>
        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${colorClass}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
};

export default LowStockCard;
