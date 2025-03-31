import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

import {
  HomeIcon,
  LayoutDashboard,
  PackageIcon,
  FactoryIcon,
  ShoppingCart,
  Users,
  Coins,
  FileText,
  BookOpenCheck,
  TrendingUp,
} from "lucide-react";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ href, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={href}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground",
          isActive
            ? "bg-secondary text-foreground"
            : "text-muted-foreground"
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

interface SidebarMenuGroupProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SidebarMenuGroup({ title, icon, children }: SidebarMenuGroupProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <li>
        <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&[data-state=open]]:bg-secondary [&[data-state=open]]:text-foreground">
          <div className="flex items-center gap-2">
            {icon}
            {title}
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 shrink-0 transition-transform duration-200" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-1">
          <ul className="pl-4">{children}</ul>
        </CollapsibleContent>
      </li>
    </Collapsible>
  );
}

function SidebarMenu() {
  return (
    <div className="ps-2 pe-3 py-4 flex flex-col gap-1">
      <NavItem href="/" icon={<HomeIcon />} label="الرئيسية" />

      <SidebarMenuGroup title="لوحة التحكم" icon={<LayoutDashboard />}>
        <NavItem href="/inventory" icon={<HomeIcon />} label="نظرة عامة" />
      </SidebarMenuGroup>

      <SidebarMenuGroup title="إدارة المخزون" icon={<PackageIcon />}>
        <NavItem href="/inventory/raw-materials" icon={<HomeIcon />} label="المواد الخام" />
        <NavItem href="/inventory/packaging" icon={<HomeIcon />} label="مواد التعبئة والتغليف" />
        <NavItem
          href="/inventory/semi-finished"
          icon={<HomeIcon />}
          label="المنتجات شبه المصنعة"
        />
        <NavItem
          href="/inventory/finished-products"
          icon={<HomeIcon />}
          label="المنتجات تامة الصنع"
        />
        <NavItem href="/inventory/low-stock" icon={<HomeIcon />} label="العناصر منخفضة المخزون" />
        <NavItem href="/inventory/tracking" icon={<HomeIcon />} label="تتبع المخزون" />
        <NavItem href="/inventory/reports" icon={<HomeIcon />} label="التقارير" />
      </SidebarMenuGroup>

      <SidebarMenuGroup title="إدارة الإنتاج" icon={<FactoryIcon />}>
        <NavItem href="/production/planning" icon={<HomeIcon />} label="تخطيط الإنتاج" />
        <NavItem href="/production/orders" icon={<HomeIcon />} label="أوامر الإنتاج" />
        <NavItem href="/production/packaging" icon={<HomeIcon />} label="تعبئة المنتجات" />
        <NavItem href="/production/packaging-orders" icon={<HomeIcon />} label="أوامر التعبئة" />
      </SidebarMenuGroup>

      <SidebarMenuGroup title="إدارة المبيعات" icon={<CommercialIcon />}>
        <NavItem href="/commercial" icon={<HomeIcon />} label="لوحة التحكم" />
        <NavItem href="/commercial/invoices" icon={<InvoiceIcon />} label="الفواتير" />
        <NavItem href="/commercial/parties" icon={<PartyIcon />} label="الأطراف" />
        <NavItem href="/commercial/payments" icon={<PaymentIcon />} label="المدفوعات" />
        <NavItem href="/commercial/returns" icon={<ReturnIcon />} label="المرتجعات" />
        <NavItem href="/commercial/ledger" icon={<LedgerIcon />} label="سجل الحساب" />
        <NavItem href="/commercial/statements" icon={<StatementIcon />} label="كشوف الحساب" />
        <NavItem href="/commercial/profits" icon={<ProfitIcon />} label="الأرباح" />
      </SidebarMenuGroup>

      <SidebarMenuGroup title="الإدارة المالية" icon={<Coins />}>
        <NavItem href="/financial" icon={<HomeIcon />} label="لوحة التحكم" />
        <NavItem href="/financial/transactions" icon={<HomeIcon />} label="المعاملات المالية" />
        <NavItem href="/financial/categories" icon={<HomeIcon />} label="الفئات" />
      </SidebarMenuGroup>

      <SidebarMenuGroup title="التحليلات" icon={<TrendingUp />}>
        <NavItem href="/analytics" icon={<HomeIcon />} label="نظرة عامة" />
        <NavItem
          href="/analytics/inventory-distribution"
          icon={<HomeIcon />}
          label="توزيع المخزون"
        />
      </SidebarMenuGroup>

      <NavItem href="/settings" icon={<HomeIcon />} label="الإعدادات" />
    </div>
  );
}

function HomeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-home"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CommercialIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-shopping-cart"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-file-text"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}

function PartyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-users"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-coins"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-book-open-check"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      <path d="m15 19 2 2 4 4" />
    </svg>
  );
}

function LedgerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"></rect>
      <line x1="12" y1="22" x2="12" y2="14"></line>
      <path d="M4 6h16"></path>
      <path d="M4 10h16"></path>
    </svg>
  );
}

function StatementIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="13" height="13" x="2" y="2" rx="2"></rect>
      <polyline points="2 9 15 9 22 16"></polyline>
    </svg>
  );
}

function ProfitIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
      <polyline points="16 7 22 7 22 13"></polyline>
    </svg>
  );
}

export default SidebarMenu;
