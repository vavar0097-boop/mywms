import { useState } from "react";
import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { AppHeader } from "@/shared/layout/AppHeader";
import { AppSidebar } from "@/shared/layout/AppSidebar";
import { getSafePathForRole } from "@/shared/auth/role-home";
import { useAuthStore } from "@/stores/auth.store";

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const role = useAuthStore((state) => state.user?.role);
  const safePath = getSafePathForRole(role, location.pathname);

  if (role && safePath !== location.pathname) {
    return (
      <Navigate
        to={safePath}
        replace
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#dceef2] text-slate-950">
      <div
        className="fixed inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="relative flex min-h-screen">
        <AppSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader onOpenMenu={() => setSidebarOpen(true)} />

          <main className="flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
