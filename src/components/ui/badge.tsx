import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-cyan-brand/40 bg-cyan-brand/10 text-cyan-soft",
        muted: "border-white/10 bg-white/[0.04] text-ink-muted",
        success: "border-aqua/40 bg-aqua/10 text-aqua-soft",
        warning: "border-amber-brand/40 bg-amber-brand/10 text-amber-brand",
        danger: "border-coral/40 bg-coral/10 text-coral-soft",
        outline: "border-white/15 text-ink-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
