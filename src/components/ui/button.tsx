import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-brand focus-visible:ring-offset-2 focus-visible:ring-offset-abyss disabled:pointer-events-none disabled:opacity-45 active:scale-[0.985]",
  {
    variants: {
      variant: {
        default:
          "bg-cyan-brand text-abyss font-semibold hover:bg-cyan-soft shadow-[0_0_20px_-8px_rgba(0,200,232,0.8)]",
        secondary:
          "bg-abyss-200 text-ink hover:bg-abyss-300 border border-white/10",
        outline:
          "border border-white/15 bg-transparent text-ink hover:bg-white/[0.04] hover:border-white/25",
        ghost: "text-ink-muted hover:text-ink hover:bg-white/[0.05]",
        destructive:
          "bg-coral/90 text-white hover:bg-coral shadow-[0_0_20px_-10px_rgba(255,92,108,0.9)]",
        success: "bg-aqua text-abyss font-semibold hover:bg-aqua-soft",
        link: "text-cyan-soft underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded px-3 text-xs",
        lg: "h-11 rounded-md px-6",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7 rounded",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
