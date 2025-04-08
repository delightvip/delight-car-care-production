
import React from 'react';
import { cn } from '@/lib/utils';
import { useSidebar } from './SidebarContext';
import SidebarBranding from './sidebar/SidebarBranding';
import SidebarMenu from './sidebar/SidebarMenu';

const Sidebar = () => {
  const { isOpen, isMobile, setOpenMobile } = useSidebar();
  
  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setOpenMobile(false)}
        />
      )}
      
      {/* Sidebar wrapper */}
      <aside
        className={cn(
          "fixed top-0 z-50 h-full border-l bg-card shadow-lg transition-all duration-300 ease-in-out",
          isOpen ? "w-64" : "w-0 overflow-hidden",
          isMobile ? "right-0" : "right-0"
        )}
      >
        <nav className="flex h-full flex-col">
          <SidebarBranding 
            brandName="نظام إدارة المصنع" 
            brandVersion="1.0"
          />
          
          <div className="flex-1 overflow-auto">
            <SidebarMenu isCollapsed={!isOpen} />
          </div>
          
          <div className="border-t py-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div>
                  <p className="text-sm font-medium">المستخدم</p>
                  <p className="text-xs text-muted-foreground">مدير النظام</p>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
