
/**
 * أداة مساعدة لتنفيذ العمليات غير المتزامنة بشكل آمن
 * تستخدم لتجنب تجميد واجهة المستخدم أثناء العمليات الطويلة
 */

/**
 * تنفيذ عملية غير متزامنة في الخلفية
 * @param operation العملية المراد تنفيذها
 * @returns وعد يتم حله بنتيجة العملية
 */
export const runAsyncOperation = <T>(operation: () => Promise<T>): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    // استخدام setTimeout لتنفيذ العملية في دورة أحداث منفصلة
    setTimeout(async () => {
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        console.error('Error in async operation:', error);
        reject(error);
      }
    }, 10); // تأخير بسيط لضمان عدم تجميد واجهة المستخدم
  });
};

/**
 * حماية العمليات المتزامنة من خلال قفل نوع العملية
 */
class OperationLocks {
  private static locks: Map<string, boolean> = new Map();

  /**
   * محاولة قفل نوع عملية معين
   * @param operationType نوع العملية المراد قفلها
   * @returns true إذا تم القفل بنجاح، false إذا كانت العملية مقفلة بالفعل
   */
  public static acquireLock(operationType: string): boolean {
    if (this.locks.get(operationType)) {
      return false;
    }
    this.locks.set(operationType, true);
    return true;
  }

  /**
   * إلغاء قفل نوع عملية معين
   * @param operationType نوع العملية المراد إلغاء قفلها
   */
  public static releaseLock(operationType: string): void {
    this.locks.set(operationType, false);
  }

  /**
   * تنفيذ عملية مع حماية التزامن
   * @param operationType نوع العملية للقفل
   * @param operation العملية المراد تنفيذها
   * @returns وعد يتم حله بنتيجة العملية أو رفضه إذا كانت العملية مقفلة
   */
  public static async runWithLock<T>(operationType: string, operation: () => Promise<T>): Promise<T> {
    if (!this.acquireLock(operationType)) {
      return Promise.reject(new Error(`Operation of type ${operationType} is already in progress`));
    }

    try {
      return await operation();
    } finally {
      this.releaseLock(operationType);
    }
  }
}

export { OperationLocks };
