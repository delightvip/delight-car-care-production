
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
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  
  return context
}

export interface UseThemeReturn {
  theme: string | undefined;
  setTheme: (theme: string) => void;
}
