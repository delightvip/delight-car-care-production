
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, RotateCw, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import InventoryMovementSyncService from '@/services/inventory/InventoryMovementSyncService';

const InventoryMovementSync: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'partial' | 'error'>('idle');

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setSyncStatus('syncing');
      toast.loading("جارِ مزامنة حركات المخزون...");
      
      const syncService = InventoryMovementSyncService.getInstance();
      const success = await syncService.syncAllMovements();
      
      setIsSyncing(false);
      setLastSyncTime(new Date());
      setSyncStatus(success ? 'success' : 'partial');
      
      toast.dismiss();
      if (success) {
        toast.success("تمت مزامنة حركات المخزون بنجاح");
      } else {
        toast.warning("تمت المزامنة بشكل جزئي. بعض العمليات لم تكتمل.");
      }
    } catch (error) {
      console.error("خطأ في عملية المزامنة:", error);
      setIsSyncing(false);
      setSyncStatus('error');
      toast.dismiss();
      toast.error("حدث خطأ أثناء مزامنة حركات المخزون");
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RotateCw className="h-5 w-5 animate-spin text-blue-500" />;
      case 'success':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return "جارِ المزامنة...";
      case 'success':
        return "تمت المزامنة بنجاح";
      case 'partial':
        return "تمت المزامنة بشكل جزئي";
      case 'error':
        return "فشلت عملية المزامنة";
      default:
        return lastSyncTime ? `آخر مزامنة: ${formatLastSyncTime(lastSyncTime)}` : "لم تتم المزامنة بعد";
    }
  };

  const formatLastSyncTime = (date: Date) => {
    return new Intl.DateTimeFormat('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">مزامنة حركات المخزون</CardTitle>
        <CardDescription>
          تحديث سجل حركات المخزون من العمليات المختلفة (الإنتاج، التعبئة، المبيعات، المشتريات)
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center py-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          {getStatusIcon()}
          <span className={`text-sm ${syncStatus === 'error' ? 'text-red-500' : 'text-muted-foreground'}`}>
            {getStatusText()}
          </span>
        </div>
        {syncStatus === 'error' && (
          <p className="text-sm text-red-500 mt-2">
            حدث خطأ أثناء المزامنة. يرجى المحاولة مرة أخرى أو مراجعة سجلات النظام.
          </p>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <Button 
          className="w-full" 
          onClick={handleSync} 
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <RotateCw className="mr-2 h-4 w-4 animate-spin" />
              جارِ المزامنة...
            </>
          ) : (
            <>
              <RotateCw className="mr-2 h-4 w-4" />
              مزامنة الحركات
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InventoryMovementSync;
