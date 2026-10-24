import { ReactNode } from "react";

type MasterDataShellProps = {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
};

export function MasterDataShell({
  title,
  description,
  action,
  children,
}: MasterDataShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>

        {action}
      </div>

      {children}
    </div>
  );
}
