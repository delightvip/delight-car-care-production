
import React from 'react';
import { Badge } from '@/components/ui/badge';

type OrderDetailItemProps = {
  label: string;
  value: React.ReactNode;
  badge?: boolean;
  badgeColor?: string;
};

const OrderDetailItem = ({ label, value, badge = false, badgeColor }: OrderDetailItemProps) => {
  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground mb-1">{label}</h4>
      {badge ? (
        <Badge className={badgeColor}>{value}</Badge>
      ) : (
        <p className="font-medium">{value}</p>
      )}
    </div>
  );
};

export default OrderDetailItem;
