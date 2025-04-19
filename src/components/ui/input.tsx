import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // تصميم عصري خاص للبحث: حواف دائرية جدًا، ارتفاع صغير، عرض تلقائي، ظل خفيف، خط عصري
          type === 'search'
            ? "flex h-8 max-w-[220px] rounded-full border border-input bg-background px-4 py-1 text-[11px] font-semibold font-[Cairo,Inter,Segoe UI,Arial,sans-serif] ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 transition-all duration-150 shadow-sm"
            : "flex h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-[11px] font-semibold font-[Cairo,Inter,Segoe UI,Arial,sans-serif] ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150 md:text-xs shadow-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
