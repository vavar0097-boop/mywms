type StatusPillProps = {
  active?: boolean | null;
};

export function StatusPill({ active }: StatusPillProps) {
  const isActive = active ?? true;

  return (
    <span
      className={
        isActive
          ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"
          : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200"
      }
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}
