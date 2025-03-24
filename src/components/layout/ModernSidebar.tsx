
import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useAppSidebar } from '@/components/layout/SidebarContext';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

const ModernSidebar: React.FC = () => {
  const { isOpen, toggle } = useAppSidebar();

  return (
    <>
      <Sidebar />
      {/* Mobile menu button for sidebar */}
      <div className="fixed bottom-4 right-4 md:hidden z-50">
        <Button
          onClick={toggle}
          variant="default"
          size="icon"
          className="rounded-full shadow-lg"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </>
  );
};

export default ModernSidebar;
