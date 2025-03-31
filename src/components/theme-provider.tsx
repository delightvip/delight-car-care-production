
"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"
import { useLocalStorage } from "@/hooks/use-local-storage"

type Theme = "dark" | "light" | "system"

interface ThemeProviderContextProps {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderContextProps | undefined>(undefined)

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [storedTheme, setStoredTheme] = useLocalStorage<Theme>("app-theme", "light")
  const [theme, setThemeState] = useState<Theme>(storedTheme)
  
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
      <NextThemesProvider {...props} defaultTheme={theme}>{children}</NextThemesProvider>
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
