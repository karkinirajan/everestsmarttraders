import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  "aria-invalid": ariaInvalid,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      aria-invalid={ariaInvalid}
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-field text-foreground px-3 py-1 text-sm shadow-sm transition-colors outline-none",
        "placeholder:text-placeholder",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
