
import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSidebar } from './SidebarContext';
import ModernSidebar from './ModernSidebar';
import Navbar from './Navbar';

export const Layout = () => {
  const { isOpen } = useSidebar();

  return (
    <div className="flex min-h-screen bg-background">
      <ModernSidebar />
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out`}>
        <Navbar />
        <main className="flex-1 container mx-auto px-4 pt-20 pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
