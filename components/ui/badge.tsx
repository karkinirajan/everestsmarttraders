import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-muted text-brand border-brand/25",
        secondary: "bg-secondary text-secondary-foreground border-transparent",
        outline: "border-border text-foreground bg-transparent",
        destructive: "bg-destructive-muted text-destructive border-destructive/25",
        success: "bg-success-muted text-success border-success/25",
        warning: "bg-warning-muted text-warning border-warning/25",
        info: "bg-info-muted text-info border-info/25",
        amber: "bg-est-amber-muted text-est-amber border-est-amber/25",
        muted: "bg-muted text-muted-foreground border-border/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
