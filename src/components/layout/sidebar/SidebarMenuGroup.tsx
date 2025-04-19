import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

export interface SidebarMenuItem {
  title: string;
  icon?: LucideIcon;
  path: string;
  active?: boolean;
  children?: SidebarMenuItem[];
  badge?: string;
  submenu?: SidebarMenuItem[];
}

interface SidebarMenuGroupProps {
  title: string;
  items: SidebarMenuItem[];
  isActive?: (path: string) => boolean;
}

const SidebarMenuGroup: React.FC<SidebarMenuGroupProps> = ({ title, items, isActive }) => {
  // Detect sidebar collapsed state for tooltip
  const isCollapsed = document.body.classList.contains('sidebar-collapsed'); // fallback, ideally from context
  return (
    <div className="pb-7">
      <h3 className="text-xs font-medium text-muted-foreground px-5 py-2">
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((item) => {
          const active = isActive && isActive(item.path);
          const hasSubmenu = item.submenu && item.submenu.length > 0;
          const itemContent = (
            <>
              <span className="relative flex items-center gap-4 pr-1">
                {item.icon && <item.icon className="h-5 w-5 text-primary/80" />}
                <span className="truncate text-base font-normal pl-1">{item.title}</span>
                {item.badge && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary text-white text-xs px-2 min-w-[20px] h-5 animate-bounce">
                    {item.badge}
                  </span>
                )}
                {active && (
                  <span className="absolute left-[-12px] h-7 w-1.5 rounded bg-primary transition-all duration-200" />
                )}
              </span>
              {hasSubmenu && (
                <ul className="mt-2 ml-8 space-y-1 border-r-2 border-primary/20 pr-3">
                  {item.submenu!.map((sub) => (
                    <li key={sub.path} className={`flex items-center gap-3 text-sm py-1 pl-2 pr-2 rounded-md transition-colors duration-200 hover:bg-accent/60 ${isActive && isActive(sub.path) ? 'bg-accent text-accent-foreground border-r-4 border-primary' : 'text-foreground/80'}`}>
                      {sub.icon && <sub.icon className="h-4 w-4 text-primary/80" />}
                      <span className="truncate pl-1">{sub.title}</span>
                      {sub.badge && (
                        <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary text-white text-xs px-2 min-w-[18px] h-4 animate-bounce">
                          {sub.badge}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          );
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center px-5 py-2 text-base hover:bg-accent/80 ${active ? 'bg-accent text-accent-foreground font-bold' : 'text-foreground/80'} transition-colors duration-200 rounded-md relative`}
              style={{ minHeight: 44 }}
            >
              {isCollapsed ? (
                <span className="w-full flex justify-center">
                  {/* Tooltip for collapsed sidebar */}
                  <span title={item.title} className="cursor-pointer">
                    {item.icon && <item.icon className="h-5 w-5" />}
                  </span>
                </span>
              ) : itemContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default SidebarMenuGroup;
