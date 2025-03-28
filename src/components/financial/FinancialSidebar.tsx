
import React from 'react';
import { NavLink } from 'react-router-dom';
import { DollarSign, CreditCard, Tags, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarLinkProps {
  to: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon: Icon, title }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        'flex items-center py-2 px-4 my-1 rounded-md hover:bg-muted transition-colors',
        isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'
      )
    }
  >
    <Icon className="h-5 w-5 mr-3" />
    <span>{title}</span>
  </NavLink>
);

export const FinancialSidebar: React.FC = () => {
  return (
    <div className="w-64 border-l h-full p-4">
      <h3 className="font-bold text-lg mb-4 flex items-center">
        <DollarSign className="h-5 w-5 mr-2" /> الإدارة المالية
      </h3>
      <div className="space-y-1">
        <SidebarLink to="/financial" icon={LayoutDashboard} title="لوحة التحكم المالية" />
        <SidebarLink to="/financial/transactions/new" icon={CreditCard} title="معاملة جديدة" />
        <SidebarLink to="/financial/categories" icon={Tags} title="فئات المعاملات" />
      </div>
    </div>
  );
};

export default FinancialSidebar;
