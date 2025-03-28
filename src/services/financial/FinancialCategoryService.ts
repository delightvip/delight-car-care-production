
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Category } from "./FinancialTypes";

/**
 * خدمة مخصصة للتعامل مع فئات المعاملات المالية
 */
class FinancialCategoryService {
  private static instance: FinancialCategoryService;
  
  private constructor() {}
  
  public static getInstance(): FinancialCategoryService {
    if (!FinancialCategoryService.instance) {
      FinancialCategoryService.instance = new FinancialCategoryService();
    }
    return FinancialCategoryService.instance;
  }
  
  /**
   * الحصول على جميع الفئات المالية
   */
  public async getCategories(type?: 'income' | 'expense'): Promise<Category[]> {
    try {
      let query = supabase
        .from('financial_categories')
        .select('*')
        .order('name');
      
      if (type) {
        query = query.eq('type', type);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data as Category[];
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('حدث خطأ أثناء جلب فئات المعاملات المالية');
      return [];
    }
  }
  
  /**
   * الحصول على فئة بواسطة المعرف
   */
  public async getCategoryById(id: string): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      return data as Category;
    } catch (error) {
      console.error('Error fetching category:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الفئة');
      return null;
    }
  }
  
  /**
   * إنشاء فئة جديدة
   */
  public async createCategory(categoryData: Omit<Category, 'id' | 'created_at'>): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .insert(categoryData)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      toast.success('تم إنشاء الفئة بنجاح');
      return data as Category;
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('حدث خطأ أثناء إنشاء الفئة');
      return null;
    }
  }
  
  /**
   * تحديث فئة
   */
  public async updateCategory(id: string, categoryData: Partial<Omit<Category, 'id' | 'created_at'>>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('financial_categories')
        .update(categoryData)
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      toast.success('تم تحديث الفئة بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('حدث خطأ أثناء تحديث الفئة');
      return false;
    }
  }
  
  /**
   * حذف فئة
   */
  public async deleteCategory(id: string): Promise<boolean> {
    try {
      // التحقق من عدم وجود معاملات مرتبطة بالفئة
      const { count, error: countError } = await supabase
        .from('financial_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id);
      
      if (countError) {
        throw countError;
      }
      
      if (count && count > 0) {
        toast.error('لا يمكن حذف الفئة لوجود معاملات مرتبطة بها');
        return false;
      }
      
      const { error } = await supabase
        .from('financial_categories')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      toast.success('تم حذف الفئة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('حدث خطأ أثناء حذف الفئة');
      return false;
    }
  }
  
  /**
   * الحصول على فئة افتراضية لنوع معاملة تجارية
   * هذه الوظيفة ستستخدم للربط مع موديول المعاملات التجارية
   */
  public async getDefaultCategoryForCommercialType(
    commercialType: string
  ): Promise<Category | null> {
    try {
      // تحديد نوع الفئة بناءً على نوع المعاملة التجارية
      let type: 'income' | 'expense';
      let nameIncludes: string;
      
      switch (commercialType) {
        case 'sale_invoice':
        case 'payment_collection':
          type = 'income';
          nameIncludes = commercialType === 'sale_invoice' ? 'مبيعات' : 'تحصيل';
          break;
        case 'purchase_invoice':
        case 'payment_disbursement':
          type = 'expense';
          nameIncludes = commercialType === 'purchase_invoice' ? 'مشتريات' : 'مدفوعات';
          break;
        default:
          console.error('Invalid commercial transaction type:', commercialType);
          return null;
      }
      
      // البحث عن فئة مناسبة
      const { data, error } = await supabase
        .from('financial_categories')
        .select('*')
        .eq('type', type)
        .ilike('name', `%${nameIncludes}%`)
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        return data[0] as Category;
      }
      
      // إذا لم يتم العثور على فئة مناسبة، ابحث عن أي فئة من نفس النوع
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('financial_categories')
        .select('*')
        .eq('type', type)
        .limit(1);
      
      if (fallbackError) {
        throw fallbackError;
      }
      
      if (fallbackData && fallbackData.length > 0) {
        return fallbackData[0] as Category;
      }
      
      // إذا لم يتم العثور على أي فئة، قم بإنشاء فئة افتراضية
      const defaultCategory = await this.createCategory({
        name: type === 'income' ? 'إيرادات تجارية' : 'مصروفات تجارية',
        type,
        description: 'فئة تم إنشاؤها تلقائيًا للمعاملات التجارية'
      });
      
      return defaultCategory;
    } catch (error) {
      console.error('Error finding default category for commercial type:', error);
      return null;
    }
  }
}

export default FinancialCategoryService;
