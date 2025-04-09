
import { toast } from 'sonner';

interface ErrorDetails {
  message: string;
  details?: string;
  code?: string;
}

/**
 * Enhanced toast that provides more detailed error information
 */
export const enhancedToast = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description: description,
      duration: 3000,
    });
  },
  
  error: (error: string | Error | ErrorDetails) => {
    if (typeof error === 'string') {
      toast.error(error);
      return;
    }
    
    let message: string;
    let description: string | undefined;
    
    if ('message' in error && typeof error.message === 'string') {
      message = error.message;
      
      // Handle Supabase specific error formats
      if (error.message.includes('duplicate key value violates unique constraint')) {
        message = "خطأ: هناك عنصر موجود بالفعل بنفس الكود";
        description = "يرجى التحقق من الكود المستخدم أو التواصل مع المسؤول لحل المشكلة.";
      }
      
      // Add more detailed descriptions for common errors
      if ('code' in error && error.code === '23505') {
        message = "خطأ: هناك عنصر موجود بالفعل بنفس الكود";
        description = "تم محاولة إنشاء عنصر بكود موجود بالفعل. يرجى التحقق من البيانات.";
      }
      
      if ('details' in error && error.details) {
        description = error.details;
      }
    } else {
      message = "حدث خطأ غير متوقع";
    }
    
    toast.error(message, {
      description: description,
      duration: 5000,
    });
  },
  
  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description: description,
      duration: 4000,
    });
  },
  
  info: (message: string, description?: string) => {
    toast.info(message, {
      description: description,
      duration: 3000,
    });
  },
  
  // New method for report-specific toasts
  report: (message: string, description?: string) => {
    toast(message, {
      description: description,
      duration: 3000,
      icon: '📊',
    });
  }
};
