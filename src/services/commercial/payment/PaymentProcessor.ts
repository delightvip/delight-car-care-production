import { toast } from 'sonner';

interface PaymentData {
  id: string;
  amount?: number;
  method?: string;
}

class PaymentProcessor {
  private static instance: PaymentProcessor;
  
  private constructor() {
    // Private constructor to enforce singleton pattern
  }
  
  public static getInstance(): PaymentProcessor {
    if (!PaymentProcessor.instance) {
      PaymentProcessor.instance = new PaymentProcessor();
    }
    return PaymentProcessor.instance;
  }
  
  // Process a payment
  public async processPayment(paymentData: PaymentData): Promise<boolean> {
    try {
      // التحقق من وجود معرف للدفع
      if (!paymentData.id) {
        console.error("Missing payment ID");
        return false;
      }
      
      // التحقق من البيانات إذا كانت موجودة
      if (paymentData.amount && paymentData.method) {
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if payment is valid
        if (!this.validatePayment(paymentData)) {
          console.error("Payment data is invalid:", paymentData);
          return false;
        }
      } else {
        console.warn("Incomplete payment data provided:", paymentData);
      }
      
      // Process the payment
      const success = Math.random() > 0.1; // 90% success rate for simulation
      
      return success;
    } catch (error) {
      console.error("Payment processing error:", error);
      return false;
    }
  }
  
  // Validate payment data
  private validatePayment(paymentData: PaymentData): boolean {
    // يمكن أن نتحقق فقط من البيانات المتاحة
    if (paymentData.amount !== undefined) {
      // Check if amount is positive
      if (paymentData.amount <= 0) {
        console.error("Invalid payment amount:", paymentData.amount);
        return false;
      }
    }
    
    if (paymentData.method) {
      // Check if payment method is supported
      const supportedMethods = ['cash', 'bank_transfer', 'check', 'other'];
      if (!supportedMethods.includes(paymentData.method)) {
        console.error("Unsupported payment method:", paymentData.method);
        return false;
      }
    }
    
    return true;
  }
  
  // Void a payment
  public async voidPayment(paymentId: string): Promise<boolean> {
    try {
      if (!paymentId) {
        console.error("Missing payment ID for void operation");
        return false;
      }
      
      // Simulate API call to void payment
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // 95% success rate for simulation
      const success = Math.random() > 0.05;
      
      return success;
    } catch (error) {
      console.error("Payment voiding error:", error);
      return false;
    }
  }
  
  // Get payment methods
  public getPaymentMethods(): string[] {
    return ['نقدي', 'تحويل بنكي', 'شيك', 'بطاقة ائتمان'];
  }
  
  // Get payment status
  public async getPaymentStatus(paymentId: string): Promise<string> {
    try {
      // Simulate API call to get payment status
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Random status for simulation
      const statuses = ['completed', 'pending', 'failed', 'refunded'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      return randomStatus;
    } catch (error) {
      console.error("Error getting payment status:", error);
      return 'unknown';
    }
  }
}

export default PaymentProcessor;
