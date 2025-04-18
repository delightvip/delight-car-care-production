"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"
import { useLocalStorage } from "@/hooks/use-local-storage"

type Theme = "dark" | "light" | "system" | "blue" | "green"

interface ThemeProviderContextProps {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderContextProps | undefined>(undefined)

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [storedTheme, setStoredTheme] = useLocalStorage<Theme>("app-theme", "light")
  const [theme, setThemeState] = useState<Theme>(storedTheme)
  
  // Apply theme to document when component mounts or theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'blue', 'green');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);
  
  // Create a provider value with our state and methods
  const value = {
    theme: theme as Theme,
    setTheme: (newTheme: Theme) => {
      setThemeState(newTheme)
      setStoredTheme(newTheme)
      console.log("Theme changed to:", newTheme)  // Log theme changes
    }
  }
  
  return (
    <ThemeProviderContext.Provider value={value}>
      <NextThemesProvider {...props} defaultTheme={theme} enableSystem>{children}</NextThemesProvider>
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  
  return context
}
