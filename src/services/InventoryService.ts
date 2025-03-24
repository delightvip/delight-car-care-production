
import { toast } from "sonner";

// أنواع البيانات للمواد المختلفة
export interface RawMaterial {
  code: string;
  name: string;
  quantity: number;
  minStock: number;
  unit: string;
  unitCost: number;
}

export interface SemiFinishedProduct {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  ingredients: {
    id: number;
    code: string;
    name: string;
    percentage: number;
  }[];
  unitCost: number;
  minStock: number;
}

export interface FinishedProduct {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  semiFinished: {
    code: string;
    name: string;
    quantity: number;
  };
  packaging: {
    code: string;
    name: string;
    quantity: number;
  }[];
  unitCost: number;
  minStock: number;
}

export interface PackagingMaterial {
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  minStock: number;
}

// الفئة الخدمية للمخزون
class InventoryService {
  private static instance: InventoryService;
  
  // بيانات موقتة للمخزون (في الإنتاج الحقيقي ستأتي من قاعدة البيانات)
  private rawMaterials: RawMaterial[] = [
    { code: 'RAW-00001', name: 'كحول إيثيلي', quantity: 40, minStock: 50, unit: 'لتر', unitCost: 50 },
    { code: 'RAW-00002', name: 'عطر ليمون', quantity: 5, minStock: 15, unit: 'لتر', unitCost: 120 },
    { code: 'RAW-00003', name: 'جليسرين', quantity: 18, minStock: 20, unit: 'لتر', unitCost: 80 },
    { code: 'RAW-00004', name: 'صبغة زرقاء', quantity: 15, minStock: 5, unit: 'كجم', unitCost: 200 },
    { code: 'RAW-00005', name: 'زيت سيليكون', quantity: 45, minStock: 20, unit: 'لتر', unitCost: 65 }
  ];
  
  private semiFinishedProducts: SemiFinishedProduct[] = [
    {
      id: 1,
      code: 'SEMI-00001',
      name: 'ملمع تابلوه سائل',
      quantity: 30,
      unit: 'لتر',
      ingredients: [
        { id: 1, code: 'RAW-00005', name: 'زيت سيليكون', percentage: 30 },
        { id: 2, code: 'RAW-00002', name: 'عطر ليمون', percentage: 5 },
        { id: 3, code: 'RAW-00001', name: 'كحول إيثيلي', percentage: 15 }
      ],
      unitCost: 40,
      minStock: 20
    },
    {
      id: 2,
      code: 'SEMI-00002',
      name: 'منظف زجاج سائل',
      quantity: 25,
      unit: 'لتر',
      ingredients: [
        { id: 3, code: 'RAW-00001', name: 'كحول إيثيلي', percentage: 20 },
        { id: 4, code: 'RAW-00004', name: 'صبغة زرقاء', percentage: 1 }
      ],
      unitCost: 30,
      minStock: 15
    }
  ];
  
  private packagingMaterials: PackagingMaterial[] = [
    { code: 'PKG-00001', name: 'عبوة بلاستيك 1 لتر', quantity: 200, unit: 'قطعة', unitCost: 5, minStock: 100 },
    { code: 'PKG-00002', name: 'عبوة بلاستيك 500 مل', quantity: 150, unit: 'قطعة', unitCost: 3, minStock: 80 },
    { code: 'PKG-00003', name: 'غطاء بلاستيك', quantity: 350, unit: 'قطعة', unitCost: 1, minStock: 200 },
    { code: 'PKG-00004', name: 'ملصق منتج', quantity: 500, unit: 'قطعة', unitCost: 0.5, minStock: 250 }
  ];
  
  private finishedProducts: FinishedProduct[] = [
    {
      id: 1,
      code: 'FIN-00001',
      name: 'ملمع تابلوه 1 لتر',
      quantity: 20,
      unit: 'قطعة',
      semiFinished: {
        code: 'SEMI-00001',
        name: 'ملمع تابلوه سائل',
        quantity: 1
      },
      packaging: [
        { code: 'PKG-00001', name: 'عبوة بلاستيك 1 لتر', quantity: 1 },
        { code: 'PKG-00003', name: 'غطاء بلاستيك', quantity: 1 },
        { code: 'PKG-00004', name: 'ملصق منتج', quantity: 1 }
      ],
      unitCost: 50,
      minStock: 10
    }
  ];
  
  private constructor() {}
  
  // الحصول على كائن وحيد من الخدمة (نمط Singleton)
  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }
  
  // الحصول على جميع المواد الأولية
  public getRawMaterials(): RawMaterial[] {
    return [...this.rawMaterials];
  }
  
  // الحصول على جميع المنتجات النصف مصنعة
  public getSemiFinishedProducts(): SemiFinishedProduct[] {
    return [...this.semiFinishedProducts];
  }
  
  // الحصول على جميع مواد التعبئة
  public getPackagingMaterials(): PackagingMaterial[] {
    return [...this.packagingMaterials];
  }
  
  // الحصول على جميع المنتجات النهائية
  public getFinishedProducts(): FinishedProduct[] {
    return [...this.finishedProducts];
  }
  
  // الحصول على المواد ذات المخزون المنخفض
  public getLowStockItems() {
    const lowStockRaw = this.rawMaterials.filter(item => item.quantity <= item.minStock)
      .map(item => ({ ...item, type: 'rawMaterial' as const }));
    
    const lowStockSemi = this.semiFinishedProducts.filter(item => item.quantity <= item.minStock)
      .map(item => ({ ...item, type: 'semiFinished' as const }));
    
    const lowStockPackaging = this.packagingMaterials.filter(item => item.quantity <= item.minStock)
      .map(item => ({ ...item, type: 'packaging' as const }));
    
    const lowStockFinished = this.finishedProducts.filter(item => item.quantity <= item.minStock)
      .map(item => ({ ...item, type: 'finished' as const }));
    
    return [...lowStockRaw, ...lowStockSemi, ...lowStockPackaging, ...lowStockFinished];
  }
  
  // التحقق من توفر المواد الأولية
  public checkRawMaterialsAvailability(requirements: { code: string, requiredQuantity: number }[]): boolean {
    for (const req of requirements) {
      const material = this.rawMaterials.find(m => m.code === req.code);
      if (!material || material.quantity < req.requiredQuantity) {
        return false;
      }
    }
    return true;
  }
  
  // التحقق من توفر المنتجات النصف مصنعة
  public checkSemiFinishedAvailability(code: string, requiredQuantity: number): boolean {
    const product = this.semiFinishedProducts.find(p => p.code === code);
    return !!product && product.quantity >= requiredQuantity;
  }
  
  // التحقق من توفر مواد التعبئة
  public checkPackagingAvailability(requirements: { code: string, requiredQuantity: number }[]): boolean {
    for (const req of requirements) {
      const material = this.packagingMaterials.find(m => m.code === req.code);
      if (!material || material.quantity < req.requiredQuantity) {
        return false;
      }
    }
    return true;
  }
  
  // استهلاك المواد الأولية لإنتاج منتج نصف مصنع
  public consumeRawMaterials(requirements: { code: string, requiredQuantity: number }[]): boolean {
    // التحقق من التوفر أولاً
    if (!this.checkRawMaterialsAvailability(requirements)) {
      toast.error('المواد الأولية غير متوفرة بالكميات المطلوبة');
      return false;
    }
    
    // استهلاك المواد
    for (const req of requirements) {
      const material = this.rawMaterials.find(m => m.code === req.code);
      if (material) {
        material.quantity -= req.requiredQuantity;
      }
    }
    
    toast.success('تم استهلاك المواد الأولية بنجاح');
    return true;
  }
  
  // إضافة منتج نصف مصنع للمخزون
  public addSemiFinishedToInventory(code: string, quantity: number): boolean {
    const product = this.semiFinishedProducts.find(p => p.code === code);
    if (!product) {
      toast.error('المنتج النصف مصنع غير موجود');
      return false;
    }
    
    product.quantity += quantity;
    toast.success(`تمت إضافة ${quantity} ${product.unit} من ${product.name} للمخزون`);
    return true;
  }
  
  // استهلاك منتج نصف مصنع ومواد تعبئة لإنتاج منتج نهائي
  public produceFinishedProduct(
    finishedProductCode: string,
    quantity: number,
    semiFinishedCode: string,
    semiFinishedQuantity: number,
    packagingRequirements: { code: string, requiredQuantity: number }[]
  ): boolean {
    // التحقق من توفر المنتج النصف مصنع
    if (!this.checkSemiFinishedAvailability(semiFinishedCode, semiFinishedQuantity * quantity)) {
      toast.error('المنتج النصف مصنع غير متوفر بالكمية المطلوبة');
      return false;
    }
    
    // التحقق من توفر مواد التعبئة
    const totalPackagingReqs = packagingRequirements.map(req => ({
      code: req.code,
      requiredQuantity: req.requiredQuantity * quantity
    }));
    
    if (!this.checkPackagingAvailability(totalPackagingReqs)) {
      toast.error('مواد التعبئة غير متوفرة بالكميات المطلوبة');
      return false;
    }
    
    // استهلاك المنتج النصف مصنع
    const semiFinished = this.semiFinishedProducts.find(p => p.code === semiFinishedCode);
    if (semiFinished) {
      semiFinished.quantity -= semiFinishedQuantity * quantity;
    }
    
    // استهلاك مواد التعبئة
    for (const req of totalPackagingReqs) {
      const material = this.packagingMaterials.find(m => m.code === req.code);
      if (material) {
        material.quantity -= req.requiredQuantity;
      }
    }
    
    // إضافة المنتج النهائي للمخزون
    const finishedProduct = this.finishedProducts.find(p => p.code === finishedProductCode);
    if (finishedProduct) {
      finishedProduct.quantity += quantity;
    }
    
    toast.success(`تم إنتاج ${quantity} وحدة من المنتج النهائي بنجاح`);
    return true;
  }
  
  // الحصول على بيانات للرسم البياني لتوزيع المخزون
  public getInventoryDistributionData() {
    const rawMaterialsValue = this.rawMaterials.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    const semiFinishedValue = this.semiFinishedProducts.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    const packagingValue = this.packagingMaterials.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    const finishedProductsValue = this.finishedProducts.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    
    return [
      { name: 'المواد الأولية', value: rawMaterialsValue },
      { name: 'المنتجات النصف مصنعة', value: semiFinishedValue },
      { name: 'مواد التعبئة', value: packagingValue },
      { name: 'المنتجات النهائية', value: finishedProductsValue }
    ];
  }
  
  // الحصول على إحصائيات عامة للمخزون
  public getInventoryStats() {
    const totalRawMaterials = this.rawMaterials.length;
    const totalSemiFinished = this.semiFinishedProducts.length;
    const totalPackaging = this.packagingMaterials.length;
    const totalFinished = this.finishedProducts.length;
    
    const lowStockItems = this.getLowStockItems().length;
    
    const totalValue = 
      this.rawMaterials.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0) +
      this.semiFinishedProducts.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0) +
      this.packagingMaterials.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0) +
      this.finishedProducts.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    
    return {
      totalItems: totalRawMaterials + totalSemiFinished + totalPackaging + totalFinished,
      lowStockItems,
      totalValue,
      categories: {
        rawMaterials: totalRawMaterials,
        semiFinished: totalSemiFinished,
        packaging: totalPackaging,
        finished: totalFinished
      }
    };
  }
}

export default InventoryService;
