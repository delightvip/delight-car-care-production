
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// Add the useTheme hook to match the import in other files
export const useTheme = () => {
  // Import the useTheme hook from next-themes and re-export it
  const { theme, setTheme } = React.useState<string>("system")
  
  // Since we're using next-themes, we should import its hook properly
  const nextThemesHook = React.useContext(
    // @ts-ignore - Using the internal context from next-themes
    require('next-themes').ThemeContext
  )
  
  // If the context exists, return it, otherwise return the default state
  return nextThemesHook || { theme, setTheme }
}
