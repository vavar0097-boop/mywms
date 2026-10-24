import {
  PERMISSIONS,
  hasPermission,
  normalizeRole,
} from "@/shared/auth/permissions";

export function getHomePathForRole(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "CASHIER" || normalizedRole === "OPERATOR") {
    return "/pos";
  }

  if (normalizedRole === "FINANCE") {
    return "/dashboard/finance";
  }

  if (normalizedRole === "WAREHOUSE") {
    return "/dashboard/transfers";
  }

  return "/dashboard";
}

export function canAccessPathForRole(
  role: string | null | undefined,
  path: string | null | undefined,
) {
  if (!path || !role) return false;

  if (path === "/" || path === "/login") return true;

  if (path.startsWith("/pos")) {
    return hasPermission(role, PERMISSIONS.CASHIER_SESSIONS_READ);
  }

  if (path === "/dashboard") {
    return hasPermission(role, PERMISSIONS.DASHBOARD_VIEW);
  }

  if (path.startsWith("/dashboard/transfers/new")) {
    return hasPermission(role, PERMISSIONS.TRANSFERS_WRITE);
  }

  if (path.startsWith("/dashboard/transfers")) {
    return hasPermission(role, PERMISSIONS.TRANSFERS_READ);
  }

  if (path.startsWith("/dashboard/stock")) {
    return hasPermission(role, PERMISSIONS.STOCK_READ);
  }

  if (path.startsWith("/dashboard/purchase-orders")) {
    return hasPermission(role, PERMISSIONS.PURCHASE_ORDERS_READ);
  }

  if (path.startsWith("/dashboard/vendors")) {
    return hasPermission(role, PERMISSIONS.VENDORS_READ);
  }

  if (path.startsWith("/dashboard/finance")) {
    return hasPermission(role, PERMISSIONS.FINANCE_READ);
  }

  if (path.startsWith("/dashboard/items")) {
    return hasPermission(role, PERMISSIONS.ITEMS_READ);
  }

  if (path.startsWith("/dashboard/warehouses")) {
    return hasPermission(role, PERMISSIONS.WAREHOUSES_READ);
  }

  if (path.startsWith("/dashboard/locations")) {
    return hasPermission(role, PERMISSIONS.LOCATIONS_READ);
  }

  if (path.startsWith("/dashboard/users")) {
    return hasPermission(role, PERMISSIONS.USERS_READ);
  }

  if (path.startsWith("/dashboard/settings")) {
    return hasPermission(role, PERMISSIONS.SETTINGS_READ);
  }

  if (path.startsWith("/dashboard/audit-logs")) {
    return hasPermission(role, PERMISSIONS.AUDIT_READ);
  }

  return false;
}

export function getSafePathForRole(
  role: string | null | undefined,
  requestedPath: string | null | undefined,
) {
  if (canAccessPathForRole(role, requestedPath)) {
    return requestedPath as string;
  }

  return getHomePathForRole(role);
}
