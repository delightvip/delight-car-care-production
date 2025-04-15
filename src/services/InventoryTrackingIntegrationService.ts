
import InventoryTrackingService from './InventoryTrackingService';
import { supabase } from '@/integrations/supabase/client';

/**
 * خدمة تكامل تتبع المخزون مع الخدمات الأخرى
 * هذه الخدمة مسؤولة عن تسجيل حركات المخزون تلقائيًا عند حدوث تغييرات في الأنظمة الأخرى
 */
class InventoryTrackingIntegrationService {
  private static instance: InventoryTrackingIntegrationService;
  private trackingService: InventoryTrackingService;

  private constructor() {
    this.trackingService = InventoryTrackingService.getInstance();
    this.initializeListeners();
  }

  /**
   * الحصول على نسخة واحدة من الخدمة (نمط Singleton)
   */
  public static getInstance(): InventoryTrackingIntegrationService {
    if (!InventoryTrackingIntegrationService.instance) {
      InventoryTrackingIntegrationService.instance = new InventoryTrackingIntegrationService();
    }
    return InventoryTrackingIntegrationService.instance;
  }

  /**
   * تهيئة المستمعين للأحداث المختلفة في النظام
   */
  private initializeListeners(): void {
    // استماع لأحداث تغيير حالة أوامر الإنتاج
    window.addEventListener('production-order-status-change', (event: any) => {
      const { orderId, status, previousStatus } = event.detail || {};
      
      if (orderId && status) {
        this.handleProductionOrderStatusChange(orderId, status, previousStatus);
      }
    });

    // استماع لأحداث تغيير حالة أوامر التعبئة
    window.addEventListener('packaging-order-status-change', (event: any) => {
      const { orderId, status, previousStatus } = event.detail || {};
      
      if (orderId && status) {
        this.handlePackagingOrderStatusChange(orderId, status, previousStatus);
      }
    });

    // استماع لأحداث تغيير حالة الفواتير
    window.addEventListener('invoice-status-change', (event: any) => {
      const { invoiceId, status, previousStatus, invoiceType } = event.detail || {};
      
      if (invoiceId && status && invoiceType) {
        this.handleInvoiceStatusChange(invoiceId, status, previousStatus, invoiceType);
      }
    });

    // استماع لأحداث تغيير حالة المرتجعات
    window.addEventListener('return-status-change', (event: any) => {
      const { returnId, status, previousStatus } = event.detail || {};
      
      if (returnId && status) {
        this.handleReturnStatusChange(returnId, status, previousStatus);
      }
    });

    console.log('تم تهيئة مستمعي أحداث تتبع المخزون');
  }

  /**
   * معالجة تغيير حالة أمر الإنتاج
   */
  private async handleProductionOrderStatusChange(
    orderId: number, 
    status: string, 
    previousStatus: string
  ): Promise<void> {
    try {
      if (status === 'completed' && previousStatus !== 'completed') {
        // تنفيذ أمر الإنتاج: تسجيل حركات استهلاك المواد الخام وإنتاج المنتج النصف مصنع
        await this.trackingService.recordProductionOrderMovements(orderId, true);
        console.log(`تم تسجيل حركات المخزون لأمر الإنتاج ${orderId} - تنفيذ`);
      } else if (previousStatus === 'completed' && status !== 'completed') {
        // إلغاء تنفيذ أمر الإنتاج: تسجيل حركات عكسية
        await this.trackingService.recordProductionOrderMovements(orderId, false);
        console.log(`تم تسجيل حركات المخزون لأمر الإنتاج ${orderId} - إلغاء`);
      }
    } catch (error) {
      console.error(`خطأ أثناء معالجة تغيير حالة أمر الإنتاج ${orderId}:`, error);
    }
  }

  /**
   * معالجة تغيير حالة أمر التعبئة
   */
  private async handlePackagingOrderStatusChange(
    orderId: number, 
    status: string, 
    previousStatus: string
  ): Promise<void> {
    try {
      if (status === 'completed' && previousStatus !== 'completed') {
        // تنفيذ أمر التعبئة: تسجيل حركات استهلاك المنتج النصف مصنع ومواد التعبئة وإنتاج المنتج النهائي
        await this.trackingService.recordPackagingOrderMovements(orderId, true);
        console.log(`تم تسجيل حركات المخزون لأمر التعبئة ${orderId} - تنفيذ`);
      } else if (previousStatus === 'completed' && status !== 'completed') {
        // إلغاء تنفيذ أمر التعبئة: تسجيل حركات عكسية
        await this.trackingService.recordPackagingOrderMovements(orderId, false);
        console.log(`تم تسجيل حركات المخزون لأمر التعبئة ${orderId} - إلغاء`);
      }
    } catch (error) {
      console.error(`خطأ أثناء معالجة تغيير حالة أمر التعبئة ${orderId}:`, error);
    }
  }

  /**
   * معالجة تغيير حالة الفاتورة
   */
  private async handleInvoiceStatusChange(
    invoiceId: string, 
    status: string, 
    previousStatus: string,
    invoiceType: 'sale' | 'purchase'
  ): Promise<void> {
    try {
      if (status === 'confirmed' && previousStatus !== 'confirmed') {
        // تأكيد الفاتورة: تسجيل حركات المخزون حسب نوع الفاتورة
        if (invoiceType === 'sale') {
          // فاتورة مبيعات: تسجيل حركات صرف من المخزون
          await this.trackingService.recordSalesInvoiceMovements(invoiceId, true);
          console.log(`تم تسجيل حركات المخزون لفاتورة المبيعات ${invoiceId} - تأكيد`);
        } else if (invoiceType === 'purchase') {
          // فاتورة مشتريات: تسجيل حركات إضافة إلى المخزون
          await this.trackingService.recordPurchaseInvoiceMovements(invoiceId, true);
          console.log(`تم تسجيل حركات المخزون لفاتورة المشتريات ${invoiceId} - تأكيد`);
        }
      } else if (previousStatus === 'confirmed' && status !== 'confirmed') {
        // إلغاء تأكيد الفاتورة: تسجيل حركات عكسية
        if (invoiceType === 'sale') {
          await this.trackingService.recordSalesInvoiceMovements(invoiceId, false);
          console.log(`تم تسجيل حركات المخزون لفاتورة المبيعات ${invoiceId} - إلغاء`);
        } else if (invoiceType === 'purchase') {
          await this.trackingService.recordPurchaseInvoiceMovements(invoiceId, false);
          console.log(`تم تسجيل حركات المخزون لفاتورة المشتريات ${invoiceId} - إلغاء`);
        }
      }
    } catch (error) {
      console.error(`خطأ أثناء معالجة تغيير حالة الفاتورة ${invoiceId}:`, error);
    }
  }

  /**
   * معالجة تغيير حالة المرتجع
   */
  private async handleReturnStatusChange(
    returnId: string, 
    status: string, 
    previousStatus: string
  ): Promise<void> {
    try {
      if (status === 'confirmed' && previousStatus !== 'confirmed') {
        // تأكيد المرتجع: تسجيل حركات المخزون
        await this.trackingService.recordReturnMovements(returnId, true);
        console.log(`تم تسجيل حركات المخزون للمرتجع ${returnId} - تأكيد`);
      } else if (previousStatus === 'confirmed' && status !== 'confirmed') {
        // إلغاء تأكيد المرتجع: تسجيل حركات عكسية
        await this.trackingService.recordReturnMovements(returnId, false);
        console.log(`تم تسجيل حركات المخزون للمرتجع ${returnId} - إلغاء`);
      }
    } catch (error) {
      console.error(`خطأ أثناء معالجة تغيير حالة المرتجع ${returnId}:`, error);
    }
  }

  /**
   * إنشاء السجل الأولي للمخزون (إذا كان فارغًا)
   * يمكن استخدام هذه الوظيفة لإنشاء سجل أولي لحركات المخزون عند بدء النظام
   */
  public async initializeInventoryMovements(): Promise<void> {
    try {
      // التحقق من وجود حركات مخزون سابقة
      const { count, error } = await supabase
        .from('inventory_movements')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      // إذا كانت هناك حركات بالفعل، لا حاجة للتهيئة
      if (count && count > 0) {
        console.log(`يوجد بالفعل ${count} حركة مخزون مسجلة. تخطي التهيئة.`);
        return;
      }

      console.log('بدء تهيئة سجل حركات المخزون...');

      // تسجيل الرصيد الافتتاحي للمواد الخام
      const { data: rawMaterials, error: rawError } = await supabase
        .from('raw_materials')
        .select('*');

      if (!rawError && rawMaterials) {
        for (const material of rawMaterials) {
          if (material.quantity > 0) {
            await this.trackingService.recordIncomingMovement(
              material.id.toString(),
              'raw',
              material.quantity,
              material.quantity,
              'رصيد افتتاحي'
            );
          }
        }
      }

      // تسجيل الرصيد الافتتاحي لمواد التعبئة
      const { data: packagingMaterials, error: packagingError } = await supabase
        .from('packaging_materials')
        .select('*');

      if (!packagingError && packagingMaterials) {
        for (const material of packagingMaterials) {
          if (material.quantity > 0) {
            await this.trackingService.recordIncomingMovement(
              material.id.toString(),
              'packaging',
              material.quantity,
              material.quantity,
              'رصيد افتتاحي'
            );
          }
        }
      }

      // تسجيل الرصيد الافتتاحي للمنتجات النصف مصنعة
      const { data: semiFinishedProducts, error: semiError } = await supabase
        .from('semi_finished_products')
        .select('*');

      if (!semiError && semiFinishedProducts) {
        for (const product of semiFinishedProducts) {
          if (product.quantity > 0) {
            await this.trackingService.recordIncomingMovement(
              product.id.toString(),
              'semi',
              product.quantity,
              product.quantity,
              'رصيد افتتاحي'
            );
          }
        }
      }

      // تسجيل الرصيد الافتتاحي للمنتجات النهائية
      const { data: finishedProducts, error: finishedError } = await supabase
        .from('finished_products')
        .select('*');

      if (!finishedError && finishedProducts) {
        for (const product of finishedProducts) {
          if (product.quantity > 0) {
            await this.trackingService.recordIncomingMovement(
              product.id.toString(),
              'finished',
              product.quantity,
              product.quantity,
              'رصيد افتتاحي'
            );
          }
        }
      }

      console.log('تم إنشاء سجل حركات المخزون الأولي بنجاح.');
    } catch (error) {
      console.error('خطأ أثناء تهيئة سجل حركات المخزون:', error);
    }
  }

  /**
   * تسجيل المستمعين لتغييرات المخزون مباشرة من قاعدة البيانات
   * يمكن استخدام هذه الوظيفة لتسجيل المستمعين لتغييرات المخزون إذا كان هناك دعم للمراقبة المباشرة من قاعدة البيانات
   */
  public initializeDatabaseListeners(): void {
    // هذه الوظيفة يمكن تفعيلها لاحقًا إذا كان هناك دعم لمراقبة التغييرات في قاعدة البيانات مباشرة
    console.log('تم تهيئة مستمعي تغييرات قاعدة البيانات');
  }
}

export default InventoryTrackingIntegrationService;
