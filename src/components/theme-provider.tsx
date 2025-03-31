
"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

// Import next-themes at the top to avoid issues
import { useTheme as useNextTheme } from "next-themes"

type Theme = "dark" | "light" | "system"

interface ThemeProviderContextProps {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderContextProps | undefined>(undefined)

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('system')
  
  // Update our state when the theme changes via next-themes
  const { theme: nextTheme, setTheme: setNextTheme } = useNextTheme()
  
  useEffect(() => {
    if (nextTheme) {
      setTheme(nextTheme as Theme)
    }
  }, [nextTheme])
  
  // Create a provider value with our state and methods
  const value = {
    theme: theme as Theme,
    setTheme: (newTheme: Theme) => {
      setNextTheme(newTheme)
      setTheme(newTheme)
      console.log("Theme changed to:", newTheme);  // Log theme changes
    }
  }
  
  return (
    <ThemeProviderContext.Provider value={value}>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </ThemeProviderContext.Provider>
  )
}

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

export interface UseThemeReturn {
  theme: string | undefined;
  setTheme: (theme: string) => void;
}
