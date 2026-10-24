import { FormEvent, useState } from "react";
import {
  Boxes,
  Eye,
  EyeOff,
  Forklift,
  Lock,
  Store,
  TrendingUp,
  User,
} from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "@/shared/lib/api/error";
import { Button } from "@/shared/ui/button/button";
import { Input } from "@/shared/ui/input/input";
import { toast } from "@/shared/ui/toast";
import { useAuthStore } from "@/stores/auth.store";
import { getHomePathForRole } from "@/shared/auth/role-home";

export function LoginPage() {
  const navigate = useNavigate();

  const { login, user, isAuthenticated, isLoggingIn } = useAuthStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo = getHomePathForRole(user?.role);

  const canSubmit =
    username.trim().length > 0 &&
    password.trim().length > 0 &&
    !isLoggingIn;

  if (isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        replace
      />
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      toast.error(
        "Login form incomplete",
        "Please input username and password.",
      );
      return;
    }

    try {
      const loggedInUser = await login({
        username: username.trim(),
        password,
      });

      toast.success(
        "Login success",
        "Welcome back to Enterprise WMS.",
      );

      navigate(getHomePathForRole(loggedInUser?.role), {
        replace: true,
      });
    } catch (error) {
      toast.error(
        "Login failed",
        getApiErrorMessage(error),
      );
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-950 lg:grid lg:grid-cols-[minmax(0,1fr)_34rem]">
      <section className="relative flex min-h-0 flex-col justify-between overflow-hidden bg-[#eafbf6] px-5 py-6 sm:min-h-[48rem] sm:px-8 lg:min-h-screen lg:px-10 lg:py-8">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(20, 184, 166, 0.18) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            backgroundPosition: "center",
          }}
        />
        <div
          className="absolute inset-y-0 right-0 hidden w-[52%] opacity-40 lg:block"
          style={{
            backgroundImage:
              "linear-gradient(35deg, transparent 0 18%, rgba(15, 118, 110, 0.2) 18.2%, transparent 18.5% 40%, rgba(15, 118, 110, 0.14) 40.2%, transparent 40.5% 100%), linear-gradient(130deg, transparent 0 30%, rgba(15, 118, 110, 0.16) 30.2%, transparent 30.5% 70%, rgba(15, 118, 110, 0.12) 70.2%, transparent 70.5% 100%)",
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-sky-500 text-white shadow-lg shadow-teal-900/10">
            <Boxes size={22} />
          </div>

          <div>
            <p className="text-base font-bold">
              Enterprise WMS
            </p>
            <p className="text-xs font-medium text-slate-600">
              Warehouse Management System
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-2xl py-12 sm:py-14 lg:py-0">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-teal-700">
            WMS + POS Control
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Stock, Sales, and Reports in one Streamlined Workflow.
          </h1>
          <p className="mt-5 max-w-xl text-sm font-medium leading-6 text-slate-700 sm:text-base">
            Monitor inventory, process cashier sales, track transfers, and read finance summaries from one focused dashboard.
          </p>
        </div>

        <div className="relative z-10 hidden gap-3 text-sm sm:grid sm:grid-cols-3 lg:max-w-2xl">
          <div className="rounded-lg border border-white/80 bg-white/90 p-4 shadow-xl shadow-teal-900/10 backdrop-blur">
            <Forklift
              size={34}
              className="text-teal-600"
            />
            <p className="mt-3 font-bold text-slate-950">Inventory</p>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Real-time tracking
            </p>
          </div>
          <div className="rounded-lg border border-white/80 bg-white/90 p-4 shadow-xl shadow-teal-900/10 backdrop-blur">
            <Store
              size={34}
              className="text-teal-600"
            />
            <p className="mt-3 font-bold text-slate-950">POS</p>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Fast checkout
            </p>
          </div>
          <div className="rounded-lg border border-white/80 bg-white/90 p-4 shadow-xl shadow-teal-900/10 backdrop-blur">
            <TrendingUp
              size={34}
              className="text-teal-600"
            />
            <p className="mt-3 font-bold text-slate-950">Finance</p>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Clean analytics
            </p>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-[34rem] items-center justify-center overflow-hidden border-l border-teal-100 bg-slate-50 px-5 py-10 sm:px-8 lg:min-h-screen">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />

        <div className="relative z-10 w-full max-w-sm">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xl shadow-slate-900/10">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Hello, Welcome Back!
              </h2>
              <p className="mt-2 text-sm font-medium leading-5 text-slate-600">
                Access your WMS dashboard, POS counter, stock control, and finance reports.
              </p>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={handleSubmit}
              noValidate
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Username
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-teal-500"
                  />
                  <Input
                    type="text"
                    value={username}
                    autoComplete="username"
                    placeholder="Enter your username"
                    className="h-11 rounded-xl border-teal-300 bg-teal-50/30 pl-9 shadow-inner focus:border-teal-500 focus:ring-teal-100"
                    disabled={isLoggingIn}
                    onChange={(event) =>
                      setUsername(event.target.value)
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-teal-500"
                  />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="h-11 rounded-xl border-teal-300 bg-teal-50/30 pl-9 pr-11 shadow-inner focus:border-teal-500 focus:ring-teal-100"
                    disabled={isLoggingIn}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-teal-100 hover:text-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    disabled={isLoggingIn}
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-xl border-teal-600 bg-gradient-to-r from-teal-500 to-emerald-500 font-bold shadow-lg shadow-teal-900/10 hover:from-teal-600 hover:to-emerald-600"
                disabled={!canSubmit}
              >
                {isLoggingIn ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-5 rounded-xl bg-teal-50 px-4 py-3 text-center text-sm font-medium leading-5 text-slate-700">
              Built for daily warehouse work: quick access for admin, finance, and cashier teams.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
