
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InventoryMovementTrackingService, { InventoryMovementRecord } from "./InventoryMovementTrackingService";

/**
 * خدمة مزامنة حركات المخزون
 * هذه الخدمة مسؤولة عن مزامنة حركات المخزون من مختلف العمليات (أوامر الإنتاج، التعبئة، المبيعات، المشتريات، المرتجعات)
 * وتسجيلها في جدول تتبع حركات المخزون
 */
class InventoryMovementSyncService {
  private static instance: InventoryMovementSyncService;
  private trackingService: InventoryMovementTrackingService;

  private constructor() {
    this.trackingService = InventoryMovementTrackingService.getInstance();
  }

  public static getInstance(): InventoryMovementSyncService {
    if (!InventoryMovementSyncService.instance) {
      InventoryMovementSyncService.instance = new InventoryMovementSyncService();
    }
    return InventoryMovementSyncService.instance;
  }

  /**
   * مزامنة حركات المخزون من أوامر الإنتاج
   * تقوم بقراءة أوامر الإنتاج وتسجيل حركات الصادر للمواد الخام والوارد للمنتجات نصف المصنعة
   */
  public async syncProductionOrders(): Promise<boolean> {
    try {
      console.log("بدء مزامنة حركات المخزون من أوامر الإنتاج...");
      
      // 1. استرجاع أوامر الإنتاج التي لم يتم تسجيل حركاتها بعد
      const { data: productionOrders, error: fetchError } = await supabase
        .from('production_orders')
        .select(`
          id,
          code,
          product_code,
          product_name,
          quantity,
          unit,
          date,
          status,
          created_at,
          updated_at,
          production_order_ingredients(*)
        `)
        .eq('status', 'completed')
        .order('date', { ascending: false });
      
      if (fetchError) {
        console.error("خطأ في استرجاع أوامر الإنتاج:", fetchError);
        return false;
      }

      if (!productionOrders || productionOrders.length === 0) {
        console.log("لا توجد أوامر إنتاج جديدة للمزامنة");
        return true;
      }

      console.log(`تم العثور على ${productionOrders.length} أمر إنتاج للمزامنة`);
      
      // 2. لكل أمر إنتاج، قم بالتحقق ما إذا كانت حركاته مسجلة بالفعل
      for (const order of productionOrders) {
        // 2.1 التحقق ما إذا كانت حركة الوارد للمنتج نصف المصنع مسجلة بالفعل
        const { data: existingMovements } = await supabase
          .from('inventory_movements')
          .select('id')
          .eq('item_type', 'semi')
          .eq('item_id', order.product_code)
          .eq('movement_type', 'in')
          .eq('reason', `أمر إنتاج #${order.code}`)
          .limit(1);
        
        // إذا كانت الحركة مسجلة بالفعل، تخطى هذا الأمر
        if (existingMovements && existingMovements.length > 0) {
          console.log(`حركات أمر الإنتاج رقم ${order.code} مسجلة بالفعل`);
          continue;
        }
        
        console.log(`تسجيل حركات المخزون لأمر الإنتاج رقم ${order.code}...`);
        
        // 2.2 تسجيل حركة إضافة للمنتج نصف المصنع
        await this.trackingService.recordMovement({
          item_id: order.product_code,
          item_type: 'semi',
          movement_type: 'in',
          quantity: order.quantity,
          reason: `أمر إنتاج #${order.code}`
        });
        
        // 2.3 تسجيل حركات خصم للمواد الخام المستخدمة
        if (order.production_order_ingredients && Array.isArray(order.production_order_ingredients)) {
          for (const ingredient of order.production_order_ingredients) {
            await this.trackingService.recordMovement({
              item_id: ingredient.raw_material_code,
              item_type: 'raw',
              movement_type: 'out',
              quantity: ingredient.required_quantity,
              reason: `استخدام في أمر إنتاج #${order.code}`
            });
          }
        }
      }
      
      console.log("تمت مزامنة حركات المخزون من أوامر الإنتاج بنجاح");
      return true;
    } catch (error) {
      console.error("خطأ في مزامنة حركات المخزون من أوامر الإنتاج:", error);
      return false;
    }
  }

  /**
   * مزامنة حركات المخزون من أوامر التعبئة
   * تقوم بقراءة أوامر التعبئة وتسجيل حركات الصادر للمنتجات نصف المصنعة ومواد التعبئة والوارد للمنتجات النهائية
   */
  public async syncPackagingOrders(): Promise<boolean> {
    try {
      console.log("بدء مزامنة حركات المخزون من أوامر التعبئة...");
      
      // 1. استرجاع أوامر التعبئة التي لم يتم تسجيل حركاتها بعد
      const { data: packagingOrders, error: fetchError } = await supabase
        .from('packaging_orders')
        .select(`
          id,
          code,
          product_code,
          product_name,
          semi_finished_code,
          semi_finished_name,
          semi_finished_quantity,
          quantity,
          unit,
          date,
          status,
          created_at,
          updated_at,
          packaging_order_materials(*)
        `)
        .eq('status', 'completed')
        .order('date', { ascending: false });
      
      if (fetchError) {
        console.error("خطأ في استرجاع أوامر التعبئة:", fetchError);
        return false;
      }

      if (!packagingOrders || packagingOrders.length === 0) {
        console.log("لا توجد أوامر تعبئة جديدة للمزامنة");
        return true;
      }

      console.log(`تم العثور على ${packagingOrders.length} أمر تعبئة للمزامنة`);
      
      // 2. لكل أمر تعبئة، قم بالتحقق ما إذا كانت حركاته مسجلة بالفعل
      for (const order of packagingOrders) {
        // 2.1 التحقق ما إذا كانت حركة الوارد للمنتج النهائي مسجلة بالفعل
        const { data: existingMovements } = await supabase
          .from('inventory_movements')
          .select('id')
          .eq('item_type', 'finished')
          .eq('item_id', order.product_code)
          .eq('movement_type', 'in')
          .eq('reason', `أمر تعبئة #${order.code}`)
          .limit(1);
        
        // إذا كانت الحركة مسجلة بالفعل، تخطى هذا الأمر
        if (existingMovements && existingMovements.length > 0) {
          console.log(`حركات أمر التعبئة رقم ${order.code} مسجلة بالفعل`);
          continue;
        }
        
        console.log(`تسجيل حركات المخزون لأمر التعبئة رقم ${order.code}...`);
        
        // 2.2 تسجيل حركة إضافة للمنتج النهائي
        await this.trackingService.recordMovement({
          item_id: order.product_code,
          item_type: 'finished',
          movement_type: 'in',
          quantity: order.quantity,
          reason: `أمر تعبئة #${order.code}`
        });
        
        // 2.3 تسجيل حركة خصم للمنتج نصف المصنع
        await this.trackingService.recordMovement({
          item_id: order.semi_finished_code,
          item_type: 'semi',
          movement_type: 'out',
          quantity: order.semi_finished_quantity,
          reason: `استخدام في أمر تعبئة #${order.code}`
        });
        
        // 2.4 تسجيل حركات خصم لمواد التعبئة المستخدمة
        if (order.packaging_order_materials && Array.isArray(order.packaging_order_materials)) {
          for (const material of order.packaging_order_materials) {
            await this.trackingService.recordMovement({
              item_id: material.packaging_material_code,
              item_type: 'packaging',
              movement_type: 'out',
              quantity: material.required_quantity,
              reason: `استخدام في أمر تعبئة #${order.code}`
            });
          }
        }
      }
      
      console.log("تمت مزامنة حركات المخزون من أوامر التعبئة بنجاح");
      return true;
    } catch (error) {
      console.error("خطأ في مزامنة حركات المخزون من أوامر التعبئة:", error);
      return false;
    }
  }

  /**
   * مزامنة حركات المخزون من المبيعات
   * تقوم بقراءة فواتير المبيعات وتسجيل حركات الصادر للمنتجات
   */
  public async syncSalesInvoices(): Promise<boolean> {
    try {
      console.log("بدء مزامنة حركات المخزون من فواتير المبيعات...");
      
      // 1. استرجاع فواتير المبيعات المكتملة
      const { data: salesInvoices, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_type,
          date,
          status,
          payment_status,
          created_at,
          party_id,
          invoice_items(*)
        `)
        .eq('invoice_type', 'sales')
        .eq('status', 'confirmed')
        .order('date', { ascending: false });
      
      if (fetchError) {
        console.error("خطأ في استرجاع فواتير المبيعات:", fetchError);
        return false;
      }

      if (!salesInvoices || salesInvoices.length === 0) {
        console.log("لا توجد فواتير مبيعات جديدة للمزامنة");
        return true;
      }

      console.log(`تم العثور على ${salesInvoices.length} فاتورة مبيعات للمزامنة`);
      
      // 2. لكل فاتورة، قم بالتحقق ما إذا كانت حركاتها مسجلة بالفعل
      for (const invoice of salesInvoices) {
        if (!invoice.invoice_items || !Array.isArray(invoice.invoice_items) || invoice.invoice_items.length === 0) {
          console.log(`الفاتورة رقم ${invoice.id} لا تحتوي على أصناف`);
          continue;
        }
        
        // 2.1 التحقق ما إذا كانت حركات هذه الفاتورة مسجلة بالفعل
        const { data: existingMovements } = await supabase
          .from('inventory_movements')
          .select('id')
          .eq('reason', `فاتورة مبيعات #${invoice.id}`)
          .limit(1);
        
        // إذا كانت الحركة مسجلة بالفعل، تخطى هذه الفاتورة
        if (existingMovements && existingMovements.length > 0) {
          console.log(`حركات الفاتورة رقم ${invoice.id} مسجلة بالفعل`);
          continue;
        }
        
        console.log(`تسجيل حركات المخزون للفاتورة رقم ${invoice.id}...`);
        
        // 2.2 تسجيل حركات الصادر لكل صنف في الفاتورة
        for (const item of invoice.invoice_items) {
          // التحقق من نوع الصنف لتحديد جدول المخزون المناسب
          if (item.item_type && item.item_id && item.quantity) {
            await this.trackingService.recordMovement({
              item_id: item.item_id.toString(),
              item_type: this.mapItemType(item.item_type),
              movement_type: 'out',
              quantity: item.quantity,
              reason: `فاتورة مبيعات #${invoice.id}`
            });
          }
        }
      }
      
      console.log("تمت مزامنة حركات المخزون من فواتير المبيعات بنجاح");
      return true;
    } catch (error) {
      console.error("خطأ في مزامنة حركات المخزون من فواتير المبيعات:", error);
      return false;
    }
  }

  /**
   * مزامنة حركات المخزون من المشتريات
   * تقوم بقراءة فواتير المشتريات وتسجيل حركات الوارد للمواد
   */
  public async syncPurchaseInvoices(): Promise<boolean> {
    try {
      console.log("بدء مزامنة حركات المخزون من فواتير المشتريات...");
      
      // 1. استرجاع فواتير المشتريات المكتملة
      const { data: purchaseInvoices, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_type,
          date,
          status,
          payment_status,
          created_at,
          party_id,
          invoice_items(*)
        `)
        .eq('invoice_type', 'purchase')
        .eq('status', 'confirmed')
        .order('date', { ascending: false });
      
      if (fetchError) {
        console.error("خطأ في استرجاع فواتير المشتريات:", fetchError);
        return false;
      }

      if (!purchaseInvoices || purchaseInvoices.length === 0) {
        console.log("لا توجد فواتير مشتريات جديدة للمزامنة");
        return true;
      }

      console.log(`تم العثور على ${purchaseInvoices.length} فاتورة مشتريات للمزامنة`);
      
      // 2. لكل فاتورة، قم بالتحقق ما إذا كانت حركاتها مسجلة بالفعل
      for (const invoice of purchaseInvoices) {
        if (!invoice.invoice_items || !Array.isArray(invoice.invoice_items) || invoice.invoice_items.length === 0) {
          console.log(`الفاتورة رقم ${invoice.id} لا تحتوي على أصناف`);
          continue;
        }
        
        // 2.1 التحقق ما إذا كانت حركات هذه الفاتورة مسجلة بالفعل
        const { data: existingMovements } = await supabase
          .from('inventory_movements')
          .select('id')
          .eq('reason', `فاتورة مشتريات #${invoice.id}`)
          .limit(1);
        
        // إذا كانت الحركة مسجلة بالفعل، تخطى هذه الفاتورة
        if (existingMovements && existingMovements.length > 0) {
          console.log(`حركات الفاتورة رقم ${invoice.id} مسجلة بالفعل`);
          continue;
        }
        
        console.log(`تسجيل حركات المخزون للفاتورة رقم ${invoice.id}...`);
        
        // 2.2 تسجيل حركات الوارد لكل صنف في الفاتورة
        for (const item of invoice.invoice_items) {
          // التحقق من نوع الصنف لتحديد جدول المخزون المناسب
          if (item.item_type && item.item_id && item.quantity) {
            await this.trackingService.recordMovement({
              item_id: item.item_id.toString(),
              item_type: this.mapItemType(item.item_type),
              movement_type: 'in',
              quantity: item.quantity,
              reason: `فاتورة مشتريات #${invoice.id}`
            });
          }
        }
      }
      
      console.log("تمت مزامنة حركات المخزون من فواتير المشتريات بنجاح");
      return true;
    } catch (error) {
      console.error("خطأ في مزامنة حركات المخزون من فواتير المشتريات:", error);
      return false;
    }
  }

  /**
   * مزامنة حركات المخزون من مرتجعات المبيعات
   * تقوم بقراءة مرتجعات المبيعات وتسجيل حركات الوارد للمنتجات
   */
  public async syncSalesReturns(): Promise<boolean> {
    try {
      console.log("بدء مزامنة حركات المخزون من مرتجعات المبيعات...");
      
      // 1. استرجاع مرتجعات المبيعات المكتملة
      const { data: salesReturns, error: fetchError } = await supabase
        .from('returns')
        .select(`
          id,
          return_type,
          date,
          payment_status,
          created_at,
          party_id,
          return_items(*)
        `)
        .eq('return_type', 'sales')
        .order('date', { ascending: false });
      
      if (fetchError) {
        console.error("خطأ في استرجاع مرتجعات المبيعات:", fetchError);
        return false;
      }

      if (!salesReturns || salesReturns.length === 0) {
        console.log("لا توجد مرتجعات مبيعات جديدة للمزامنة");
        return true;
      }

      console.log(`تم العثور على ${salesReturns.length} مرتجع مبيعات للمزامنة`);
      
      // 2. لكل مرتجع، قم بالتحقق ما إذا كانت حركاته مسجلة بالفعل
      for (const returnDoc of salesReturns) {
        if (!returnDoc.return_items || !Array.isArray(returnDoc.return_items) || returnDoc.return_items.length === 0) {
          console.log(`المرتجع رقم ${returnDoc.id} لا يحتوي على أصناف`);
          continue;
        }
        
        // 2.1 التحقق ما إذا كانت حركات هذا المرتجع مسجلة بالفعل
        const { data: existingMovements } = await supabase
          .from('inventory_movements')
          .select('id')
          .eq('reason', `مرتجع مبيعات #${returnDoc.id}`)
          .limit(1);
        
        // إذا كانت الحركة مسجلة بالفعل، تخطى هذا المرتجع
        if (existingMovements && existingMovements.length > 0) {
          console.log(`حركات المرتجع رقم ${returnDoc.id} مسجلة بالفعل`);
          continue;
        }
        
        console.log(`تسجيل حركات المخزون للمرتجع رقم ${returnDoc.id}...`);
        
        // 2.2 تسجيل حركات الوارد لكل صنف في المرتجع
        for (const item of returnDoc.return_items) {
          // التحقق من نوع الصنف لتحديد جدول المخزون المناسب
          if (item.item_type && item.item_id && item.quantity) {
            await this.trackingService.recordMovement({
              item_id: item.item_id.toString(),
              item_type: this.mapItemType(item.item_type),
              movement_type: 'in', // وارد (إضافة للمخزون)
              quantity: item.quantity,
              reason: `مرتجع مبيعات #${returnDoc.id}`
            });
          }
        }
      }
      
      console.log("تمت مزامنة حركات المخزون من مرتجعات المبيعات بنجاح");
      return true;
    } catch (error) {
      console.error("خطأ في مزامنة حركات المخزون من مرتجعات المبيعات:", error);
      return false;
    }
  }

  /**
   * مزامنة حركات المخزون من مرتجعات المشتريات
   * تقوم بقراءة مرتجعات المشتريات وتسجيل حركات الصادر للمواد
   */
  public async syncPurchaseReturns(): Promise<boolean> {
    try {
      console.log("بدء مزامنة حركات المخزون من مرتجعات المشتريات...");
      
      // 1. استرجاع مرتجعات المشتريات المكتملة
      const { data: purchaseReturns, error: fetchError } = await supabase
        .from('returns')
        .select(`
          id,
          return_type,
          date,
          payment_status,
          created_at,
          party_id,
          return_items(*)
        `)
        .eq('return_type', 'purchase')
        .order('date', { ascending: false });
      
      if (fetchError) {
        console.error("خطأ في استرجاع مرتجعات المشتريات:", fetchError);
        return false;
      }

      if (!purchaseReturns || purchaseReturns.length === 0) {
        console.log("لا توجد مرتجعات مشتريات جديدة للمزامنة");
        return true;
      }

      console.log(`تم العثور على ${purchaseReturns.length} مرتجع مشتريات للمزامنة`);
      
      // 2. لكل مرتجع، قم بالتحقق ما إذا كانت حركاته مسجلة بالفعل
      for (const returnDoc of purchaseReturns) {
        if (!returnDoc.return_items || !Array.isArray(returnDoc.return_items) || returnDoc.return_items.length === 0) {
          console.log(`المرتجع رقم ${returnDoc.id} لا يحتوي على أصناف`);
          continue;
        }
        
        // 2.1 التحقق ما إذا كانت حركات هذا المرتجع مسجلة بالفعل
        const { data: existingMovements } = await supabase
          .from('inventory_movements')
          .select('id')
          .eq('reason', `مرتجع مشتريات #${returnDoc.id}`)
          .limit(1);
        
        // إذا كانت الحركة مسجلة بالفعل، تخطى هذا المرتجع
        if (existingMovements && existingMovements.length > 0) {
          console.log(`حركات المرتجع رقم ${returnDoc.id} مسجلة بالفعل`);
          continue;
        }
        
        console.log(`تسجيل حركات المخزون للمرتجع رقم ${returnDoc.id}...`);
        
        // 2.2 تسجيل حركات الصادر لكل صنف في المرتجع
        for (const item of returnDoc.return_items) {
          // التحقق من نوع الصنف لتحديد جدول المخزون المناسب
          if (item.item_type && item.item_id && item.quantity) {
            await this.trackingService.recordMovement({
              item_id: item.item_id.toString(),
              item_type: this.mapItemType(item.item_type),
              movement_type: 'out', // صادر (خصم من المخزون)
              quantity: item.quantity,
              reason: `مرتجع مشتريات #${returnDoc.id}`
            });
          }
        }
      }
      
      console.log("تمت مزامنة حركات المخزون من مرتجعات المشتريات بنجاح");
      return true;
    } catch (error) {
      console.error("خطأ في مزامنة حركات المخزون من مرتجعات المشتريات:", error);
      return false;
    }
  }

  /**
   * مزامنة جميع حركات المخزون من جميع المصادر
   */
  public async syncAllMovements(): Promise<boolean> {
    try {
      console.log("بدء مزامنة جميع حركات المخزون...");
      
      const results = await Promise.all([
        this.syncProductionOrders(),
        this.syncPackagingOrders(),
        this.syncSalesInvoices(),
        this.syncPurchaseInvoices(),
        this.syncSalesReturns(),
        this.syncPurchaseReturns()
      ]);
      
      const allSuccessful = results.every(result => result === true);
      
      if (allSuccessful) {
        console.log("تمت مزامنة جميع حركات المخزون بنجاح");
        toast.success("تمت مزامنة حركات المخزون بنجاح");
      } else {
        console.warn("بعض عمليات المزامنة لم تكتمل بنجاح");
        toast.warning("بعض عمليات مزامنة حركات المخزون لم تكتمل بنجاح");
      }
      
      return allSuccessful;
    } catch (error) {
      console.error("خطأ في مزامنة جميع حركات المخزون:", error);
      toast.error("حدث خطأ أثناء مزامنة حركات المخزون");
      return false;
    }
  }

  /**
   * تحويل نوع الصنف من نظام الفواتير إلى نظام المخزون
   */
  private mapItemType(invoiceItemType: string): string {
    switch (invoiceItemType) {
      case 'raw_material':
        return 'raw';
      case 'semi_finished':
        return 'semi';
      case 'packaging_material':
        return 'packaging';
      case 'finished_product':
        return 'finished';
      default:
        return invoiceItemType;
    }
  }
}

export default InventoryMovementSyncService;
