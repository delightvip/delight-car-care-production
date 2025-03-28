
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Category } from './FinancialTypes';

/**
 * خدمة إدارة الفئات المالية
 */
class CategoryService {
  private static instance: CategoryService;
  
  private constructor() {}
  
  public static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService();
    }
    return CategoryService.instance;
  }
  
  /**
   * الحصول على جميع الفئات المالية
   */
  public async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return data as Category[];
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('حدث خطأ أثناء جلب الفئات المالية');
      return [];
    }
  }
  
  /**
   * الحصول على فئة مالية بواسطة المعرف
   * @param id معرف الفئة
   */
  public async getCategoryById(id: string): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      
      return data as Category;
    } catch (error) {
      console.error(`Error fetching category ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب الفئة المالية');
      return null;
    }
  }
  
  /**
   * إنشاء فئة مالية جديدة
   * @param categoryData بيانات الفئة
   */
  public async createCategory(categoryData: Omit<Category, 'id' | 'created_at'>): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .insert(categoryData)
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('تم إنشاء الفئة المالية بنجاح');
      return data as Category;
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('حدث خطأ أثناء إنشاء الفئة المالية');
      return null;
    }
  }
  
  /**
   * تحديث فئة مالية
   * @param id معرف الفئة
   * @param categoryData بيانات الفئة المحدثة
   */
  public async updateCategory(id: string, categoryData: Partial<Omit<Category, 'id' | 'created_at'>>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('financial_categories')
        .update(categoryData)
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تحديث الفئة المالية بنجاح');
      return true;
    } catch (error) {
      console.error(`Error updating category ${id}:`, error);
      toast.error('حدث خطأ أثناء تحديث الفئة المالية');
      return false;
    }
  }
  
  /**
   * حذف فئة مالية
   * @param id معرف الفئة
   */
  public async deleteCategory(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('financial_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف الفئة المالية بنجاح');
      return true;
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error);
      toast.error('حدث خطأ أثناء حذف الفئة المالية');
      return false;
    }
  }
}

export default CategoryService;
