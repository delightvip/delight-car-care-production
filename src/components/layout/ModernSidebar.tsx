import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useSidebar } from '@/components/ui/sidebar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

const ModernSidebar: React.FC = () => {
  const { isOpen, toggleSidebar } = useSidebar();

  return (
    <>
      <Sidebar />
    </>
  );
};

export default ModernSidebar;
