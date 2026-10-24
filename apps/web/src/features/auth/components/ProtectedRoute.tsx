import { ReactNode, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuthStore } from "@/stores/auth.store";
import { toast } from "@/shared/ui/toast";
import { FeedbackPanel } from "@/shared/ui/feedback";

type Props = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    isAuthenticated,
    isCheckingSession,
    hasCheckedSession,
    checkSession,
    clearSession,
  } = useAuthStore();

  useEffect(() => {
    if (!hasCheckedSession && !isCheckingSession) {
      checkSession();
    }
  }, [checkSession, hasCheckedSession, isCheckingSession]);

  useEffect(() => {
    function handleAuthExpired() {
      clearSession();

      toast.error(
        "Session expired",
        "Please sign in again to continue.",
      );

      navigate("/login", {
        replace: true,
        state: {
          from: location.pathname,
        },
      });
    }

    window.addEventListener(
      "wms:auth-expired",
      handleAuthExpired,
    );

    return () => {
      window.removeEventListener(
        "wms:auth-expired",
        handleAuthExpired,
      );
    };
  }, [clearSession, location.pathname, navigate]);

  if (isCheckingSession || !hasCheckedSession) {
    return (
      <FeedbackPanel
        fullScreen
        title="Checking session..."
        description="Validating your login before opening the workspace."
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return children;
}
