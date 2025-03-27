
import React from 'react';
import { SidebarTrigger } from "@/components/layout/SidebarContext";
import { NavbarUserProfile } from './NavbarUserProfile';
import { NavbarNotifications } from './NavbarNotifications';
import NavbarBranding from './navbar/NavbarBranding';

const Navbar = () => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-20 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <NavbarBranding />
      </div>
      
      <div className="flex items-center gap-3">
        <NavbarNotifications />
        <NavbarUserProfile />
      </div>
    </header>
  );
};

export default Navbar;
