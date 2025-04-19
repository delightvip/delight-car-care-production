import React, { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import ColorThemePicker from '@/components/ColorThemePicker';

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  
  // Log current theme for debugging
  useEffect(() => {
    console.log("Mode Toggle - Current theme:", theme);
  }, [theme]);
  
  // This ensures the document's class reflects the current theme
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-muted/80 transition-colors">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          <span>فاتح</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          <span>داكن</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("blue")}>
          <span className="mr-2 h-4 w-4 inline-block rounded-full bg-blue-500 border border-blue-700"></span>
          <span>أزرق</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("green")}>
          <span className="mr-2 h-4 w-4 inline-block rounded-full bg-green-500 border border-green-700"></span>
          <span>أخضر</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <span>تلقائي</span>
        </DropdownMenuItem>
        <div style={{ padding: '8px 4px', borderTop: '1px solid #eee', marginTop: 6 }}>
          <ColorThemePicker />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
