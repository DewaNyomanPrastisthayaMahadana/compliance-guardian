import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const pillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        critical: "bg-critical-soft text-critical",
        info: "bg-accent-soft text-accent",
        neutral: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function StatusPill({
  tone,
  className,
  children,
}: VariantProps<typeof pillVariants> & { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn(pillVariants({ tone }), className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
