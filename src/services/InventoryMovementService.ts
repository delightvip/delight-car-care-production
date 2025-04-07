import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays, isAfter, isBefore, subDays } from 'date-fns';
import InventoryService from './InventoryService';

export interface InventoryMovement {
  id: number;
  type: 'in' | 'out';
  category: string;
  item_name: string;
  quantity: number;
  date: Date;
  note: string;
  item_id?: number; // معرف الصنف
  unit?: string; // وحدة القياس
  related_document_id?: string; // معرف المستند المرتبط (أمر إنتاج، أمر تعبئة، إلخ)
}

// واجهة الاستعلام لتصفية حركات المخزون
export interface InventoryMovementQuery {
  category?: string;
  type?: 'in' | 'out';
  dateRange?: { from?: Date; to?: Date };
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

// واجهة إحصائيات المخزون
export interface InventoryMovementStats {
  totalInMovements: number;
  totalOutMovements: number;
  totalInQuantity: number;
  totalOutQuantity: number;
  netQuantity: number; // الكمية الصافية (وارد - صادر)
  movementsByCategory: Record<string, number>;
  mostActiveCategory: { category: string; count: number } | null;
}

/**
 * استرجاع حركات المخزون مع إمكانية التصفية
 */
export async function fetchInventoryMovements(query?: InventoryMovementQuery): Promise<InventoryMovement[]> {
  try {
    const limit = query?.limit || 100; // حد أقصى إفتراضي 100 حركة
    const movements: InventoryMovement[] = [];
    let idCounter = 1; // معرف تسلسلي للحركات التي ليس لها معرف

    // استخدام try/catch منفصل لكل نوع من الحركات لضمان استمرار التنفيذ في حالة فشل أي منها
    
    // 1. حاول استرجاع حركات المواد الخام
    try {
      // استرجاع المخزون للمواد الخام من جدول raw_materials
      const { data: rawMaterials } = await supabase
        .from('raw_materials')
        .select('id, name, quantity, created_at, updated_at')
        .order('name', { ascending: true })
        .limit(limit);
      
      if (rawMaterials && rawMaterials.length > 0) {
        // إنشاء حركات وهمية للإضافات بناءً على المخزون الحالي
        rawMaterials.forEach(material => {
          // إنشاء حركة وارد لتمثيل المخزون الحالي
          movements.push({
            id: idCounter++,
            type: 'in',
            category: 'raw_materials',
            item_name: material.name || 'مادة خام',
            item_id: material.id,
            quantity: material.quantity || 0,
            unit: 'كجم',
            date: new Date(material.created_at),
            note: 'رصيد مبدئي للمادة الخام'
          });
        });
      }
    } catch (error) {
      console.error("Error fetching raw materials:", error);
    }
    
    // 2. حاول استرجاع حركات المنتجات نصف المصنعة
    try {
      // استرجاع المخزون للمنتجات نصف المصنعة
      const { data: semiFinishedProducts } = await supabase
        .from('semi_finished_products')
        .select('id, name, quantity, created_at, updated_at')
        .order('name', { ascending: true })
        .limit(limit);
      
      if (semiFinishedProducts && semiFinishedProducts.length > 0) {
        // إنشاء حركات وهمية للإضافات بناءً على المخزون الحالي
        semiFinishedProducts.forEach(product => {
          // إنشاء حركة وارد لتمثيل المخزون الحالي
          movements.push({
            id: idCounter++,
            type: 'in',
            category: 'semi_finished',
            item_name: product.name || 'منتج نصف مصنع',
            item_id: product.id,
            quantity: product.quantity || 0,
            unit: 'لتر',
            date: new Date(product.created_at),
            note: 'رصيد مبدئي للمنتج نصف المصنع'
          });
        });
      }
    } catch (error) {
      console.error("Error fetching semi-finished products:", error);
    }

    // 3. حاول استرجاع حركات المنتجات النهائية
    try {
      // استرجاع المخزون للمنتجات النهائية
      const { data: finishedProducts } = await supabase
        .from('finished_products')
        .select('id, name, quantity, created_at, updated_at')
        .order('name', { ascending: true })
        .limit(limit);
      
      if (finishedProducts && finishedProducts.length > 0) {
        // إنشاء حركات وهمية للإضافات بناءً على المخزون الحالي
        finishedProducts.forEach(product => {
          // إنشاء حركة وارد لتمثيل المخزون الحالي
          movements.push({
            id: idCounter++,
            type: 'in',
            category: 'finished_products',
            item_name: product.name || 'منتج نهائي',
            item_id: product.id,
            quantity: product.quantity || 0,
            unit: 'عبوة',
            date: new Date(product.created_at),
            note: 'رصيد مبدئي للمنتج النهائي'
          });
        });
      }
    } catch (error) {
      console.error("Error fetching finished products:", error);
    }
    
    // 4. تحقق من وجود أوامر إنتاج واستخراج حركاتها
    try {
      // التحقق من وجود جدول أوامر الإنتاج وهيكله
      const { data: productionOrders } = await supabase
        .from('production_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (productionOrders && productionOrders.length > 0) {
        // معالجة كل أمر إنتاج
        for (const order of productionOrders) {
          try {
            // استخدام الحقول الفعلية الموجودة في قاعدة البيانات
            // يمكن أن يكون اسم العمود product_code بدلاً من semi_finished_id
            let productId = null;
            
            // التحقق من الهيكل الفعلي للجدول
            if ('product_code' in order) {
              // استخدام product_code للبحث عن المنتج في جدول المنتجات النصف مصنعة
              const { data: semiFinishedByCode } = await supabase
                .from('semi_finished_products')
                .select('id')
                .eq('code', order.product_code)
                .single();
              
              if (semiFinishedByCode) {
                productId = semiFinishedByCode.id;
              }
            }
            
            let semiFinishedName = order.product_name || 'منتج نصف مصنع';
            
            // إضافة حركة إنتاج
            movements.push({
              id: idCounter++,
              type: 'in',
              category: 'semi_finished',
              item_name: semiFinishedName,
              item_id: parseInt(productId) || 0,
              quantity: order.quantity || 0,
              unit: 'لتر',
              date: new Date(order.date || order.created_at),
              note: `إنتاج جديد - أمر رقم ${order.code || order.id}`,
              related_document_id: order.id?.toString()
            });
          } catch (innerError) {
            console.error("Error processing production order:", innerError);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching production orders:", error);
    }
    
    // 5. تحقق من وجود أوامر تعبئة واستخراج حركاتها
    try {
      // التحقق من وجود جدول أوامر التعبئة وهيكله
      const { data: packagingOrders } = await supabase
        .from('packaging_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (packagingOrders && packagingOrders.length > 0) {
        // معالجة كل أمر تعبئة
        for (const order of packagingOrders) {
          try {
            // 5.1 إضافة حركة استهلاك للمنتج نصف المصنع
            let semiFinishedId = null;
            
            // التحقق من الهيكل الفعلي للجدول
            if ('semi_finished_code' in order) {
              // استخدام semi_finished_code للبحث عن المنتج النصف مصنع
              const { data: semiFinishedByCode } = await supabase
                .from('semi_finished_products')
                .select('id')
                .eq('code', order.semi_finished_code)
                .single();
              
              if (semiFinishedByCode) {
                semiFinishedId = semiFinishedByCode.id;
              }
            }
            
            const semiFinishedName = order.semi_finished_name || 'منتج نصف مصنع';
            
            if (semiFinishedId) {
              // إضافة حركة استهلاك منتج نصف مصنع
              movements.push({
                id: idCounter++,
                type: 'out',
                category: 'semi_finished',
                item_name: semiFinishedName,
                item_id: parseInt(semiFinishedId) || 0,
                quantity: order.semi_finished_quantity || order.quantity || 0,
                unit: 'لتر',
                date: new Date(order.date || order.created_at),
                note: `استخدام في أمر تعبئة ${order.code || order.id}`,
                related_document_id: order.id?.toString()
              });
            }
            
            // 5.2 إضافة حركة إنتاج للمنتج النهائي
            let finishedProductId = null;
            
            // التحقق من الهيكل الفعلي للجدول
            if ('product_code' in order) {
              // استخدام product_code للبحث عن المنتج النهائي
              const { data: finishedByCode } = await supabase
                .from('finished_products')
                .select('id')
                .eq('code', order.product_code)
                .single();
              
              if (finishedByCode) {
                finishedProductId = finishedByCode.id;
              }
            }
            
            const finishedProductName = order.product_name || 'منتج نهائي';
            
            // إضافة حركة إنتاج منتج نهائي
            movements.push({
              id: idCounter++,
              type: 'in',
              category: 'finished_products',
              item_name: finishedProductName,
              item_id: parseInt(finishedProductId) || 0,
              quantity: order.quantity || 0,
              unit: 'عبوة',
              date: new Date(order.date || order.created_at),
              note: `تعبئة منتج نهائي - أمر رقم ${order.code || order.id}`,
              related_document_id: order.id?.toString()
            });
          } catch (innerError) {
            console.error("Error processing packaging order:", innerError);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching packaging orders:", error);
    }
    
    // 6. استرجاع أي حركات مخزون يدوية (إذا كان الجدول موجودًا)
    try {
      const { data: manualMovements } = await supabase
        .from('inventory_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    
      if (manualMovements && manualMovements.length > 0) {
        manualMovements.forEach((movement: any) => {
          // تحويل نوع الحركة من إضافة/خصم إلى وارد/صادر
          const movementType: 'in' | 'out' = movement.movement_type === 'add' ? 'in' : 'out';
          
          // استخدام البيانات الموجودة في الجدول، مع توفير قيم افتراضية للحقول غير الموجودة
          movements.push({
            id: parseInt(movement.id) || idCounter++,
            type: movementType,
            category: movement.item_type || '',
            item_name: movement.item_name || movement.reason || '',
            item_id: parseInt(movement.item_id) || 0,
            quantity: movement.quantity || 0,
            unit: movement.unit || '',
            date: new Date(movement.created_at || new Date()),
            note: movement.reason || movement.note || ''
          });
        });
      }
    } catch (error) {
      // نتجاهل الخطأ هنا حيث قد لا يكون الجدول موجودًا بعد
      console.log("Manual inventory movements table might not exist yet");
    }

    // تطبيق التصفية إذا تم توفير معايير
    if (query) {
      return filterMovements(movements, query);
    }

    // ترتيب جميع الحركات حسب التاريخ (الأحدث أولاً)
    return movements.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error) {
    console.error("Error fetching inventory movements:", error);
    toast.error("حدث خطأ أثناء استرجاع حركات المخزون");
    return [];
  }
}

/**
 * استخراج الإحصائيات من حركات المخزون
 */
export function getInventoryMovementStats(movements: InventoryMovement[]): InventoryMovementStats {
  const inMovements = movements.filter(m => m.type === 'in');
  const outMovements = movements.filter(m => m.type === 'out');
  
  const totalInQuantity = inMovements.reduce((sum, m) => sum + m.quantity, 0);
  const totalOutQuantity = outMovements.reduce((sum, m) => sum + m.quantity, 0);
  
  const movementsByCategory = movements.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let mostActiveCategory = null;
  const categoryEntries = Object.entries(movementsByCategory);
  
  if (categoryEntries.length > 0) {
    const [category, count] = categoryEntries.reduce((a, b) => a[1] > b[1] ? a : b);
    mostActiveCategory = { category, count };
  }
  
  return {
    totalInMovements: inMovements.length,
    totalOutMovements: outMovements.length,
    totalInQuantity,
    totalOutQuantity,
    netQuantity: totalInQuantity - totalOutQuantity,
    movementsByCategory,
    mostActiveCategory
  };
}

/**
 * تصفية حركات المخزون حسب الفئة
 */
export function filterMovementsByCategory(movements: InventoryMovement[], category: string): InventoryMovement[] {
  if (category === 'all') return movements;
  return movements.filter(movement => movement.category === category);
}

/**
 * تصفية حركات المخزون حسب معايير متعددة
 */
export function filterMovements(
  movements: InventoryMovement[], 
  query: InventoryMovementQuery
): InventoryMovement[] {
  return movements.filter(movement => {
    // Filter by category
    if (query.category && query.category !== 'all' && movement.category !== query.category) {
      return false;
    }
    
    // Filter by movement type
    if (query.type && movement.type !== query.type) {
      return false;
    }
    
    // Filter by date range
    if (query.dateRange) {
      const { from, to } = query.dateRange;
      if (from && isBefore(movement.date, from)) {
        return false;
      }
      if (to && isAfter(movement.date, to)) {
        return false;
      }
    }
    
    // Filter by search term
    if (query.searchTerm && query.searchTerm.trim() !== '') {
      const lowercaseSearch = query.searchTerm.toLowerCase();
      const itemNameMatch = movement.item_name.toLowerCase().includes(lowercaseSearch);
      const noteMatch = movement.note.toLowerCase().includes(lowercaseSearch);
      
      if (!itemNameMatch && !noteMatch) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * استرجاع حركات المخزون للأيام الأخيرة
 */
export async function fetchRecentMovements(days: number = 7): Promise<InventoryMovement[]> {
  const startDate = subDays(new Date(), days);
  
  const query: InventoryMovementQuery = {
    dateRange: {
      from: startDate
    }
  };
  
  return fetchInventoryMovements(query);
}

/**
 * استرجاع حركات المخزون لصنف محدد
 */
export async function fetchMovementsByItemId(itemId: number, category: string): Promise<InventoryMovement[]> {
  const allMovements = await fetchInventoryMovements();
  
  return allMovements.filter(m => 
    m.item_id === itemId && 
    m.category === category
  );
}

/**
 * إنشاء حركة مخزون يدوية جديدة
 */
export async function createManualInventoryMovement(
  movement: Omit<InventoryMovement, 'id' | 'date'> & { date?: Date }
): Promise<boolean> {
  try {
    // استخدام خدمة المخزون لتسجيل الحركة اليدوية
    const inventoryService = InventoryService.getInstance();
    
    // تسجيل حركة المخزون باستخدام طريقة recordItemMovement
    await inventoryService.recordItemMovement({
      type: movement.type,
      category: movement.category,
      itemName: movement.item_name,
      quantity: movement.quantity,
      date: movement.date || new Date(),
      note: movement.note
    });
    
    // تحديث الكمية المتاحة للصنف في قاعدة البيانات
    const itemId = movement.item_id;
    const quantity = movement.quantity;
    const category = movement.category;
    const type = movement.type;
    
    if (itemId) {
      // تحديث الكمية حسب نوع الحركة وفئة الصنف
      switch (category) {
        case 'raw_materials':
          if (type === 'in') {
            const { data: rawMaterial } = await supabase
              .from('raw_materials')
              .select('quantity')
              .eq('id', itemId)
              .single();
            
            if (rawMaterial) {
              await supabase
                .from('raw_materials')
                .update({ quantity: rawMaterial.quantity + quantity })
                .eq('id', itemId);
            }
          } else { // type === 'out'
            const { data: rawMaterial } = await supabase
              .from('raw_materials')
              .select('quantity')
              .eq('id', itemId)
              .single();
            
            if (rawMaterial && rawMaterial.quantity >= quantity) {
              await supabase
                .from('raw_materials')
                .update({ quantity: rawMaterial.quantity - quantity })
                .eq('id', itemId);
            }
          }
          break;
        
        case 'packaging':
          if (type === 'in') {
            const { data: packagingMaterial } = await supabase
              .from('packaging_materials')
              .select('quantity')
              .eq('id', itemId)
              .single();
            
            if (packagingMaterial) {
              await supabase
                .from('packaging_materials')
                .update({ quantity: packagingMaterial.quantity + quantity })
                .eq('id', itemId);
            }
          } else { // type === 'out'
            const { data: packagingMaterial } = await supabase
              .from('packaging_materials')
              .select('quantity')
              .eq('id', itemId)
              .single();
            
            if (packagingMaterial && packagingMaterial.quantity >= quantity) {
              await supabase
                .from('packaging_materials')
                .update({ quantity: packagingMaterial.quantity - quantity })
                .eq('id', itemId);
            }
          }
          break;
        
        case 'semi_finished':
          if (type === 'in') {
            // زيادة كمية المنتج نصف المصنع
            await inventoryService.addSemiFinishedToInventory(itemId.toString(), quantity);
          } else { // type === 'out'
            // خفض كمية المنتج نصف المصنع
            await inventoryService.removeSemiFinishedFromInventory(itemId.toString(), quantity);
          }
          break;
        
        case 'finished_products':
          if (type === 'in') {
            const { data: finishedProduct } = await supabase
              .from('finished_products')
              .select('quantity')
              .eq('id', itemId)
              .single();
            
            if (finishedProduct) {
              await supabase
                .from('finished_products')
                .update({ quantity: finishedProduct.quantity + quantity })
                .eq('id', itemId);
            }
          } else { // type === 'out'
            const { data: finishedProduct } = await supabase
              .from('finished_products')
              .select('quantity')
              .eq('id', itemId)
              .single();
            
            if (finishedProduct && finishedProduct.quantity >= quantity) {
              await supabase
                .from('finished_products')
                .update({ quantity: finishedProduct.quantity - quantity })
                .eq('id', itemId);
            } else {
              // إذا لم تكن الكمية المتاحة كافية للصرف
              toast.error('كمية المنتج المتاحة غير كافية');
              return false;
            }
          }
          break;
      }
    }
    
    toast.success(
      movement.type === 'in' 
        ? 'تم تسجيل وارد مخزون جديد بنجاح' 
        : 'تم تسجيل صادر مخزون جديد بنجاح'
    );
    
    return true;
  } catch (error) {
    console.error("Error creating manual inventory movement:", error);
    
    toast.error(
      movement.type === 'in' 
        ? 'حدث خطأ أثناء تسجيل وارد مخزون جديد' 
        : 'حدث خطأ أثناء تسجيل صادر مخزون جديد'
    );
    
    return false;
  }
}
