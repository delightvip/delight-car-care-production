
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FileDown } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { InventoryMovement } from '@/types/inventoryTypes';
import { InventoryMovementService } from '@/services/InventoryMovementService';

export interface ProductMovementHistoryProps {
  itemId: string;
  itemType: string;
}

const ProductMovementHistory: React.FC<ProductMovementHistoryProps> = ({ itemId, itemType }) => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch movements on component mount
  React.useEffect(() => {
    const fetchMovements = async () => {
      try {
        setLoading(true);
        const movementService = InventoryMovementService.getInstance();
        const movementsData = await movementService.getMovementsForItem(itemId, itemType);
        setMovements(movementsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching movements:', err);
        setError('فشل في تحميل سجل حركة المخزون');
      } finally {
        setLoading(false);
      }
    };

    fetchMovements();
  }, [itemId, itemType]);

  // Format movement type for display
  const formatMovementType = (type: string): string => {
    switch (type) {
      case 'in': return 'وارد';
      case 'out': return 'صادر';
      case 'adjustment': return 'تسوية';
      default: return type;
    }
  };

  // Format date in Arabic format
  const formatDateToArabic = (date: string): string => {
    try {
      const dateObj = new Date(date);
      return `${dateObj.getFullYear()}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}`;
    } catch (e) {
      return date;
    }
  };

  // Export data to Excel
  const handleExport = async () => {
    try {
      // Dynamic import for xlsx
      const XLSX = await import('xlsx');
      
      // Create worksheet data
      const wsData = movements.map(m => ({
        'التاريخ': formatDateToArabic(m.created_at),
        'نوع الحركة': formatMovementType(m.movement_type),
        'الكمية': Math.abs(m.quantity),
        'الرصيد بعد': m.balance_after,
        'السبب': m.reason || '',
        'المستخدم': m.user_name || ''
      }));
      
      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'حركة المخزون');
      
      // Save file
      XLSX.writeFile(wb, `حركة-المخزون-${itemId}.xlsx`);
      
      toast.success('تم تصدير البيانات بنجاح');
    } catch (err) {
      console.error('Error exporting data:', err);
      toast.error('فشل في تصدير البيانات');
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">سجل حركة المخزون</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || movements.length === 0}>
          <FileDown className="mr-2 h-4 w-4" />
          تصدير
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-destructive">{error}</div>
        ) : movements.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">لا توجد حركات مخزون مسجلة لهذا الصنف</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-2 text-right">التاريخ</th>
                  <th className="py-3 px-2 text-right">نوع الحركة</th>
                  <th className="py-3 px-2 text-right">الكمية</th>
                  <th className="py-3 px-2 text-right">الرصيد بعد</th>
                  <th className="py-3 px-2 text-right">السبب</th>
                  <th className="py-3 px-2 text-right">المستخدم</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">{formatDate(movement.created_at)}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        movement.movement_type === 'in' 
                          ? 'bg-green-100 text-green-800' 
                          : movement.movement_type === 'out' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {formatMovementType(movement.movement_type)}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-medium">
                      <span className={movement.movement_type === 'in' ? 'text-green-600' : movement.movement_type === 'out' ? 'text-red-600' : ''}>
                        {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : ''}
                        {Math.abs(movement.quantity)}
                      </span>
                    </td>
                    <td className="py-3 px-2">{movement.balance_after}</td>
                    <td className="py-3 px-2">{movement.reason || '-'}</td>
                    <td className="py-3 px-2">{movement.user_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductMovementHistory;
