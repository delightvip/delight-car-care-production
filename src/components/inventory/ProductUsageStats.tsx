
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface ProductUsageStatsProps {
  usageStats: any[];
}

const ProductUsageStats: React.FC<ProductUsageStatsProps> = ({ usageStats }) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Usage Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        {usageStats && usageStats.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Quantity Used</TableHead>
                <TableHead>Last Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageStats.map((stat, index) => (
                <TableRow key={index}>
                  <TableCell>{stat.description}</TableCell>
                  <TableCell>{stat.quantity}</TableCell>
                  <TableCell>{stat.lastUsed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-4 text-muted-foreground">No usage statistics available</div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductUsageStats;
