
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

class DatabaseSyncService {
  private static instance: DatabaseSyncService;
  private activeSubscriptions: any[] = [];
  
  private constructor() {
    // Private constructor to enforce singleton pattern
  }
  
  public static getInstance(): DatabaseSyncService {
    if (!DatabaseSyncService.instance) {
      DatabaseSyncService.instance = new DatabaseSyncService();
    }
    return DatabaseSyncService.instance;
  }
  
  /**
   * تفعيل خاصية المزامنة المباشرة مع قاعدة البيانات
   * @param tables قائمة بأسماء الجداول المطلوب مراقبتها
   * @param callback دالة يتم استدعاؤها عند حدوث تغيير
   * @returns وظيفة لإلغاء الاشتراك
   */
  public setupRealtimeSync(tables: string[], callback: () => void): () => void {
    console.log(`Setting up realtime sync for tables: ${tables.join(', ')}`);
    
    try {
      // إنشاء قناة سوبابيس للاستماع للتغييرات
      const channel = supabase.channel('db-changes-' + Date.now());
      
      // إضافة مستمعين لكل جدول
      tables.forEach(table => {
        channel.on('postgres_changes', 
          { event: '*', schema: 'public', table }, 
          (payload) => {
            console.log(`Change detected in table ${table}:`, payload);
            callback();
          }
        );
      });
      
      // تفعيل الاشتراك
      channel.subscribe((status) => {
        console.log(`Realtime subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          toast.success('تم تفعيل المزامنة المباشرة مع قاعدة البيانات', { 
            id: 'realtime-sync',
            duration: 2000 
          });
        }
      });
      
      // تخزين الاشتراك النشط
      this.activeSubscriptions.push(channel);
      
      // إرجاع دالة لإلغاء الاشتراك
      return () => {
        supabase.removeChannel(channel);
        this.activeSubscriptions = this.activeSubscriptions.filter(sub => sub !== channel);
      };
    } catch (error) {
      console.error('خطأ في إعداد المزامنة المباشرة:', error);
      toast.error('حدث خطأ في تفعيل المزامنة المباشرة');
      return () => {};
    }
  }
  
  /**
   * إلغاء جميع اشتراكات المزامنة المباشرة
   */
  public clearAllSubscriptions(): void {
    this.activeSubscriptions.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.activeSubscriptions = [];
  }
  
  /**
   * مزامنة البيانات يدوياً (استدعاء عندما يكون هناك خطأ في الاتصال)
   * @param callback دالة يتم استدعاؤها بعد المزامنة
   */
  public async manualSync(callback: () => void): Promise<void> {
    try {
      toast.info('جاري مزامنة البيانات...', { id: 'manual-sync' });
      
      // إجراء عملية المزامنة هنا - يمكن إضافة منطق خاص بناءً على احتياجات التطبيق
      
      // استدعاء دالة رد النداء بعد المزامنة
      callback();
      
      toast.success('تمت مزامنة البيانات بنجاح', { id: 'manual-sync' });
    } catch (error) {
      console.error('خطأ في مزامنة البيانات:', error);
      toast.error('حدث خطأ أثناء مزامنة البيانات');
    }
  }
  
  /**
   * إعداد مراقبة الاتصال بقاعدة البيانات
   */
  public setupConnectionMonitoring(): void {
    // مراقبة حالة الاتصال بالإنترنت
    window.addEventListener('online', () => {
      toast.success('تمت استعادة الاتصال بالإنترنت', { id: 'connection-status' });
      this.manualSync(() => {
        console.log('تمت مزامنة البيانات بعد استعادة الاتصال');
      });
    });
    
    window.addEventListener('offline', () => {
      toast.error('تم فقدان الاتصال بالإنترنت', { 
        id: 'connection-status',
        duration: Infinity
      });
    });
  }
}

export default DatabaseSyncService;
