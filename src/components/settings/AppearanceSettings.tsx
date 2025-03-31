
import React, { useState, useEffect } from 'react';
import { useTheme } from '@/components/theme-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sun, Moon, MonitorSmartphone, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">المظهر</CardTitle>
        <CardDescription>
          قم بتخصيص مظهر التطبيق حسب تفضيلاتك
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col space-y-1">
            <Label className="text-base font-medium">السمة</Label>
            <p className="text-sm text-muted-foreground">
              اختر سمة التطبيق المفضلة لديك
            </p>
          </div>
          <RadioGroup 
            defaultValue={theme} 
            className="grid grid-cols-3 gap-4"
            onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
          >
            <div>
              <RadioGroupItem 
                value="light" 
                id="light" 
                className="sr-only peer" 
              />
              <Label 
                htmlFor="light" 
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <Sun className="mb-3 h-6 w-6" />
                <span>فاتح</span>
                {theme === 'light' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 text-primary"
                  >
                    <Check size={18} />
                  </motion.div>
                )}
              </Label>
            </div>
            <div>
              <RadioGroupItem 
                value="dark" 
                id="dark" 
                className="sr-only peer" 
              />
              <Label 
                htmlFor="dark" 
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <Moon className="mb-3 h-6 w-6" />
                <span>داكن</span>
                {theme === 'dark' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 text-primary"
                  >
                    <Check size={18} />
                  </motion.div>
                )}
              </Label>
            </div>
            <div>
              <RadioGroupItem 
                value="system" 
                id="system" 
                className="sr-only peer" 
              />
              <Label 
                htmlFor="system" 
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <MonitorSmartphone className="mb-3 h-6 w-6" />
                <span>تلقائي</span>
                {theme === 'system' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 text-primary"
                  >
                    <Check size={18} />
                  </motion.div>
                )}
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
