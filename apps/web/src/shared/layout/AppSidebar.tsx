import {
  ArrowLeftRight,
  Boxes,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  MapPin,
  Package,
  PackagePlus,
  Truck,
  Settings,
  Sparkles,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";
import {
  PERMISSIONS,
  Permission,
  hasPermission,
} from "@/shared/auth/permissions";
import { useAuthStore } from "@/stores/auth.store";

type SidebarItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
  disabled?: boolean;
  permission: Permission;
  color: string;
};

const sidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: PERMISSIONS.DASHBOARD_VIEW,
    color: "bg-indigo-50 text-indigo-700",
  },
  {
    label: "Transfers",
    href: "/dashboard/transfers",
    icon: ArrowLeftRight,
    permission: PERMISSIONS.TRANSFERS_READ,
    color: "bg-teal-50 text-teal-700",
  },
  {
    label: "Stock",
    href: "/dashboard/stock",
    icon: Boxes,
    permission: PERMISSIONS.STOCK_READ,
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Purchase Orders",
    href: "/dashboard/purchase-orders",
    icon: PackagePlus,
    permission: PERMISSIONS.PURCHASE_ORDERS_READ,
    color: "bg-lime-50 text-lime-700",
  },
  {
    label: "Vendors",
    href: "/dashboard/vendors",
    icon: Truck,
    permission: PERMISSIONS.VENDORS_READ,
    color: "bg-yellow-50 text-yellow-700",
  },
  {
    label: "Finance",
    href: "/dashboard/finance",
    icon: DollarSign,
    permission: PERMISSIONS.FINANCE_READ,
    color: "bg-amber-50 text-amber-700",
  },
  {
    label: "Items",
    href: "/dashboard/items",
    icon: Package,
    permission: PERMISSIONS.ITEMS_READ,
    color: "bg-sky-50 text-sky-700",
  },
  {
    label: "Warehouses",
    href: "/dashboard/warehouses",
    icon: Warehouse,
    permission: PERMISSIONS.WAREHOUSES_READ,
    color: "bg-violet-50 text-violet-700",
  },
  {
    label: "Locations",
    href: "/dashboard/locations",
    icon: MapPin,
    permission: PERMISSIONS.LOCATIONS_READ,
    color: "bg-cyan-50 text-cyan-700",
  },
  {
    label: "Users",
    href: "/dashboard/users",
    icon: Users,
    permission: PERMISSIONS.USERS_READ,
    color: "bg-fuchsia-50 text-fuchsia-700",
  },
  {
    label: "Global Settings",
    href: "/dashboard/settings",
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_READ,
    color: "bg-orange-50 text-orange-700",
  },
  {
    label: "Audit Logs",
    href: "/dashboard/audit-logs",
    icon: ClipboardList,
    permission: PERMISSIONS.AUDIT_READ,
    color: "bg-rose-50 text-rose-700",
  },
];

type AppSidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function AppSidebar({
  open = false,
  onClose,
}: AppSidebarProps) {
  const role = useAuthStore((state) => state.user?.role);
  const visibleItems = sidebarItems.filter((item) =>
    hasPermission(role, item.permission),
  );

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-teal-100 bg-white/92 shadow-xl shadow-teal-900/5 backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:z-auto lg:block lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between gap-4 px-4 lg:h-16 lg:px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-sky-500 text-white shadow-sm">
              <Sparkles size={21} />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-950">
                Enterprise WMS
              </p>
              <p className="text-xs text-slate-500">
                Warehouse Control
              </p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-teal-700 lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1 px-3 py-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;

            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-400"
                  title="Coming soon"
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </div>
              );
            }

            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold transition",
                    isActive
                      ? "bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-sm shadow-teal-900/10"
                      : "text-slate-600 hover:bg-teal-50 hover:text-teal-900",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg transition",
                        isActive ? "bg-white/20 text-white" : item.color,
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
