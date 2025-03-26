
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

export interface UseThemeReturn {
  theme: string | undefined;
  setTheme: (theme: string) => void;
}

// Export the useTheme hook properly
export const useTheme = (): UseThemeReturn => {
  // Directly use the useTheme hook from next-themes
  const { theme, setTheme } = useNextTheme()
  
  return { 
    theme: theme as string | undefined, 
    setTheme 
  }
}
