import { create } from "zustand";

import {
  authService,
  type AuthUser,
  type LoginPayload,
} from "@/features/auth/services/auth.service";

type AuthStore = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isCheckingSession: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  hasCheckedSession: boolean;

  login: (payload: LoginPayload) => Promise<AuthUser | null>;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isCheckingSession: false,
  isLoggingIn: false,
  isLoggingOut: false,
  hasCheckedSession: false,

  async login(payload) {
    set({
      isLoggingIn: true,
    });

    try {
      const user = await authService.login(payload);
      const isValidUser = Boolean(user?.id && user?.role);

      set({
        user: isValidUser ? user : null,
        isAuthenticated: isValidUser,
        hasCheckedSession: true,
      });

      return isValidUser ? user : null;
    } finally {
      set({
        isLoggingIn: false,
      });
    }
  },

  async checkSession() {
    set({
      isCheckingSession: true,
    });

    try {
      const user = await authService.me();
      const isValidUser = Boolean(user?.id && user?.role);

      set({
        user: isValidUser ? user : null,
        isAuthenticated: isValidUser,
        hasCheckedSession: true,
      });
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        hasCheckedSession: true,
      });
    } finally {
      set({
        isCheckingSession: false,
      });
    }
  },

  async logout() {
    set({
      isLoggingOut: true,
    });

    try {
      await authService.logout();
    } catch {
      /*
       * Frontend must still clear local auth state even if backend logout
       * endpoint is not ready yet or token is already expired.
       */
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoggingOut: false,
        hasCheckedSession: true,
      });
    }
  },

  clearSession() {
    set({
      user: null,
      isAuthenticated: false,
      isCheckingSession: false,
      isLoggingIn: false,
      isLoggingOut: false,
      hasCheckedSession: true,
    });
  },
}));
