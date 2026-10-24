import { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import {
  Permission,
  hasPermission,
} from "@/shared/auth/permissions";
import { getHomePathForRole } from "@/shared/auth/role-home";
import { useAuthStore } from "@/stores/auth.store";

type PermissionRouteProps = {
  permission: Permission;
  children: ReactNode;
};

export function PermissionRoute({
  permission,
  children,
}: PermissionRouteProps) {
  const user = useAuthStore((state) => state.user);

  if (!hasPermission(user?.role, permission)) {
    return (
      <Navigate
        to={getHomePathForRole(user?.role)}
        replace
      />
    );
  }

  return children;
}
