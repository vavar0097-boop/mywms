import {
  AlertTriangle,
  LoaderCircle,
  SearchX,
} from "lucide-react";

import { cn } from "@/lib/utils";

type FeedbackTone = "default" | "error" | "empty";

type FeedbackPanelProps = {
  title: string;
  description?: string;
  tone?: FeedbackTone;
  fullScreen?: boolean;
  className?: string;
};

const toneClasses: Record<FeedbackTone, string> = {
  default: "bg-teal-50 text-teal-700 border-teal-100",
  error: "bg-rose-50 text-rose-700 border-rose-100",
  empty: "bg-slate-50 text-slate-500 border-slate-100",
};

function FeedbackIcon({ tone }: { tone: FeedbackTone }) {
  if (tone === "error") {
    return <AlertTriangle size={22} />;
  }

  if (tone === "empty") {
    return <SearchX size={22} />;
  }

  return <LoaderCircle size={22} className="animate-spin" />;
}

export function FeedbackPanel({
  title,
  description,
  tone = "default",
  fullScreen = false,
  className,
}: FeedbackPanelProps) {
  const panel = (
    <div
      className={cn(
        "mx-auto flex w-full max-w-sm flex-col items-center rounded-2xl border bg-white px-6 py-5 text-center shadow-soft",
        className,
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border",
          toneClasses[tone],
        )}
      >
        <FeedbackIcon tone={tone} />
      </div>

      <p className="text-sm font-bold text-slate-950">{title}</p>

      {description ? (
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      ) : null}
    </div>
  );

  if (!fullScreen) return panel;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#dceef2] px-4">
      {panel}
    </div>
  );
}
