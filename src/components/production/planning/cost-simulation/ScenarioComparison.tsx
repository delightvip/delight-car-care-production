import React from 'react';
import { CostScenario } from './types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

interface ScenarioComparisonProps {
  scenarios: CostScenario[];
  selectedIds: string[];
}

export const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({ scenarios, selectedIds }) => {
  const selectedScenarios = scenarios.filter(s => selectedIds.includes(s.id));

  if (selectedScenarios.length < 2) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>مقارنة السيناريوهات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">يرجى اختيار سيناريوهين أو أكثر للمقارنة.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>مقارنة السيناريوهات المختارة</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>السيناريو</TableHead>
              <TableHead>الإنتاج</TableHead>
              <TableHead>التعبئة</TableHead>
              <TableHead>العمليات</TableHead>
              <TableHead>الإجمالي</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedScenarios.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.resultingChanges.production}%</TableCell>
                <TableCell>{s.resultingChanges.packaging}%</TableCell>
                <TableCell>{s.resultingChanges.operations}%</TableCell>
                <TableCell>{s.resultingChanges.total}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
