
import React from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

export interface MovementHistoryTableProps {
  movements: any[];
}

const MovementHistoryTable: React.FC<MovementHistoryTableProps> = ({ movements }) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Movement History</CardTitle>
      </CardHeader>
      <CardContent>
        {movements.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Balance After</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>
                    {movement.created_at ? format(new Date(movement.created_at), 'PPP') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={movement.movement_type.includes('in') ? 'success' : 'destructive'}
                    >
                      {movement.movement_type.includes('in') ? (
                        <ArrowDownIcon className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowUpIcon className="h-3 w-3 mr-1" />
                      )}
                      {movement.movement_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{Math.abs(movement.quantity)}</TableCell>
                  <TableCell>{movement.balance_after}</TableCell>
                  <TableCell>{movement.reason || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-4 text-muted-foreground">No movement history available</div>
        )}
      </CardContent>
    </Card>
  );
};

export default MovementHistoryTable;
