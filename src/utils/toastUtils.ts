
import { toast as sonnerToast } from 'sonner';

// This utility helps with compatibility between different toast APIs
export const toast = {
  // Basic toast method
  message: (message: string) => sonnerToast(message),
  
  // Success variant
  success: (message: string) => sonnerToast.success(message),
  
  // Error variant
  error: (message: string) => sonnerToast.error(message),
  
  // Warning variant
  warning: (message: string) => sonnerToast.warning(message),
  
  // Info variant
  info: (message: string) => sonnerToast.info(message),
  
  // Legacy API compatibility - converts older format to newer format
  // This can handle the incorrect usage: toast({ title: "message", variant: "success" })
  legacy: (options: any) => {
    if (options.variant === 'success') {
      return sonnerToast.success(options.title || options.message);
    } else if (options.variant === 'error') {
      return sonnerToast.error(options.title || options.message);
    } else if (options.variant === 'warning') {
      return sonnerToast.warning(options.title || options.message);
    } else if (options.variant === 'info') {
      return sonnerToast.info(options.title || options.message);
    } else {
      return sonnerToast(options.title || options.message);
    }
  }
};
