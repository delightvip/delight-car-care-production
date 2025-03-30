
import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

export interface SidebarMenuItem {
  title: string;
  icon: LucideIcon;
  path: string;
  active?: boolean;
  children?: SidebarMenuItem[];
}

interface SidebarMenuGroupProps {
  title: string;
  items: SidebarMenuItem[];
}

const SidebarMenuGroup: React.FC<SidebarMenuGroupProps> = ({ title, items }) => {
  return (
    <div className="pb-5">
      <h3 className="text-xs font-medium text-muted-foreground px-4 py-2">
        {title}
      </h3>
      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`group flex items-center px-4 py-2 text-sm hover:bg-accent/80 ${
              item.active ? 'bg-accent text-accent-foreground' : 'text-foreground/80'
            } group transition-colors rounded-md`}
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SidebarMenuGroup;
