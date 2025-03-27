
import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { ModeToggle } from '@/components/mode-toggle';

export function NavbarUserProfile() {
  return (
    <div className="flex items-center gap-3">
      <Button 
        variant="ghost" 
        size="icon"
        className="hover:bg-muted/80 transition-colors"
        asChild
      >
        <Link to="/settings">
          <Settings className="h-5 w-5" />
          <span className="sr-only">الإعدادات</span>
        </Link>
      </Button>
      
      <Separator orientation="vertical" className="h-8" />
      
      <ModeToggle />
    </div>
  );
}
