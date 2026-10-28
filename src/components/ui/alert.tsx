import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  success: { box: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200", Icon: CheckCircle2 },
  error: { box: "border-rose-500/30 bg-rose-500/10 text-rose-200", Icon: AlertCircle },
  warning: { box: "border-amber-500/30 bg-amber-500/10 text-amber-200", Icon: TriangleAlert },
  info: { box: "border-sky-500/30 bg-sky-500/10 text-sky-200", Icon: Info },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof tones;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { box, Icon } = tones[tone];
  return (
    <div className={cn("flex gap-3 rounded-xl border p-4 text-sm leading-6", box, className)} role="alert">
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        {title ? <p className="mb-0.5 font-bold">{title}</p> : null}
        {children ? <div className="opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}
