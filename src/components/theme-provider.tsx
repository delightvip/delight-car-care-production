
"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

type Theme = "dark" | "light" | "system"

interface ThemeProviderContextProps {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderContextProps | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  
  if (!context) {
    // Use next-themes directly if our context is not available
    const { theme, setTheme } = useNextTheme()
    return {
      theme: (theme as Theme) || 'system',
      setTheme: (value: Theme) => setTheme(value)
    }
  }
  
  return context
}

// Add import for next-themes at the top of the file to use it as a fallback
import { useTheme as useNextTheme } from "next-themes"

export interface UseThemeReturn {
  theme: string | undefined;
  setTheme: (theme: string) => void;
}
