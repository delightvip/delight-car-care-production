
import { toast } from "sonner";

/**
 * أداة مساعدة للتعامل مع الأخطاء بشكل موحد عبر التطبيق
 */
export class ErrorHandler {
  /**
   * معالجة خطأ مع عرض رسالة للمستخدم
   * @param error الخطأ المراد معالجته
   * @param context سياق الخطأ
   * @param userMessage رسالة للمستخدم النهائي
   */
  public static handleError(error: unknown, context: string, userMessage: string): void {
    console.error(`Error in ${context}:`, error);
    toast.error(userMessage);
  }

  /**
   * لف أي وظيفة بمعالج أخطاء موحد
   * @param operation العملية المراد تنفيذها
   * @param context سياق العملية
   * @param errorMessage رسالة الخطأ للمستخدم
   * @returns وعد يتم حله بنتيجة العملية أو قيمة افتراضية
   */
  public static async wrapOperation<T>(
    operation: () => Promise<T>,
    context: string,
    errorMessage: string,
    defaultValue?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, context, errorMessage);
      return defaultValue;
    }
  }
}
